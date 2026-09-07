import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface AppCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function AppCard({
  title,
  description,
  action,
  className,
  children,
  ...props
}: AppCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-sm backdrop-blur-sm transition-all',
        className,
      )}
      {...props}
    >
      {(title || description || action) && (
        <header className="flex flex-col gap-2 border-b border-[var(--border-default)] px-5 py-3.5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-0.5">
            {title ? (
              <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground-primary)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-xs text-[var(--foreground-secondary)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
