'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Play,
  Radio,
  RotateCw,
  Square,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { InlineMessage } from '@/components/feedback/inline-message';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { AppCard } from '@/components/ui/app-card';
import { getKernelCapability } from '@/features/capability/api/capability';
import {
  getRuntimeLogs,
  getRuntimeStatus,
  reloadRuntime,
  startRuntime,
  stopRuntime,
} from '@/features/runtime/api/runtime';
import type { RuntimeLogItem } from '@/features/runtime/types';
import {
  CodeBlock,
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from '@/features/shared/components/resource-primitives';
import { formatDateTime } from '@/lib/utils/date';

const runtimeStatusQueryKey = ['runtime', 'status'] as const;

type FeedbackState = {
  tone: 'success' | 'danger' | 'info';
  message: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '运行控制请求失败，请稍后重试。';
}

function mergeLogs(existing: RuntimeLogItem[], incoming: RuntimeLogItem[]) {
  if (incoming.length === 0) {
    return existing;
  }
  const result = [...existing];
  const seen = new Set(existing.map((item) => item.seq));
  for (const item of incoming) {
    if (!seen.has(item.seq)) {
      result.push(item);
    }
  }
  return result.slice(-300);
}

export function RuntimePage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [logs, setLogs] = useState<RuntimeLogItem[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const capabilityQuery = useQuery({
    queryKey: ['capability'],
    queryFn: getKernelCapability,
  });
  const statusQuery = useQuery({
    queryKey: runtimeStatusQueryKey,
    queryFn: getRuntimeStatus,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const logsQuery = useQuery({
    queryKey: ['runtime', 'logs', 0],
    queryFn: () => getRuntimeLogs(0, 100),
  });

  useEffect(() => {
    if (logsQuery.data?.items) {
      setLogs(logsQuery.data.items);
    }
  }, [logsQuery.data]);

  const lastSeq = logs.length > 0 ? logs[logs.length - 1].seq : 0;

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const timer = window.setInterval(async () => {
      try {
        const response = await getRuntimeLogs(lastSeq, 100);
        if (response.items.length > 0) {
          setLogs((current) => mergeLogs(current, response.items));
        }
      } catch {
        // keep runtime page usable during transient polling failures
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, lastSeq]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const startMutation = useMutation({
    mutationFn: startRuntime,
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Mihomo 内核已成功启动。' });
      await queryClient.invalidateQueries({ queryKey: runtimeStatusQueryKey });
      const response = await getRuntimeLogs(0, 100);
      setLogs(response.items);
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopRuntime,
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Mihomo 内核已安全停止。' });
      await queryClient.invalidateQueries({ queryKey: runtimeStatusQueryKey });
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const reloadMutation = useMutation({
    mutationFn: reloadRuntime,
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: 'Mihomo 已执行配置热重载。' });
      await queryClient.invalidateQueries({ queryKey: runtimeStatusQueryKey });
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const status = statusQuery.data;
  const capability = capabilityQuery.data;
  const listenerSummary = useMemo(() => status?.listeners ?? [], [status?.listeners]);

  if (statusQuery.isLoading) {
    return <LoadingState />;
  }

  if (statusQuery.isError || !status) {
    return (
      <ErrorState
        title="运行状态加载失败"
        description={getErrorMessage(statusQuery.error)}
      />
    );
  }

  const getLogLevelClass = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes('err') || l.includes('fatal')) {
      return 'text-rose-400 bg-rose-500/10';
    }
    if (l.includes('warn')) {
      return 'text-amber-400 bg-amber-500/10';
    }
    if (l.includes('info')) {
      return 'text-sky-400 bg-sky-500/10';
    }
    return 'text-slate-400 bg-slate-500/10';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="内核运行"
        description="聚合工作台端口配置后生成最终 Mihomo 配置文件，并在此执行进程启停、热重载与实时控制台日志跟踪。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              type="button"
              onClick={() => {
                setFeedback(null);
                startMutation.mutate();
              }}
              disabled={startMutation.isPending || status.running || !capability?.supports_start}
              className="inline-flex items-center gap-1.5"
            >
              {startMutation.isPending ? (
                <RotateCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {startMutation.isPending ? '启动中...' : '启动内核'}
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => {
                setFeedback(null);
                reloadMutation.mutate();
              }}
              disabled={reloadMutation.isPending || !status.running || !capability?.supports_reload}
              className="inline-flex items-center gap-1.5"
            >
              <RotateCw className={`h-4 w-4 ${reloadMutation.isPending ? 'animate-spin' : ''}`} />
              {reloadMutation.isPending ? '重载中...' : '热重载'}
            </SecondaryButton>
            <DangerButton
              type="button"
              onClick={() => {
                setFeedback(null);
                stopMutation.mutate();
              }}
              disabled={stopMutation.isPending || !status.running}
              className="inline-flex items-center gap-1.5"
            >
              <Square className="h-4 w-4" />
              {stopMutation.isPending ? '停止中...' : '停止内核'}
            </DangerButton>
            <SecondaryButton
              type="button"
              onClick={() => window.open('/zashboard/', '_blank', 'noopener,noreferrer')}
              disabled={!status.running}
              className="inline-flex items-center gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              打开 Clash 面板
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setAutoRefresh((value) => !value)}
              className="inline-flex items-center gap-1.5"
            >
              <Activity className={`h-4 w-4 ${autoRefresh ? 'text-emerald-500 animate-pulse' : ''}`} />
              {autoRefresh ? '暂停刷新' : '自动刷新'}
            </SecondaryButton>
          </div>
        }
      />

      {feedback ? <InlineMessage tone={feedback.tone} message={feedback.message} /> : null}
      {capability ? <InlineMessage tone={capability.binary_exists ? 'info' : 'danger'} message={capability.message} /> : null}

      {/* 4 Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppCard title="进程状态" description="当前内核进程运行状态。">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {status.running && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  status.running ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </span>
            <span className="text-base font-semibold text-[var(--foreground-primary)]">
              {status.running ? '运行中' : '已停止'}
            </span>
          </div>
          <p className="mt-2 font-mono text-xs text-[var(--foreground-secondary)]">
            状态：{status.instance.status}
          </p>
        </AppCard>

        <AppCard title="API 控制接口" description="本地 external-controller 检查。">
          <div className="flex items-center gap-2">
            {status.api_healthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-base font-semibold text-[var(--foreground-primary)]">
              {status.api_healthy ? '健康正常' : '未就绪'}
            </span>
          </div>
          <p className="mt-2 font-mono text-xs text-[var(--foreground-secondary)] truncate" title={status.instance.controller_address}>
            {status.api_version || status.instance.controller_address || '未配置'}
          </p>
        </AppCard>

        <AppCard title="工作台端口配置" description="参与最终配置聚合的配置项。">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--brand-primary)]" />
            <span className="text-2xl font-bold text-[var(--foreground-primary)]">
              {status.profile_count}
            </span>
            <span className="text-xs text-[var(--foreground-secondary)]">个配置</span>
          </div>
          <p className="mt-2 text-xs text-[var(--foreground-muted)]">
            已加入最终运行快照
          </p>
        </AppCard>

        <AppCard title="监听入口" description="暴露在宿主机的网络监听数量。">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-500" />
            <span className="text-2xl font-bold text-[var(--foreground-primary)]">
              {status.listener_count}
            </span>
            <span className="text-xs text-[var(--foreground-secondary)]">个端口</span>
          </div>
          <p className="mt-2 text-xs text-[var(--foreground-muted)]">
            提供 Socks/HTTP/Mixed 接入
          </p>
        </AppCard>
      </div>

      {/* Instance Details */}
      <AppCard title="实例运行参数" description="进程 PID、工作目录、配置文件位置及最近错误记录。">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 space-y-1">
            <span className="text-[var(--foreground-muted)]">进程 PID</span>
            <p className="font-mono text-sm font-semibold text-[var(--foreground-primary)]">
              {status.instance.pid ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 space-y-1">
            <span className="text-[var(--foreground-muted)]">最近动作</span>
            <p className="font-medium text-sm text-[var(--foreground-primary)] truncate">
              {status.instance.last_action || '无'}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 space-y-1">
            <span className="text-[var(--foreground-muted)]">启动时间</span>
            <p className="text-xs text-[var(--foreground-primary)] truncate">
              {status.instance.last_started_at ? formatDateTime(status.instance.last_started_at) : '未启动'}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 space-y-1">
            <span className="text-[var(--foreground-muted)]">重载时间</span>
            <p className="text-xs text-[var(--foreground-primary)] truncate">
              {status.instance.last_reloaded_at ? formatDateTime(status.instance.last_reloaded_at) : '未重载'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs font-mono">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2.5">
            <span className="text-[var(--foreground-muted)] font-sans">运行目录：</span>
            <span className="text-[var(--foreground-primary)] select-all">{status.instance.work_dir || '未生成'}</span>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2.5">
            <span className="text-[var(--foreground-muted)] font-sans">配置文件：</span>
            <span className="text-[var(--foreground-primary)] select-all">{status.instance.config_path || '未生成'}</span>
          </div>
        </div>
        {status.instance.last_error && (
          <div className="mt-3 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-500">
            <p className="font-semibold">最近报错：</p>
            <p className="font-mono mt-1">{status.instance.last_error}</p>
          </div>
        )}
      </AppCard>

      {/* Listeners */}
      <AppCard title="活跃监听入口" description="每个监听入口映射到工作台的一个特定端口配置与出站策略组。">
        {listenerSummary.length === 0 ? (
          <EmptyState title="暂无监听入口" description="请在工作台启用至少一个端口配置后启动内核。" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listenerSummary.map((listener) => (
              <div
                key={listener.name}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 space-y-2 hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[var(--foreground-primary)]">
                    {listener.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[var(--surface-muted)] text-[var(--foreground-secondary)] border border-[var(--border-default)]">
                    {listener.type}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded bg-[var(--surface-muted)] border border-[var(--border-default)] text-[var(--foreground-primary)]">
                  <Radio className="h-3 w-3 text-sky-500" />
                  <span>{listener.listen}:{listener.port}</span>
                </div>
                <div className="text-xs text-[var(--foreground-secondary)] space-y-0.5 pt-1">
                  <p>工作台：<span className="text-[var(--foreground-primary)] font-medium">{listener.profile_name}</span></p>
                  <p>策略组：<span className="text-[var(--foreground-primary)] font-medium">{listener.proxy_group_name}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      {/* Final Config Preview */}
      <AppCard title="最终合并配置快照" description="由多个工作台端口配置与节点池动态渲染生成的最终 Mihomo 配置文件预览。">
        {!status.rendered_config_preview ? (
          <EmptyState title="暂无最终配置" description="在工作台启用端口配置后，这里会显示完整的 YAML 聚合预览。" />
        ) : (
          <CodeBlock className="max-h-[420px] overflow-auto text-xs">
            {status.rendered_config_preview}
          </CodeBlock>
        )}
      </AppCard>

      {/* Terminal-like Runtime Logs */}
      <AppCard
        title="内核运行控制台日志"
        description={`实时捕获内核进程的标准输出与标准错误流（缓存最新 ${logs.length} 条${lastSeq > 0 ? `，最新序号 #${lastSeq}` : ''}）。`}
        action={
          <div className="flex items-center gap-2">
            <SecondaryButton
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              className="text-xs"
            >
              {autoScroll ? '锁定自动滚动' : '跟随最新日志'}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setLogs([])}
              className="text-xs inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              清屏
            </SecondaryButton>
          </div>
        }
      >
        {logsQuery.isLoading ? <LoadingState /> : null}
        {logs.length === 0 ? (
          <EmptyState title="控制台暂无日志" description="内核进程启动后，这里将实时输出 stdout 与 stderr。" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0a0f1d] shadow-2xl">
            {/* Terminal Topbar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0f172a] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ef4444]/80" />
                <span className="h-3 w-3 rounded-full bg-[#f59e0b]/80" />
                <span className="h-3 w-3 rounded-full bg-[#10b981]/80" />
                <span className="ml-2 inline-flex items-center gap-1.5 font-mono text-xs text-slate-400">
                  <Terminal className="h-3.5 w-3.5 text-slate-500" />
                  mihomo stdout/stderr
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {logs.length} 条记录
              </span>
            </div>

            {/* Terminal Body */}
            <div className="max-h-[500px] overflow-y-auto p-3 font-mono text-xs leading-5 select-text">
              <div className="space-y-1">
                {logs.map((item) => (
                  <div
                    key={item.seq}
                    className="flex flex-wrap items-baseline gap-2 rounded px-2 py-0.5 hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-slate-500 text-[11px] shrink-0">
                      {formatDateTime(item.created_at)}
                    </span>
                    <span
                      className={`px-1 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 ${getLogLevelClass(
                        item.level,
                      )}`}
                    >
                      {item.stream}:{item.level}
                    </span>
                    <span className="text-slate-200 break-all flex-1">
                      {item.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}
      </AppCard>
    </div>
  );
}
