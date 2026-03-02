"use client";

import { useSession, useLogout } from "@/features/auth";
import { LogOut, Settings, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * User dropdown menu in the topbar.
 */
export function UserMenu() {
  const { data: user } = useSession();
  const logoutMutation = useLogout();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menu utilisateur"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sugu-400 to-sugu-600 text-xs font-bold text-white">
          {initials}
        </div>
        <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-200 md:block">
          {user?.name ?? "Utilisateur"}
        </span>
      </button>

      {/* Dropdown */}
      <div
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg transition-all dark:border-gray-700 dark:bg-gray-900",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
        role="menu"
      >
        <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
        </div>
        <div className="py-1">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            role="menuitem"
          >
            <User className="h-4 w-4" />
            Mon profil
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </button>
        </div>
        <div className="border-t border-gray-100 pt-1 dark:border-gray-800">
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
