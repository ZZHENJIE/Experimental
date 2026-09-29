/** 原始 K 线 */
export type Kline = {
  /** Unix 时间戳（秒） */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** 包含关系合并后的 K 线 */
export type MergedKline = {
  /** 合并后数组中的索引 */
  index: number;
  high: number;
  low: number;
  /** 组成该合并 K 线的原始 K 线中，最高点所在 K 线的时间 */
  highTime: number;
  /** 组成该合并 K 线的原始 K 线中，最低点所在 K 线的时间 */
  lowTime: number;
  /** 处理方向：1 向上，-1 向下（由前一合并 K 线走势决定） */
  direction: 1 | -1;
  /** 原始 K 线索引映射（保留时间戳溯源能力） */
  originalIndices: number[];
};

/** 分型 */
export type Fractal = {
  /** 在合并后数组中的索引 */
  mergedIndex: number;
  time: number;
  price: number;
  type: "top" | "bottom";
};

/** 笔 */
export type Stroke = {
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  direction: "up" | "down";
};

/** 线段（简化版） */
export type Segment = {
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  direction: "up" | "down";
};

/** 中枢 */
export type Hub = {
  startTime: number;
  endTime: number;
  high: number;
  low: number;
};

/** 缠论分析整体结果 */
export type ChanAnalysis = {
  merged: MergedKline[];
  fractals: Fractal[];
  strokes: Stroke[];
  segments: Segment[];
  hubs: Hub[];
};
