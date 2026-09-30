import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";
import { HubRectPrimitive } from "./HubRectPrimitive";
import type { Bi, ChanAnalysis, Kline } from "../lib/chan/types";

export type ChanChartOptions = {
  showFractals: boolean;
  showBis: boolean;
  showSegments: boolean;
  showZhongShus: boolean;
};

type Props = ChanChartOptions & {
  klines: Kline[];
  analysis: ChanAnalysis;
};

const COLORS = {
  up: "#f85149", // 阳线（红涨，与全站一致）
  down: "#3fb950", // 阴线（绿跌）
  biUp: "#ef5350", // 向上笔（需求 5.2）
  biDown: "#26a69a", // 向下笔
  segment: "#2962ff", // 线段（需求 5.3）
  hubFill: "rgba(255, 193, 7, 0.15)", // 中枢填充（需求 5.4）
  hubBorder: "#ffc107",
};

/**
 * 单方向笔的折线数据：只含该方向的笔，
 * 相邻两笔之间插入空白点断开连线（时间取两笔端点的中点，保证严格递增）。
 * 笔的成笔条件保证两笔端点之间至少有数根原始 K 线，中点时间必然有效。
 */
function biLineData(
  bis: Bi[],
  dir: "up" | "down",
): (LineData<Time> | WhitespaceData<Time>)[] {
  const data: (LineData<Time> | WhitespaceData<Time>)[] = [];
  for (const b of bis) {
    if (b.direction !== dir) continue;
    if (data.length > 0) {
      const lastTime = (data[data.length - 1] as LineData<Time>).time as number;
      const mid = Math.round((lastTime + b.startTime) / 2);
      if (mid > lastTime && mid < b.startTime) {
        data.push({ time: mid as UTCTimestamp });
      }
    }
    data.push({ time: b.startTime as UTCTimestamp, value: b.startPrice });
    data.push({ time: b.endTime as UTCTimestamp, value: b.endPrice });
  }
  return data;
}

export default function ChanKlineChart({
  klines,
  analysis,
  showFractals,
  showBis,
  showSegments,
  showZhongShus,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const biUpRef = useRef<ISeriesApi<"Line"> | null>(null);
  const biDownRef = useRef<ISeriesApi<"Line"> | null>(null);
  const segmentRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const hubPrimRef = useRef<HubRectPrimitive | null>(null);

  // 创建图表（仅一次）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0e1117" },
        textColor: "#8b949e",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "#1c2128" },
        horzLines: { color: "#1c2128" },
      },
      rightPriceScale: { borderColor: "#2a3038" },
      timeScale: { borderColor: "#2a3038", timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: "zh-CN" },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });

    // 笔：按方向拆成两条折线（红上 / 绿下），线宽 1（需求 5.2）
    const biUp = chart.addSeries(LineSeries, {
      color: COLORS.biUp,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const biDown = chart.addSeries(LineSeries, {
      color: COLORS.biDown,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // 线段：蓝色较粗折线，线宽 2（需求 5.3）
    const segmentLine = chart.addSeries(LineSeries, {
      color: COLORS.segment,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // 中枢矩形：自定义 Primitive（需求 5.4）
    const hubPrim = new HubRectPrimitive(COLORS.hubFill, COLORS.hubBorder);
    candle.attachPrimitive(hubPrim);

    chartRef.current = chart;
    candleRef.current = candle;
    biUpRef.current = biUp;
    biDownRef.current = biDown;
    segmentRef.current = segmentLine;
    hubPrimRef.current = hubPrim;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      biUpRef.current = null;
      biDownRef.current = null;
      segmentRef.current = null;
      markersRef.current = null;
      hubPrimRef.current = null;
    };
  }, []);

  // K 线数据（所有图形锚定 time，缩放平移自动跟随）
  useEffect(() => {
    const candle = candleRef.current;
    const chart = chartRef.current;
    if (!candle || !chart) return;
    candle.setData(
      klines.map((k) => ({
        time: k.time as UTCTimestamp,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      })),
    );
    chart.timeScale().fitContent();
  }, [klines]);

  // 覆盖层：笔 / 线段 / 分型 / 中枢（开关只控制 visible 与数据，不重算）
  useEffect(() => {
    const biUp = biUpRef.current;
    const biDown = biDownRef.current;
    const segmentLine = segmentRef.current;
    const candle = candleRef.current;
    const hubPrim = hubPrimRef.current;
    if (!biUp || !biDown || !segmentLine || !candle || !hubPrim) return;

    biUp.applyOptions({ visible: showBis });
    biDown.applyOptions({ visible: showBis });
    biUp.setData(showBis ? biLineData(analysis.bis, "up") : []);
    biDown.setData(showBis ? biLineData(analysis.bis, "down") : []);

    segmentLine.applyOptions({ visible: showSegments });
    if (showSegments) {
      // 相邻线段首尾相连：同一时间的端点只保留一份
      const points: LineData<Time>[] = [];
      for (const s of analysis.segments) {
        if (points.length === 0 || points[points.length - 1].time !== s.startTime) {
          points.push({ time: s.startTime as UTCTimestamp, value: s.startPrice });
        }
        points.push({ time: s.endTime as UTCTimestamp, value: s.endPrice });
      }
      segmentLine.setData(points);
    } else {
      segmentLine.setData([]);
    }

    // 分型标记
    const markers: SeriesMarker<Time>[] = showFractals
      ? analysis.fractals.map((f): SeriesMarker<Time> => ({
          time: f.time as UTCTimestamp,
          position: f.type === "top" ? "aboveBar" : "belowBar",
          color: f.type === "top" ? COLORS.up : COLORS.down,
          shape: f.type === "top" ? "arrowDown" : "arrowUp",
          text: f.type === "top" ? "顶" : "底",
          size: 1,
        }))
      : [];
    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(candle, markers);
    } else {
      markersRef.current.setMarkers(markers);
    }

    // 中枢矩形
    hubPrim.setZhongShus(showZhongShus ? analysis.zhongshus : []);
  }, [analysis, showFractals, showBis, showSegments, showZhongShus]);

  return <div ref={containerRef} className="chart-wrap" />;
}
