import type { Fractal, MergedKline } from "./types";

/**
 * 分型识别（纯函数，需求 4.2）：在合并 K 线序列上识别顶分型 / 底分型。
 *
 * 顶分型：K[i-1].high < K[i].high > K[i+1].high 且 K[i-1].low < K[i].low > K[i+1].low
 * 底分型：对偶条件（中间 K 线的高点、低点均最低）
 *
 * 顶分型取中间 K 线高点作为分型高点，底分型取中间 K 线低点作为分型低点；
 * originalIndex 记录极值所在原始 K 线索引（由合并步骤的 highIndex/lowIndex 保证），用于绘制。
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
      out.push({
        mergedIndex: i,
        originalIndex: cur.highIndex,
        time: cur.highTime,
        price: cur.high,
        type: "top",
      });
    } else if (
      cur.low < prev.low &&
      cur.low < next.low &&
      cur.high < prev.high &&
      cur.high < next.high
    ) {
      out.push({
        mergedIndex: i,
        originalIndex: cur.lowIndex,
        time: cur.lowTime,
        price: cur.low,
        type: "bottom",
      });
    }
  }
  return out;
}
