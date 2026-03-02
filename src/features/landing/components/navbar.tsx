"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavLink } from "../schema";

// ============================================================
// Landing Navbar — Client Component (mobile menu toggle)
// ============================================================

interface LandingNavbarProps {
  navLinks: NavLink[];
}

export function LandingNavbar({ navLinks }: LandingNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-0.5" aria-label="Accueil SUGUPro">
          <span className="text-2xl font-black tracking-tight text-gray-900">
            SUGU
          </span>
          <span className="text-xs font-bold text-sugu-500">Pro</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-100/80 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-2 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-100/80 hover:text-gray-900"
          >
            Se connecter
          </Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:block">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sugu-500/20 transition-all duration-300 hover:bg-sugu-600 hover:shadow-lg hover:shadow-sugu-500/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-sugu-500 focus-visible:ring-offset-2"
          >
            Commencer gratuitement
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="animate-fade-in border-t border-gray-200/50 bg-white/95 backdrop-blur-xl lg:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-base font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2.5 text-base font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              Se connecter
            </Link>
            <div className="pt-3">
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-full bg-sugu-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sugu-500/20 transition-all hover:bg-sugu-600"
                onClick={() => setMobileOpen(false)}
              >
                Commencer gratuitement
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
