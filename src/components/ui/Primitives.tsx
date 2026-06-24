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

export function BrandedHeader({
  title,
  subtitle,
  overline = 'NoExcuses',
  right,
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="h-1.5 w-6 rounded-full bg-accent shadow-red-soft" />
          <p className="poster-overline">{overline}</p>
        </div>
        <h1 className="display-heading truncate text-[34px] leading-none text-zinc-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-zinc-500">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

export function HeroCard({
  overline,
  title,
  subtitle,
  image,
  children,
  className,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  image?: string;
  children?: ReactNode;
  className?: string;
}) {
  const resolvedImage = image?.startsWith('/redesign/')
    ? image.replace(/\.(?:jpe?g|png)$/i, '.svg')
    : image;

  return (
    <section
      className={classes(
        'cinematic-card relative min-h-[188px] overflow-hidden rounded-[18px] border border-accent/20 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]',
        className
      )}
      style={{
        backgroundImage: [
          'linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.58) 54%, rgba(0,0,0,0.2) 100%)',
          'linear-gradient(180deg, rgba(225,45,45,0.32), rgba(0,0,0,0.24))',
          resolvedImage ? `url("${resolvedImage}")` : 'linear-gradient(135deg, rgba(225,45,45,0.28), rgba(24,24,27,0.85))',
        ].join(', '),
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="relative z-10 flex min-h-[148px] flex-col justify-between">
        <div>
          {overline && <p className="poster-overline mb-2">{overline}</p>}
          <h2 className="display-heading max-w-[13ch] text-[38px] leading-[0.88] text-white">
            {title}
          </h2>
          {subtitle && <p className="mt-2 max-w-[230px] text-sm leading-relaxed text-zinc-300">{subtitle}</p>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}

export function CircularProgress({
  value,
  label,
  size = 86,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const normalized = Math.min(100, Math.max(0, value));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="9" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#E12D2D"
          strokeLinecap="round"
          strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display-heading text-2xl leading-none text-white">{Math.round(normalized)}%</span>
        {label && <span className="text-[9px] font-bold uppercase text-zinc-500">{label}</span>}
      </div>
    </div>
  );
}

export function PosterTabs<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={classes('flex gap-2 overflow-x-auto pb-1', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={classes(
              'min-h-10 shrink-0 rounded-full border px-4 text-[11px] font-extrabold uppercase transition-colors',
              selected
                ? 'border-accent bg-accent text-white shadow-red-soft'
                : 'border-white/10 bg-black/30 text-zinc-500'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={classes('athletic-panel min-w-0 rounded-[16px] p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2 text-zinc-500">
        <span className="poster-overline text-zinc-500">{label}</span>
        {icon}
      </div>
      <p className="display-heading truncate text-[34px] leading-none text-white">{value}</p>
      {detail && <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}

export function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] border border-white/10 bg-white/[0.04] px-2 text-zinc-300 transition-colors active:bg-white/[0.08]"
    >
      {icon}
      <span className="max-w-full truncate text-[10px] font-bold uppercase">{label}</span>
    </button>
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
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  tone?: 'red' | 'neutral' | 'cyan' | 'green' | 'amber';
}) {
  const toneClass = {
    red: 'border-accent/20 bg-accent/[0.06]',
    neutral: 'border-white/[0.07] bg-surface',
    cyan: 'border-cyan-400/20 bg-cyan-400/[0.06]',
    green: 'border-green-500/20 bg-green-500/[0.06]',
    amber: 'border-amber-400/20 bg-amber-400/[0.06]',
  }[tone];

  return (
    <div className={classes('min-w-0 rounded-xl border p-3.5', toneClass)}>
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
