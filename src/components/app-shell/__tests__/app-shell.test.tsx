import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { User, UserRole } from "@/types";

const nav = vi.hoisted(() => ({
  pathname: "/vendor/dashboard",
  replace: vi.fn(),
  push: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  session: { data: null as unknown, isLoading: false, isError: false, error: null as unknown, isFetching: false, refetch: vi.fn() },
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
vi.mock("@/features/auth", () => {
  class SessionError extends Error {
    constructor(message: string, public status: number, public code: string) {
      super(message);
    }
  }
  return {
    SessionError,
    useSession: () => auth.session,
    useLogout: () => ({ mutate: auth.logout, isPending: false }),
  };
});

const { AppShell } = await import("../app-shell");
const { WorkspaceShell, isLegacyShellEnabled } = await import("../workspace-shell");
const { SessionError } = (await import("@/features/auth")) as unknown as {
  SessionError: new (message: string, status: number, code: string) => Error;
};

const makeUser = (role: UserRole, extra: Partial<User> = {}): User => ({
  id: 7,
  name: "Awa Traoré",
  email: "awa@example.com",
  role,
  avatar_url: null,
  email_verified_at: null,
  created_at: "2026-01-01T00:00:00Z",
  delivery_partner_id: null,
  business_name: role === "vendor" ? "Chez Awa" : role === "agency" ? "Faso Express" : null,
  store_id: null,
  courier_status: null,
  ...extra,
});

function signIn(role: UserRole, pathname: string, extra: Partial<User> = {}) {
  auth.session = { ...auth.session, data: makeUser(role, extra), isLoading: false, isError: false, error: null };
  nav.pathname = pathname;
}

const sidebar = () => within(document.getElementById("shell-sidebar") as HTMLElement);
const tabBar = () => within(screen.getByRole("navigation", { name: "Navigation rapide" }));

beforeEach(() => {
  nav.replace.mockClear();
  nav.push.mockClear();
  auth.logout.mockClear();
  window.localStorage.clear();
});

describe("AppShell — one frame, three roles", () => {
  it("vendor: sidebar lists every section, one active entry", () => {
    signIn("vendor", "/vendor/sugubox/stock");
    render(<AppShell role="vendor">contenu</AppShell>);

    for (const label of ["Commandes", "Finances", "Mon stock", "Mouvements", "Paramètres", "Support", "Aide et FAQ"]) {
      expect(sidebar().getByRole("link", { name: label })).toBeInTheDocument();
    }
    const current = sidebar()
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Mon stock"]);
    expect(sidebar().getByText("Chez Awa")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("contenu");
  });

  it("agency and courier get their own navigation, not the vendor one", () => {
    signIn("agency", "/agency/deliveries/12");
    const { unmount } = render(<AppShell role="agency">x</AppShell>);
    expect(sidebar().getByRole("link", { name: "Livraisons" })).toHaveAttribute("aria-current", "page");
    expect(sidebar().getByRole("link", { name: "Finances" })).toHaveAttribute("href", "/agency/earnings");
    expect(sidebar().queryByRole("link", { name: "Commandes" })).toBeNull();
    unmount();

    signIn("courier", "/driver/history");
    render(<AppShell role="courier">x</AppShell>);
    expect(sidebar().getByRole("link", { name: "Historique" })).toHaveAttribute("aria-current", "page");
    expect(sidebar().getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/driver/dashboard",
      "/driver/dashboard",
      "/driver/deliveries",
      "/driver/earnings",
      "/driver/history",
      "/driver/profile",
      "/driver/documents",
      "/driver/messages",
      "/driver/settings",
      "/faq",
    ]);
  });

  it("shows no decorative control: no search, no bell, no premium, no fake counter", () => {
    signIn("courier", "/driver/deliveries");
    render(<AppShell role="courier">x</AppShell>);
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByPlaceholderText(/rechercher/i)).toBeNull();
    expect(screen.queryByText(/premium/i)).toBeNull();
    expect(screen.queryByText(/mettre à niveau/i)).toBeNull();
    expect(screen.queryByLabelText(/notification/i)).toBeNull();
    expect(screen.queryByText(/en ligne/i)).toBeNull();
    expect(tabBar().getByRole("link", { name: "Missions" }).textContent).toBe("Missions");
  });

  it("collapses the sidebar to an icon rail and remembers it", async () => {
    signIn("vendor", "/vendor/orders");
    const { unmount } = render(<AppShell role="vendor">x</AppShell>);
    const toggle = screen.getByRole("button", { name: "Réduire le menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Étendre le menu" })).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("shell-sidebar")).toHaveAttribute("data-collapsed", "true");
    // Labels stay available as accessible names.
    expect(sidebar().getByRole("link", { name: "Commandes" })).toHaveAttribute("aria-current", "page");
    unmount();

    render(<AppShell role="vendor">x</AppShell>);
    expect(screen.getByRole("button", { name: "Étendre le menu" })).toBeInTheDocument();
  });

  it("folds a collapsible section, but never the one holding the current page", async () => {
    signIn("vendor", "/vendor/orders");
    const { unmount } = render(<AppShell role="vendor">x</AppShell>);
    const heading = sidebar().getByRole("button", { name: "Sugu Box" });
    expect(heading).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(heading);
    expect(heading).toHaveAttribute("aria-expanded", "false");
    expect(sidebar().queryByRole("link", { name: "Mon stock" })).toBeNull();
    unmount();

    signIn("vendor", "/vendor/sugubox/stock");
    render(<AppShell role="vendor">x</AppShell>);
    await userEvent.click(sidebar().getByRole("button", { name: "Sugu Box" }));
    expect(sidebar().getByRole("link", { name: "Mon stock" })).toBeInTheDocument();
  });
});

