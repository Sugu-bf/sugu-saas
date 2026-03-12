"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Download,
  Eye,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Gift,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Loader2,
  Star,
  CircleOff,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type {
  VendorClientsResponse,
  VendorClient,
  ClientStatus,
  ClientStatusCounts,
} from "@/features/vendor/schema";
import {
  useVendorClients,
  useVendorClientDetail,
  useCreateClientFromPage,
  useExportClients,
} from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Status tab config
// ────────────────────────────────────────────────────────────

interface StatusTab {
  key: "all" | ClientStatus;
  label: string;
  countKey: keyof ClientStatusCounts;
  icon?: LucideIcon;
  iconClass?: string;
}

const STATUS_TABS: StatusTab[] = [
  { key: "all", label: "Tous", countKey: "all" },
  { key: "active", label: "Actifs", countKey: "active" },
  { key: "loyal", label: "Fidèles", countKey: "loyal", icon: Star, iconClass: "text-amber-500" },
  { key: "inactive", label: "Inactifs", countKey: "inactive", icon: CircleOff, iconClass: "text-red-400" },
  { key: "new", label: "Nouveaux", countKey: "new", icon: UserPlus, iconClass: "text-green-500" },
];

// ────────────────────────────────────────────────────────────
// Status badge styles
// ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ClientStatus, string> = {
  active: "bg-sugu-50 text-sugu-600 border-sugu-200",
  loyal: "bg-amber-50 text-amber-600 border-amber-200",
  vip: "bg-purple-50 text-purple-600 border-purple-200",
  new: "bg-green-50 text-green-600 border-green-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
};

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

interface ClientsContentProps {
  initialData: VendorClientsResponse;
}

