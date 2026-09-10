export const BUSINESS_TIME_ZONE = "Africa/Nairobi";

export type DateRange = {
  from: string;
  to: string;
};

const dateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function partsFor(value: Date | string): Record<string, string> {
  return Object.fromEntries(
    dateParts.formatToParts(new Date(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
}

export function nairobiDate(value: Date | string): string {
  const parts = partsFor(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function todayNairobi(): string {
  return nairobiDate(new Date());
}

export function todayRange(): DateRange {
  const today = todayNairobi();
  return { from: today, to: today };
}

export function daysBack(days: number): DateRange {
  const to = todayNairobi();
  const from = dateAtUtc(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { from: dateKeyAtUtc(from), to };
}

export function nairobiHour(value: Date | string): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(value))
    .find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}

export function isBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function eventBusinessDate(event: { businessDate?: string; occurredAt: string }): string {
  return event.businessDate && isBusinessDate(event.businessDate) ? event.businessDate : nairobiDate(event.occurredAt);
}

export function formatNairobiDate(value: Date | string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-KE", { ...options, timeZone: BUSINESS_TIME_ZONE }).format(new Date(value));
}

export function formatDateRange(range: DateRange): string {
  const from = dateAtUtc(range.from);
  const to = dateAtUtc(range.to);
  const sameDay = range.from === range.to;
  if (sameDay) return formatNairobiDate(from, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  if (from.getUTCFullYear() === to.getUTCFullYear()) {
    if (from.getUTCMonth() === to.getUTCMonth()) {
      return `${new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "UTC" }).format(from)} – ${new Intl.DateTimeFormat("en-KE", { day: "numeric", year: "numeric", timeZone: "UTC" }).format(to)}`;
    }
    return `${new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "UTC" }).format(from)} – ${new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(to)}`;
  }
  return `${new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(from)} – ${new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(to)}`;
}

export function dateAtUtc(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateKeyAtUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function monthStart(key: string): Date {
  const date = dateAtUtc(key);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function shiftMonth(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}
