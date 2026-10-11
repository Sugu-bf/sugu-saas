"use client";

import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "../cn";
import { Input } from "./input";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onToggle" | "role" | "type"> {
  options: ComboboxOption[];
  /** Values already chosen. The list ticks them; choosing one again takes it back. */
  selected: readonly string[];
  onToggle: (value: string) => void;
  /** Accessible name of the list of options, e.g. "Catégories". */
  listLabel: string;
  /** Most options listed at once. The others are reached by typing. */
  limit?: number;
}

/** "Épicerie" and "epicerie" are the same search. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Options matching a search, the closest first: a label that starts with the
 * search, then a label with a word that does, then any label that contains
 * it. The order given by the caller is kept inside each group.
 */
export function searchOptions(options: ComboboxOption[], query: string): ComboboxOption[] {
  const search = fold(query);
  if (!search) return options;
  const startsWord = new RegExp(`[^a-z0-9]${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const ranked: [ComboboxOption[], ComboboxOption[], ComboboxOption[]] = [[], [], []];
  for (const option of options) {
    const label = fold(option.label);
    if (!label.includes(search)) continue;
    ranked[label.startsWith(search) ? 0 : startsWord.test(label) ? 1 : 2].push(option);
  }
  return ranked.flat();
}

/**
 * Search field over a list too long for a native select: typing narrows the
 * list, and an option is chosen, or taken back, from it. Several can be: the
 * list closes on each choice, so it never hides the rest of a form, and the
 * next search opens it again with what is chosen ticked.
 *
 * The field shows the search, not the choice: the page shows what is chosen
 * (chips, a summary) and owns it.
 *
 * Inside a `FormField`, it takes its id, description and error from it.
 */
export function Combobox({ options, selected, onToggle, listLabel, limit = 50, placeholder, disabled, className, onKeyDown, onFocus, ...props }: ComboboxProps) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => searchOptions(options, query), [options, query]);
  const shown = matches.slice(0, limit);
  const hidden = matches.length - shown.length;
  const current = Math.min(active, Math.max(0, shown.length - 1));
  const optionId = (index: number) => `${listId}-${index}`;

  // The option the keyboard is on stays in sight inside the list.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [open, current]);

  function show() {
    if (disabled || open) return;
    setOpen(true);
    // On a phone the keyboard takes the lower half of the screen: the field
    // goes to the top, so the list has the room that is left.
    if (window.matchMedia?.("(max-width: 47.9375rem)").matches) {
      requestAnimationFrame(() => root.current?.scrollIntoView?.({ block: "start", behavior: "smooth" }));
    }
  }

  function choose(option: ComboboxOption, by: "keyboard" | "pointer") {
    onToggle(option.value);
    setQuery("");
    setOpen(false);
    // A tap also puts the phone keyboard away; the keyboard user stays in the field.
    if (by === "pointer") input.current?.blur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const last = Math.max(0, shown.length - 1);
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (open) setActive(Math.min(Math.max(0, current + (event.key === "ArrowDown" ? 1 : -1)), last));
        else show();
        break;
      case "Home":
      case "End":
        // With a search typed, these keys move inside the text.
        if (!open || query !== "") return;
        event.preventDefault();
        setActive(event.key === "Home" ? 0 : last);
        break;
      case "Enter":
        // Never the implicit submission of the form this field sits in.
        event.preventDefault();
        if (open && shown[current]) choose(shown[current], "keyboard");
        else show();
        break;
      case "Escape":
        if (!open && query === "") return;
        event.preventDefault();
        if (open) setOpen(false);
        else setQuery("");
        break;
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  }

  return (
    <div ref={root} className={cn("relative scroll-mt-12", className)} onBlur={handleBlur}>
      <Input
        {...props}
        ref={input}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[current] ? optionId(current) : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        leadingIcon={Search}
        placeholder={placeholder}
        disabled={disabled}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          show();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          show();
        }}
        onClick={show}
        onKeyDown={handleKeyDown}
      />

      {open && (
        // The field keeps the focus while the list is used: a press on it must not close it first.
        <div
          className="absolute inset-x-0 top-full z-dropdown mt-1 overflow-hidden rounded-control border border-border bg-surface-elevated shadow-overlay"
          onMouseDown={(event) => event.preventDefault()}
        >
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={listLabel}
            aria-multiselectable="true"
            className={cn("max-h-60 overflow-y-auto p-1", shown.length === 0 && "hidden")}
          >
            {shown.map((option, index) => {
              const chosen = selected.includes(option.value);
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={chosen}
                  data-active={index === current}
                  onMouseMove={() => index !== current && setActive(index)}
                  onClick={() => choose(option, "pointer")}
                  className={cn(
                    "flex min-h-control cursor-default items-center gap-2 rounded-compact px-2 py-1.5 text-body text-foreground touch:min-h-touch",
                    "data-[active=true]:bg-surface-hover",
                    chosen && "font-medium",
                  )}
                >
                  <Check className={cn("size-4 shrink-0 text-primary", !chosen && "invisible")} aria-hidden="true" />
                  <span className="min-w-0 break-words">{option.label}</span>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 && (
            <p className="px-3 py-3 text-body text-foreground-muted">{query.trim() ? `Aucun résultat pour « ${query.trim()} ».` : "Aucun choix disponible."}</p>
          )}
          {hidden > 0 && (
            <p className="border-t border-border px-3 py-1.5 text-meta text-foreground-muted">
              {hidden} autre{hidden > 1 ? "s" : ""} : précisez la recherche.
            </p>
          )}
        </div>
      )}

      <p role="status" className="sr-only">
        {open ? (matches.length === 0 ? "Aucun résultat" : `${matches.length} résultat${matches.length > 1 ? "s" : ""}`) : ""}
      </p>
    </div>
  );
}
