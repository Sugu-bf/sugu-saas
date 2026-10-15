import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Scale, User } from "lucide-react";
import { ApiError } from "@/lib/http/api-error";

// The settings of V9, with the server played by the HTTP client: what is
// sent, what is said when the server refuses, and that nothing is shown as
// saved that the server did not keep.

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/settings",
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_MARKETPLACE_URL: "https://sugu.pro", NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1" } }));
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn(), request: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/http/client", () => ({
  api: { get: http.get, put: http.put, post: http.post, delete: http.delete, patch: vi.fn() },
  apiRequest: http.request,
  apiFetch: http.fetch,
}));
vi.mock("@/features/auth/service", () => ({ logout: vi.fn(async () => undefined) }));

const { useDraft } = await import("../use-draft");
const { SettingsFrame, useUnsavedChanges } = await import("../frame");
const { PasswordCard } = await import("../security");
const { ClosingPanel } = await import("../closing");
const { ProfileSection } = await import("@/features/vendor/settings/profile-section");
const { NotificationsSection } = await import("@/features/vendor/settings/sections");
const { ZonesSection } = await import("@/features/agency/settings/zones-section");
const { parseVendorSettings } = await import("@/features/vendor/settings/api");

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const refusal = (status: number, errors: Record<string, string[]> = {}, message = "Refusé") => new ApiError({ message, status, errors });

const VENDOR_RAW = {
  data: {
    storeId: "store-1",
    profile: { firstName: "Aminata", lastName: "Traoré", email: "aminata@boutique.test", phone: "+22670000001", timezone: "Africa/Ouagadougou" },
    identity: { storeName: "Boutique Tech", storeType: "Mode", slug: "boutique-tech", description: "Mode", logoUrl: null, coverUrl: null },
    contact: { email: "contact@boutique.test", phone: "+22670123456", address: { street: "Koulouba", city: "Ouagadougou" }, socials: { facebook: "" } },
    legal: {},
    security: { lastPasswordChange: null },
    notifications: {
      effective: {
        new_order: { email: true, push: true, whatsapp: true },
        order_shipped: { push: true, whatsapp: true },
        order_delivered: { email: true, push: true, whatsapp: true },
        order_cancelled: { email: true, push: true, whatsapp: true },
        low_stock: { app: true },
      },
      reachable: { email: true, push: false, whatsapp: false },
    },
    showSocialOnShop: false,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
  http.get.mockImplementation(async (path: string) => {
    if (path === "sellers/settings/categories") return { data: [{ id: "1", name: "Mode" }] };
    throw new Error(`unexpected GET ${path}`);
  });
});

// ── The draft ────────────────────────────────────────────────

describe("useDraft", () => {
  it("follows a new answer of the server while nothing was typed, and never wipes what was typed", () => {
    const { result, rerender } = renderHook(({ server }) => useDraft(server), { initialProps: { server: { name: "A", city: "Ouaga" } } });
    rerender({ server: { name: "B", city: "Ouaga" } });
    expect(result.current.values.name).toBe("B");

    act(() => result.current.set("city", "Bobo"));
    rerender({ server: { name: "C", city: "Ouaga" } });
    expect(result.current.values).toEqual({ name: "B", city: "Bobo" });
    expect(result.current.dirty).toBe(true);
  });

  it("keeps changed only what was not saved", () => {
    const { result } = renderHook(() => useDraft({ name: "A", city: "Ouaga" }));
    act(() => {
      result.current.set("name", "B");
      result.current.set("city", "Bobo");
    });
    act(() => result.current.commit(["name"]));
    expect(result.current.changed).toEqual(["city"]);
  });
});

// ── The frame ────────────────────────────────────────────────

function Dirty() {
  useUnsavedChanges(true);
  return <p>Formulaire modifié</p>;
}

describe("SettingsFrame", () => {
  it("asks before leaving a section with changes not saved", async () => {
    const user = userEvent.setup({ delay: null });
    nav.params = new URLSearchParams("section=profile");
    wrap(
      <SettingsFrame
        description="Gérez les paramètres de votre boutique"
        sections={[
          { key: "profile", label: "Mon profil", icon: User },
          { key: "legal", label: "Mentions légales", icon: Scale },
        ]}
        render={(key) => (key === "profile" ? <Dirty /> : <p>Légal</p>)}
      />,
    );
    await user.click(screen.getByRole("link", { name: "Mentions légales" }));
    expect(nav.push).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Quitter sans enregistrer" }));
    expect(nav.push).toHaveBeenCalledWith("/vendor/settings?section=legal", { scroll: false });
  });
});

