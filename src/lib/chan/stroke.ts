import type { Fractal, Stroke } from "./types";

/**
 * 笔识别（纯函数，明确采用「新笔」定义）：
 *
 * - 相邻两个分型必须一顶一底交替
 * - 两个分型之间（含分型本身）至少间隔 minBars 根 K 线（默认 5，即索引差 ≥ minBars - 1）
 * - 顶分型价格必须高于底分型价格
 *
 * 算法：从第一个有效分型开始，向后寻找满足条件的下一个异类分型；
 * 不满足间隔或价格条件的分型跳过，继续向后找，直到遍历完所有分型。
 * 同类分型出现更极值时更新起点（保证笔端点为极值）。
 */
export function findStrokes(fractals: Fractal[], minBars = 5): Stroke[] {
  if (fractals.length < 2) return [];

  const strokes: Stroke[] = [];
  let start: Fractal = fractals[0];

  for (let i = 1; i < fractals.length; i++) {
    const f = fractals[i];

    if (f.type === start.type) {
      // 同类分型：保留更极值者作为候选起点
      if (f.type === "top" ? f.price > start.price : f.price < start.price) {
        start = f;
      }
      continue;
    }

    const gapOk = f.mergedIndex - start.mergedIndex >= minBars - 1;
    const priceOk = start.type === "top" ? start.price > f.price : start.price < f.price;
    if (!gapOk || !priceOk) continue; // 跳过，继续向后找

    strokes.push({
      startTime: start.time,
      startPrice: start.price,
      endTime: f.time,
      endPrice: f.price,
      direction: start.type === "bottom" ? "up" : "down",
    });
    start = f; // 下一笔从本笔终点开始，保证折线首尾相连
  }

  return strokes;
}