export function ClientsContent({ initialData }: ClientsContentProps) {
  const [activeTab, setActiveTab] = useState<"all" | ClientStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debounce search input
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      const timeout = setTimeout(() => {
        setDebouncedSearch(value);
        setCurrentPage(1); // Reset to page 1 on new search
      }, 400);
      searchTimeoutRef.current = timeout;
    },
    [],
  );

  // Fetch clients with filters via React Query (inherits from initial data)
  const {
    data,
    isFetching,
  } = useVendorClients({
    status: activeTab !== "all" ? activeTab : undefined,
    page: currentPage,
    search: debouncedSearch || undefined,
  });

  // Use live data from hook, fallback to initial data
  const clientsData = data ?? initialData;

  // Fetch selected client detail
  const { data: selectedClientDetail, isLoading: isDetailLoading } =
    useVendorClientDetail(selectedClientId);

  // Export mutation
  const exportMutation = useExportClients();

  // Create client mutation
  const createClientMutation = useCreateClientFromPage();

  // Client-side filtering for tab + search (in case the backend doesn't filter by status)
  const filtered = clientsData.clients.filter((c) => {
    const matchesTab =
      activeTab === "all" || c.status === activeTab ||
      (activeTab === "loyal" && c.status === "vip");
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  const { kpis } = clientsData;

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page < 1 || page > clientsData.pagination.totalPages) return;
    setCurrentPage(page);
  };

  const handleTabChange = (tab: "all" | ClientStatus) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset pagination on tab change
  };

  // Export handler
  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync();
      // Convert the data to CSV and trigger download
      if (result.data && result.data.length > 0) {
        const headers = Object.keys(result.data[0]);
        const csvRows = [
          headers.join(","),
          ...result.data.map((row) =>
            headers.map((h) => `"${String(row[h] ?? "")}"`).join(","),
          ),
        ];
        const blob = new Blob([csvRows.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clients_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Error is handled by React Query
    }
  };

  // Build page numbers for pagination
  const buildPageNumbers = (): (number | "ellipsis")[] => {
    const total = clientsData.pagination.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, "ellipsis", total);
    } else if (currentPage >= total - 2) {
      pages.push(1, "ellipsis", total - 2, total - 1, total);
    } else {
      pages.push(1, "ellipsis", currentPage, "ellipsis", total);
    }
    return pages;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-3 lg:space-y-5">
      {/* ════════════ Header ════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
          Mes Clients{" "}
          <span className="text-sm font-normal text-gray-400 lg:text-base">
            ({kpis.totalClients.toLocaleString("fr-FR")} clients)
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] lg:gap-2 lg:px-4 lg:py-2.5 lg:text-sm lg:hover:bg-sugu-600 lg:hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Ajouter un client
          </button>
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 lg:inline-flex disabled:opacity-50"
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exporter
          </button>
        </div>
      </div>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {/* Total clients */}
        <div className="glass-card rounded-2xl p-3 animate-card-enter lg:rounded-3xl lg:p-5">
          <p className="text-[10px] font-medium text-gray-500 lg:text-xs">Clients total</p>
          <div className="mt-1 flex items-baseline gap-1.5 lg:gap-2">
            <span className="text-xl font-extrabold text-gray-900 dark:text-white lg:text-3xl">
              {kpis.totalClients.toLocaleString("fr-FR")}
            </span>
            {kpis.newThisMonth > 0 && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">
                +{kpis.newThisMonth} ce mois
              </span>
            )}
          </div>
        </div>

        {/* Active clients */}
        <div className="glass-card rounded-2xl p-3 animate-card-enter lg:rounded-3xl lg:p-5" style={{ animationDelay: "100ms" }}>
          <p className="text-[10px] font-medium text-gray-500 lg:text-xs">Clients actifs</p>
          <div className="mt-1 flex items-baseline gap-1.5 lg:gap-2">
            <span className="text-xl font-extrabold text-gray-900 dark:text-white lg:text-3xl">
              {kpis.activeClients}
            </span>
            {kpis.activePercent > 0 && (
              <span className="text-sm font-medium text-gray-400">
                {kpis.activePercent}%
              </span>
            )}
          </div>
        </div>

        {/* Average basket — highlighted */}
        <div className="glass-card rounded-2xl p-3 animate-card-enter lg:rounded-3xl lg:p-5" style={{ animationDelay: "200ms" }}>
          <p className="text-[10px] font-medium text-gray-500 lg:text-xs">Panier moyen</p>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-gray-900 dark:text-white lg:text-3xl">
              {kpis.avgBasket > 0 ? formatCurrency(kpis.avgBasket) : "—"}
            </span>
            {kpis.avgBasket > 0 && (
              <span className="ml-1 text-sm font-semibold text-gray-500">FCFA</span>
            )}
          </div>
        </div>

        {/* Loyalty rate with ring */}
        <div className="glass-card rounded-2xl p-3 animate-card-enter lg:rounded-3xl lg:p-5" style={{ animationDelay: "300ms" }}>
          <p className="text-[10px] font-medium text-gray-500 lg:text-xs">Taux de fidélité</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xl font-extrabold text-gray-900 dark:text-white lg:text-3xl">
              {kpis.loyaltyRate}%
            </span>
            <div className="relative h-10 w-10 lg:h-12 lg:w-12">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90 lg:h-12 lg:w-12">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-gray-200/60 dark:text-gray-700/40"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${kpis.loyaltyRate}, 100`}
                  strokeLinecap="round"
                  className="text-sugu-500"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════ Status Tabs ════════════ */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0" role="tablist">
        {STATUS_TABS.map((tab) => {
          const count = clientsData.statusCounts[tab.countKey];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all lg:px-4 lg:text-sm",
                isActive
                  ? "bg-sugu-500 text-white"
                  : "bg-white/60 text-gray-600 backdrop-blur-sm hover:bg-white dark:bg-gray-900/40 dark:text-gray-400",
              )}
            >
              {tab.icon && <tab.icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : tab.iconClass)} />}
              {tab.label} ({count.toLocaleString("fr-FR")})
            </button>
          );
        })}

        {/* Loading indicator during refetch */}
        {isFetching && (
          <Loader2 className="ml-2 h-4 w-4 animate-spin text-sugu-500" />
        )}
      </div>

      {/* ════════════ Search + Sort + Filters ════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-2xl border border-white/60 bg-white/50 py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm backdrop-blur-md transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="hidden rounded-2xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-gray-400 lg:block">
            <option>Trier: Plus récents</option>
            <option>Nom A→Z</option>
            <option>Top dépenses</option>
            <option>Plus de commandes</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/50 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-md active:scale-[0.98] lg:px-4 lg:py-2.5 lg:text-sm lg:hover:bg-white dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-gray-400">
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
          </button>
        </div>
      </div>

      {/* ════════════ Main Layout: Table + Detail Panel ════════════ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-5">
        {/* ── Table ── */}
        <div className={cn("glass-card overflow-hidden rounded-2xl transition-all lg:rounded-3xl", selectedClientId ? "flex-1" : "w-full")}>
          {/* Header */}
          <div className="hidden border-b border-gray-100/80 bg-gray-50/30 dark:border-gray-800/50 lg:block">
            <div className="grid grid-cols-12 items-center gap-2 px-6 py-3">
              <span className="col-span-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Client</span>
              <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Téléphone</span>
              <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Ville</span>
              <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Commandes</span>
              <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Total dépensé</span>
              <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Dernière cmd</span>
              <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</span>
              <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Actions</span>
            </div>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-100/60 dark:divide-gray-800/40">
            {filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-gray-400">Aucun client trouvé.</p>
              </div>
            ) : (
              filtered.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    "group cursor-pointer px-4 py-2.5 transition-colors active:bg-white/40 dark:active:bg-white/5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-2 lg:px-6 lg:py-4 lg:cursor-default lg:hover:bg-white/40 dark:lg:hover:bg-white/5",
                    selectedClientId === client.id && "bg-sugu-50/30 dark:bg-sugu-950/10",
                  )}
                >
                  {/* ── Mobile: compact 2-line layout ── */}
                  <div className="flex items-center justify-between lg:hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${client.avatarColor}`}>
                        {client.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{client.name}</p>
                        <p className="truncate text-[10px] text-gray-400">{client.phone}</p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 pl-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency(client.totalSpent)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between lg:hidden">
                    <span className={cn("inline-flex rounded-full border px-2 py-px text-[10px] font-semibold", STATUS_BADGE[client.status])}>
                      {client.statusLabel}
                    </span>
                    <span className="text-[10px] text-gray-400">{client.orderCount} cmd · {client.lastOrder}</span>
                  </div>

                  {/* ── Desktop: grid cells ── */}
                  <div className="hidden items-center gap-3 lg:col-span-3 lg:flex">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${client.avatarColor}`}>
                      {client.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {client.name}
                      </p>
                      <p className="truncate text-[11px] text-gray-400">{client.email}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="hidden lg:col-span-1 lg:block">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{client.phone}</span>
                  </div>

                  {/* City */}
                  <div className="hidden lg:col-span-1 lg:block">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{client.city || "—"}</span>
                  </div>

                  {/* Orders */}
                  <div className="hidden lg:col-span-1 lg:block lg:text-center">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{client.orderCount}</span>
                  </div>

                  {/* Total spent */}
                  <div className="hidden lg:col-span-2 lg:block">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency(client.totalSpent)} FCFA
                    </span>
                  </div>

                  {/* Last order */}
                  <div className="hidden lg:col-span-2 lg:block">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{client.lastOrder}</span>
                  </div>

                  {/* Status */}
                  <div className="hidden lg:col-span-1 lg:block">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_BADGE[client.status])}>
                      {client.statusLabel}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="hidden items-center justify-center gap-1 lg:col-span-1 lg:flex">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedClientId(client.id); }}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-sugu-500 dark:hover:bg-gray-800"
                      aria-label={`Voir ${client.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                      aria-label="Plus d'actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100/80 px-4 py-3 dark:border-gray-800/50 sm:flex-row lg:px-6 lg:py-4">
            <p className="text-xs text-gray-400 lg:text-sm">
              {((currentPage - 1) * clientsData.pagination.perPage) + 1}-{Math.min(currentPage * clientsData.pagination.perPage, clientsData.pagination.totalItems)} sur {clientsData.pagination.totalItems.toLocaleString("fr-FR")} clients
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {buildPageNumbers().map((p, idx) =>
                p === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      p === currentPage ? "bg-sugu-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= clientsData.pagination.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Detail Panel (inline) ── */}
        {selectedClientId && (
          <ClientDetailPanel
            clientFromList={filtered.find((c) => c.id === selectedClientId) ?? null}
            detailData={selectedClientDetail ?? null}
            isLoading={isDetailLoading}
            onClose={() => setSelectedClientId(null)}
          />
        )}
      </div>

      {/* ════════════ Create Client Modal ════════════ */}
      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          mutation={createClientMutation}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Create Client Modal
// ────────────────────────────────────────────────────────────

function CreateClientModal({
  onClose,
  mutation,
}: {
  onClose: () => void;
  mutation: ReturnType<typeof useCreateClientFromPage>;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "Prénom requis";
    if (!form.lastName.trim()) errs.lastName = "Nom requis";
    if (!form.phone.trim() && !form.email.trim()) {
      errs.phone = "Téléphone ou email requis";
    }
    if (form.phone.trim() && form.phone.trim().length < 8) {
      errs.phone = "Minimum 8 caractères";
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Email invalide";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await mutation.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch {
      // Error handled by React Query
    }
  };

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="animate-scale-in glass-card mx-4 w-full max-w-md rounded-3xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Client créé !</h3>
          <p className="mt-1 text-sm text-gray-500">{form.firstName} {form.lastName} a été ajouté à vos clients.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler<HTMLDivElement>}
    >
      <div
        className="animate-scale-in glass-card mx-4 w-full max-w-md rounded-3xl p-6 lg:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouveau client</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* First + Last name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Prénom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                placeholder="Ex: Fatou"
                className={cn(
                  "w-full rounded-xl border bg-white/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 dark:bg-gray-900/50 dark:text-white",
                  errors.firstName
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                    : "border-white/60 focus:border-sugu-300 focus:ring-sugu-500/20 dark:border-gray-700/50",
                )}
                autoFocus
              />
              {errors.firstName && <p className="mt-1 text-[10px] text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Nom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                placeholder="Ex: Traoré"
                className={cn(
                  "w-full rounded-xl border bg-white/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 dark:bg-gray-900/50 dark:text-white",
                  errors.lastName
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                    : "border-white/60 focus:border-sugu-300 focus:ring-sugu-500/20 dark:border-gray-700/50",
                )}
              />
              {errors.lastName && <p className="mt-1 text-[10px] text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+226 70 00 00 00"
                className={cn(
                  "w-full rounded-xl border bg-white/50 py-2.5 pl-10 pr-3.5 text-sm text-gray-900 placeholder-gray-400 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 dark:bg-gray-900/50 dark:text-white",
                  errors.phone
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                    : "border-white/60 focus:border-sugu-300 focus:ring-sugu-500/20 dark:border-gray-700/50",
                )}
              />
            </div>
            {errors.phone && <p className="mt-1 text-[10px] text-red-500">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="fatou@exemple.com"
                className={cn(
                  "w-full rounded-xl border bg-white/50 py-2.5 pl-10 pr-3.5 text-sm text-gray-900 placeholder-gray-400 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 dark:bg-gray-900/50 dark:text-white",
                  errors.email
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                    : "border-white/60 focus:border-sugu-300 focus:ring-sugu-500/20 dark:border-gray-700/50",
                )}
              />
            </div>
            {errors.email && <p className="mt-1 text-[10px] text-red-500">{errors.email}</p>}
          </div>

          {/* API error */}
          {mutation.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
              {(mutation.error as Error)?.message || "Une erreur est survenue. Veuillez réessayer."}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sugu-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 disabled:opacity-70"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Créer le client
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function ClientDetailPanel({
  clientFromList,
  detailData,
  isLoading,
  onClose,
}: {
  clientFromList: VendorClient | null;
  detailData: VendorClient | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  // Use detail data if available, otherwise fallback to list data
  const client = detailData ?? clientFromList;

  if (!client) {
    return (
      <div className="fixed inset-0 z-50 animate-slide-in-right lg:relative lg:inset-auto lg:z-auto lg:block lg:w-[340px] lg:flex-shrink-0">
        <div className="flex h-full items-center justify-center bg-white p-4 dark:bg-gray-950 lg:glass-card lg:sticky lg:top-4 lg:h-auto lg:rounded-3xl lg:bg-transparent lg:p-6 lg:dark:bg-transparent">
          <Loader2 className="h-6 w-6 animate-spin text-sugu-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 animate-slide-in-right lg:relative lg:inset-auto lg:z-auto lg:block lg:w-[340px] lg:flex-shrink-0">
      <div className="h-full overflow-y-auto bg-white p-4 space-y-4 dark:bg-gray-950 lg:glass-card lg:sticky lg:top-4 lg:h-auto lg:overflow-visible lg:rounded-3xl lg:bg-transparent lg:p-6 lg:space-y-5 lg:dark:bg-transparent">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-bold lg:h-16 lg:w-16 lg:text-lg ${client.avatarColor}`}>
            {client.initials}
          </div>
          <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white lg:mt-3 lg:text-lg">{client.name}</h3>
          <span className={cn("mt-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold", STATUS_BADGE[client.status])}>
            {client.status === "loyal" || client.status === "vip" ? "Cliente fidèle" : client.statusLabel}
          </span>
          {isLoading && (
            <Loader2 className="mt-2 h-4 w-4 animate-spin text-sugu-400" />
          )}
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            {client.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            {client.email || "—"}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            {client.city || "—"}
          </div>
          {client.memberSince && (
            <p className="text-xs text-gray-400">Membre depuis: {client.memberSince}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/50 p-2.5 text-center dark:bg-white/5">
            <p className="text-lg font-extrabold text-gray-900 dark:text-white">{client.orderCount}</p>
            <p className="text-[10px] text-gray-400">commandes</p>
          </div>
          <div className="rounded-xl bg-white/50 p-2.5 text-center dark:bg-white/5">
            <p className="text-sm font-extrabold text-gray-900 dark:text-white">{formatCurrency(client.totalSpent)}</p>
            <p className="text-[10px] text-gray-400">dépensés</p>
          </div>
          <div className="rounded-xl bg-white/50 p-2.5 text-center dark:bg-white/5">
            <p className="text-sm font-extrabold text-gray-900 dark:text-white">{formatCurrency(client.avgBasket)}</p>
            <p className="text-[10px] text-gray-400">panier moyen</p>
          </div>
        </div>

        {/* Recent orders */}
        {client.recentOrders.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Dernières commandes</h4>
            <div className="mt-2 space-y-1.5">
              {client.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2 dark:bg-white/5">
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{order.reference}</span>
                    <span className="ml-2 text-[10px] text-gray-400">{order.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(order.total)} FCFA</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", order.statusColor)}>
                      {order.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorite products */}
        {client.favoriteProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Produits favoris</h4>
            <div className="mt-2 flex gap-3">
              {client.favoriteProducts.map((prod) => (
                <div key={prod.id} className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/60 text-2xl shadow-sm dark:bg-white/10">
                    {prod.emoji}
                  </div>
                  <span className="text-[10px] text-gray-500 truncate max-w-[60px]">{prod.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sugu-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-sugu-600">
              <Phone className="h-3.5 w-3.5" />
              Appeler
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-green-600">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-sugu-200 bg-sugu-50/80 px-3 py-2 text-xs font-semibold text-sugu-600 transition-all hover:bg-sugu-100">
              <Gift className="h-3.5 w-3.5" />
              Offrir un code promo
            </button>
          </div>
        </div>

        {/* View full profile */}
        <button className="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-sugu-500 transition-colors hover:text-sugu-600">
          Voir le profil complet
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
