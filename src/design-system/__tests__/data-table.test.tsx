import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "../data-table/data-table";
import { Button } from "../primitives/button";

interface Row {
  id: string;
  reference: string;
  customer: string;
  total: number;
}

// Deliberately NOT sorted by any column: the table must keep this order.
const ROWS: Row[] = [
  { id: "b", reference: "SU-2", customer: "Mariam Test", total: 300 },
  { id: "c", reference: "SU-3", customer: "Awa Démo", total: 100 },
  { id: "a", reference: "SU-1", customer: "Issouf Exemple", total: 200 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { id: "reference", header: "Référence", sortable: true, mobile: "title", cell: (row) => row.reference },
  { id: "customer", header: "Client", mobile: "subtitle", cell: (row) => row.customer },
  { id: "total", header: "Total", numeric: true, sortable: true, cell: (row) => row.total },
];

const BASE = {
  caption: "Commandes",
  columns: COLUMNS,
  rows: ROWS,
  getRowId: (row: Row) => row.id,
  empty: { title: "Aucune commande" },
};

function table() {
  return screen.getByRole("table", { name: "Commandes" });
}

function referencesInTable() {
  return within(table())
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("DataTable — structure", () => {
  it("renders a real table with column headers and the rows in the given order", () => {
    render(<DataTable {...BASE} />);
    expect(within(table()).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Référence", "Client", "Total"]);
    expect(referencesInTable()).toEqual(["SU-2", "SU-3", "SU-1"]);
  });

  it("right-aligns numeric columns with tabular figures", () => {
    render(<DataTable {...BASE} />);
    expect(within(table()).getByRole("cell", { name: "300" })).toHaveClass("text-right", "tabular-nums");
  });

  it("also renders the phone list, with every column and the row actions", () => {
    render(<DataTable {...BASE} rowActions={(row) => <Button>Voir {row.reference}</Button>} />);
    const list = screen.getByRole("list", { name: "Commandes" });
    const first = within(list).getAllByRole("listitem")[0];
    expect(first).toHaveTextContent("SU-2");
    expect(first).toHaveTextContent("Mariam Test");
    // A column without a mobile role becomes a labelled field: nothing is dropped.
    expect(within(first).getByText("Total")).toBeInTheDocument();
    expect(first).toHaveTextContent("300");
    expect(within(first).getByRole("button", { name: "Voir SU-2" })).toBeInTheDocument();
  });

  it("leaves a column out of the phone card only when asked explicitly", () => {
    const columns = COLUMNS.map((column) => (column.id === "total" ? { ...column, mobile: "hidden" as const } : column));
    render(<DataTable {...BASE} columns={columns} />);
    const first = within(screen.getByRole("list", { name: "Commandes" })).getAllByRole("listitem")[0];
    expect(first).not.toHaveTextContent("300");
    expect(within(table()).getByRole("cell", { name: "300" })).toBeInTheDocument();
  });

  it("can keep the table on phones instead of cards", () => {
    render(<DataTable {...BASE} mobileLayout="scroll" />);
    expect(screen.queryByRole("list", { name: "Commandes" })).toBeNull();
    expect(screen.getByRole("region", { name: "Commandes" })).toHaveAttribute("tabindex", "0");
  });
});

describe("DataTable — controlled sort", () => {
  it("shows no sort control when no handler is provided", () => {
    render(<DataTable {...BASE} />);
    expect(within(table()).queryByRole("button")).toBeNull();
    for (const header of within(table()).getAllByRole("columnheader")) {
      expect(header).not.toHaveAttribute("aria-sort");
    }
  });

  it("only makes sortable columns interactive", () => {
    render(<DataTable {...BASE} sort={null} onSortChange={vi.fn()} />);
    expect(within(table()).getByRole("button", { name: "Référence" })).toBeInTheDocument();
    expect(within(table()).getByRole("button", { name: "Total" })).toBeInTheDocument();
    expect(within(table()).queryByRole("button", { name: "Client" })).toBeNull();
  });

  it("asks for ascending first, then descending, and never reorders rows itself", async () => {
    const onSortChange = vi.fn();
    const { rerender } = render(<DataTable {...BASE} sort={null} onSortChange={onSortChange} />);
    await userEvent.click(within(table()).getByRole("button", { name: "Total" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: "total", direction: "asc" });
    // The parent has not supplied new rows: the order must not change.
    expect(referencesInTable()).toEqual(["SU-2", "SU-3", "SU-1"]);

    rerender(<DataTable {...BASE} sort={{ columnId: "total", direction: "asc" }} onSortChange={onSortChange} />);
    expect(within(table()).getByRole("columnheader", { name: "Total" })).toHaveAttribute("aria-sort", "ascending");
    expect(within(table()).getByRole("columnheader", { name: "Référence" })).toHaveAttribute("aria-sort", "none");
    // Even with an active sort state, the rows shown are the rows given.
    expect(referencesInTable()).toEqual(["SU-2", "SU-3", "SU-1"]);

    await userEvent.click(within(table()).getByRole("button", { name: "Total" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: "total", direction: "desc" });
    await userEvent.click(within(table()).getByRole("button", { name: "Référence" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: "reference", direction: "asc" });
  });

  it("sort headers are reachable and operable from the keyboard", async () => {
    const onSortChange = vi.fn();
    render(<DataTable {...BASE} mobileLayout="scroll" sort={null} onSortChange={onSortChange} />);
    await userEvent.tab(); // scroll region
    await userEvent.tab();
    expect(within(table()).getByRole("button", { name: "Référence" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onSortChange).toHaveBeenCalledWith({ columnId: "reference", direction: "asc" });
  });
});

describe("DataTable — controlled selection", () => {
  function Harness({ initial = [] as string[], onBulk = vi.fn() }) {
    const [selectedIds, setSelectedIds] = useState<string[]>(initial);
    return (
      <DataTable
        {...BASE}
        mobileLayout="scroll"
        selection={{
          selectedIds,
          onChange: setSelectedIds,
          getRowLabel: (row) => row.reference,
          isRowSelectable: (row) => row.id !== "c",
        }}
        bulkActions={(ids) => <Button onClick={() => onBulk(ids)}>Préparer</Button>}
      />
    );
  }

  it("renders no checkbox without a selection prop", () => {
    render(<DataTable {...BASE} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("selects a row, shows the count and hands the ids to the bulk action", async () => {
    const onBulk = vi.fn();
    render(<Harness onBulk={onBulk} />);
    expect(screen.queryByRole("button", { name: "Préparer" })).toBeNull();
    await userEvent.click(screen.getByRole("checkbox", { name: "Sélectionner SU-2" }));
    expect(screen.getByText("1 sélectionné")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Préparer" }));
    expect(onBulk).toHaveBeenCalledWith(["b"]);
  });

  it("selects the page, skipping rows that are not selectable", async () => {
    render(<Harness />);
    const all = screen.getByRole("checkbox", { name: "Sélectionner toutes les lignes de cette page" });
    await userEvent.click(all);
    expect(screen.getByText("2 sélectionnés")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Sélectionner SU-3" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Sélectionner SU-3" })).not.toBeChecked();
    expect(all).toBeChecked();
  });

  it("shows a mixed state and keeps ids selected on other pages", async () => {
    render(<Harness initial={["other-page-1", "b"]} />);
    const all = screen.getByRole("checkbox", {
      name: "Sélectionner toutes les lignes de cette page",
    }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(screen.getByText("2 sélectionnés")).toBeInTheDocument();
    await userEvent.click(all); // completes the page
    expect(screen.getByText("3 sélectionnés")).toBeInTheDocument();
    await userEvent.click(all); // clears the page only
    expect(screen.getByText("1 sélectionné")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tout désélectionner" }));
    expect(screen.queryByText(/sélectionné/)).toBeNull();
  });

  it("toggles a checkbox with the Space key", async () => {
    render(<Harness />);
    screen.getByRole("checkbox", { name: "Sélectionner SU-2" }).focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("checkbox", { name: "Sélectionner SU-2" })).toBeChecked();
  });
});

describe("DataTable — server pagination", () => {
  it("delegates page changes and shows the server total, not the page length", async () => {
    const onPageChange = vi.fn();
    render(<DataTable {...BASE} pagination={{ page: 2, pageSize: 3, total: 57, onPageChange, itemLabel: "commandes" }} />);
    expect(screen.getByText("4–6 sur 57 commandes")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("blocks pagination and marks the table busy while a page is fetched", () => {
    render(<DataTable {...BASE} refreshing pagination={{ page: 2, pageSize: 3, total: 57, onPageChange: vi.fn() }} />);
    expect(screen.getByRole("button", { name: "Page suivante" })).toBeDisabled();
    expect(table().closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    // Rows stay visible during a refresh.
    expect(referencesInTable()).toHaveLength(3);
  });
});

describe("DataTable — states", () => {
  it("loading: announces it and shows skeleton rows, no data", () => {
    render(<DataTable {...BASE} rows={[]} state="loading" loadingRowCount={4} />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement");
    expect(within(table()).getAllByRole("row")).toHaveLength(5);
    expect(screen.queryByText("Aucune commande")).toBeNull();
  });

  it("empty: only once loaded, with the action", () => {
    render(<DataTable {...BASE} rows={[]} empty={{ title: "Aucune commande", action: <Button>Créer une vente</Button> }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Aucune commande");
    expect(screen.getByRole("button", { name: "Créer une vente" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("error: never shown as an empty list, and retry is wired", async () => {
    const onRetry = vi.fn();
    render(<DataTable {...BASE} rows={[]} state="error" error={{ title: "Impossible de charger les commandes", onRetry }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les commandes");
    expect(screen.queryByText("Aucune commande")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
