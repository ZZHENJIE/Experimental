import { findFractals } from "./fractal";
import { findHubs } from "./hub";
import { mergeKlines } from "./merge";
import { findSegments } from "./segment";
import { findStrokes } from "./stroke";
import type { ChanAnalysis, Kline } from "./types";

export * from "./types";
export { parseCsv, parseCsvTime } from "./csv";
export { mergeKlines } from "./merge";
export { findFractals } from "./fractal";
export { findStrokes } from "./stroke";
export { findHubs } from "./hub";
export { findSegments } from "./segment";

/** 缠论分析完整流水线：K 线 → 包含合并 → 分型 → 笔 → 线段 / 中枢 */
export function analyzeChan(klines: Kline[], minStrokeBars = 5): ChanAnalysis {
  const merged = mergeKlines(klines);
  const fractals = findFractals(merged);
  const strokes = findStrokes(fractals, minStrokeBars);
  const segments = findSegments(strokes);
  const hubs = findHubs(strokes);
  return { merged, fractals, strokes, segments, hubs };
}
