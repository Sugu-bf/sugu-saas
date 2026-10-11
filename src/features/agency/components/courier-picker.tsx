"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Avatar, EmptyState, ErrorState, Input, Skeleton, StatusBadge, cn } from "@/design-system";
import { vehicleLabel, type Courier } from "../couriers/contract";
import { useCouriers } from "../couriers/hooks";
import { describeAgencyFailure } from "../errors";

/** Why a courier cannot be given a delivery, or null when he can. */
export function unavailability(courier: Pick<Courier, "activity">): string | null {
  switch (courier.activity) {
    case "suspended":
      return "Compte suspendu";
    case "to_verify":
      return "Pièces à vérifier";
    case "paused":
      return "En pause";
    default:
      return null;
  }
}

/** The couriers who can take a delivery first, the free ones before the busy ones, then the others; each group by name. */
function byAvailability(a: Courier, b: Courier): number {
  const rank = (courier: Courier) => (unavailability(courier) ? 2 : courier.activity === "available" ? 0 : 1);
  return rank(a) - rank(b) || a.name.localeCompare(b.name, "fr");
}

const CHOICE = cn(
  "flex min-w-0 items-center gap-3 rounded-control border border-border p-2.5 transition-colors duration-100",
  "has-[:checked]:border-primary has-[:checked]:bg-brand-subtle",
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring",
);

export interface CourierPickerProps {
  /** User id of the chosen courier; `""` for the `none` choice; undefined while nothing is chosen. */
  value: string | undefined;
  onChange: (userId: string, courier: Courier | null) => void;
  /** User id of the courier who already carries the delivery: shown as such, and not offered again. */
  currentCourierUserId?: string | null;
  /** A first choice that is no courier ("Assigner plus tard"), with what it means. */
  none?: { label: string; description: ReactNode };
  /** Whether the list is asked from the server (a closed dialog does not ask). */
  enabled?: boolean;
  disabled?: boolean;
  /** Accessible name of the group of choices. */
  legend?: string;
}

/**
 * The couriers of the agency as a list of choices, with a search sent to the
 * server. What each one is doing comes from the server; who cannot take a
 * delivery is listed with the reason, and cannot be chosen.
 */
export function CourierPicker({ value, onChange, currentCourierUserId = null, none, enabled = true, disabled = false, legend = "Livreur" }: CourierPickerProps) {
  const groupName = useId();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // The search is sent once typing has paused: the list is paginated on the server.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const couriers = useCouriers({ page: 1, pageSize: 50, search: search || undefined, sort: "name", direction: "asc" }, { enabled });
  const rows = [...(couriers.data?.rows ?? [])].sort(byAvailability);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Input
        type="search"
        leadingIcon={Search}
        aria-label="Rechercher un livreur"
        placeholder="Nom, téléphone ou matricule"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        // Inside a form, Enter in the search must not submit the form: the list follows the typing.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        disabled={disabled}
      />

      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-1.5">
        <legend className="sr-only">{legend}</legend>

        {none && (
          <label className={cn(CHOICE, "cursor-pointer hover:bg-surface-subtle")}>
            <input type="radio" name={groupName} value="" checked={value === ""} onChange={() => onChange("", null)} className="sr-only" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body font-medium text-foreground">{none.label}</span>
              <span className="text-meta text-foreground-muted">{none.description}</span>
            </span>
          </label>
        )}

        {couriers.isError ? (
          <ErrorState
            title="Les livreurs n'ont pas pu être chargés"
            description={describeAgencyFailure(couriers.error).message}
            onRetry={() => couriers.refetch()}
            retrying={couriers.isFetching}
            className="py-6"
          />
        ) : !couriers.isSuccess ? (
          <div className="flex flex-col gap-1.5" role="status" aria-label="Chargement des livreurs">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={search ? "Aucun livreur ne correspond" : "Aucun livreur dans votre agence"}
            description={search ? "Vérifiez l'orthographe, ou cherchez par téléphone." : "Ajoutez un livreur pour pouvoir lui confier des courses."}
            className="py-6"
          />
        ) : (
          rows.map((courier) => {
            const reason = unavailability(courier);
            const current = courier.userId === currentCourierUserId;
            const blocked = reason !== null || current;
            const details = [courier.employeeId, vehicleLabel(courier.vehicleType), courier.activeShipments > 0 ? `${courier.activeShipments} en cours` : null].filter(Boolean).join(" · ");
            return (
              <label key={courier.id} className={cn(CHOICE, blocked ? "cursor-not-allowed bg-surface-subtle" : "cursor-pointer hover:bg-surface-subtle")}>
                <input
                  type="radio"
                  name={groupName}
                  value={courier.userId}
                  checked={value === courier.userId}
                  onChange={() => onChange(courier.userId, courier)}
                  disabled={blocked}
                  className="sr-only"
                />
                <Avatar name={courier.name} size="md" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("truncate text-body font-medium", blocked ? "text-foreground-muted" : "text-foreground")}>{courier.name}</span>
                  {details && <span className="truncate text-meta text-foreground-muted">{details}</span>}
                </span>
                {current ? (
                  <span className="shrink-0 text-meta text-foreground-muted">Livreur actuel</span>
                ) : (
                  <StatusBadge domain="courierActivity" code={courier.activity} className="shrink-0" />
                )}
              </label>
            );
          })
        )}
      </fieldset>

      {couriers.isSuccess && couriers.data.total > rows.length && (
        <p className="text-meta text-foreground-muted">
          {rows.length} livreurs affichés sur {couriers.data.total}. Précisez la recherche pour trouver les autres.
        </p>
      )}
    </div>
  );
}
