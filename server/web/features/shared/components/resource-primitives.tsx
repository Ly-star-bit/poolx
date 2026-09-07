import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { HelpCircle } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

interface ResourceFieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  tooltip?: string;
  children: ReactNode;
}

function FieldTooltip({ content }: { content: string }) {
  return (
    <span className="group/tooltip relative inline-flex items-center">
      <span className="inline-flex cursor-help text-[var(--foreground-muted)] transition hover:text-[var(--foreground-primary)]">
        <HelpCircle className="h-3.5 w-3.5" />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-xs leading-5 text-[var(--foreground-secondary)] opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-150 group-hover/tooltip:opacity-100">
        {content}
      </span>
    </span>
  );
}

export function ResourceField({
  label,
  hint,
  error,
  className,
  tooltip,
  children,
}: ResourceFieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground-secondary)]">
        <span>{label}</span>
        {tooltip ? <FieldTooltip content={tooltip} /> : null}
      </span>
      {children}
      {error ? (
        <span className="block text-xs font-medium text-[var(--status-danger-foreground)]">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-xs text-[var(--foreground-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function ResourceInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground-primary)] transition outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50',
        props.className,
      )}
    />
  );
}

export function ResourceTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-24 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground-primary)] transition outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50',
        props.className,
      )}
    />
  );
}

export function ResourceSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground-primary)] transition outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50',
        props.className,
      )}
    />
  );
}

function baseButtonClassName(className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
    className,
  );
}

export function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={baseButtonClassName(
        cn(
          'bg-[var(--brand-primary)] text-white shadow-sm hover:brightness-110 active:brightness-95',
          className,
        ),
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
      className={baseButtonClassName(
        cn(
          'border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--foreground-primary)] hover:bg-[var(--control-background-hover)] hover:border-[var(--border-strong)]',
          className,
        ),
      )}
    />
  );
}

export function DangerButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={baseButtonClassName(
        cn(
          'border border-[var(--status-danger-border)] bg-[var(--status-danger-soft)] text-[var(--status-danger-foreground)] hover:bg-rose-500/20',
          className,
        ),
      )}
    />
  );
}

export function GhostButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={baseButtonClassName(
        cn(
          'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--control-background-hover)]',
          className,
        ),
      )}
    />
  );
}

interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  tooltip?: string;
  onChange: (checked: boolean) => void;
}

export function ToggleField({
  label,
  description,
  checked,
  disabled,
  tooltip,
  onChange,
}: ToggleFieldProps) {
  return (
    <label className="flex self-start cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2.5 transition hover:border-[var(--border-strong)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)]"
      />
      <span className="flex flex-col">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground-primary)]">
          <span>{label}</span>
          {tooltip ? <FieldTooltip content={tooltip} /> : null}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-4 text-[var(--foreground-muted)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function CodeBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-xs font-mono leading-relaxed text-[var(--foreground-primary)]',
        className,
      )}
    >
      {children}
    </pre>
  );
}
