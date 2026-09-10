import type { BusinessEvent, DashboardSummary, Product } from "@qesuite/shared";
import { dateAtUtc, dateKeyAtUtc, eventBusinessDate, todayRange, type DateRange } from "./nairobi";

export function eventsForToday(events: BusinessEvent[]): BusinessEvent[] {
  return eventsForDateRange(events, todayRange());
}

export function eventsForDateRange(events: BusinessEvent[], range: DateRange): BusinessEvent[] {
  return events.filter((event) => {
    const date = eventBusinessDate(event);
    return date >= range.from && date <= range.to;
  });
}

export function calculateSummary(events: BusinessEvent[], range: DateRange = todayRange()): DashboardSummary {
  const scoped = eventsForDateRange(events, range);
  const total = (type: BusinessEvent["type"]) =>
    scoped.filter((event) => event.type === type).reduce((sum, event) => sum + (event.amount ?? 0), 0);

  const sales = total("sale");
  const stockPurchases = total("stock_purchase");
  const otherExpenses = total("expense");
  const expenses = stockPurchases + otherExpenses;
  const topUps = total("top_up");
  const withdrawals = total("withdrawal");

  const allTimeTotal = (type: BusinessEvent["type"]) =>
    events.filter((event) => eventBusinessDate(event) <= range.to && event.type === type).reduce((sum, event) => sum + (event.amount ?? 0), 0);

  const cash =
    allTimeTotal("sale") +
    allTimeTotal("top_up") -
    allTimeTotal("stock_purchase") -
    allTimeTotal("expense") -
    allTimeTotal("withdrawal");

  return {
    sales,
    expenses,
    topUps,
    withdrawals,
    estimatedProfit: sales - expenses,
    cash
  };
}

export type FinancialTrendPoint = {
  date: string;
  profit: number;
  trend: number;
};

/**
 * A continuous daily series for the selected business date range. Empty days
 * remain zero so the chart accurately represents quiet days rather than
 * joining unrelated transactions together.
 */
export function financialTrend(events: BusinessEvent[], range: DateRange): FinancialTrendPoint[] {
  const totals = new Map<string, { sales: number; expenses: number }>();
  for (const event of eventsForDateRange(events, range)) {
    const date = eventBusinessDate(event);
    const day = totals.get(date) ?? { sales: 0, expenses: 0 };
    if (event.type === "sale") day.sales += event.amount ?? 0;
    if (event.type === "expense" || event.type === "stock_purchase") day.expenses += event.amount ?? 0;
    totals.set(date, day);
  }

  const dates: string[] = [];
  const cursor = dateAtUtc(range.from);
  const end = dateAtUtc(range.to);
  while (cursor <= end) {
    dates.push(dateKeyAtUtc(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const profits = dates.map((date) => {
    const day = totals.get(date);
    return (day?.sales ?? 0) - (day?.expenses ?? 0);
  });
  // Exponential smoothing follows the direction of the business without
  // duplicating every daily peak and dip. The chart then passes these values
  // through its Bezier renderer to produce a calm directional curve.
  const smoothing = 0.5;
  let level = profits[0] ?? 0;
  return dates.map((date, index) => {
    if (index > 0) level = smoothing * profits[index] + (1 - smoothing) * level;
    return { date, profit: profits[index], trend: level };
  });
}

export type FoodSnapshot = {
  product: Product;
  made: number;
  sold: number;
  left: number;
  unrecorded: number;
  hasStockCount: boolean;
  hasProduction: boolean;
  saleAvailable: number;
  saleBlockedReason?: string;
};

export function foodSnapshot(products: Product[], events: BusinessEvent[], range: DateRange = todayRange()): FoodSnapshot[] {
  const scoped = eventsForDateRange(events, range);
  // Inventory carries forward. A sale today may correctly use a count and food
  // made yesterday; only the displayed made/sold figures are range-specific.
  const inventoryHistory = events
    .filter((event) => eventBusinessDate(event) <= range.to)
    .filter((event) => event.itemId && ["production", "stock_count", "sale"].includes(event.type))
    .sort((first, second) => first.occurredAt.localeCompare(second.occurredAt) || first.createdAt.localeCompare(second.createdAt));

  return products.map((product) => {
    const made = scoped
      .filter((event) => event.type === "production" && event.itemId === product.id)
      .reduce((sum, event) => sum + (event.quantity ?? 0), 0);
    const sold = scoped
      .filter((event) => event.type === "sale" && event.itemId === product.id)
      .reduce((sum, event) => sum + (event.quantity ?? 0), 0);
    let madeBefore = false;
    let hasStockCount = false;
    let left = 0;
    for (const event of inventoryHistory) {
      if (event.itemId !== product.id) continue;
      const quantity = event.quantity ?? 0;
      if (event.type === "production") {
        madeBefore = true;
        // Making food is stock-in. A later physical count can correct this
        // number, but is not required to make newly prepared food sellable.
        left += quantity;
      } else if (event.type === "stock_count") {
        hasStockCount = true;
        left = quantity;
      } else if (event.type === "sale" && hasStockCount && madeBefore) {
        left = Math.max(0, left - quantity);
      }
    }
    const unrecorded = Math.max(0, sold + left - made);
    const hasProduction = madeBefore;
    const saleAvailable = hasProduction ? left : 0;
    const saleBlockedReason = !hasProduction
      ? "Make this food first before recording a sale."
      : left <= 0 ? "No stock is available for sale." : undefined;

    return { product, made, sold, left, unrecorded, hasStockCount, hasProduction, saleAvailable, saleBlockedReason };
  });
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
    .format(value)
    .replace("KES", "KSh");
}
