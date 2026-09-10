import { describe, expect, test } from "bun:test";
import type { BusinessEvent, Product } from "@qesuite/shared";
import { calculateSummary, financialTrend, foodSnapshot, formatMoney } from "../src/lib/metrics";

function event(type: BusinessEvent["type"], values: Partial<BusinessEvent> = {}): BusinessEvent {
  return { id: crypto.randomUUID(), businessId: "test", deviceId: "test", type, occurredAt: new Date().toISOString(), createdAt: new Date().toISOString(), syncState: "synced", ...values };
}

describe("dashboard calculations", () => {
  test("keeps owner money out of sales and profit, and carries cash forward", () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const summary = calculateSummary([
      event("top_up", { amount: 1000, occurredAt: yesterday.toISOString() }),
      event("sale", { amount: 600 }), event("expense", { amount: 100 }),
      event("stock_purchase", { amount: 200 }), event("withdrawal", { amount: 50 })
    ]);
    expect(summary).toEqual({ sales: 600, expenses: 300, estimatedProfit: 300, cash: 1250, topUps: 0, withdrawals: 50 });
  });

  test("updates stock after a physical count when food is sold or made", () => {
    const at = (hour: number) => { const date = new Date(); date.setHours(hour, 0, 0, 0); return date.toISOString(); };
    const product: Product = { id: "test-food", name: "Test food", price: 25, active: true, unit: "portion", category: "Menu" };
    const events = [event("production", { itemId: product.id, quantity: 20, occurredAt: at(7) }), event("stock_count", { itemId: product.id, quantity: 8, occurredAt: at(8) }), event("sale", { itemId: product.id, quantity: 3, occurredAt: at(9) }), event("production", { itemId: product.id, quantity: 2, occurredAt: at(10) })];
    expect(foodSnapshot([product], events)[0].left).toBe(7);
  });

  test("does not invent stock or hide fractional money", () => {
    expect(foodSnapshot([], [])).toEqual([]);
    expect(calculateSummary([]).cash).toBe(0);
    expect(formatMoney(12.5)).toContain("12.5");
  });

  test("permits sales after making food while keeping a physical count as a stock correction", () => {
    const product: Product = { id: "chapati", name: "Chapati", price: 60, active: true, unit: "piece", category: "Menu" };
    const at = (minute: number) => new Date(Date.now() + minute * 1000).toISOString();
    expect(foodSnapshot([product], [event("sale", { itemId: product.id, quantity: 1 })])[0].saleBlockedReason).toMatch(/Make this food/);
    const made = event("production", { itemId: product.id, quantity: 3, occurredAt: at(0) });
    expect(foodSnapshot([product], [made])[0].saleAvailable).toBe(3);
    const counted = event("stock_count", { itemId: product.id, quantity: 2, occurredAt: at(1) });
    const sale = event("sale", { itemId: product.id, quantity: 2, occurredAt: at(2) });
    expect(foodSnapshot([product], [made, counted, sale])[0].saleAvailable).toBe(0);
  });

  test("carries counted food forward so a later sale is not falsely blocked", () => {
    const product: Product = { id: "pilau", name: "Pilau", price: 250, active: true, unit: "plate", category: "Menu" };
    const made = event("production", { itemId: product.id, quantity: 24, occurredAt: "2026-09-01T07:00:00.000Z", createdAt: "2026-09-01T07:00:00.000Z", businessDate: "2026-09-01" });
    const counted = event("stock_count", { itemId: product.id, quantity: 22, occurredAt: "2026-09-01T08:00:00.000Z", createdAt: "2026-09-01T08:00:00.000Z", businessDate: "2026-09-01" });
    const sold = event("sale", { itemId: product.id, quantity: 2, occurredAt: "2026-09-01T09:00:00.000Z", createdAt: "2026-09-01T09:00:00.000Z", businessDate: "2026-09-01" });
    const snapshot = foodSnapshot([product], [made, counted, sold], { from: "2026-09-02", to: "2026-09-02" })[0];
    expect(snapshot.left).toBe(20);
    expect(snapshot.saleAvailable).toBe(20);
    expect(snapshot.saleBlockedReason).toBeUndefined();
  });

  test("builds a continuous filtered daily profit and directional trend without inventing transactions", () => {
    const range = { from: "2026-09-01", to: "2026-09-03" };
    const trend = financialTrend([
      event("sale", { amount: 200, businessDate: "2026-09-01" }),
      event("expense", { amount: 50, businessDate: "2026-09-01" }),
      event("stock_purchase", { amount: 90, businessDate: "2026-09-03" }),
      event("sale", { amount: 999, businessDate: "2026-09-04" })
    ], range);
    expect(trend.map((point) => ({ date: point.date, profit: point.profit }))).toEqual([
      { date: "2026-09-01", profit: 150 },
      { date: "2026-09-02", profit: 0 },
      { date: "2026-09-03", profit: -90 }
    ]);
    expect(trend.map((point) => point.trend)).toEqual([150, 75, -7.5]);
  });
});
