import { CircleHelp, type LucideIcon } from "lucide-react";
import type { Tone } from "../primitives/badge";

export interface StatusDefinition {
  /** French label shown to the user. */
  label: string;
  tone: Tone;
  icon: LucideIcon;
  /** Optional sentence explaining the state (tooltips, detail pages). */
  description?: string;
}

export interface ResolvedStatus extends StatusDefinition {
  /** Canonical code, after alias resolution. For unknown input: the raw input. */
  code: string;
  /** False when the backend sent a code this registry does not know. */
  known: boolean;
}

export interface StatusRegistry<Code extends string = string> {
  readonly domain: string;
  /** Canonical codes, in lifecycle order. */
  readonly codes: readonly Code[];
  resolve(code: string | number | null | undefined): ResolvedStatus;
  has(code: string | number | null | undefined): boolean;
  /** `{ value, label }` pairs for filters, in lifecycle order. */
  options(): Array<{ value: Code; label: string }>;
}

export const UNKNOWN_STATUS_LABEL = "Statut inconnu";

interface RegistryConfig<Code extends string> {
  domain: string;
  /** Canonical codes: the backend enum values. */
  statuses: Record<Code, StatusDefinition>;
  /**
   * Other spellings the API emits for the same state (controller
   * projections, integer-backed enums). Never used to invent a state.
   */
  aliases?: Record<string, NoInfer<Code>>;
}

/**
 * One registry per business domain. An unknown code is reported as
 * unknown — it is never folded into "En attente" or any other real state.
 */
export function defineStatusRegistry<Code extends string>(config: RegistryConfig<Code>): StatusRegistry<Code> {
  const { domain, statuses, aliases = {} } = config;
  const codes = Object.keys(statuses) as Code[];

  function canonical(input: string | number | null | undefined): Code | null {
    if (input === null || input === undefined) return null;
    const key = String(input).trim().toLowerCase();
    if (key === "") return null;
    if (Object.prototype.hasOwnProperty.call(statuses, key)) return key as Code;
    if (Object.prototype.hasOwnProperty.call(aliases, key)) return aliases[key];
    return null;
  }

  return {
    domain,
    codes,
    has: (input) => canonical(input) !== null,
    resolve(input) {
      const code = canonical(input);
      if (code !== null) return { ...statuses[code], code, known: true };
      const raw = input === null || input === undefined ? "" : String(input);
      return {
        code: raw,
        known: false,
        label: UNKNOWN_STATUS_LABEL,
        tone: "neutral",
        icon: CircleHelp,
        description: raw === "" ? "Aucun statut transmis." : `Code non reconnu : ${raw}`,
      };
    },
    options: () => codes.map((code) => ({ value: code, label: statuses[code].label })),
  };
}
