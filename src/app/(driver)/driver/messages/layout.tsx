import type { ReactNode } from "react";
import { CourierMessaging } from "@/features/driver/messaging/screen";

/** The list and the open conversation are one screen, kept in place across both addresses. */
export default function CourierMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CourierMessaging />
      {children}
    </>
  );
}
