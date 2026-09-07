import { cn } from '@/lib/utils/cn';

const variantClasses = {
  success:
    'border-[var(--status-success-border)] bg-[var(--status-success-soft)] text-[var(--status-success-foreground)]',
  warning:
    'border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] text-[var(--status-warning-foreground)]',
  danger:
    'border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] text-[var(--status-danger-foreground)]',
  info: 'border-[var(--status-info-border)] bg-[var(--status-info-soft)] text-[var(--status-info-foreground)]',
} as const;

const dotClasses = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
} as const;

interface StatusBadgeProps {
  label: string;
  variant?: keyof typeof variantClasses;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  dot?: boolean;
}

export function StatusBadge({
  label,
  variant = 'info',
  className,
  onClick,
  disabled = false,
  dot = false,
}: StatusBadgeProps) {
  const badgeClassName = cn(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide',
    variantClasses[variant],
    onClick
      ? 'cursor-pointer transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60'
      : undefined,
    className,
  );

  const content = (
    <>
      {dot ? (
        <span
          className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', dotClasses[variant])}
          aria-hidden="true"
        />
      ) : null}
      {label}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={badgeClassName}
      >
        {content}
      </button>
    );
  }

  return <span className={badgeClassName}>{content}</span>;
}
