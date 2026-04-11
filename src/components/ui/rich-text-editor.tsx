"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  ImagePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Code,
  Minus,
  Undo2,
  Redo2,
  Highlighter,
  Palette,
  X,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────

interface RichTextEditorProps {
  /** HTML content */
  value: string;
  /** Callback with HTML string */
  onChange: (html: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Unique id for a11y */
  id?: string;
  /** Min height of the editor area in px */
  minHeight?: number;
}

// ── Color Palette ──────────────────────────────────────────

const TEXT_COLORS = [
  { label: "Défaut", value: "" },
  { label: "Rouge", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Ambre", value: "#f59e0b" },
  { label: "Vert", value: "#22c55e" },
  { label: "Bleu", value: "#3b82f6" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Rose", value: "#ec4899" },
  { label: "Gris", value: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "Jaune", value: "#fef08a" },
  { label: "Vert", value: "#bbf7d0" },
  { label: "Bleu", value: "#bfdbfe" },
  { label: "Rose", value: "#fecdd3" },
  { label: "Violet", value: "#e9d5ff" },
];

// ── Toolbar Button ─────────────────────────────────────────

function ToolbarBtn({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-lg p-1.5 transition-all duration-150 ${
        isActive
          ? "bg-sugu-100 text-sugu-600 dark:bg-sugu-950/60 dark:text-sugu-400"
          : "text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-gray-700/50 dark:hover:text-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

// ── Toolbar Separator ──────────────────────────────────────

function ToolbarSep() {
  return (
    <div className="mx-0.5 h-5 w-px bg-gray-200/80 dark:bg-gray-700/50" />
  );
}

// ── Link Popover ───────────────────────────────────────────

function LinkPopover({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(
    editor.getAttributes("link").href ?? "https://",
  );

  const handleSetLink = () => {
    if (!url || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url, target: "_blank" })
        .run();
    }
    onClose();
  };

  return (
    <div className="absolute left-0 top-full z-50 mt-1 flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-lg dark:border-gray-700/50 dark:bg-gray-900/95">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSetLink();
          }
          if (e.key === "Escape") onClose();
        }}
        placeholder="https://exemple.com"
        className="w-56 rounded-lg border border-gray-200/80 bg-gray-50/50 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-sugu-400 focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-800/50 dark:text-white"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSetLink}
        className="rounded-lg bg-sugu-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sugu-600"
      >
        OK
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Color Picker Popover ───────────────────────────────────

function ColorPopover({
  colors,
  activeColor,
  onSelect,
  onClose,
  label,
}: {
  colors: { label: string; value: string }[];
  activeColor?: string;
  onSelect: (color: string) => void;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-gray-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-lg dark:border-gray-700/50 dark:bg-gray-900/95">
      <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c.value || "default"}
            type="button"
            title={c.label}
            onClick={() => {
              onSelect(c.value);
              onClose();
            }}
            className={`h-6 w-6 rounded-full border-2 transition-all ${
              activeColor === c.value
                ? "border-sugu-500 ring-2 ring-sugu-200 dark:ring-sugu-800"
                : "border-gray-200 dark:border-gray-600"
            } ${c.value === "" ? "bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-600 dark:to-gray-800" : ""}`}
            style={c.value ? { backgroundColor: c.value } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showHighlightPopover, setShowHighlightPopover] = useState(false);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      files.forEach((file) => {
        if (!file.type.startsWith("image/")) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            editor
              .chain()
              .focus()
              .setImage({
                src: dataUrl,
                alt: file.name.replace(/\.[^/.]+$/, ""),
              })
              .run();
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      e.target.value = "";
    },
    [editor],
  );

  return (
    <div className="relative flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-gray-200/80 bg-gray-50/50 px-2 py-1.5 dark:border-gray-700/50 dark:bg-gray-900/40">
      {/* ── Text Style ── */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Gras (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italique (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Souligné (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Barré"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>

      <ToolbarSep />

      {/* ── Headings ── */}
      <ToolbarBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor.isActive("heading", { level: 1 })}
        title="Titre 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive("heading", { level: 2 })}
        title="Titre 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={editor.isActive("heading", { level: 3 })}
        title="Titre 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarBtn>

      <ToolbarSep />

      {/* ── Lists ── */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Liste à puces"
      >
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Liste numérotée"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>

      <ToolbarSep />

      {/* ── Alignment ── */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Aligner à gauche"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Centrer"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Aligner à droite"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarBtn>

      <ToolbarSep />

      {/* ── Colors ── */}
      <div className="relative">
        <ToolbarBtn
          onClick={() => {
            setShowColorPopover(!showColorPopover);
            setShowHighlightPopover(false);
            setShowLinkPopover(false);
          }}
          isActive={showColorPopover}
          title="Couleur du texte"
        >
          <Palette className="h-4 w-4" />
        </ToolbarBtn>
        {showColorPopover && (
          <ColorPopover
            colors={TEXT_COLORS}
            activeColor={editor.getAttributes("textStyle").color ?? ""}
            onSelect={(color) => {
              if (color) {
                editor.chain().focus().setColor(color).run();
              } else {
                editor.chain().focus().unsetColor().run();
              }
            }}
            onClose={() => setShowColorPopover(false)}
            label="Couleur du texte"
          />
        )}
      </div>
      <div className="relative">
        <ToolbarBtn
          onClick={() => {
            setShowHighlightPopover(!showHighlightPopover);
            setShowColorPopover(false);
            setShowLinkPopover(false);
          }}
          isActive={editor.isActive("highlight") || showHighlightPopover}
          title="Surligner"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarBtn>
        {showHighlightPopover && (
          <ColorPopover
            colors={HIGHLIGHT_COLORS}
            activeColor={editor.getAttributes("highlight").color ?? ""}
            onSelect={(color) => {
              editor
                .chain()
                .focus()
                .toggleHighlight({ color })
                .run();
            }}
            onClose={() => setShowHighlightPopover(false)}
            label="Couleur de surlignage"
          />
        )}
      </div>

      <ToolbarSep />

      {/* ── Block elements ── */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Citation"
      >
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Bloc de code"
      >
        <Code className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Ligne horizontale"
      >
        <Minus className="h-4 w-4" />
      </ToolbarBtn>

      <ToolbarSep />

      {/* ── Link ── */}
      <div className="relative">
        {editor.isActive("link") ? (
          <ToolbarBtn
            onClick={() =>
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
            }
            isActive
            title="Supprimer le lien"
          >
            <Link2Off className="h-4 w-4" />
          </ToolbarBtn>
        ) : (
          <ToolbarBtn
            onClick={() => {
              setShowLinkPopover(!showLinkPopover);
              setShowColorPopover(false);
              setShowHighlightPopover(false);
            }}
            isActive={showLinkPopover}
            title="Insérer un lien"
          >
            <Link2 className="h-4 w-4" />
          </ToolbarBtn>
        )}
        {showLinkPopover && !editor.isActive("link") && (
          <LinkPopover
            editor={editor}
            onClose={() => setShowLinkPopover(false)}
          />
        )}
      </div>

      {/* ── Image ── */}
      <ToolbarBtn
        onClick={() => imageInputRef.current?.click()}
        title="Insérer une image"
      >
        <ImagePlus className="h-4 w-4" />
      </ToolbarBtn>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
      />

      <ToolbarSep />

      {/* ── Undo / Redo ── */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Annuler (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rétablir (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Décrivez votre produit...",
  id,
  minHeight = 180,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-sugu-500 underline decoration-sugu-300 hover:text-sugu-600",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-xl max-w-full h-auto mx-auto my-3",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        id: id ?? "rich-text-editor",
        class: "rich-text-content",
        style: `min-height: ${minHeight}px`,
      },
      handleDrop: (view, event, _slice, moved) => {
        // Handle image drops
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files.length > 0
        ) {
          const files = Array.from(event.dataTransfer.files);
          const images = files.filter((f) => f.type.startsWith("image/"));

          if (images.length > 0) {
            event.preventDefault();

            images.forEach((file) => {
              if (file.size > 5 * 1024 * 1024) return;

              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                if (dataUrl) {
                  const { schema } = view.state;
                  const imageNode = schema.nodes.image.create({
                    src: dataUrl,
                    alt: file.name.replace(/\.[^/.]+$/, ""),
                  });
                  const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                  });
                  if (coordinates) {
                    const transaction = view.state.tr.insert(
                      coordinates.pos,
                      imageNode,
                    );
                    view.dispatch(transaction);
                  }
                }
              };
              reader.readAsDataURL(file);
            });

            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        // Handle image paste from clipboard
        const items = event.clipboardData?.items;
        if (!items) return false;

        const imageItems = Array.from(items).filter((item) =>
          item.type.startsWith("image/"),
        );

        if (imageItems.length > 0) {
          event.preventDefault();

          imageItems.forEach((item) => {
            const file = item.getAsFile();
            if (!file || file.size > 5 * 1024 * 1024) return;

            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
                const { schema } = view.state;
                const imageNode = schema.nodes.image.create({
                  src: dataUrl,
                  alt: "Image collée",
                });
                const transaction = view.state.tr.replaceSelectionWith(
                  imageNode,
                );
                view.dispatch(transaction);
              }
            };
            reader.readAsDataURL(file);
          });

          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      // Don't emit empty paragraph
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external value changes (e.g., form reset)
  // We can't use useEffect here because it would cause cursor jumping
  // The value is only used for initial content

  if (!editor) {
    return (
      <div className="animate-pulse rounded-xl border border-gray-200/80 bg-gray-50/50 dark:border-gray-700/50 dark:bg-gray-900/50">
        <div className="h-10 rounded-t-xl bg-gray-100/50 dark:bg-gray-800/30" />
        <div className="p-4" style={{ minHeight }}>
          <div className="h-4 w-3/4 rounded bg-gray-200/50 dark:bg-gray-700/30" />
          <div className="mt-2 h-4 w-1/2 rounded bg-gray-200/50 dark:bg-gray-700/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="rich-text-editor-wrapper">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="rich-text-editor-content rounded-b-xl border border-gray-200/80 bg-gray-50/50 transition-all focus-within:border-sugu-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:focus-within:bg-gray-900/70"
      />
    </div>
  );
}
