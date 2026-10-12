"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PackageSearch, RefreshCw } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, IconButton, Pagination, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, ToolbarSearch, cn } from "@/design-system";
import { DriverPage, ScreenHeader } from "@/features/driver/components/frame";
import { useMissionActions } from "@/features/driver/components/mission-actions";
import { MissionCard, OpenMission } from "@/features/driver/components/mission-bits";
import { describeDriverFailure } from "@/features/driver/errors";
import { MISSION_PAGE_SIZE } from "@/features/driver/missions/api";
import { can, type Mission, type MissionPhase, type MissionScope } from "@/features/driver/missions/contract";
import { useMissions } from "@/features/driver/missions/hooks";
import { ACTION_LABEL, SCOPE_LABEL } from "@/features/driver/missions/wording";

// The missions of the courier, in the three lists of the mock-up: what is
// offered to them, what they have in hand, what is over. The list, its
// counters, the search and the pages are the server's; the address of the
// screen says which list is shown, so that a link or a reload finds it again.

const SCOPES: MissionScope[] = ["offered", "in_progress", "done"];
const SCOPE_PARAM: Record<MissionScope, string> = { offered: "disponibles", in_progress: "en-cours", done: "terminees" };
const PHASES: { value: MissionPhase | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pickup", label: "Collecte" },
  { value: "dropoff", label: "Livraison" },
];

const scopeOf = (param: string | null): MissionScope => SCOPES.find((scope) => SCOPE_PARAM[scope] === param) ?? "in_progress";

const EMPTY: Record<MissionScope, { title: string; description: string }> = {
  offered: { title: "Aucune mission disponible", description: "Les missions que votre agence vous propose apparaîtront ici." },
  in_progress: { title: "Aucune mission en cours", description: "Acceptez une mission disponible pour la retrouver ici." },
  done: { title: "Aucune mission terminée", description: "Vos missions livrées ou en échec apparaîtront ici." },
};

export function MissionsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const scope = scopeOf(params.get("liste"));
  const phase = (PHASES.find((option) => option.value === params.get("etape"))?.value ?? "all") as MissionPhase | "all";
  const search = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // What is typed; it reaches the address, and the server, once typing has paused.
  const [typed, setTyped] = useState(search);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (typed.trim() === search) return;
    const timer = window.setTimeout(() => update({ q: typed.trim() || null, page: null }), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` reads the current address each time it runs.
  }, [typed, search]);

  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } = useMissions({ scope, phase: phase === "all" ? undefined : phase, search, page });

  const empty = EMPTY[scope];
  const filtered = search !== "" || (scope === "in_progress" && phase !== "all");

  return (
    <DriverPage>
      <ScreenHeader
        title="Missions"
        back={{ label: "Retour à l'accueil", href: "/driver/dashboard" }}
        actions={<IconButton icon={RefreshCw} label="Actualiser les missions" loading={isFetching && !isLoading} onClick={() => refetch()} />}
      />

      <Tabs value={scope} onValueChange={(value) => update({ liste: SCOPE_PARAM[value as MissionScope], etape: null, page: null })}>
        <TabsList label="Listes de missions" className="grid w-full min-w-0 grid-cols-3 gap-0">
          {SCOPES.map((value) => (
            <TabsTrigger key={value} value={value} count={value === "done" ? undefined : data?.counts[value]} className="min-w-0 justify-center px-1">
              {SCOPE_LABEL[value]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={scope} className="mt-4 flex flex-col gap-4">
      <ToolbarSearch value={typed} onValueChange={setTyped} onSubmit={(value) => update({ q: value.trim() || null, page: null })} label="Rechercher une mission" className="max-w-none" />

      {scope === "in_progress" && (
        <div role="group" aria-label="Étape de la mission" className="flex flex-wrap gap-2">
          {PHASES.map((option) => {
            const pressed = phase === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={pressed}
                onClick={() => update({ etape: option.value === "all" ? null : option.value, page: null })}
                className={cn(
                  "h-control rounded-button border px-4 text-label transition-colors duration-100 touch:h-touch",
                  pressed ? "border-primary bg-primary text-surface" : "border-border-strong bg-surface text-foreground hover:bg-surface-subtle",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      <section aria-label={`Missions ${SCOPE_LABEL[scope].toLowerCase()}`} aria-busy={isFetching} className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-56 rounded-panel" />)
        ) : isError && !data ? (
          <Card flush>
            <ErrorState title="Impossible de charger vos missions" description={describeDriverFailure(error).message} onRetry={() => refetch()} retrying={isFetching} />
          </Card>
        ) : data && data.rows.length === 0 ? (
          <Card flush>
            <EmptyState
              icon={PackageSearch}
              title={filtered ? "Aucune mission ne correspond" : empty.title}
              description={filtered ? "Modifiez la recherche ou le filtre." : empty.description}
              action={
                filtered ? (
                  <Button
                    onClick={() => {
                      setTyped("");
                      update({ q: null, etape: null, page: null });
                    }}
                  >
                    Tout afficher
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className={cn("flex flex-col gap-3 transition-opacity duration-100", isPlaceholderData && "opacity-60")}>
            {data?.rows.map((mission) => (
              <MissionRow key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </section>

      {data && data.total > MISSION_PAGE_SIZE && (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(next) => update({ page: next > 1 ? String(next) : null })} disabled={isFetching} itemLabel="missions" />
      )}
        </TabsContent>
      </Tabs>
    </DriverPage>
  );
}

/** A card and its one action: accept what is offered, open what is in hand. */
function MissionRow({ mission }: { mission: Mission }) {
  const router = useRouter();
  const actions = useMissionActions(mission, {
    // Once accepted, the mission is in hand: its page says what comes next.
    onDone: (action) => action === "accept" && router.push(`/driver/deliveries/${mission.id}`),
  });

  const action = can(mission, "accept") ? (
    <Button variant="primary" loading={actions.busy === "accept"} onClick={() => actions.perform("accept")} className="h-touch w-full">
      {ACTION_LABEL.accept}
    </Button>
  ) : (
    <OpenMission mission={mission}>{mission.stage === "arrived" ? "Confirmer la livraison" : "Voir la mission"}</OpenMission>
  );

  return (
    <>
      <MissionCard mission={mission} action={action} headingLevel={2} />
      {actions.dialogs}
    </>
  );
}
