import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/http/api-error";
import type { InvitationPreview, LanayaMe, SellerLanaya } from "../contract";

// SUGU Lanaya (Lot 1), portal side: what the contract accepts, the fixed
// texts, and the seller's decision on an invitation (server played by the
// hooks). The rules themselves are the server's; these tests check that the
// portal neither invents a state nor ticks a consent for the user.

const nav = vi.hoisted(() => ({ replace: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/lanaya",
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1",
    NEXT_PUBLIC_APP_NAME: "SUGU",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_MARKETPLACE_URL: "https://sugu.pro",
    NEXT_PUBLIC_ENABLE_MSW: false,
    NEXT_PUBLIC_REVERB_APP_KEY: "k",
    NEXT_PUBLIC_REVERB_HOST: "localhost",
    NEXT_PUBLIC_REVERB_PORT: 8080,
    NEXT_PUBLIC_REVERB_SCHEME: "https",
  },
}));

type Query<T> = { data: T | undefined; isError: boolean; error: unknown; isFetching: boolean; refetch: () => void };
const ok = <T,>(data: T): Query<T> => ({ data, isError: false, error: null, isFetching: false, refetch: vi.fn() });
const failed = <T,>(error: unknown): Query<T> => ({ data: undefined, isError: true, error, isFetching: false, refetch: vi.fn() });

const server = vi.hoisted(() => ({
  seller: null as unknown,
  preview: null as unknown,
  accept: { mutateAsync: vi.fn(), isPending: false },
  decline: { mutateAsync: vi.fn(), isPending: false },
  assignment: {
    accept: { mutateAsync: vi.fn(), isPending: false },
    decline: { mutateAsync: vi.fn(), isPending: false },
    end: { mutateAsync: vi.fn(), isPending: false },
  },
}));

vi.mock("../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks")>();
  return {
    isInvitationToken: actual.isInvitationToken,
    useSellerLanaya: () => server.seller,
    useInvitationPreview: () => server.preview,
    useAnswerInvitation: () => ({ accept: server.accept, decline: server.decline }),
    useAssignmentAnswer: () => server.assignment,
  };
});

const contract = await import("../contract");
const { documentsProgress } = await import("../components/application");
const { formatRelative } = await import("../components/frame");
const { SellerLanayaScreen } = await import("../components/seller-screen");

const TOKEN = "a".repeat(64);
const card = { public_code: "LNB-AB12CD", name: "Kalifa Traoré", city: "Ouagadougou", country_code: "BF", specialties: ["Électronique"], account_active: true, badge: null };
const preview = (patch: Partial<InvitationPreview> = {}): InvitationPreview => ({
  lanabaga: card,
  company_name: "Boutique Diallo",
  message: "Je vous accompagne.",
  expires_at: "2026-11-04T10:00:00Z",
  signed_in: true,
  stores: [{ id: "01HSTORE0000000000000000AA", name: "Boutique Diallo", city: "Ouagadougou" }],
  self: false,
  consent: { key: "seller_introduction", version: "pilote-2026-10-provisoire", text: "J'accepte que ce Lanabaga soit enregistré comme m'ayant présenté SUGU." },
  ...patch,
});
const noStores: SellerLanaya = { stores: [{ id: "s1", name: "Boutique Diallo", city: "Ouagadougou", introduced_by: null, assignment: null, proposal: null }] };

beforeEach(() => {
  nav.params = new URLSearchParams();
  nav.replace.mockClear();
  server.seller = ok(noStores);
  server.preview = ok(undefined);
  server.accept = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  server.decline = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  server.assignment = {
    accept: { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false },
    decline: { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false },
    end: { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false },
  };
});

const store = { id: "01HSTORE0000000000000000AA", name: "Boutique Diallo", slug: "boutique-diallo", city: "Ouagadougou", active: true };
const assignmentOf = (id: string, value: "proposed" | "active", lanabaga = card) => ({
  id,
  status: { value, label: value === "active" ? "Active" : "En attente de l'accord du vendeur" },
  scope: "store",
  store,
  lanabaga,
  proposed_at: "2026-10-21T09:00:00Z",
  accepted_at: value === "active" ? "2026-10-21T10:00:00Z" : null,
  declined_at: null,
  cancelled_at: null,
  ended_at: null,
});
const consent = { key: "seller_assignment", version: "pilote-2026-10-provisoire", text: "J'accepte que ce Lanabaga devienne le Lanabaga principal de ma boutique." };

