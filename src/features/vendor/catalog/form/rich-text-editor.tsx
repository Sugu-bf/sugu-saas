"use client";

import { forwardRef, useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { TableKit } from "@tiptap/extension-table";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Bold,
  Captions,
  ChevronDown,
  Eraser,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Palette,
  PanelTop,
  Pilcrow,
  Plus,
  Redo2,
  SeparatorHorizontal,
  SquareCode,
  Strikethrough,
  Table,
  TextQuote,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button, Dialog, DialogContent, DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, FormField, Input, cn } from "@/design-system";
import { DESCRIPTION_IMAGE_ACCEPT, DescriptionImageError, prepareDescriptionImage } from "./description-image";
import { PROSE } from "./rich-text";

// ============================================================
// Writing the rich description of a product: Tiptap, with what a marketplace
// listing needs. Titles, lists, alignment, colours, links, pictures, tables.
//
// Pictures are inlined in the markup and stored by Laravel on save (see
// description-image.ts). The markup itself is sanitised by Laravel; this
// application never inserts it as HTML (see rich-text.tsx).
// ============================================================

const TEXT_COLORS = [
  { label: "Rouge", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Ambre", value: "#b45309" },
  { label: "Vert", value: "#15803d" },
  { label: "Bleu", value: "#1d4ed8" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#be185d" },
  { label: "Gris", value: "#52525b" },
];

const HIGHLIGHT_COLORS = [
  { label: "Jaune", value: "#fef08a" },
  { label: "Vert", value: "#bbf7d0" },
  { label: "Bleu", value: "#bfdbfe" },
  { label: "Rose", value: "#fecdd3" },
  { label: "Violet", value: "#e9d5ff" },
];

const ALIGNMENTS = [
  { value: "left", label: "Aligner à gauche", icon: AlignLeft },
  { value: "center", label: "Centrer", icon: AlignCenter },
  { value: "right", label: "Aligner à droite", icon: AlignRight },
] as const;

const BLOCK_STYLES: { label: string; icon: LucideIcon; level: 1 | 2 | 3 | null }[] = [
  { label: "Texte normal", icon: Pilcrow, level: null },
  { label: "Titre 1", icon: Heading1, level: 1 },
  { label: "Titre 2", icon: Heading2, level: 2 },
  { label: "Titre 3", icon: Heading3, level: 3 },
];

const INLINE_PICTURE = /^data:image\/(png|jpe?g|gif|webp);base64,/i;

// A table carries its own lines. The storefront and the mobile application
// insert the description as it is stored, and give tables no style of their
// own: without these, buyers would read a table as loose columns of text.
// This application does not use them: it rebuilds what it shows (rich-text.tsx).
const TABLE_STYLE = "border-collapse: collapse; width: 100%;";
const CELL_STYLE = "border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; vertical-align: top;";

/**
 * Pasted markup keeps the pictures it carries inline. A picture hosted on
 * another site is left out: the storefront only shows pictures SUGU hosts,
 * so the seller would see an image buyers never get.
 */
export function withoutForeignPictures(html: string): { html: string; removed: number } {
  if (typeof DOMParser === "undefined" || !/<img/i.test(html)) return { html, removed: 0 };
  const body = new DOMParser().parseFromString(html, "text/html").body;
  let removed = 0;
  body.querySelectorAll("img").forEach((picture) => {
    if (INLINE_PICTURE.test(picture.getAttribute("src") ?? "")) return;
    picture.remove();
    removed += 1;
  });
  return removed > 0 ? { html: body.innerHTML, removed } : { html, removed: 0 };
}

/** "sugu.pro/boutique" → "https://sugu.pro/boutique"; null when it is not an address a link may carry. */
export function linkAddress(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol === "mailto:") return url.href;
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

// ── Toolbar parts ───────────────────────────────────────────

interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: LucideIcon;
  /** On/off state of a formatting mark; leave undefined for an action. */
  pressed?: boolean;
  /** The button opens a menu: a chevron says so. */
  menu?: boolean;
}

const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton({ label, icon: Icon, pressed, menu = false, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "flex h-8 min-w-8 shrink-0 items-center justify-center gap-0.5 rounded-button px-1.5 text-foreground-muted touch:h-10 touch:min-w-10",
        "hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-disabled-foreground disabled:hover:bg-transparent",
        "aria-pressed:bg-brand-subtle aria-pressed:text-foreground data-[state=open]:bg-surface-hover data-[state=open]:text-foreground",
        className,
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {menu && <ChevronDown className="size-3 shrink-0" aria-hidden="true" />}
    </button>
  );
});

