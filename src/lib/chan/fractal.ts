import type { Fractal, MergedKline } from "./types";

/**
 * 分型识别（纯函数）：在合并后的 K 线上识别顶分型 / 底分型。
 *
 * - 顶分型：中间 K 线的 high 最高，且 low 也最高（严格大于两侧）
 * - 底分型：中间 K 线的 low 最低，且 high 也最低（严格小于两侧）
 *
 * time 取极值所在原始 K 线的时间（由合并步骤的 highTime/lowTime 保证）。
 */
export function findFractals(merged: MergedKline[]): Fractal[] {
  const out: Fractal[] = [];
  for (let i = 1; i < merged.length - 1; i++) {
    const prev = merged[i - 1];
    const cur = merged[i];
    const next = merged[i + 1];

    if (
      cur.high > prev.high &&
      cur.high > next.high &&
      cur.low > prev.low &&
      cur.low > next.low
    ) {
      out.push({ mergedIndex: i, time: cur.highTime, price: cur.high, type: "top" });
    } else if (
      cur.low < prev.low &&
      cur.low < next.low &&
      cur.high < prev.high &&
      cur.high < next.high
    ) {
      out.push({
        mergedIndex: i,
        time: cur.lowTime,
        price: cur.low,
        type: "bottom",
      });
    }
  }
  return out;
}
