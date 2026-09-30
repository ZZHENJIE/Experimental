import type { Bi, Segment } from "./types";

/**
 * 线段识别（纯函数，特征序列法，需求 4.4）。
 *
 * - 线段至少由连续三笔构成，且前三笔必须有重叠；完成线段包含的笔数必然是奇数；
 * - 向上线段起始于向上笔、终结于向上笔；向下线段对称；
 * - 特征序列：向上线段取所有向下笔（高点=笔起点价，低点=笔终点价），
 *   做包含处理后找顶分型；向下线段取所有向上笔找底分型；
 * - 无缺口（顶分型第一、二元素有重叠）→ 线段在该顶分型高点处结束；
 * - 有缺口 → 线段暂终结于该高点，需「从该高点起的向下笔序列出现底分型」确认；
 *   确认前若价格创新高，则线段延续、重新累计特征序列。
 */

/** 特征序列元素：把一笔反向笔视为一根 K 线 */
type FeatElem = {
  high: number;
  low: number;
  /** 极值所属笔在 Bi[] 中的下标 */
  bi: number;
};

/**
 * 标准特征序列：增量加入反向笔并做包含处理（规则与 K 线合并一致），
 * 检测期望的分型（向上线段找顶分型 / 向下线段找底分型）。
 */
class FeatureSequence {
  private readonly want: "top" | "bottom";
  private elems: FeatElem[] = [];
  private dir: 1 | -1 | 0 = 0; // 0 = 方向未定

  constructor(want: "top" | "bottom") {
    this.want = want;
  }

  /** 加入一个反向笔（K 线化），返回是否形成了目标分型（中间元素为 elems[n-2]） */
  push(high: number, low: number, bi: number): boolean {
    const last = this.elems[this.elems.length - 1];
    if (last) {
      const included =
        (high <= last.high && low >= last.low) ||
        (high >= last.high && low <= last.low);
      if (included && this.dir !== 0) {
        if (this.dir === 1) {
          if (high > last.high) {
            last.high = high;
            last.bi = bi;
          }
          if (low > last.low) {
            last.low = low;
            last.bi = bi;
          }
        } else {
          if (high < last.high) {
            last.high = high;
            last.bi = bi;
          }
          if (low < last.low) {
            last.low = low;
            last.bi = bi;
          }
        }
        return this.detect();
      }
      if (high > last.high && low > last.low) this.dir = 1;
      else if (high < last.high && low < last.low) this.dir = -1;
    }
    this.elems.push({ high, low, bi });
    return this.detect();
  }

  /** 分型刚成立时返回（第一元素, 第二元素=分型极值元素） */
  fractalPair(): { first: FeatElem; middle: FeatElem } | null {
    const n = this.elems.length;
    if (n < 3) return null;
    return { first: this.elems[n - 3], middle: this.elems[n - 2] };
  }

  /** 最后一个元素（分型刚成立时即第三元素） */
  last(): FeatElem | null {
    return this.elems[this.elems.length - 1] ?? null;
  }

  clear(): void {
    this.elems = [];
    this.dir = 0;
  }

  private detect(): boolean {
    const n = this.elems.length;
    if (n < 3) return false;
    const a = this.elems[n - 3];
    const b = this.elems[n - 2];
    const c = this.elems[n - 1];
    if (this.want === "top") {
      return b.high > a.high && b.high > c.high && b.low > a.low && b.low > c.low;
    }
    return b.low < a.low && b.low < c.low && b.high < a.high && b.high < c.high;
  }
}

/** 反向笔 K 线化：向上线段取向下笔（high=顶，low=底）；向下线段取向上笔（high=顶，low=底） */
function counterElem(b: Bi, biIndex: number, upSegment: boolean): FeatElem {
  return upSegment
    ? { high: b.startPrice, low: b.endPrice, bi: biIndex }
    : { high: b.endPrice, low: b.startPrice, bi: biIndex };
}

/**
 * 计算以 bis[start] 为第一笔的线段的结束笔下标。
 * 返回 end = -1 表示没有任何结束信号；confirmed = false 表示存在「缺口待确认」的候选终点。
 */
