import type { ReactNode } from "react";
import { VendorMessaging } from "@/features/vendor/messaging/screen";

/**
 * The list and the open conversation are one screen: kept here, it stays in
 * place (its rows, its search, its scroll) while the address goes from the
 * list to a conversation and back.
 */
export default function VendorMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <VendorMessaging />
      {children}
    </>
  );
}