describe("AppShell — phone tab bar and menus", () => {
  it("shows the ranked tabs and marks the current one", () => {
    signIn("vendor", "/vendor/orders/42");
    render(<AppShell role="vendor">x</AppShell>);
    const links = tabBar().getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Accueil", "Commandes", "Finances", "Catalogue"]);
    expect(tabBar().getByRole("link", { name: "Commandes" })).toHaveAttribute("aria-current", "page");
    expect(tabBar().getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the menu with everything that is not a tab, and closes on Escape", async () => {
    signIn("vendor", "/vendor/dashboard");
    render(<AppShell role="vendor">x</AppShell>);
    const trigger = tabBar().getByRole("button", { name: "Menu" });
    await userEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Chez Awa" });
    const labels = within(dialog)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual([
      "Clients",
      "Inventaire",
      "Statistiques",
      "Marketing",
      "Messages",
      "Vue d'ensemble",
      "Mon stock",
      "Réceptions",
      "Expéditions",
      "Mouvements",
      "Paramètres",
      "Support",
      "Aide et FAQ",
    ]);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes the menu with its close button and when a link is followed", async () => {
    signIn("agency", "/agency/dashboard");
    render(<AppShell role="agency">x</AppShell>);
    await userEvent.click(tabBar().getByRole("button", { name: "Menu" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fermer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await userEvent.click(tabBar().getByRole("button", { name: "Menu" }));
    const link = within(screen.getByRole("dialog")).getByRole("link", { name: "Statistiques" });
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("highlights Menu when the current page lives in the menu", () => {
    signIn("vendor", "/vendor/statistics");
    render(<AppShell role="vendor">x</AppShell>);
    expect(tabBar().getAllByRole("link").filter((link) => link.getAttribute("aria-current"))).toEqual([]);
    expect(tabBar().getByRole("button", { name: "Menu" }).className).toContain("font-medium");
  });

  it("opens the full navigation in a drawer from the topbar (tablet)", async () => {
    signIn("courier", "/driver/dashboard");
    render(<AppShell role="courier">x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByRole("navigation", { name: "Navigation principale" })).toBeInTheDocument();
    expect(within(drawer).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Accueil",
      "Missions",
      "Gains",
      "Historique",
      "Profil",
      "Documents",
      "Messages",
      "Paramètres",
      "Aide et support",
    ]);
  });

  it("removes the tab bar on a chat screen", () => {
    signIn("vendor", "/vendor/messages/42");
    render(<AppShell role="vendor">x</AppShell>);
    expect(screen.queryByRole("navigation", { name: "Navigation rapide" })).toBeNull();
  });
});

describe("AppShell — account menu and logout", () => {
  it("lists real destinations and signs out", async () => {
    signIn("vendor", "/vendor/dashboard");
    render(<AppShell role="vendor">x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: /Menu du compte, Awa Traoré/ }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("awa@example.com")).toBeInTheDocument();
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Paramètres",
      "Support",
      "Aide et FAQ",
      "Se déconnecter",
    ]);
    expect(within(menu).getByRole("menuitem", { name: "Paramètres" })).toHaveAttribute("href", "/vendor/settings");

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Se déconnecter" }));
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it("signs out from the phone menu too", async () => {
    signIn("courier", "/driver/dashboard");
    render(<AppShell role="courier">x</AppShell>);
    await userEvent.click(tabBar().getByRole("button", { name: "Menu" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Se déconnecter" }));
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
});

describe("WorkspaceShell — guards are preserved", () => {
  it("shows the frame skeleton while the session loads, never the page", () => {
    auth.session = { ...auth.session, data: undefined, isLoading: true, isError: false };
    nav.pathname = "/vendor/orders";
    render(<WorkspaceShell role="vendor">secret</WorkspaceShell>);
    expect(screen.getByRole("status", { name: "Chargement de votre espace" })).toBeInTheDocument();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("no session (401): redirects to login with the destination", async () => {
    auth.session = { ...auth.session, data: null, isLoading: false, isError: false };
    nav.pathname = "/vendor/orders";
    render(<WorkspaceShell role="vendor">secret</WorkspaceShell>);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login?redirect=%2Fvendor%2Forders"));
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("another role: sent back to its own space, page not rendered", async () => {
    signIn("agency", "/vendor/wallet");
    render(<WorkspaceShell role="vendor">secret</WorkspaceShell>);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/agency/dashboard"));
    expect(screen.queryByText("secret")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("courier awaiting KYC approval: kept out of the courier space", async () => {
    signIn("courier", "/driver/deliveries", { courier_status: 4 });
    render(<WorkspaceShell role="courier">secret</WorkspaceShell>);
    // Sent to their file, where it is completed: the waiting screen left them nothing to do.
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/driver/documents"));
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("courier who cannot work: their file, profile and history stay open, without the mission entries", () => {
    for (const extra of [{ courier_status: 4 }, { courier_status: 2, courier_operational: false }]) {
      signIn("courier", "/driver/documents", extra);
      const { unmount } = render(<WorkspaceShell role="courier">dossier</WorkspaceShell>);
      expect(screen.getByText("dossier")).toBeInTheDocument();
      expect(nav.replace).not.toHaveBeenCalled();
      expect(sidebar().getByRole("link", { name: "Mon dossier" })).toHaveAttribute("aria-current", "page");
      expect(sidebar().queryByRole("link", { name: "Missions" })).toBeNull();
      expect(sidebar().queryByRole("link", { name: "Accueil" })).toBeNull();
      expect(tabBar().getAllByRole("link").map((link) => link.textContent)).toEqual(["Dossier", "Gains", "Profil"]);
      unmount();
    }
  });

  it("unsupported profile (403): explicit message and sign-out, no retry, no vendor fallback", async () => {
    auth.session = {
      ...auth.session,
      data: undefined,
      isLoading: false,
      isError: true,
      error: new SessionError("refusé", 403, "UNSUPPORTED_PROFILE"),
    };
    render(<WorkspaceShell role="vendor">secret</WorkspaceShell>);
    expect(screen.getByRole("alert")).toHaveTextContent("Ce compte n'a pas accès à l'espace professionnel");
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(screen.queryByText("secret")).toBeNull();
    expect(nav.replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it("outage: offers a retry instead of logging out", async () => {
    auth.session = {
      ...auth.session,
      data: undefined,
      isLoading: false,
      isError: true,
      error: new SessionError("indisponible", 502, "UNAVAILABLE"),
    };
    render(<WorkspaceShell role="agency">secret</WorkspaceShell>);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(auth.session.refetch).toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("renders the page inside the shell for the right role", () => {
    signIn("agency", "/agency/dashboard");
    render(<WorkspaceShell role="agency">tableau</WorkspaceShell>);
    expect(screen.getByRole("main")).toHaveTextContent("tableau");
    expect(document.querySelector('[data-shell="pro"]')).toHaveAttribute("data-role", "agency");
  });

  it("only the exact value `legacy` brings the previous frame back", () => {
    expect(isLegacyShellEnabled("legacy")).toBe(true);
    for (const value of [undefined, "", "1", "true", "LEGACY", "new"]) expect(isLegacyShellEnabled(value)).toBe(false);
  });
});

describe("AppShell — the main action of a space", () => {
  it("agency: « Nouvelle course » sits at the foot of the sidebar and leads to the form", () => {
    signIn("agency", "/agency/dashboard");
    render(<AppShell role="agency">x</AppShell>);
    expect(sidebar().getByRole("link", { name: "Nouvelle course" })).toHaveAttribute("href", "/agency/deliveries/new");
  });

  it("keeps its name on the icon rail", async () => {
    signIn("agency", "/agency/dashboard");
    render(<AppShell role="agency">x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Réduire le menu" }));
    const action = sidebar().getByRole("link", { name: "Nouvelle course" });
    expect(action).toHaveAttribute("href", "/agency/deliveries/new");
    expect(action).not.toHaveTextContent("Nouvelle course");
  });

  it("is offered in the tablet drawer too, and closes it when followed", async () => {
    signIn("agency", "/agency/dashboard");
    render(<AppShell role="agency">x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const drawer = within(screen.getByRole("dialog"));
    await userEvent.click(drawer.getByRole("link", { name: "Nouvelle course" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("vendor and courier have none: no button is added where no action was decided", () => {
    signIn("vendor", "/vendor/dashboard");
    const { unmount } = render(<AppShell role="vendor">x</AppShell>);
    expect(sidebar().queryByRole("link", { name: /Nouvelle/ })).not.toBeInTheDocument();
    unmount();
    signIn("courier", "/driver/dashboard");
    render(<AppShell role="courier">x</AppShell>);
    expect(sidebar().queryByRole("link", { name: /Nouvelle/ })).not.toBeInTheDocument();
  });
});
