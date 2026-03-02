"use client";

import { Sidebar, SidebarProvider, Topbar, BottomTabBar } from "@/components/shell";
import { AuthGuard, RoleGuard } from "@/components/guards";

/**
 * (agency) layout — premium glassmorphic shell with agency sidebar (desktop)
 * and bottom tab bar (mobile).
 */
export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["agency"]}>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar role="agency" />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Topbar role="agency" />
              <main className="dashboard-bg flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">
                <div className="animate-fade-in">{children}</div>
              </main>
            </div>
            <BottomTabBar role="agency" />
          </div>
        </SidebarProvider>
      </RoleGuard>
    </AuthGuard>
  );
}
