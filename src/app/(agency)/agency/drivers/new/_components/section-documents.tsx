"use client";

import { useRef, useCallback } from "react";
import { FileCheck, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import type { CreateCourierFormData, UploadedDocument } from "@/features/agency/schema";

interface SectionDocumentsProps {
  data: CreateCourierFormData;
  onChange: <K extends keyof CreateCourierFormData>(field: K, value: CreateCourierFormData[K]) => void;
}

const DOCUMENT_TYPES = [
  { id: "cni", label: "Pièce d'identité (CNI)", required: true },
  { id: "permis", label: "Permis de conduire", required: true },
  { id: "carte_grise", label: "Carte grise", required: false },
  { id: "photo", label: "Photo du livreur", required: false },
] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentUploadZone({
  docType,
  existingDoc,
  onFileSelect,
  onRemove,
}: {
  docType: (typeof DOCUMENT_TYPES)[number];
  existingDoc?: UploadedDocument;
  onFileSelect: (file: File, type: string) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file, docType.id);
    },
    [onFileSelect, docType.id],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file, docType.id);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelect, docType.id],
  );

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-600">
        {docType.label}
        {docType.required && <span className="text-red-500">*</span>}
      </label>

      {existingDoc ? (
        /* Uploaded state */
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <FileText className="h-5 w-5 shrink-0 text-green-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-green-800">{existingDoc.name}</p>
            <p className="text-[10px] text-green-600">{existingDoc.size}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(existingDoc.id)}
            className="shrink-0 rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Empty upload zone */
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white/30 p-6 transition-all hover:border-gray-400 hover:bg-white/40"
          >
            <Upload className="h-6 w-6 text-gray-400" />
            <p className="text-xs text-gray-500">Glisser ou cliquer pour télécharger</p>
            <p className="text-[10px] text-gray-400">PDF, JPG, PNG &bull; Max 5MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleChange}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}

export function SectionDocuments({ data, onChange }: SectionDocumentsProps) {
  const handleFileSelect = useCallback(
    (file: File, type: string) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Le fichier ne doit pas dépasser 5MB");
        return;
      }

      // Remove any existing doc of the same type before adding new one
      const filtered = data.documents.filter((d) => d.type !== type);

      const doc: UploadedDocument = {
        id: `doc-${Date.now()}`,
        file,
        name: file.name,
        size: formatFileSize(file.size),
        type: type as UploadedDocument["type"],
        status: "uploaded",
      };

      onChange("documents", [...filtered, doc]);
    },
    [data.documents, onChange],
  );

  const removeDocument = useCallback(
    (id: string) => {
      onChange(
        "documents",
        data.documents.filter((d) => d.id !== id),
      );
    },
    [data.documents, onChange],
  );

  return (
    <div
      className="glass-card animate-card-enter rounded-2xl p-4 lg:rounded-3xl lg:p-6"
      style={{ animationDelay: "120ms" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-50 to-sugu-100">
          <FileCheck className="h-4 w-4 text-sugu-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Documents</h2>
          <p className="text-xs text-gray-400">Pièces justificatives requises</p>
        </div>
      </div>

      {/* Upload zones grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DOCUMENT_TYPES.map((docType) => {
          const existingDoc = data.documents.find((d) => d.type === docType.id);
          return (
            <DocumentUploadZone
              key={docType.id}
              docType={docType}
              existingDoc={existingDoc}
              onFileSelect={handleFileSelect}
              onRemove={removeDocument}
            />
          );
        })}
      </div>
    </div>
  );
}
