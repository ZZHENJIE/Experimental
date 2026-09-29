import type { Hub, Stroke } from "./types";

function strokeRange(s: Stroke): { low: number; high: number } {
  return {
    low: Math.min(s.startPrice, s.endPrice),
    high: Math.max(s.startPrice, s.endPrice),
  };
}

/**
 * 中枢识别（纯函数）：基于连续三笔的重叠区间。
 *
 * - 中枢区间 = [max(三笔低点), min(三笔高点)]
 * - max(低点) < min(高点) 时存在有效中枢
 * - 后续与中枢区间有重叠的笔延伸中枢的结束时间
 */
export function findHubs(strokes: Stroke[]): Hub[] {
  const hubs: Hub[] = [];
  let i = 0;

  while (i + 2 < strokes.length) {
    const tri = [strokes[i], strokes[i + 1], strokes[i + 2]];
    const low = Math.max(...tri.map((s) => strokeRange(s).low));
    const high = Math.min(...tri.map((s) => strokeRange(s).high));

    if (low < high) {
      let endTime = strokes[i + 2].endTime;
      let j = i + 3;
      while (j < strokes.length) {
        const r = strokeRange(strokes[j]);
        if (r.low < high && r.high > low) {
          endTime = strokes[j].endTime;
          j++;
        } else {
          break;
        }
      }
      hubs.push({ startTime: strokes[i].startTime, endTime, high, low });
      i = j - 1; // 从中枢最后一笔继续，允许下一中枢与该笔衔接
    } else {
      i++;
    }
  }

  return hubs;
}
