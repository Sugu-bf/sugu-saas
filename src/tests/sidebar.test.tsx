import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock features/auth hooks
vi.mock("@/features/auth", () => ({
  useSession: () => ({
    data: { id: 1, name: "Test User", email: "test@sugu.com", role: "vendor" },
    isLoading: false,
  }),
  useLogout: () => ({
    mutate: vi.fn(),
  }),
}));

// Must import AFTER mocks
const { Sidebar } = await import("@/components/shell/sidebar");

describe("Sidebar", () => {
  it("renders vendor navigation items", () => {
    render(<Sidebar role="vendor" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Commandes")).toBeInTheDocument();
    expect(screen.getByText("Produits")).toBeInTheDocument();
  });

  it("renders agency navigation items", () => {
    render(<Sidebar role="agency" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Livraisons")).toBeInTheDocument();
  });

  it("has accessible navigation landmark", () => {
    render(<Sidebar role="vendor" />);

    expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
  });

  it("highlights active link", () => {
    render(<Sidebar role="vendor" />);

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });
});
