import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link } from "react-router";

/**
 * 通用公式：I₁ ≈ I₀ × (1 + D × (E₀ - E₁) ÷ E₀ ÷ L)
 *
 * I₀ = 指数前收盘价
 * E₀ = ETF 前收盘价
 * E₁ = ETF 目标价
 * L  = 杠杆倍数（取正值，如 3）
 * D  = 方向参数：做空 ETF（反向，如 TZA）D = +1；做多 ETF（正向，如 TNA）D = -1
 */
function calcIndexTarget(
  i0: number,
  e0: number,
  e1: number,
  leverage: number,
  direction: 1 | -1,
) {
  const etfChangePct = (e0 - e1) / e0;          // ETF 相对前收盘的涨跌幅（跌为正）
  const indexChangePct = (direction * etfChangePct) / leverage; // 指数需要的涨跌幅
  const i1 = i0 * (1 + indexChangePct);
  return { etfChangePct, indexChangePct, i1 };
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
  e0: number;
  e1: number;
  leverage: number;
};

const PRESETS: Preset[] = [
  {
    label: "TZA 示例",
    desc: "做空 ETF：4.5 → 4.3，3 倍",
    symbol: "TZA",
    direction: 1,
    e0: 4.5,
    e1: 4.3,
    leverage: 3,
  },
  {
    label: "TNA 示例",
    desc: "做多 ETF：40 → 38，3 倍",
    symbol: "TNA",
    direction: -1,
    e0: 40,
    e1: 38,
    leverage: 3,
  },
];

export default function IndexTargetCalculator() {
  const [i0, setI0] = useState("2410");
  const [e0, setE0] = useState("4.5");
  const [e1, setE1] = useState("4.3");
  const [leverage, setLeverage] = useState("3");
  const [direction, setDirection] = useState<1 | -1>(1);

  const parsed = useMemo(() => {
    const I0 = parseFloat(i0);
    const E0 = parseFloat(e0);
    const E1 = parseFloat(e1);
    const L = Math.abs(parseFloat(leverage));
    if (!Number.isFinite(I0) || !Number.isFinite(E0) || !Number.isFinite(E1) || !Number.isFinite(L) || E0 === 0 || L === 0) {
      return null;
    }
    return calcIndexTarget(I0, E0, E1, L, direction);
  }, [i0, e0, e1, leverage, direction]);

  const applyPreset = (p: Preset) => {
    setE0(String(p.e0));
    setE1(String(p.e1));
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
        I₁ ≈ I₀ × (1 + D × (E₀ − E₁) ÷ E₀ ÷ L)
      </div>

      <div className="dir">
        <button
          className={direction === 1 ? "active" : ""}
          onClick={() => setDirection(1)}
        >
          做空 ETF（反向，如 TZA）→ D = +1
        </button>
        <button
          className={direction === -1 ? "active" : ""}
          onClick={() => setDirection(-1)}
        >
          做多 ETF（正向，如 TNA）→ D = −1
        </button>
      </div>

      <div className="section-title">指数与杠杆</div>
      <div className="row">
        <div className="field">
          <label>I₀ 指数前收盘价</label>
          <input inputMode="decimal" value={i0} onChange={(e) => setI0(e.target.value)} />
        </div>
        <div className="field">
          <label>
            L 杠杆倍数 <span className="step-hint">↑↓ ±1</span>
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
          <label>E₀ ETF 前收盘价</label>
          <input inputMode="decimal" value={e0} onChange={(e) => setE0(e.target.value)} />
        </div>
        <div className="field">
          <label>
            E₁ ETF 目标价 <span className="step-hint">↑↓ ±0.01</span>
          </label>
          <input
            inputMode="decimal"
            value={e1}
            onChange={(e) => setE1(e.target.value)}
            onKeyDown={arrowStepHandler(e1, setE1, 0.01, 0.01)}
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
            <span>I₁ 指数目标价</span>
            <span className="v">{parsed.i1.toFixed(2)}</span>
          </div>
          <div className="kv">
            <span>ETF 相对前收盘涨跌幅</span>
            <span className={`v ${direction === 1 ? "up" : "down"}`}>
              {fmt(direction === 1 ? parsed.etfChangePct : -parsed.etfChangePct)}
            </span>
          </div>
          <div className="kv">
            <span>指数需要的涨跌幅（÷L 后）</span>
            <span className={`v ${parsed.indexChangePct >= 0 ? "up" : "down"}`}>
              {fmt(parsed.indexChangePct)}
            </span>
          </div>
          <div className="hint">
            {direction === 1
              ? "反向 ETF：ETF 下跌 → 指数需要上涨。"
              : "正向 ETF：ETF 下跌 → 指数需要下跌。"}
            每天开盘前替换 I₀ 和 E₀，重算一次即可。
          </div>
        </div>
      ) : (
        <div className="error">请输入有效的数字（E₀ 和 L 不能为 0）。</div>
      )}
    </div>
  );
}
