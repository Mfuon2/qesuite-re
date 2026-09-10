import { useEffect, useMemo, useState } from "react";
import type { BusinessEvent } from "@qesuite/shared";
import { financialTrend, formatMoney, type FinancialTrendPoint } from "../lib/metrics";
import { dateAtUtc, type DateRange } from "../lib/nairobi";

const WIDTH = 680;
const HEIGHT = 202;
// Keep a visible gutter for monetary values at all responsive widths.
const PADDING = { top: 16, right: 16, bottom: 31, left: 76 };

type Point = FinancialTrendPoint & { x: number; profitY: number; trendY: number };

export function FinancialTrendChart({ events, range }: { events: BusinessEvent[]; range: DateRange }) {
  const series = useMemo(() => financialTrend(events, range), [events, range]);
  const [selected, setSelected] = useState(Math.max(0, series.length - 1));
  useEffect(() => setSelected(Math.max(0, series.length - 1)), [series.length, range.from, range.to]);

  const activity = events.some((event) => (event.type === "sale" || event.type === "expense" || event.type === "stock_purchase") && (event.amount ?? 0) !== 0);
  const { points, zeroY, scale, yTicks } = useMemo(() => positionSeries(series), [series]);
  const selectedPoint = points[Math.min(selected, Math.max(0, points.length - 1))];
  const profitRuns = useMemo(() => smoothRuns(points), [points]);
  const trendRuns = useMemo(() => smoothTrendRuns(points, zeroY), [points, zeroY]);
  const labels = xLabels(points);
  const singlePoint = points.length === 1 ? points[0] : null;

  return (
    <section className="trend-card" aria-labelledby="trend-title">
      <div className="trend-header"><div><p className="eyebrow">Financial trend</p><h3 id="trend-title">Profit & loss</h3></div><div className="trend-legend" aria-label="Chart legend"><span className="profit-key">Profit</span><span className="loss-key">Loss</span><span className="variance-key">Trend</span></div></div>
      {!activity ? <div className="trend-empty">No sales or expenses were recorded for these dates.</div> : <>
        <div className="trend-canvas">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Daily profit and loss with business trajectory" preserveAspectRatio="none">
            <defs>
              <linearGradient id="profit-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#20a56c" stopOpacity=".32" /><stop offset="1" stopColor="#20a56c" stopOpacity=".015" /></linearGradient>
              <linearGradient id="loss-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#de5b62" stopOpacity=".02" /><stop offset="1" stopColor="#de5b62" stopOpacity=".3" /></linearGradient>
            </defs>
            {yTicks.map((tick) => <g key={tick.value}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={tick.y} y2={tick.y} className={tick.value === 0 ? "trend-zero-line" : "trend-grid-line"} />
              <text x={PADDING.left - 9} y={tick.y + 3.5} className="trend-y-axis-label" textAnchor="end">{formatAxisMoney(tick.value)}</text>
            </g>)}
            {singlePoint ? <><rect x={singlePoint.x - 48} y={Math.min(zeroY, singlePoint.profitY)} width="96" height={Math.max(2, Math.abs(singlePoint.profitY - zeroY))} rx="5" fill={singlePoint.profit >= 0 ? "url(#profit-fill)" : "url(#loss-fill)"} /><line x1={singlePoint.x} y1={zeroY} x2={singlePoint.x} y2={singlePoint.profitY} className={singlePoint.profit >= 0 ? "trend-profit-line" : "trend-loss-line"} /></> : <>
              <g className="trend-smooth-series">
                {profitRuns.map((run, index) => <path key={`smooth-fill-${index}`} d={areaPath(run.points, zeroY)} fill={run.positive ? "url(#profit-fill)" : "url(#loss-fill)"} />)}
                {profitRuns.map((run, index) => <path key={`smooth-profit-${index}`} d={smoothPath(run.points, "profitY")} className={run.positive ? "trend-profit-line" : "trend-loss-line"} />)}
              </g>
            </>}
            {trendRuns.map((run, index) => <path key={`trend-${index}`} d={smoothPath(run.points, "trendY")} className={`trend-variance-line ${run.positive ? "positive" : "negative"}`} />)}
            {points.map((point, index) => <circle key={point.date} className={`trend-point ${point.profit < 0 ? "loss" : "profit"}${index === selected ? " selected" : ""}`} cx={point.x} cy={point.profitY} r={index === selected ? 4.2 : 2.8} role="button" tabIndex={0} aria-label={`${formatShortDate(point.date)}: profit ${formatMoney(point.profit)}, business trend ${formatMoney(point.trend)}`} onClick={() => setSelected(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(index); }} />)}
            {labels.map((point) => <text key={point.date} x={point.x} y={HEIGHT - 8} className="trend-axis-label" textAnchor={point.anchor}>{formatAxisDate(point.date)}</text>)}
          </svg>
        </div>
        {selectedPoint && <div className="trend-detail"><strong>{formatShortDate(selectedPoint.date)}</strong><span className={selectedPoint.profit >= 0 ? "positive" : "negative"}>{selectedPoint.profit >= 0 ? "Profit" : "Loss"} {formatMoney(Math.abs(selectedPoint.profit))}</span><span>Trend {selectedPoint.trend >= 0 ? "+" : ""}{formatMoney(selectedPoint.trend)}</span></div>}
        <p className="trend-scale">Zero line · daily result · directional trend · scale {formatMoney(scale)}</p>
      </>}
    </section>
  );
}

