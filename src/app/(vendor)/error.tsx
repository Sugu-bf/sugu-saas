"use client";

import { ShellPageError } from "@/components/app-shell/page-error";

/** Fallback for any page of this space that throws: rendered inside the shell. */
export default function SpaceError({ reset }: { error: Error; reset: () => void }) {
  return <ShellPageError reset={reset} />;
}
