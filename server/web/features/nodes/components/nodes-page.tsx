'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Play,
  Plus,
  RotateCw,
  Search,
  Server,
  Tag,
  Trash2,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { InlineMessage } from '@/components/feedback/inline-message';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { AppCard } from '@/components/ui/app-card';
import { AppModal } from '@/components/ui/app-modal';
import { getKernelCapability } from '@/features/capability/api/capability';
import { SourceImportPanel } from '@/features/import/components/source-import-page';
import {
  deleteProxyNode,
  deleteProxyNodes,
  getProxyNodes,
  testAllProxyNodes,
  testProxyNodes,
  updateProxyNodeTags,
  type ProxyNodeSort,
} from '@/features/nodes/api/nodes';
import { groupNodesByRegion } from '@/features/nodes/lib/region';
import type { ProxyNodeItem } from '@/features/nodes/types';
import {
  DangerButton,
  PrimaryButton,
  ResourceField,
  ResourceInput,
  ResourceSelect,
  SecondaryButton,
} from '@/features/shared/components/resource-primitives';
import { formatDateTime } from '@/lib/utils/date';

const proxyNodesQueryKey = ['proxy-nodes', 'list'] as const;

type FeedbackState = {
  tone: 'success' | 'danger' | 'info';
  message: string;
};

const PRESET_TAGS = ['hk', 'jp', 'sg', 'us', 'fast', 'premium', 'direct'];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}

function getProtocolBadgeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes('ss') || t.includes('shadowsocks')) {
    return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
  }
  if (t.includes('vmess')) {
    return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
  }
  if (t.includes('vless')) {
    return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
  }
  if (t.includes('trojan')) {
    return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  }
  if (t.includes('hy') || t.includes('hysteria') || t.includes('tuic')) {
    return 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20';
  }
  if (t.includes('wireguard') || t.includes('wg')) {
    return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
  }
  return 'bg-[var(--surface-muted)] text-[var(--foreground-secondary)] border-[var(--border-default)]';
}

