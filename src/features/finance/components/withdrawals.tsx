"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpFromLine, ListChecks } from "lucide-react";
import { Alert, Button, Card, DescriptionList, EmptyState, ErrorState, Money, Pagination, Sheet, SheetContent, Skeleton, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system";
import { formatDayTime } from "@/features/agency/format";
import type { FinanceProfile } from "../api";
import { WITHDRAWAL_STATES, type Withdrawal, type WithdrawalState } from "../contract";
import { useFinanceScope, useSummary, useWithdrawals } from "../hooks";
import { FINANCE_SPACES, financePaths } from "../spaces";
import { describeFinanceFailure, isForbidden, payoutMethodLabel } from "../wording";
import { FinanceHeader, FinancePage, IconTile, useReturnFocus, withdrawalItems, withdrawalNote } from "./bits";

// The withdrawal requests of an account and where each one stands, after the
// mock-up. The state shown is the one of the server: a request accepted is
// not a request paid.

const PAGE_SIZE = 20;

const STATE_PARAM: Record<WithdrawalState, string> = { in_progress: "en-cours", paid: "payes", closed: "clos" };
const STATE_LABEL: Record<WithdrawalState, string> = { in_progress: "En cours", paid: "Payés", closed: "Refusés ou annulés" };
const stateOf = (param: string | null): WithdrawalState | undefined => WITHDRAWAL_STATES.find((state) => STATE_PARAM[state] === param);

export function FinanceWithdrawals({ profile }: { profile: FinanceProfile }) {
  const space = FINANCE_SPACES[profile];
  const paths = financePaths(space);
  const scope = useFinanceScope(profile);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = stateOf(params.get("etat"));
  const page = Math.max(1, Number(params.get("page")) || 1);

  const summary = useSummary(scope);
  const { data, isError, error, refetch, isFetching } = useWithdrawals(scope, { state, page, pageSize: PAGE_SIZE });
  const [opened, setOpened] = useState<Withdrawal | null>(null);
  const focus = useReturnFocus();

  const update = (changes: Record<string, string | null>) => {
    // Read from the address itself: a change asked while another is still on its way starts from it.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const canWithdraw = summary.data?.withdrawal.allowed ?? false;
  const back = { label: `Retour : ${space.title}`, href: paths.overview };

  if (isError && !data && isForbidden(error)) {
    return (
      <FinancePage>
        <FinanceHeader title="Mes retraits" back={back} />
        <Alert tone="warning" title="Accès réservé">
          {describeFinanceFailure(error).message}
        </Alert>
      </FinancePage>
    );
  }

  return (
    <FinancePage>
      <FinanceHeader
        title="Mes retraits"
        back={back}
        actions={
          canWithdraw ? (
            <Button asChild variant="primary" size="compact" icon={ArrowUpFromLine}>
              <Link href={paths.withdraw}>Nouveau retrait</Link>
            </Button>
          ) : undefined
        }
      />

      <Tabs value={state ?? "all"} onValueChange={(value) => update({ etat: value === "all" ? null : STATE_PARAM[value as WithdrawalState], page: null })}>
        <TabsList label="Demandes par état" variant="pills">
          <TabsTrigger value="all" count={data?.counts.all}>
            Toutes
          </TabsTrigger>
          <TabsTrigger value="in_progress" tone="warning" count={data?.counts.in_progress}>
            {STATE_LABEL.in_progress}
          </TabsTrigger>
          <TabsTrigger value="paid" tone="success" count={data?.counts.paid}>
            {STATE_LABEL.paid}
          </TabsTrigger>
          <TabsTrigger value="closed" tone="danger" count={data?.counts.closed}>
            {STATE_LABEL.closed}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={state ?? "all"} className="mt-4 flex flex-col gap-4">
          <Card className="py-1" aria-busy={isFetching || undefined}>
            {!data && !isError ? (
              <div className="flex flex-col gap-3 py-2" aria-busy>
                <p role="status" className="sr-only">
                  Chargement des demandes…
                </p>
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-14 rounded-control" />
                ))}
              </div>
            ) : isError && !data ? (
              <ErrorState description={describeFinanceFailure(error).message} onRetry={() => refetch()} retrying={isFetching} />
            ) : data && data.rows.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title={state ? "Aucune demande dans cet état" : "Aucune demande de retrait"}
                description={state ? "Choisissez un autre état pour voir vos autres demandes." : "Vos demandes de retrait et leur suivi apparaîtront ici."}
                action={
                  !state && canWithdraw ? (
                    <Button asChild variant="primary" icon={ArrowUpFromLine}>
                      <Link href={paths.withdraw}>Demander un retrait</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul aria-label="Demandes de retrait" className="flex flex-col divide-y divide-border">
                {data?.rows.map((withdrawal) => (
                  <li key={withdrawal.id}>
                    <button
                      type="button"
                      onClick={() => {
                        focus.remember();
                        setOpened(withdrawal);
                      }}
                      aria-label={`Retrait ${withdrawal.number ?? ""}, voir le détail`}
                      className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 py-3 text-left transition-colors duration-100 hover:bg-surface-hover"
                    >
                      <IconTile icon={ArrowUpFromLine} tone="brand" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body font-semibold text-foreground">{withdrawal.number ?? "Retrait"}</span>
                        <span className="truncate text-meta text-foreground-muted tabular-nums">
                          {formatDayTime(withdrawal.requestedAt)} · {payoutMethodLabel(withdrawal.method)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Money cents={withdrawal.amount} className="text-body font-semibold text-foreground" />
                        <StatusBadge domain="payout" code={withdrawal.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {data && data.total > data.pageSize && (
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} disabled={isFetching} onPageChange={(next) => update({ page: next > 1 ? String(next) : null })} variant="numbered" itemLabel="demandes" />
          )}
        </TabsContent>
      </Tabs>

      <WithdrawalSheet
        withdrawal={opened}
        onClose={() => {
          setOpened(null);
          focus.restore();
        }}
      />
    </FinancePage>
  );
}

/** Detail of one request: what was asked, what it costs, where it goes, and what its state means. */
export function WithdrawalSheet({ withdrawal, onClose }: { withdrawal: Withdrawal | null; onClose: () => void }) {
  const note = withdrawal ? withdrawalNote(withdrawal) : null;
  return (
    <Sheet open={withdrawal !== null} onOpenChange={(open) => !open && onClose()}>
      {withdrawal && (
        <SheetContent title="Détail du retrait">
          <div className="flex flex-col gap-4">
            {note && (
              <Alert tone={note.tone} title={note.text}>
                {withdrawal.note}
              </Alert>
            )}
            <DescriptionList items={withdrawalItems(withdrawal)} />
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
