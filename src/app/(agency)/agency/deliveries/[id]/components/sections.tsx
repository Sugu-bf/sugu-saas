import type { SetStateAction } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { MapPin, Navigation, Bike, Phone, MessageCircle, Star, UserCheck, User, StickyNote, Package, ExternalLink, CheckCircle2, Check, Zap, Loader2, AlertTriangle, XCircle } from "lucide-react";
import type { DeliveryDetailRow } from "@/features/agency/schema";
import { MapPlaceholder } from "./skeletons";
import { AgencyCodMixtePaymentCard } from "./badges";

export function DeliveryDetailTrackingSection({
  row,
  detailRow,
  completionPercent,
  statusUpdateLabel,
}: {
  row: DeliveryDetailRow;
  detailRow: DeliveryDetailRow;
  completionPercent: number;
  statusUpdateLabel: string;
}) {
  return (
    <section
      className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
      style={{ animationDelay: "60ms" }}
      aria-labelledby="detail-tracking-heading"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <h2 id="detail-tracking-heading" className="text-sm font-bold text-gray-900">
            Suivi en temps réel
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-dot" />
          Mise à jour {statusUpdateLabel}
        </div>
      </div>

      <MapPlaceholder row={row} />

      <p className="mt-3 text-xs text-gray-500">
        {detailRow.itinerary.distanceKm} km — {completionPercent}% complété
      </p>
    </section>
  );
}

