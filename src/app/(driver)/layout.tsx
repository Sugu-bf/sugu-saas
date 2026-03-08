"use client";

import { Sidebar, SidebarProvider, Topbar, BottomTabBar } from "@/components/shell";
import { AuthGuard, RoleGuard } from "@/components/guards";

/**
 * (driver) layout — premium glassmorphic shell with courier/driver sidebar (desktop)
 * and bottom tab bar (mobile).
 *
 * Backend role = "courier", frontend URL prefix = /driver.
 */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["courier"]}>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar role="courier" />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Topbar role="courier" />
              <main className="dashboard-bg flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">
                <div className="animate-fade-in">{children}</div>
              </main>
            </div>
            <BottomTabBar role="courier" />
          </div>
        </SidebarProvider>
      </RoleGuard>
    </AuthGuard>
  );
}
