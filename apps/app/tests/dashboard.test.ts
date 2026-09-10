import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import worker from "../worker";

const databases: Database[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function setup() {
  const db = new Database(":memory:");
  databases.push(db);
  for (const name of ["0001_init.sql", "0002_dashboard.sql", "0003_business_dates.sql", "0004_product_categories.sql", "0005_products_add_kg_unit.sql"]) db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  function prepare(sql: string, values: unknown[] = []) {
    return {
      bind: (...parameters: unknown[]) => prepare(sql, parameters),
      first: async () => db.query(sql).get(...values as never[]),
      all: async () => ({ results: db.query(sql).all(...values as never[]), success: true }),
      run: async () => { db.query(sql).run(...values as never[]); return { success: true }; },
      execute: () => { db.query(sql).run(...values as never[]); return { results: [], success: true }; },
      sql
    };
  }
  const binding = { prepare, batch: async (statements: ReturnType<typeof prepare>[]) => Promise.all(statements.map(statement => statement.sql.trim().startsWith("SELECT") ? statement.all() : statement.execute())) };
  const request = (path: string, body?: unknown, method = body === undefined ? "GET" : "POST") => worker.fetch(new Request(`https://test.invalid${path}`, body === undefined ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { DB: binding as unknown as D1Database, APP_ENV: "development" }, {} as ExecutionContext);
  return { db, request };
}

test("empty database provides no invented business or products", async () => {
  const { request } = setup();
  expect(await (await request("/api/dashboard")).json()).toEqual({ business: null, products: [], events: [] });
  expect(await (await request("/api/health")).json()).toEqual({ ok: true, database: "connected" });
});

test("first-run setup saves real input and enables product sales without overwriting an existing business", async () => {
  const { db, request } = setup();
  expect((await request("/api/business", { id: crypto.randomUUID(), name: " " })).status).toBe(400);
  const profile = { id: crypto.randomUUID(), name: "Owner's Restaurant" };
  expect((await request("/api/business", profile)).status).toBe(200);
  await request("/api/business", { id: crypto.randomUUID(), name: "Different name" });
  expect(db.query("SELECT name FROM business_profile").get()).toEqual({ name: profile.name });
  const product = { id: crypto.randomUUID(), name: "Owner's meal", priceMinor: 12550, unit: "plate" };
  expect((await request("/api/products", { ...product, priceMinor: 1.5 })).status).toBe(400);
  expect((await request("/api/products", product)).status).toBe(200);
  expect((await request("/api/products", product)).status).toBe(200);
  expect(db.query("SELECT count(*) AS n FROM products").get()).toEqual({ n: 1 });
  const occurredAt = new Date().toISOString();
  const made = { id: crypto.randomUUID(), businessId: profile.id, deviceId: "device", type: "production", itemId: product.id, quantity: 2, occurredAt, createdAt: occurredAt };
  const counted = { id: crypto.randomUUID(), businessId: profile.id, deviceId: "device", type: "stock_count", itemId: product.id, quantity: 2, occurredAt: new Date(Date.now() + 1).toISOString(), createdAt: occurredAt };
  const event = { id: crypto.randomUUID(), businessId: profile.id, deviceId: "device", type: "sale", itemId: product.id, quantity: 1, amount: 125.5, occurredAt: new Date(Date.now() + 2).toISOString(), createdAt: occurredAt };
  expect((await request("/api/sync", { events: [made, counted, event] })).status).toBe(200);
  const data = await (await request("/api/dashboard")).json() as { products: { name: string }[]; events: { amount: number }[] };
  expect(data.products[0].name).toBe(product.name);
  expect(data.events[0].amount).toBe(125.5);
});

test("sync rejects a sale before food is made or above available stock", async () => {
  const { request } = setup();
  const profile = { id: crypto.randomUUID(), name: "Stock Test" };
  await request("/api/business", profile);
  const product = { id: crypto.randomUUID(), name: "Chapati", priceMinor: 6000, unit: "piece" };
  await request("/api/products", product);
  const base = { businessId: profile.id, deviceId: "device", itemId: product.id, amount: 60, createdAt: new Date().toISOString() };
  const sale = { ...base, id: crypto.randomUUID(), type: "sale", quantity: 1, occurredAt: new Date().toISOString() };
  expect((await request("/api/sync", { events: [sale] })).status).toBe(409);
  const now = Date.now();
  const made = { ...base, id: crypto.randomUUID(), type: "production", quantity: 1, amount: undefined, occurredAt: new Date(now).toISOString() };
  const allowedSale = { ...sale, id: crypto.randomUUID(), occurredAt: new Date(now + 1).toISOString() };
  expect((await request("/api/sync", { events: [made, allowedSale] })).status).toBe(200);
  const counted = { ...base, id: crypto.randomUUID(), type: "stock_count", quantity: 1, amount: undefined, occurredAt: new Date(now + 1).toISOString() };
  const tooMany = { ...sale, id: crypto.randomUUID(), quantity: 2, occurredAt: new Date(now + 2).toISOString() };
  expect((await request("/api/sync", { events: [made, counted, tooMany] })).status).toBe(409);
});

test("dashboard reads configured profile, product prices and every record, including beyond 250", async () => {
  const { db, request } = setup();
  db.exec("INSERT INTO business_profile VALUES (1, 'test', 'Database Restaurant', 'From the database'); INSERT INTO products (id, business_id, name, price_minor, unit, active, category) VALUES ('meal', 'test', 'Meal', 12550, 'plate', 1, 'Menu')");
  const at = new Date().toISOString();
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(at)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const businessDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  for (let i = 0; i < 251; i++) db.query("INSERT INTO business_events(id,business_id,device_id,type,amount,occurred_at,business_date,created_at) VALUES (?, 'test', 'device', 'top_up', 1, ?, ?, ?)").run(String(i), at, businessDate, at);
  const data = await (await request("/api/dashboard")).json() as { business: { name: string }; products: { price: number }[]; events: { businessId: string; occurredAt: string }[] };
  expect(data.business.name).toBe("Database Restaurant");
  expect(data.products[0].price).toBe(125.5);
  expect(data.events).toHaveLength(251);
  expect(data.events[0].businessId).toBe("test");
  expect(data.events[0].occurredAt).toBe(at);
});

test("sync retries do not duplicate records or overwrite recorded money, and reject another business", async () => {
  const { db, request } = setup();
  db.exec("INSERT INTO business_profile VALUES (1, 'test', 'Database Restaurant', '')");
  const event = { id: "record", businessId: "test", deviceId: "device", type: "top_up", amount: 100, occurredAt: new Date().toISOString(), createdAt: new Date().toISOString() };
  expect((await request("/api/sync", { events: [event] })).status).toBe(200);
  expect((await request("/api/sync", { events: [event] })).status).toBe(200);
  expect(db.query("SELECT count(*) AS n FROM business_events").get()).toEqual({ n: 1 });
  await request("/api/sync", { events: [{ ...event, amount: 999 }] });
  expect(db.query("SELECT amount FROM business_events WHERE id = 'record'").get()).toEqual({ amount: 100 });
  expect((await request("/api/sync", { events: [{ ...event, businessId: "other" }] })).status).toBe(400);
});

test("D1 stores and filters records by the Nairobi business date, not the database host clock", async () => {
  const { db, request } = setup();
  await request("/api/business", { id: "123e4567-e89b-12d3-a456-426614174000", name: "Nairobi Kitchen" });
  const occurredAt = "2026-09-09T21:30:00.000Z"; // 00:30 on 10 September in Africa/Nairobi
  const event = { id: "nairobi-date", businessId: "123e4567-e89b-12d3-a456-426614174000", deviceId: "device", type: "top_up", amount: 100, occurredAt, createdAt: occurredAt };
  expect((await request("/api/sync", { events: [event] })).status).toBe(200);
  expect(db.query("SELECT business_date AS businessDate FROM business_events WHERE id = 'nairobi-date'").get()).toEqual({ businessDate: "2026-09-10" });
  expect(() => db.query("INSERT INTO business_events(id,business_id,device_id,type,occurred_at,business_date,created_at) VALUES ('wrong-day', ?, 'device', 'top_up', ?, '2026-09-09', ?)").run(event.businessId, occurredAt, occurredAt)).toThrow();
  const tenth = await (await request("/api/dashboard?from=2026-09-10&to=2026-09-10")).json() as { events: { businessDate: string }[] };
  expect(tenth.events).toHaveLength(1);
  expect(tenth.events[0].businessDate).toBe("2026-09-10");
  const ninth = await (await request("/api/dashboard?from=2026-09-09&to=2026-09-09")).json() as { events: unknown[] };
  expect(ninth.events).toHaveLength(0);
  expect((await request("/api/dashboard?from=2026-09-31&to=2026-09-31")).status).toBe(400);
});

test("restaurant menu seed adds the categorized menu once, including packaging and kg pre-orders", async () => {
  const { db, request } = setup();
  expect((await request("/api/products/seed", {})).status).toBe(409);
  await request("/api/business", { id: "123e4567-e89b-12d3-a456-426614174001", name: "Al-Diwan" });
  expect((await request("/api/products/seed", {})).status).toBe(200);
  expect(db.query("SELECT count(*) AS n FROM products").get()).toEqual({ n: 50 });
  expect(db.query("SELECT price_minor AS priceMinor, category, unit FROM products WHERE name = 'Packaging charge'").get()).toEqual({ priceMinor: 5000, category: "Extras", unit: "item" });
  expect(db.query("SELECT price_minor AS priceMinor, category, unit FROM products WHERE name = 'Pilau Mbuzi'").get()).toEqual({ priceMinor: 230000, category: "Pre-Order Menu", unit: "kg" });
  expect((await request("/api/products/seed", {})).status).toBe(200);
  expect(db.query("SELECT count(*) AS n FROM products").get()).toEqual({ n: 50 });
});

test("updates an existing menu item price for the current business", async () => {
  const { db, request } = setup();
  const businessId = "123e4567-e89b-12d3-a456-426614174002";
  await request("/api/business", { id: businessId, name: "Price Test" });
  const productId = crypto.randomUUID();
  await request("/api/products", { id: productId, name: "Pilau", priceMinor: 20000, unit: "plate" });
  expect((await request(`/api/products/${productId}`, { priceMinor: 22500 }, "PATCH")).status).toBe(200);
  expect(db.query("SELECT price_minor FROM products WHERE id = ?").get(productId)).toEqual({ price_minor: 22500 });
  expect((await request(`/api/products/${productId}`, { priceMinor: -1 }, "PATCH")).status).toBe(400);
  expect((await request(`/api/products/${crypto.randomUUID()}`, { priceMinor: 100 }, "PATCH")).status).toBe(404);
});
