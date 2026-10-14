"use client";

import { useCallback, useState } from "react";
import { describeFailureWith, type Failure } from "@/lib/http/failure";
import { useUnsavedChanges } from "./frame";

// ============================================================
// The values a settings form edits, against what the server holds.
//
// - The form starts from the server's values.
// - When the server's values change (after a save, a refetch), the form
//   follows them only if nothing was typed: a later answer never wipes
//   what the user is writing.
// - A failed save keeps what was typed, with the server's reasons per field.
// ============================================================

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface Draft<T extends object> {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Several values at once. */
  patch: (values: Partial<T>) => void;
  reset: () => void;
  dirty: boolean;
  /** Keys whose value differs from the server's. */
  changed: (keyof T)[];
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  /** Take what the server now holds as the new reference (after a save). */
  accept: (server: T) => void;
  /**
   * Some of the values were saved, others not: they become the reference,
   * the others stay changed (and the form stays dirty for them).
   */
  commit: (keys: (keyof T)[]) => void;
}

export function useDraft<T extends object>(server: T, id = "form"): Draft<T> {
  // `seen`: the last answer of the server. `base`: what the form compares
  // against — the server's answer, or what a save just had accepted before
  // the server is read again.
  const [seen, setSeen] = useState<T>(server);
  const [base, setBase] = useState<T>(server);
  const [values, setValues] = useState<T>(server);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = !same(values, base);

  // A new answer of the server: follow it, unless something was typed.
  if (!same(server, seen)) {
    setSeen(server);
    setBase(server);
    if (!dirty) setValues(server);
  }

  useUnsavedChanges(dirty, id);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key as string in current)) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }, []);

  const patch = useCallback((next: Partial<T>) => setValues((current) => ({ ...current, ...next })), []);

  const reset = useCallback(() => {
    setValues(base);
    setErrors({});
  }, [base]);

  const accept = useCallback((saved: T) => {
    setBase(saved);
    setValues(saved);
    setErrors({});
  }, []);

  const commit = useCallback(
    (keys: (keyof T)[]) => {
      setBase((current) => {
        const next = { ...current };
        for (const key of keys) next[key] = values[key];
        return next;
      });
    },
    [values],
  );

  const changed = (Object.keys(values) as (keyof T)[]).filter((key) => !same(values[key], base[key]));

  return { values, set, patch, reset, dirty, changed, errors, setErrors, accept, commit };
}

/** What to tell the user when a setting is not saved: neutral sentences for the settings. */
export function describeSettingsFailure(error: unknown, wording: Parameters<typeof describeFailureWith>[1] = {}): Failure {
  return describeFailureWith(error, {
    validation: "Certaines informations sont à corriger.",
    forbidden: "Votre compte ne peut pas modifier ce réglage.",
    not_found: "Ce réglage n'existe plus. La page a été actualisée.",
    conflict: "Ce réglage a changé entre-temps. Actualisez la page avant de réessayer.",
    server: "L'enregistrement n'a pas abouti. Vos modifications sont conservées : réessayez dans un instant.",
    network: "La connexion a été interrompue. Vos modifications sont conservées : réessayez.",
    ...wording,
  });
}

/** Load failure of a settings page. */
export function describeSettingsLoadFailure(error: unknown): string {
  const failure = describeFailureWith(error);
  if (failure.kind === "network") return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
  if (failure.kind === "throttled") return failure.message;
  if (failure.kind === "forbidden") return "Votre compte n'a pas accès à ces paramètres.";
  return "Vos paramètres n'ont pas pu être chargés. Réessayez dans un instant.";
}