export function DeliveryDetailDriverSection({
  row,
  detailRow,
}: {
  row: DeliveryDetailRow;
  detailRow: DeliveryDetailRow;
}) {
  return (
    <section
      className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
      style={{ animationDelay: "120ms" }}
      aria-labelledby="detail-driver-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <Bike className="h-4 w-4 text-gray-500" />
        <h2 id="detail-driver-heading" className="text-sm font-bold text-gray-900">
          Livreur
        </h2>
      </div>

      {row.driver ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold",
                  row.driver.avatarColor
                )}
              >
                {row.driver.initials}
              </div>
              {row.driver.online && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900">{row.driver.name}</p>
                {row.driver.online && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    En ligne
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  {row.driver.vehicle}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {row.driver.rating}
                </span>
              </div>
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            {detailRow.driverPhone || "N/A"}
          </p>

          <div className="flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50">
              <Phone className="h-3.5 w-3.5" />
              Appeler
            </button>
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-green-600">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </button>
          </div>

          <Link
            href={`/agency/drivers/${row.driver.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            <Navigation className="h-3.5 w-3.5" />
            Voir le profil du livreur →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50/80 p-6 text-center">
          <UserCheck className="h-10 w-10 text-gray-300" />
          <p className="text-xs text-gray-400">Aucun livreur assigné</p>
          <button className="rounded-xl bg-sugu-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sugu-600 transition-colors">
            + Assigner
          </button>
        </div>
      )}
    </section>
  );
}

export function DeliveryDetailClientSection({ row }: { row: DeliveryDetailRow }) {
  return (
    <section
      className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
      style={{ animationDelay: "180ms" }}
      aria-labelledby="detail-client-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <User className="h-4 w-4 text-gray-500" />
        <h2 id="detail-client-heading" className="text-sm font-bold text-gray-900">
          Client
        </h2>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-bold text-gray-900">{row.client.name}</p>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          {row.client.address}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          {row.client.phone || "Non renseigné"}
        </div>

        {row.client.note && (
          <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs italic text-amber-700">
            <StickyNote className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            {row.client.note}
          </div>
        )}

        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 mt-2">
          <Phone className="h-3.5 w-3.5" />
          Appeler le client
        </button>
      </div>
    </section>
  );
}

export function DeliveryDetailOrderSection({
  row,
  detailRow,
  orderSubtotal,
  deliveryFee,
  totalWithFees,
}: {
  row: DeliveryDetailRow;
  detailRow: DeliveryDetailRow;
  orderSubtotal: number;
  deliveryFee: number;
  totalWithFees: number;
}) {
  return (
    <section
      className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
      style={{ animationDelay: "240ms" }}
      aria-labelledby="detail-order-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-gray-500" />
        <h2 id="detail-order-heading" className="text-sm font-bold text-gray-900">
          Détails commande
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-900">{row.vendor}</span>
            <a
              href={row.vendorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sugu-500 hover:text-sugu-600"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <p className="font-mono text-xs text-gray-500">Commande {row.orderId}</p>

          <p className="text-xs text-gray-800">
            {row.orderItems} articles ·{" "}
            <span className="font-bold">{formatCurrency(orderSubtotal)} FCFA</span>
          </p>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              row.orderPayment === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                row.orderPayment === "paid" ? "bg-green-500" : "bg-amber-500"
              )}
            />
            {row.orderPayment === "paid" ? "Payé" : "En attente"}
          </span>

          {detailRow.codMixte?.isCodMixte && (
            <AgencyCodMixtePaymentCard codMixte={detailRow.codMixte} />
          )}

          <div className="border-t border-gray-100 my-3" />

          <p className="text-xs font-bold text-gray-700 mb-1">Articles:</p>
          <ul className="space-y-2 mt-2">
            {detailRow.orderItemsList.length > 0 ? (
              detailRow.orderItemsList.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-2 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image ? (
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate" title={item.name}>
                        <span className="text-sugu-600 mr-1">{item.qty}×</span>{item.name}
                      </p>
                      <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                        {formatCurrency(item.unit_price / 100)} FCFA
                      </p>
                    </div>
                  </div>
                  {item.collected && (
                    <div className="flex-shrink-0 ml-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        <CheckCircle2 className="h-3 w-3 text-green-600" /> Collecté
                      </span>
                    </div>
                  )}
                </li>
              ))
            ) : (
              <li className="text-gray-400 italic text-xs">Aucun article détaillé</li>
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Frais de livraison:</p>
            <p className="text-sm font-semibold text-gray-800">{formatCurrency(deliveryFee)} FCFA</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Total commande:</p>
            <p className="text-lg font-black text-gray-900">{formatCurrency(totalWithFees)} FCFA</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Distance totale:</p>
            <p className="text-sm text-gray-700">{row.itinerary.distanceKm} km</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Mode de paiement:</p>
            <span className="inline-flex items-center rounded-full bg-sugu-100 px-2.5 py-0.5 text-[11px] font-semibold text-sugu-700">
              {detailRow.paymentMethod ?? "Non spécifié"}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-500">Date commande:</p>
            <p className="text-xs font-medium text-gray-700">{detailRow.orderDate}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DeliveryDetailItinerarySection({
  row,
  enrichedTimeline,
}: {
  row: DeliveryDetailRow;
  enrichedTimeline: Array<{ id: string; label: string; sub?: string; time: string; done: boolean; current: boolean }>;
}) {
  return (
    <section
      className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
      style={{ animationDelay: "300ms" }}
      aria-labelledby="detail-itinerary-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <Navigation className="h-4 w-4 text-gray-500" />
        <h2 id="detail-itinerary-heading" className="text-sm font-bold text-gray-900">
          Itinéraire
        </h2>
      </div>

      <div className="space-y-0.5 mb-5">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="h-6 w-px border-l border-dashed border-gray-300 mt-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900">Point A — {row.vendor}</p>
            <p className="text-[10px] text-gray-400">{row.itinerary.from}</p>
          </div>
          <span className="flex-shrink-0 text-xs font-semibold text-gray-500">
            {row.itinerary.fromTime || "18:35"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="h-6 w-px border-l border-dashed border-gray-300" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">{row.itinerary.distanceKm} km</span>
            <span className="text-[10px] font-bold text-sugu-500">ETA {row.eta}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <span className="h-3 w-3 rounded-full bg-sugu-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900">Point B — {row.client.name}</p>
            <p className="text-[10px] text-gray-400">{row.itinerary.to}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <ol aria-label="Étapes de livraison" className="space-y-0">
          {enrichedTimeline.map((step, i) => {
            const isLast = i === enrichedTimeline.length - 1;
            return (
              <li key={step.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    {step.done && !step.current ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    ) : step.current ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sugu-500 ring-2 ring-sugu-200 animate-pulse-dot">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-gray-200" />
                    )}
                  </div>
                  {!isLast && (
                    <span
                      className={cn(
                        "h-8 w-0.5 mt-0.5",
                        step.done ? "bg-green-300" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>

                <div className="flex flex-1 items-start justify-between pb-2 min-w-0">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs",
                        step.done && !step.current
                          ? "font-medium text-gray-700"
                          : step.current
                            ? "font-bold text-sugu-600"
                            : "text-gray-400"
                      )}
                    >
                      {step.label}
                    </p>
                    {step.sub && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{step.sub}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-medium text-gray-400 ml-2">
                    {step.time}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function DeliveryDetailActionsSection({
  row,
  updateStatus,
  isMutating,
}: {
  row: DeliveryDetailRow;
  updateStatus: UseMutationResult<unknown, Error, { shipmentId: string; status: string; memo?: string }, unknown>;
  isMutating: boolean;
}) {
  return (
    <section
      className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
      style={{ animationDelay: "360ms" }}
      aria-labelledby="detail-actions-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-gray-500" />
        <h2 id="detail-actions-heading" className="text-sm font-bold text-gray-900">
          Actions rapides
        </h2>
      </div>

      <div className="space-y-2">
        {row.status === "en_route" && (
          <button
            id={`btn-mark-delivered-${row.id}`}
            onClick={() => updateStatus.mutate({ shipmentId: row.id, status: "delivered" })}
            disabled={isMutating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sugu-500 py-3 text-sm font-semibold text-white transition-all hover:bg-sugu-600 active:scale-[0.98] disabled:opacity-60"
          >
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Marquer comme livrée
          </button>
        )}

        {row.status === "en_route" && (
          <button
            id={`btn-signal-delay-${row.id}`}
            onClick={() => updateStatus.mutate({ shipmentId: row.id, status: "in_transit", memo: "Retard signalé par l'agence" })}
            disabled={isMutating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            Signaler un retard
          </button>
        )}

        {!["delivered", "returned", "delayed"].includes(row.status) && (
          <button
            id={`btn-fail-${row.id}`}
            onClick={() => updateStatus.mutate({ shipmentId: row.id, status: "delivery_failed" })}
            disabled={isMutating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Livraison échouée
          </button>
        )}
      </div>
    </section>
  );
}

export function DeliveryDetailNotesSection({
  detailRow,
  internalNote,
  setInternalNote,
  addNote,
}: {
  detailRow: DeliveryDetailRow;
  internalNote: string;
  setInternalNote: (value: SetStateAction<string>) => void;
  addNote: UseMutationResult<unknown, Error, string, unknown>;
}) {
  return (
    <section
      className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
      style={{ animationDelay: "420ms" }}
      aria-labelledby="detail-notes-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-gray-500" />
        <h2 id="detail-notes-heading" className="text-sm font-bold text-gray-900">
          Notes internes
        </h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <textarea
            className="form-input h-16 flex-1 resize-none text-xs"
            placeholder="Ajouter une note interne..."
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
          />
          <button
            className="rounded-lg bg-sugu-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sugu-600 transition-colors self-end disabled:opacity-60"
            disabled={!internalNote.trim() || addNote.isPending}
            onClick={() => {
              if (internalNote.trim()) {
                addNote.mutate(internalNote.trim(), {
                  onSuccess: () => setInternalNote(""),
                });
              }
            }}
          >
            {addNote.isPending ? "..." : "Enregistrer"}
          </button>
        </div>

        {detailRow.notes.length > 0 ? (
          detailRow.notes.map((note) => (
            <div key={note.id} className="rounded-lg bg-gray-50 p-2.5">
              <p className="text-xs italic text-gray-600">{note.memo}</p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Par: {note.author} — {new Date(note.noted_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 italic">Aucune note pour le moment.</p>
        )}
      </div>
    </section>
  );
}
