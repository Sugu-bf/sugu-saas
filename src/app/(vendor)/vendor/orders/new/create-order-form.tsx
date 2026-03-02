"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  ChevronRight,
  Search,
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Truck,
  Store,
  Zap,
  Package,
  ShoppingCart,
  BadgePercent,
  Pencil,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  useProductSearch,
  useCustomerSearch,
  useCreateOrder,
  useCreateCustomer,
} from "@/features/vendor/hooks";
import type { ProductSearchResult, CustomerSearchResult } from "@/features/vendor/schema";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  name: string;
  sku: string;
  emoji: string;
  price: number;
  quantity: number;
  stock: number;
}

// ────────────────────────────────────────────────────────────
// Main Form
// ────────────────────────────────────────────────────────────

export function CreateOrderForm() {
  // ── Product state
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // ── Client state
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    name: string;
    initials: string;
    phone: string;
    email: string;
    address: string;
    orderCount: number;
  } | null>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // ── New client form state
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  // ── Delivery state
  const [deliveryMode, setDeliveryMode] = useState<"express" | "standard" | "pickup">("express");
  const [deliveryNote, setDeliveryNote] = useState("");

  // ── Discount state
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");

  // ── Payment state
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile" | "card">("cash");
  const [initialStatus, setInitialStatus] = useState("pending_payment");

  // ── Error state
  const [formError, setFormError] = useState<string | null>(null);

  // ── API hooks
  const { data: productResults, isLoading: isSearchingProducts } = useProductSearch(productSearch);
  const { data: customerResults, isLoading: isSearchingCustomers } = useCustomerSearch(clientSearch);
  const createOrderMutation = useCreateOrder();
  const createCustomerMutation = useCreateCustomer();

  // ── Computed values
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const deliveryCost = deliveryMode === "express" ? 2500 : deliveryMode === "standard" ? 1500 : 0;

  const discountAmount = useMemo(() => {
    const val = parseInt(discountValue) || 0;
    if (discountType === "percentage") return Math.round((subtotal * val) / 100);
    return val;
  }, [subtotal, discountType, discountValue]);

  const total = subtotal + deliveryCost - discountAmount;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // ── Filter search results to exclude already-added products
  const filteredProductResults = useMemo(() => {
    if (!productResults) return [];
    return productResults.filter((p: ProductSearchResult) => !items.some((i) => i.id === p.id));
  }, [productResults, items]);

  // ── Click outside handlers
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers
  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Math.min(item.stock, item.quantity + delta)) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addItem = (result: ProductSearchResult) => {
    setItems((prev) => [
      ...prev,
      {
        id: result.id,
        name: result.name,
        sku: result.sku,
        emoji: result.emoji,
        price: result.price,
        quantity: 1,
        stock: result.stock,
      },
    ]);
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const selectClient = (customer: CustomerSearchResult) => {
    setSelectedClient({
      id: customer.id,
      name: customer.name,
      initials: customer.initials,
      phone: customer.phone,
      email: customer.email,
      address: "",
      orderCount: customer.orderCount,
    });
    setClientSearch("");
    setShowClientDropdown(false);
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);

    // ── Validation
    if (items.length === 0) {
      setFormError("Ajoutez au moins un produit à la commande.");
      return;
    }

    if (clientMode === "existing" && !selectedClient) {
      setFormError("Sélectionnez ou recherchez un client existant.");
      return;
    }

    if (clientMode === "new" && !newClientName.trim()) {
      setFormError("Le nom du client est requis.");
      return;
    }

    if (clientMode === "new" && !newClientPhone.trim()) {
      setFormError("Le numéro de téléphone est requis pour un nouveau client.");
      return;
    }

    // ── Build the order payload
    const deliveryMethod = deliveryMode === "pickup" ? "pickup" : "shipping";

    // Split new client name into first/last
    const nameParts = newClientName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const orderPayload = {
      customerId: clientMode === "existing" ? (selectedClient?.id ?? null) : null,
      client: clientMode === "new"
        ? {
            phone: newClientPhone,
            fullName: newClientName,
            countryCode: "BF" as const,
            email: newClientEmail || undefined,
          }
        : undefined,
      products: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      subtotal,
      tax: 0,
      total,
      currency: "XOF" as const,
      delivery: {
        method: deliveryMethod as "pickup" | "shipping",
        provider: deliveryMode === "express" ? "sugu-express" : deliveryMode === "standard" ? "faso-deliver" : undefined,
        pickupLocation: deliveryMode === "pickup" ? "Boutique principale" : undefined,
      },
      note: deliveryNote || undefined,
    };

    // If creating a new customer, first create them, then use the customerId
    if (clientMode === "new") {
      try {
        const newCustomer = await createCustomerMutation.mutateAsync({
          firstName,
          lastName,
          email: newClientEmail || undefined,
          phone: newClientPhone,
        });
        orderPayload.customerId = newCustomer.id;
        orderPayload.client = undefined;
      } catch {
        // If customer creation fails, try with inline client data (the sale endpoint also creates inline)
      }
    }

    createOrderMutation.mutate(orderPayload);
  }, [
    items, clientMode, selectedClient, newClientName, newClientPhone, newClientEmail,
    deliveryMode, deliveryNote, subtotal, total, createOrderMutation, createCustomerMutation,
  ]);

  const isSubmitting = createOrderMutation.isPending || createCustomerMutation.isPending;

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 lg:space-y-5">
      {/* ════════════ Breadcrumb + Actions ════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-1.5 text-xs lg:text-sm" aria-label="breadcrumb">
          <Link
            href="/vendor/orders"
            className="font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Commandes
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">
            Nouvelle commande
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/vendor/orders"
            className="hidden rounded-xl border border-gray-200 bg-white/60 px-4 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 lg:inline-block"
          >
            Annuler
          </Link>
          <button className="hidden rounded-xl border border-sugu-200 bg-sugu-50/80 px-4 py-2.5 text-sm font-semibold text-sugu-600 transition-all hover:bg-sugu-100 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400 lg:inline-block">
            Enregistrer brouillon
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-sugu-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sugu-500/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed lg:px-5 lg:py-2.5 lg:text-sm lg:hover:bg-sugu-600 lg:hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Création…
              </span>
            ) : (
              "Créer la commande →"
            )}
          </button>
        </div>
      </div>

      {/* ════════════ Global Error ════════════ */}
      {(formError || createOrderMutation.isError) && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {formError || (createOrderMutation.error as Error)?.message || "Erreur lors de la création de la commande."}
        </div>
      )}

      {/* ════════════ 3-Column Grid ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-5">
        {/* ───────── LEFT COLUMN ───────── */}
        <div className="space-y-3 lg:space-y-5">
          {/* ── Produits de la commande ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                Produits de la commande
              </h2>
              <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-600">
                <ScanBarcode className="h-4 w-4" />
                Scanner code-barres
              </button>
            </div>

            {/* Product Search */}
            <div className="relative mt-3 lg:mt-4" ref={productDropdownRef}>
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full rounded-xl border border-gray-200/80 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
              />

              {/* Dropdown results */}
              {showProductDropdown && productSearch.length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200/80 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                  {isSearchingProducts ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recherche…
                    </div>
                  ) : filteredProductResults.length > 0 ? (
                    filteredProductResults.map((result: ProductSearchResult) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => addItem(result)}
                        disabled={result.stock === 0}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="text-xl">{result.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {result.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatCurrency(result.price)} FCFA · Stock: {result.stock}
                            {result.stock === 0 && " (Rupture)"}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-sm text-gray-400">
                      Aucun produit trouvé
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Item List */}
            <div className="mt-3 space-y-2 lg:mt-4 lg:space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200/60 py-8 dark:border-gray-700/40">
                  <ShoppingCart className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm text-gray-400">Aucun produit ajouté</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600">Recherchez et ajoutez des produits ci-dessus</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-white/40 px-3 py-3 dark:bg-white/5"
                  >
                    <span className="text-xl lg:text-2xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate lg:text-sm">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-gray-400">SKU: {item.sku}</p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 lg:text-sm">
                        {formatCurrency(item.price * item.quantity)} FCFA
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg p-1 text-gray-300 transition-colors hover:text-red-500"
                      aria-label={`Supprimer ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800 lg:mt-4">
                  <span className="text-sm text-gray-500">
                    {totalItems} article{totalItems > 1 ? "s" : ""}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    Sous-total: {formatCurrency(subtotal)} FCFA
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProductSearch("");
                    setShowProductDropdown(false);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-sugu-500 transition-colors hover:text-sugu-600"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un produit
                </button>
              </>
            )}
          </section>

          {/* ── Remise & Code promo ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
              <BadgePercent className="h-4 w-4 text-sugu-500 lg:h-5 lg:w-5" />
              Remise & Code promo
            </h2>

            {/* Promo code */}
            <div className="mt-3 flex gap-2 lg:mt-4">
              <input
                type="text"
                placeholder="Code promo"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
              />
              <button className="rounded-xl border border-sugu-200 bg-sugu-50/80 px-4 py-2.5 text-sm font-semibold text-sugu-600 transition-all hover:bg-sugu-100 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400">
                Appliquer
              </button>
            </div>

            {/* Manual discount */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">Remise manuelle</span>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="rounded-lg border border-gray-200/80 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-700 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-gray-300"
              >
                <option value="percentage">Pourcentage</option>
                <option value="fixed">Montant fixe</option>
              </select>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-16 rounded-lg border border-gray-200/80 bg-gray-50/50 px-2 py-1.5 text-center text-sm text-gray-900 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
              />
              <span className="text-sm text-gray-400">
                {discountType === "percentage" ? "%" : "FCFA"}
              </span>
              {discountAmount > 0 && (
                <span className="ml-auto text-sm font-semibold text-red-500">
                  -{discountType === "percentage" ? `${discountValue}%` : ""} = -{formatCurrency(discountAmount)} FCFA
                </span>
              )}
            </div>
          </section>
        </div>

        {/* ───────── MIDDLE COLUMN ───────── */}
        <div className="space-y-3 lg:space-y-5">
          {/* ── Client ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                Client
              </h2>
            </div>

            {/* Mode toggle */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Client existant ou nouveau</span>
              <div className="flex rounded-lg border border-gray-200/80 p-0.5 dark:border-gray-700/50">
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                    clientMode === "existing"
                      ? "bg-sugu-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  Existant
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("new")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                    clientMode === "new"
                      ? "bg-sugu-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  Nouveau
                </button>
              </div>
            </div>

            {clientMode === "existing" ? (
              <>
                {/* Search client */}
                <div className="relative mt-3" ref={clientDropdownRef}>
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full rounded-xl border border-gray-200/80 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
                  />

                  {/* Client dropdown */}
                  {showClientDropdown && clientSearch.length >= 2 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200/80 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                      {isSearchingCustomers ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Recherche…
                        </div>
                      ) : customerResults && customerResults.length > 0 ? (
                        customerResults.map((customer: CustomerSearchResult) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectClient(customer)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sugu-400 to-sugu-600 text-xs font-bold text-white">
                              {customer.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {customer.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {customer.phone || customer.email} · {customer.orderCount} commandes
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-gray-400">
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected client card */}
                {selectedClient ? (
                  <div className="mt-3 rounded-xl bg-white/40 p-4 dark:bg-white/5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sugu-400 to-sugu-600 text-xs font-bold text-white lg:h-10 lg:w-10 lg:text-sm">
                          {selectedClient.initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {selectedClient.name}
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {selectedClient.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Phone className="h-3 w-3" />
                                {selectedClient.phone}
                              </div>
                            )}
                            {selectedClient.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Mail className="h-3 w-3" />
                                {selectedClient.email}
                              </div>
                            )}
                            {selectedClient.address && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {selectedClient.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearch("");
                        }}
                        className="text-xs font-semibold text-sugu-500 hover:text-sugu-600"
                      >
                        Changer
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {selectedClient.orderCount} commandes précédentes
                      </span>
                      {selectedClient.orderCount >= 5 && (
                        <span className="rounded-full border border-sugu-200 bg-sugu-50/80 px-2 py-0.5 text-[10px] font-bold text-sugu-600">
                          Client fidèle
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200/60 py-6 dark:border-gray-700/40">
                    <p className="text-sm text-gray-400">Aucun client sélectionné</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600">Recherchez un client ci-dessus</p>
                  </div>
                )}
              </>
            ) : (
              /* New client form */
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  placeholder="Nom complet"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-2.5 text-sm placeholder-gray-400 transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
                />
                <input
                  type="tel"
                  placeholder="Numéro de téléphone"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-2.5 text-sm placeholder-gray-400 transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Email (optionnel)"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-2.5 text-sm placeholder-gray-400 transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
                />
              </div>
            )}
          </section>

          {/* ── Livraison ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
              <Truck className="h-4 w-4 text-sugu-500 lg:h-5 lg:w-5" />
              Livraison
            </h2>

            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
              Mode de livraison
            </p>

            <div className="mt-2 space-y-2">
              {/* Express */}
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-all",
                  deliveryMode === "express"
                    ? "border-sugu-500 bg-sugu-50/40 dark:bg-sugu-950/10"
                    : "border-gray-200/60 bg-white/30 hover:border-gray-300 dark:border-gray-700/40 dark:bg-gray-900/20",
                )}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMode === "express"}
                  onChange={() => setDeliveryMode("express")}
                  className="mt-1 h-4 w-4 text-sugu-500 focus:ring-sugu-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-sugu-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Livraison express
                      </span>
                    </div>
                    {deliveryMode === "express" && (
                      <span className="rounded-full bg-sugu-500 px-2 py-0.5 text-[9px] font-bold text-white">
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Express Bamako · 2-4h
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  2,500 FCFA
                </span>
              </label>

              {/* Standard */}
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-all",
                  deliveryMode === "standard"
                    ? "border-sugu-500 bg-sugu-50/40 dark:bg-sugu-950/10"
                    : "border-gray-200/60 bg-white/30 hover:border-gray-300 dark:border-gray-700/40 dark:bg-gray-900/20",
                )}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMode === "standard"}
                  onChange={() => setDeliveryMode("standard")}
                  className="mt-1 h-4 w-4 text-sugu-500 focus:ring-sugu-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Livraison standard
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Faso Deliver · 24-48h
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  1,500 FCFA
                </span>
              </label>

              {/* Pickup */}
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-all",
                  deliveryMode === "pickup"
                    ? "border-sugu-500 bg-sugu-50/40 dark:bg-sugu-950/10"
                    : "border-gray-200/60 bg-white/30 hover:border-gray-300 dark:border-gray-700/40 dark:bg-gray-900/20",
                )}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMode === "pickup"}
                  onChange={() => setDeliveryMode("pickup")}
                  className="mt-1 h-4 w-4 text-sugu-500 focus:ring-sugu-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Retrait en boutique
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Gratuit · Disponible sous 1h
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600">
                  Gratuit
                </span>
              </label>
            </div>

            {/* Delivery address */}
            {deliveryMode !== "pickup" && selectedClient?.address && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Adresse de livraison
                </p>
                <div className="mt-2 flex items-start gap-2 rounded-xl bg-white/40 px-4 py-3 dark:bg-white/5">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-sugu-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedClient.address}
                    </p>
                    <button className="mt-1 text-xs font-semibold text-sugu-500 hover:text-sugu-600">
                      Changer l&apos;adresse
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery note */}
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
                <Pencil className="h-3.5 w-3.5" />
                Note pour le livreur
              </p>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
                placeholder="Instructions spéciales..."
              />
            </div>
          </section>
        </div>

        {/* ───────── RIGHT COLUMN ───────── */}
        <div className="space-y-3 lg:space-y-5">
          {/* ── Récapitulatif ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
              Récapitulatif
            </h2>

            <div className="mt-3 lg:mt-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Résumé de la commande
              </h3>

              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{totalItems} articles</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    → {formatCurrency(subtotal)} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Livraison ({deliveryMode === "express" ? "Express" : deliveryMode === "standard" ? "Standard" : "Retrait"})
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    → {deliveryCost > 0 ? `${formatCurrency(deliveryCost)} FCFA` : "Gratuit"}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Remise (-{discountType === "percentage" ? `${discountValue}%` : `${formatCurrency(parseInt(discountValue))}`})
                    </span>
                    <span className="font-medium text-red-500">
                      → -{formatCurrency(discountAmount)} FCFA
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200/60 pt-3 dark:border-gray-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      TOTAL
                    </span>
                    <span className="text-lg font-extrabold text-sugu-500 lg:text-xl">
                      {formatCurrency(total)} FCFA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="mt-4 lg:mt-6">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Méthode de paiement
              </h3>
              <div className="mt-3 space-y-2">
                {([
                  { key: "cash" as const, label: "Espèces", icon: "💵" },
                  { key: "mobile" as const, label: "Mobile Money", icon: "📱" },
                  { key: "card" as const, label: "Carte bancaire", icon: "💳" },
                ]).map((method) => (
                  <label
                    key={method.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                      paymentMethod === method.key
                        ? "border-sugu-500 bg-sugu-50/40 dark:bg-sugu-950/10"
                        : "border-gray-200/60 bg-white/30 hover:border-gray-300 dark:border-gray-700/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === method.key}
                      onChange={() => setPaymentMethod(method.key)}
                      className="h-4 w-4 text-sugu-500 focus:ring-sugu-500"
                    />
                    <span className="text-lg">{method.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {method.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Initial status */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Statut initial
                </span>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value)}
                  className="rounded-lg border border-gray-200/80 bg-gray-50/50 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-gray-300"
                >
                  <option value="pending_payment">En attente de paiement</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="processing">En préparation</option>
                </select>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sugu-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-sugu-500/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed lg:mt-6 lg:py-3.5 lg:text-sm lg:hover:bg-sugu-600 lg:hover:-translate-y-0.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  Créer la commande
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] text-gray-400">
              Un SMS sera envoyé au client avec les détails.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
