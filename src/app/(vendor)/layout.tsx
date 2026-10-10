import { WorkspaceShell } from "@/components/app-shell";

/** (vendor) layout — session and role guards, then the shared pro shell. */
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell role="vendor">{children}</WorkspaceShell>;
}
