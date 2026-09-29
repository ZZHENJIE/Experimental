import type { Segment, Stroke } from "./types";

function strokeRange(s: Stroke): { low: number; high: number } {
  return {
    low: Math.min(s.startPrice, s.endPrice),
    high: Math.max(s.startPrice, s.endPrice),
  };
}

/**
 * 线段识别（纯函数，简化版）：连续三笔有重叠 → 构成线段。
 * 相邻候选线段时间上衔接时合并延伸，避免线段互相交叠。
 */
export function findSegments(strokes: Stroke[]): Segment[] {
  const segments: Segment[] = [];

  for (let i = 0; i + 2 < strokes.length; i++) {
    const tri = [strokes[i], strokes[i + 1], strokes[i + 2]];
    const low = Math.max(...tri.map((s) => strokeRange(s).low));
    const high = Math.min(...tri.map((s) => strokeRange(s).high));
    if (low >= high) continue;

    const last = segments[segments.length - 1];
    if (last && strokes[i].startTime <= last.endTime) {
      // 与上一线段衔接 → 延伸
      if (strokes[i + 2].endTime > last.endTime) {
        last.endTime = strokes[i + 2].endTime;
        last.endPrice = strokes[i + 2].endPrice;
        last.direction = strokes[i + 2].direction;
      }
    } else {
      segments.push({
        startTime: strokes[i].startTime,
        startPrice: strokes[i].startPrice,
        endTime: strokes[i + 2].endTime,
        endPrice: strokes[i + 2].endPrice,
        direction: strokes[i + 2].direction,
      });
    }
  }

  return segments;
}