function positionSeries(series: FinancialTrendPoint[]) {
  const max = Math.max(1, ...series.flatMap((point) => [Math.abs(point.profit), Math.abs(point.trend)]));
  const scale = roundChartScale(max * 1.15);
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const zeroY = PADDING.top + innerHeight / 2;
  const y = (value: number) => zeroY - value / scale * (innerHeight / 2);
  const points = series.map((point, index) => ({
    ...point,
    x: series.length === 1 ? WIDTH / 2 : PADDING.left + index / (series.length - 1) * innerWidth,
    profitY: y(point.profit),
    trendY: y(point.trend)
  }));
  return {
    points,
    zeroY,
    scale,
    yTicks: [
      { value: scale, y: y(scale) },
      { value: 0, y: zeroY },
      { value: -scale, y: y(-scale) }
    ]
  };
}

function roundChartScale(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatAxisMoney(value: number): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1_000_000) return `${sign}KSh ${(absolute / 1_000_000).toLocaleString("en-KE", { maximumFractionDigits: 1 })}M`;
  if (absolute >= 10_000) return `${sign}KSh ${(absolute / 1_000).toLocaleString("en-KE", { maximumFractionDigits: 0 })}k`;
  return `${sign}KSh ${absolute.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function smoothRuns(points: Point[]): Array<{ points: Point[]; positive: boolean }> {
  if (points.length === 0) return [];
  const runs: Array<{ points: Point[]; positive: boolean }> = [];
  let current = { points: [points[0]], positive: points[0].profit >= 0 };
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const nextPositive = to.profit >= 0;
    if (current.positive === nextPositive || from.profit === 0 || to.profit === 0) {
      current.points.push(to);
      continue;
    }
    const fraction = Math.abs(from.profit) / (Math.abs(from.profit) + Math.abs(to.profit));
    const crossing: Point = { ...from, x: from.x + (to.x - from.x) * fraction, profit: 0, profitY: PADDING.top + (HEIGHT - PADDING.top - PADDING.bottom) / 2, trendY: from.trendY };
    current.points.push(crossing);
    runs.push(current);
    current = { points: [crossing, to], positive: nextPositive };
  }
  runs.push(current);
  return runs;
}

function smoothTrendRuns(points: Point[], zeroY: number): Array<{ points: Point[]; positive: boolean }> {
  if (points.length === 0) return [];
  const runs: Array<{ points: Point[]; positive: boolean }> = [];
  let current = { points: [points[0]], positive: points[0].trend >= 0 };
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const nextPositive = to.trend >= 0;
    if (current.positive === nextPositive || to.trend === 0) {
      current.points.push(to);
      continue;
    }
    if (from.trend === 0) {
      runs.push(current);
      current = { points: [from, to], positive: nextPositive };
      continue;
    }
    const fraction = Math.abs(from.trend) / (Math.abs(from.trend) + Math.abs(to.trend));
    const crossing: Point = {
      ...from,
      x: from.x + (to.x - from.x) * fraction,
      trend: 0,
      trendY: zeroY
    };
    current.points.push(crossing);
    runs.push(current);
    current = { points: [crossing, to], positive: nextPositive };
  }
  runs.push(current);
  return runs;
}

/** A Catmull–Rom curve converted to Bezier commands, anchored at actual days. */
function smoothPath(points: Point[], yKey: "profitY" | "trendY"): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0][yKey]}`;
  let path = `M${points[0].x} ${points[0][yKey]}`;
  for (let index = 0; index < points.length - 1; index++) {
    const before = points[index === 0 ? 0 : index - 1];
    const from = points[index];
    const to = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];
    path += ` C${from.x + (to.x - before.x) / 6} ${from[yKey] + (to[yKey] - before[yKey]) / 6} ${to.x - (after.x - from.x) / 6} ${to[yKey] - (after[yKey] - from[yKey]) / 6} ${to.x} ${to[yKey]}`;
  }
  return path;
}

function areaPath(points: Point[], zeroY: number): string {
  if (points.length === 0) return "";
  return `${smoothPath(points, "profitY")} L${points[points.length - 1].x} ${zeroY} L${points[0].x} ${zeroY} Z`;
}

function xLabels(points: Point[]): Array<Point & { anchor: "start" | "middle" | "end" }> {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0], anchor: "middle" }];
  const middle = points[Math.floor((points.length - 1) / 2)];
  const labels: Array<Point & { anchor: "start" | "middle" | "end" }> = [{ ...points[0], anchor: "start" }, { ...middle, anchor: "middle" }, { ...points[points.length - 1], anchor: "end" }];
  return labels.filter((point, index, all) => all.findIndex((item) => item.date === point.date) === index);
}

function formatAxisDate(date: string): string {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "UTC" }).format(dateAtUtc(date));
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(dateAtUtc(date));
}
