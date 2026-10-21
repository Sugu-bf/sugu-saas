import {
  ArrowLeftRight,
  BadgePercent,
  Boxes,
  ChartColumn,
  CircleHelp,
  ClipboardList,
  Contact,
  FileText,
  FileUser,
  FolderOpen,
  HandCoins,
  HeartHandshake,
  Headset,
  History,
  House,
  LayoutDashboard,
  MessagesSquare,
  Package,
  PackageMinus,
  PackagePlus,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { COURIER_FILE_PATH, LANABAGA_FILE_PATH, courierCanWork, lanabagaCanWork, spaceHomePath } from "@/lib/auth/session-user";
import type { User, UserRole } from "@/types";

// ============================================================
// Pro navigation — the ONE source of truth.
//
// The desktop sidebar, the tablet drawer, the phone tab bar, the phone
// menu, the topbar context and the user menu are all derived from this
// file. Never declare a link list anywhere else.
//
// Visibility here is navigation comfort only: the API authorises every
// request, and RoleGuard keeps each space to its own role.
// ============================================================

export interface NavItem {
  /** Stable identifier, unique across the whole configuration. */
  id: string;
  label: string;
  /** Shorter label for the phone tab bar, when `label` does not fit. */
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
  /**
   * Rank in the phone tab bar (1 = first). Items without a rank live in the
   * phone menu. At most `MOBILE_TAB_COUNT` items per role are ranked.
   */
  mobilePriority?: number;
  /** Also offered in the user menu of the topbar. */
  inUserMenu?: boolean;
  /** Leaves the workspace (public help pages): no active state. */
  external?: boolean;
  /** A count beside the label, asked to the server: unread conversations. */
  badge?: "messages";
  /**
   * Hide the entry for this user. Must only read facts the session really
   * carries — never infer a permission from the role name.
   */
  visible?: (user: User) => boolean;
}

export interface NavGroup {
  id: string;
  /** Section heading. Omitted for the leading group. */
  label?: string;
  /** The section can be folded in the sidebar. */
  collapsible?: boolean;
  items: NavItem[];
}

export interface WorkspaceNavigation {
  role: UserRole;
  /** Name of the space, shown under the business name. */
  spaceLabel: string;
  /** Used when the session carries no business name. */
  fallbackName: string;
  home: string;
  groups: NavGroup[];
  /**
   * What this space starts most often ("Nouvelle course"), kept at the foot
   * of the sidebar and of the tablet drawer. A real destination, like every
   * entry: the page it opens carries its own button too.
   */
  action?: { label: string; href: string; icon: LucideIcon };
  /** Full-screen routes on phones: the tab bar is hidden (chat composer). */
  immersiveRoutes: RegExp[];
}

/** Destinations in the phone tab bar; the last slot is always "Menu". */
export const MOBILE_TAB_COUNT = 4;

const vendor: WorkspaceNavigation = {
  role: "vendor",
  spaceLabel: "Vendeur",
  fallbackName: "Ma boutique",
  home: "/vendor/dashboard",
  immersiveRoutes: [/^\/vendor\/messages\/[^/]+$/],
  groups: [
    {
      id: "vendor-sales",
      items: [
        { id: "vendor-dashboard", label: "Tableau de bord", shortLabel: "Accueil", href: "/vendor/dashboard", icon: LayoutDashboard, mobilePriority: 1 },
        { id: "vendor-orders", label: "Commandes", href: "/vendor/orders", icon: ShoppingBag, mobilePriority: 2 },
        { id: "vendor-products", label: "Produits", shortLabel: "Catalogue", href: "/vendor/products", icon: Package, mobilePriority: 4 },
        { id: "vendor-clients", label: "Clients", href: "/vendor/clients", icon: Contact },
        { id: "vendor-inventory", label: "Inventaire", href: "/vendor/inventory", icon: ClipboardList },
      ],
    },
    {
      id: "vendor-business",
      label: "Activité",
      items: [
        { id: "vendor-statistics", label: "Statistiques", href: "/vendor/statistics", icon: ChartColumn },
        // The tabs of a phone are those of the money mock-ups (V5): Accueil,
        // Commandes, Finances, Catalogue. Messages are kept, in the menu.
        { id: "vendor-wallet", label: "Finances", href: "/vendor/wallet", icon: Wallet, mobilePriority: 3 },
        { id: "vendor-marketing", label: "Marketing", href: "/vendor/marketing", icon: BadgePercent },
        { id: "vendor-messages", label: "Messages", href: "/vendor/messages", icon: MessagesSquare, badge: "messages" },
        // SUGU Lanaya (maquette 4) : qui a présenté chaque boutique, invitations reçues.
        { id: "vendor-lanaya", label: "Lanaya", href: "/vendor/lanaya", icon: HeartHandshake },
      ],
    },
    {
      id: "vendor-sugubox",
      label: "Sugu Box",
      collapsible: true,
      items: [
        { id: "vendor-sugubox-overview", label: "Vue d'ensemble", href: "/vendor/sugubox", icon: Warehouse },
        { id: "vendor-sugubox-stock", label: "Mon stock", href: "/vendor/sugubox/stock", icon: Boxes },
        { id: "vendor-sugubox-inbound", label: "Réceptions", href: "/vendor/sugubox/inbound", icon: PackagePlus },
        { id: "vendor-sugubox-outbound", label: "Expéditions", href: "/vendor/sugubox/outbound", icon: PackageMinus },
        { id: "vendor-sugubox-movements", label: "Mouvements", href: "/vendor/sugubox/movements", icon: ArrowLeftRight },
      ],
    },
    {
      id: "vendor-account",
      label: "Compte et aide",
      items: [
        { id: "vendor-settings", label: "Paramètres", href: "/vendor/settings", icon: Settings, inUserMenu: true },
        { id: "vendor-support", label: "Support", href: "/vendor/tickets", icon: Headset, inUserMenu: true },
        { id: "vendor-help", label: "Aide et FAQ", href: "/faq", icon: CircleHelp, inUserMenu: true, external: true },
      ],
    },
  ],
};

const agency: WorkspaceNavigation = {
  role: "agency",
  spaceLabel: "Agence de livraison",
  fallbackName: "Mon agence",
  home: "/agency/dashboard",
  action: { label: "Nouvelle course", href: "/agency/deliveries/new", icon: Plus },
  immersiveRoutes: [/^\/agency\/messages\/[^/]+$/],
  groups: [
    {
      id: "agency-operations",
      items: [
        { id: "agency-dashboard", label: "Tableau de bord", shortLabel: "Accueil", href: "/agency/dashboard", icon: LayoutDashboard, mobilePriority: 1 },
        { id: "agency-deliveries", label: "Livraisons", href: "/agency/deliveries", icon: Package, mobilePriority: 2 },
        { id: "agency-drivers", label: "Livreurs", href: "/agency/drivers", icon: Users, mobilePriority: 4 },
      ],
    },
    {
      id: "agency-business",
      label: "Activité",
      items: [
        // Shown to every agency account: the session carries no capability
        // that tells an owner from a manager. The API decides (403).
        // Third tab of a phone, as its mock-up draws it (V5).
        { id: "agency-earnings", label: "Finances", href: "/agency/earnings", icon: HandCoins, mobilePriority: 3 },
        { id: "agency-statistics", label: "Statistiques", href: "/agency/statistics", icon: ChartColumn },
        { id: "agency-messages", label: "Messages", href: "/agency/messages", icon: MessagesSquare },
      ],
    },
    {
      id: "agency-account",
      label: "Compte",
      items: [
        { id: "agency-settings", label: "Paramètres", href: "/agency/settings", icon: Settings, inUserMenu: true },
      ],
    },
  ],
};

const courier: WorkspaceNavigation = {
  role: "courier",
  spaceLabel: "Coursier",
  fallbackName: "Mon espace",
  home: "/driver/dashboard",
  immersiveRoutes: [/^\/driver\/messages\/[^/]+$/],
  // The entries are those of the courier mock-ups. The four tabs of a phone
  // are those of the money mock-ups (V5), the later ones: Accueil, Missions,
  // Gains and Profil. Historique and Messages are kept, in the menu.
  groups: [
    {
      id: "courier-activity",
      items: [
        // Missions are for a courier who can work; the server refuses them
        // to the others, who land on their file instead.
        { id: "courier-dashboard", label: "Accueil", href: "/driver/dashboard", icon: House, mobilePriority: 1, visible: courierCanWork },
        { id: "courier-deliveries", label: "Missions", href: "/driver/deliveries", icon: ClipboardList, mobilePriority: 2, visible: courierCanWork },
        { id: "courier-file", label: "Mon dossier", shortLabel: "Dossier", href: COURIER_FILE_PATH, icon: FileText, mobilePriority: 1, visible: (user) => !courierCanWork(user) },
        { id: "courier-earnings", label: "Gains", href: "/driver/earnings", icon: HandCoins, mobilePriority: 3 },
        { id: "courier-history", label: "Historique", href: "/driver/history", icon: History },
        { id: "courier-profile", label: "Profil", href: "/driver/profile", icon: UserRound, mobilePriority: 4, inUserMenu: true },
      ],
    },
    {
      id: "courier-account",
      label: "Compte",
      items: [
        { id: "courier-documents", label: "Documents", href: COURIER_FILE_PATH, icon: FileText, visible: courierCanWork },
        { id: "courier-messages", label: "Messages", href: "/driver/messages", icon: MessagesSquare, badge: "messages" },
        { id: "courier-settings", label: "Paramètres", href: "/driver/settings", icon: Settings, inUserMenu: true },
        { id: "courier-help", label: "Aide et support", href: "/faq", icon: CircleHelp, inUserMenu: true, external: true },
      ],
    },
  ],
};

// The entries are those of the Lanabaga mock-ups (5 to 8). A candidate who
// is not admitted keeps their application, their documents and their
// compliance; the server refuses them everything else. No "Paramètres" entry:
// the account settings of a Lanabaga-only account do not exist yet (Lot 1).
const lanabaga: WorkspaceNavigation = {
  role: "lanabaga",
  spaceLabel: "Lanabaga",
  fallbackName: "Mon espace Lanabaga",
  home: "/lanabaga/dashboard",
  immersiveRoutes: [],
  groups: [
    {
      id: "lanabaga-network",
      items: [
        { id: "lanabaga-dashboard", label: "Tableau de bord", shortLabel: "Accueil", href: "/lanabaga/dashboard", icon: LayoutDashboard, mobilePriority: 1, visible: lanabagaCanWork },
        { id: "lanabaga-sellers", label: "Mes vendeurs", shortLabel: "Vendeurs", href: "/lanabaga/sellers", icon: Store, mobilePriority: 2, visible: lanabagaCanWork },
        { id: "lanabaga-prospects", label: "Prospects", href: "/lanabaga/prospects", icon: UserPlus, mobilePriority: 3, visible: lanabagaCanWork },
        { id: "lanabaga-invitations", label: "Invitations", href: "/lanabaga/invitations", icon: Send, visible: lanabagaCanWork },
      ],
    },
    {
      id: "lanabaga-file",
      label: "Mon dossier",
      items: [
        { id: "lanabaga-application", label: "Candidature", shortLabel: "Dossier", href: LANABAGA_FILE_PATH, icon: FileUser, mobilePriority: 4 },
        { id: "lanabaga-documents", label: "Documents", href: "/lanabaga/documents", icon: FolderOpen },
        { id: "lanabaga-compliance", label: "Conformité", href: "/lanabaga/compliance", icon: ShieldCheck },
      ],
    },
    {
      id: "lanabaga-help",
      label: "Aide",
      items: [{ id: "lanabaga-help", label: "Aide et FAQ", href: "/faq", icon: CircleHelp, inUserMenu: true, external: true }],
    },
  ],
};

export const WORKSPACES: Record<UserRole, WorkspaceNavigation> = { vendor, agency, courier, lanabaga };

/** Navigation of a role, or `null` for anything that is not a pro role. */
export function getWorkspace(role: unknown): WorkspaceNavigation | null {
  return typeof role === "string" && Object.hasOwn(WORKSPACES, role) ? WORKSPACES[role as UserRole] : null;
}

/** Groups as this user sees them; empty groups disappear. */
export function visibleGroups(workspace: WorkspaceNavigation, user?: User | null): NavGroup[] {
  return workspace.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.visible || (user ? item.visible(user) : false)),
    }))
    .filter((group) => group.items.length > 0);
}

