/**
 * The design-system gallery (/dev/ui) is a development tool.
 * It is always off in production unless the server is started with
 * `SUGU_UI_GALLERY=1` (used to test a production build locally).
 * Server-only variable: it is never exposed to the browser.
 */
export function isUiGalleryEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV !== "production" || env.SUGU_UI_GALLERY === "1";
}