describe("contract", () => {
  it("keeps the server's labels and refuses a badge before it exists", () => {
    const parsed = contract.invitationSchema.parse({
      id: "i1",
      lead_id: null,
      company_name: "Boutique Diallo",
      contact_name: "Amadou Diallo",
      phone: "+22670123456",
      message: null,
      status: { value: "open", label: "En attente" },
      expires_at: "2026-11-04T10:00:00Z",
      accepted_at: null,
      store: null,
      created_at: "2026-10-21T10:00:00Z",
    });
    expect(parsed.status).toEqual({ value: "open", label: "En attente" });
    expect(parsed.store).toBeNull();
    // A badge sent by mistake is dropped: none exists before Lot 6 (ACC-002).
    expect(contract.publicCardSchema.parse({ ...card, badge: { level: "gold" } }).badge).toBeNull();
  });

  it("the invitation text is SUGU's, the personal note under it, the link last", () => {
    const text = contract.invitationShareText("Boutique Diallo", "https://pro.sugu.test/invitation/abc", "Je vous accompagne.");
    expect(text.split("\n\n")).toEqual([
      "Bonjour, je vous présente SUGU pour Boutique Diallo.",
      "Je vous accompagne.",
      "Ouvrez l'invitation officielle de SUGU : https://pro.sugu.test/invitation/abc",
    ]);
    expect(contract.invitationShareText("X", "https://l").split("\n\n")).toHaveLength(2);
  });

  it("refuses a file the server would refuse, before sending it", () => {
    expect(contract.fileRefusal(new File(["x"], "cni.pdf"))).toBeNull();
    expect(contract.fileRefusal(new File(["x"], "photo.JPEG"))).toBeNull();
    expect(contract.fileRefusal(new File(["x"], "cni.docx"))).toMatch(/PDF, JPG ou PNG/);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "cni.pdf");
    expect(contract.fileRefusal(big)).toMatch(/5 Mo/);
  });

  it("opens one's own document through the relay, never the API host", () => {
    expect(contract.documentFileHref("01HDOC")).toBe("/api/proxy/lanaya/me/documents/01HDOC/file");
  });
});

describe("application progress", () => {
  const state = (value: string) => ({ value, label: value });
  const doc = (type: string, status: string, uploaded = "2026-10-21T10:00:00Z") => ({
    id: `${type}-${status}`,
    document_type: state(type),
    side: state("single"),
    file_name: "f.pdf",
    mime_type: "application/pdf",
    size_bytes: 10,
    review_status: state(status),
    rejection_reason: null,
    uploaded_at: uploaded,
    reviewed_at: null,
  });
  const me = (documents: ReturnType<typeof doc>[]): LanayaMe =>
    ({ documents, requirements: { documents: [state("identity"), state("professional_photo")], references: 2 } }) as unknown as LanayaMe;

  it("a required document counts once sent and not refused; the latest one decides", () => {
    expect(documentsProgress(me([]))).toEqual({ done: 0, total: 2 });
    expect(documentsProgress(me([doc("identity", "pending")]))).toEqual({ done: 1, total: 2 });
    expect(documentsProgress(me([doc("identity", "rejected"), doc("professional_photo", "approved")]))).toEqual({ done: 1, total: 2 });
    expect(documentsProgress(me([doc("identity", "rejected", "2026-10-20T10:00:00Z"), doc("identity", "pending", "2026-10-21T10:00:00Z")]))).toEqual({ done: 1, total: 2 });
    expect(documentsProgress(me([doc("identity", "superseded")]))).toEqual({ done: 0, total: 2 });
  });
});

