export default function ClientsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5" role="status">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        <div className="flex gap-2">
          <div className="h-10 w-36 rounded-xl bg-sugu-200/30" />
          <div className="h-10 w-24 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-3xl p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-8 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-white/50 dark:bg-gray-800/50" />
        ))}
      </div>
      <div className="glass-card rounded-3xl p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
