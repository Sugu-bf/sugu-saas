// The two drawings of the mock-up: the shop front of a new store and the
// empty chart before the first sale. Decorative: hidden from screen readers.

export function StorefrontIllustration({ className }: { className?: string }) {
  const stripes = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg viewBox="0 0 180 150" className={className} aria-hidden="true" focusable="false">
      <ellipse cx="90" cy="142" rx="78" ry="6" fill="#f4f4f5" />
      {/* Walls and sign */}
      <rect x="28" y="40" width="118" height="100" rx="4" fill="#f4f4f5" stroke="#e4e4e7" />
      <rect x="40" y="16" width="94" height="22" rx="4" fill="#ffffff" stroke="#e4e4e7" />
      <rect x="52" y="24" width="70" height="6" rx="3" fill="#fde0cf" />
      {/* Awning */}
      {stripes.map((index) => (
        <path key={index} d={`M${24 + index * 18},38 h18 v16 a9 9 0 0 1 -18 0 z`} fill={index % 2 === 0 ? "#f15412" : "#ffffff"} stroke="#f15412" strokeWidth="1" />
      ))}
      {/* Window with goods */}
      <rect x="38" y="70" width="52" height="40" rx="3" fill="#ffffff" stroke="#e4e4e7" />
      <rect x="44" y="92" width="12" height="14" rx="2" fill="#fbbf9a" />
      <rect x="60" y="86" width="10" height="20" rx="2" fill="#f15412" opacity="0.8" />
      <rect x="74" y="94" width="10" height="12" rx="2" fill="#a1a1aa" />
      <path d="M38 82 h52" stroke="#e4e4e7" />
      {/* Door */}
      <rect x="100" y="70" width="34" height="70" rx="3" fill="#ffffff" stroke="#e4e4e7" />
      <rect x="106" y="78" width="22" height="26" rx="2" fill="#e5eefc" />
      <circle cx="127" cy="112" r="2" fill="#a1a1aa" />
      {/* Plant */}
      <path d="M158 126 c-10 -10 -10 -26 0 -34 c10 8 10 24 0 34z" fill="#12804a" opacity="0.85" />
      <path d="M158 128 c-12 -4 -18 -14 -16 -24 c10 2 16 12 16 24z" fill="#16a34a" opacity="0.7" />
      <path d="M150 124 h16 l-3 16 h-10 z" fill="#d4d4d8" />
    </svg>
  );
}

export function EmptyChartIllustration({ className }: { className?: string }) {
  const bars = [28, 46, 36, 60, 42, 70, 52, 80, 58];
  return (
    <svg viewBox="0 0 140 96" className={className} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="138" height="94" rx="10" fill="#fafafa" stroke="#f0f0f2" />
      {bars.map((height, index) => (
        <rect key={index} x={14 + index * 13} y={84 - height * 0.85} width="7" height={height * 0.85} rx="3" fill={index === bars.length - 2 ? "#fbbf9a" : "#e4e4e7"} />
      ))}
      <path d="M10 85 h120" stroke="#e4e4e7" />
    </svg>
  );
}
