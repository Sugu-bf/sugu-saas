import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http/api-error";
import type { MessagingScope } from "../api";
import type { Conversation, Message, MessagePage } from "../contract";
import type { ChannelHandlers } from "../realtime";

// The open conversation as a user meets it: what is sent, how many times,
// what is shown while it travels, and what an agency is never offered.
// The API and the socket are replaced; the rules are the screen's.

const api = vi.hoisted(() => ({
  fetchMessages: vi.fn(),
  sendMessage: vi.fn(),
  sendProductCard: vi.fn(),
  markRead: vi.fn(),
  sendTyping: vi.fn(),
  fetchPresence: vi.fn(),
  fetchConversations: vi.fn(),
  fetchConversation: vi.fn(),
  fetchShareableProducts: vi.fn(),
  closeConversation: vi.fn(),
  blockConversation: vi.fn(),
  reportMessage: vi.fn(),
  startCourierConversation: vi.fn(),
}));
const socket = vi.hoisted(() => ({ handlers: new Map<string, ChannelHandlers>(), state: "connected" as "connected" | "connecting" | "offline" }));

// The screens reach the HTTP client through `../api`; isolate from env validation.
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1", NEXT_PUBLIC_REVERB_APP_KEY: "key", NEXT_PUBLIC_REVERB_HOST: "localhost", NEXT_PUBLIC_REVERB_PORT: 8080, NEXT_PUBLIC_REVERB_SCHEME: "http" } }));
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), ...api }));
vi.mock("../realtime", () => ({
  useMessagingChannel: (channel: string | null, handlers: ChannelHandlers) => {
    if (channel) socket.handlers.set(channel, handlers);
  },
  useSocketState: () => socket.state,
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));

import { resetOutboxForTests } from "../hooks";
import { Composer } from "../components/composer";
import { ThreadView } from "../components/thread";

const VENDOR: MessagingScope = { profile: "vendor", storeId: "11" };
const AGENCY: MessagingScope = { profile: "agency", agencyId: "21" };

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: "c1",
  type: "general",
  status: "open",
  peer: { type: "customer", id: "u1", name: "Aminata Traoré", avatarUrl: null, online: null },
  courier: null,
  customerRecord: { id: "cust-1", phone: "+22670123456" },
  orderId: null,
  orderNumber: null,
  shipmentId: null,
  shipment: null,
  lastMessage: null,
  unread: 1,
  peerLastReadId: null,
  can: { send: true, shareProduct: true, close: true, block: true, report: true },
  contactPolicy: { masked: [] },
  updatedAt: null,
  ...overrides,
});

const message = (id: string, own: boolean, body: string, clientId: string | null = null): Message => ({
  id,
  clientId,
  senderId: own ? "101" : "u1",
  senderType: own ? "seller" : "customer",
  senderName: own ? "Awa Traoré" : "Aminata Traoré",
  body,
  type: "text",
  product: null,
  attachments: [],
  own,
  flagged: false,
  masked: [],
  at: `2026-10-12T10:${id.slice(-2)}:00.000Z`,
});

let server: Message[] = [];
const page = (peerLastReadId: string | null = null): MessagePage => ({ messages: [...server], hasMore: false, peerLastReadId });

function show(scope: MessagingScope = VENDOR, target = conversation()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThreadView scope={scope} conversation={target} viewerId="101" links={{}} phone={null} />
    </QueryClientProvider>,
  );
}

const field = () => screen.getByRole("textbox", { name: "Écrire à Aminata Traoré" });
const type = (text: string) => fireEvent.change(field(), { target: { value: text } });
const enter = () => fireEvent.keyDown(field(), { key: "Enter" });

beforeEach(() => {
  vi.clearAllMocks();
  resetOutboxForTests();
  socket.handlers.clear();
  socket.state = "connected";
  server = [message("m01", false, "Bonjour, est-ce disponible ?")];
  api.fetchMessages.mockImplementation(async () => page());
  api.fetchPresence.mockResolvedValue(null);
  api.markRead.mockResolvedValue({});
  api.sendTyping.mockResolvedValue(undefined);
});

