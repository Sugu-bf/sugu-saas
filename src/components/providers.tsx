"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { getQueryClient } from "@/lib/query";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root client providers.
 * Wraps the entire app with QueryClient + Theme.
 */
export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Light mode only. `forcedTheme`: a theme kept by the browser from an
          earlier portal ("dark", or "system" on a dark system) put `.dark` on
          <html> and turned the leftover `dark:` styles back on. */}
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" storageKey="sugu-theme" disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
