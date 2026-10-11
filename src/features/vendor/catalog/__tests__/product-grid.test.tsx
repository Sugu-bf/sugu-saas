import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductGrid } from "../components/product-grid";
import { parseProductListItem } from "../contract";
import { PRODUCTS_VIEW_STORAGE_KEY, useProductsView } from "../view-preference";
import { productRow } from "./fixtures";

// next/image needs the Next runtime; a plain <img> says the same thing to a test.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const PRODUCTS = [
  parseProductListItem(productRow({ id: "p1", name: "Pagne tissé", sku: "FDF-0042", category: "Textile", main_image: "https://cdn.sugu.pro/p/pagne.jpg", price: 7500, stock: 12 })),
  parseProductListItem(
    productRow({
      id: "p2",
      name: "Bracelet en bronze",
      sku: null,
      category: null,
      statusCode: "draft",
      stock: 3,
      stockStatus: "low_stock",
      hasVariants: true,
      variants: [
        { id: "a", price: 2500, stock: 1, isActive: true, options: {} },
        { id: "b", price: 2500, stock: 2, isActive: true, options: {} },
      ],
      price: 2500,
    }),
  ),
];

const BASE = {
  products: PRODUCTS,
  empty: { title: "Votre catalogue est vide" },
  actions: (product: (typeof PRODUCTS)[number]) => <button type="button">Actions pour {product.name}</button>,
};

const cards = () => within(screen.getByRole("list", { name: "Produits" })).getAllByRole("listitem");

describe("ProductGrid", () => {
  it("shows each product as a card: name, reference, status, price and stock", () => {
    render(<ProductGrid {...BASE} />);

    const [pagne, bracelet] = cards();
    expect(within(pagne).getByRole("link", { name: "Pagne tissé" })).toHaveAttribute("href", "/vendor/products/p1");
    expect(pagne).toHaveTextContent("FDF-0042 · Textile");
    expect(pagne).toHaveTextContent("En ligne");
    expect(pagne).toHaveTextContent(/7\s500\sFCFA/);
    expect(pagne).toHaveTextContent("12");
    expect(pagne).toHaveTextContent("En stock");

    expect(bracelet).toHaveTextContent("Brouillon");
    expect(bracelet).toHaveTextContent("Stock faible");
    expect(bracelet).toHaveTextContent("2 variantes");
    // Nothing is invented for a product without reference or category.
    expect(bracelet).toHaveTextContent("Sans référence");
  });

  it("gives every card the menu of its product", () => {
    render(<ProductGrid {...BASE} />);
    expect(within(cards()[1]).getByRole("button", { name: "Actions pour Bracelet en bronze" })).toBeInTheDocument();
  });

  it("keeps a decorative picture silent, and never shows a stand-in photo", () => {
    render(<ProductGrid {...BASE} />);
    const [pagne, bracelet] = cards();
    expect(pagne.querySelector("img")).toHaveAttribute("alt", "");
    // The backend's placeholder is not a picture of the product.
    expect(bracelet.querySelector("img")).toBeNull();
  });

  it("loading: announces it with skeleton cards and no product", () => {
    render(<ProductGrid {...BASE} products={[]} state="loading" />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement");
    expect(screen.getByRole("list", { name: "Produits" }).parentElement).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("empty: only once loaded, with its action", () => {
    render(<ProductGrid {...BASE} products={[]} empty={{ title: "Aucun produit ne correspond", action: <button type="button">Tout afficher</button> }} />);
    expect(screen.getByText("Aucun produit ne correspond")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tout afficher" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Produits" })).toBeNull();
  });

  it("error: never shown as an empty catalogue, and retry is wired", async () => {
    const onRetry = vi.fn();
    render(<ProductGrid {...BASE} products={[]} state="error" error={{ title: "Les produits n'ont pas pu être chargés", onRetry }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Les produits n'ont pas pu être chargés");
    expect(screen.queryByText("Votre catalogue est vide")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("pages through the server total, and blocks the pager while a page is fetched", async () => {
    const onPageChange = vi.fn();
    const pagination = { page: 1, pageSize: 24, total: 46, onPageChange, itemLabel: "produits" };
    const { rerender } = render(<ProductGrid {...BASE} pagination={pagination} />);
    expect(screen.getByText("1–24 sur 46 produits")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<ProductGrid {...BASE} pagination={pagination} refreshing />);
    expect(screen.getByRole("button", { name: "Page suivante" })).toBeDisabled();
    // The cards stay on screen while the next page loads.
    expect(cards()).toHaveLength(2);
  });
});

describe("view of the product list", () => {
  afterEach(() => window.localStorage.clear());

  it("is the grid until the seller chooses the list, and remembers the choice", () => {
    const first = renderHook(() => useProductsView());
    expect(first.result.current[0]).toBe("grid");

    act(() => first.result.current[1]("list"));
    expect(first.result.current[0]).toBe("list");
    expect(window.localStorage.getItem(PRODUCTS_VIEW_STORAGE_KEY)).toBe("list");

    // Another page of the portal, later: the choice is still there.
    expect(renderHook(() => useProductsView()).result.current[0]).toBe("list");
  });

  it("falls back to the grid on a value it does not know", () => {
    window.localStorage.setItem(PRODUCTS_VIEW_STORAGE_KEY, "carousel");
    expect(renderHook(() => useProductsView()).result.current[0]).toBe("grid");
  });
});
