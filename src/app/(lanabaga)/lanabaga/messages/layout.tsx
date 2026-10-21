import type { ReactNode } from "react";
import { LanabagaMessaging } from "@/features/lanaya/messaging/screen";

/** The list and the open conversation are one screen, kept in place between the two addresses. */
export default function LanabagaMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LanabagaMessaging />
      {children}
    </>
  );
}
