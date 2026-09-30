/** 原始 K 线（要求：按时间严格升序、时间戳不重复） */
export type Kline = {
  /** Unix 时间戳（秒） */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** 包含关系处理后的合并 K 线（需求 4.1） */
export type MergedKline = {
  /** 合并后数组中的索引 */
  index: number;
  high: number;
  low: number;
  /** 高点所在原始 K 线索引（保留溯源能力，避免分型索引错位） */
  highIndex: number;
  /** 高点所在原始 K 线时间 */
  highTime: number;
  /** 低点所在原始 K 线索引 */
  lowIndex: number;
  /** 低点所在原始 K 线时间 */
  lowTime: number;
  /** 包含处理方向：1 向上 / -1 向下 */
  direction: 1 | -1;
  /** 原始 K 线索引映射 */
  originalIndices: number[];
};

export type FractalType = "top" | "bottom";
export type Direction = "up" | "down";

/** 分型（需求 4.2） */
export type Fractal = {
  /** 分型中间 K 线在合并数组中的索引 */
  mergedIndex: number;
  /** 极值所在原始 K 线索引（顶取最高、底取最低），用于绘制与成笔判断 */
  originalIndex: number;
  /** 极值所在原始 K 线时间 */
  time: number;
  /** 顶分型高点 / 底分型低点 */
  price: number;
  type: FractalType;
};

/** 笔（需求 4.3） */
export type Bi = {
  /** 起始分型极值的原始 K 线索引 */
  startIndex: number;
  /** 结束分型极值的原始 K 线索引 */
  endIndex: number;
  startTime: number;
  /** 起点价（底分型用 low，顶分型用 high） */
  startPrice: number;
  endTime: number;
  endPrice: number;
  direction: Direction;
};

/** 线段（需求 4.4） */
export type Segment = {
  startIndex: number;
  endIndex: number;
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  direction: Direction;
  /** 起始笔在 Bi[] 中的下标 */
  biStart: number;
  /** 结束笔下标 */
  biEnd: number;
};

/** 中枢（需求 4.5） */
export type ZhongShu = {
  startIndex: number;
  endIndex: number;
  /** 绘制用：起始 / 结束线段对应的时间 */
  startTime: number;
  endTime: number;
  /** 中枢下沿 ZD = max(三段低点) */
  zd: number;
  /** 中枢上沿 ZG = min(三段高点) */
  zg: number;
  /** 起始线段在 Segment[] 中的下标 */
  segmentStart: number;
  /** 结束线段下标 */
  segmentEnd: number;
  /** 中枢方向：结构为「下上下」→ up；「上下上」→ down */
  direction: Direction;
};

/** 笔识别模式：strict = 严格笔（默认）；new = 新笔 */
export type BiMode = "strict" | "new";

/** 缠论分析整体结果 */
export type ChanAnalysis = {
  merged: MergedKline[];
  fractals: Fractal[];
  bis: Bi[];
  segments: Segment[];
  zhongshus: ZhongShu[];
};
