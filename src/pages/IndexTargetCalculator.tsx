import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link } from "react-router";

/**
 * 通用公式：L₁ = O₁ × (1 + (L₂ − O₂) ÷ O₂ × S ÷ P)
 *
 * O₁ = 指数开盘价
 * O₂ = ETF 开盘价
 * L₂ = ETF 目标价（现价）
 * L₁ = 指数目标价（现价）
 * P  = ETF 杠杆倍数（取正值，如 3）
 * S  = 方向参数：做多 ETF（正向，如 TNA）S = +1；做空 ETF（反向，如 TZA）S = -1
 */
function calcIndexTarget(
  o1: number,
  o2: number,
  l2: number,
  p: number,
  s: 1 | -1,
) {
  const etfChangePct = (l2 - o2) / o2;          // ETF 相对开盘的涨跌幅
  const indexChangePct = (etfChangePct * s) / p; // 指数需要的涨跌幅
  const l1 = o1 * (1 + indexChangePct);
  return { etfChangePct, indexChangePct, l1 };
}

/**
 * 生成上下方向键步进调整输入值的 onKeyDown 处理器。
 * 步长为 step（如 1 或 0.01），最小值 min，保留原有小数位数。
 */
function arrowStepHandler(
  value: string,
  onChange: (v: string) => void,
  step: number,
  min: number,
) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const parsed = parseFloat(value);
    const base = Number.isFinite(parsed) ? parsed : 0;
    const stepDecimals = (String(step).split(".")[1] ?? "").length;
    const curDecimals = (value.split(".")[1] ?? "").length;
    const next = base + (e.key === "ArrowUp" ? step : -step);
    onChange(String(Math.max(min, Number(next.toFixed(Math.max(stepDecimals, curDecimals))))));
  };
}

type Preset = {
  label: string;
  desc: string;
  symbol: string;
  direction: 1 | -1;
  o2: number;
  l2: number;
  leverage: number;
};

const PRESETS: Preset[] = [
  {
    label: "TZA 示例",
    desc: "做空 ETF：4.5 → 4.3，3 倍",
    symbol: "TZA",
    direction: -1,
    o2: 4.5,
    l2: 4.3,
    leverage: 3,
  },
  {
    label: "TNA 示例",
    desc: "做多 ETF：40 → 38，3 倍",
    symbol: "TNA",
    direction: 1,
    o2: 40,
    l2: 38,
    leverage: 3,
  },
];

export default function IndexTargetCalculator() {
  const [o1, setO1] = useState("2410");
  const [o2, setO2] = useState("4.5");
  const [l2, setL2] = useState("4.3");
  const [leverage, setLeverage] = useState("3");
  const [direction, setDirection] = useState<1 | -1>(-1);

  const parsed = useMemo(() => {
    const O1 = parseFloat(o1);
    const O2 = parseFloat(o2);
    const L2 = parseFloat(l2);
    const P = Math.abs(parseFloat(leverage));
    if (!Number.isFinite(O1) || !Number.isFinite(O2) || !Number.isFinite(L2) || !Number.isFinite(P) || O2 === 0 || P === 0) {
      return null;
    }
    return calcIndexTarget(O1, O2, L2, P, direction);
  }, [o1, o2, l2, leverage, direction]);

  const applyPreset = (p: Preset) => {
    setO2(String(p.o2));
    setL2(String(p.l2));
    setLeverage(String(p.leverage));
    setDirection(p.direction);
  };

  const fmt = (n: number) =>
    (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";

  return (
    <div className="card">
      <Link to="/" className="back">← 返回主页</Link>
      <h1>指数目标价计算器</h1>
      <p className="subtitle">由杠杆 ETF 的目标价反推指数需要的涨跌幅</p>
      <div className="formula">
        L₁ = O₁ × (1 + (L₂ − O₂) ÷ O₂ × S ÷ P)
      </div>

      <div className="dir">
        <button
          className={direction === 1 ? "active" : ""}
          onClick={() => setDirection(1)}
        >
          做多 ETF（正向，如 TNA）→ S = +1
        </button>
        <button
          className={direction === -1 ? "active" : ""}
          onClick={() => setDirection(-1)}
        >
          做空 ETF（反向，如 TZA）→ S = −1
        </button>
      </div>

      <div className="section-title">指数与杠杆</div>
      <div className="row">
        <div className="field">
          <label>O₁ 指数开盘价</label>
          <input inputMode="decimal" value={o1} onChange={(e) => setO1(e.target.value)} />
        </div>
        <div className="field">
          <label>
            P 杠杆倍数 <span className="step-hint">↑↓ ±1</span>
          </label>
          <input
            inputMode="decimal"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            onKeyDown={arrowStepHandler(leverage, setLeverage, 1, 1)}
          />
        </div>
      </div>

      <div className="section-title">ETF 价格</div>
      <div className="row">
        <div className="field">
          <label>O₂ ETF 开盘价</label>
          <input inputMode="decimal" value={o2} onChange={(e) => setO2(e.target.value)} />
        </div>
        <div className="field">
          <label>
            L₂ ETF 目标价 <span className="step-hint">↑↓ ±0.01</span>
          </label>
          <input
            inputMode="decimal"
            value={l2}
            onChange={(e) => setL2(e.target.value)}
            onKeyDown={arrowStepHandler(l2, setL2, 0.01, 0.01)}
          />
        </div>
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.symbol} onClick={() => applyPreset(p)} title={p.desc}>
            {p.label}
          </button>
        ))}
      </div>

      {parsed ? (
        <div className="result">
          <div className="kv main">
            <span>L₁ 指数目标价</span>
            <span className="v">{parsed.l1.toFixed(2)}</span>
          </div>
          <div className="kv">
            <span>ETF 相对开盘涨跌幅</span>
            <span className={`v ${parsed.etfChangePct >= 0 ? "up" : "down"}`}>
              {fmt(parsed.etfChangePct)}
            </span>
          </div>
          <div className="kv">
            <span>指数需要的涨跌幅（÷P 后）</span>
            <span className={`v ${parsed.indexChangePct >= 0 ? "up" : "down"}`}>
              {fmt(parsed.indexChangePct)}
            </span>
          </div>
          <div className="hint">
            {direction === 1
              ? "正向 ETF：ETF 上涨 → 指数同步上涨。"
              : "反向 ETF：ETF 上涨 → 指数需要下跌。"}
            每天开盘后替换 O₁ 和 O₂，重算一次即可。
          </div>
        </div>
      ) : (
        <div className="error">请输入有效的数字（O₂ 和 P 不能为 0）。</div>
      )}
    </div>
  );
}
