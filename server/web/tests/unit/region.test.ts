import { describe, expect, it } from 'vitest';

import { detectRegion, groupNodesByRegion } from '@/features/nodes/lib/region';
import type { ProxyNodeItem } from '@/features/nodes/types';

function buildNode(id: number, name: string, latency?: number): ProxyNodeItem {
  return {
    id,
    source_config_id: 1,
    source_config_name: 'seed.yaml',
    name,
    type: 'ss',
    server: '1.1.1.1',
    port: 443,
    tags: '',
    metadata_json: '{}',
    enabled: true,
    last_test_status: latency !== undefined ? 'success' : 'unknown',
    last_latency_ms: latency,
    created_at: '',
    updated_at: '',
  };
}

describe('detectRegion', () => {
  it('识别国旗 emoji', () => {
    expect(detectRegion('🇭🇰 香港高级 01')).toBe('香港');
    expect(detectRegion('🇯🇵 Tokyo Premium')).toBe('日本');
    expect(detectRegion('🇺🇸-LA-01')).toBe('美国');
  });

  it('识别中文关键词', () => {
    expect(detectRegion('台北 IPLC 01')).toBe('台湾');
    expect(detectRegion('新加坡狮城')).toBe('新加坡');
    expect(detectRegion('德国法兰克福直连')).toBe('德国');
  });

  it('识别英文缩写与全称', () => {
    expect(detectRegion('HK-01 IEPL')).toBe('香港');
    expect(detectRegion('Japan Tokyo Premium')).toBe('日本');
    expect(detectRegion('US-LosAngeles')).toBe('美国');
  });

  it('国旗优先于关键词', () => {
    // 名字里同时有 🇭🇰 与 "Japan"，国旗优先。
    expect(detectRegion('🇭🇰 Japan-Test')).toBe('香港');
  });

  it('未命中归入其它', () => {
    expect(detectRegion('random-node-xyz')).toBe('其它');
    expect(detectRegion('')).toBe('其它');
  });
});

describe('groupNodesByRegion', () => {
  it('按地区分组并保留组内顺序', () => {
    const nodes = [
      buildNode(1, '🇭🇰 香港 01', 80),
      buildNode(2, '🇯🇵 Tokyo 01', 120),
      buildNode(3, '🇭🇰 香港 02', 90),
      buildNode(4, 'random-zzz'),
    ];
    const groups = groupNodesByRegion(nodes);
    expect(groups.map((g) => g.region)).toEqual(['香港', '日本', '其它']);

    const hk = groups.find((g) => g.region === '香港');
    expect(hk?.nodes.map((n) => n.id)).toEqual([1, 3]);
  });

  it('「其它」始终在最后', () => {
    const nodes = [
      buildNode(1, 'random-xyz'),
      buildNode(2, '🇸🇬 Singapore'),
    ];
    const groups = groupNodesByRegion(nodes);
    expect(groups[groups.length - 1]?.region).toBe('其它');
  });
});
