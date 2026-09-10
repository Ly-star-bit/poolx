import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export function AuthFormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className='space-y-1.5'>
      <span className='block text-xs font-medium text-[var(--foreground-secondary)]'>{label}</span>
      {children}
      {hint ? <span className='block text-xs text-[var(--foreground-muted)]'>{hint}</span> : null}
    </div>
  );
}

export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--foreground-primary)] outline-none transition placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15 disabled:cursor-not-allowed disabled:opacity-60',
        props.className,
      )}
    />
  );
}

export function AuthButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-sky-600 dark:to-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[var(--brand-primary)]/20 hover:brightness-105 active:scale-[0.99] transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
        className,
      )}
    />
  );
}

export function SecondaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] transition hover:bg-[var(--control-background-hover)] hover:border-[var(--border-strong)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
        className,
      )}
    />
  );
}
