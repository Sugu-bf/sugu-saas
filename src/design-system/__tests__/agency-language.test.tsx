import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download, Package, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "../data-table/data-table";
import { Alert } from "../primitives/alert";
import { Avatar } from "../primitives/avatar";
import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import { Section, iconTileClass } from "../primitives/card";
import { DescriptionList } from "../primitives/description-list";
import { PageHeader } from "../primitives/page-header";
import { Pagination, pageWindow } from "../primitives/pagination";
import { Stat } from "../primitives/stat";

// What the agency mock-ups ("SUGU Pro V3") asked of Foundation: every piece
// here is an extension of a primitive that keeps its former look by default.

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("tokens", () => {
  const css = readFileSync(resolve(__dirname, "../tokens.css"), "utf8");
  const agencyScope = css.slice(css.indexOf(':root:has([data-shell="pro"][data-role="agency"])'));

  it("keeps buttons and badges fully rounded in every workspace, the agency included", () => {
    expect(css).toMatch(/--radius-button: 9999px;/);
    expect(css).toMatch(/--radius-badge: 9999px;/);
    // A product decision: the mock-ups of a workspace do not override it.
    expect(agencyScope).not.toMatch(/--radius-/);
  });

  it("sets the scope on the root, so that dialogs and menus rendered in a portal follow it", () => {
    expect(css).toContain(':root:has([data-shell="pro"][data-role="agency"])');
    expect(css).not.toMatch(/\[data-role="agency"\]\s*\{/);
  });

  it("prints a page without the frame of the portal", () => {
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toContain('[data-shell="pro"] > aside');
    expect(print).toContain("#shell-topbar");
    expect(print).toMatch(/display: none !important/);
  });
});

describe("Badge and Button", () => {
  it("takes its radius from the badge token, whatever the workspace", () => {
    render(<Badge>Payé</Badge>);
    expect(screen.getByText("Payé").parentElement).toHaveClass("rounded-badge");
  });

  it("has an outlined variant in the action colour, for the next step of a row", () => {
    render(<Button variant="outline">Assigner</Button>);
    expect(screen.getByRole("button", { name: "Assigner" })).toHaveClass("border-primary", "text-primary", "bg-surface", "rounded-button");
  });

  it("has a larger avatar for the top of a profile", () => {
    render(<Avatar name="Moussa Kaboré" size="xl" />);
    expect(screen.getByRole("img", { name: "Moussa Kaboré" }).parentElement).toHaveClass("size-16", "md:size-20");
  });
});

describe("Stat", () => {
  it("keeps the label first by default, with its trend said in words", () => {
    render(<Stat label="Commandes" value="12" icon={Package} trend={{ direction: "up", label: "+50 %", sentiment: "positive" }} hint="sur 30 jours" />);
    expect(screen.getByText("Commandes")).toHaveClass("text-label", "text-foreground-muted");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    // The direction is said, not only drawn.
    expect(screen.getByText("+50 %").closest("span.inline-flex")).toHaveTextContent("En hausse : +50 %");
  });

  it("draws a key figure without colour: the icon alone and dark, the figure, its label under it, and no trend", () => {
    const { container } = render(<Stat layout="figure" label="Échecs" value="3" icon={Package} trend={{ direction: "up", label: "+50 %", sentiment: "negative" }} hint="Tentatives" />);
    const card = container.firstElementChild as HTMLElement;
    const icon = container.querySelector("svg") as SVGElement;
    // Neither tinted nor in a tile: the icon sits in the card itself, in the colour of the text.
    expect(icon.parentElement).toBe(card);
    expect(icon).toHaveClass("text-foreground");
    expect(card.innerHTML).not.toMatch(/bg-(success|danger|warning|info|brand)-/);
    // No small indicator beside the figure: what it compares with is said in the hint.
    expect(screen.queryByText("+50 %")).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent("En hausse");
    // Read label, figure, context; drawn icon, figure, label, context.
    expect(card).toHaveTextContent("Échecs3Tentatives");
    expect(icon).toHaveClass("order-1");
    expect(screen.getByText("3")).toHaveClass("order-2", "text-kpi");
    expect(screen.getByText("Échecs")).toHaveClass("order-3");
    expect(screen.getByText("Tentatives")).toHaveClass("order-4");
  });

  it("never cuts a key figure: no truncation on its value", () => {
    render(<Stat layout="figure" label="Revenus générés" value="1 018 800 FCFA" icon={Package} />);
    expect(screen.getByText("1 018 800 FCFA")).not.toHaveClass("truncate");
  });

  it("becomes a button that filters, pressed while its filter is on", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<Stat layout="figure" label="En retard" value="3" icon={Package} onSelect={onSelect} />);
    const button = screen.getByRole("button", { name: "En retard" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);

    rerender(<Stat layout="figure" label="En retard" value="3" icon={Package} onSelect={onSelect} pressed />);
    expect(screen.getByRole("button", { name: "En retard" })).toHaveAttribute("aria-pressed", "true");
    // The whole card is the target, and shows the state.
    expect(button).toHaveClass("after:absolute", "after:inset-0");
    expect(button.closest("[data-pressed]")).toHaveClass("data-[pressed]:border-primary");
  });
});

