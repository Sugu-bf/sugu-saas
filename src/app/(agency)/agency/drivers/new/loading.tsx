export default function CreateDriverLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5" role="status">
      {/* Breadcrumb */}
      <div className="h-4 w-52 rounded bg-white/50" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-52 rounded-xl bg-white/50" />
          <div className="mt-2 h-4 w-72 rounded bg-white/40" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded-xl bg-white/50" />
          <div className="h-10 w-44 rounded-xl bg-white/50" />
        </div>
      </div>

      {/* 2-col */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {[280, 220, 200].map((h, i) => (
            <div key={i} className="glass-card rounded-3xl p-6" style={{ height: h }} />
          ))}
        </div>
        <div className="space-y-4 lg:col-span-5">
          {[240, 200, 220].map((h, i) => (
            <div key={i} className="glass-card rounded-3xl p-5" style={{ height: h }} />
          ))}
        </div>
      </div>

      <span className="sr-only">Chargement...</span>
    </div>
  );
}
