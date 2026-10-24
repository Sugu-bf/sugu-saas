import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http/api-error";
import { publicationWording, usePublicationActions } from "../components/publication-actions";
import { parseProductListItem, type ProductListItem } from "../contract";
import { productRow } from "./fixtures";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/http/client", () => ({ api: http, apiFetch: vi.fn() }));

afterEach(() => vi.clearAllMocks());

function Menu({ product }: { product: ProductListItem }) {
  const publication = usePublicationActions();
  return (
    <>
      {publication.entries(product).map((entry) => (
        <button key={entry.action} type="button" onClick={entry.onSelect}>
          {entry.label}
        </button>
      ))}
      {publication.dialog}
    </>
  );
}

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("publication actions in the contract", () => {
  it("takes the changes the backend allows, and only the ones it knows", () => {
    const product = parseProductListItem(productRow({ sellerActions: ["unpublished", "draft", "archived", "teleport"] }));

    expect(product.publicationActions).toEqual(["unpublished", "draft", "archived"]);
  });

  it("offers none when an older backend says nothing, rather than one it would refuse", () => {
    expect(parseProductListItem(productRow()).publicationActions).toEqual([]);
  });

  it("reads the offline status", () => {
    const product = parseProductListItem(productRow({ statusCode: "unpublished", sellerActions: ["published", "draft", "archived"] }));

    expect(product.status).toBe("unpublished");
  });
});

describe("publication wording", () => {
  it("says back to draft in the words of where the product is", () => {
    expect(publicationWording({ name: "Pagne", status: "archived" }, "draft").label).toBe("Restaurer en brouillon");
    expect(publicationWording({ name: "Pagne", status: "submitted" }, "draft").label).toBe("Retirer de la validation");
    expect(publicationWording({ name: "Pagne", status: "active" }, "draft").label).toBe("Repasser en brouillon");
  });
});

describe("publication menu", () => {
  it("takes an approved product offline once confirmed", async () => {
    http.post.mockResolvedValue({ success: true });
    const product = parseProductListItem(productRow({ id: "p1", name: "Pagne tissé", sellerActions: ["unpublished", "draft", "archived"] }));
    wrap(<Menu product={product} />);

    expect(screen.getByRole("button", { name: "Mettre hors ligne" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Repasser en brouillon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archiver" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mettre hors ligne" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Mettre « Pagne tissé » hors ligne ?");
    expect(http.post).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: "Mettre hors ligne" }).at(-1)!);

    await waitFor(() => expect(http.post).toHaveBeenCalledWith("sellers/products/p1/status", { status: "unpublished" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("« Pagne tissé » est hors ligne."));
  });

  it("shows nothing for a suspended product", () => {
    const product = parseProductListItem(productRow({ statusCode: "suspended", sellerActions: [] }));
    wrap(<Menu product={product} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("says why the server refused", async () => {
    http.post.mockRejectedValue(new ApiError({ message: "Ce produit est suspendu par la modération.", status: 422, code: "SUGU-PRODUCT-STATUS-NOT-ALLOWED" }));
    const product = parseProductListItem(productRow({ id: "p2", sellerActions: ["published"], statusCode: "unpublished" }));
    wrap(<Menu product={product} />);

    await userEvent.click(screen.getByRole("button", { name: "Remettre en ligne" }));
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getAllByRole("button", { name: "Remettre en ligne" }).at(-1)!);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ce produit est suspendu par la modération."));
  });
});
