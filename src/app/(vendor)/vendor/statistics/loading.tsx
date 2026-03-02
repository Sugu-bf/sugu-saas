export default function StatsLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse space-y-5" role="status">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        <div className="flex gap-2">
          <div className="h-9 w-44 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-9 w-48 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-9 w-28 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>
      <div className="flex gap-1">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 w-24 rounded-lg bg-white/50 dark:bg-gray-800/50" />)}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-4 h-24" />)}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="glass-card rounded-3xl p-6 h-72 xl:col-span-3" />
        <div className="glass-card rounded-3xl p-6 h-72 xl:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass-card rounded-3xl p-6 h-56" />)}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
