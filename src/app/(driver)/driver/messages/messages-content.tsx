"use client";

import { CourierMessagingPage } from "@/features/driver/messaging";

export function MessagesContent() {
  return (
    <div className="-m-4 -mb-24 h-[calc(100vh-64px)] overflow-hidden p-4 lg:-m-8 lg:-mb-8 lg:p-4">
      <CourierMessagingPage />
    </div>
  );
}