describe("relative dates", () => {
  const now = new Date(2026, 9, 21, 12, 0);
  it("says today, yesterday, days, a week, then the date", () => {
    expect(formatRelative(new Date(2026, 9, 21, 10, 24).toISOString(), now)).toMatch(/^Aujourd'hui, 10:24$/);
    expect(formatRelative(new Date(2026, 9, 20, 16, 30).toISOString(), now)).toMatch(/^Hier, 16:30$/);
    expect(formatRelative(new Date(2026, 9, 18, 9, 0).toISOString(), now)).toBe("Il y a 3 jours");
    expect(formatRelative(new Date(2026, 9, 12, 9, 0).toISOString(), now)).toBe("Il y a 1 semaine");
    expect(formatRelative(null, now)).toBe("—");
  });
});

describe("Programme Lanaya — the seller's side", () => {
  it("without an invitation: who introduced each shop, or an honest empty state; no promise, no badge", () => {
    render(<SellerLanayaScreen />);
    expect(screen.getByRole("heading", { name: "Programme Lanaya" })).toBeInTheDocument();
    expect(screen.getByText(/Aucun Lanabaga ne vous a présenté SUGU/)).toBeInTheDocument();
    expect(screen.queryByText(/visibilité pour vos produits/i)).toBeNull();
    expect(screen.queryByText(/^Vérifié$/)).toBeNull();
    expect(screen.getByText(/ni une garantie de ventes, ni une assurance/)).toBeInTheDocument();
  });

  it("shows the Lanabaga who introduced a shop, with the code and without « Vérifié »", () => {
    server.seller = ok({ stores: [{ id: "s1", name: "Boutique Diallo", city: "Ouagadougou", introduced_by: { ...card, accepted_at: "2026-10-21T10:24:00Z" }, assignment: null, proposal: null }] });
    render(<SellerLanayaScreen />);
    expect(screen.getByText("Kalifa Traoré")).toBeInTheDocument();
    expect(screen.getByText(/Lanabaga admis par SUGU ·/)).toBeInTheDocument();
    // The code stays on one line: it is what the seller checks with SUGU.
    expect(screen.getByText("Code LNB-AB12CD")).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("Mise en relation acceptée")).toBeInTheDocument();
    expect(screen.queryByText(/^Vérifié$/)).toBeNull();
  });

  it("the consent is never ticked in advance; nothing is sent without it", async () => {
    nav.params = new URLSearchParams({ invitation: TOKEN });
    server.preview = ok(preview());
    render(<SellerLanayaScreen />);

    const box = screen.getByRole("checkbox", { name: /enregistré comme m'ayant présenté SUGU/ });
    expect(box).not.toBeChecked();
    const acceptButton = screen.getByRole("button", { name: "Accepter la mise en relation" });
    await userEvent.click(acceptButton);
    expect(server.accept.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Cochez la case");

    await userEvent.click(box);
    await userEvent.click(acceptButton);
    expect(server.accept.mutateAsync).toHaveBeenCalledWith("01HSTORE0000000000000000AA");
    // Answered: the token leaves the address.
    expect(nav.replace).toHaveBeenCalledWith("/vendor/lanaya");
  });

  it("with several shops, the seller chooses which one; none is chosen for them", async () => {
    nav.params = new URLSearchParams({ invitation: TOKEN });
    server.preview = ok(preview({ stores: [{ id: "S-A".padEnd(26, "0"), name: "Boutique A", city: null }, { id: "S-B".padEnd(26, "0"), name: "Boutique B", city: null }] }));
    render(<SellerLanayaScreen />);
    const group = screen.getByRole("group", { name: /Boutique concernée/ });
    for (const radio of within(group).getAllByRole("radio")) expect(radio).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Accepter la mise en relation" }));
    expect(server.accept.mutateAsync).not.toHaveBeenCalled();
    expect(within(group).getByText("Choisissez la boutique concernée.")).toBeInTheDocument();
    await userEvent.click(within(group).getByRole("radio", { name: "Boutique B" }));
    await userEvent.click(screen.getByRole("button", { name: "Accepter la mise en relation" }));
    expect(server.accept.mutateAsync).toHaveBeenCalledWith("S-B".padEnd(26, "0"));
  });

  it("an invitation that is no longer usable says so, without detail", () => {
    nav.params = new URLSearchParams({ invitation: TOKEN });
    server.preview = failed(new ApiError({ message: "SUGU-LANAYA-INVITATION-UNAVAILABLE: Invitation indisponible.", status: 404, code: "SUGU-LANAYA-INVITATION-UNAVAILABLE" }));
    render(<SellerLanayaScreen />);
    expect(screen.getByText("Cette invitation n'est plus valable")).toBeInTheDocument();
    expect(screen.queryByText(/SUGU-LANAYA/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Accepter la mise en relation" })).toBeNull();
  });

  it("a Lanabaga opening their own link cannot accept it", () => {
    nav.params = new URLSearchParams({ invitation: TOKEN });
    server.preview = ok(preview({ self: true, stores: [] }));
    render(<SellerLanayaScreen />);
    expect(screen.getByText("C'est votre propre invitation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accepter la mise en relation" })).toBeNull();
  });

  it("a malformed token in the address is ignored", () => {
    nav.params = new URLSearchParams({ invitation: "../../etc" });
    render(<SellerLanayaScreen />);
    expect(screen.queryByRole("heading", { name: "Décision du vendeur" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Rejoindre le programme" })).toBeInTheDocument();
  });

  it("a proposal of SUGU: the consent is never ticked in advance; nothing is sent without it", async () => {
    server.seller = ok({ stores: [{ id: store.id, name: store.name, city: store.city, introduced_by: null, assignment: null, proposal: { ...assignmentOf("A1", "proposed"), consent } }] });
    render(<SellerLanayaScreen />);

    expect(screen.getByRole("heading", { name: "Proposition d'accompagnement" })).toBeInTheDocument();
    const box = screen.getByRole("checkbox", { name: /Lanabaga principal de ma boutique/ });
    expect(box).not.toBeChecked();
    const acceptButton = screen.getByRole("button", { name: "Accepter ce Lanabaga" });
    await userEvent.click(acceptButton);
    expect(server.assignment.accept.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Cochez la case");

    await userEvent.click(box);
    await userEvent.click(acceptButton);
    expect(server.assignment.accept.mutateAsync).toHaveBeenCalledWith("A1");
  });

  it("declining a proposal is confirmed first, then sent", async () => {
    server.seller = ok({ stores: [{ id: store.id, name: store.name, city: store.city, introduced_by: null, assignment: null, proposal: { ...assignmentOf("A2", "proposed"), consent } }] });
    render(<SellerLanayaScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Refuser la proposition pour Boutique Diallo" }));
    expect(server.assignment.decline.mutateAsync).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Refuser la proposition" }));
    expect(server.assignment.decline.mutateAsync).toHaveBeenCalledWith("A2");
    expect(server.assignment.accept.mutateAsync).not.toHaveBeenCalled();
  });

  it("the main Lanabaga of a shop, and the seller's way to end it", async () => {
    server.seller = ok({ stores: [{ id: store.id, name: store.name, city: store.city, introduced_by: null, assignment: assignmentOf("A3", "active"), proposal: null }] });
    render(<SellerLanayaScreen />);
    expect(screen.getByText("Kalifa Traoré")).toBeInTheDocument();
    expect(screen.getByText(/Lanabaga principal de Boutique Diallo depuis le/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Votre accompagnement" })).toBeInTheDocument();
    expect(screen.getByText("Lanabaga principal accepté")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mettre fin à l'accompagnement" }));
    expect(server.assignment.end.mutateAsync).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Mettre fin" }));
    expect(server.assignment.end.mutateAsync).toHaveBeenCalledWith({ id: "A3" });
  });

  it("a proposal that replaces the current Lanabaga says so", () => {
    const other = { ...card, public_code: "LNB-ZZ99ZZ", name: "Awa Ouédraogo" };
    server.seller = ok({
      stores: [{ id: store.id, name: store.name, city: store.city, introduced_by: null, assignment: assignmentOf("A4", "active"), proposal: { ...assignmentOf("A5", "proposed", other), consent } }],
    });
    render(<SellerLanayaScreen />);
    expect(screen.getByText(/Awa Ouédraogo remplacera Kalifa Traoré/)).toBeInTheDocument();
  });

  it("the contract drops an unknown assignment shape rather than inventing one", () => {
    const parsed = contract.sellerLanayaSchema.parse({ stores: [{ id: "s1", name: "B", city: null, introduced_by: null, assignment: { broken: true } }] });
    expect(parsed.stores[0].assignment).toBeNull();
    expect(parsed.stores[0].proposal).toBeNull();
  });
});
