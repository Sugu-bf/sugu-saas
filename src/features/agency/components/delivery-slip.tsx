import { formatMoneyFromFrancs } from "@/design-system";
import { deliveryLabel, type DeliveryDetail } from "../deliveries/contract";
import { codMixteSummaryOf, paymentMethodLabel, paymentWords } from "../deliveries/payment";
import { paymentCodeOf } from "./delivery-bits";
import { formatLongDateTime } from "../format";

/**
 * The slip of a delivery, for the printer only ("Imprimer le bon"): who
 * sends, who receives, what is carried and what is left to collect, with
 * room for two signatures. Nothing here is on the screen.
 */
export function DeliverySlip({ delivery, agencyName }: { delivery: DeliveryDetail; agencyName: string | null }) {
  const cod = codMixteSummaryOf(delivery);
  const address = [delivery.recipient.address, delivery.addressLine2, delivery.zone?.name, delivery.recipient.city].filter(Boolean).join(", ");
  const block = "rounded-control border border-black p-3";
  const label = "text-meta font-semibold uppercase";

  return (
    <article className="hidden text-black print:block" aria-hidden="true">
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <p className="text-page-title">Bon de livraison</p>
          <p className="text-body">{agencyName ?? "Agence de livraison"}</p>
        </div>
        <div className="text-right">
          <p className="text-section-title tabular-nums">{deliveryLabel(delivery.reference)}</p>
          <p className="text-body">Créée le {formatLongDateTime(delivery.createdAt)}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <section className={block}>
          <p className={label}>Expéditeur</p>
          <p className="mt-1 text-body font-semibold">{delivery.pickup?.name ?? "Non renseigné"}</p>
          {delivery.pickup?.address && <p className="text-body">{delivery.pickup.address}</p>}
          {delivery.pickup?.phone && <p className="text-body tabular-nums">{delivery.pickup.phone}</p>}
        </section>
        <section className={block}>
          <p className={label}>Destinataire</p>
          <p className="mt-1 text-body font-semibold">{delivery.recipient.name ?? "Non renseigné"}</p>
          {address && <p className="text-body">{address}</p>}
          {delivery.recipient.phone && <p className="text-body tabular-nums">{delivery.recipient.phone}</p>}
          {delivery.directions && <p className="mt-1 text-body">Repère : {delivery.directions}</p>}
        </section>
      </div>

      <section className={`${block} mt-4`}>
        <p className={label}>Colis</p>
        <p className="mt-1 text-body">
          {delivery.itemsCount} article{delivery.itemsCount > 1 ? "s" : ""}
          {delivery.items.length > 0 && ` : ${delivery.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}`}
        </p>
        <p className="text-body">Valeur des articles : {formatMoneyFromFrancs(delivery.goodsFrancs)}</p>
        {delivery.instructions && <p className="mt-1 text-body">Consigne : {delivery.instructions}</p>}
      </section>

      <section className={`${block} mt-4`}>
        <p className={label}>Paiement</p>
        {cod ? (
          <>
            {cod.lines.map((line) => (
              <p key={line.label} className="mt-1 text-body">
                {line.label} : {formatMoneyFromFrancs(line.francs)} ({line.paid ? "payé" : "à régler"})
              </p>
            ))}
            <p className="mt-1 text-body font-semibold">Reste à encaisser : {formatMoneyFromFrancs(cod.dueFrancs)}</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-body">Prix de la livraison : {formatMoneyFromFrancs(delivery.feeFrancs)}</p>
            <p className="text-body">
              Commande : {paymentWords(paymentCodeOf(delivery))}
              {paymentMethodLabel(delivery.paymentMethod) ? ` (${paymentMethodLabel(delivery.paymentMethod)})` : ""}
            </p>
          </>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <section className={`${block} h-28`}>
          <p className={label}>Livreur</p>
          <p className="mt-1 text-body">{delivery.courier?.name ?? "Non assigné"}</p>
        </section>
        <section className={`${block} h-28`}>
          <p className={label}>Reçu par (nom et signature)</p>
        </section>
      </div>
    </article>
  );
}
