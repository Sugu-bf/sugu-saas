"use client";

import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Shared UI Components for Settings Tabs
// ────────────────────────────────────────────────────────────

/** Frosted section card wrapper */
export function SectionCard({
  title,
  badge,
  children,
  className,
  id,
  variant,
  style,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: "danger";
  style?: React.CSSProperties;
}) {
  return (
    <section
      className={cn(
        "glass-card rounded-2xl p-6 transition-all duration-300",
        variant === "danger" && "border-red-200/60 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10",
        className,
      )}
      aria-labelledby={id}
      style={style}
    >
      {(title || badge) && (
        <div className="flex items-center gap-3">
          <h2 id={id} className={cn(
            "text-base font-semibold",
            variant === "danger" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white",
          )}>
            {title}
          </h2>
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}


/** Toggle switch — orange ON, gray OFF */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        checked ? "bg-sugu-500" : "bg-gray-200 dark:bg-gray-700",
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{
          width: "18px",
          height: "18px",
          transform: checked ? "translateX(22px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}

/** Form field label wrapper */
export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-0.5 text-sugu-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

/** Pill-shaped input */
export function PillInput({
  value,
  onChange,
  placeholder,
  type = "text",
  prefix,
  suffix,
  className,
  disabled,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          "w-full rounded-full border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-700 backdrop-blur transition-all",
          "placeholder:text-gray-400 focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20",
          "dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200 dark:focus:border-sugu-600",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          prefix && "pl-10",
          suffix && "pr-10",
          className,
        )}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</span>
      )}
    </div>
  );
}

/** Pill select dropdown */
export function PillSelect({
  value,
  onChange,
  options,
  prefix,
  className,
  disabled,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  prefix?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{prefix}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full appearance-none rounded-full border border-white/60 bg-white/50 px-4 py-2.5 pr-10 text-sm text-gray-700 backdrop-blur transition-all",
          "focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20",
          "dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
          prefix && "pl-10",
          className,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
}

/** Pill badge */
export function PillBadge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "green" | "red" | "amber" | "blue" | "orange" | "gray";
}) {
  const styles: Record<string, string> = {
    default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    green: "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
    red: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    amber: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    blue: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
    orange: "bg-sugu-50 text-sugu-600 border-sugu-200 dark:bg-sugu-950/30 dark:text-sugu-400 dark:border-sugu-800",
    gray: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
      styles[variant],
    )}>
      {children}
    </span>
  );
}

/** Primary pill button (orange) */
export function PillButton({
  children,
  variant = "primary",
  disabled,
  onClick,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "danger" | "danger-outline" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-sugu-500 text-white hover:bg-sugu-600",
    outline: "border border-gray-300 bg-white/50 backdrop-blur text-gray-700 hover:border-sugu-300 hover:text-sugu-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
    "danger-outline": "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20",
    ghost: "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(base, sizes, variants[variant], className)}
    >
      {children}
    </button>
  );
}

/** Info line (read-only key-value) */
export function InfoLine({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
      <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
        {label}
        {tooltip && (
          <span className="group relative cursor-help">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">i</span>
            <span className="invisible absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] text-white shadow-lg group-hover:visible dark:bg-gray-700">
              {tooltip}
            </span>
          </span>
        )}
      </span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

/** Mini inline toggle for notification event matrix */
export function MiniToggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200",
        checked ? "bg-sugu-500" : "bg-gray-200 dark:bg-gray-700",
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ width: "14px", height: "14px", transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}
