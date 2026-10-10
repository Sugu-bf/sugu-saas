import { WorkspaceShell } from "@/components/app-shell";

/** (agency) layout — session and role guards, then the shared pro shell. */
export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell role="agency">{children}</WorkspaceShell>;
}