export function flattenItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items);
}

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The single active entry for a pathname: the longest matching href, so
 * `/vendor/sugubox/stock` lights "Mon stock" and not "Vue d'ensemble" too.
 * Detail and edit pages light their list (`/vendor/orders/42` → Commandes).
 */
export function findActiveItem(groups: NavGroup[], pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of flattenItems(groups)) {
    if (item.external || !matches(pathname, item.href)) continue;
    if (!best || item.href.length > best.href.length) best = item;
  }
  return best;
}

/** Phone tab bar: the ranked items, in rank order. */
export function mobileTabs(groups: NavGroup[]): NavItem[] {
  return flattenItems(groups)
    .filter((item) => item.mobilePriority !== undefined)
    .sort((a, b) => (a.mobilePriority ?? 0) - (b.mobilePriority ?? 0))
    .slice(0, MOBILE_TAB_COUNT);
}

/** Phone menu: every entry that is not a tab, grouping preserved. */
export function mobileMenuGroups(groups: NavGroup[]): NavGroup[] {
  const tabIds = new Set(mobileTabs(groups).map((item) => item.id));
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => !tabIds.has(item.id)) }))
    .filter((group) => group.items.length > 0);
}

export function userMenuItems(groups: NavGroup[]): NavItem[] {
  return flattenItems(groups).filter((item) => item.inUserMenu);
}

