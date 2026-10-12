import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { queryKeys } from "@/lib/query";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(nav.search),
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
vi.mock("@/lib/echo", () => ({ disconnectEcho: vi.fn() }));

const { LoginForm } = await import("../login-form");
const { ForgotPasswordForm } = await import("../forgot-password-form");
const { SetPasswordForm } = await import("../set-password-form");
const { useLogout } = await import("../hooks");
const { DriverSignupWizard } = await import("@/app/(auth)/signup/driver/_components/driver-signup-wizard");

type Reply = { status?: number; json: unknown };
type Handler = (body: Record<string, unknown>) => Reply;
interface Call {
  path: string;
  method: string;
  body: Record<string, unknown>;
}

let calls: Call[] = [];

/** Same-origin BFF only: any other URL fails the test. */
function mockBff(handlers: Record<string, Handler>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (!path.startsWith("/api/")) throw new Error(`unexpected non-BFF request: ${path}`);
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
      calls.push({ path, method: init?.method ?? "GET", body });
      const handler = handlers[path];
      if (!handler) throw new Error(`unexpected request: ${path}`);
      const { status = 200, json } = handler(body);
      return new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } });
    }),
  );
}

const callsTo = (path: string) => calls.filter((call) => call.path === path);

let client: QueryClient;
function renderWithClient(ui: ReactElement) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sessionUser = (role: string, extra: Record<string, unknown> = {}) => ({
  id: 1,
  name: "Awa Traoré",
  email: "awa@example.com",
  role,
  avatar_url: null,
  email_verified_at: null,
  created_at: "2026-01-01T00:00:00Z",
  delivery_partner_id: null,
  business_name: null,
  store_id: null,
  courier_status: null,
  ...extra,
});

async function fillLogin(email = "awa@example.com", password = "secret123") {
  await userEvent.type(screen.getByLabelText(/Adresse e-mail/), email);
  await userEvent.type(screen.getByLabelText(/^Mot de passe/), password);
  await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
}

beforeEach(() => {
  nav.push.mockClear();
  nav.replace.mockClear();
  nav.search = "";
  window.history.replaceState({}, "", "/login");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("login", () => {
  it("offers only working controls", () => {
    mockBff({});
    renderWithClient(<LoginForm />);
    expect(screen.queryByRole("button", { name: /google|apple|facebook/i })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/se souvenir/i)).toBeNull();
    const forgot = screen.getByRole("link", { name: "Mot de passe oublié ?" });
    expect(forgot).toHaveAttribute("href", "/forgot-password");
    expect(forgot).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("link", { name: /Rejoindre avec un code/ })).toHaveAttribute("href", "/signup/driver");
  });

  it("validates before calling the server", async () => {
    mockBff({});
    renderWithClient(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(document.getElementById("email-error")).toHaveTextContent("Email invalide");
    expect(document.getElementById("password-error")).toHaveTextContent("au moins 6 caractères");
    expect(screen.getByLabelText(/Adresse e-mail/)).toHaveAttribute("aria-invalid", "true");
    expect(calls).toEqual([]);
  });

  it("toggles password visibility with a reachable button", async () => {
    mockBff({});
    renderWithClient(<LoginForm />);
    const field = screen.getByLabelText(/^Mot de passe/);
    expect(field).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Afficher le mot de passe" });
    expect(toggle).not.toHaveAttribute("tabindex", "-1");
    await userEvent.click(toggle);
    expect(field).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    [401, "Email ou mot de passe incorrect."],
    [429, "Trop de tentatives. Veuillez réessayer dans un moment."],
  ])("explains a %i", async (status, message) => {
    mockBff({ "/api/auth/login": () => ({ status, json: { message: "raw" } }) });
    renderWithClient(<LoginForm />);
    await fillLogin();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it.each([
    ["vendor", {}, "/vendor/dashboard"],
    ["agency", {}, "/agency/dashboard"],
    ["courier", { courier_status: 1 }, "/driver/dashboard"],
    // A courier who cannot work yet lands on their file, where it is completed.
    ["courier", { courier_status: 4 }, "/driver/documents"],
  ])("sends a %s to its own space", async (role, extra, destination) => {
    mockBff({ "/api/auth/login": () => ({ json: { data: { user: sessionUser(role, extra) } } }) });
    renderWithClient(<LoginForm />);
    await fillLogin();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(destination));
    expect(callsTo("/api/auth/login")[0].body).toEqual({ email: "awa@example.com", password: "secret123" });
  });

  it("honours a redirect inside the user's space and nothing else", async () => {
    mockBff({ "/api/auth/login": () => ({ json: { data: { user: sessionUser("agency") } } }) });

    window.history.replaceState({}, "", "/login?redirect=%2Fagency%2Fdeliveries%2F12");
    const first = renderWithClient(<LoginForm />);
    await fillLogin();
    await waitFor(() => expect(nav.push).toHaveBeenLastCalledWith("/agency/deliveries/12"));
    first.unmount();

    for (const redirect of ["https://evil.example/agency/", "//evil.example", "/vendor/wallet", "/\\evil.example"]) {
      window.history.replaceState({}, "", `/login?redirect=${encodeURIComponent(redirect)}`);
      const view = renderWithClient(<LoginForm />);
      await fillLogin();
      await waitFor(() => expect(nav.push).toHaveBeenLastCalledWith("/agency/dashboard"));
      view.unmount();
    }
    // Five sign-ins in one test: at about a second each, the default five seconds were its
    // exact cost, and it timed out whenever the machine was busy — leaving its last form
    // mounted, which then failed the test after it.
  }, 20_000);

  it("refuses an unknown role instead of treating it as a vendor", async () => {
    mockBff({ "/api/auth/login": () => ({ json: { data: { user: sessionUser("admin") } } }) });
    renderWithClient(<LoginForm />);
    await fillLogin();
    expect(await screen.findByText("Une erreur inattendue est survenue.")).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.auth.me())).toBeUndefined();
  });

  it("announces an expired session", async () => {
    mockBff({});
    window.history.replaceState({}, "", "/login?reason=expired");
    renderWithClient(<LoginForm />);
    expect(await screen.findByText("Votre session a expiré")).toBeInTheDocument();
  });
});

