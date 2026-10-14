"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, type LucideIcon } from "lucide-react";
import { ConfirmDialog, cn } from "@/design-system";

// ============================================================
// The settings of a profile, after the V9 mock-up: a page title,
// the sections on the left and the open one on the right from
// 1024px; below, the list of sections, then one section at a
// time with a way back. One route per profile; the open section
// is in the address (`?section=…`), so that the browser's back
// button and a shared link land on it.
//
// A section with changes not saved yet says so to the frame
// (`useUnsavedChanges`): leaving it asks first, and so does
// closing the tab.
// ============================================================

export interface SettingsSection<K extends string = string> {
  key: K;
  label: string;
  icon: LucideIcon;
  /** A section that cannot be taken back (closing the account). */
  danger?: boolean;
}

interface DirtyRegistry {
  set: (id: string, dirty: boolean) => void;
}

const DirtyContext = createContext<DirtyRegistry | null>(null);

/**
 * Tell the frame that the form of a section has changes not saved yet.
 * Leaving the section (or the page) then asks for confirmation.
 */
export function useUnsavedChanges(dirty: boolean, id = "form") {
  const registry = useContext(DirtyContext);
  useEffect(() => {
    registry?.set(id, dirty);
    return () => registry?.set(id, false);
  }, [registry, id, dirty]);
}

const SECTION_PARAM = "section";

export interface SettingsFrameProps<K extends string> {
  /** "Gérez les paramètres de votre boutique". */
  description: string;
  sections: SettingsSection<K>[];
  /** The content of a section. */
  render: (key: K) => ReactNode;
}

export function SettingsFrame<K extends string>({ description, sections, render }: SettingsFrameProps<K>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get(SECTION_PARAM);
  const current = sections.find((section) => section.key === asked);
  // Wide screens always show a section; a phone shows the list until one is chosen.
  const active = current ?? sections[0];

  const dirty = useRef(new Map<string, boolean>());
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isDirty = () => [...dirty.current.values()].some(Boolean);
  const registry = useMemo<DirtyRegistry>(() => ({ set: (id, value) => void dirty.current.set(id, value) }), []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (![...dirty.current.values()].some(Boolean)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const go = (href: string) => {
    if (isDirty()) {
      setPendingHref(href);
      return;
    }
    router.push(href, { scroll: false });
  };

  const hrefOf = (key: K | null) => (key ? `${pathname}?${SECTION_PARAM}=${key}` : pathname);

  return (
    <DirtyContext.Provider value={registry}>
      <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4 lg:gap-5">
        {/* Phone, inside a section: the way back and the name of the section. */}
        {current && (
          <div className="flex items-center gap-2 lg:hidden">
            <a
              href={hrefOf(null)}
              onClick={(event) => {
                event.preventDefault();
                go(hrefOf(null));
              }}
              className="-ml-2 flex size-touch shrink-0 items-center justify-center rounded-pill text-foreground hover:bg-surface-hover"
              aria-label="Retour aux paramètres"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </a>
            <h1 className="min-w-0 flex-1 truncate pr-touch text-center text-section-title text-foreground">{current.label}</h1>
          </div>
        )}

        <header className={cn("min-w-0", current && "hidden lg:block")}>
          <h1 className="text-page-title text-foreground">Paramètres</h1>
          <p className="mt-0.5 hidden text-body text-foreground-muted md:block">{description}</p>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label="Sections des paramètres" className={cn("min-w-0", current && "hidden lg:block")}>
            <ul className="flex flex-col gap-0.5 rounded-panel border border-border bg-surface p-1.5 lg:sticky lg:top-4">
              {sections.map((section) => {
                const selected = section.key === active.key;
                const Icon = section.icon;
                return (
                  <li key={section.key}>
                    <Link
                      href={hrefOf(section.key)}
                      onClick={(event) => {
                        event.preventDefault();
                        if (section.key !== current?.key) go(hrefOf(section.key));
                      }}
                      aria-current={selected ? "page" : undefined}
                      className={cn(
                        "group flex min-h-touch items-center gap-3 rounded-control px-3 text-body transition-colors duration-100 lg:min-h-10",
                        section.danger ? "text-danger-fg hover:bg-danger-bg" : "text-foreground hover:bg-surface-subtle",
                        // The open section, on a wide screen only: a phone's list leads somewhere.
                        selected && !section.danger && "lg:bg-brand-subtle lg:font-medium lg:text-primary",
                        selected && section.danger && "lg:bg-danger-bg lg:font-medium",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          section.danger ? "text-danger-icon" : "text-foreground-subtle",
                          selected && !section.danger && "lg:text-primary",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                      <ChevronRight className="size-4 shrink-0 text-foreground-subtle lg:hidden" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className={cn("min-w-0", !current && "hidden lg:block")}>{render(active.key)}</div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) setPendingHref(null);
        }}
        title="Quitter sans enregistrer ?"
        description="Vos modifications de cette section ne sont pas enregistrées. Si vous la quittez maintenant, elles seront perdues."
        cancelLabel="Rester"
        confirmLabel="Quitter sans enregistrer"
        confirmIcon={LogOut}
        tone="danger"
        onConfirm={() => {
          const href = pendingHref;
          dirty.current.clear();
          setPendingHref(null);
          if (href) router.push(href, { scroll: false });
        }}
      />
    </DirtyContext.Provider>
  );
}
