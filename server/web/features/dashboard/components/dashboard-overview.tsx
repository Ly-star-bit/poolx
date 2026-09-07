'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Boxes,
  ExternalLink,
  Network,
  Play,
  RotateCw,
  ShieldCheck,
  Square,
  Zap,
} from 'lucide-react';

import { EmptyState } from '@/components/feedback/empty-state';
import { InlineMessage } from '@/components/feedback/inline-message';
import { AppCard } from '@/components/ui/app-card';
import { getKernelCapability } from '@/features/capability/api/capability';
import { getProxyNodes, testAllProxyNodes } from '@/features/nodes/api/nodes';
import { groupNodesByRegion } from '@/features/nodes/lib/region';
import {
  getRuntimeStatus,
  reloadRuntime,
  startRuntime,
  stopRuntime,
} from '@/features/runtime/api/runtime';
import {
  PrimaryButton,
  SecondaryButton,
} from '@/features/shared/components/resource-primitives';
import { getPortProfiles } from '@/features/workspace/api/workspace';
import { formatDateTime } from '@/lib/utils/date';

export function DashboardOverview() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger' | 'info';
    message: string;
  } | null>(null);

  const capabilityQuery = useQuery({
    queryKey: ['capability'],
    queryFn: getKernelCapability,
  });

  const statusQuery = useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: getRuntimeStatus,
    refetchInterval: 5000,
  });

  const nodesQuery = useQuery({
    queryKey: ['proxy-nodes', 'list', 'dashboard'],
    queryFn: () => getProxyNodes({ page: 0, pageSize: 0 }),
  });

  const profilesQuery = useQuery({
    queryKey: ['workspace', 'profiles', 'dashboard'],
    queryFn: getPortProfiles,
  });

  const startMutation = useMutation({
    mutationFn: startRuntime,
    onSuccess: (status) => {
      queryClient.setQueryData(['runtime', 'status'], status);
      setFeedback({ tone: 'success', message: 'Mihomo 内核启动成功。' });
      void queryClient.invalidateQueries({ queryKey: ['runtime'] });
    },
    onError: (err) => {
      setFeedback({
        tone: 'danger',
        message: err instanceof Error ? err.message : '启动内核失败。',
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopRuntime,
    onSuccess: (status) => {
      queryClient.setQueryData(['runtime', 'status'], status);
      setFeedback({ tone: 'info', message: 'Mihomo 内核已停止。' });
      void queryClient.invalidateQueries({ queryKey: ['runtime'] });
    },
    onError: (err) => {
      setFeedback({
        tone: 'danger',
        message: err instanceof Error ? err.message : '停止内核失败。',
      });
    },
  });

  const reloadMutation = useMutation({
    mutationFn: reloadRuntime,
    onSuccess: (status) => {
      queryClient.setQueryData(['runtime', 'status'], status);
      setFeedback({ tone: 'success', message: 'Mihomo 内核配置热重载成功。' });
      void queryClient.invalidateQueries({ queryKey: ['runtime'] });
    },
    onError: (err) => {
      setFeedback({
        tone: 'danger',
        message: err instanceof Error ? err.message : '热重载失败。',
      });
    },
  });

  const testAllMutation = useMutation({
    mutationFn: () => testAllProxyNodes({}),
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.status === 'success').length;
      setFeedback({
        tone: 'success',
        message: `全量测速完成：共测试 ${results.length} 个节点，成功 ${successCount} 个。`,
      });
      void queryClient.invalidateQueries({ queryKey: ['proxy-nodes'] });
    },
    onError: (err) => {
      setFeedback({
        tone: 'danger',
        message: err instanceof Error ? err.message : '测速请求失败。',
      });
    },
  });

  const nodes = useMemo(() => nodesQuery.data ?? [], [nodesQuery.data]);
  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const status = statusQuery.data;
  const isRunning = Boolean(status?.running);

  // Compute node stats
  const {
    totalNodes,
    enabledNodes,
    testedNodes,
    passedNodes,
    failedNodes,
    healthRate,
    avgLatency,
    protocolCounts,
    regionGroups,
  } = useMemo(() => {
    const total = nodes.length;
    const enabled = nodes.filter((n) => n.enabled).length;
    const tested = nodes.filter((n) => n.last_test_status !== 'unknown');
    const passed = nodes.filter((n) => n.last_test_status === 'success');
    const failed = nodes.filter((n) => n.last_test_status === 'failed');

    const rate =
      tested.length > 0
        ? Math.round((passed.length / tested.length) * 100)
        : total > 0
          ? 0
          : 100;

    let latencySum = 0;
    let latencyCount = 0;
    for (const node of passed) {
      if (node.last_latency_ms !== undefined && node.last_latency_ms > 0) {
        latencySum += node.last_latency_ms;
        latencyCount++;
      }
    }
    const avg = latencyCount > 0 ? Math.round(latencySum / latencyCount) : null;

    // Protocol breakdown
    const protoMap: Record<string, number> = {};
    for (const node of nodes) {
      const t = (node.type || 'other').toUpperCase();
      protoMap[t] = (protoMap[t] || 0) + 1;
    }

    // Region groups
    const regions = groupNodesByRegion(nodes).slice(0, 6);

    return {
      totalNodes: total,
      enabledNodes: enabled,
      testedNodes: tested.length,
      passedNodes: passed.length,
      failedNodes: failed.length,
      healthRate: rate,
      avgLatency: avg,
      protocolCounts: protoMap,
      regionGroups: regions,
    };
  }, [nodes]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-[var(--foreground-primary)]">
              代理池控制中台
            </h1>
            <span
              className={
                isRunning
                  ? 'inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'inline-flex items-center gap-1 rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-500'
              }
            >
              <span
                className={
                  isRunning
                    ? 'h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse'
                    : 'h-1.5 w-1.5 rounded-full bg-slate-400'
                }
              />
              {isRunning ? '内核在线' : '内核未运行'}
            </span>
          </div>
          <p className="text-xs text-[var(--foreground-secondary)]">
            实时监控 Mihomo 内核进程、监听端口、代理节点健康状态与编排策略。
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <>
              <SecondaryButton
                type="button"
                onClick={() => reloadMutation.mutate()}
                disabled={reloadMutation.isPending}
                title="热重载当前运行配置"
              >
                <RotateCw
                  className={`h-3.5 w-3.5 ${reloadMutation.isPending ? 'animate-spin' : ''}`}
                />
                <span>{reloadMutation.isPending ? '重载中' : '热重载'}</span>
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
              >
                <Square className="h-3.5 w-3.5" />
                <span>{stopMutation.isPending ? '停止中' : '停止内核'}</span>
              </SecondaryButton>
            </>
          ) : (
            <PrimaryButton
              type="button"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{startMutation.isPending ? '启动中...' : '启动内核'}</span>
            </PrimaryButton>
          )}

          <SecondaryButton
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  '将对全部已导入节点发起测速请求，确认继续执行？',
                )
              ) {
                testAllMutation.mutate();
              }
            }}
            disabled={testAllMutation.isPending || totalNodes === 0}
          >
            <Zap
              className={`h-3.5 w-3.5 ${testAllMutation.isPending ? 'animate-pulse text-amber-500' : ''}`}
            />
            <span>{testAllMutation.isPending ? '测速中...' : '全量测速'}</span>
          </SecondaryButton>

          <SecondaryButton
            type="button"
            onClick={() =>
              window.open('/zashboard/', '_blank', 'noopener,noreferrer')
            }
            disabled={!isRunning}
            title="打开 Clash 外部控制器面板"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clash 面板</span>
          </SecondaryButton>
        </div>
      </div>

      {feedback ? (
        <InlineMessage tone={feedback.tone} message={feedback.message} />
      ) : null}
      {capabilityQuery.data && !capabilityQuery.data.binary_exists ? (
        <InlineMessage tone="danger" message={capabilityQuery.data.message} />
      ) : null}

      {/* 4 Key Metrics Overview Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Metric 1: 节点总数 */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--foreground-muted)]">
              节点总数
            </span>
            <span className="rounded-md bg-sky-500/10 p-1.5 text-sky-600 dark:text-sky-400">
              <Network className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--foreground-primary)]">
              {totalNodes}
            </span>
            <span className="text-xs text-[var(--foreground-secondary)]">
              ({enabledNodes} 启用)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
            <Link
              href="/nodes"
              className="inline-flex items-center gap-1 hover:text-[var(--brand-primary)]"
            >
              管理节点池 <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Metric 2: 测速健康率 */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--foreground-muted)]">
              测速健康率
            </span>
            <span className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {healthRate}%
            </span>
            <span className="text-xs text-[var(--foreground-secondary)]">
              ({passedNodes}/{testedNodes || 0} 可用)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
            {failedNodes > 0 ? (
              <span className="text-rose-500">{failedNodes} 个测试失败</span>
            ) : (
              <span>全部节点连通正常</span>
            )}
          </div>
        </div>

        {/* Metric 3: 平均可用延迟 */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--foreground-muted)]">
              平均测速延迟
            </span>
            <span className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <Zap className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--foreground-primary)]">
              {avgLatency !== null ? `${avgLatency}` : '--'}
            </span>
            {avgLatency !== null ? (
              <span className="text-xs text-[var(--foreground-muted)]">ms</span>
            ) : null}
          </div>
          <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
            {avgLatency !== null ? (
              avgLatency < 200 ? (
                <span className="text-emerald-500">网络连接极其畅通</span>
              ) : avgLatency < 500 ? (
                <span className="text-amber-500">网络质量良好</span>
              ) : (
                <span className="text-rose-500">延迟偏高</span>
              )
            ) : (
              '暂无成功测速数据'
            )}
          </div>
        </div>

        {/* Metric 4: 编排端口 */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--foreground-muted)]">
              监听端口入口
            </span>
            <span className="rounded-md bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
              <Boxes className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--foreground-primary)]">
              {status?.listener_count ?? profiles.length}
            </span>
            <span className="text-xs text-[var(--foreground-secondary)]">
              ({profiles.filter((p) => p.profile.include_in_runtime).length} 运行时生效)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1 hover:text-[var(--brand-primary)]"
            >
              配置端口与策略 <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Middle Section: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: 内核运行状态面板 */}
        <AppCard
          title="内核运行实例"
          description="本地 Mihomo 二进制进程、控制地址与配置挂载摘要。"
          action={
            <Link
              href="/runtime"
              className="text-xs text-[var(--brand-primary)] hover:underline"
            >
              详情与日志 →
            </Link>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-2.5">
                <span className="text-[var(--foreground-muted)]">进程状态</span>
                <p className="mt-1 font-semibold text-[var(--foreground-primary)]">
                  {isRunning ? '🟢 正在运行' : '⚪ 已停止'}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-2.5">
                <span className="text-[var(--foreground-muted)]">进程 PID</span>
                <p className="mt-1 font-mono font-semibold text-[var(--foreground-primary)]">
                  {status?.instance?.pid ?? '--'}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-2.5">
                <span className="text-[var(--foreground-muted)]">控制接口</span>
                <p className="mt-1 font-mono font-semibold text-[var(--foreground-primary)] truncate">
                  {status?.instance?.controller_address || '127.0.0.1:19090'}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-2.5">
                <span className="text-[var(--foreground-muted)]">API 版本</span>
                <p className="mt-1 font-semibold text-[var(--foreground-primary)] truncate">
                  {status?.api_version || '未就绪'}
                </p>
              </div>
            </div>

            <div className="space-y-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--foreground-secondary)]">
              <div className="flex justify-between">
                <span>最近动作：</span>
                <span className="font-medium text-[var(--foreground-primary)]">
                  {status?.instance?.last_action || '无'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>启动时间：</span>
                <span>
                  {status?.instance?.last_started_at
                    ? formatDateTime(status.instance.last_started_at)
                    : '--'}
                </span>
              </div>
              {status?.instance?.last_error ? (
                <div className="mt-1 border-t border-[var(--border-default)] pt-1 text-rose-500">
                  <span>最近错误：</span>
                  <span>{status.instance.last_error}</span>
                </div>
              ) : null}
            </div>
          </div>
        </AppCard>

        {/* Right Column: 协议与地区分布 */}
        <AppCard
          title="节点池分布"
          description="已导入节点的协议类型构成及按地区聚合概览。"
          action={
            <Link
              href="/nodes"
              className="text-xs text-[var(--brand-primary)] hover:underline"
            >
              节点池 →
            </Link>
          }
        >
          <div className="space-y-4">
            {/* Protocol Pills */}
            <div>
              <span className="text-xs font-medium text-[var(--foreground-muted)]">
                协议类型构成
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.keys(protocolCounts).length === 0 ? (
                  <span className="text-xs text-[var(--foreground-muted)]">
                    暂无节点
                  </span>
                ) : (
                  Object.entries(protocolCounts).map(([proto, count]) => (
                    <span
                      key={proto}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-primary)]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                      <span>{proto}</span>
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        {count}
                      </span>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Region Bars */}
            <div>
              <span className="text-xs font-medium text-[var(--foreground-muted)]">
                主要地区分布
              </span>
              <div className="mt-2 space-y-2">
                {regionGroups.length === 0 ? (
                  <span className="text-xs text-[var(--foreground-muted)]">
                    暂无地区分组数据
                  </span>
                ) : (
                  regionGroups.map((group) => {
                    const pct =
                      totalNodes > 0
                        ? Math.round((group.nodes.length / totalNodes) * 100)
                        : 0;
                    return (
                      <div key={group.region} className="space-y-1 text-xs">
                        <div className="flex justify-between text-[var(--foreground-secondary)]">
                          <span className="font-medium">{group.region}</span>
                          <span>
                            {group.nodes.length} 个 ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-default)]">
                          <div
                            className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      {/* Bottom Section: Active Port Profiles */}
      <AppCard
        title="工作台端口配置"
        description="每个端口配置映射为一个独立的监听入口，并绑定相应的策略组与候选节点池。"
        action={
          <Link
            href="/workspace"
            className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
          >
            编辑端口与编排 →
          </Link>
        }
      >
        {profiles.length === 0 ? (
          <EmptyState
            title="暂无端口配置"
            description="点击下方链接前往工作台创建您的第一个端口与分流策略。"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map(({ profile, node_ids }) => (
              <div
                key={profile.id}
                className="flex flex-col justify-between rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3.5 transition hover:border-[var(--border-strong)]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--foreground-primary)]">
                      {profile.name}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        profile.include_in_runtime
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-500/10 text-slate-500'
                      }`}
                    >
                      {profile.include_in_runtime ? '启用' : '未挂载'}
                    </span>
                  </div>

                  <div className="text-xs text-[var(--foreground-secondary)] space-y-0.5">
                    <p>
                      端口：
                      <span className="font-mono font-medium text-[var(--foreground-primary)]">
                        {profile.mixed_port
                          ? `${profile.mixed_port} (Mixed)`
                          : `Socks:${profile.socks_port} / HTTP:${profile.http_port}`}
                      </span>
                    </p>
                    <p>
                      分流策略：
                      <span className="font-medium text-[var(--foreground-primary)]">
                        {profile.proxy_settings.strategy_type}
                      </span>
                    </p>
                    <p>绑定节点：{node_ids?.length ?? 0} 个</p>
                  </div>
                </div>

                <div className="mt-3 border-t border-[var(--border-default)] pt-2 text-right">
                  <Link
                    href={`/workspace?id=${profile.id}`}
                    className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
                  >
                    配置策略 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