describe("login — one-time code", () => {
  const challenge = () => ({
    json: { data: { verification_required: true, identifier: "awa@example.com", expires_in: 600 } },
  });

  it("asks for the code, verifies it and signs in", async () => {
    mockBff({
      "/api/auth/login": challenge,
      "/api/auth/verify-otp": () => ({ json: { data: { user: sessionUser("vendor") } } }),
    });
    renderWithClient(<LoginForm />);
    await fillLogin();

    expect(await screen.findByText("Vérification en deux étapes")).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    const code = screen.getByLabelText(/Code de vérification/);
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(code).toHaveAttribute("inputmode", "numeric");

    await userEvent.type(code, "12a34 56789");
    expect(code).toHaveValue("123456");
    await userEvent.click(screen.getByRole("button", { name: "Vérifier et se connecter" }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/vendor/dashboard"));
    expect(callsTo("/api/auth/verify-otp")[0].body).toEqual({ identifier: "awa@example.com", code: "123456", type: 3 });
  });

  it("rejects an incomplete code locally and shows the server refusal", async () => {
    mockBff({
      "/api/auth/login": challenge,
      "/api/auth/verify-otp": () => ({ status: 422, json: { message: "Code invalide ou expiré." } }),
    });
    renderWithClient(<LoginForm />);
    await fillLogin();
    const code = await screen.findByLabelText(/Code de vérification/);

    await userEvent.type(code, "123");
    await userEvent.click(screen.getByRole("button", { name: "Vérifier et se connecter" }));
    expect(await screen.findByText("Le code doit contenir 6 chiffres.")).toBeInTheDocument();
    expect(callsTo("/api/auth/verify-otp")).toEqual([]);

    await userEvent.type(code, "456");
    await userEvent.click(screen.getByRole("button", { name: "Vérifier et se connecter" }));
    expect(await screen.findByText("Code invalide ou expiré.")).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Retour à la connexion" }));
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });
});

describe("logout", () => {
  function LogoutButton() {
    const logout = useLogout();
    return <button onClick={() => logout.mutate()}>quitter</button>;
  }

  it.each([
    ["the server answers", () => ({ json: { message: "Déconnecté" } })],
    ["the server fails", () => ({ status: 500, json: {} })],
  ])("clears the cache and returns to login when %s", async (_label, handler) => {
    mockBff({ "/api/auth/logout": handler });
    renderWithClient(<LogoutButton />);
    client.setQueryData(queryKeys.auth.me(), sessionUser("vendor"));
    await userEvent.click(screen.getByRole("button", { name: "quitter" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/login"));
    expect(callsTo("/api/auth/logout")[0].method).toBe("POST");
    expect(client.getQueryData(queryKeys.auth.me())).toBeUndefined();
  });
});

describe("password recovery", () => {
  it("goes from e-mail to code to done", async () => {
    mockBff({
      "/api/auth/forgot-password": () => ({ json: { message: "ok" } }),
      "/api/auth/reset-password": () => ({ json: { message: "ok" } }),
    });
    renderWithClient(<ForgotPasswordForm />);

    await userEvent.type(screen.getByLabelText(/Adresse e-mail/), "pas-un-email");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer le code" }));
    expect(await screen.findByText("L'adresse email n'est pas valide.")).toBeInTheDocument();
    expect(calls).toEqual([]);

    await userEvent.clear(screen.getByLabelText(/Adresse e-mail/));
    await userEvent.type(screen.getByLabelText(/Adresse e-mail/), " awa@example.com ");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer le code" }));
    expect(await screen.findByText("Code envoyé")).toBeInTheDocument();
    expect(callsTo("/api/auth/forgot-password")[0].body).toEqual({ email: "awa@example.com" });

    await userEvent.type(screen.getByLabelText(/Code de vérification/), "654321");
    await userEvent.type(screen.getByLabelText(/^Nouveau mot de passe/), "motdepasse1");
    await userEvent.type(screen.getByLabelText(/^Confirmer le mot de passe/), "different");
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));
    expect(await screen.findByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(callsTo("/api/auth/reset-password")).toEqual([]);

    await userEvent.clear(screen.getByLabelText(/^Confirmer le mot de passe/));
    await userEvent.type(screen.getByLabelText(/^Confirmer le mot de passe/), "motdepasse1");
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));

    expect(await screen.findByText("Mot de passe modifié")).toBeInTheDocument();
    expect(callsTo("/api/auth/reset-password")[0].body).toMatchObject({
      code: "654321",
      password: "motdepasse1",
      password_confirmation: "motdepasse1",
    });
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/login");
  });

  it("maps server field errors to the fields", async () => {
    mockBff({
      "/api/auth/forgot-password": () => ({ json: {} }),
      "/api/auth/reset-password": () => ({ status: 422, json: { errors: { code: ["Code expiré."] } } }),
    });
    renderWithClient(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText(/Adresse e-mail/), "awa@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer le code" }));
    await userEvent.type(await screen.findByLabelText(/Code de vérification/), "654321");
    await userEvent.type(screen.getByLabelText(/^Nouveau mot de passe/), "motdepasse1");
    await userEvent.type(screen.getByLabelText(/^Confirmer le mot de passe/), "motdepasse1");
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));
    expect(await screen.findByText("Code expiré.")).toBeInTheDocument();
  });
});

