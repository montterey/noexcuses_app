import { ButtonHTMLAttributes, ReactNode } from 'react';

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-red-soft" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-accent">
              {eyebrow}
            </p>
          </div>
        )}
        <h1 className="display-heading text-2xl leading-tight text-zinc-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-zinc-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function AppCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classes(
        'rounded-xl border border-white/[0.07] bg-surface shadow-[0_12px_36px_rgba(0,0,0,0.18)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  trailing,
}: {
  title: string;
  eyebrow?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
            {eyebrow}
          </p>
        )}
        <h2 className="display-heading text-lg leading-tight text-zinc-100">{title}</h2>
      </div>
      {trailing}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'red',
  className,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  tone?: 'red' | 'neutral' | 'cyan' | 'green' | 'amber';
  className?: string;
}) {
  const toneClass = {
    red: 'border-accent/20 bg-accent/[0.06]',
    neutral: 'border-white/[0.07] bg-surface',
    cyan: 'border-cyan-400/20 bg-cyan-400/[0.06]',
    green: 'border-green-500/20 bg-green-500/[0.06]',
    amber: 'border-amber-400/20 bg-amber-400/[0.06]',
  }[tone];

  return (
    <div className={classes('min-w-0 rounded-xl border p-3.5', toneClass, className)}>
      <div className="mb-2 flex items-center justify-between gap-2 text-zinc-500">
        <span className="text-[10px] font-bold uppercase tracking-[0.04em]">{label}</span>
        {icon}
      </div>
      <p className="display-heading truncate text-2xl leading-none text-zinc-100">{value}</p>
      {detail && <p className="mt-1.5 truncate text-[11px] text-zinc-500">{detail}</p>}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = 'red',
  className,
}: {
  value: number;
  tone?: 'red' | 'cyan' | 'green' | 'amber';
  className?: string;
}) {
  const fill = {
    red: 'bg-accent',
    cyan: 'bg-cyan-400',
    green: 'bg-green-500',
    amber: 'bg-amber-400',
  }[tone];
  const width = Math.min(100, Math.max(0, value));

  return (
    <div className={classes('h-1.5 overflow-hidden rounded-full bg-white/[0.07]', className)}>
      <div
        className={classes('h-full rounded-full transition-[width] duration-300', fill)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={classes(
        'min-h-11 rounded-lg bg-accent px-4 py-3 font-semibold text-white shadow-red-soft transition-colors hover:bg-accent-600 active:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={classes(
        'min-h-11 rounded-lg border border-white/10 bg-surface-light px-4 py-3 font-semibold text-zinc-300 transition-colors hover:border-white/15 hover:bg-white/[0.07] active:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-45',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={classes(
        'grid gap-1 rounded-xl border border-white/[0.06] bg-[#0D0D0E] p-1',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={classes(
              'flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors',
              selected
                ? 'bg-accent text-white shadow-red-soft'
                : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'red' | 'cyan' | 'green' | 'amber';
}) {
  const toneClass = {
    neutral: 'border-white/10 bg-white/[0.04] text-zinc-400',
    red: 'border-accent/20 bg-accent/10 text-red-300',
    cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
    green: 'border-green-500/20 bg-green-500/10 text-green-300',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  }[tone];

  return (
    <span
      className={classes(
        'inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-medium',
        toneClass
      )}
    >
      {children}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  tone = 'red',
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'red' | 'cyan' | 'green' | 'amber';
  label?: string;
  sublabel?: string;
}) {
  const colorClass = {
    red: '#E12D2D',
    cyan: '#38BDF8',
    green: '#22C55E',
    amber: '#F59E0B',
  }[tone];
  const backgroundClass = {
    red: 'rgba(225,45,45,0.12)',
    cyan: 'rgba(56,189,248,0.12)',
    green: 'rgba(34,197,94,0.12)',
    amber: 'rgba(245,158,11,0.12)',
  }[tone];
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={backgroundClass}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorClass}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display-heading text-lg leading-none text-zinc-100">{Math.round(value)}%</span>
        </div>
      </div>
      {label && (
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.02em] text-zinc-500">{label}</p>
      )}
      {sublabel && (
        <p className="text-[10px] text-zinc-600">{sublabel}</p>
      )}
    </div>
  );
}

export function GlowCard({
  children,
  className,
  tone = 'red',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'red' | 'cyan' | 'green' | 'amber';
}) {
  const glowClass = {
    red: 'before:via-accent/[0.07]',
    cyan: 'before:via-cyan-400/[0.07]',
    green: 'before:via-green-500/[0.07]',
    amber: 'before:via-amber-400/[0.07]',
  }[tone];
  const borderClass = {
    red: 'border-accent/20',
    cyan: 'border-cyan-400/20',
    green: 'border-green-500/20',
    amber: 'border-amber-400/20',
  }[tone];

  return (
    <div
      className={classes(
        'relative overflow-hidden rounded-xl border bg-surface',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-transparent',
        'before:pointer-events-none',
        borderClass,
        glowClass,
        className
      )}
    >
      {children}
    </div>
  );
}
