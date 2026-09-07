'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}

function getStatusLabel(node: ProxyNodeItem) {
  switch (node.last_test_status) {
    case 'success':
      return '最近测试成功';
    case 'failed':
      return '最近测试失败';
    default:
      return '尚未测试';
  }
}

export function NodesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'true' | 'false'>(
    'all',
  );
  // pageSize: 0 表示「全部」（不分页）；与后端 page_size=0 语义一致。
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<ProxyNodeSort>('id_desc');
  const [groupByRegion, setGroupByRegion] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
      // 节点列表 + 工作台所有相关缓存（profile 列表、profile 详情、节点选项）
      // 都需要刷新，否则编排页保存时会用旧 node_ids 报「部分节点不存在」。
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

  const renderNodeCard = (node: ProxyNodeItem) => (
    <div
      key={node.id}
      className="h-full rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4"
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <input
              type="checkbox"
              checked={selectedIdSet.has(node.id)}
              onChange={(event) =>
                handleToggleSelection(node.id, event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)]"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground-primary)]">
                {node.name}
              </p>
              <p className="text-sm text-[var(--foreground-secondary)]">
                {node.type.toUpperCase()} · {node.server}:{node.port}
              </p>
              <div className="text-xs text-[var(--foreground-secondary)]">
                <p>来源：{node.source_config_name}</p>
                <p>标签：{node.tags || '未设置'}</p>
                <p>{getStatusLabel(node)}</p>
                <p>
                  最近耗时：
                  {node.last_latency_ms !== undefined
                    ? ` ${node.last_latency_ms} ms`
                    : ' 未记录'}
                </p>
                <p>
                  最近测试：
                  {node.last_tested_at
                    ? ` ${formatDateTime(node.last_tested_at)}`
                    : ' 未执行'}
                </p>
                {node.last_test_error ? (
                  <p>最近错误：{node.last_test_error}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SecondaryButton
              type="button"
              onClick={() => {
                setFeedback(null);
                testMutation.mutate([node.id]);
              }}
              disabled={testMutation.isPending}
            >
              测试
            </SecondaryButton>
            <DangerButton
              type="button"
              onClick={() => {
                if (!window.confirm(`确认删除节点“${node.name}”吗？`)) {
                  return;
                }
                setFeedback(null);
                deleteMutation.mutate(node.id);
              }}
              disabled={deleteMutation.isPending}
            >
              删除
            </DangerButton>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="节点"
        description="查看已导入节点、按条件筛选、删除节点，并通过内核发起真实代理请求测试。"
        action={
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--foreground-secondary)]">
            <span>当前已选择 {selectedIds.length} 个节点</span>
            <PrimaryButton type="button" onClick={() => setIsImportModalOpen(true)}>
              导入节点
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setAutoRefresh((value) => !value)}>
              {autoRefresh ? '暂停刷新' : '自动刷新'}
            </SecondaryButton>
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

      <AppCard
        title="筛选条件"
        description="支持按节点名称/标签/地址/类型模糊搜索，并自定义页大小、排序与分组展示。"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <ResourceField label="关键字">
            <ResourceInput
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="节点名/标签/地址/类型，支持中文"
            />
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
          <ResourceField label="每页">
            <ResourceSelect
              value={String(pageSize)}
              onChange={(event) => {
                setPage(0);
                setSelectedIds([]);
                setPageSize(Number.parseInt(event.target.value, 10));
              }}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="0">全部</option>
            </ResourceSelect>
          </ResourceField>
          <ResourceField label="排序">
            <ResourceSelect
              value={sortBy}
              onChange={(event) => {
                setPage(0);
                setSortBy(event.target.value as ProxyNodeSort);
              }}
            >
              <option value="id_desc">默认（最新在前）</option>
              <option value="latency_asc">延迟升序（最快在前）</option>
            </ResourceSelect>
          </ResourceField>
          <div className="flex items-end gap-2">
            <PrimaryButton type="button" onClick={handleSearch}>
              查询
            </PrimaryButton>
            <SecondaryButton type="button" onClick={handleReset}>
              重置
            </SecondaryButton>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={groupByRegion}
              onChange={(event) => setGroupByRegion(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)]"
            />
            按地区分组展示（前端分组，组内仍按当前排序）
          </label>
        </div>
      </AppCard>

      {selectedIds.length > 0 ? (
        <AppCard
          title="节点标签"
          description="支持为当前选择的节点批量打标签，使用逗号分隔。"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
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
            >
              {tagsMutation.isPending ? '保存中...' : '保存标签'}
            </PrimaryButton>
          </div>
        </AppCard>
      ) : null}

      <AppCard
        title="节点列表"
        description="列表字段保留了后续工作台与运行控制会复用的标准化节点信息。"
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              type="button"
              onClick={() => setSelectedIds(nodes.map((node) => node.id))}
              disabled={nodes.length === 0}
            >
              全选
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
            >
              取消全选
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
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? '批量测试中...' : '批量测试'}
            </PrimaryButton>
            <PrimaryButton
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    '将对「当前筛选条件下的全部节点」执行测速，可能耗时较长，确认继续？',
                  )
                ) {
                  return;
                }
                setFeedback(null);
                testAllMutation.mutate();
              }}
              disabled={testAllMutation.isPending}
            >
              {testAllMutation.isPending ? '全量测试中...' : '测试筛选全部'}
            </PrimaryButton>
            <DangerButton
              type="button"
              onClick={() => {
                if (selectedIds.length === 0) {
                  setFeedback({ tone: 'danger', message: '请先选择至少一个节点。' });
                  return;
                }
                if (!window.confirm(`确认批量删除 ${selectedIds.length} 个节点吗？`)) {
                  return;
                }
                setFeedback(null);
                batchDeleteMutation.mutate(selectedIds);
              }}
              disabled={batchDeleteMutation.isPending}
            >
              {batchDeleteMutation.isPending ? '批量删除中...' : '批量删除'}
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
              description="点击右上角“导入节点”上传 YAML 或填写订阅地址并完成导入。"
            />
          ) : null}

          {!nodesQuery.isLoading && !nodesQuery.isError && nodes.length > 0 ? (
            groupByRegion ? (
              <div className="space-y-6">
                {groupNodesByRegion(nodes).map((group) => (
                  <div key={group.region} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground-primary)]">
                      <span>{group.region}</span>
                      <span className="text-xs font-normal text-[var(--foreground-secondary)]">
                        共 {group.nodes.length} 个
                      </span>
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {group.nodes.map((node) => renderNodeCard(node))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {nodes.map((node) => renderNodeCard(node))}
              </div>
            )
          ) : null}

          <div className="flex justify-end gap-2">
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
      </AppCard>

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
