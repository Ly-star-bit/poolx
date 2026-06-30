import type { ProxyNodeItem } from '@/features/nodes/types';

// 区域标签：人类可读的中文名。
// 顺序影响分组在 UI 中的渲染优先级（已测/常见地区在前，「其它」永远在最后）。
export const REGION_ORDER = [
  '香港',
  '台湾',
  '日本',
  '新加坡',
  '韩国',
  '美国',
  '英国',
  '德国',
  '法国',
  '加拿大',
  '澳大利亚',
  '俄罗斯',
  '印度',
  '土耳其',
  '阿根廷',
  '巴西',
  '荷兰',
  '马来西亚',
  '泰国',
  '越南',
  '菲律宾',
  '印度尼西亚',
  '其它',
] as const;

export type RegionLabel = (typeof REGION_ORDER)[number];

// 国旗 emoji 由两个 Regional Indicator Symbol 组成，对应 ISO 3166-1 alpha-2。
// 这里只列项目中常见的国家/地区。
const FLAG_TO_REGION: Record<string, RegionLabel> = {
  HK: '香港',
  TW: '台湾',
  JP: '日本',
  SG: '新加坡',
  KR: '韩国',
  US: '美国',
  GB: '英国',
  UK: '英国',
  DE: '德国',
  FR: '法国',
  CA: '加拿大',
  AU: '澳大利亚',
  RU: '俄罗斯',
  IN: '印度',
  TR: '土耳其',
  AR: '阿根廷',
  BR: '巴西',
  NL: '荷兰',
  MY: '马来西亚',
  TH: '泰国',
  VN: '越南',
  PH: '菲律宾',
  ID: '印度尼西亚',
};

// 中文关键词命中（包含匹配）。
const ZH_KEYWORDS: Array<[string, RegionLabel]> = [
  ['香港', '香港'],
  ['臺灣', '台湾'],
  ['台湾', '台湾'],
  ['台北', '台湾'],
  ['日本', '日本'],
  ['东京', '日本'],
  ['大阪', '日本'],
  ['新加坡', '新加坡'],
  ['狮城', '新加坡'],
  ['韩国', '韩国'],
  ['首尔', '韩国'],
  ['美国', '美国'],
  ['洛杉矶', '美国'],
  ['硅谷', '美国'],
  ['英国', '英国'],
  ['伦敦', '英国'],
  ['德国', '德国'],
  ['法兰克福', '德国'],
  ['法国', '法国'],
  ['巴黎', '法国'],
  ['加拿大', '加拿大'],
  ['澳大利亚', '澳大利亚'],
  ['澳洲', '澳大利亚'],
  ['俄罗斯', '俄罗斯'],
  ['莫斯科', '俄罗斯'],
  ['印度', '印度'],
  ['孟买', '印度'],
  ['土耳其', '土耳其'],
  ['阿根廷', '阿根廷'],
  ['巴西', '巴西'],
  ['荷兰', '荷兰'],
  ['马来西亚', '马来西亚'],
  ['泰国', '泰国'],
  ['越南', '越南'],
  ['菲律宾', '菲律宾'],
  ['印尼', '印度尼西亚'],
  ['印度尼西亚', '印度尼西亚'],
];

// 英文/缩写关键词（大小写不敏感，作为整词或边界匹配）。
const EN_KEYWORDS: Array<[RegExp, RegionLabel]> = [
  [/\b(hk|hong\s*kong)\b/i, '香港'],
  [/\b(tw|taiwan)\b/i, '台湾'],
  [/\b(jp|japan|tokyo|osaka)\b/i, '日本'],
  [/\b(sg|singapore)\b/i, '新加坡'],
  [/\b(kr|korea|seoul)\b/i, '韩国'],
  [/\b(us|usa|united\s*states|america|los\s*angeles|new\s*york)\b/i, '美国'],
  [/\b(uk|britain|london|england|united\s*kingdom)\b/i, '英国'],
  [/\b(de|germany|frankfurt|berlin)\b/i, '德国'],
  [/\b(fr|france|paris)\b/i, '法国'],
  [/\b(ca|canada|toronto)\b/i, '加拿大'],
  [/\b(au|australia|sydney)\b/i, '澳大利亚'],
  [/\b(ru|russia|moscow)\b/i, '俄罗斯'],
  [/\b(in|india|mumbai)\b/i, '印度'],
  [/\b(tr|turkey|istanbul)\b/i, '土耳其'],
  [/\b(ar|argentina)\b/i, '阿根廷'],
  [/\b(br|brazil)\b/i, '巴西'],
  [/\b(nl|netherlands|amsterdam)\b/i, '荷兰'],
  [/\b(my|malaysia)\b/i, '马来西亚'],
  [/\b(th|thailand|bangkok)\b/i, '泰国'],
  [/\b(vn|vietnam)\b/i, '越南'],
  [/\b(ph|philippines)\b/i, '菲律宾'],
  [/\b(id|indonesia|jakarta)\b/i, '印度尼西亚'],
];

// 从国旗 emoji 解码出 ISO 3166-1 alpha-2 国家码。
// 国旗由两个 Regional Indicator Symbol（U+1F1E6 ~ U+1F1FF）组成，分别对应 A~Z。
function extractFlagCountry(name: string): string | null {
  for (let i = 0; i < name.length; ) {
    const cp1 = name.codePointAt(i);
    if (cp1 === undefined) {
      break;
    }
    const step1 = cp1 > 0xffff ? 2 : 1;
    if (cp1 >= 0x1f1e6 && cp1 <= 0x1f1ff) {
      const cp2 = name.codePointAt(i + step1);
      if (cp2 !== undefined && cp2 >= 0x1f1e6 && cp2 <= 0x1f1ff) {
        const a = String.fromCharCode(65 + (cp1 - 0x1f1e6));
        const b = String.fromCharCode(65 + (cp2 - 0x1f1e6));
        return `${a}${b}`;
      }
    }
    i += step1;
  }
  return null;
}

export function detectRegion(name: string): RegionLabel {
  if (!name) {
    return '其它';
  }

  // 1) 国旗 emoji 优先级最高（最可靠的标识）。
  const flag = extractFlagCountry(name);
  if (flag && FLAG_TO_REGION[flag]) {
    return FLAG_TO_REGION[flag];
  }

  // 2) 中文关键词。
  for (const [keyword, region] of ZH_KEYWORDS) {
    if (name.includes(keyword)) {
      return region;
    }
  }

  // 3) 英文/缩写。
  for (const [pattern, region] of EN_KEYWORDS) {
    if (pattern.test(name)) {
      return region;
    }
  }

  return '其它';
}

export interface RegionGroup {
  region: RegionLabel;
  nodes: ProxyNodeItem[];
}

// 按地区分组节点；组内保持入参顺序（调用方通常已按延迟排好序）。
// 返回的组按 REGION_ORDER 排序，「其它」始终最后。
export function groupNodesByRegion(nodes: ProxyNodeItem[]): RegionGroup[] {
  const buckets = new Map<RegionLabel, ProxyNodeItem[]>();
  for (const node of nodes) {
    const region = detectRegion(node.name);
    const list = buckets.get(region);
    if (list) {
      list.push(node);
    } else {
      buckets.set(region, [node]);
    }
  }

  const result: RegionGroup[] = [];
  for (const region of REGION_ORDER) {
    const list = buckets.get(region);
    if (list && list.length > 0) {
      result.push({ region, nodes: list });
    }
  }
  return result;
}
