// ============================================================
// Landing Page — Loading Skeleton
// ============================================================

export default function LandingLoading() {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50/80 via-white to-purple-50/60"
      role="status"
      aria-label="Chargement de la page d'accueil"
    >
      {/* Navbar Skeleton */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="hidden gap-4 lg:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
          <div className="h-10 w-44 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </header>

      {/* Hero Skeleton */}
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8 lg:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left */}
          <div className="max-w-2xl space-y-6 lg:max-w-none">
            <div className="h-8 w-72 animate-pulse rounded-full bg-gray-200" />
            <div className="space-y-3">
              <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
              <div className="h-12 w-4/5 animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex gap-3">
              <div className="h-12 w-44 animate-pulse rounded-full bg-sugu-200" />
              <div className="h-12 w-36 animate-pulse rounded-full bg-gray-200" />
            </div>
            <div className="flex gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 w-36 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-10 animate-pulse rounded-full border-2 border-white bg-gray-200" />
                ))}
              </div>
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
            </div>
          </div>

          {/* Right — Dashboard skeleton */}
          <div className="relative">
            <div className="h-[350px] w-full animate-pulse rounded-2xl bg-gray-200/70 sm:h-[400px] lg:h-[460px]" />
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
