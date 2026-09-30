import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import ChanKlineChart from "../components/ChanKlineChart";
import { computeChan, parseCsv } from "../lib/chan";
import type { BiMode, Kline } from "../lib/chan";

const DEFAULTS = {
  biMode: "strict" as BiMode,
  showFractals: true,
  showBis: true,
  showSegments: false,
  showZhongShus: true,
};

export default function ChanKline() {
  const [klines, setKlines] = useState<Kline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [biMode, setBiMode] = useState<BiMode>(DEFAULTS.biMode);
  const [showFractals, setShowFractals] = useState(DEFAULTS.showFractals);
  const [showBis, setShowBis] = useState(DEFAULTS.showBis);
  const [showSegments, setShowSegments] = useState(DEFAULTS.showSegments);
  const [showZhongShus, setShowZhongShus] = useState(DEFAULTS.showZhongShus);

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

  const analysis = useMemo(() => {
    if (!klines) return null;
    try {
      const result = computeChan(klines, biMode);
      setError(null);
      return result;
    } catch (e) {
      // 线段 / 中枢结构校验失败：提示错误，不渲染非法结构
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [klines, biMode]);

  const reset = () => {
    setBiMode(DEFAULTS.biMode);
    setShowFractals(DEFAULTS.showFractals);
    setShowBis(DEFAULTS.showBis);
    setShowSegments(DEFAULTS.showSegments);
    setShowZhongShus(DEFAULTS.showZhongShus);
  };

  return (
    <div className="card wide">
      <Link to="/" className="back">← 返回主页</Link>
      <h1>缠论 K 线图</h1>
      <p className="subtitle">SOXL 5 分钟 K 线：包含处理 → 分型 → 笔 → 线段（特征序列法）→ 中枢</p>

      {error && <div className="error">数据加载失败：{error}</div>}
      {!error && !klines && <div className="loading">加载 SOXL.csv …</div>}
      {!error && klines && analysis && (
        <>
          <div className="chan-controls">
            <label className="field num">
              <span>笔模式</span>
              <select
                value={biMode}
                onChange={(e) => setBiMode(e.target.value as BiMode)}
              >
                <option value="strict">严格笔（默认）</option>
                <option value="new">新笔</option>
              </select>
            </label>

            <label className="toggle">
              <input type="checkbox" checked={showFractals} onChange={(e) => setShowFractals(e.target.checked)} />
              分型标记
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showBis} onChange={(e) => setShowBis(e.target.checked)} />
              笔
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showSegments} onChange={(e) => setShowSegments(e.target.checked)} />
              线段
            </label>
            <label className="toggle">
              <input type="checkbox" checked={showZhongShus} onChange={(e) => setShowZhongShus(e.target.checked)} />
              中枢
            </label>

            <button className="btn" onClick={reset}>重置</button>
          </div>

          <div className="stats">
            <span>K 线 <b>{klines.length}</b></span>
            <span>合并后 <b>{analysis.merged.length}</b></span>
            <span>分型 <b>{analysis.fractals.length}</b></span>
            <span>笔 <b>{analysis.bis.length}</b></span>
            <span>线段 <b>{analysis.segments.length}</b></span>
            <span>中枢 <b>{analysis.zhongshus.length}</b></span>
          </div>

          <ChanKlineChart
            klines={klines}
            analysis={analysis}
            showFractals={showFractals}
            showBis={showBis}
            showSegments={showSegments}
            showZhongShus={showZhongShus}
          />

          <div className="legend">
            <span><i className="swatch bi-up" /> 向上笔</span>
            <span><i className="swatch bi-down" /> 向下笔</span>
            <span><i className="swatch segment" /> 线段</span>
            <span><i className="swatch hub" /> 中枢 [ZD, ZG]</span>
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
