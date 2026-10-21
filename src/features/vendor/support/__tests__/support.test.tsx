import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http/api-error";
import { ticketStatus } from "@/design-system";
import { TICKET_FILTERS, TICKET_STATUSES, categoryLabel, countOf, parseCreatedTicket, parseReplyPage, parseTicket, parseTicketPage, priorityLabel, ticketKindLabel, validateNewTicket } from "../contract";
import { LANABAGA_DESK, LANABAGA_TOPICS, SELLER_DESK, SupportDeskProvider, kindFields } from "../desk";

// The tickets of a seller: what is read of an answer of Laravel
// (SellerSupportTicketsTest in ../sugu asserts the same payloads), and how the
// screen behaves around a send.

const api = vi.hoisted(() => ({ fetchTickets: vi.fn(), fetchTicket: vi.fn(), fetchReplies: vi.fn(), createTicket: vi.fn(), sendReply: vi.fn(), closeTicket: vi.fn() }));
const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));

// The screens reach the HTTP client through `../api`; isolate from env validation.
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1", NEXT_PUBLIC_REVERB_APP_KEY: "key", NEXT_PUBLIC_REVERB_HOST: "localhost", NEXT_PUBLIC_REVERB_PORT: 8080, NEXT_PUBLIC_REVERB_SCHEME: "http" } }));
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), ...api }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => "/vendor/tickets",
  useSearchParams: () => navigation.params,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; scroll?: boolean }) => {
    // `scroll` is the router's, not an attribute of a link.
    const { scroll, ...anchor } = props;
    void scroll;
    return (
      <a href={href} {...anchor}>
        {children}
      </a>
    );
  },
}));
vi.mock("@/features/auth/hooks", () => ({ useSession: () => ({ data: { id: 101, store_id: "11" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { SupportScreen } from "../components/screen";

const row = {
  id: "t1",
  ticket_number: "TKT-261012-0045",
  subject: "Problème de paiement",
  status: "open",
  priority: "medium",
  category: "payment",
  store_id: "s1",
  store: { id: "s1", name: "Boutique Awa" },
  customer_id: "u1",
  customer: { id: "u1", name: "Awa Traoré" },
  is_requester: true,
  can: { reply: true, close: true },
  last_message_at: "2026-10-12T14:00:00.000000Z",
  created_at: "2026-10-12T08:24:00.000000Z",
  resolved_at: null,
  closed_at: null,
};

describe("ce que le serveur répond", () => {
  it("lit la page, sa pagination et les compteurs de toute la liste", () => {
    const page = parseTicketPage({ data: [row], current_page: 2, last_page: 4, per_page: 15, total: 52, counts: { all: 52, open: 3, pending_customer: 1, pending_internal: 2, escalated: 1, resolved: 5, closed: 40 } });
    expect(page).toMatchObject({ page: 2, lastPage: 4, total: 52 });
    expect(page.rows[0]).toMatchObject({ number: "TKT-261012-0045", status: "open", isRequester: true, openedBy: null, can: { reply: true, close: true } });
    expect(countOf(page.counts, "all")).toBe(52);
    expect(countOf(page.counts, "active")).toBe(7);
    expect(countOf(page.counts, "done")).toBe(45);
    expect(countOf(undefined, "all")).toBeUndefined();
  });

  it("garde chaque statut tel quel : résolu et fermé ne sont pas confondus", () => {
    const statuses = TICKET_STATUSES.map((status) => parseTicket({ ticket: { ...row, status } }).status);
    expect(statuses).toEqual(["open", "pending_customer", "pending_internal", "escalated", "resolved", "closed"]);
    expect(ticketStatus.resolve("resolved").label).toBe("Résolu");
    expect(ticketStatus.resolve("closed").label).toBe("Fermé");
    expect(ticketStatus.resolve("resolved").label).not.toBe(ticketStatus.resolve("closed").label);
    // Every status of the server has its own entry; an unknown one is said unknown.
    for (const status of TICKET_STATUSES) expect(ticketStatus.resolve(status).known, status).toBe(true);
    expect(ticketStatus.resolve("merged").known).toBe(false);
  });

  it("envoie au serveur de vrais statuts pour chaque filtre", () => {
    const sent = TICKET_FILTERS.flatMap((filter) => [...filter.statuses]);
    for (const status of sent) expect(TICKET_STATUSES).toContain(status);
    expect(new Set(sent).size).toBe(sent.length);
    expect(sent).toHaveLength(TICKET_STATUSES.length);
  });

  it("ne donne aucun droit que le serveur n'a pas donné", () => {
    expect(parseTicket({ ticket: { ...row, can: undefined } }).can).toEqual({ reply: false, close: false });
    const complaint = parseTicket({ ticket: { ...row, is_requester: false, customer: { id: "u2", name: "Issa Compaoré" }, can: { reply: true, close: false } } });
    expect(complaint).toMatchObject({ isRequester: false, openedBy: "Issa Compaoré", can: { reply: true, close: false } });
  });

  it("lit les échanges et le chemin protégé de leurs pièces", () => {
    const page = parseReplyPage({
      messages: [
        { id: "r1", client_message_id: null, sender_type: "customer", sender_name: "Awa Traoré", is_own: true, body: "Bonjour", attachments: [{ id: 4, name: "capture.png", path: "sellers/support/tickets/t1/messages/r1/attachments/4", url: "https://cdn.example/x.png", size: 1024, mime: "image/png" }], created_at: "2026-10-12T08:24:00Z" },
        { id: "r2", sender_type: "admin", sender_name: "Support SUGU", is_own: false, body: "Nous vérifions.", attachments: [], created_at: "2026-10-12T09:10:00Z" },
        { illisible: true },
      ],
      has_more: true,
    });
    expect(page.hasMore).toBe(true);
    expect(page.replies).toHaveLength(2);
    expect(page.replies[0].attachments[0]).toEqual({ id: "4", kind: "image", path: "sellers/support/tickets/t1/messages/r1/attachments/4", name: "capture.png", size: 1024, mime: "image/png" });
    expect(page.replies[1]).toMatchObject({ senderName: "Support SUGU", own: false });
    expect(JSON.stringify(page)).not.toContain("cdn.example");
  });

  it("reconnaît un ticket que le serveur avait déjà", () => {
    expect(parseCreatedTicket({ message: "Ticket créé avec succès.", ticket: { id: "t9", ticket_number: "TKT-1" } })).toEqual({ id: "t9", number: "TKT-1", duplicate: false });
    expect(parseCreatedTicket({ duplicate: true, ticket: { id: "t9", ticket_number: "TKT-1" } }).duplicate).toBe(true);
  });

  it("nomme les catégories et les priorités du serveur, sans en inventer", () => {
    expect(categoryLabel("payment")).toBe("Paiement");
    expect(categoryLabel("inconnue")).toBe("Autre");
    expect(categoryLabel(null)).toBe("Non renseignée");
    expect(priorityLabel("medium")).toBe("Normale");
    expect(priorityLabel("urgent")).toBe("Urgente");
    expect(priorityLabel(null)).toBeNull();
    expect(priorityLabel("critique")).toBeNull();
  });
});

describe("le formulaire", () => {
  it("dit ce qui manque, champ par champ", () => {
    expect(validateNewTicket({ subject: "  ", category: "", description: "" })).toEqual({
      subject: "Indiquez le sujet de votre demande.",
      category: "Choisissez une catégorie.",
      description: "Décrivez votre demande.",
    });
    expect(validateNewTicket({ subject: "a".repeat(256), category: "payment", description: "b".repeat(5001) })).toEqual({ subject: "255 caractères au plus.", description: "5000 caractères au plus." });
    expect(validateNewTicket({ subject: "Sujet", category: "piratage", description: "Texte" })).toEqual({ category: "Choisissez une catégorie." });
    expect(validateNewTicket({ subject: "Sujet", category: "payment", description: "Texte" })).toEqual({});
  });
});

describe("l'écran", () => {
  function show() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <SupportScreen />
      </QueryClientProvider>,
    );
  }

  const page = { rows: [parseTicket({ ticket: row })], page: 1, lastPage: 1, total: 1, counts: { all: 1, byStatus: { open: 1 } } };

  beforeEach(() => {
    vi.clearAllMocks();
    navigation.params = new URLSearchParams();
    api.fetchTickets.mockResolvedValue(page);
  });

  it("n'annonce un ticket qu'après la réponse du serveur, et n'envoie qu'une demande", async () => {
    navigation.params = new URLSearchParams("new=1");
    let resolve!: (value: { id: string; number: string; duplicate: boolean }) => void;
    api.createTicket.mockImplementation(() => new Promise((done) => (resolve = done)));
    show();

    const form = screen.getByRole("form", { name: "Nouveau ticket" });
    fireEvent.change(within(form).getByRole("textbox", { name: /^Sujet/ }), { target: { value: "Virement non reçu" } });
    fireEvent.change(within(form).getByRole("combobox", { name: /^Catégorie/ }), { target: { value: "payment" } });
    fireEvent.change(within(form).getByRole("textbox", { name: /^Description/ }), { target: { value: "Mon retrait n'est pas arrivé." } });

    // Two clicks in one batch (the button is not drawn as waiting yet), then two more.
    const create = within(form).getByRole("button", { name: "Créer le ticket" });
    act(() => {
      create.click();
      create.click();
    });
    fireEvent.click(create);
    fireEvent.submit(form);

    await waitFor(() => expect(api.createTicket).toHaveBeenCalledTimes(1));
    expect(api.createTicket).toHaveBeenCalledWith("sellers/support/tickets", { subject: "Virement non reçu", category: "payment", description: "Mon retrait n'est pas arrivé." }, { category: "payment" }, "11");
    // Still on its way: nothing is said, nothing is opened.
    expect(toast.success).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();

    resolve({ id: "t9", number: "TKT-261012-0046", duplicate: false });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Ticket #TKT-261012-0046 créé."));
    expect(navigation.replace).toHaveBeenCalledWith("/vendor/tickets?ticket=t9", { scroll: false });
    expect(api.createTicket).toHaveBeenCalledTimes(1);
  });

  it("porte un refus du serveur sur son champ, et garde ce qui a été saisi", async () => {
    navigation.params = new URLSearchParams("new=1");
    api.createTicket.mockRejectedValue(new ApiError({ message: "Le sujet est trop long.", status: 422, errors: { subject: ["Le sujet est trop long."] } }));
    show();

    const form = screen.getByRole("form", { name: "Nouveau ticket" });
    fireEvent.change(within(form).getByRole("textbox", { name: /^Sujet/ }), { target: { value: "Sujet" } });
    fireEvent.change(within(form).getByRole("combobox", { name: /^Catégorie/ }), { target: { value: "other" } });
    fireEvent.change(within(form).getByRole("textbox", { name: /^Description/ }), { target: { value: "Texte à garder." } });
    fireEvent.click(within(form).getByRole("button", { name: "Créer le ticket" }));

    await waitFor(() => expect(within(form).getAllByText("Le sujet est trop long.").length).toBeGreaterThan(0));
    expect(within(form).getByRole("textbox", { name: /^Sujet/ })).toHaveAttribute("aria-invalid", "true");
    expect(within(form).getByRole("textbox", { name: /^Description/ })).toHaveValue("Texte à garder.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("ne demande rien au serveur tant que le formulaire est incomplet", async () => {
    navigation.params = new URLSearchParams("new=1");
    show();
    fireEvent.click(screen.getByRole("button", { name: "Créer le ticket" }));
    expect(await screen.findByText("Indiquez le sujet de votre demande.")).toBeInTheDocument();
    expect(api.createTicket).not.toHaveBeenCalled();
  });

  it("ouvre un ticket fermé sans de quoi répondre ni le fermer", async () => {
    navigation.params = new URLSearchParams("ticket=t1");
    api.fetchTicket.mockResolvedValue(parseTicket({ ticket: { ...row, status: "closed", can: { reply: false, close: false } } }));
    api.fetchReplies.mockResolvedValue({ replies: [], hasMore: false });
    show();

    expect(await screen.findByText(/Ce ticket est fermé/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Votre réponse" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Actions du ticket" })).toBeNull();
  });

  it("un ticket résolu se répond et se ferme encore", async () => {
    navigation.params = new URLSearchParams("ticket=t1");
    api.fetchTicket.mockResolvedValue(parseTicket({ ticket: { ...row, status: "resolved" } }));
    api.fetchReplies.mockResolvedValue({ replies: [], hasMore: false });
    show();

    expect(await screen.findByRole("textbox", { name: "Votre réponse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actions du ticket" })).toBeInTheDocument();
  });

  it("dit qu'un ticket est introuvable plutôt que d'en afficher un vide", async () => {
    navigation.params = new URLSearchParams("ticket=inconnu");
    api.fetchTicket.mockRejectedValue(new ApiError({ message: "Accès non autorisé.", status: 403 }));
    show();
    expect(await screen.findByText("Ticket introuvable")).toBeInTheDocument();
  });
});

describe("le guichet du programme Lanaya", () => {
  it("demande un sujet au Lanabaga, et dit au vendeur ce qu'il écrit au programme", () => {
    expect(kindFields(LANABAGA_DESK, "documents")).toEqual({ topic: "documents" });
    expect(kindFields(SELLER_DESK, "lanaya:conduct")).toEqual({ category: "lanaya", topic: "conduct" });
    expect(kindFields(SELLER_DESK, "payment")).toEqual({ category: "payment" });
    expect(validateNewTicket({ subject: "Sujet", category: "", description: "Texte" }, LANABAGA_TOPICS)).toEqual({ category: "Choisissez le thème de votre demande." });
    expect(validateNewTicket({ subject: "Sujet", category: "agreement", description: "Texte" }, LANABAGA_TOPICS)).toEqual({});
    expect(ticketKindLabel({ category: "lanaya", topic: { label: "Convention" } })).toBe("Programme Lanaya – Convention");
    expect(ticketKindLabel({ category: "lanaya", topic: null })).toBe("Programme Lanaya");
    expect(parseTicket({ ticket: { ...row, category: "lanaya", topic: { value: "conduct", label: "Signaler un comportement" }, store: null, store_id: null } }).topic).toEqual({ value: "conduct", label: "Signaler un comportement" });
  });

  it("envoie la demande d'un Lanabaga à son guichet, sans boutique, avec son sujet", async () => {
    vi.clearAllMocks();
    navigation.params = new URLSearchParams("new=1");
    api.fetchTickets.mockResolvedValue({ rows: [], page: 1, lastPage: 1, total: 0, counts: { all: 0, byStatus: {} } });
    api.createTicket.mockResolvedValue({ id: "t7", number: "TKT-261021-0007", duplicate: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SupportDeskProvider desk={LANABAGA_DESK}>
          <SupportScreen />
        </SupportDeskProvider>
      </QueryClientProvider>,
    );

    const form = screen.getByRole("form", { name: "Nouveau ticket" });
    expect(within(form).getByText(/N'envoyez jamais votre pièce d'identité ici/)).toBeInTheDocument();
    fireEvent.change(within(form).getByRole("textbox", { name: /^Sujet/ }), { target: { value: "Ma convention" } });
    fireEvent.change(within(form).getByRole("combobox", { name: /^Thème/ }), { target: { value: "agreement" } });
    fireEvent.change(within(form).getByRole("textbox", { name: /^Description/ }), { target: { value: "Quand expire-t-elle ?" } });
    fireEvent.click(within(form).getByRole("button", { name: "Créer le ticket" }));

    await waitFor(() => expect(api.createTicket).toHaveBeenCalledTimes(1));
    expect(api.createTicket).toHaveBeenCalledWith("lanaya/me/tickets", { subject: "Ma convention", category: "agreement", description: "Quand expire-t-elle ?" }, { topic: "agreement" }, null);
    // The screen stays on its own address (the test's router answers one pathname for all).
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/\?ticket=t7$/), { scroll: false }));
  });
});
