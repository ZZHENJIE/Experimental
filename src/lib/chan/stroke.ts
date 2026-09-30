import type { Bi, BiMode, Fractal } from "./types";

/**
 * 成笔条件（需求 4.3）：
 *
 * 严格笔（默认）：
 * 1. 顶分型与底分型经过包含处理后不允许共用 K 线（合并索引差 ≥ 3）；
 * 2. 顶底分型之间至少有一根独立合并 K 线（不属于任何一端分型，
 *    分型各占三根 → 合并索引差 ≥ 4）；
 * 3. 顶必须高于底。
 *
 * 新笔：
 * 1. 顶底分型不共用 K 线；
 * 2. 顶分型最高 K 线与底分型最低 K 线之间原始 K 线数量 ≥ 3 根（不含这两根）；
 * 3. 顶必须高于底。
 */
function canFormBi(a: Fractal, b: Fractal, mode: BiMode): boolean {
  const top = a.type === "top" ? a : b;
  const bottom = a.type === "top" ? b : a;

  // 条件 3：顶必须高于底
  if (top.price <= bottom.price) return false;

  const mergedGap = Math.abs(top.mergedIndex - bottom.mergedIndex);
  // 条件 1：顶底分型不共用 K 线
  if (mergedGap < 3) return false;

  if (mode === "strict") {
    // 条件 2（严格笔）：至少一根独立合并 K 线
    return mergedGap >= 4;
  }
  // 条件 2（新笔）：极值 K 线之间原始 K 线 ≥ 3 根（不含两端）
  return Math.abs(bottom.originalIndex - top.originalIndex) - 1 >= 3;
}

/**
 * 笔识别（纯函数，需求 4.3）：顶底交替连接分型，方向必须交替。
 *
 * 算法：从第一个分型出发向后扫描——
 * - 同性质分型（两个顶或两个底）且中间无反向笔：只保留更极端的；
 *   若该起点已是上一笔终点，则「原笔延续至更极端的分型」（笔修正规则 1/2）；
 * - 异性质分型：满足成笔条件则成笔，起点移至该分型（笔首尾相连、方向交替）；
 *   不满足则忽略，继续等待（笔修正规则 3）。
 */
export function findBis(fractals: Fractal[], mode: BiMode = "strict"): Bi[] {
  if (fractals.length < 2) return [];

  const bis: Bi[] = [];
  let start: Fractal = fractals[0];
  // start 是否为上一笔的终点（用于「原笔延续至更极端分型」的修正）
  let startIsLastEnd = false;

  for (let i = 1; i < fractals.length; i++) {
    const f = fractals[i];

    if (f.type === start.type) {
      // 同性质分型：只保留更极端者
      const moreExtreme =
        start.type === "top" ? f.price > start.price : f.price < start.price;
      if (moreExtreme) {
        if (startIsLastEnd) {
          // 笔修正：原笔延续至更极端的分型
          const last = bis[bis.length - 1];
          last.endIndex = f.originalIndex;
          last.endTime = f.time;
          last.endPrice = f.price;
        }
        start = f;
      }
      continue;
    }

    // 异性质分型：不满足成笔条件 → 忽略，继续等待
    if (!canFormBi(start, f, mode)) continue;

    bis.push({
      startIndex: start.originalIndex,
      endIndex: f.originalIndex,
      startTime: start.time,
      startPrice: start.price,
      endTime: f.time,
      endPrice: f.price,
      direction: start.type === "bottom" ? "up" : "down",
    });
    start = f; // 下一笔从本笔终点开始，保证顶底相连、方向交替
    startIsLastEnd = true;
  }

  return bis;
}