describe("envoyer un message", () => {
  it("part une seule fois, même si Entrée et le bouton sont pressés plusieurs fois", async () => {
    let resolve!: (value: Message) => void;
    api.sendMessage.mockImplementation(() => new Promise<Message>((done) => (resolve = done)));
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");

    type("Oui, il est disponible.");
    enter();
    enter();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(field()).toHaveValue("");
    // On its way: shown as such, never as sent.
    await waitFor(() => expect(document.querySelector("[data-pending]")).toHaveAttribute("data-state", "sending"));
    expect(document.querySelector("[data-pending]")).toHaveTextContent("En cours d'envoi");
    expect(document.querySelector("[data-mark='sent']")).toBeNull();

    const sent = api.sendMessage.mock.calls[0][2] as { clientId: string; body: string };
    server.push(message("m02", true, sent.body, sent.clientId));
    await act(async () => resolve(server[1]));

    await waitFor(() => expect(document.querySelector("[data-pending]")).toBeNull());
    expect(screen.getAllByText("Oui, il est disponible.")).toHaveLength(1);
    expect(document.querySelector("[data-message='m02'] [data-mark='sent']")).not.toBeNull();
  });

  it("n'envoie ni un message vide ni des espaces", async () => {
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
    type("     ");
    enter();
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it("garde Maj+Entrée pour aller à la ligne", async () => {
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    type("Première ligne");
    fireEvent.keyDown(field(), { key: "Enter", shiftKey: true });
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(field()).toHaveValue("Première ligne");
  });

  it("dit qu'un message n'est pas parti, et le renvoie sous le même identifiant", async () => {
    api.sendMessage.mockRejectedValueOnce(new ApiError({ message: "HTTP 500", status: 500 }));
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");

    type("Je vous réponds.");
    enter();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Le serveur a rencontré un problème");
    expect(document.querySelector("[data-pending]")).toHaveAttribute("data-state", "failed");
    expect(document.querySelector("[data-mark='sent']")).toBeNull();

    api.sendMessage.mockImplementationOnce(async (_scope, _id, outgoing: { clientId: string; body: string }) => {
      const written = message("m02", true, outgoing.body, outgoing.clientId);
      server.push(written);
      return written;
    });
    fireEvent.click(within(alert).getByRole("button", { name: "Réessayer" }));

    await waitFor(() => expect(document.querySelector("[data-pending]")).toBeNull());
    expect(api.sendMessage).toHaveBeenCalledTimes(2);
    expect((api.sendMessage.mock.calls[1][2] as { clientId: string }).clientId).toBe((api.sendMessage.mock.calls[0][2] as { clientId: string }).clientId);
  });

  it("ne propose pas de renvoyer ce que le serveur a refusé par une règle", async () => {
    api.sendMessage.mockRejectedValueOnce(new ApiError({ message: "Cette conversation est fermée.", status: 403 }));
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    type("Encore là ?");
    enter();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Cette conversation est fermée.");
    expect(within(alert).queryByRole("button", { name: "Réessayer" })).toBeNull();
    fireEvent.click(within(alert).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(document.querySelector("[data-pending]")).toBeNull());
  });

  it("quand la réponse s'est perdue, reconnaît le message revenu du serveur et ne le montre qu'une fois", async () => {
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");

    type("Message écrit, réponse perdue.");
    // The server wrote it before the connection dropped.
    api.sendMessage.mockImplementationOnce(async (_scope, _id, outgoing: { clientId: string; body: string }) => {
      server.push(message("m02", true, outgoing.body, outgoing.clientId));
      throw new ApiError({ message: "Network error", status: 0 });
    });
    enter();

    // The thread is read again after a network failure: the message is there, confirmed.
    await waitFor(() => expect(document.querySelector("[data-message='m02']")).not.toBeNull());
    await waitFor(() => expect(document.querySelector("[data-pending]")).toBeNull());
    expect(screen.getAllByText("Message écrit, réponse perdue.")).toHaveLength(1);
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe("ce qui arrive par le socket", () => {
  it("relit le fil quand un message arrive dans cette conversation, et pas pour une autre", async () => {
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    const calls = api.fetchMessages.mock.calls.length;

    socket.handlers.get("messaging.store.11")!.onCreated!({ messageId: "x", clientId: null, conversationId: "another", senderId: "u7", senderName: "Autre" });
    expect(api.fetchMessages.mock.calls.length).toBe(calls);

    server.push(message("m02", false, "Et en taille 43 ?"));
    await act(async () => socket.handlers.get("messaging.store.11")!.onCreated!({ messageId: "m02", clientId: null, conversationId: "c1", senderId: "u1", senderName: "Aminata Traoré" }));

    expect(await screen.findByText("Et en taille 43 ?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nouveau message de Aminata Traoré : Et en taille 43 ?"));
  });

  it("relit le fil quand le socket revient, pour ce qui a été manqué", async () => {
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    server.push(message("m02", false, "Message manqué pendant la coupure"));
    await act(async () => socket.handlers.get("messaging.store.11")!.onResume!());
    expect(await screen.findByText("Message manqué pendant la coupure")).toBeInTheDocument();
  });

  it("passe « lu » quand l'autre côté a lu, pas quand c'est soi", async () => {
    server = [message("m01", false, "Bonjour"), message("m02", true, "Oui.")];
    show();
    await screen.findByText("Oui.");
    expect(document.querySelector("[data-message='m02'] [data-mark]")).toHaveAttribute("data-mark", "sent");

    await act(async () => socket.handlers.get("messaging.store.11")!.onRead!({ conversationId: "c1", userId: "101", lastReadId: "m02" }));
    expect(document.querySelector("[data-message='m02'] [data-mark]")).toHaveAttribute("data-mark", "sent");

    await act(async () => socket.handlers.get("messaging.store.11")!.onRead!({ conversationId: "c1", userId: "u1", lastReadId: "m02" }));
    expect(document.querySelector("[data-message='m02'] [data-mark]")).toHaveAttribute("data-mark", "read");
  });

  it("dit que le temps réel est absent quand il l'est, et rien sinon", async () => {
    socket.state = "offline";
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    expect(screen.getByText(/Temps réel indisponible/)).toBeInTheDocument();
  });

  it("ne dit rien de la connexion tant qu'elle n'a pas répondu", async () => {
    socket.state = "connecting";
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    expect(screen.queryByText(/Temps réel indisponible/)).toBeNull();
  });
});

describe("lire", () => {
  it("marque comme lu le dernier message de l'autre côté, une fois", async () => {
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    await waitFor(() => expect(api.markRead).toHaveBeenCalledTimes(1));
    expect(api.markRead).toHaveBeenCalledWith(VENDOR, "c1", "m01");
  });

  it("ne marque rien tant que l'onglet n'est pas visible", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    show();
    await screen.findByText("Bonjour, est-ce disponible ?");
    await new Promise((done) => setTimeout(done, 20));
    expect(api.markRead).not.toHaveBeenCalled();

    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(api.markRead).toHaveBeenCalledTimes(1));
    visibility.mockRestore();
  });
});

describe("ce que le serveur permet", () => {
  it("remplace la saisie par la raison quand la conversation est fermée ou bloquée", async () => {
    show(VENDOR, conversation({ status: "closed", can: { send: false, shareProduct: false, close: false, block: true, report: true } }));
    await screen.findByText("Bonjour, est-ce disponible ?");
    expect(screen.getByText(/Cette conversation est fermée/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("n'offre un numéro à appeler que s'il a été donné", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ThreadView scope={VENDOR} conversation={conversation()} viewerId="101" links={{}} phone="+226 70 12 34 56" />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("link", { name: "Appeler Aminata Traoré" })).toHaveAttribute("href", "tel:+22670123456");
  });
});

describe("les coordonnées masquées", () => {
  it("le dit avant l'envoi là où le serveur masque, et nulle part ailleurs", async () => {
    show(VENDOR, conversation({ contactPolicy: { masked: ["phone", "email", "link"] } }));
    await screen.findByText("Bonjour, est-ce disponible ?");
    expect(screen.getByText("Pour votre sécurité, les numéros de téléphone, e-mails et liens externes ne sont pas transmis : l'échange reste sur SUGU.")).toBeInTheDocument();
  });

  it("ne dit rien dans une conversation de livraison, et marque le message masqué de son auteur", async () => {
    server = [{ ...message("m02", true, "Mon numéro : [numéro masqué]"), masked: ["phone"] }];
    show(VENDOR, conversation());
    await screen.findByText("Mon numéro : [numéro masqué]");
    expect(screen.queryByText(/ne sont pas transmis/)).toBeNull();
    expect(screen.getByText("· Coordonnées masquées")).toBeInTheDocument();
  });
});

describe("la supervision de l'agence", () => {
  const supervised = conversation({
    type: "courier_customer",
    orderNumber: "SU-2026-000205",
    courier: { id: "k1", name: "Moussa Kaboré" },
    can: { send: false, shareProduct: false, close: false, block: false, report: false },
  });

  it("montre l'échange et rien pour y toucher", async () => {
    server = [message("m01", false, "Je suis devant."), { ...message("m02", true, "J'arrive."), senderType: "courier", senderName: "Moussa Kaboré" }];
    show(AGENCY, supervised);
    await screen.findByText("J'arrive.");

    expect(screen.getByText("Lecture seule")).toBeInTheDocument();
    expect(screen.getByText(/Vous ne pouvez pas envoyer de message/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Envoyer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Actions de la conversation" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Signaler/ })).toBeNull();
    // No delivery state: the agency sent nothing.
    expect(document.querySelector("[data-mark]")).toBeNull();
  });

  it("ne marque rien comme lu, n'envoie aucun signal, ne demande pas la présence", async () => {
    server = [message("m01", false, "Je suis devant.")];
    show(AGENCY, supervised);
    await screen.findByText("Je suis devant.");
    await new Promise((done) => setTimeout(done, 30));

    expect(api.markRead).not.toHaveBeenCalled();
    expect(api.sendTyping).not.toHaveBeenCalled();
    expect(api.fetchPresence).not.toHaveBeenCalled();
    expect(api.sendMessage).not.toHaveBeenCalled();
  });
});

describe("la saisie", () => {
  it("refuse un fichier interdit, garde ceux qui sont permis, et les envoie avec le message", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} label="Votre message" />);
    const picker = document.querySelector("input[type='file']") as HTMLInputElement;

    const pdf = new File(["%PDF-1.4"], "bon.pdf", { type: "application/pdf" });
    const exe = new File(["MZ"], "outil.exe", { type: "application/octet-stream" });
    fireEvent.change(picker, { target: { files: [pdf, exe] } });

    expect(screen.getByRole("alert")).toHaveTextContent("« outil.exe » : ce type de fichier n'est pas accepté.");
    expect(screen.getByRole("list", { name: "Fichiers à envoyer" })).toHaveTextContent("bon.pdf");
    expect(screen.getByRole("list", { name: "Fichiers à envoyer" })).not.toHaveTextContent("outil.exe");

    // A file alone may leave: a conversation message needs no words.
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(onSend).toHaveBeenCalledWith("", [pdf]);
    expect(screen.queryByRole("list", { name: "Fichiers à envoyer" })).toBeNull();
  });

  it("exige des mots quand la réponse en exige, et attend la fin d'un envoi en cours", () => {
    const onSend = vi.fn();
    const { rerender } = render(<Composer onSend={onSend} bodyRequired />);
    const picker = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(picker, { target: { files: [new File(["x"], "capture.png", { type: "image/png" })] } });
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Voici la capture." } });
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeEnabled();

    rerender(<Composer onSend={onSend} bodyRequired busy />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("compte les caractères près de la limite et refuse d'envoyer au-delà", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} maxLength={20} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x".repeat(19) } });
    expect(screen.getByText("19 / 20")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x".repeat(21) } });
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  });

  it("n'envoie qu'une fois quand deux clics arrivent avant le rendu suivant", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bonjour" } });

    // Both clicks in one batch: the field has not been emptied between them.
    const button = screen.getByRole("button", { name: "Envoyer" });
    act(() => {
      button.click();
      button.click();
    });
    expect(onSend).toHaveBeenCalledTimes(1);

    // The lock is lifted by the render: the next message leaves.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Encore" } });
    act(() => button.click());
    expect(onSend).toHaveBeenCalledTimes(2);
  });

  it("ne part pas pendant qu'un caractère est en cours de composition", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "é" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
  });
});
