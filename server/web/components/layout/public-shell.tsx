'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

interface PublicShellProps {
  children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className='relative flex min-h-screen flex-col justify-between bg-[var(--background-default)] overflow-hidden'>
      {/* Background ambient lighting effects */}
      <div className='pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_top,var(--brand-primary-soft)_0%,transparent_70%)] opacity-70 dark:opacity-30 blur-3xl' />
      <div className='pointer-events-none absolute bottom-0 right-0 w-[500px] h-[400px] bg-[radial-gradient(circle,var(--brand-secondary-soft)_0%,transparent_70%)] opacity-50 dark:opacity-20 blur-3xl' />
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-40 dark:opacity-20' />

      {/* Top Floating Header */}
      <header className='relative z-10 flex items-center justify-between px-6 py-4'>
        <Link href='/' className='inline-flex items-center gap-2.5 transition hover:opacity-85'>
          <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-secondary)] text-xs font-black text-white shadow-md shadow-[var(--brand-primary)]/20'>
            PX
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-bold tracking-tight text-[var(--foreground-primary)] leading-tight'>
              PoolX
            </span>
            <span className='text-[10px] text-[var(--foreground-muted)] leading-tight'>
              Control Plane
            </span>
          </div>
        </Link>
        <div className='flex items-center gap-3'>
          <Link
            href='/about'
            className='text-xs font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] transition'
          >
            关于
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className='relative z-10 flex flex-1 items-center justify-center px-4 py-8'>
        {children}
      </main>

      {/* Subtle Footer */}
      <footer className='relative z-10 py-4 text-center text-xs text-[var(--foreground-muted)]'>
        <span>PoolX Core · Proxy Kernel Control Plane</span>
      </footer>
    </div>
  );
}
