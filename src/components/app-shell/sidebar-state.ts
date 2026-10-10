"use client";

import { useCallback, useSyncExternalStore } from "react";

// Desktop sidebar: expanded or reduced to an icon rail. The choice is a
// per-browser comfort setting, kept in localStorage (nothing sensitive).

const STORAGE_KEY = "sugu.shell.sidebar";
const listeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const setCollapsed = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
    } catch {
      // Private mode: the choice simply does not survive a reload.
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [collapsed, setCollapsed];
}
