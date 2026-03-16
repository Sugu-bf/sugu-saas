"use client";

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, Image as ImageIcon, Package, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_BODY_LENGTH = 5000;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

interface ComposerProps {
  onSend: (body: string, attachments?: File[]) => void;
  onTyping: () => void;
  onShareProduct: () => void;
  disabled?: boolean;
}

export function Composer({
  onSend,
  onTyping,
  onShareProduct,
  disabled,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (trimmed.length > MAX_BODY_LENGTH) {
      toast.error(`Message trop long (max ${MAX_BODY_LENGTH} caractères)`);
      return;
    }
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setText("");
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // S5 fix: validate MIME type
    const validFiles = files.filter((f) => {
      if (!ALLOWED_MIME_TYPES.includes(f.type)) {
        toast.error(`Type non autorisé : ${f.name}`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) { e.target.value = ""; return; }
    setAttachments((prev) => {
      const combined = [...prev, ...validFiles].slice(0, MAX_FILES);
      const totalSize = combined.reduce((s, f) => s + f.size, 0);
      if (totalSize > MAX_SIZE_BYTES) {
        toast.error("Taille totale maximale : 10 Mo");
        return prev;
      }
      if (combined.length > prev.length + validFiles.length) {
        toast.info(`Maximum ${MAX_FILES} fichiers`);
      }
      return combined;
    });
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="border-t border-gray-200/60 bg-white/80 p-3 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-950/80">
      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800"
            >
              <span className="max-w-[120px] truncate text-gray-600 dark:text-gray-400">
                {file.name}
              </span>
              <button
                onClick={() => removeAttachment(idx)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Ajouter une image"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onShareProduct}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Partager un produit"
          >
            <Package className="h-5 w-5" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message…"
          rows={1}
          disabled={disabled}
          className={cn(
            "form-input max-h-32 min-h-[40px] flex-1 resize-none text-sm",
            disabled && "opacity-50",
          )}
          maxLength={MAX_BODY_LENGTH}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && attachments.length === 0)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-400 to-sugu-600 text-white shadow-sm transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:shadow-none"
          title="Envoyer"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
