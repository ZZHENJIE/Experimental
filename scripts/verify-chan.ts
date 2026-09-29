/**
 * 缠论算法验证脚本（bun scripts/verify-chan.ts 运行后即删）
 * 1. 手工构造小数据集验证：包含合并、分型、笔、中枢
 * 2. 真实 SOXL.csv 全量数据跑通
 */
import { readFileSync } from "node:fs";
import { analyzeChan, parseCsv, parseCsvTime } from "../src/lib/chan/index";
import type { Kline } from "../src/lib/chan/types";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

// ---------- 1. parseCsvTime ----------
console.log("\n[1] parseCsvTime");
const t = parseCsvTime("09/03/2026 04:00 AM");
const d = new Date(t * 1000);
check("04:00 AM → hour 4", d.getUTCHours() === 4);
check("12:00 PM → hour 12", new Date(parseCsvTime("09/03/2026 12:00 PM") * 1000).getUTCHours() === 12);
check("12:00 AM → hour 0", new Date(parseCsvTime("09/03/2026 12:00 AM") * 1000).getUTCHours() === 0);
check("07:55 PM → hour 19", new Date(parseCsvTime("09/25/2026 07:55 PM") * 1000).getUTCHours() === 19);

// ---------- 2. 包含合并 ----------
console.log("\n[2] 包含关系合并");
// K1(105-110), K2(106-108) 被 K1 包含；后续走势向下
const raw: Kline[] = [
  { time: 1, open: 106, high: 110, low: 105, close: 107 },
  { time: 2, open: 107, high: 108, low: 106, close: 107 }, // 被 K1 包含
  { time: 3, open: 105, high: 107, low: 103, close: 104 },
  { time: 4, open: 104, high: 106, low: 102, close: 103 },
  { time: 5, open: 103, high: 105, low: 101, close: 102 },
];
const m = analyzeChan(raw).merged;
check("5 根 → 4 根（K1/K2 合并）", m.length === 4, `got ${m.length}`);
check("合并后第 1 根 high=110（向上处理取大）", m[0].high === 110);
check("方向：第 2 根起向下", m[1].direction === -1);
check("originalIndices 映射", JSON.stringify(m[0].originalIndices) === "[0,1]");

// 向上包含：上升序列中出现包含，应取高高/低低
const rawUp: Kline[] = [
  { time: 1, open: 100, high: 102, low: 99, close: 101 },
  { time: 2, open: 101, high: 104, low: 100, close: 103 },
  { time: 3, open: 103, high: 106, low: 102, close: 105 }, // 不包含，方向向上
  { time: 4, open: 105, high: 105, low: 103, close: 104 }, // (105,103) 被 (106,102) 包含
];
const mUp = analyzeChan(rawUp).merged;
check("向上包含 → 取高高/低低", mUp[mUp.length - 1].high === 106 && mUp[mUp.length - 1].low === 103, `got ${mUp[mUp.length - 1].high},${mUp[mUp.length - 1].low}`);

// ---------- 3. 分型 ----------
console.log("\n[3] 分型识别");
const rawFrac: Kline[] = [
  { time: 1, open: 100, high: 101, low: 99, close: 100 },
  { time: 2, open: 100, high: 102, low: 100, close: 101 },
  { time: 3, open: 101, high: 105, low: 101, close: 104 }, // 顶
  { time: 4, open: 104, high: 103, low: 100, close: 101 },
  { time: 5, open: 101, high: 100, low: 98, close: 99 },
  { time: 6, open: 99, high: 99, low: 96, close: 97 },   // 底
  { time: 7, open: 97, high: 100, low: 97, close: 99 },
  { time: 8, open: 99, high: 103, low: 99, close: 102 },
  { time: 9, open: 102, high: 106, low: 102, close: 105 }, // 顶
  { time: 10, open: 105, high: 104, low: 101, close: 102 },
];
const fa = analyzeChan(rawFrac);
check("识别出顶-底-顶 3 个分型", fa.fractals.length === 3, `got ${JSON.stringify(fa.fractals)}`);
check("分型类型交替 top/bottom/top", fa.fractals.map((f) => f.type).join(",") === "top,bottom,top");

// ---------- 4. 笔（新笔定义） ----------
console.log("\n[4] 笔识别");
// 索引差 >= 4 才成笔：上面 top(2) → bottom(5) 差 3，不成笔；bottom(5) → top(8) 差 3，也不成笔
check("间隔不足不成笔", fa.strokes.length === 0, `got ${fa.strokes.length}`);

