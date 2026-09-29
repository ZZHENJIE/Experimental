import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { HubRectPrimitive } from "./HubRectPrimitive";
import type { ChanAnalysis, Kline } from "../lib/chan/types";

export type ChanChartOptions = {
  showFractals: boolean;
  showStrokes: boolean;
  showSegments: boolean;
  showHubs: boolean;
};

type Props = ChanChartOptions & {
  klines: Kline[];
  analysis: ChanAnalysis;
};

const COLORS = {
  up: "#f85149", // 红涨（与全站一致）
  down: "#3fb950", // 绿跌
  stroke: "#e3b341", // 笔：金色
  segment: "#a371f7", // 线段：紫色
  hubFill: "rgba(76, 141, 255, 0.10)",
  hubBorder: "rgba(76, 141, 255, 0.45)",
};

export default function ChanKlineChart({ klines, analysis, showFractals, showStrokes, showSegments, showHubs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const strokeRef = useRef<ISeriesApi<"Line"> | null>(null);
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

    const strokeLine = chart.addSeries(LineSeries, {
      color: COLORS.stroke,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const segmentLine = chart.addSeries(LineSeries, {
      color: COLORS.segment,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const hubPrim = new HubRectPrimitive(COLORS.hubFill, COLORS.hubBorder);
    candle.attachPrimitive(hubPrim);

    chartRef.current = chart;
    candleRef.current = candle;
    strokeRef.current = strokeLine;
    segmentRef.current = segmentLine;
    hubPrimRef.current = hubPrim;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      strokeRef.current = null;
      segmentRef.current = null;
      markersRef.current = null;
      hubPrimRef.current = null;
    };
  }, []);

  // K 线数据
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

  // 覆盖层：笔 / 线段 / 分型 / 中枢
  useEffect(() => {
    const strokeLine = strokeRef.current;
    const segmentLine = segmentRef.current;
    const candle = candleRef.current;
    const hubPrim = hubPrimRef.current;
    if (!strokeLine || !segmentLine || !candle || !hubPrim) return;

    strokeLine.applyOptions({ visible: showStrokes });
    if (showStrokes) {
      const points: LineData<Time>[] = [];
      for (const s of analysis.strokes) {
        if (points.length === 0 || points[points.length - 1].time !== s.startTime) {
          points.push({ time: s.startTime as UTCTimestamp, value: s.startPrice });
        }
        points.push({ time: s.endTime as UTCTimestamp, value: s.endPrice });
      }
      strokeLine.setData(points);
    } else {
      strokeLine.setData([]);
    }

    segmentLine.applyOptions({ visible: showSegments });
    if (showSegments) {
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
    if (!markersRef.current && candle) {
      markersRef.current = createSeriesMarkers(candle, markers);
    } else {
      markersRef.current?.setMarkers(markers);
    }

    // 中枢矩形
    hubPrim.setHubs(showHubs ? analysis.hubs : []);
  }, [analysis, showFractals, showStrokes, showSegments, showHubs]);

  return <div ref={containerRef} className="chart-wrap" />;
}
