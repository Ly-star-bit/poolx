import { apiRequest } from '@/lib/api/client';

import type {
  NodeTestExecution,
  ProxyNodeItem,
} from '@/features/nodes/types';

export type ProxyNodeSort = 'id_desc' | 'latency_asc';

export function getProxyNodes(params: {
  page: number;
  keyword?: string;
  enabled?: string;
  // pageSize: 正数表示每页条数；0 表示「全部」（后端跳过分页）；undefined 走后端默认值
  pageSize?: number;
  sort?: ProxyNodeSort;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('p', String(params.page));
  if (params.keyword?.trim()) {
    searchParams.set('keyword', params.keyword.trim());
  }
  if (params.enabled && params.enabled !== 'all') {
    searchParams.set('enabled', params.enabled);
  }
  if (params.pageSize !== undefined) {
    searchParams.set('page_size', String(params.pageSize));
  }
  if (params.sort) {
    searchParams.set('sort', params.sort);
  }

  return apiRequest<ProxyNodeItem[]>(`/proxy-nodes?${searchParams.toString()}`);
}

export function updateProxyNodeStatus(id: number, enabled: boolean) {
  return apiRequest<void>(`/proxy-nodes/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export function deleteProxyNode(id: number) {
  return apiRequest<void>(`/proxy-nodes/${id}/delete`, {
    method: 'POST',
  });
}

export function deleteProxyNodes(nodeIds: number[]) {
  return apiRequest<{ deleted: number }>('/proxy-nodes/delete', {
    method: 'POST',
    body: JSON.stringify({ node_ids: nodeIds }),
  });
}

export function updateProxyNodeTags(nodeIds: number[], tags: string) {
  return apiRequest<{ updated: number }>('/proxy-nodes/tags', {
    method: 'POST',
    body: JSON.stringify({ node_ids: nodeIds, tags }),
  });
}

export function testProxyNodes(input: { nodeIds: number[] }) {
  return apiRequest<NodeTestExecution[]>('/proxy-nodes/test', {
    method: 'POST',
    body: JSON.stringify({
      node_ids: input.nodeIds,
    }),
  });
}

// 按筛选条件测试全部节点（不受分页限制）。
export function testAllProxyNodes(input: {
  keyword?: string;
  enabled?: 'true' | 'false' | 'all';
}) {
  const body: Record<string, unknown> = {};
  if (input.keyword?.trim()) {
    body.keyword = input.keyword.trim();
  }
  if (input.enabled && input.enabled !== 'all') {
    body.enabled = input.enabled === 'true';
  }
  return apiRequest<NodeTestExecution[]>('/proxy-nodes/test-all', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
