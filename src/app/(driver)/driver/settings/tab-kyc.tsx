"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { DriverSettings, KycDocStatus } from "@/features/driver/schema";
import { useUploadKycDocument } from "@/features/driver/hooks";
import { SectionCard, PillBadge, PillButton } from "@/components/shared/settings-ui";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  Eye,
  Info,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 3 — Documents KYC
// ────────────────────────────────────────────────────────────

interface TabKycProps {
  data: DriverSettings;
}

const STATUS_ICON_BG: Record<KycDocStatus, string> = {
  verified: "bg-green-50 dark:bg-green-950/30",
  pending: "bg-amber-50 dark:bg-amber-950/30",
  rejected: "bg-red-50 dark:bg-red-950/30",
  not_uploaded: "bg-gray-100 dark:bg-gray-800",
};

const STATUS_ICON_COLOR: Record<KycDocStatus, string> = {
  verified: "text-green-600",
  pending: "text-amber-600",
  rejected: "text-red-600",
  not_uploaded: "text-gray-400",
};

export function TabKyc({ data }: TabKycProps) {
  const kyc = data.kyc;
  const uploadMutation = useUploadKycDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocTypeRef = useRef<string | null>(null);

  const handleUploadClick = (docType: string) => {
    pendingDocTypeRef.current = docType;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docType = pendingDocTypeRef.current;
    if (!file || !docType) return;

    try {
      await uploadMutation.mutateAsync({ docType, file });
      toast.success("Document téléchargé avec succès");
    } catch {
      toast.error("Erreur lors du téléchargement du document");
    }

    // Reset input so the same file can be re-selected
    e.target.value = "";
    pendingDocTypeRef.current = null;
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for KYC uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Card 1: Vérification KYC — Status banner */}
      <SectionCard title="Vérification KYC" id="kyc-status" className="animate-card-enter">
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* SVG Ring Progress */}
          <div className="flex-shrink-0">
            <svg className="h-24 w-24" viewBox="0 0 36 36">
              <path
                className="text-gray-100 dark:text-gray-800"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-sugu-500"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${kyc.progressPercent}, 100`}
                strokeLinecap="round"
              />
              <text x="18" y="20.5" className="fill-gray-900 dark:fill-white" fontSize="8" fontWeight="700" textAnchor="middle">
                {kyc.progressPercent}%
              </text>
            </svg>
          </div>

          {/* Text info */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Vérification en cours</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {kyc.submittedCount} documents soumis sur {kyc.requiredCount} requis
            </p>
            {kyc.canDeliver && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Vous pouvez commencer à livrer pendant la vérification de vos documents
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-sugu-500 transition-all duration-500"
            style={{ width: `${kyc.progressPercent}%` }}
          />
        </div>
      </SectionCard>

      {/* Card 2: Documents requis */}
      <SectionCard
        title="Documents requis"
        id="kyc-documents"
        badge={<PillBadge variant="default">{kyc.requiredCount} documents</PillBadge>}
        className="animate-card-enter"
        style={{ animationDelay: "60ms" } as React.CSSProperties}
      >
        <div className="mt-4 space-y-2">
          {kyc.documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center gap-4 rounded-xl bg-white/40 p-4 dark:bg-white/5">
              {/* Status icon */}
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", STATUS_ICON_BG[doc.status])}>
                <FileText className={cn("h-5 w-5", STATUS_ICON_COLOR[doc.status])} />
              </div>

              {/* Doc info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{doc.label}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {doc.status === "verified" && (
                    <>{doc.fileName} • Téléchargé le {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("fr-FR") : ""}</>
                  )}
                  {doc.status === "pending" && (
                    <>{doc.fileName} • En cours de vérification</>
                  )}
                  {doc.status === "rejected" && (
                    <span className="text-red-400">{doc.fileName} • Rejeté : {doc.rejectionReason}</span>
                  )}
                  {doc.status === "not_uploaded" && (
                    <span className="text-red-400">Non téléchargé — Ce document est requis</span>
                  )}
                </p>
              </div>

              {/* Status badge / action */}
              {doc.status === "verified" && (
                <PillBadge variant="green"><CheckCircle className="inline h-3 w-3" /> Vérifié</PillBadge>
              )}
              {doc.status === "pending" && (
                <PillBadge variant="amber"><Clock className="inline h-3 w-3" /> En attente</PillBadge>
              )}
              {doc.status === "rejected" && (
                <PillBadge variant="red"><XCircle className="inline h-3 w-3" /> Rejeté</PillBadge>
              )}
              {doc.status === "not_uploaded" && (
                <PillButton variant="outline" size="sm" onClick={() => handleUploadClick(doc.type)} disabled={uploadMutation.isPending}>
                  <Upload className="h-3.5 w-3.5" /> Télécharger
                </PillButton>
              )}
              {doc.status === "rejected" && (
                <PillButton variant="outline" size="sm" onClick={() => handleUploadClick(doc.type)} disabled={uploadMutation.isPending}>
                  <Upload className="h-3.5 w-3.5" /> Re-télécharger
                </PillButton>
              )}

              {/* View button (for uploaded docs) */}
              {doc.status !== "not_uploaded" && (
                <button className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300" aria-label={`Voir ${doc.label}`}>
                  <Eye className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Card 3: Activité récente */}
      <SectionCard title="Activité récente" id="kyc-activity" className="animate-card-enter" style={{ animationDelay: "120ms" } as React.CSSProperties}>
        <div className="mt-4 space-y-0">
          {kyc.recentActivity.map((activity, idx) => (
            <div key={activity.id} className="flex items-start gap-3 py-2.5">
              {/* Dot + line */}
              <div className="relative flex flex-col items-center">
                <div className={cn("h-2.5 w-2.5 rounded-full", activity.dotColor)} />
                {idx < kyc.recentActivity.length - 1 && (
                  <div className="mt-0.5 h-full w-px bg-gray-200 dark:bg-gray-700" style={{ minHeight: 20 }} />
                )}
              </div>
              {/* Label + time */}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">{activity.label}</p>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
