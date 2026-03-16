"use client";

import { SellerMessagingPage } from "@/features/vendor/messaging";

/**
 * Messages page content — client component wrapper.
 * Forces full-height layout by removing parent padding.
 */
export function MessagesContent() {
  return (
    <div className="-m-4 -mb-24 h-[calc(100vh-64px)] overflow-hidden p-4 lg:-m-8 lg:-mb-8 lg:p-4">
      <SellerMessagingPage />
    </div>
  );
}