export function isImmersiveRoute(workspace: WorkspaceNavigation, pathname: string): boolean {
  return workspace.immersiveRoutes.some((pattern) => pattern.test(pathname));
}

export interface ShellContext {
  /** Section heading of the active entry, when it has one. */
  group: string | null;
  /** Label of the active entry. */
  page: string | null;
  /** Link back to the list when the pathname is a sub-page of the entry. */
  parentHref: string | null;
}

/** What the topbar says about the current location. */
export function shellContextFor(groups: NavGroup[], pathname: string): ShellContext {
  const active = findActiveItem(groups, pathname);
  if (!active) return { group: null, page: null, parentHref: null };
  const group = groups.find((candidate) => candidate.items.some((item) => item.id === active.id));
  return {
    group: group?.label ?? null,
    page: active.label,
    parentHref: pathname === active.href ? null : active.href,
  };
}

export interface SpaceSwitch {
  space: UserRole;
  label: string;
  href: string;
}

const SPACE_SWITCH_LABEL: Record<UserRole, string> = {
  vendor: "Passer à l'espace vendeur",
  agency: "Passer à l'espace agence",
  courier: "Passer à l'espace coursier",
  lanabaga: "Passer à l'espace Lanabaga",
};

/**
 * The other spaces of the session (ADR-03), for the user menu and the phone
 * menu. Switching is a plain navigation: the space is the one of the URL.
 */
export function otherSpaces(user: User | null | undefined, current: UserRole): SpaceSwitch[] {
  if (!user) return [];
  return (user.spaces ?? [user.role])
    .filter((space) => space !== current)
    .map((space) => ({ space, label: SPACE_SWITCH_LABEL[space], href: spaceHomePath(user, space) }));
}

/** Business name shown by the shell; never a made-up person. */
export function workspaceName(workspace: WorkspaceNavigation, user?: Pick<User, "business_name" | "name"> | null): string {
  // In the Lanabaga space the account acts as a person, not as its shop.
  if (workspace.role === "lanabaga") return user?.name || workspace.fallbackName;
  if (user?.business_name) return user.business_name;
  if (workspace.role === "courier" && user?.name) return user.name;
  return workspace.fallbackName;
}