describe("Pagination", () => {
  it("offers first, last, the current page and its neighbours", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(1, 25)).toEqual([1, 2, 3, 4, 5, null, 25]);
    expect(pageWindow(12, 25)).toEqual([1, null, 11, 12, 13, null, 25]);
    expect(pageWindow(24, 25)).toEqual([1, null, 21, 22, 23, 24, 25]);
  });

  it("numbers the pages, marks the current one and moves to the one chosen", async () => {
    const onPageChange = vi.fn();
    render(<Pagination variant="numbered" page={2} pageSize={10} total={248} onPageChange={onPageChange} itemLabel="livraisons" />);
    expect(screen.getByText("Affichage de 11 à 20 sur 248 livraisons")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "Page 25" }));
    expect(onPageChange).toHaveBeenCalledWith(25);
    // The current page is not a destination.
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(onPageChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the compact form by default, and on a phone in the numbered one", () => {
    const { rerender } = render(<Pagination page={2} pageSize={25} total={60} onPageChange={() => {}} itemLabel="commandes" />);
    expect(screen.getByText("26–50 sur 60 commandes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Page 1" })).not.toBeInTheDocument();

    rerender(<Pagination variant="numbered" page={2} pageSize={25} total={60} onPageChange={() => {}} />);
    expect(screen.getByText("Page 2 sur 3")).toHaveClass("md:hidden");
    expect(screen.getByRole("list")).toHaveClass("hidden", "md:flex");
  });

  it("lets the number of rows be chosen when the page handles it", async () => {
    const onPageSizeChange = vi.fn();
    render(<Pagination variant="numbered" page={1} pageSize={10} total={248} onPageChange={() => {}} pageSizeOptions={[10, 25, 50]} onPageSizeChange={onPageSizeChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Nombre de lignes par page"), "25");
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });
});

