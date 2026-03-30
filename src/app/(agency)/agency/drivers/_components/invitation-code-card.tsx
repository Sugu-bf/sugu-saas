"use client";

import { useState, useCallback } from "react";
import {
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  Link2,
  KeyRound,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAgencyInvitationCode,
  useRegenerateInvitationCode,
} from "@/features/agency/hooks";

/**
 * InvitationCodeCard — Displays the agency's driver invitation / referral code.
 *
 * Features:
 * - Show / hide the code (masked by default)
 * - Copy code or full link to clipboard
 * - Regenerate the code (with confirmation)
 */
export function InvitationCodeCard() {
  const { data, isLoading, isError } = useAgencyInvitationCode();
  const regenerateMutation = useRegenerateInvitationCode();

  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const handleCopy = useCallback(
    async (type: "code" | "link") => {
      if (!data) return;
      const text = type === "code" ? data.code : data.link;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        // Fallback for older browsers
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      }
    },
    [data],
  );

  const handleRegenerate = useCallback(() => {
    if (
      confirm(
        "Êtes-vous sûr de vouloir régénérer le code d'invitation ?\nL'ancien code ne sera plus valide.",
      )
    ) {
      regenerateMutation.mutate();
    }
  }, [regenerateMutation]);

  // ── Skeleton loader ──
  if (isLoading) {
    return (
      <div className="glass-card animate-card-enter rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gray-200/60 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-4 w-40 rounded bg-gray-200/60 dark:bg-gray-700/40 animate-pulse" />
        </div>
        <div className="h-10 rounded-xl bg-gray-200/60 dark:bg-gray-700/40 animate-pulse" />
      </div>
    );
  }

  // ── Error / no data ──
  if (isError || !data) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <KeyRound className="h-4 w-4" />
          <span>Impossible de charger le code d&apos;invitation.</span>
        </div>
      </div>
    );
  }

  const maskedCode = data.code.replace(/(?<=.{4}).+(?=.{2})/, (m) =>
    "•".repeat(m.length),
  );

  return (
    <div
      className="glass-card animate-card-enter rounded-2xl p-4"
      style={{ animationDelay: "240ms" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sugu-400 to-sugu-600 text-white">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-white">
              Code d&apos;invitation livreur
            </h3>
            <p className="text-[10px] text-gray-400">
              Partagez ce code pour recruter des livreurs
            </p>
          </div>
        </div>

        {/* Regenerate button */}
        <button
          id="btn-regenerate-code"
          onClick={handleRegenerate}
          disabled={regenerateMutation.isPending}
          title="Régénérer le code"
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white/70 px-2 py-1 text-[10px] font-semibold text-gray-500 transition-all hover:bg-gray-50 hover:text-sugu-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:text-sugu-400 disabled:opacity-50"
        >
          <RefreshCw
            className={cn(
              "h-3 w-3",
              regenerateMutation.isPending && "animate-spin",
            )}
          />
          Régénérer
        </button>
      </div>

      {/* ── Code display ── */}
      <div className="flex items-center gap-2 rounded-xl bg-gray-50/80 px-3 py-2.5 dark:bg-gray-900/60">
        {/* Eye toggle */}
        <button
          onClick={() => setIsVisible((v) => !v)}
          className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-gray-700/40 dark:hover:text-gray-300"
          title={isVisible ? "Masquer le code" : "Afficher le code"}
          aria-label={isVisible ? "Masquer le code" : "Afficher le code"}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>

        {/* Code text */}
        <span
          className={cn(
            "flex-1 font-mono text-sm font-bold tracking-wider select-all",
            isVisible
              ? "text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-gray-500",
          )}
        >
          {regenerateMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sugu-500" />
              <span className="text-xs text-gray-400">Régénération…</span>
            </span>
          ) : isVisible ? (
            data.code
          ) : (
            maskedCode
          )}
        </span>

        {/* Copy code */}
        <button
          onClick={() => handleCopy("code")}
          className={cn(
            "flex-shrink-0 rounded-lg p-1.5 transition-colors",
            copied === "code"
              ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
              : "text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-gray-700/40 dark:hover:text-gray-300",
          )}
          title="Copier le code"
          aria-label="Copier le code"
        >
          {copied === "code" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>

        {/* Copy link */}
        <button
          onClick={() => handleCopy("link")}
          className={cn(
            "flex-shrink-0 rounded-lg p-1.5 transition-colors",
            copied === "link"
              ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
              : "text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-gray-700/40 dark:hover:text-gray-300",
          )}
          title="Copier le lien d'inscription"
          aria-label="Copier le lien d'inscription"
        >
          {copied === "link" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Success feedback ── */}
      {copied && (
        <p className="mt-1.5 text-[10px] font-medium text-green-600 dark:text-green-400 animate-fade-in">
          {copied === "code"
            ? "✓ Code copié dans le presse-papier"
            : "✓ Lien d'inscription copié"}
        </p>
      )}
    </div>
  );
}