describe("first access by e-mail link", () => {
  const valid = () => ({ json: { data: { valid: true } } });

  async function choosePassword(password = "motdepasse1", confirmation = password) {
    await userEvent.type(await screen.findByLabelText(/^Nouveau mot de passe/), password);
    await userEvent.type(screen.getByLabelText(/^Confirmer le mot de passe/), confirmation);
    await userEvent.click(screen.getByRole("button", { name: "Définir mon mot de passe" }));
  }

  it.each([
    ["no token", "", "awa@example.com"],
    ["no e-mail", "tok", ""],
  ])("says so when the link is incomplete (%s), without calling the server", (_label, token, email) => {
    mockBff({});
    renderWithClient(<SetPasswordForm token={token} email={email} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Lien incomplet");
    expect(screen.getByRole("link", { name: "Demander un nouveau code" })).toHaveAttribute("href", "/forgot-password");
    expect(calls).toEqual([]);
  });

  it("says so when the link is expired or invalid", async () => {
    mockBff({ "/api/auth/verify-reset-token": () => ({ status: 422, json: { data: { valid: false } } }) });
    renderWithClient(<SetPasswordForm token="tok" email="awa@example.com" />);
    expect(await screen.findByText("Lien expiré ou invalide")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nouveau mot de passe/)).toBeNull();
  });

  it("does not call an outage an expired link, and can retry", async () => {
    let up = false;
    mockBff({
      "/api/auth/verify-reset-token": () => (up ? valid() : { status: 502, json: { message: "down" } }),
    });
    renderWithClient(<SetPasswordForm token="tok" email="awa@example.com" />);
    expect(await screen.findByText("Vérification impossible pour le moment")).toBeInTheDocument();
    expect(screen.queryByText("Lien expiré ou invalide")).toBeNull();

    up = true;
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByLabelText(/^Nouveau mot de passe/)).toBeInTheDocument();
  });

  it.each([
    ["vendor", "/vendor/dashboard"],
    ["agency", "/agency/dashboard"],
  ])("works without a session and opens the %s space", async (role, destination) => {
    mockBff({
      "/api/auth/verify-reset-token": valid,
      "/api/auth/set-password": () => ({ json: { success: true, data: { user: sessionUser(role) } } }),
    });
    renderWithClient(<SetPasswordForm token="tok" email="awa@example.com" />);
    await choosePassword();

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(destination));
    expect(callsTo("/api/auth/set-password")[0].body).toEqual({
      email: "awa@example.com",
      token: "tok",
      password: "motdepasse1",
      password_confirmation: "motdepasse1",
    });
    // Never depended on an existing session.
    expect(callsTo("/api/auth/me")).toEqual([]);
    expect(client.getQueryData(queryKeys.auth.me())).toMatchObject({ role });
  });

  it("sends an unknown profile to login, never to the vendor space", async () => {
    mockBff({
      "/api/auth/verify-reset-token": valid,
      "/api/auth/set-password": () => ({ json: { success: true, data: { user: sessionUser("admin") } } }),
    });
    renderWithClient(<SetPasswordForm token="tok" email="awa@example.com" />);
    await choosePassword();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login"));
    expect(client.getQueryData(queryKeys.auth.me())).toBeUndefined();
  });

  it("checks the confirmation before sending and shows a server refusal", async () => {
    mockBff({
      "/api/auth/verify-reset-token": valid,
      "/api/auth/set-password": () => ({ status: 403, json: { message: "Ce compte n'a pas accès à l'espace professionnel." } }),
    });
    renderWithClient(<SetPasswordForm token="tok" email="awa@example.com" />);
    await choosePassword("motdepasse1", "autre");
    expect(await screen.findByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(callsTo("/api/auth/set-password")).toEqual([]);

    await userEvent.clear(screen.getByLabelText(/^Confirmer le mot de passe/));
    await userEvent.type(screen.getByLabelText(/^Confirmer le mot de passe/), "motdepasse1");
    await userEvent.click(screen.getByRole("button", { name: "Définir mon mot de passe" }));
    expect(await screen.findByText("Ce compte n'a pas accès à l'espace professionnel.")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});

describe("courier signup", () => {
  it("starts on the agency code and trusts only the server's answer", async () => {
    mockBff({ "/api/auth/courier-validate-code": () => ({ status: 404, json: { message: "Code inconnu." } }) });
    nav.search = "ref=faso2026";
    renderWithClient(<DriverSignupWizard />);

    const code = screen.getByLabelText(/Code de recrutement/);
    expect(code).toHaveValue("FASO2026");
    expect(screen.queryByText(/valide/i)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Vérifier le code" }));
    expect(await screen.findByText("Code inconnu.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nom/)).toBeNull();
  });

  it("moves to the identity step once the agency code is accepted", async () => {
    mockBff({
      "/api/auth/courier-validate-code": () => ({ json: { data: { agency_name: "Faso Express", partner_id: 9 } } }),
    });
    renderWithClient(<DriverSignupWizard />);
    await userEvent.type(screen.getByLabelText(/Code de recrutement/), "faso2026");
    await userEvent.click(screen.getByRole("button", { name: "Vérifier le code" }));
    expect(await screen.findByText("Agence : Faso Express")).toBeInTheDocument();
    expect(callsTo("/api/auth/courier-validate-code")[0].body).toEqual({ code: "FASO2026" });
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeInTheDocument();
  });

  describe("pending approval", () => {
    beforeEach(() => {
      nav.search = "step=pending";
    });

    it("has no activation shortcut and no placeholder data", () => {
      mockBff({});
      renderWithClient(<DriverSignupWizard />);
      expect(screen.getByRole("heading", { name: "Compte en attente de validation" })).toBeInTheDocument();
      expect(screen.queryByText(/skip/i)).toBeNull();
      expect(screen.queryByText(/compte validé/i)).toBeNull();
      expect(screen.queryByText(/Sugu Express|Pompidou|CNI-123456789|il y a 2 heures/)).toBeNull();
      expect(screen.queryByRole("button", { name: /prendre une photo/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /livraisons/i })).toBeNull();
    });

    it("stays put while the API still reports KYC pending", async () => {
      mockBff({ "/api/auth/me": () => ({ json: { data: sessionUser("courier", { courier_status: 4 }) } }) });
      renderWithClient(<DriverSignupWizard />);
      await userEvent.click(screen.getByRole("button", { name: "Vérifier mon statut" }));
      expect(await screen.findByText(/toujours en cours d'examen/)).toBeInTheDocument();
      expect(nav.push).not.toHaveBeenCalled();
    });

    it("opens the courier space only once the API says the account is active", async () => {
      mockBff({ "/api/auth/me": () => ({ json: { data: sessionUser("courier", { courier_status: 1 }) } }) });
      renderWithClient(<DriverSignupWizard />);
      await userEvent.click(screen.getByRole("button", { name: "Vérifier mon statut" }));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/driver/dashboard"));
    });

    it("goes to login when there is no session, and reports an outage", async () => {
      mockBff({ "/api/auth/me": () => ({ status: 401, json: {} }) });
      const view = renderWithClient(<DriverSignupWizard />);
      await userEvent.click(screen.getByRole("button", { name: "Vérifier mon statut" }));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/login"));
      view.unmount();

      nav.push.mockClear();
      mockBff({ "/api/auth/me": () => ({ status: 502, json: {} }) });
      renderWithClient(<DriverSignupWizard />);
      await userEvent.click(screen.getByRole("button", { name: "Vérifier mon statut" }));
      expect(await screen.findByText(/Impossible de vérifier votre statut/)).toBeInTheDocument();
      expect(nav.push).not.toHaveBeenCalled();
    });
  });
});
