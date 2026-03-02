"use client";

import { Sidebar, SidebarProvider, Topbar, BottomTabBar } from "@/components/shell";
import { AuthGuard } from "@/components/guards";
import { RoleGuard } from "@/components/guards";

/**
 * (vendor) layout — premium glassmorphic shell with vendor sidebar (desktop)
 * and bottom tab bar (mobile).
 */
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["vendor"]}>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar role="vendor" />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Topbar role="vendor" />
              <main className="dashboard-bg flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">
                <div className="animate-fade-in">{children}</div>
              </main>
            </div>
            <BottomTabBar role="vendor" />
          </div>
        </SidebarProvider>
      </RoleGuard>
    </AuthGuard>
  );
}
