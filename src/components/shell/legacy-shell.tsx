"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@/types";
import { BottomTabBar } from "./bottom-tab-bar";
import { Sidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";
import { Topbar } from "./topbar";

/**
 * The pre-Phase-B frame, kept only as a rollback path
 * (`NEXT_PUBLIC_PRO_SHELL=legacy`). To be deleted with the rest of this
 * folder once the new shell is validated.
 */
export function LegacyShell({ role, children }: { role: UserRole; children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar role={role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar role={role} />
          <main className="dashboard-bg flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
        <BottomTabBar role={role} />
      </div>
    </SidebarProvider>
  );
}
