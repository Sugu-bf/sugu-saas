"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { capitalize } from "@/lib/utils";
import { Fragment } from "react";

/**
 * Auto‑generated breadcrumbs from the URL pathname.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items from segments
  const crumbs = segments.map((segment, index) => ({
    label: capitalize(segment.replace(/-/g, " ")),
    href: "/" + segments.slice(0, index + 1).join("/"),
    isLast: index === segments.length - 1,
  }));

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
            </li>
            <li>
              {crumb.isLast ? (
                <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="rounded-md px-1.5 py-1 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
