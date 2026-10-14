"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { FileText, ImageIcon, Paperclip, SendHorizontal, X } from "lucide-react";
import { IconButton, cn } from "@/design-system";
import { MESSAGE_LIMITS, fileRefusal, type FileLimits } from "../contract";
import { formatFileSize } from "../format";

// ============================================================
// Where a message is written. Shared by conversations and tickets.
//
// The field is emptied the moment a message leaves it: a second
// Enter or a second click has nothing to send. What happens to the
// message afterwards (on its way, sent, refused) is shown in the
// thread, on the message itself.
// ============================================================

export interface ComposerProps {
  onSend: (body: string, files: File[]) => void;
  /** Called while the user types, for the "is writing" signal. */
  onTyping?: () => void;
  placeholder?: string;
  /** Accessible name of the field. */
  label?: string;
  maxLength?: number;
  limits?: FileLimits;
  /** Extensions offered by the picture button; without it, no picture button. */
  imageExtensions?: readonly string[];
  /** A text is required with a file (support replies). */
  bodyRequired?: boolean;
  /** Extra actions before the field (share a product). */
  extra?: ReactNode;
  /** A send is in progress and a second one must wait (support replies). */
  busy?: boolean;
  autoFocus?: boolean;
}

const acceptOf = (extensions: readonly string[]) => extensions.map((extension) => `.${extension}`).join(",");

/** On a phone the Enter key of the keyboard makes a new line; the button sends. */
const enterSends = () => typeof window === "undefined" || typeof window.matchMedia !== "function" || !window.matchMedia("(pointer: coarse)").matches;

export function Composer({
  onSend,
  onTyping,
  placeholder = "Écrire un message…",
  label = "Votre message",
  maxLength = MESSAGE_LIMITS.bodyLength,
  limits = MESSAGE_LIMITS,
  imageExtensions,
  bodyRequired = false,
  extra,
  busy = false,
  autoFocus = false,
}: ComposerProps) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [refusal, setRefusal] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const refusalId = useId();

  // The field grows with the text, up to about five lines.
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
  }, [body]);

  useEffect(() => {
    if (autoFocus) field.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const tooLong = body.length > maxLength;
  const empty = body.trim() === "" && (bodyRequired || files.length === 0);
  const canSend = !empty && !tooLong && !busy;

  // The field is emptied by the next render. A second click, or a second
  // Enter, that lands before it would still read the same text and send it
  // again: this lock is set at once, and lifted when the render has happened.
  const sent = useRef(false);
  useEffect(() => {
    sent.current = false;
  });

  const submit = () => {
    if (!canSend || sent.current) return;
    sent.current = true;
    onSend(body, files);
    setBody("");
    setFiles([]);
    setRefusal(null);
    field.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Not while an input method is composing a character (accents, CJK).
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (!enterSends()) return;
    event.preventDefault();
    submit();
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    // The same file can be chosen again after having been removed.
    event.target.value = "";

    const next = [...files];
    let firstRefusal: string | null = null;
    for (const file of chosen) {
      const why = fileRefusal(file, next.length, limits);
      if (why) firstRefusal ??= why;
      else next.push(file);
    }
    setFiles(next);
    setRefusal(firstRefusal);
  };

  const remove = (index: number) => {
    setFiles((current) => current.filter((_, position) => position !== index));
    setRefusal(null);
  };

  const nearLimit = body.length > maxLength * 0.9;

  return (
    <div className="border-t border-border bg-surface px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-4" data-composer>
      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Fichiers à envoyer">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex max-w-full items-center gap-2 rounded-control border border-border bg-surface-subtle py-1 pr-1 pl-2">
              <FileText className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block max-w-40 truncate text-meta font-medium text-foreground">{file.name}</span>
                <span className="block text-meta text-foreground-subtle">{formatFileSize(file.size)}</span>
              </span>
              <IconButton icon={X} label={`Retirer ${file.name}`} size="compact" onClick={() => remove(index)} />
            </li>
          ))}
        </ul>
      )}

      {refusal && (
        <p id={refusalId} role="alert" className="mb-2 text-meta text-danger-fg">
          {refusal}
        </p>
      )}

      <div className="flex items-end gap-1.5">
        <input ref={filePicker} type="file" multiple hidden accept={acceptOf(limits.extensions)} onChange={addFiles} tabIndex={-1} aria-hidden="true" />
        <IconButton icon={Paperclip} label="Joindre un fichier" onClick={() => filePicker.current?.click()} disabled={files.length >= limits.files} />
        {imageExtensions && (
          <>
            <input ref={imagePicker} type="file" multiple hidden accept={acceptOf(imageExtensions)} onChange={addFiles} tabIndex={-1} aria-hidden="true" />
            <IconButton icon={ImageIcon} label="Joindre une photo" onClick={() => imagePicker.current?.click()} disabled={files.length >= limits.files} />
          </>
        )}
        {extra}

        <div className="min-w-0 flex-1">
          <textarea
            ref={field}
            rows={1}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (event.target.value.trim() !== "") onTyping?.();
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={label}
            aria-invalid={tooLong || undefined}
            aria-describedby={refusal ? refusalId : undefined}
            className={cn(
              "block max-h-[132px] min-h-control w-full resize-none rounded-[1.25rem] border border-border bg-surface-subtle px-4 py-2 text-body text-foreground placeholder:text-foreground-subtle",
              "focus-visible:border-border-control focus-visible:bg-surface touch:min-h-touch touch:py-2.5 touch:text-base",
              tooLong && "border-danger-border",
            )}
          />
        </div>

        <IconButton icon={SendHorizontal} label="Envoyer" variant="primary" onClick={submit} disabled={!canSend} loading={busy} tooltip={false} data-send />
      </div>

      {nearLimit && (
        <p className={cn("mt-1 text-right text-meta tabular-nums", tooLong ? "text-danger-fg" : "text-foreground-subtle")} aria-live="polite">
          {body.length} / {maxLength}
        </p>
      )}
    </div>
  );
}
