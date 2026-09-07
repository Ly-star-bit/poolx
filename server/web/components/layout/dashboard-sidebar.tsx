'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Boxes,
  Network,
  ScrollText,
  Users,
  Settings,
  FileInput,
  FileText,
} from 'lucide-react';

import { dashboardNavigation } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils/cn';
import { isNavigationItemActive } from '@/lib/utils/navigation';
import { useAppShellStore } from '@/store/app-shell';
import type { NavigationIconKey, NavigationItem } from '@/types/navigation';

function SidebarIcon({ icon }: { icon: NavigationIconKey }) {
  const className = 'h-4 w-4 shrink-0 transition-colors';

  switch (icon) {
    case 'home':
      return <LayoutDashboard className={className} />;
    case 'runtime':
      return <Activity className={className} />;
    case 'workspace':
      return <Boxes className={className} />;
    case 'node':
      return <Network className={className} />;
    case 'log':
      return <ScrollText className={className} />;
    case 'user':
      return <Users className={className} />;
    case 'setting':
      return <Settings className={className} />;
    case 'import':
      return <FileInput className={className} />;
    case 'file':
      return <FileText className={className} />;
    default:
      return <LayoutDashboard className={className} />;
  }
}

function SidebarNavItem({
  item,
  currentPath,
  isSidebarCollapsed,
  forceExpanded,
  onNavigate,
  depth = 0,
}: {
  item: NavigationItem;
  currentPath: string;
  isSidebarCollapsed: boolean;
  forceExpanded?: boolean;
  onNavigate?: () => void;
  depth?: number;
}) {
  const active = isNavigationItemActive(currentPath, item);
  const hasChildren = Boolean(item.children?.length);
  const showLabel = forceExpanded || !isSidebarCollapsed;

  return (
    <div className="space-y-1">
      <Link
        href={item.href}
        onClick={onNavigate}
        title={!showLabel ? item.label : undefined}
        className={cn(
          'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium transition-all',
          depth > 0 && 'ml-3',
          active
            ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] font-semibold'
            : 'text-[var(--foreground-secondary)] hover:bg-[var(--control-background-hover)] hover:text-[var(--foreground-primary)]',
        )}
      >
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center transition-colors',
            active
              ? 'text-[var(--brand-primary)]'
              : 'text-[var(--foreground-muted)] group-hover:text-[var(--foreground-primary)]',
          )}
        >
          <SidebarIcon icon={item.icon} />
        </span>
        {showLabel ? (
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        ) : null}
        {active && showLabel ? (
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
        ) : null}
      </Link>
      {showLabel && hasChildren ? (
        <div className="space-y-1">
          {item.children?.map((child) => (
            <SidebarNavItem
              key={child.href}
              item={child}
              currentPath={currentPath}
              isSidebarCollapsed={isSidebarCollapsed}
              forceExpanded={forceExpanded}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({
  currentPath,
  isSidebarCollapsed,
  forceExpanded = false,
  onNavigate,
}: {
  currentPath: string;
  isSidebarCollapsed: boolean;
  forceExpanded?: boolean;
  onNavigate?: () => void;
}) {
  const showLabel = forceExpanded || !isSidebarCollapsed;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
          PX
        </div>
        {showLabel ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-tight text-[var(--foreground-primary)]">
              PoolX
            </p>
            <p className="truncate text-[10px] text-[var(--foreground-muted)]">
              Control Plane
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {dashboardNavigation.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            currentPath={currentPath}
            isSidebarCollapsed={isSidebarCollapsed}
            forceExpanded={forceExpanded}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {showLabel ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2.5 text-[11px] text-[var(--foreground-muted)]">
          <p className="font-medium text-[var(--foreground-secondary)]">
            PoolX Core
          </p>
          <p className="mt-0.5 text-[10px]">Proxy Kernel Controller</p>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const currentPath = pathname ?? '/';
  const isSidebarCollapsed = useAppShellStore(
    (state) => state.isSidebarCollapsed,
  );
  const isMobileSidebarOpen = useAppShellStore(
    (state) => state.isMobileSidebarOpen,
  );
  const setMobileSidebarOpen = useAppShellStore(
    (state) => state.setMobileSidebarOpen,
  );

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentPath, setMobileSidebarOpen]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition-opacity duration-200 min-[1000px]:hidden',
          isMobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-[210px] overflow-hidden border-r border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-4 shadow-xl transition-transform duration-200 min-[1000px]:hidden',
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent
          currentPath={currentPath}
          isSidebarCollapsed={false}
          forceExpanded
          onNavigate={() => setMobileSidebarOpen(false)}
        />
      </aside>

      <aside
        className={cn(
          'sticky top-0 z-10 hidden h-screen shrink-0 overflow-hidden border-r border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-4 transition-all duration-200 min-[1000px]:block',
          isSidebarCollapsed ? 'w-[68px]' : 'w-[200px]',
        )}
      >
        <SidebarContent
          currentPath={currentPath}
          isSidebarCollapsed={isSidebarCollapsed}
        />
      </aside>
    </>
  );
}
