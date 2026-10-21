"use client";

import Link from "next/link";
import { ArrowLeftRight, LogOut } from "lucide-react";
import { Button, Sheet, SheetContent } from "@/design-system";
import { NavList } from "./nav-list";
import type { NavGroup, SpaceSwitch, WorkspaceNavigation } from "./navigation";

export interface MobileMenuProps {
  /** `bottom`: phone menu (entries that are not tabs). `left`: tablet drawer (everything). */
  side: "bottom" | "left";
  open: boolean;
  onClose: () => void;
  /** The control that opened the panel; it gets the focus back on close. */
  getOpener: () => HTMLElement | null;
  groups: NavGroup[];
  activeId: string | null;
  name: string;
  spaceLabel: string;
  /** The main action of the space, under the navigation. */
  action?: WorkspaceNavigation["action"];
  /** The other spaces of the session (a seller who is also a Lanabaga). */
  switches?: SpaceSwitch[];
  onLogout: () => void;
  loggingOut: boolean;
}

/**
 * Navigation in a panel: Escape, an outside press and the close button
 * dismiss it; focus is trapped while open and then returns to the control
 * that opened it.
 */
export function MobileMenu({
  side,
  open,
  onClose,
  getOpener,
  groups,
  activeId,
  name,
  spaceLabel,
  action,
  switches = [],
  onLogout,
  loggingOut,
}: MobileMenuProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={side}
        title={name}
        description={spaceLabel}
        onCloseAutoFocus={(event) => {
          const opener = getOpener();
          if (opener?.isConnected) {
            event.preventDefault();
            opener.focus();
          }
        }}
      >
        <nav aria-label={side === "left" ? "Navigation principale" : "Autres rubriques"}>
          <NavList groups={groups} activeId={activeId} touch onNavigate={onClose} />
        </nav>
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          {action && (
            <Button asChild variant="primary" icon={action.icon} className="w-full">
              <Link href={action.href} onClick={onClose}>
                {action.label}
              </Link>
            </Button>
          )}
          {switches.map((item) => (
            <Button key={item.space} asChild variant="outline" icon={ArrowLeftRight} className="w-full">
              <Link href={item.href} onClick={onClose}>
                {item.label}
              </Link>
            </Button>
          ))}
          <Button icon={LogOut} onClick={onLogout} loading={loggingOut} className="w-full">
            Se déconnecter
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
