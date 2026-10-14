import type { ReactNode } from "react";
import { AgencyMessaging } from "@/features/agency/messaging/screen";

/** The list and the open conversation are one screen, kept in place across both addresses. */
export default function AgencyMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AgencyMessaging />
      {children}
    </>
  );
}
