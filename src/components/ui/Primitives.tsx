import { ButtonHTMLAttributes, ReactNode } from 'react';

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function AppCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classes('rounded-xl border border-white/[0.07] bg-surface', className)}>
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
          <p className="mb-1 text-[10px] font-bold uppercase text-accent">{eyebrow}</p>
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
  tone?: 'red' | 'neutral' | 'cyan';
}) {
  const toneClass = tone === 'cyan'
    ? 'border-cyan-400/20 bg-cyan-400/[0.06]'
    : tone === 'red'
      ? 'border-accent/20 bg-accent/[0.06]'
      : 'border-white/[0.07] bg-surface';

  return (
    <div className={classes('min-w-0 rounded-xl border p-3.5', toneClass)}>
      <div className="mb-2 flex items-center justify-between gap-2 text-zinc-500">
        <span className="text-[10px] font-bold uppercase">{label}</span>
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
  tone?: 'red' | 'cyan' | 'green';
  className?: string;
}) {
  const fill = tone === 'cyan' ? 'bg-cyan-400' : tone === 'green' ? 'bg-green-500' : 'bg-accent';
  const width = Math.min(100, Math.max(0, value));

  return (
    <div className={classes('h-1.5 overflow-hidden rounded-full bg-white/[0.07]', className)}>
      <div className={classes('h-full rounded-full transition-[width] duration-300', fill)} style={{ width: `${width}%` }} />
    </div>
  );
}

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={classes(
        'rounded-lg bg-accent px-4 py-3 font-semibold text-white shadow-red-soft transition-colors hover:bg-accent-600 active:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
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
    <span className={classes('inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-medium', toneClass)}>
      {children}
    </span>
  );
}
