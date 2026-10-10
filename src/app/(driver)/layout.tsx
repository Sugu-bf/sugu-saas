import { WorkspaceShell } from "@/components/app-shell";

/**
 * (driver) layout — session and role guards, then the shared pro shell.
 * Backend role = "courier", frontend URL prefix = /driver.
 */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell role="courier">{children}</WorkspaceShell>;
}