// ── Profile: several calls, a precise report ─────────────────

describe("ProfileSection", () => {
  it("sends only the parts that changed, and says exactly which one was not saved", async () => {
    const user = userEvent.setup({ delay: null });
    http.put.mockImplementation(async (path: string) => {
      if (path === "sellers/settings/contact") throw refusal(422, { email: ["L'adresse e-mail est invalide."] });
      return { success: true };
    });
    wrap(<ProfileSection model={parseVendorSettings(VENDOR_RAW)} />);

    // Pasted, not typed: what is tested is which parts are sent. Typed key by
    // key, this large form re-rendered at each key and the test came within
    // a few hundred milliseconds of the 5 s limit, over it in the full suite.
    await user.clear(screen.getByLabelText(/Nom de la boutique/));
    await user.paste("Boutique Tech Ouaga");
    await user.clear(screen.getByLabelText(/^Téléphone/));
    await user.paste("+22670999999");
    await user.click(screen.getAllByRole("button", { name: /Enregistrer/ })[0]);

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(2));
    expect(http.put.mock.calls.map((call) => call[0])).toEqual(["sellers/settings/identity", "sellers/settings/contact"]);
    expect(await screen.findByText("Enregistrement partiel")).toBeTruthy();
    expect(screen.getByText(/Enregistré : les informations de la boutique/)).toBeTruthy();
    expect(screen.getByText("L'adresse e-mail est invalide.")).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
    // What was typed and refused stays in the form.
    expect((screen.getByLabelText(/^Téléphone/) as HTMLInputElement).value).toBe("+22670999999");
  });

  it("checks the form before sending anything", async () => {
    const user = userEvent.setup({ delay: null });
    wrap(<ProfileSection model={parseVendorSettings(VENDOR_RAW)} />);
    await user.clear(screen.getByLabelText(/^Email/));
    await user.type(screen.getByLabelText(/^Email/), "pas-une-adresse");
    await user.click(screen.getAllByRole("button", { name: /Enregistrer/ })[0]);
    expect(await screen.findByText("Cette adresse e-mail n'est pas valide.")).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
  });
});

// ── Notifications ────────────────────────────────────────────

describe("NotificationsSection", () => {
  it("sends the whole matrix of the events that exist, never SMS", async () => {
    const user = userEvent.setup({ delay: null });
    http.put.mockResolvedValue({ success: true });
    wrap(<NotificationsSection model={parseVendorSettings(VENDOR_RAW)} />);
    await user.click(screen.getByRole("switch", { name: "Nouvelle commande par E-mail" }));
    await user.click(screen.getAllByRole("button", { name: /Enregistrer/ })[0]);

    await waitFor(() => expect(http.put).toHaveBeenCalled());
    const [path, body] = http.put.mock.calls[0];
    expect(path).toBe("sellers/settings/notifications");
    expect(body.channels).toEqual({ sms: false, email: true, push: true, whatsapp: true });
    expect(body.eventPreferences).toHaveLength(5);
    expect(body.eventPreferences[0]).toEqual({ event: "new_order", sms: false, email: false, push: true, whatsapp: true });
    expect(body.eventPreferences.every((row: { sms: boolean }) => row.sms === false)).toBe(true);
  });
});

// ── Zones and prices ─────────────────────────────────────────