// 构造满足间隔的：顶在 idx4，底在 idx9（差 5 ≥ 4）→ 1 笔
const rawStroke: Kline[] = [
  { time: 1, open: 100, high: 102, low: 100, close: 101 },
  { time: 2, open: 101, high: 104, low: 101, close: 103 },
  { time: 3, open: 103, high: 107, low: 103, close: 106 },
  { time: 4, open: 106, high: 110, low: 106, close: 109 }, // 顶 idx4 (合并后)
  { time: 5, open: 109, high: 108, low: 104, close: 105 },
  { time: 6, open: 105, high: 105, low: 101, close: 102 },
  { time: 7, open: 102, high: 102, low: 98, close: 99 },
  { time: 8, open: 99, high: 97, low: 94, close: 95 },
  { time: 9, open: 95, high: 96, low: 92, close: 93 },  // 底
  { time: 10, open: 93, high: 97, low: 93, close: 96 },
  { time: 11, open: 96, high: 100, low: 96, close: 99 },
  { time: 12, open: 99, high: 103, low: 99, close: 102 },
];
const st = analyzeChan(rawStroke);
check("成 1 笔（间隔 5）", st.strokes.length === 1, `got ${st.strokes.length}`);
if (st.strokes.length === 1) {
  check("方向 down", st.strokes[0].direction === "down");
  check("顶价 110 > 底价", st.strokes[0].startPrice === 110 && st.strokes[0].endPrice < st.strokes[0].startPrice);
}

// minBars 可调：同样数据 minBars=3（索引差>=2）应产生更多笔
const st3 = analyzeChan(rawFrac.map((k) => ({ ...k })), 3);
check("minBars=3 时间隔 3 可成笔", st3.strokes.length >= 1, `got ${st3.strokes.length}`);

// ---------- 5. 中枢 ----------
console.log("\n[5] 中枢识别");
// 三笔重叠：下 110→95，上 95→105，下 105→98（区间 [98,105] 与 [95,110]/[95,105] 重叠）
const rawHub: Kline[] = [];
// 直接用笔构造测试中枢（绕过 K 线，直接测 findHubs 逻辑链路：构造分型序列）
// 简化：构造足够多分型的合成数据 —— 用震荡行情
let price = 100;
for (let i = 0; i < 240; i++) {
  const wave = Math.sin(i / 6) * 6 + Math.sin(i / 17) * 3;
  const o = price;
  price = 100 + wave;
  rawHub.push({
    time: i + 1,
    open: o,
    high: Math.max(o, price) + 1.5,
    low: Math.min(o, price) - 1.5,
    close: price,
  });
}
const hub = analyzeChan(rawHub);
check("震荡行情产生笔", hub.strokes.length >= 6, `got ${hub.strokes.length} 笔`);
check("震荡行情产生中枢", hub.hubs.length >= 1, `got ${hub.hubs.length}`);
for (const h of hub.hubs) {
  check(`中枢区间有效 (low ${h.low.toFixed(2)} < high ${h.high.toFixed(2)})`, h.low < h.high);
}

// ---------- 6. 真实数据 ----------
console.log("\n[6] 真实 SOXL.csv");
const csv = readFileSync(new URL("../public/SOXL.csv", import.meta.url), "utf8");
const klines = parseCsv(csv);
check("解析出 3000+ 根", klines.length > 3000, `got ${klines.length}`);
check("时间严格递增", klines.every((k, i) => i === 0 || k.time > klines[i - 1].time));
const real = analyzeChan(klines);
console.log(`    原始 ${klines.length} → 合并 ${real.merged.length} → 分型 ${real.fractals.length} → 笔 ${real.strokes.length} → 线段 ${real.segments.length} → 中枢 ${real.hubs.length}`);
check("合并数量小于原始", real.merged.length < klines.length);
check("分型少于合并 K 线", real.fractals.length < real.merged.length);
check("笔首尾相连（时间连续）", real.strokes.every((s, i) => i === 0 || s.startTime >= real.strokes[i - 1].endTime));
check("笔方向交替", real.strokes.every((s, i) => i === 0 || s.direction !== real.strokes[i - 1].direction));
check("笔顶价高于底价", real.strokes.every((s) => (s.direction === "down" ? s.startPrice > s.endPrice : s.endPrice > s.startPrice)));
check("分型时间能对上原始 K 线", real.fractals.every((f) => klines.some((k) => k.time === f.time)));

console.log(failed === 0 ? "\n🎉 全部通过" : `\n💥 ${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
