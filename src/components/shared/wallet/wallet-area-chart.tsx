import type { WalletChartPoint } from "@/features/shared/wallet.types";

interface WalletAreaChartProps {
  data: WalletChartPoint[];
  gradientId: string;
  lineGradientId: string;
  ariaLabel: string;
  emptyMessage: string;
}

/** SVG Area Chart — pure CSS, no JS library */
export function WalletAreaChart({
  data,
  gradientId,
  lineGradientId,
  ariaLabel,
  emptyMessage,
}: WalletAreaChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        {emptyMessage}
      </p>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartW = 400;
  const chartH = 160;
  const padding = 20;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (chartW - padding * 2),
    y: chartH - padding - (d.value / maxVal) * (chartH - padding * 2),
  }));

  // Build SVG path for smooth curve
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  // Area path (close to bottom)
  const areaPath = `${linePath} L ${points[points.length - 1].x},${chartH - padding} L ${points[0].x},${chartH - padding} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="h-32 w-full lg:h-40"
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f15412" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f15412" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={lineGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb8a3c" />
            <stop offset="100%" stopColor="#f15412" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${lineGradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="chart-path"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="white"
            stroke="#f15412"
            strokeWidth="2"
            className="animate-card-enter"
            style={{ animationDelay: `${i * 80 + 400}ms` }}
          />
        ))}
      </svg>

      {/* Day labels */}
      <div className="mt-1.5 flex justify-between px-2 lg:mt-2 lg:px-5">
        {data.map((d) => (
          <span
            key={d.day}
            className="text-[9px] font-medium text-gray-400 lg:text-[11px]"
          >
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}
