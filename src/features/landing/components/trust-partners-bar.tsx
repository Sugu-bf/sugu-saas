import type { TrustPartnersSection, TrustPartner } from "../schema";

// ============================================================
// Trust Partners Logos Bar — Server Component
// ============================================================

interface TrustPartnersSectionProps {
  data: TrustPartnersSection;
}

/** Inline SVG icons for each partner type */
function PartnerIcon({ partner }: { partner: TrustPartner }) {
  const iconClass = "h-6 w-6 text-gray-400 sm:h-7 sm:w-7";

  switch (partner.iconType) {
    case "delivery-truck":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      );

    case "card-payment":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      );

    case "orange-money":
      return (
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 sm:h-7 sm:w-7">
            <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.5 2c-5.288 0-9.649 3.914-10.377 9h-3.123l4 5.917 4-5.917h-2.847c.711-3.972 4.174-7 8.347-7 4.687 0 8.5 3.813 8.5 8.5s-3.813 8.5-8.5 8.5c-3.015 0-5.662-1.583-7.159-3.948l-1.608 1.117c1.86 2.969 5.164 4.831 8.767 4.831 5.799 0 10.5-4.701 10.5-10.5s-4.701-10.5-10.5-10.5z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-500 sm:text-base">
            Orange<br />Money
          </span>
        </div>
      );

    case "mobipay":
      return (
        <div className="flex items-center gap-1.5">
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
          </svg>
          <span className="text-sm font-bold tracking-tight text-gray-500 sm:text-base">MobiPay</span>
        </div>
      );

    case "sama-logistics":
      return (
        <div className="flex items-center gap-1.5">
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span className="text-sm font-bold tracking-tight text-gray-500 sm:text-base">SamaLogistics</span>
        </div>
      );

    case "shopmali":
      return (
        <div className="flex items-center gap-1.5">
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
          <span className="text-sm font-bold tracking-tight text-gray-500 sm:text-base">ShopMali</span>
        </div>
      );

    case "ecovende":
      return (
        <div className="flex items-center gap-1.5">
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.05 4.14l-.39-.39c-.39-.39-1.02-.39-1.41 0l-.01.01c-.39.39-.39 1.02 0 1.41l.39.39c.39.39 1.03.39 1.42 0 .39-.39.39-1.03 0-1.42zm-2.03 7.34H2.05c-.55 0-1 .45-1 1s.45 1 1 1H4.02c.55 0 1-.45 1-1s-.45-1-1-1zm8.03-8.97V.55c0-.55-.45-1-1-1s-1 .45-1 1v1.96c0 .55.45 1 1 1s1-.45 1-1zm7.78 1.63c-.39-.39-1.02-.39-1.41 0l-.39.39c-.39.39-.39 1.03 0 1.42.39.39 1.03.39 1.42 0l.39-.39c.38-.39.38-1.03-.01-1.42zM17.97 18.34l.39.39c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-.39-.39c-.39-.39-1.03-.39-1.42 0-.38.39-.38 1.03.01 1.41zM19.98 11.48c-.55 0-1 .45-1 1s.45 1 1 1H22c.55 0 1-.45 1-1s-.45-1-1-1h-2.02zM12.05 5.48c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-8 12.5l-.39.39c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l.39-.39c.39-.39.39-1.02 0-1.41-.39-.39-1.03-.39-1.41 0zm8 2.54v1.96c0 .55.45 1 1 1s1-.45 1-1v-1.96c0-.55-.45-1-1-1s-1 .45-1 1z" />
          </svg>
          <span className="text-sm font-bold tracking-tight text-gray-500 sm:text-base">EcoVende</span>
        </div>
      );

    default:
      return null;
  }
}

export function TrustPartnersBar({ data }: TrustPartnersSectionProps) {
  return (
    <section
      className="relative border-y border-gray-200/60 bg-white/60 px-4 py-8 backdrop-blur-sm sm:px-6 lg:px-8"
      aria-label="Partenaires de confiance"
    >
      <div className="mx-auto max-w-7xl">
        {/* Label */}
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
          {data.label}
        </p>

        {/* Logos row */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-10 lg:gap-12">
          {data.partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              <PartnerIcon partner={partner} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