export function NodesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'true' | 'false'>('all');
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<ProxyNodeSort>('id_desc');
  const [groupByRegion, setGroupByRegion] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const capabilityQuery = useQuery({
    queryKey: ['capability'],
    queryFn: getKernelCapability,
  });

  const nodesQuery = useQuery({
    queryKey: [
      ...proxyNodesQueryKey,
      page,
      keyword,
      enabledFilter,
      pageSize,
      sortBy,
    ],
    queryFn: () =>
      getProxyNodes({
        page,
        keyword,
        enabled: enabledFilter,
        pageSize,
        sort: sortBy,
      }),
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteProxyNode(id),
    onSuccess: async (_, id) => {
      setFeedback({
        tone: 'success',
        message: '节点已删除。',
      });
      setSelectedIds((previous) => previous.filter((item) => item !== id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: proxyNodesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['workspace'] }),
      ]);
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (nodeIds: number[]) => deleteProxyNodes(nodeIds),
    onSuccess: async (result) => {
      setFeedback({
        tone: 'success',
        message: `已删除 ${result.deleted} 个节点。`,
      });
      setSelectedIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: proxyNodesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['workspace'] }),
      ]);
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (nodeIds: number[]) =>
      testProxyNodes({
        nodeIds,
      }),
    onSuccess: async (result) => {
      setFeedback({
        tone: 'success',
        message: `测试已完成，共返回 ${result.length} 条结果。`,
      });
      await queryClient.invalidateQueries({ queryKey: proxyNodesQueryKey });
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const testAllMutation = useMutation({
    mutationFn: async () =>
      testAllProxyNodes({
        keyword,
        enabled: enabledFilter,
      }),
    onSuccess: async (result) => {
      setFeedback({
        tone: 'success',
        message: `已对当前筛选的 ${result.length} 个节点完成测速。`,
      });
      await queryClient.invalidateQueries({ queryKey: proxyNodesQueryKey });
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const tagsMutation = useMutation({
    mutationFn: async (nodeIds: number[]) => updateProxyNodeTags(nodeIds, tagsInput),
    onSuccess: async (result) => {
      setFeedback({
        tone: 'success',
        message: `已更新 ${result.updated} 个节点标签。`,
      });
      await queryClient.invalidateQueries({ queryKey: proxyNodesQueryKey });
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const nodes = useMemo(() => nodesQuery.data ?? [], [nodesQuery.data]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleSearch = () => {
    setPage(0);
    setSelectedIds([]);
    setFeedback(null);
    setKeyword(keywordInput.trim());
  };

  const handleReset = () => {
    setPage(0);
    setKeywordInput('');
    setKeyword('');
    setEnabledFilter('all');
    setPageSize(50);
    setSortBy('id_desc');
    setGroupByRegion(false);
    setSelectedIds([]);
    setFeedback(null);
  };

  const handleToggleSelection = (nodeId: number, checked: boolean) => {
    setSelectedIds((previous) =>
      checked
        ? Array.from(new Set([...previous, nodeId]))
        : previous.filter((item) => item !== nodeId),
    );
  };

  const handleCopyEndpoint = (node: ProxyNodeItem) => {
    const text = `${node.server}:${node.port}`;
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(node.id);
        setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => undefined);
  };

  const handleAddPresetTag = (preset: string) => {
    const existing = tagsInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!existing.includes(preset)) {
      const next = [...existing, preset].join(', ');
      setTagsInput(next);
    }
  };

  const renderLatencyBadge = (node: ProxyNodeItem) => {
    if (node.last_test_status === 'success') {
      const ms = node.last_latency_ms ?? 0;
      let style = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      if (ms > 400) {
        style = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      } else if (ms > 150) {
        style = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      }
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}
        >
          <Zap className="h-3 w-3 fill-current" />
          <span>{ms} ms</span>
        </span>
      );
    }

    if (node.last_test_status === 'failed') {
      return (
        <span
          title={node.last_test_error || '测试连接超时或失败'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-rose-500/10 text-rose-500 border-rose-500/20 cursor-help"
        >
          <AlertCircle className="h-3 w-3" />
          <span>失败</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-[var(--surface-muted)] text-[var(--foreground-muted)] border-[var(--border-default)]">
        <Clock className="h-3 w-3" />
        <span>未测试</span>
      </span>
    );
  };

  const renderNodeCard = (node: ProxyNodeItem) => {
    const isSelected = selectedIdSet.has(node.id);
    const isTestingThisNode =
      testMutation.isPending && testMutation.variables?.includes(node.id);
    const isDeletingThisNode =
      deleteMutation.isPending && deleteMutation.variables === node.id;
    const tagList = (node.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    return (
      <div
        key={node.id}
        className={`group flex flex-col justify-between rounded-xl border p-4 transition-all duration-150 ${
          isSelected
            ? 'border-[var(--brand-primary)] bg-[var(--surface-raised)] shadow-xs ring-1 ring-[var(--brand-primary)]/30'
            : 'border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--border-hover)] hover:shadow-xs'
        }`}
      >
        <div className="space-y-3">
          {/* Header Row: Checkbox, Protocol, Name, Latency */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(event) =>
                handleToggleSelection(node.id, event.target.checked)
              }
              aria-label={`选择节点 ${node.name}`}
              className="mt-1 h-4 w-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)] cursor-pointer"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded border ${getProtocolBadgeStyle(
                    node.type,
                  )}`}
                >
                  {node.type}
                </span>
                <h4
                  className="font-semibold text-sm text-[var(--foreground-primary)] truncate max-w-[220px] sm:max-w-[320px]"
                  title={node.name}
                >
                  {node.name}
                </h4>
                <div className="ml-auto shrink-0">{renderLatencyBadge(node)}</div>
              </div>

              {/* Endpoint & Source Meta */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                <button
                  type="button"
                  onClick={() => handleCopyEndpoint(node)}
                  title="点击复制地址"
                  className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border-default)] hover:border-[var(--border-hover)] text-[var(--foreground-primary)] transition-colors cursor-pointer"
                >
                  <Server className="h-3 w-3 text-[var(--foreground-muted)]" />
                  <span className="truncate max-w-[160px] sm:max-w-[220px]">
                    {node.server}:{node.port}
                  </span>
                  {copiedId === node.id ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5 text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
                <span className="text-[var(--foreground-muted)]">·</span>
                <span
                  className="truncate max-w-[140px] text-[var(--foreground-muted)]"
                  title={`来源：${node.source_config_name}`}
                >
                  {node.source_config_name}
                </span>
              </div>

              {/* Tags */}
              {tagList.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] bg-[var(--surface-muted)] text-[var(--foreground-secondary)] border border-[var(--border-default)]"
                    >
                      <Tag className="h-2.5 w-2.5 text-[var(--foreground-muted)]" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Error Details */}
              {node.last_test_status === 'failed' && node.last_test_error ? (
                <p className="mt-2 text-xs text-rose-500 bg-rose-500/5 border border-rose-500/15 rounded-md px-2 py-1 line-clamp-1">
                  {node.last_test_error}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer: Test timestamp & Actions */}
        <div className="mt-3.5 pt-3 border-t border-[var(--border-default)]/60 flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {node.last_tested_at ? formatDateTime(node.last_tested_at) : '未执行'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTestingThisNode}
              onClick={() => {
                setFeedback(null);
                testMutation.mutate([node.id]);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--foreground-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isTestingThisNode ? (
                <RotateCw className="h-3 w-3 animate-spin text-[var(--brand-primary)]" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              测速
            </button>
            <button
              type="button"
              disabled={isDeletingThisNode}
              onClick={() => {
                if (!window.confirm(`确认删除节点“${node.name}”吗？`)) {
                  return;
                }
                setFeedback(null);
                deleteMutation.mutate(node.id);
              }}
              title="删除此节点"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-[var(--foreground-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="节点池"
        description="查看已导入节点、按条件筛选与批量管理，并通过内核发起真实代理请求测速。"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton
              type="button"
              onClick={() => setAutoRefresh((value) => !value)}
              className="inline-flex items-center gap-1.5"
            >
              <Activity className={`h-3.5 w-3.5 ${autoRefresh ? 'text-emerald-500 animate-pulse' : ''}`} />
              {autoRefresh ? '暂停刷新' : '自动刷新'}
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              导入节点
            </PrimaryButton>
          </div>
        }
      />

      {feedback ? (
        <InlineMessage tone={feedback.tone} message={feedback.message} />
      ) : null}
      {capabilityQuery.data ? (
        <InlineMessage
          tone={capabilityQuery.data.binary_exists ? 'info' : 'danger'}
          message={capabilityQuery.data.message}
        />
      ) : null}

      {/* Filter Card */}
      <AppCard
        title="筛选与排序"
        description="支持按节点名称、标签、地址模糊搜索，并自定义页大小、排序与地区分组展示。"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <ResourceField label="关键字">
            <div className="relative">
              <ResourceInput
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="节点名 / 标签 / 地址"
              />
            </div>
          </ResourceField>
          <ResourceField label="启用状态">
            <ResourceSelect
              value={enabledFilter}
              onChange={(event) =>
                setEnabledFilter(event.target.value as 'all' | 'true' | 'false')
              }
            >
              <option value="all">全部</option>
              <option value="true">仅启用</option>
              <option value="false">仅禁用</option>
            </ResourceSelect>
          </ResourceField>
          <ResourceField label="每页数量">
            <ResourceSelect
              value={String(pageSize)}
              onChange={(event) => {
                setPage(0);
                setSelectedIds([]);
                setPageSize(Number.parseInt(event.target.value, 10));
              }}
            >
              <option value="50">50 条</option>
              <option value="100">100 条</option>
              <option value="200">200 条</option>
              <option value="0">全部（不分页）</option>
            </ResourceSelect>
          </ResourceField>
          <ResourceField label="排序方式">
            <ResourceSelect
              value={sortBy}
              onChange={(event) => {
                setPage(0);
                setSortBy(event.target.value as ProxyNodeSort);
              }}
            >
              <option value="id_desc">最新入库优先</option>
              <option value="latency_asc">延迟最快优先</option>
            </ResourceSelect>
          </ResourceField>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-1">
            <PrimaryButton type="button" onClick={handleSearch} className="flex-1 inline-flex justify-center items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              查询
            </PrimaryButton>
            <SecondaryButton type="button" onClick={handleReset} className="inline-flex justify-center items-center gap-1.5">
              <RotateCw className="h-3.5 w-3.5" />
              重置
            </SecondaryButton>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--foreground-secondary)]">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={groupByRegion}
              onChange={(event) => setGroupByRegion(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)]"
            />
            <span>按国家/地区分组展示（组内按当前排序）</span>
          </label>
          <span>共找到 {nodes.length} 个节点</span>
        </div>
      </AppCard>

      {/* Batch Tagging Bar */}
      {selectedIds.length > 0 ? (
        <AppCard
          title={`批量设置标签 (${selectedIds.length} 个已选节点)`}
          description="输入新标签后保存，将统一附加或更新到选中的所有节点。"
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <ResourceInput
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="例如：hk, premium, low-latency"
              />
              <PrimaryButton
                type="button"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    setFeedback({ tone: 'danger', message: '请先选择至少一个节点。' });
                    return;
                  }
                  setFeedback(null);
                  tagsMutation.mutate(selectedIds);
                }}
                disabled={tagsMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5"
              >
                <Tag className="h-3.5 w-3.5" />
                {tagsMutation.isPending ? '保存中...' : '保存标签'}
              </PrimaryButton>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--foreground-secondary)]">
              <span className="text-[var(--foreground-muted)]">快捷预设：</span>
              {PRESET_TAGS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddPresetTag(preset)}
                  className="px-2 py-0.5 rounded text-xs bg-[var(--surface-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] transition-colors cursor-pointer"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>
        </AppCard>
      ) : null}

      {/* Nodes List Card */}
      <AppCard
        title="节点列表"
        description="所有节点的连通性测速结果将直接决定工作台策略组与内核运行表现。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton
              type="button"
              onClick={() => setSelectedIds(nodes.map((node) => node.id))}
              disabled={nodes.length === 0}
              className="inline-flex items-center gap-1"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              全选
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
            >
              取消
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={() => {
                if (selectedIds.length === 0) {
                  setFeedback({ tone: 'danger', message: '请先选择至少一个节点。' });
                  return;
                }
                setFeedback(null);
                testMutation.mutate(selectedIds);
              }}
              disabled={testMutation.isPending || selectedIds.length === 0}
              className="inline-flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              {testMutation.isPending ? '批量测速中...' : `测速选中 (${selectedIds.length})`}
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    '将对当前筛选条件下的全部节点执行测速，可能耗时较长，确认继续？',
                  )
                ) {
                  return;
                }
                setFeedback(null);
                testAllMutation.mutate();
              }}
              disabled={testAllMutation.isPending || nodes.length === 0}
              className="inline-flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              {testAllMutation.isPending ? '全量测速中...' : '测速筛选全部'}
            </SecondaryButton>
            <DangerButton
              type="button"
              onClick={() => {
                if (selectedIds.length === 0) {
                  setFeedback({ tone: 'danger', message: '请先选择至少一个节点。' });
                  return;
                }
                if (!window.confirm(`确认批量删除已选中的 ${selectedIds.length} 个节点吗？`)) {
                  return;
                }
                setFeedback(null);
                batchDeleteMutation.mutate(selectedIds);
              }}
              disabled={batchDeleteMutation.isPending || selectedIds.length === 0}
              className="inline-flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {batchDeleteMutation.isPending ? '删除中...' : '批量删除'}
            </DangerButton>
          </div>
        }
      >
        <div className="space-y-4">
          {nodesQuery.isLoading ? <LoadingState /> : null}
          {nodesQuery.isError ? (
            <ErrorState
              title="加载节点失败"
              description={getErrorMessage(nodesQuery.error)}
            />
          ) : null}
          {!nodesQuery.isLoading && !nodesQuery.isError && nodes.length === 0 ? (
            <EmptyState
              title="暂无节点"
              description="点击右上角“导入节点”上传 YAML 配置文件或订阅地址导入节点。"
            />
          ) : null}

          {!nodesQuery.isLoading && !nodesQuery.isError && nodes.length > 0 ? (
            groupByRegion ? (
              <div className="space-y-6">
                {groupNodesByRegion(nodes).map((group) => (
                  <div key={group.region} className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-[var(--border-default)]">
                      <span className="font-semibold text-sm text-[var(--foreground-primary)]">
                        {group.region}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--surface-muted)] text-[var(--foreground-muted)] border border-[var(--border-default)]">
                        {group.nodes.length} 个
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.nodes.map((node) => renderNodeCard(node))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {nodes.map((node) => renderNodeCard(node))}
              </div>
            )
          ) : null}

          {/* Pagination */}
          <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex items-center justify-between">
            <span className="text-xs text-[var(--foreground-muted)]">
              第 {page + 1} 页 · 当前显示 {nodes.length} 条
            </span>
            <div className="flex items-center gap-2">
              <SecondaryButton
                type="button"
                onClick={() => setPage((previous) => Math.max(previous - 1, 0))}
                disabled={page === 0 || nodesQuery.isLoading || pageSize === 0}
              >
                上一页
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={() => setPage((previous) => previous + 1)}
                disabled={
                  nodesQuery.isLoading ||
                  nodes.length === 0 ||
                  pageSize === 0 ||
                  (pageSize > 0 && nodes.length < pageSize)
                }
              >
                下一页
              </PrimaryButton>
            </div>
          </div>
        </div>
      </AppCard>

      {/* Import Modal */}
      <AppModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="导入节点"
        description="上传 Clash/Mihomo YAML，或填写返回 YAML 的订阅地址；完成解析、去重预检与导入确认后，会直接写入当前节点池。"
        size="xl"
      >
        <SourceImportPanel
          embedded
          onImportSuccess={async (result) => {
            setFeedback({
              tone: 'success',
              message: `导入完成，新增 ${result.imported_nodes} 个节点，跳过 ${result.skipped_nodes} 个重复节点。`,
            });
            setSelectedIds([]);
            setPage(0);
            await queryClient.invalidateQueries({ queryKey: proxyNodesQueryKey });
            setIsImportModalOpen(false);
          }}
        />
      </AppModal>
    </div>
  );
}
