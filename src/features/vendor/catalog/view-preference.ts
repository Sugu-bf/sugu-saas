"use client";

import { useCallback, useSyncExternalStore } from "react";

// How the product list is shown: a grid of pictures or a table. A per-browser
// comfort setting, kept in localStorage like the sidebar state (nothing
// sensitive). It is not in the URL on purpose: a shared link lists the same
// products, and each reader keeps the view they prefer.

export type ProductsView = "grid" | "list";

export const DEFAULT_PRODUCTS_VIEW: ProductsView = "grid";
export const PRODUCTS_VIEW_STORAGE_KEY = "sugu.vendor.products.view";

const listeners = new Set<() => void>();

function readView(): ProductsView {
  try {
    return window.localStorage.getItem(PRODUCTS_VIEW_STORAGE_KEY) === "list" ? "list" : DEFAULT_PRODUCTS_VIEW;
  } catch {
    return DEFAULT_PRODUCTS_VIEW;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useProductsView(): [ProductsView, (view: ProductsView) => void] {
  const view = useSyncExternalStore(subscribe, readView, () => DEFAULT_PRODUCTS_VIEW);
  const setView = useCallback((next: ProductsView) => {
    try {
      window.localStorage.setItem(PRODUCTS_VIEW_STORAGE_KEY, next);
    } catch {
      // Private mode: the choice simply does not survive a reload.
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [view, setView];
}