function segmentEnd(bis: Bi[], start: number): { end: number; confirmed: boolean } {
  const up = bis[start].direction === "up";
  const sign = up ? 1 : -1;

  const feat = new FeatureSequence(up ? "top" : "bottom");
  // 缺口待确认状态：暂终结于 endBi / endPrice，等待确认序列出现底（顶）分型
  let pending: { endBi: number; endPrice: number; seq: FeatureSequence } | null = null;

  for (let k = start + 1; k < bis.length; k++) {
    // 笔方向严格交替，防御性跳过同向笔
    if (bis[k].direction === bis[start].direction) continue;

    if (pending) {
      // 观察期：同向笔创出新极值 → 取消待确认，线段延续，特征序列重新累计
      if (sign * bis[k - 1].endPrice > sign * pending.endPrice) {
        pending = null;
        feat.clear();
        // 落入下方常规逻辑，把当前反向笔加入全新的特征序列
      } else {
        const e = counterElem(bis[k], k, up);
        // 从该高点起的反向笔序列出现底（顶）分型 → 确认线段结束
        if (pending.seq.push(e.high, e.low, e.bi)) {
          if (reversalViable(bis, pending.endBi)) {
            return { end: pending.endBi, confirmed: true };
          }
          // 反向线段无法生成 → 终结不成立，取消待确认，线段延续
          pending = null;
          feat.clear();
          // 落入下方常规逻辑，把当前反向笔加入全新的特征序列
        } else {
          continue;
        }
      }
    }

    const e = counterElem(bis[k], k, up);
    if (feat.push(e.high, e.low, e.bi)) {
      const pair = feat.fractalPair()!;
      // 缺口判定：顶（底）分型第一、二元素间无重叠 → 有缺口
      const gap = sign * pair.middle.low > sign * pair.first.high;
      // 线段终点 = 分型极值元素所属笔的前一笔（与线段同向），极值即线段端点
      const endBi = pair.middle.bi - 1;
      if (!gap && reversalViable(bis, endBi)) {
        // 无缺口且反向线段可以生成 → 线段在该顶（底）分型极值处结束
        return { end: endBi, confirmed: true };
      }
      if (!gap) {
        // 反向线段无法生成（终结笔之后三笔不足或无重叠）→ 终结不成立，
        // 线段延续，特征序列保留并继续等待下一个终结信号
        continue;
      }
      // 有缺口 → 待确认；确认序列预置「从该高点起」的前两根反向笔（分型第二、三元素）
      pending = {
        endBi,
        endPrice: up ? pair.middle.high : pair.middle.low,
        seq: new FeatureSequence(up ? "bottom" : "top"),
      };
      const third = feat.last()!;
      pending.seq.push(pair.middle.high, pair.middle.low, pair.middle.bi);
      pending.seq.push(third.high, third.low, third.bi);
    }
  }

  return pending
    ? { end: pending.endBi, confirmed: false } // 数据耗尽仍有待确认终点
    : { end: -1, confirmed: false };
}

function biRange(b: Bi): { low: number; high: number } {
  return {
    low: Math.min(b.startPrice, b.endPrice),
    high: Math.max(b.startPrice, b.endPrice),
  };
}

/** 前三笔必须有重叠（需求 4.4）：max(三笔低点) < min(三笔高点) */
function firstThreeOverlap(bis: Bi[], start: number): boolean {
  const r1 = biRange(bis[start]);
  const r2 = biRange(bis[start + 1]);
  const r3 = biRange(bis[start + 2]);
  return Math.max(r1.low, r2.low, r3.low) < Math.min(r1.high, r2.high, r3.high);
}

/**
 * 终结成立还要求「新线段能够生成」（需求 4.4 确立规则）：
 * 反向线段的首三笔必须存在且重叠；数据不足以构成反向线段时视为最终线段。
 * 该检查保证相邻线段方向严格交替，不允许同向连续。
 */
function reversalViable(bis: Bi[], endBi: number): boolean {
  if (endBi + 3 > bis.length - 1) return true;
  return firstThreeOverlap(bis, endBi + 1);
}

function pushSegment(out: Segment[], bis: Bi[], start: number, end: number): void {
  const first = bis[start];
  const last = bis[end];
  out.push({
    startIndex: first.startIndex,
    endIndex: last.endIndex,
    startTime: first.startTime,
    startPrice: first.startPrice,
    endTime: last.endTime,
    endPrice: last.endPrice,
    direction: first.direction,
    biStart: start,
    biEnd: end,
  });
}

/**
 * 线段识别主流程：依次切分线段。
 * 已确立的线段之间首尾衔接；数据结尾处未确立的发展中线段
 * （至少三笔且笔数为奇数）也会输出，便于观察最新走势。
 */
export function findSegments(bis: Bi[]): Segment[] {
  const segments: Segment[] = [];
  if (bis.length < 3) return segments;

  let start = 0;
  while (start + 2 < bis.length) {
    // 前三笔无重叠 → 起点后移
    if (!firstThreeOverlap(bis, start)) {
      start++;
      continue;
    }

    const r = segmentEnd(bis, start);

    if (r.end !== -1 && !r.confirmed) {
      // 缺口待确认未完成：作为发展中线段输出后停止
      if (r.end - start + 1 >= 3) pushSegment(segments, bis, start, r.end);
      break;
    }

    if (r.end === -1) {
      // 无任何结束信号：输出奇数笔（≥3）的发展中线段
      const count = bis.length - start;
      const end =
        count % 2 === 1 ? bis.length - 1 : count >= 4 ? bis.length - 2 : -1;
      if (end !== -1) pushSegment(segments, bis, start, end);
      break;
    }

    pushSegment(segments, bis, start, r.end);
    start = r.end + 1; // 下一线段从结束笔的下一笔开始
  }

  return segments;
}
