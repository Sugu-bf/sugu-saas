"use client";

import type { ReactNode } from "react";
import { AuthGuard, RoleGuard } from "@/components/guards";
import { LegacyShell } from "@/components/shell/legacy-shell";
import type { UserRole } from "@/types";
import { AppShell } from "./app-shell";
import { ShellSkeleton } from "./shell-skeleton";

/**
 * Rollback switch for the Phase B shell: build with
 * `NEXT_PUBLIC_PRO_SHELL=legacy` to get the previous frame back.
 * Temporary — goes away with `components/shell` after validation.
 */
export function isLegacyShellEnabled(value: string | undefined = process.env.NEXT_PUBLIC_PRO_SHELL): boolean {
  return value === "legacy";
}

export interface WorkspaceShellProps {
  /** The only role allowed in this route group. */
  role: UserRole;
  children: ReactNode;
}

/**
 * Entry point of the three role layouts: session check, role check, frame.
 * The guards are the same whichever frame is rendered.
 */
export function WorkspaceShell({ role, children }: WorkspaceShellProps) {
  // The legacy frame has no Lanabaga navigation: that space always uses the current one.
  const legacy = isLegacyShellEnabled() && role !== "lanabaga";
  return (
    <AuthGuard fallback={legacy ? undefined : <ShellSkeleton />}>
      <RoleGuard allowedRoles={[role]}>
        {legacy ? <LegacyShell role={role}>{children}</LegacyShell> : <AppShell role={role}>{children}</AppShell>}
      </RoleGuard>
    </AuthGuard>
  );
}
