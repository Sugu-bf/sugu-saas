import { render, screen } from "@testing-library/react";
import { Truck } from "lucide-react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { iconTileClass } from "@/design-system";
import { KpiCard, KpiGrid } from "../components/frame";

// The key figures of the courier follow the ones of the rest of the portal
// (V3): the icon alone, dark, no tinted tile; the figure; a short label.
// Colour is kept for what a status says.

vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const TINTS = /(?:bg|text|border)-(?:success|warning|danger|info|brand)/;

describe("KpiCard", () => {
  it("draws the icon alone and dark: no tile, no tint", () => {
    const { container } = render(<KpiCard icon={Truck} value={4} label="En cours" />);
    const icon = container.querySelector("svg")!;

    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("size-5", "text-foreground");
    // The icon sits in the card itself, not in a tile of its own.
    expect(icon.parentElement).toBe(container.firstElementChild);
    expect(container.innerHTML).not.toMatch(TINTS);
    for (const tile of Object.values(iconTileClass)) {
      for (const name of tile.split(" ")) expect(container.innerHTML).not.toContain(name);
    }
  });

  it("shows a figure that reads at a glance, over its label", () => {
    render(<KpiCard icon={Truck} value={12} label="Terminées" />);

    const figure = screen.getByText("12");
    expect(figure).toHaveClass("text-kpi", "text-foreground", "tabular-nums");
    expect(screen.getByText("Terminées")).toHaveClass("text-label", "text-foreground-muted");
    // Read label first, drawn figure first.
    expect(figure.compareDocumentPosition(screen.getByText("Terminées")) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(figure).toHaveClass("order-2");
  });

  it("is a link to the list it counts, and names it", () => {
    render(<KpiCard icon={Truck} value={4} label="À accepter" href="/driver/deliveries?liste=disponibles" />);

    const link = screen.getByRole("link", { name: /À accepter/ });
    expect(link).toHaveAttribute("href", "/driver/deliveries?liste=disponibles");
    expect(link).toHaveTextContent("4");
  });

  it("is not a link when there is no list behind the figure", () => {
    render(<KpiCard icon={Truck} value={2} label="Total cette semaine" />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Total cette semaine")).toBeInTheDocument();
  });

  it("holds its place while the figure loads, and shows no figure it does not have", () => {
    const { container } = render(<KpiCard icon={Truck} value={undefined} label="En cours" loading />);

    expect(container.querySelector(".text-kpi")).toBeNull();
    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(container.textContent).toBe("En cours");
  });

  it("is a named row of figures", () => {
    render(
      <KpiGrid label="Vos missions en chiffres">
        <KpiCard icon={Truck} value={1} label="En cours" />
      </KpiGrid>,
    );

    expect(screen.getByRole("region", { name: "Vos missions en chiffres" })).toHaveTextContent("1");
  });
});