describe("ZonesSection", () => {
  const zones = [{ id: "z1", name: "Ouagadougou", tarif: 2000, delay: "1–2 jours", enabled: true, zoneActive: true, atCheckout: true, position: { lat: 12.37, lng: -1.52, source: "locality" } }];

  beforeEach(() => {
    http.get.mockImplementation(async (path: string) => {
      if (path === "agencies/a1/zones") return { data: zones, meta: { max_tarif: 1_000_000 } };
      if (path === "agencies/a1/zones/catalog") return { data: [{ id: "z2", name: "Saaba" }] };
      throw new Error(`unexpected GET ${path}`);
    });
  });

  it("refuses a price of 0, with centimes or above the ceiling before asking the server", async () => {
    const user = userEvent.setup({ delay: null });
    wrap(<ZonesSection agencyId="a1" />);
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Ajouter une zone" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Zone/), "Saaba");

    for (const [typed, message] of [
      ["0", /au moins 1 FCFA/],
      ["2500,5", /montant entier/],
      ["2000000", /ne peut pas dépasser/],
    ] as const) {
      await user.clear(within(dialog).getByLabelText(/^Tarif/));
      await user.type(within(dialog).getByLabelText(/^Tarif/), typed);
      await user.click(within(dialog).getByRole("button", { name: "Ajouter la zone" }));
      expect(await within(dialog).findByText(message)).toBeTruthy();
    }
    expect(http.post).not.toHaveBeenCalled();
  });

  it("sends a whole number of francs, and says when the zone is already served", async () => {
    const user = userEvent.setup({ delay: null });
    http.post.mockRejectedValueOnce(refusal(409, {}, "Votre agence dessert déjà la zone « Saaba »."));
    wrap(<ZonesSection agencyId="a1" />);
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Ajouter une zone" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Zone/), "  Saaba ");
    await user.type(within(dialog).getByLabelText(/^Tarif/), "2 500");
    await user.click(within(dialog).getByRole("button", { name: "Ajouter la zone" }));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith("agencies/a1/zones", { name: "Saaba", tarif: 2500, delay: "1–2 jours", enabled: true }));
    expect(await within(dialog).findByText("Votre agence dessert déjà la zone « Saaba ».")).toBeTruthy();
  });
});

// ── Password ─────────────────────────────────────────────────

describe("PasswordCard", () => {
  it("checks the confirmation first, then puts the server's refusal under its field", async () => {
    const user = userEvent.setup({ delay: null });
    const submit = vi.fn().mockRejectedValue(refusal(422, { currentPassword: ["Le mot de passe actuel est incorrect."] }));
    wrap(<PasswordCard changedAt={null} submit={submit} fieldMap={{ currentPassword: "current", newPassword: "next" }} />);

    await user.type(screen.getByLabelText(/Mot de passe actuel/), "ancien");
    await user.type(screen.getByLabelText(/Nouveau mot de passe/), "Nouveau-2026");
    await user.type(screen.getByLabelText(/Confirmation/), "Autre-2026");
    await user.click(screen.getByRole("button", { name: "Changer le mot de passe" }));
    expect(await screen.findByText("Les deux saisies ne correspondent pas.")).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/Confirmation/));
    await user.type(screen.getByLabelText(/Confirmation/), "Nouveau-2026");
    await user.click(screen.getByRole("button", { name: "Changer le mot de passe" }));
    expect(await screen.findByText("Le mot de passe actuel est incorrect.")).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

// ── Closing ──────────────────────────────────────────────────

describe("ClosingPanel", () => {
  it("lists what still ties the account and offers nothing to press", async () => {
    http.get.mockResolvedValue({ data: { blockers: [{ code: "OPEN_ORDERS", count: 2, message: "2 commandes sont encore en cours : livrez-les ou annulez-les." }] } });
    const submit = vi.fn();
    wrap(<ClosingPanel checkPath="sellers/settings/account/deletion-check" submit={submit} consequences={["Votre boutique est retirée."]} />);
    expect(await screen.findByText(/2 commandes sont encore en cours/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Supprimer mon compte" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("asks for the password, the word, then a last confirmation", async () => {
    const user = userEvent.setup({ delay: null });
    http.get.mockResolvedValue({ data: { blockers: [] } });
    const submit = vi.fn().mockResolvedValue(undefined);
    wrap(<ClosingPanel checkPath="courier/settings/account/deletion-check" submit={submit} consequences={["Fin."]} />);
    const button = await screen.findByRole("button", { name: "Supprimer mon compte" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));

    await user.click(button);
    expect(await screen.findByText("Saisissez votre mot de passe.")).toBeTruthy();
    await user.type(screen.getByLabelText(/^Mot de passe/), "secret");
    await user.type(screen.getByLabelText(/écrivez SUPPRIMER/), "supprimer");
    await user.click(button);
    expect(await screen.findByText(/Écrivez SUPPRIMER en majuscules/)).toBeTruthy();
    await user.clear(screen.getByLabelText(/écrivez SUPPRIMER/));
    await user.type(screen.getByLabelText(/écrivez SUPPRIMER/), "SUPPRIMER");
    await user.click(button);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer définitivement" }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith("secret"));
    expect(nav.replace).toHaveBeenCalledWith("/login?reason=account_closed");
  });
});
