"use client";

import { useState } from "react";
import type { FaqSection } from "../schema";

// ============================================================
// FAQ Section — Client Component (accordion toggle)
// ============================================================

interface FaqSectionProps {
  data: FaqSection;
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 text-sugu-500 transition-transform duration-300 ${
        isOpen ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function FaqBlock({ data }: FaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(data.items[0]?.id ?? null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section
      id="faq"
      className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        {/* ── Section Header ── */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-sugu-700 shadow-sm backdrop-blur-md">
            {data.badge}
          </span>

          <h2
            id="faq-heading"
            className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl"
          >
            {data.heading}
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
            {data.subtext}
          </p>
        </div>

        {/* ── Accordion ── */}
        <div
          className="mt-12 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-sm"
          role="region"
          aria-label="Questions fréquentes"
        >
          {data.items.map((item, index) => {
            const isOpen = openId === item.id;
            const isLast = index === data.items.length - 1;

            return (
              <div
                key={item.id}
                className={!isLast ? "border-b border-gray-200/60" : ""}
              >
                <button
                  type="button"
                  id={`faq-trigger-${item.id}`}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-200 hover:bg-gray-50/80 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sugu-500 sm:px-8"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  onClick={() => toggle(item.id)}
                >
                  <span className="text-sm font-semibold text-gray-900 sm:text-base">
                    {item.question}
                  </span>
                  <ChevronIcon isOpen={isOpen} />
                </button>

                {/* Answer panel with smooth height animation */}
                <div
                  id={`faq-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${item.id}`}
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-relaxed text-gray-500 sm:px-8 sm:text-[15px]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
