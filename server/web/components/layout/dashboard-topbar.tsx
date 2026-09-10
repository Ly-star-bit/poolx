'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getRuntimeStatus } from '@/features/runtime/api/runtime';
import { cn } from '@/lib/utils/cn';
import { useAppShellStore } from '@/store/app-shell';

export function DashboardTopbar() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const toggleSidebar = useAppShellStore((state) => state.toggleSidebar);
  const isMobileSidebarOpen = useAppShellStore(
    (state) => state.isMobileSidebarOpen,
  );
  const setMobileSidebarOpen = useAppShellStore(
    (state) => state.setMobileSidebarOpen,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isRoot = (user?.role ?? 0) >= 100;

  const runtimeStatusQuery = useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: getRuntimeStatus,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsUserMenuOpen(false);
    await logout();
    router.replace('/login');
  };

  const handleSidebarToggle = () => {
    if (window.innerWidth < 1000) {
      setMobileSidebarOpen(!isMobileSidebarOpen);
      return;
    }

    toggleSidebar();
  };

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-[var(--border-default)] bg-[var(--surface-panel)]/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSidebarToggle}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--foreground-secondary)] transition hover:bg-[var(--control-background-hover)] hover:text-[var(--foreground-primary)] active:scale-95"
              aria-label="切换侧边栏"
            >
              <Menu className="h-4 w-4" />
            </button>

            <Link
              href="/runtime"
              className={cn(
                'hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:scale-[1.02]',
                runtimeStatusQuery.data?.running
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                  : 'border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  runtimeStatusQuery.data?.running
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-400'
                )}
              />
              <span>
                {runtimeStatusQuery.data?.running ? '内核运行中' : '内核已停止'}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-[var(--foreground-secondary)]">
            <ThemeToggle />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((value) => !value)}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2.5 text-[var(--foreground-primary)] transition hover:bg-[var(--control-background-hover)] hover:border-[var(--border-strong)]"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[10px] font-bold text-[var(--brand-primary)]">
                  {(user?.display_name || user?.username || 'U')
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <span className="hidden sm:inline font-medium">
                  {user?.display_name || user?.username || '用户'}
                </span>
              </button>

              {isUserMenuOpen ? (
                <div className="absolute top-[calc(100%+0.5rem)] right-0 w-52 rounded-xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-1.5 shadow-xl backdrop-blur-md">
                  <div className="rounded-lg px-3 py-2 border-b border-[var(--border-default)] mb-1">
                    <p className="text-xs font-semibold text-[var(--foreground-primary)] truncate">
                      {user?.display_name || user?.username || '用户'}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-[11px] text-[var(--foreground-muted)] truncate">
                        @{user?.username || 'guest'}
                      </span>
                      <span className="text-[10px] rounded px-1.5 py-0.2 bg-[var(--control-background)] text-[var(--foreground-secondary)] font-medium">
                        {isRoot ? '管理员' : '普通用户'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--status-danger-foreground)] transition hover:bg-[var(--status-danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{isLoggingOut ? '退出中...' : '退出登录'}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
  );
}
