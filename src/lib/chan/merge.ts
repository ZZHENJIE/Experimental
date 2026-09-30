import type { Kline, MergedKline } from "./types";

/**
 * K 线包含关系处理（纯函数，需求 4.1）。
 *
 * 包含判定：K1.high >= K2.high && K1.low <= K2.low，或反之 → 存在包含关系。
 * 处理方向：
 * - 向上处理：newHigh = max(h1, h2)，newLow = max(l1, l2)
 * - 向下处理：newHigh = min(h1, h2)，newLow = min(l1, l2)
 * 方向判定：当前 K 线高点和低点均高于前一根已处理 K 线 → 向上；均低于 → 向下；
 * 前一根不存在或方向未定时，跳过包含处理（两根各自独立保留）。
 *
 * 输出保留 originalIndices 原始索引映射；highIndex/lowIndex（及对应时间）
 * 记录极值所在原始 K 线，保证分型索引 / 时间戳不错位。
 */
export function mergeKlines(klines: Kline[]): MergedKline[] {
  const merged: MergedKline[] = [];
  let direction: 1 | -1 | 0 = 0; // 0 = 方向未定

  for (let i = 0; i < klines.length; i++) {
    const k = klines[i];
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({
        index: 0,
        high: k.high,
        low: k.low,
        highIndex: i,
        highTime: k.time,
        lowIndex: i,
        lowTime: k.time,
        direction: 1,
        originalIndices: [i],
      });
      continue;
    }

    const included =
      (k.high <= last.high && k.low >= last.low) ||
      (k.high >= last.high && k.low <= last.low);

    if (included && direction !== 0) {
      const dir: 1 | -1 = direction;
      if (dir === 1) {
        // 向上处理：高高取大、低低取大
        if (k.high > last.high) {
          last.high = k.high;
          last.highIndex = i;
          last.highTime = k.time;
        }
        if (k.low > last.low) {
          last.low = k.low;
          last.lowIndex = i;
          last.lowTime = k.time;
        }
      } else {
        // 向下处理：高高取小、低低取小
        if (k.high < last.high) {
          last.high = k.high;
          last.highIndex = i;
          last.highTime = k.time;
        }
        if (k.low < last.low) {
          last.low = k.low;
          last.lowIndex = i;
          last.lowTime = k.time;
        }
      }
      last.originalIndices.push(i);
      continue;
    }

    // 非包含关系（或方向未定跳过包含处理）→ 新增一根合并 K 线，并修正方向
    if (k.high > last.high && k.low > last.low) direction = 1;
    else if (k.high < last.high && k.low < last.low) direction = -1;

    merged.push({
      index: merged.length,
      high: k.high,
      low: k.low,
      highIndex: i,
      highTime: k.time,
      lowIndex: i,
      lowTime: k.time,
      direction: direction === 0 ? 1 : direction,
      originalIndices: [i],
    });
  }

  return merged;
}
