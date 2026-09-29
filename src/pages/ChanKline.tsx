import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import ChanKlineChart from "../components/ChanKlineChart";
import { analyzeChan, parseCsv } from "../lib/chan";
import type { Kline } from "../lib/chan";

const DEFAULTS = { minBars: 5, showFractals: true, showStrokes: true, showSegments: false, showHubs: true };

export default function ChanKline() {
  const [klines, setKlines] = useState<Kline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minBars, setMinBars] = useState(DEFAULTS.minBars);
  const [showFractals, setShowFractals] = useState(DEFAULTS.showFractals);
  const [showStrokes, setShowStrokes] = useState(DEFAULTS.showStrokes);
  const [showSegments, setShowSegments] = useState(DEFAULTS.showSegments);
  const [showHubs, setShowHubs] = useState(DEFAULTS.showHubs);

  useEffect(() => {
    fetch("/SOXL.csv")
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败：HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        const data = parseCsv(text);
        if (data.length === 0) throw new Error("CSV 解析结果为空");
        setKlines(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const analysis = useMemo(() => (klines ? analyzeChan(klines, minBars) : null), [klines, minBars]);

  const reset = () => {
    setMinBars(DEFAULTS.minBars);
    setShowFractals(DEFAULTS.showFractals);
    setShowStrokes(DEFAULTS.showStrokes);
    setShowSegments(DEFAULTS.showSegments);
    setShowHubs(DEFAULTS.showHubs);
  };

  return (
    <div className="card wide">
      <Link to="/" className="back">← 返回主页</Link>
      <h1>缠论 K 线图</h1>
      <p className="subtitle">SOXL 5 分钟 K 线：包含处理 → 分型 → 笔（新笔）→ 线段 / 中枢</p>

      {error && <div className="error">数据加载失败：{error}</div>}
      {!error && !klines && <div className="loading">加载 SOXL.csv …</div>}
      {!error && klines && analysis && (
        <>
          <div className="chan-controls">
            <label className="field num">
              <span>笔最小间隔 <span className="step-hint">根（含两端）</span></span>
              <input
                type="number"
                min={2}
                max={30}
                value={minBars}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setMinBars(Number.isFinite(v) ? Math.min(30, Math.max(2, v)) : DEFAULTS.minBars);
                }}
              />
            </label>

            <label className="toggle">
              <input type="checkbox" checked={showFractals} onChange={(e) => setShowFractals(e.target.checked)} />
              分型标记
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showStrokes} onChange={(e) => setShowStrokes(e.target.checked)} />
              笔
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showSegments} onChange={(e) => setShowSegments(e.target.checked)} />
              线段
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showHubs} onChange={(e) => setShowHubs(e.target.checked)} />
              中枢
            </label>

            <button className="btn" onClick={reset}>重置</button>
          </div>

          <div className="stats">
            <span>K 线 <b>{klines.length}</b></span>
            <span>合并后 <b>{analysis.merged.length}</b></span>
            <span>分型 <b>{analysis.fractals.length}</b></span>
            <span>笔 <b>{analysis.strokes.length}</b></span>
            <span>线段 <b>{analysis.segments.length}</b></span>
            <span>中枢 <b>{analysis.hubs.length}</b></span>
          </div>

          <ChanKlineChart
            klines={klines}
            analysis={analysis}
            showFractals={showFractals}
            showStrokes={showStrokes}
            showSegments={showSegments}
            showHubs={showHubs}
          />

          <div className="legend">
            <span><i className="swatch stroke" /> 笔</span>
            <span><i className="swatch segment" /> 线段（虚线）</span>
            <span><i className="swatch hub" /> 中枢区间</span>
            <span><i className="swatch top" /> 顶分型</span>
            <span><i className="swatch bottom" /> 底分型</span>
            <span><i className="swatch up" /> 阳线</span>
            <span><i className="swatch down" /> 阴线</span>
          </div>
        </>
      )}
    </div>
  );
}
