export { AppShell, MAIN_CONTENT_ID } from "./app-shell";
export { WorkspaceShell, isLegacyShellEnabled } from "./workspace-shell";
export { ShellSkeleton } from "./shell-skeleton";
export { BrandMark } from "./brand";
export {
  WORKSPACES,
  MOBILE_TAB_COUNT,
  findActiveItem,
  flattenItems,
  getWorkspace,
  isImmersiveRoute,
  mobileMenuGroups,
  mobileTabs,
  shellContextFor,
  userMenuItems,
  visibleGroups,
  workspaceName,
} from "./navigation";
export type { NavGroup, NavItem, ShellContext, WorkspaceNavigation } from "./navigation";
