"use client";

import { createElement, useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/design-system";

// ============================================================
// Reading the rich description of a product.
//
// The markup is parsed and rebuilt as React elements from an allowlist. It
// is never inserted as HTML, so nothing it carries (script, handler, style
// sheet, class) can run or restyle this application. What the editor can
// produce is kept: titles, lists, links, pictures, tables, colours and
// alignment. Each attribute is read, checked and set again; none is copied.
// ============================================================

/** Tags rebuilt as they are. Anything else is replaced by its children. */
const KEPT = new Set([
  "p", "ul", "ol", "li", "blockquote", "h2", "h3", "h4", "strong", "em", "u", "s", "code", "pre", "mark", "span",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
]);
// The page already has its `h1`: the largest title of a description is an `h2` here.
const RENAMED: Record<string, string> = { b: "strong", i: "em", del: "s", strike: "s", h1: "h2", h5: "h4", h6: "h4" };
/** Content that is dropped with everything inside it. */
const DROPPED = new Set(["script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "math", "form", "colgroup", "col", "head", "title", "link", "meta"]);
/** Blocks whose text may be aligned. */
const ALIGNABLE = new Set(["p", "h2", "h3", "h4", "th", "td"]);
const ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
const INLINE_PICTURE = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i;

function safeHref(href: string | null): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, "https://sugu.pro");
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:" ? url.href : null;
  } catch {
    return null;
  }
}

/** A hosted picture, or one inlined by the editor and not saved yet. */
function safePicture(src: string | null): string | null {
  const value = src?.trim();
  if (!value) return null;
  if (INLINE_PICTURE.test(value)) return value;
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

/** One declaration of a `style` attribute, as the parser understood it. */
function styleOf(element: Element, property: string): string {
  return (element as HTMLElement).style?.getPropertyValue(property).trim() ?? "";
}

const safeColor = (value: string | null | undefined) => (value && COLOR.test(value.trim()) ? value.trim() : null);

function span(value: string | null): number | undefined {
  const count = Number(value);
  return Number.isInteger(count) && count > 1 && count <= 50 ? count : undefined;
}

function rebuild(node: ChildNode, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  const name = element.tagName.toLowerCase();
  if (DROPPED.has(name)) return null;

  const tag = RENAMED[name] ?? name;

  if (tag === "img") {
    const src = safePicture(element.getAttribute("src"));
    return src ? createElement("img", { key, src, alt: element.getAttribute("alt") ?? "", loading: "lazy", decoding: "async" }) : null;
  }
  if (tag === "br" || tag === "hr") return createElement(tag, { key });

  const children = Array.from(element.childNodes, rebuild);

  if (tag === "a") {
    const href = safeHref(element.getAttribute("href"));
    return href ? createElement("a", { key, href, target: "_blank", rel: "noopener noreferrer nofollow" }, ...children) : children;
  }
  if (!KEPT.has(tag)) return children;

  const style: CSSProperties = {};
  if (ALIGNABLE.has(tag)) {
    const align = styleOf(element, "text-align").toLowerCase();
    if (ALIGNMENTS.has(align)) style.textAlign = align as CSSProperties["textAlign"];
  }
  if (tag === "span") {
    const color = safeColor(styleOf(element, "color"));
    // A span that carries nothing we keep is only its text.
    if (!color) return children;
    style.color = color;
  }
  if (tag === "mark") {
    const color = safeColor(element.getAttribute("data-color")) ?? safeColor(styleOf(element, "background-color"));
    if (color) style.backgroundColor = color;
  }

  const props: Record<string, unknown> = { key };
  if (Object.keys(style).length > 0) props.style = style;
  if (tag === "th" || tag === "td") {
    props.colSpan = span(element.getAttribute("colspan"));
    props.rowSpan = span(element.getAttribute("rowspan"));
  }

  const rebuilt = createElement(tag, props, ...children);
  // A wide table scrolls inside its own box instead of widening the page.
  return tag === "table" ? createElement("div", { key, className: "my-2 overflow-x-auto" }, rebuilt) : rebuilt;
}

/** React elements of a rich description; an empty list when it shows nothing. */
export function renderRichText(html: string | null): ReactNode[] {
  if (!html || typeof DOMParser === "undefined") return [];
  const body = new DOMParser().parseFromString(html, "text/html").body;
  if (!(body.textContent ?? "").trim() && !body.querySelector("img")) return [];
  return Array.from(body.childNodes, rebuild);
}

/** Typography of a description, read or being written. */
export const PROSE = cn(
  "text-body break-words text-foreground",
  "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-section-title [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-section-title",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-semibold [&_h4]:mt-2 [&_h4]:font-medium",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-foreground-muted",
  "[&_a]:underline [&_a]:underline-offset-2",
  "[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-control",
  "[&_hr]:my-3 [&_hr]:border-border-strong",
  "[&_code]:rounded-compact [&_code]:bg-surface-subtle [&_code]:px-1 [&_code]:font-mono [&_code]:text-meta",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-control [&_pre]:bg-surface-subtle [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_mark]:rounded-compact [&_mark]:px-0.5 [&_mark]:text-foreground",
  "[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border-strong [&_td]:px-2 [&_td]:py-1 [&_td]:align-top",
  "[&_th]:border [&_th]:border-border-strong [&_th]:bg-surface-subtle [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:align-top [&_th]:font-medium [&_th]:text-foreground",
  "[&_td>p]:my-0 [&_th>p]:my-0",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
);

export function RichText({ html, className }: { html: string | null; className?: string }) {
  const content = useMemo(() => renderRichText(html), [html]);
  if (content.length === 0) return null;
  return <div className={cn(PROSE, "text-foreground-muted", className)}>{content}</div>;
}
