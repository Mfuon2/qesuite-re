import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Icon } from "./Icon";
import { dateAtUtc, dateKeyAtUtc, DateRange, formatDateRange, monthStart, shiftMonth, todayNairobi, todayRange } from "../lib/nairobi";

export function DateRangeButton({ range, onClick, compact = false }: { range: DateRange; onClick: () => void; compact?: boolean }) {
  const isToday = range.from === todayNairobi() && range.to === range.from;
  return <button className={`date-range-button${compact ? " compact" : ""}`} onClick={onClick} aria-label="Choose date range">
    <CalendarDays aria-hidden="true" />
    <span>{isToday ? "Today" : formatDateRange(range)}</span>
    {!compact && <small>{isToday ? formatDateRange(range) : "Date range"}</small>}
  </button>;
}

export function DateRangePicker({ range, onChange, onClose }: { range: DateRange; onChange: (range: DateRange) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<DateRange>(range);
  const [month, setMonth] = useState(() => monthStart(range.to));
  const days = useMemo(() => calendarDays(month), [month]);
  const monthLabel = new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);

  function choose(key: string) {
    if (!draft.from || (draft.from && draft.to && draft.from !== draft.to)) {
      setDraft({ from: key, to: key });
      return;
    }
    setDraft(key < draft.from ? { from: key, to: draft.from } : { from: draft.from, to: key });
  }

  function applyPreset(next: DateRange) {
    setDraft(next);
    setMonth(monthStart(next.to));
  }

  const presets = [
    { label: "Today", range: todayRange() },
    { label: "Last 7 days", range: daysBack(6) },
    { label: "This month", range: monthRange() }
  ];

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet date-range-sheet" aria-label="Choose date range">
        <div className="sheet-handle" />
        <header className="sheet-header"><div><div className="eyebrow">Business records</div><h2>Choose dates</h2></div><button className="icon-button" aria-label="Close date picker" onClick={onClose}><Icon name="close" /></button></header>
        <div className="date-presets" aria-label="Quick date ranges">
          {presets.map((preset) => <button key={preset.label} className={sameRange(draft, preset.range) ? "active" : ""} onClick={() => applyPreset(preset.range)}>{preset.label}</button>)}
        </div>
        <div className="range-readout"><div><small>From</small><strong>{formatShortDate(draft.from)}</strong></div><span>to</span><div><small>To</small><strong>{formatShortDate(draft.to)}</strong></div></div>
        <div className="calendar-heading"><button aria-label="Previous month" onClick={() => setMonth((current) => shiftMonth(current, -1))}><Icon name="chevron" /></button><strong>{monthLabel}</strong><button aria-label="Next month" onClick={() => setMonth((current) => shiftMonth(current, 1))}><Icon name="chevron" /></button></div>
        <div className="calendar-weekdays" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {days.map((day, index) => day ? <button key={day} className={dayClass(day, draft)} onClick={() => choose(day)} aria-pressed={day === draft.from || day === draft.to}>{Number(day.slice(-2))}</button> : <span key={`blank-${index}`} />)}
        </div>
        <button className="primary-button" onClick={() => onChange(draft)}>Apply {formatDateRange(draft)}</button>
      </section>
    </div>
  );
}

function calendarDays(month: Date): Array<string | null> {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const leading = (month.getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return [...Array<string | null>(leading).fill(null), ...Array.from({ length: total }, (_, index) => dateKeyAtUtc(new Date(Date.UTC(year, monthIndex, index + 1))))];
}

function dayClass(day: string, range: DateRange): string {
  const selected = day === range.from || day === range.to;
  const between = day > range.from && day < range.to;
  const today = day === todayNairobi();
  return `calendar-day${selected ? " selected" : ""}${between ? " between" : ""}${today ? " today" : ""}`;
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(dateAtUtc(value));
}

function sameRange(first: DateRange, second: DateRange): boolean {
  return first.from === second.from && first.to === second.to;
}

function daysBack(days: number): DateRange {
  const to = todayNairobi();
  const date = dateAtUtc(to);
  date.setUTCDate(date.getUTCDate() - days);
  return { from: dateKeyAtUtc(date), to };
}

function monthRange(): DateRange {
  const to = todayNairobi();
  const start = monthStart(to);
  return { from: dateKeyAtUtc(start), to };
}
