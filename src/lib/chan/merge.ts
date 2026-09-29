import type { Kline, MergedKline } from "./types";

/**
 * K 线包含关系处理（纯函数）。
 *
 * 规则：
 * - 相邻两根 K 线，若一根的 high/low 完全包含另一根，则合并为一根
 * - 向上处理：取两者 high 的较大值、low 的较大值
 * - 向下处理：取两者 high 的较小值、low 的较小值
 * - 方向由前一根合并后的 K 线走势决定（开局默认向上，遇到非包含关系立即修正）
 *
 * 输出保留 originalIndices 原始索引映射，highTime/lowTime
 * 记录极值所在原始 K 线的时间，避免分型时间戳错位。
 */
export function mergeKlines(klines: Kline[]): MergedKline[] {
  const merged: MergedKline[] = [];
  let direction: 1 | -1 = 1;

  for (let i = 0; i < klines.length; i++) {
    const k = klines[i];
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({
        index: 0,
        high: k.high,
        low: k.low,
        highTime: k.time,
        lowTime: k.time,
        direction,
        originalIndices: [i],
      });
      continue;
    }

    const included =
      (k.high <= last.high && k.low >= last.low) ||
      (k.high >= last.high && k.low <= last.low);

    if (included) {
      if (direction === 1) {
        // 向上处理：高高取大、低低取大
        if (k.high > last.high) {
          last.high = k.high;
          last.highTime = k.time;
        }
        if (k.low > last.low) {
          last.low = k.low;
          last.lowTime = k.time;
        }
      } else {
        // 向下处理：高高取小、低低取小
        if (k.high < last.high) {
          last.high = k.high;
          last.highTime = k.time;
        }
        if (k.low < last.low) {
          last.low = k.low;
          last.lowTime = k.time;
        }
      }
      last.originalIndices.push(i);
    } else {
      // 非包含关系 → 修正方向
      if (k.high > last.high && k.low > last.low) direction = 1;
      else if (k.high < last.high && k.low < last.low) direction = -1;
      merged.push({
        index: merged.length,
        high: k.high,
        low: k.low,
        highTime: k.time,
        lowTime: k.time,
        direction,
        originalIndices: [i],
      });
    }
  }

  return merged;
}