const Separator = () => <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;

/** The colours of a menu, as a row of swatches; each one is named for assistive technology. */
function Swatches({ colors, onPick }: { colors: { label: string; value: string }[]; onPick: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 px-1 pb-1">
      {colors.map((color) => (
        <DropdownMenuItem
          key={color.value}
          aria-label={color.label}
          title={color.label}
          onSelect={() => onPick(color.value)}
          className="size-8 justify-center rounded-pill p-0 touch:size-10"
        >
          <span className="block size-5 rounded-pill border border-border-strong" style={{ backgroundColor: color.value }} aria-hidden="true" />
        </DropdownMenuItem>
      ))}
    </div>
  );
}

// ── Editor ──────────────────────────────────────────────────

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Id of the editable area. */
  id: string;
  /** Accessible name: the editable area is not a form control a `<label>` can point to. */
  label: string;
  describedBy?: string;
  invalid?: boolean;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, id, label, describedBy, invalid, placeholder }: RichTextEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(0);
  const [linkDraft, setLinkDraft] = useState<{ value: string; existing: boolean; error: string | null } | null>(null);
  const [altDraft, setAltDraft] = useState<string | null>(null);
  // A menu item that opens a dialog keeps the focus for it.
  const keepFocusOut = useRef(false);
  // The handlers below are given to the editor once; they reach the latest insert function through this.
  const insertPictures = useRef<(files: File[], at?: number) => void>(() => {});

  const editor = useEditor({
    // Rendered after mount: the server has no DOM to build the editor on.
    immediatelyRender: false,
    // The toolbar reflects the selection: bold on, list on…
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, link: false, underline: false }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      // Inline pictures are kept: that is how a new picture travels to Laravel.
      ImageExtension.configure({ inline: false, allowBase64: true }),
      TableKit.configure({
        table: { resizable: false, HTMLAttributes: { style: TABLE_STYLE } },
        tableHeader: { HTMLAttributes: { style: `${CELL_STYLE} background-color: #f4f4f5; font-weight: 600;` } },
        tableCell: { HTMLAttributes: { style: CELL_STYLE } },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: cn(
          PROSE,
          "min-h-40 px-3 py-2 outline-none [&_table]:table-fixed",
          // What is selected inside the text: a picture, the cells of a table.
          "[&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-offset-2 [&_img.ProseMirror-selectednode]:outline-focus-ring",
          "[&_.selectedCell]:bg-brand-subtle",
          "[&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0",
          "[&_p.is-editor-empty:first-child::before]:text-foreground-subtle [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        ),
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        insertPictures.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        insertPictures.current(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
        return true;
      },
      transformPastedHTML: (html) => {
        const pasted = withoutForeignPictures(html);
        if (pasted.removed > 0) {
          toast.message("Les images d'un autre site n'ont pas été reprises. Ajoutez-les depuis votre appareil.");
        }
        return pasted.html;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  // The editable area is created once: what the form says about it later
  // (an error, the message that describes it) is set on it as it changes.
  useEffect(() => {
    const area = editor?.view.dom;
    if (!area) return;
    if (describedBy) area.setAttribute("aria-describedby", describedBy);
    else area.removeAttribute("aria-describedby");
    if (invalid) area.setAttribute("aria-invalid", "true");
    else area.removeAttribute("aria-invalid");
  }, [editor, describedBy, invalid]);

  const addPictures = useCallback(
    async (files: File[], at?: number) => {
      if (!editor) return;
      setPreparing((count) => count + 1);
      let position = at;
      try {
        for (const file of files) {
          try {
            const picture = await prepareDescriptionImage(file);
            if (position === undefined) editor.chain().focus().setImage(picture).run();
            else {
              editor.chain().focus().insertContentAt(position, { type: "image", attrs: picture }).run();
              position += 1;
            }
          } catch (error) {
            toast.error(error instanceof DescriptionImageError ? error.message : "L'image n'a pas pu être ajoutée.");
          }
        }
      } finally {
        setPreparing((count) => count - 1);
      }
    },
    [editor],
  );

  useEffect(() => {
    insertPictures.current = (files, at) => void addPictures(files, at);
  }, [addPictures]);

  /** Leaves the focus in the text once a menu closes, unless its item opened a dialog. */
  const backToText = (event: Event) => {
    event.preventDefault();
    if (keepFocusOut.current) keepFocusOut.current = false;
    else editor?.commands.focus();
  };

  function openLink() {
    if (!editor) return;
    const href = editor.getAttributes("link").href as string | undefined;
    setLinkDraft({ value: href ?? "", existing: Boolean(href), error: null });
  }

  function applyLink() {
    if (!editor || !linkDraft) return;
    const href = linkAddress(linkDraft.value);
    if (!href) {
      setLinkDraft({ ...linkDraft, error: "Saisissez une adresse complète, par exemple https://sugu.pro." });
      return;
    }
    const chain = editor.chain().extendMarkRange("link");
    // Nothing selected and no link under the cursor: the address becomes the text of the link.
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setLinkDraft(null);
  }

  function removeLink() {
    editor?.chain().extendMarkRange("link").unsetLink().run();
    setLinkDraft(null);
  }

  const inTable = Boolean(editor?.isActive("table"));
  const onPicture = Boolean(editor?.isActive("image"));
  const alignment = ALIGNMENTS.find((item) => editor?.isActive({ textAlign: item.value })) ?? ALIGNMENTS[0];
  const coloured = Boolean(editor?.isActive("highlight") || editor?.getAttributes("textStyle").color);
  const ready = Boolean(editor);

  return (
    <div
      aria-busy={preparing > 0 || undefined}
      className={cn(
        "overflow-hidden rounded-control border bg-surface focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus-ring",
        invalid ? "border-danger-solid" : "border-border-control",
      )}
    >
      {/* One row on a phone, scrolling sideways; it wraps when there is room to. */}
      <div
        role="toolbar"
        aria-label="Mise en forme de la description"
        className="flex items-center gap-0.5 overflow-x-auto border-b border-border bg-surface-subtle px-1.5 py-1 md:flex-wrap md:overflow-x-visible"
      >
        <ToolButton label="Annuler la frappe" icon={Undo2} disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} />
        <ToolButton label="Rétablir" icon={Redo2} disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} />
        <Separator />

        <DropdownMenu
          align="start"
          onCloseAutoFocus={backToText}
          trigger={<ToolButton label="Style du texte" icon={Heading} menu disabled={!ready} pressed={Boolean(editor?.isActive("heading"))} />}
        >
          {BLOCK_STYLES.map((style) => (
            <DropdownMenuItem
              key={style.label}
              icon={style.icon}
              onSelect={() => (style.level ? editor?.chain().focus().setHeading({ level: style.level }).run() : editor?.chain().focus().setParagraph().run())}
            >
              {style.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
        <Separator />

        <ToolButton label="Gras" icon={Bold} disabled={!ready} pressed={Boolean(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} />
        <ToolButton label="Italique" icon={Italic} disabled={!ready} pressed={Boolean(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} />
        <ToolButton label="Souligné" icon={UnderlineIcon} disabled={!ready} pressed={Boolean(editor?.isActive("underline"))} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
        <ToolButton label="Barré" icon={Strikethrough} disabled={!ready} pressed={Boolean(editor?.isActive("strike"))} onClick={() => editor?.chain().focus().toggleStrike().run()} />

        <DropdownMenu
          align="start"
          onCloseAutoFocus={backToText}
          trigger={<ToolButton label="Couleurs" icon={Palette} menu disabled={!ready} pressed={coloured} />}
        >
          <DropdownMenuLabel>Couleur du texte</DropdownMenuLabel>
          <Swatches colors={TEXT_COLORS} onPick={(color) => editor?.chain().focus().setColor(color).run()} />
          <DropdownMenuItem icon={Eraser} onSelect={() => editor?.chain().focus().unsetColor().run()}>
            Couleur par défaut
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Surlignage</DropdownMenuLabel>
          <Swatches colors={HIGHLIGHT_COLORS} onPick={(color) => editor?.chain().focus().setHighlight({ color }).run()} />
          <DropdownMenuItem icon={Eraser} onSelect={() => editor?.chain().focus().unsetHighlight().run()}>
            Sans surlignage
          </DropdownMenuItem>
        </DropdownMenu>
        <Separator />

        <ToolButton label="Liste à puces" icon={List} disabled={!ready} pressed={Boolean(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
        <ToolButton label="Liste numérotée" icon={ListOrdered} disabled={!ready} pressed={Boolean(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
        <DropdownMenu align="start" onCloseAutoFocus={backToText} trigger={<ToolButton label="Alignement" icon={alignment.icon} menu disabled={!ready} />}>
          {ALIGNMENTS.map((item) => (
            <DropdownMenuItem key={item.value} icon={item.icon} onSelect={() => editor?.chain().focus().setTextAlign(item.value).run()}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
        <Separator />

        <ToolButton label="Lien" icon={Link2} disabled={!ready} pressed={Boolean(editor?.isActive("link"))} onClick={openLink} />
        <DropdownMenu
          align="start"
          onCloseAutoFocus={backToText}
          trigger={<ToolButton label="Image" icon={ImagePlus} menu disabled={!ready || preparing > 0} pressed={onPicture} />}
        >
          <DropdownMenuItem icon={ImagePlus} onSelect={() => fileInput.current?.click()}>
            Ajouter des images…
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={Captions}
            disabled={!onPicture}
            onSelect={() => {
              keepFocusOut.current = true;
              setAltDraft((editor?.getAttributes("image").alt as string | null | undefined) ?? "");
            }}
          >
            Décrire l&apos;image…
          </DropdownMenuItem>
          <DropdownMenuItem icon={Trash2} tone="danger" disabled={!onPicture} onSelect={() => editor?.chain().focus().deleteSelection().run()}>
            Retirer l&apos;image
          </DropdownMenuItem>
        </DropdownMenu>
        <DropdownMenu align="start" onCloseAutoFocus={backToText} trigger={<ToolButton label="Tableau" icon={Table} menu disabled={!ready} pressed={inTable} />}>
          {!inTable ? (
            <DropdownMenuItem icon={Table} onSelect={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              Insérer un tableau
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuLabel>Lignes</DropdownMenuLabel>
              <DropdownMenuItem icon={ArrowUpToLine} onSelect={() => editor?.chain().focus().addRowBefore().run()}>
                Ajouter une ligne au-dessus
              </DropdownMenuItem>
              <DropdownMenuItem icon={ArrowDownToLine} onSelect={() => editor?.chain().focus().addRowAfter().run()}>
                Ajouter une ligne en dessous
              </DropdownMenuItem>
              <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => editor?.chain().focus().deleteRow().run()}>
                Supprimer la ligne
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Colonnes</DropdownMenuLabel>
              <DropdownMenuItem icon={ArrowLeftToLine} onSelect={() => editor?.chain().focus().addColumnBefore().run()}>
                Ajouter une colonne à gauche
              </DropdownMenuItem>
              <DropdownMenuItem icon={ArrowRightToLine} onSelect={() => editor?.chain().focus().addColumnAfter().run()}>
                Ajouter une colonne à droite
              </DropdownMenuItem>
              <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => editor?.chain().focus().deleteColumn().run()}>
                Supprimer la colonne
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem icon={PanelTop} onSelect={() => editor?.chain().focus().toggleHeaderRow().run()}>
                Activer ou retirer la ligne d&apos;en-tête
              </DropdownMenuItem>
              <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => editor?.chain().focus().deleteTable().run()}>
                Supprimer le tableau
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
        <Separator />

        <DropdownMenu
          align="start"
          onCloseAutoFocus={backToText}
          trigger={<ToolButton label="Autres éléments" icon={Plus} menu disabled={!ready} pressed={Boolean(editor?.isActive("blockquote") || editor?.isActive("codeBlock"))} />}
        >
          <DropdownMenuItem icon={TextQuote} onSelect={() => editor?.chain().focus().toggleBlockquote().run()}>
            Citation
          </DropdownMenuItem>
          <DropdownMenuItem icon={SquareCode} onSelect={() => editor?.chain().focus().toggleCodeBlock().run()}>
            Bloc de code
          </DropdownMenuItem>
          <DropdownMenuItem icon={SeparatorHorizontal} onSelect={() => editor?.chain().focus().setHorizontalRule().run()}>
            Ligne de séparation
          </DropdownMenuItem>
        </DropdownMenu>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={DESCRIPTION_IMAGE_ACCEPT}
        multiple
        hidden
        aria-label="Images à ajouter à la description"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // The same file can be chosen again later.
          event.target.value = "";
          if (files.length > 0) void addPictures(files);
        }}
      />

      {/* Until the editor mounts, the area keeps its height: no layout jump. */}
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-40" aria-hidden="true" />}

      <Dialog open={linkDraft !== null} onOpenChange={(open) => !open && setLinkDraft(null)}>
        <DialogContent
          size="sm"
          title={linkDraft?.existing ? "Modifier le lien" : "Ajouter un lien"}
          footer={
            <>
              {linkDraft?.existing && (
                <Button variant="quiet" icon={Link2Off} onClick={removeLink} className="md:mr-auto">
                  Retirer le lien
                </Button>
              )}
              <Button onClick={() => setLinkDraft(null)}>Annuler</Button>
              <Button variant="primary" onClick={applyLink}>
                Appliquer
              </Button>
            </>
          }
        >
          <FormField label="Adresse du lien" error={linkDraft?.error} hint="La page s'ouvrira dans un nouvel onglet.">
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              value={linkDraft?.value ?? ""}
              onChange={(event) => linkDraft && setLinkDraft({ ...linkDraft, value: event.target.value, error: null })}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                applyLink();
              }}
            />
          </FormField>
        </DialogContent>
      </Dialog>

      <Dialog open={altDraft !== null} onOpenChange={(open) => !open && setAltDraft(null)}>
        <DialogContent
          size="sm"
          title="Décrire l'image"
          footer={
            <>
              <Button onClick={() => setAltDraft(null)}>Annuler</Button>
              <Button
                variant="primary"
                onClick={() => {
                  editor?.chain().updateAttributes("image", { alt: (altDraft ?? "").trim() }).run();
                  setAltDraft(null);
                }}
              >
                Enregistrer
              </Button>
            </>
          }
        >
          <FormField label="Description de l'image" hint="Lue aux personnes qui ne voient pas l'image, et affichée si elle ne se charge pas.">
            <Input value={altDraft ?? ""} maxLength={160} autoComplete="off" onChange={(event) => setAltDraft(event.target.value)} />
          </FormField>
        </DialogContent>
      </Dialog>
    </div>
  );
}
