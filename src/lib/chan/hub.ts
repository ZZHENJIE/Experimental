import type { Segment, ZhongShu } from "./types";

function segRange(s: Segment): { low: number; high: number } {
  return {
    low: Math.min(s.startPrice, s.endPrice),
    high: Math.max(s.startPrice, s.endPrice),
  };
}

function overlaps(r: { low: number; high: number }, zd: number, zg: number): boolean {
  return r.high > zd && r.low < zg;
}

/**
 * 中枢识别（纯函数，需求 4.5）：以线段为次级别走势类型，
 * 中枢由至少三个连续线段的重叠部分构成。
 *
 * 区间：ZD = max(三段低点)，ZG = min(三段高点)；ZD >= ZG → 不成立，继续向后寻找。
 * 方向：结构为「下上下」（首段向下）→ up；「上下上」（首段向上）→ down。
 * 延伸：后续线段与 [ZD, ZG] 仍有重叠 → 中枢延续（区间保持首三段结果），
 *       线段离开后又回补的，离开段与回补段一并纳入延伸；
 * 终结：某线段完全离开区间，且其后的反向线段不再回到 [ZD, ZG] 内。
 */
export function findZhongShus(segments: Segment[]): ZhongShu[] {
  const out: ZhongShu[] = [];
  let i = 0;

  while (i + 2 < segments.length) {
    const r1 = segRange(segments[i]);
    const r2 = segRange(segments[i + 1]);
    const r3 = segRange(segments[i + 2]);
    const zd = Math.max(r1.low, r2.low, r3.low);
    const zg = Math.min(r1.high, r2.high, r3.high);
    if (zd >= zg) {
      i++;
      continue;
    }

    // 延伸 / 终结
    let end = i + 2;
    let j = i + 3;
    while (j < segments.length) {
      const r = segRange(segments[j]);
      if (overlaps(r, zd, zg)) {
        end = j;
        j++;
        continue;
      }
      // 完全离开 → 看其后的反向线段是否回到区间
      if (j + 1 < segments.length) {
        const next = segRange(segments[j + 1]);
        if (overlaps(next, zd, zg)) {
          // 离开后又回补 → 离开段与回补段一并纳入延伸
          end = j + 1;
          j += 2;
          continue;
        }
      }
      break; // 离开且不回补（或已是最后一笔）→ 中枢终结
    }

    out.push({
      startIndex: segments[i].startIndex,
      endIndex: segments[end].endIndex,
      startTime: segments[i].startTime,
      endTime: segments[end].endTime,
      zd,
      zg,
      segmentStart: i,
      segmentEnd: end,
      direction: segments[i].direction === "down" ? "up" : "down",
    });
    i = end + 1; // 从中枢后继续寻找下一个中枢
  }

  return out;
}
