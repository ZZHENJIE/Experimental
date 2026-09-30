import { findFractals } from "./fractal";
import { findZhongShus } from "./hub";
import { mergeKlines } from "./merge";
import { findSegments } from "./segment";
import { findBis } from "./stroke";
import type { Bi, BiMode, ChanAnalysis, Kline, Segment, ZhongShu } from "./types";

export * from "./types";
export { parseCsv, parseCsvTime } from "./csv";
export { mergeKlines } from "./merge";
export { findFractals } from "./fractal";
export { findBis } from "./stroke";
export { findSegments } from "./segment";
export { findZhongShus } from "./hub";

/**
 * 线段结构校验（需求 4.4 渲染前校验，违规抛错，不渲染非法结构）：
 * - 相邻线段方向必须交替，不允许同向连续（不能「上上」或「下下」）
 * - 每个线段笔数为奇数且 ≥ 3，方向与首尾笔一致
 */
function validateSegments(bis: Bi[], segments: Segment[]): void {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const count = s.biEnd - s.biStart + 1;
    if (count < 3 || count % 2 === 0) {
      throw new Error(`线段划分有误：第 ${i} 个线段包含 ${count} 笔（必须为 ≥3 的奇数）`);
    }
    if (bis[s.biStart].direction !== s.direction || bis[s.biEnd].direction !== s.direction) {
      throw new Error(`线段划分有误：第 ${i} 个线段方向与首尾笔不一致`);
    }
    if (i > 0 && segments[i - 1].direction === s.direction) {
      throw new Error(
        `线段划分有误：第 ${i - 1}、${i} 个线段同向连续（${s.direction}），线段方向必须交替`,
      );
    }
  }
}

/**
 * 中枢结构校验（需求 4.5 渲染前校验，违规抛错）：
 * - 构成中枢的线段方向必须为「下上下」或「上下上」，不允许同向连续
 * - ZD < ZG
 */
function validateZhongShus(segments: Segment[], zhongshus: ZhongShu[]): void {
  for (let i = 0; i < zhongshus.length; i++) {
    const z = zhongshus[i];
    if (z.zd >= z.zg) {
      throw new Error(`中枢划分有误：第 ${i} 个中枢 ZD(${z.zd}) >= ZG(${z.zg})`);
    }
    for (let j = z.segmentStart; j < z.segmentEnd; j++) {
      if (segments[j].direction === segments[j + 1].direction) {
        throw new Error(`中枢划分有误：第 ${i} 个中枢内线段同向连续`);
      }
    }
  }
}

/**
 * 缠论分析统一计算入口（需求 4.1–4.5 流水线），所有步骤均为纯函数：
 * K 线 → 包含合并 → 分型 → 笔（严格 / 新笔）→ 线段（特征序列法）→ 中枢（三线段重叠）
 * 最后执行线段 / 中枢结构校验，违规直接抛错。
 */
export function computeChan(klines: Kline[], biMode: BiMode = "strict"): ChanAnalysis {
  const merged = mergeKlines(klines);
  const fractals = findFractals(merged);
  const bis = findBis(fractals, biMode);
  const segments = findSegments(bis);
  const zhongshus = findZhongShus(segments);
  validateSegments(bis, segments);
  validateZhongShus(segments, zhongshus);
  return { merged, fractals, bis, segments, zhongshus };
}