describe("PageHeader", () => {
  it("links back to the list a page was opened from", () => {
    render(<PageHeader title="Livraison SU-1" back={{ label: "Retour aux livraisons", href: "/agency/deliveries" }} />);
    expect(screen.getByRole("link", { name: "Retour aux livraisons" })).toHaveAttribute("href", "/agency/deliveries");
  });

  it("shows a piece of information next to the actions from 768px, and a picture before the title", () => {
    render(<PageHeader title="Moussa Kaboré" meta={<p>Dim. 11 octobre 2026</p>} leading={<span data-testid="picture" />} />);
    expect(screen.getByText("Dim. 11 octobre 2026").parentElement).toHaveClass("hidden", "md:flex");
    expect(screen.getByTestId("picture").parentElement?.parentElement).toContainElement(screen.getByRole("heading", { name: "Moussa Kaboré" }));
  });

  it("keeps the less frequent actions behind a menu, with a dangerous one marked as such", async () => {
    const refuse = vi.fn();
    render(
      <PageHeader
        title="Livraison SU-1"
        primaryAction={{ label: "Accepter", icon: Plus, onSelect: () => {} }}
        secondaryActions={[{ label: "Appeler le client", icon: Phone, href: "tel:+22670123456" }]}
        moreActions={[
          { label: "Modifier le prix", icon: Pencil, onSelect: () => {} },
          { label: "Refuser la livraison", icon: Trash2, tone: "danger", onSelect: refuse },
        ]}
      />,
    );
    // A destination outside the application is a plain link.
    expect(screen.getByRole("link", { name: "Appeler le client" })).toHaveAttribute("href", "tel:+22670123456");

    // Two menus exist: the one of a desktop holds the less frequent actions only; the one of a phone, everything but the main action.
    const [desktop, phone] = screen.getAllByRole("button", { name: "Plus d'actions" });
    expect(desktop.parentElement).toHaveClass("hidden", "md:block");
    expect(phone.parentElement).toHaveClass("md:hidden");

    await userEvent.click(desktop);
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Modifier le prix", "Refuser la livraison"]);
    expect(within(menu).getByRole("menuitem", { name: "Refuser la livraison" })).toHaveClass("text-danger-fg");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Refuser la livraison" }));
    expect(refuse).toHaveBeenCalledTimes(1);

    await userEvent.click(phone);
    expect(within(screen.getByRole("menu")).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Appeler le client", "Modifier le prix", "Refuser la livraison"]);
  });

  it("keeps its actions on one row unless two are asked for", () => {
    const actions = { primaryAction: { label: "Remettre", icon: Plus, onSelect: () => {} }, secondaryActions: [{ label: "Imprimer", icon: Download, onSelect: () => {} }] };
    const { rerender } = render(<PageHeader title="Livraison" {...actions} />);
    const row = () => screen.getByRole("button", { name: "Remettre" }).parentElement as HTMLElement;
    expect(row()).not.toHaveClass("flex-wrap-reverse");
    rerender(<PageHeader title="Livraison" {...actions} stackActions />);
    // Wrapping upwards puts the main action, the last one, on the first line.
    expect(row()).toHaveClass("flex-wrap-reverse", "justify-end", "xl:max-w-[36rem]");
  });
});

describe("Alert", () => {
  it("puts its action beside the message from 768px when asked", () => {
    render(
      <Alert tone="warning" title="3 livraisons en retard" actionsPlacement="end" actions={<button type="button">Voir les livraisons</button>}>
        Vérifiez-les.
      </Alert>,
    );
    expect(screen.getByRole("button", { name: "Voir les livraisons" }).parentElement).toHaveClass("md:mt-0", "md:shrink-0");
  });

  it("can be put away by its reader", async () => {
    const onDismiss = vi.fn();
    render(<Alert tone="info" title="3 demandes" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: "Masquer ce message" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has neither when not asked", () => {
    render(<Alert title="Information" actions={<button type="button">Voir</button>} />);
    expect(screen.queryByRole("button", { name: "Masquer ce message" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voir" }).parentElement).not.toHaveClass("md:mt-0");
  });
});

describe("Section and DescriptionList", () => {
  it("shows an icon in a tinted tile before a section title", () => {
    const { container } = render(
      <Section title="Informations du colis" icon={Package} tone="info">
        contenu
      </Section>,
    );
    expect(container.querySelector("svg")?.parentElement).toHaveClass(...iconTileClass.info.split(" "));
    expect(screen.getByRole("heading", { name: "Informations du colis" })).toBeInTheDocument();
  });

  it("shows an icon before a label, hidden from assistive tech", () => {
    const { container } = render(<DescriptionList items={[{ label: "Téléphone", value: "+226 70 12 34 56", icon: Phone }]} />);
    expect(container.querySelector("dt svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Téléphone")).toBeInTheDocument();
  });
});

describe("DataTable", () => {
  interface Row {
    id: string;
    name: string;
  }
  const columns: DataTableColumn<Row>[] = [{ id: "name", header: "Nom", cell: (row) => row.name }];
  const rows: Row[] = [{ id: "1", name: "SU-1" }];
  const base = { caption: "Livraisons", columns, getRowId: (row: Row) => row.id, empty: { title: "Aucune livraison" } };

  it("carries the heading of its card, also when the list is empty or failed", () => {
    const header = { title: "248 livraisons", description: "Liste de toutes les courses.", actions: <button type="button">Exporter</button> };
    const { rerender } = render(<DataTable {...base} rows={rows} header={header} />);
    expect(screen.getByRole("heading", { name: "248 livraisons" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter" })).toBeInTheDocument();

    rerender(<DataTable {...base} rows={[]} header={header} />);
    expect(screen.getByRole("heading", { name: "248 livraisons" })).toBeInTheDocument();
    expect(screen.getByText("Aucune livraison")).toBeInTheDocument();

    rerender(<DataTable {...base} rows={[]} state="error" header={header} />);
    expect(screen.getByRole("heading", { name: "248 livraisons" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("names the actions column and keeps it in view when asked", () => {
    const { rerender } = render(<DataTable {...base} rows={rows} rowActions={() => <button type="button">Assigner</button>} />);
    const hidden = within(screen.getByRole("table")).getByText("Actions");
    expect(hidden).toHaveClass("sr-only");

    rerender(<DataTable {...base} rows={rows} rowActions={() => <button type="button">Assigner</button>} rowActionsLabel="Actions" />);
    const heading = within(screen.getByRole("table")).getByRole("columnheader", { name: "Actions" });
    expect(heading).toHaveClass("sticky", "right-0");
    expect(within(screen.getByRole("table")).getByRole("button", { name: "Assigner" }).closest("td")).toHaveClass("sticky", "right-0", "bg-surface");
  });

  it("has a compact density for a list of many columns", () => {
    const { rerender } = render(<DataTable {...base} rows={rows} />);
    const cell = () => within(screen.getByRole("table")).getByRole("cell", { name: "SU-1" });
    expect(cell()).toHaveClass("px-3", "text-body");
    rerender(<DataTable {...base} rows={rows} density="compact" />);
    expect(cell()).toHaveClass("px-2", "text-label");
  });
});
