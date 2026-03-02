import type { StatsSection, StatItem } from "../schema";

// ============================================================
// Stats Bar Section — Server Component
// ============================================================

interface StatsSectionProps {
  data: StatsSection;
}

/** Icon per stat type */
function StatIcon({ iconType }: { iconType: StatItem["iconType"] }) {
  const containerClass =
    "flex h-12 w-12 items-center justify-center rounded-2xl bg-sugu-100/80 sm:h-14 sm:w-14";
  const iconClass = "h-6 w-6 text-sugu-500 sm:h-7 sm:w-7";

  switch (iconType) {
    case "vendors":
      return (
        <div className={containerClass}>
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
      );

    case "orders":
      return (
        <div className={containerClass}>
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
      );

    case "cities":
      return (
        <div className={containerClass}>
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
      );

    case "satisfaction":
      return (
        <div className={containerClass}>
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
          </svg>
        </div>
      );

    default:
      return null;
  }
}

export function StatsBar({ data }: StatsSectionProps) {
  return (
    <section
      className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      aria-label="Chiffres clés"
    >
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-orange-200/40 bg-gradient-to-r from-orange-50/80 via-sugu-50/60 to-orange-50/80 p-6 shadow-lg shadow-orange-100/40 backdrop-blur-sm sm:p-8 lg:p-10">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-4">
            {data.items.map((stat, index) => (
              <div
                key={stat.id}
                className={`flex flex-col items-center text-center ${
                  index < data.items.length - 1
                    ? "lg:border-r lg:border-sugu-200/40"
                    : ""
                }`}
              >
                {/* Icon */}
                <StatIcon iconType={stat.iconType} />

                {/* Value */}
                <p className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
                  {stat.value}
                </p>

                {/* Label */}
                <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
