import type { Kline } from "./types";

/**
 * 解析 CSV 时间字符串 "09/03/2026 04:00 AM" → Unix 秒。
 * 时间按 CSV 原样（不做时区换算）当作 UTC 处理，保证图表显示与 CSV 文本一致。
 */
export function parseCsvTime(s: string): number {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(
    s.trim(),
  );
  if (!m) return NaN;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]) % 12;
  if ((m[6] ?? "").toUpperCase() === "PM") hour += 12;
  const minute = Number(m[5]);
  return Date.UTC(year, month - 1, day, hour, minute) / 1000;
}

/** 解析 SOXL.csv（Date,Open,High,Low,Close[,Volume]），按时间升序去重 */
export function parseCsv(text: string): Kline[] {
  const lines = text.trim().split(/\r?\n/);
  const map = new Map<number, Kline>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const time = parseCsvTime(cols[0]);
    const open = parseFloat(cols[1]);
    const high = parseFloat(cols[2]);
    const low = parseFloat(cols[3]);
    const close = parseFloat(cols[4]);
    if (
      !Number.isFinite(time) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    map.set(time, { time, open, high, low, close });
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}
