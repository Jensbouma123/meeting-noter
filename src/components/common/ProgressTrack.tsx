'use client';

/** ACCIVA ships no progress bar; `value === null` renders an indeterminate pulse. */
export function ProgressTrack({
  value,
  label,
  className,
  barClassName,
}: {
  value: number | null;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  const track = `h-1.5 w-full overflow-hidden rounded-full bg-elevation-2 ${className ?? ''}`;
  if (value === null) {
    return (
      <div role="progressbar" aria-label={label} className={track}>
        <div className="h-full w-full bg-primary-500/40 motion-safe:animate-pulse" />
      </div>
    );
  }
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={track}
    >
      <div
        className={`h-full transition-all duration-300 ${barClassName ?? 'bg-primary-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
