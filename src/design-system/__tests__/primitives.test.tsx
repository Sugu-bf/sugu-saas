import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download, Plus, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "../primitives/alert";
import { Avatar, initialsOf } from "../primitives/avatar";
import { Badge } from "../primitives/badge";
import { Breadcrumbs } from "../primitives/breadcrumbs";
import { Button, ButtonGroup, IconButton } from "../primitives/button";
import { EmptyState, ErrorState } from "../primitives/states";
import { PageHeader } from "../primitives/page-header";
import { Pagination, pageCountOf } from "../primitives/pagination";
import { Stat } from "../primitives/stat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../primitives/tabs";
import { Toolbar, ToolbarCount, ToolbarFilter, ToolbarSearch } from "../primitives/toolbar";

describe("Button", () => {
  it.each([
    ["primary", "bg-primary"],
    ["secondary", "bg-surface"],
    ["quiet", "bg-transparent"],
    ["destructive", "bg-danger-solid"],
  ] as const)("variant %s", (variant, expectedClass) => {
    render(<Button variant={variant}>Action</Button>);
    expect(screen.getByRole("button", { name: "Action" })).toHaveClass(expectedClass);
  });

  it("has two sizes, both growing on touch devices", () => {
    render(
      <>
        <Button>Défaut</Button>
        <Button size="compact">Compact</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Défaut" })).toHaveClass("h-control", "touch:h-touch");
    expect(screen.getByRole("button", { name: "Compact" })).toHaveClass("h-control-sm", "touch:h-control");
  });

  it("is fully rounded through the button radius token, in every variant", () => {
    render(
      <>
        <Button variant="primary">A</Button>
        <Button variant="quiet" size="compact">
          B
        </Button>
        <IconButton icon={Trash2} label="C" tooltip={false} />
      </>,
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("rounded-button");
      expect(button.className).not.toMatch(/rounded-(control|compact|panel|md|lg|xl)/);
    }
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Action</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("renders a decorative icon next to the label", () => {
    render(<Button icon={Plus}>Créer</Button>);
    const button = screen.getByRole("button", { name: "Créer" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("loading: busy, not activable, label kept", async () => {
    const onClick = vi.fn();
    render(
      <Button icon={Download} loading onClick={onClick}>
        Exporter
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Exporter" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled: not activable and skipped by Tab", async () => {
    const onClick = vi.fn();
    render(
      <>
        <Button disabled onClick={onClick}>
          Inactif
        </Button>
        <Button>Suivant</Button>
      </>,
    );
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Suivant" })).toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is activated by Enter and Space", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Action</Button>);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("asChild styles a link without nesting a button", () => {
    render(
      <Button asChild variant="primary" icon={Plus}>
        <a href="https://example.test/aide">Créer un produit</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Créer un produit" });
    expect(link).toHaveClass("bg-primary");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("IconButton and ButtonGroup", () => {
  it("exposes its label as the accessible name", () => {
    render(<IconButton icon={Trash2} label="Supprimer le produit" />);
    expect(screen.getByRole("button", { name: "Supprimer le produit" })).toBeInTheDocument();
  });

  it("groups buttons under one name and reports the pressed one", () => {
    render(
      <ButtonGroup label="Affichage">
        <Button aria-pressed>Liste</Button>
        <Button aria-pressed={false}>Grille</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Affichage" });
    expect(within(group).getByRole("button", { name: "Liste", pressed: true })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Grille", pressed: false })).toBeInTheDocument();
  });
});

describe("Badge, Alert, states, Stat, Avatar", () => {
  it.each(["neutral", "success", "warning", "danger", "info"] as const)("Badge tone %s", (tone) => {
    render(<Badge tone={tone}>Libellé</Badge>);
    expect(screen.getByText("Libellé").parentElement).toHaveClass(`bg-${tone}-bg`, `text-${tone}-fg`);
  });

  it("Alert interrupts for danger and warning, stays polite otherwise", () => {
    render(
      <>
        <Alert tone="danger" title="Paiement refusé" />
        <Alert tone="success" title="Produit publié" />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Paiement refusé");
    expect(screen.getByRole("status")).toHaveTextContent("Produit publié");
  });

  it("ErrorState retries through the handler and hides the button without one", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<ErrorState />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("EmptyState is a status, distinct from an error", () => {
    render(<EmptyState title="Aucun produit" />);
    expect(screen.getByRole("status")).toHaveTextContent("Aucun produit");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Stat names the trend direction for screen readers", () => {
    render(
      <Stat label="Commandes" value="184" trend={{ direction: "down", label: "-4 %", sentiment: "negative" }} />,
    );
    expect(screen.getByText("184")).toHaveClass("tabular-nums");
    expect(screen.getByText(/En baisse/)).toHaveClass("sr-only");
  });

  it("Stat hides the value while loading", () => {
    render(<Stat label="Solde" value="12" loading />);
    expect(screen.queryByText("12")).toBeNull();
  });

  it("Avatar falls back to initials", () => {
    expect(initialsOf("Awa Démo")).toBe("AD");
    expect(initialsOf("  agence   démo centre ")).toBe("AC");
    expect(initialsOf("Awa")).toBe("A");
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("Aïssata Kaboré (QA)")).toBe("AK");
    expect(initialsOf("Boutique 2")).toBe("B");
    expect(initialsOf("(QA)")).toBe("(");
    render(<Avatar name="Awa Démo" />);
    expect(screen.getByRole("img", { name: "Awa Démo" })).toHaveTextContent("AD");
  });
});

describe("Pagination", () => {
  it("computes page counts", () => {
    expect(pageCountOf(134, 20)).toBe(7);
    expect(pageCountOf(0, 20)).toBe(1);
    expect(pageCountOf(20, 20)).toBe(1);
  });

  it("reports the range and moves one page at a time", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageSize={20} total={134} onPageChange={onPageChange} itemLabel="produits" />);
    expect(screen.getByText("41–60 sur 134 produits")).toBeInTheDocument();
    expect(screen.getByText("Page 3 sur 7")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Page suivante" }));
    await userEvent.click(screen.getByRole("button", { name: "Page précédente" }));
    expect(onPageChange.mock.calls).toEqual([[4], [2]]);
  });

  it("disables the edges and the whole control while fetching", () => {
    const { rerender } = render(<Pagination page={1} pageSize={20} total={134} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Page précédente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Page suivante" })).toBeEnabled();
    rerender(<Pagination page={7} pageSize={20} total={134} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Page suivante" })).toBeDisabled();
    expect(screen.getByText("121–134 sur 134")).toBeInTheDocument();
    rerender(<Pagination page={3} pageSize={20} total={134} onPageChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Page précédente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Page suivante" })).toBeDisabled();
  });
});

describe("Tabs", () => {
  it("moves with arrow keys and shows the matching panel", async () => {
    render(
      <Tabs defaultValue="all">
        <TabsList label="États">
          <TabsTrigger value="all" count={57}>
            Toutes
          </TabsTrigger>
          <TabsTrigger value="todo">À préparer</TabsTrigger>
        </TabsList>
        <TabsContent value="all">Panneau toutes</TabsContent>
        <TabsContent value="todo">Panneau à préparer</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole("tablist", { name: "États" })).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole("tab", { name: /Toutes/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "À préparer" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panneau à préparer");
  });
});

describe("Breadcrumbs and PageHeader", () => {
  it("marks the current page and links the ancestors", () => {
    render(<Breadcrumbs items={[{ label: "Commandes", href: "/vendor/orders" }, { label: "SU-2026-004100" }]} />);
    const nav = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(within(nav).getByRole("link", { name: "Commandes" })).toHaveAttribute("href", "/vendor/orders");
    expect(within(nav).getByText("SU-2026-004100")).toHaveAttribute("aria-current", "page");
  });

  it("renders one h1, the primary action and both forms of the secondary actions", async () => {
    const onPrimary = vi.fn();
    render(
      <PageHeader
        title="Commandes"
        description="Toutes vos commandes."
        primaryAction={{ label: "Nouvelle vente", icon: Plus, onSelect: onPrimary }}
        secondaryActions={[{ label: "Exporter", icon: Download, onSelect: vi.fn() }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Commandes" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Nouvelle vente" }));
    expect(onPrimary).toHaveBeenCalledOnce();
    // Desktop button plus the phone menu trigger: the action is never dropped.
    expect(screen.getByRole("button", { name: "Exporter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plus d'actions" })).toBeInTheDocument();
  });

  it("renders no action area and no menu without actions", () => {
    render(<PageHeader title="Paramètres" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("can keep its description for screens with room for it", () => {
    const { rerender } = render(<PageHeader title="Produits" description="Gérez votre catalogue." />);
    expect(screen.getByText("Gérez votre catalogue.")).not.toHaveClass("hidden");
    rerender(<PageHeader title="Produits" description="Gérez votre catalogue." hideDescriptionOnPhone />);
    expect(screen.getByText("Gérez votre catalogue.")).toHaveClass("hidden", "md:block");
  });
});

describe("Toolbar parts", () => {
  it("search submits the query on Enter and can be cleared", async () => {
    const onValueChange = vi.fn();
    const onSubmit = vi.fn();
    render(<ToolbarSearch label="Rechercher une commande" value="awa" onValueChange={onValueChange} onSubmit={onSubmit} />);
    const input = screen.getByRole("searchbox", { name: "Rechercher une commande" });
    await userEvent.type(input, "{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("awa");
    await userEvent.click(screen.getByRole("button", { name: "Effacer la recherche" }));
    expect(onValueChange).toHaveBeenCalledWith("");
    expect(onSubmit).toHaveBeenLastCalledWith("");
  });

  it("filter is a labelled select", async () => {
    const onValueChange = vi.fn();
    render(
      <ToolbarFilter
        label="Statut"
        value=""
        onValueChange={onValueChange}
        options={[
          { value: "", label: "Tous" },
          { value: "shipped", label: "Expédiée" },
        ]}
      />,
    );
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Statut" }), "shipped");
    expect(onValueChange).toHaveBeenCalledWith("shipped");
  });

  it("filter keeps its name when its label is left out of the row", () => {
    const options = [
      { value: "", label: "Toutes les catégories" },
      { value: "c1", label: "Bijoux (12)" },
    ];
    render(<Toolbar filters={<ToolbarFilter label="Catégorie" hideLabelInline value="" onValueChange={vi.fn()} options={options} />} />);

    // On the row: named for assistive technology, whatever is shown of the label.
    const select = screen.getByRole("combobox", { name: "Catégorie" });
    expect(select.closest("[data-inline]")).not.toBeNull();
    expect(screen.getByText("Catégorie")).toHaveClass("group-data-[inline]/filters:sr-only");
    // The filters also open in a sheet, where the row has no room for them.
    expect(screen.getByRole("button", { name: "Filtres" })).toBeInTheDocument();
  });

  it("filters leave the row for the sheet on a phone, or wherever the toolbar is too narrow for them", () => {
    const filter = <ToolbarFilter label="Stock" value="" onValueChange={vi.fn()} options={[{ value: "", label: "Tout le stock" }]} />;
    const { rerender } = render(<Toolbar filters={filter} />);
    expect(screen.getByRole("combobox", { name: "Stock" }).closest("[data-inline]")).toHaveClass("hidden", "md:flex");

    rerender(<Toolbar filters={filter} collapseFilters="narrow" />);
    expect(screen.getByRole("combobox", { name: "Stock" }).closest("[data-inline]")).toHaveClass("hidden", "@[57rem]:flex");
  });

  it("count agrees in number and reports the selection", () => {
    const noun = { one: "commande", other: "commandes" };
    const { rerender } = render(<ToolbarCount total={1} noun={noun} />);
    expect(screen.getByText("1 commande")).toBeInTheDocument();
    rerender(<ToolbarCount total={57} noun={noun} selected={2} />);
    expect(screen.getByText("57 commandes · 2 sélectionnés")).toBeInTheDocument();
  });
});

describe("Toolbar — the row of the count", () => {
  const count = <ToolbarCount total={3} noun={{ one: "produit", other: "produits" }} />;

  const view = (
    <ButtonGroup label="Affichage">
      <Button aria-pressed>Grille</Button>
      <Button aria-pressed={false}>Liste</Button>
    </ButtonGroup>
  );

  it("keeps the way back to the whole list next to the count, and the view switch on the row of the search", () => {
    render(
      <Toolbar
        search={<ToolbarSearch label="Nom ou référence" value="" onValueChange={vi.fn()} />}
        count={count}
        countAction={<Button>Tout afficher</Button>}
        view={view}
      />,
    );
    const row = screen.getByText("3 produits").parentElement as HTMLElement;
    expect(within(row).getByRole("button", { name: "Tout afficher" })).toBeInTheDocument();
    // One switch, with what is searched and filtered: it is not repeated per screen size.
    expect(screen.getAllByRole("group", { name: "Affichage" })).toHaveLength(1);
    expect(within(row).queryByRole("group", { name: "Affichage" })).toBeNull();
    const first = screen.getByRole("searchbox", { name: "Nom ou référence" }).closest("form")?.parentElement?.parentElement as HTMLElement;
    expect(within(first).getByRole("group", { name: "Affichage" })).toBeInTheDocument();
  });

  it("adds no empty row under the controls when there is nothing to count", () => {
    const { container } = render(<Toolbar search={<ToolbarSearch label="Nom ou référence" value="" onValueChange={vi.fn()} />} view={view} />);
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it("leaves the count on its own when there is nothing to put with it", () => {
    const { container } = render(<Toolbar count={count} />);
    expect(screen.getByText("3 produits").parentElement).toBe(container.firstElementChild);
  });
});

describe("Tabs as pills", () => {
  it("stays a tab set, without its rule, each status with the dot of its tone", () => {
    render(
      <Tabs value="all">
        <TabsList label="Filtrer les produits par statut" variant="pills">
          <TabsTrigger value="all" count={46}>
            Tous
          </TabsTrigger>
          <TabsTrigger value="active" count={30} tone="success">
            En ligne
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const list = screen.getByRole("tablist", { name: "Filtrer les produits par statut" });
    expect(list.parentElement).not.toHaveClass("border-b");

    const all = screen.getByRole("tab", { name: /Tous/ });
    expect(all).toHaveAttribute("aria-selected", "true");
    expect(all).toHaveClass("rounded-pill");
    expect(all).toHaveTextContent("46");
    // No status behind « Tous »: no dot.
    expect(all.querySelector("[aria-hidden='true']")).toBeNull();

    const online = screen.getByRole("tab", { name: /En ligne/ });
    expect(online.querySelector("[aria-hidden='true']")).toHaveClass("bg-success-icon");
  });

  it("draws no dot on underlined tabs, which keep their rule", () => {
    render(
      <Tabs value="active">
        <TabsList label="Sections">
          <TabsTrigger value="active" tone="success">
            En ligne
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole("tablist", { name: "Sections" }).parentElement).toHaveClass("border-b");
    expect(screen.getByRole("tab", { name: "En ligne" }).querySelector("[aria-hidden='true']")).toBeNull();
  });
});
