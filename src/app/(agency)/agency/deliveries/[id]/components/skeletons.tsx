import type { DeliveryDetailRow } from "@/features/agency/schema";

export function DetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-4 lg:space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 rounded-lg bg-gray-200 animate-shimmer" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 rounded-full bg-gray-200 animate-shimmer" />
          <div className="h-7 w-20 rounded-full bg-gray-200 animate-shimmer" />
          <div className="h-7 w-16 rounded-full bg-gray-200 animate-shimmer" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Suivi */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-44 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="h-[250px] rounded-xl bg-gray-100 animate-shimmer" />
          <div className="h-4 w-36 rounded bg-gray-200 animate-shimmer mt-3" />
        </div>
        {/* Livreur */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-24 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-full bg-gray-200 animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200 animate-shimmer" />
              <div className="h-3 w-24 rounded bg-gray-200 animate-shimmer" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="h-9 flex-1 rounded-xl bg-gray-200 animate-shimmer" />
            <div className="h-9 flex-1 rounded-xl bg-gray-200 animate-shimmer" />
          </div>
        </div>
        {/* Client */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-20 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-40 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-36 rounded bg-gray-200 animate-shimmer" />
          </div>
          <div className="h-9 w-full rounded-xl bg-gray-200 animate-shimmer mt-4" />
        </div>
        {/* Détails commande */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-36 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-32 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-48 rounded bg-gray-200 animate-shimmer" />
          </div>
        </div>
        {/* Itinéraire */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-28 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-3">
            <div className="h-12 w-full rounded bg-gray-200 animate-shimmer" />
            <div className="h-12 w-full rounded bg-gray-200 animate-shimmer" />
          </div>
        </div>
        {/* Actions */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-32 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-2">
            <div className="h-10 w-full rounded-xl bg-gray-200 animate-shimmer" />
            <div className="h-10 w-full rounded-xl bg-gray-200 animate-shimmer" />
            <div className="h-10 w-full rounded-xl bg-gray-200 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapPlaceholder({ row }: { row: DeliveryDetailRow }) {
  return (
    <div className="relative h-[250px] lg:h-[280px] rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* SVG map illustration */}
      <svg
        viewBox="0 0 500 300"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background grid */}
        <defs>
          <pattern
            id="map-grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="500" height="300" fill="url(#map-grid)" />

        {/* "Roads" */}
        <path
          d="M 50 180 Q 150 180 200 140 Q 260 90 350 120 Q 420 140 460 100"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 80 250 Q 140 200 200 200 Q 280 200 320 160"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 160 50 Q 200 100 250 130 Q 300 155 380 180"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Dashed route line */}
        <path
          d="M 110 170 Q 180 120 250 130 Q 320 140 380 120"
          fill="none"
          stroke="#f15412"
          strokeWidth="2.5"
          strokeDasharray="8 4"
          strokeLinecap="round"
        />

        {/* Point A (Blue) */}
        <circle cx="110" cy="170" r="8" fill="#3b82f6" />
        <circle cx="110" cy="170" r="4" fill="white" />

        {/* Point B (Orange) */}
        <circle cx="380" cy="120" r="8" fill="#f15412" />
        <circle cx="380" cy="120" r="4" fill="white" />

        {/* Moto icon on the route */}
        <text x="245" y="115" fontSize="24" textAnchor="middle">
          ●
        </text>

        {/* A label */}
        <text
          x="95"
          y="205"
          fontSize="10"
          fontWeight="bold"
          fill="#1f2937"
          fontFamily="sans-serif"
        >
          A
        </text>

        {/* B label */}
        <text
          x="395"
          y="115"
          fontSize="10"
          fontWeight="bold"
          fill="#1f2937"
          fontFamily="sans-serif"
        >
          B
        </text>
      </svg>

      {/* Location labels overlaid */}
      <div className="absolute top-3 left-3 max-w-[45%]">
        <div className="rounded-lg bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] font-bold text-gray-800 leading-tight">
            {row.vendor} —
          </p>
          <p className="text-[9px] text-gray-500 leading-tight">
            {row.itinerary.from}
          </p>
        </div>
      </div>

      <div className="absolute top-3 right-3 max-w-[45%]">
        <div className="rounded-lg bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm text-right">
          <p className="text-[10px] font-bold text-gray-800 leading-tight">
            {row.client.name} —
          </p>
          <p className="text-[9px] text-gray-500 leading-tight">
            {row.itinerary.to}
          </p>
        </div>
      </div>

      {/* ETA Pill */}
      <div className="absolute bottom-14 right-4">
        <span className="rounded-full bg-sugu-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
          ETA: {row.eta}
        </span>
      </div>

      {/* Bottom overlay - Address bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 to-transparent px-3 pb-2 pt-6">
        <div className="flex items-start gap-3 text-[10px]">
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
            <span className="text-gray-600 font-medium leading-tight">
              {row.vendor} — {row.itinerary.from}
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-sugu-500" />
            <span className="text-gray-600 font-medium leading-tight">
              {row.client.name} — {row.itinerary.to}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
