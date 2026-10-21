import { WorkspaceShell } from "@/components/app-shell";

/**
 * (lanabaga) layout — session and space guards, then the shared pro shell.
 * A seller who is also a Lanabaga opens this space with the same account
 * (SUGU Lanaya, ADR-03); a candidate sees their application only.
 */
export default function LanabagaLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell role="lanabaga">{children}</WorkspaceShell>;
}
