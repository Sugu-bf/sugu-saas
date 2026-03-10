"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  Star,
  Download,
  Bike,
  Award,
  TrendingDown,
  Lightbulb,
  Trophy,
  XCircle,
  Calendar,
} from "lucide-react";
import type { AgencyStatsResponse } from "@/features/agency/schema";

// ────────────────────────────────────────────────────────────
// Period tabs
// ────────────────────────────────────────────────────────────

type Period = "7j" | "30j" | "90j";
const PERIOD_OPTIONS: Period[] = ["7j", "30j", "90j"];

// ────────────────────────────────────────────────────────────
// Area chart (pure SVG — no dependencies)
// ────────────────────────────────────────────────────────────

function AreaChart({
  data,
}: {
  data: { day: number; label: string; value: number }[];
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const W = 700;
  const H = 200;
  const padX = 0;
  const padY = 10;
  const usableW = W - padX * 2;
  const usableH = H - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * usableW,
    y: padY + usableH - (d.value / maxVal) * usableH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

  // Y-axis labels
  const yLabels = [0, 50, 100, 150, 200, 250];

  // Tooltip state is managed via hover index
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(14); // default to day 15

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H + 20}`}
        className="w-full h-auto"
        role="img"
        aria-label="Graphe des livraisons du mois"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F15412" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F15412" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((val) => {
          const y = padY + usableH - (val / maxVal) * usableH;
          return (
            <g key={val}>
              <line
                x1={padX}
                y1={y}
                x2={W}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-100 dark:text-gray-800"
              />
              <text
                x={-4}
                y={y + 3}
                textAnchor="end"
                className="fill-gray-300 dark:fill-gray-600"
                fontSize="8"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#F15412"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover circles */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 5 : 2}
            fill={hoveredIdx === i ? "#F15412" : "transparent"}
            stroke={hoveredIdx === i ? "#fff" : "transparent"}
            strokeWidth="2"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* X labels */}
        {data
          .filter((_, i) => i % 2 === 0 || i === data.length - 1)
          .map((d) => {
            const idx = data.indexOf(d);
            const x = padX + (idx / (data.length - 1)) * usableW;
            return (
              <text
                key={d.day}
                x={x}
                y={H + 14}
                textAnchor="middle"
                className="fill-gray-400 dark:fill-gray-500"
                fontSize="7"
              >
                {d.day}
              </text>
            );
          })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg dark:bg-white dark:text-gray-900"
          style={{
            left: `${(hovered.x / W) * 100}%`,
            top: `${(hovered.y / (H + 20)) * 100 - 12}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {hovered.label} — {hovered.value} livraisons
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function StatisticsContent({
  data,
  period,
  onPeriodChange,
}: {
  data: AgencyStatsResponse;
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {

  return (
    <div className="space-y-4">
      {/* ══ Header ══ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Statistiques
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white/60 p-0.5 backdrop-blur-sm dark:bg-gray-900/40">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  period === p
                    ? "bg-sugu-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            <Download className="h-3.5 w-3.5" />
            Exporter
          </button>
        </div>
      </header>

      {/* ══ Top row: KPIs + Driver of the Month ══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left: KPIs + Chart */}
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Livraisons */}
            <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "0ms" }}>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <Truck className="h-3 w-3 text-sugu-400" />
                Livraisons
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {data.totalDeliveries.toLocaleString("fr-FR")}
                </span>
                <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-950/30">
                  {data.deliveriesGrowth}
                </span>
              </div>
            </div>

            {/* Taux réussite */}
            <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "60ms" }}>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Taux réussite
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {data.successRate}%
                </span>
                <div className="relative h-8 w-8">
                  <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200/60 dark:text-gray-700/40" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${data.successRate}, 100`} strokeLinecap="round" className="text-green-500" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-gray-500">
                    {data.successRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Temps moyen */}
            <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "120ms" }}>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <Clock className="h-3 w-3 text-gray-400" />
                Temps moyen
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {data.avgDeliveryTime}
                </span>
                <span className="text-[10px] text-gray-400">
                  {data.avgTimeTarget}{" "}
                  <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                </span>
              </div>
            </div>

            {/* Revenus */}
            <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "180ms" }}>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <DollarSign className="h-3 w-3 text-sugu-400" />
                Revenus
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-green-600">
                  {data.totalRevenue}
                </span>
                <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-950/30">
                  {data.revenueGrowth}
                </span>
              </div>
            </div>
          </div>

          {/* Chart card */}
          <div className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                <TrendingDown className="h-4 w-4 text-sugu-500 rotate-180" />
                Livraisons ce mois
              </h2>
              <span className="text-xs text-gray-400">55%</span>
            </div>
            <AreaChart data={data.chartData} />
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span>
                Ce mois:{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {data.chartThisMonth.toLocaleString("fr-FR")}
                </span>
              </span>
              <span>vs</span>
              <span>
                Mois précédent:{" "}
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {data.chartPrevMonth.toLocaleString("fr-FR")}
                </span>
              </span>
              <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-950/30">
                {data.chartGrowth}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Driver of the Month */}
        <div className="glass-card animate-card-enter rounded-2xl p-5 flex flex-col items-center text-center" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-900 dark:text-white">
            <Trophy className="h-3.5 w-3.5 text-sugu-500" />
            LIVREUR DU MOIS
          </div>
          <p className="text-xs text-sugu-500 font-semibold italic">
            {data.driverOfMonth.month}
          </p>

          {/* Avatar */}
          <div className="relative mt-4">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold ring-4 ring-white shadow-lg dark:ring-gray-900",
                data.driverOfMonth.avatarColor,
              )}
            >
              {data.driverOfMonth.initials}
            </div>
          </div>

          <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            {data.driverOfMonth.name}
          </h3>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Bike className="h-3 w-3" />
            {data.driverOfMonth.vehicle.charAt(0).toUpperCase() + data.driverOfMonth.vehicle.slice(1)}
          </span>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                {data.driverOfMonth.deliveries}
              </p>
              <p className="text-[9px] text-gray-400">livraisons</p>
            </div>
            <div>
              <p className="text-xl font-extrabold text-green-600">
                {data.driverOfMonth.successRate}%
              </p>
              <p className="text-[9px] text-gray-400">réussite</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {data.driverOfMonth.rating}
                </span>
              </div>
              <p className="text-[9px] text-gray-400">note</p>
            </div>
          </div>

          {/* Quote */}
          <p className="mt-4 rounded-xl bg-gray-50/80 px-4 py-3 text-[11px] italic text-gray-500 dark:bg-gray-900/60">
            &ldquo;{data.driverOfMonth.quote}&rdquo;
          </p>

          {/* Féliciter */}
          <button className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-sugu-600">
            <Award className="h-3.5 w-3.5" />
            Féliciter
          </button>

          {/* Runners up */}
          <p className="mt-3 text-[10px] text-gray-400">
            2e: <span className="font-semibold text-gray-600 dark:text-gray-300">{data.driverOfMonth.runner2nd}</span>
            {"   "}3e: <span className="font-semibold text-gray-600 dark:text-gray-300">{data.driverOfMonth.runner3rd}</span>
          </p>
        </div>
      </div>

      {/* ══ Bottom row: Top drivers + Failure reasons + Weekly summary ══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Top livreurs ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top livreurs
            </h3>
            <span className="text-[10px] text-gray-400">50%</span>
          </div>
          <div className="space-y-3">
            {data.topDrivers.map((driver) => (
              <div key={driver.id} className="flex items-center gap-3">
                {/* Rank */}
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sugu-50 text-[10px] font-black text-sugu-600 dark:bg-sugu-950/30">
                  {driver.rank}
                </span>
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold",
                    driver.avatarColor,
                  )}
                >
                  {driver.initials}
                </div>
                {/* Name */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {driver.name}
                  </p>
                  <p className="text-[9px] text-gray-400">
                    {driver.deliveries} livraisons
                  </p>
                </div>
                {/* Success rate bar */}
                <div className="flex items-center gap-2 w-28">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sugu-500"
                      style={{ width: `${driver.successRate}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold",
                    driver.successRate >= 95 ? "text-green-600" : driver.successRate >= 90 ? "text-sugu-500" : "text-amber-500",
                  )}>
                    {driver.successRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/agency/drivers"
            className="mt-4 inline-flex items-center text-xs font-semibold text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            Voir tous les livreurs →
          </Link>
        </section>

        {/* ── Raisons d'échec ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <XCircle className="h-4 w-4 text-red-500" />
              Raisons d&apos;échec
            </h3>
            <span className="text-[10px] text-gray-400">50%</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {data.failureCount} échecs ce mois ({data.failureRate}){" "}
            <span className="text-green-600 font-semibold">
              ↘ {data.failureVsPrev}
            </span>
          </p>

          <div className="space-y-3">
            {data.failureReasons.map((reason) => (
              <div key={reason.id} className="flex items-center gap-3">
                <span className="w-28 text-xs text-gray-600 dark:text-gray-400 truncate">
                  {reason.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", reason.color)}
                    style={{ width: `${reason.percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-bold text-gray-700 dark:text-gray-300">
                  {reason.percentage}%
                </span>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50/80 p-3 dark:bg-amber-950/20">
            <Lightbulb className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              {data.failureTip}
            </p>
          </div>
        </section>

        {/* ── Résumé de la semaine ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "420ms" }}>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-4">
            <Calendar className="h-4 w-4 text-gray-500" />
            Résumé de la semaine
          </h3>

          <div className="grid grid-cols-7 gap-1.5">
            {data.weekDays.map((day) => (
              <div
                key={day.day}
                className={cn(
                  "flex flex-col items-center rounded-xl p-2 transition-all",
                  day.isHighlighted
                    ? "bg-sugu-500 text-white"
                    : "bg-gray-50/80 dark:bg-gray-900/60",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    day.isHighlighted ? "text-white/80" : "text-gray-400",
                  )}
                >
                  {day.day}
                </span>
                <span
                  className={cn(
                    "text-lg font-extrabold",
                    day.isHighlighted ? "text-white" : "text-gray-900 dark:text-white",
                  )}
                >
                  {day.deliveries}
                </span>
                <span
                  className={cn(
                    "text-[8px]",
                    day.isHighlighted ? "text-white/70" : "text-gray-400",
                  )}
                >
                  livrais.
                </span>
                <span
                  className={cn(
                    "mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                    day.isHighlighted
                      ? "bg-white/20 text-white"
                      : day.successRate >= 96
                        ? "bg-green-50 text-green-600 dark:bg-green-950/30"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {day.successRate}%
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
