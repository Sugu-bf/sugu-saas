"use client";

import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/design-system";
import { ClientList } from "./list";
import { ClientSheet } from "./sheet";

/**
 * `/vendor/clients`: the list, or the sheet of the customer the address names
 * (`?client=`). One route, as before: the sheet used to be a side panel.
 */
export function ClientsScreen() {
  const id = useSearchParams().get("client");
  return id ? <ClientSheet key={id} id={id} /> : <ClientList />;
}

/** What the page shows before its screen has read the address. */
export function ClientsLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-16 w-full rounded-panel" />
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-72 w-full rounded-panel" />
    </div>
  );
}
