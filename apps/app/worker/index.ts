import type { BusinessEvent, BusinessProfile } from "@qesuite/shared";

type SyncRequest = {
  events: BusinessEvent[];
};

type BusinessDateRange = { from: string; to: string };

type MenuSeedItem = {
  category: string;
  name: string;
  priceMinor: number;
  unit: "piece" | "plate" | "cup" | "portion" | "item" | "kg" | "bottle" | "can" | "glass" | "litre" | "ml" | "packet" | "box" | "dozen" | "tray" | "bowl" | "skewer";
};

const RESTAURANT_MENU_SEED: MenuSeedItem[] = [
  { category: "Breakfast", name: "Mahamri", priceMinor: 1500, unit: "piece" },
  { category: "Breakfast", name: "Mbaazi", priceMinor: 15000, unit: "plate" },
  { category: "Breakfast", name: "Viazi Karai", priceMinor: 10000, unit: "plate" },
  { category: "Breakfast", name: "Dhal Bhajia", priceMinor: 10000, unit: "plate" },
  { category: "Breakfast", name: "Beef Samosas", priceMinor: 5000, unit: "piece" },
  { category: "Breakfast", name: "Chicken Samosas", priceMinor: 6000, unit: "piece" },
  { category: "Breakfast", name: "Spring Rolls", priceMinor: 4000, unit: "piece" },
  { category: "Breakfast", name: "Chapati", priceMinor: 4000, unit: "piece" },
  { category: "Breakfast", name: "Katlesi", priceMinor: 5000, unit: "piece" },
  { category: "Breakfast", name: "Kabab (Beef)", priceMinor: 7000, unit: "piece" },
  { category: "Tea", name: "Milk Tea", priceMinor: 8000, unit: "cup" },
  { category: "Tea", name: "Hot Chocolate", priceMinor: 15000, unit: "cup" },
  { category: "Tea", name: "Black Tea (Lemon)", priceMinor: 5000, unit: "cup" },
  { category: "Tea", name: "Black Tea (Masala)", priceMinor: 8000, unit: "cup" },
  { category: "Tea", name: "Chai Masala", priceMinor: 18000, unit: "cup" },
  { category: "Lunch", name: "Chapati Beef + Mboga", priceMinor: 33000, unit: "plate" },
  { category: "Lunch", name: "Chapati Beans", priceMinor: 18000, unit: "plate" },
  { category: "Lunch", name: "Chapati Goat Soup", priceMinor: 28000, unit: "plate" },
  { category: "Lunch", name: "Rice Beef", priceMinor: 38000, unit: "plate" },
  { category: "Lunch", name: "Pilau", priceMinor: 40000, unit: "plate" },
  { category: "Lunch", name: "Biriani", priceMinor: 50000, unit: "plate" },
  { category: "Lunch", name: "Ugali Dry Fry", priceMinor: 38000, unit: "plate" },
  { category: "Lunch", name: "Chips Plain", priceMinor: 15000, unit: "plate" },
  { category: "Lunch", name: "Chips Masala", priceMinor: 20000, unit: "plate" },
  { category: "Lunch", name: "Periperi", priceMinor: 20000, unit: "plate" },
  { category: "Chicken", name: "Chicken Tikka Leg", priceMinor: 25000, unit: "plate" },
  { category: "Chicken", name: "Chicken Tikka Breast", priceMinor: 30000, unit: "plate" },
  { category: "Chicken", name: "Chicken Mishkaki", priceMinor: 25000, unit: "plate" },
  { category: "Chicken", name: "Chicken Boneless Tikka + Salad", priceMinor: 50000, unit: "plate" },
  { category: "Chicken", name: "Chicken Kima Chapati", priceMinor: 25000, unit: "plate" },
  { category: "Drinks", name: "Ukwaju — Small", priceMinor: 12000, unit: "cup" },
  { category: "Drinks", name: "Ukwaju — Large", priceMinor: 20000, unit: "cup" },
  { category: "Drinks", name: "Passion — Small", priceMinor: 12000, unit: "cup" },
  { category: "Drinks", name: "Passion — Large", priceMinor: 20000, unit: "cup" },
  { category: "Drinks", name: "Mango Tangawizi — Small", priceMinor: 12000, unit: "cup" },
  { category: "Drinks", name: "Mango Tangawizi — Large", priceMinor: 20000, unit: "cup" },
  { category: "Drinks", name: "Beetroot — Small", priceMinor: 12000, unit: "cup" },
  { category: "Drinks", name: "Beetroot — Large", priceMinor: 20000, unit: "cup" },
  { category: "Drinks", name: "Water Keringet 500ml", priceMinor: 10000, unit: "item" },
  { category: "Drinks", name: "Soda 500ml", priceMinor: 7000, unit: "item" },
  { category: "Snacks / Extras", name: "Mabuyu 200g", priceMinor: 15000, unit: "item" },
  { category: "Snacks / Extras", name: "Achari 250g", priceMinor: 20000, unit: "item" },
  { category: "Snacks / Extras", name: "Salted Cashews 250g", priceMinor: 30000, unit: "item" },
  { category: "Snacks / Extras", name: "Mini Doughnuts — 15 pieces", priceMinor: 40000, unit: "portion" },
  { category: "Pre-Order Menu", name: "Pilau Mbuzi", priceMinor: 230000, unit: "kg" },
  { category: "Pre-Order Menu", name: "Pilau Beef", priceMinor: 200000, unit: "kg" },
  { category: "Pre-Order Menu", name: "Pilau Kuku", priceMinor: 200000, unit: "kg" },
  { category: "Pre-Order Menu", name: "Biriani Mbuzi", priceMinor: 270000, unit: "kg" },
  { category: "Pre-Order Menu", name: "Biriani Chicken", priceMinor: 250000, unit: "kg" },
  { category: "Extras", name: "Packaging charge", priceMinor: 5000, unit: "item" }
];

const NAIROBI_TIME_ZONE = "Africa/Nairobi";
const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: NAIROBI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function businessDateAt(timestamp: string): string {
  const parts = Object.fromEntries(businessDateFormatter.formatToParts(new Date(timestamp)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function requestedDateRange(url: URL): BusinessDateRange | null | "invalid" {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from && !to) return null;
  if (!from || !to || !isBusinessDate(from) || !isBusinessDate(to) || from > to) return "invalid";
  return { from, to };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers
    }
  });

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/products/seed" && request.method === "POST") {
      const business = await env.DB.prepare("SELECT id FROM business_profile WHERE singleton = 1").first<{ id: string }>();
      if (!business) return json({ error: "Set up your business first." }, { status: 409 });
      try {
        await env.DB.batch(RESTAURANT_MENU_SEED.map((item) => env.DB.prepare(
          `INSERT INTO products (id, business_id, name, price_minor, unit, category, active)
           SELECT ?, ?, ?, ?, ?, ?, 1
           WHERE NOT EXISTS (SELECT 1 FROM products WHERE business_id = ? AND name = ? COLLATE NOCASE)`
        ).bind(crypto.randomUUID(), business.id, item.name, item.priceMinor, item.unit, item.category, business.id, item.name)));
        return json({ ok: true, menuItemCount: RESTAURANT_MENU_SEED.length });
      } catch (error) {
        console.error("Menu seed failed", error);
        return json({ error: "Unable to add the restaurant menu. Check the database connection and try again." }, { status: 503 });
      }
    }

    if (url.pathname === "/api/business" && request.method === "PATCH") {
      const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!payload || typeof payload.name !== "string" || !payload.name.trim() || payload.name.length > 120 || (payload.tagline != null && (typeof payload.tagline !== "string" || payload.tagline.length > 160))) {
        return json({ error: "Enter a valid business name." }, { status: 400 });
      }
      try {
        const result = await env.DB.prepare("UPDATE business_profile SET name = ?, tagline = ? WHERE singleton = 1 RETURNING id, name, tagline").bind(payload.name.trim(), typeof payload.tagline === "string" ? payload.tagline.trim() : "").first<BusinessProfile>();
        return result ? json({ business: result }) : json({ error: "Business profile not found." }, { status: 404 });
      } catch (error) {
        console.error("Business profile update failed", error);
        return json({ error: "Unable to update the business profile." }, { status: 503 });
      }
    }

    if ((url.pathname === "/api/business" || url.pathname === "/api/products") && request.method === "POST") {
      const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!payload || typeof payload.name !== "string" || !payload.name.trim() || payload.name.length > 120 || typeof payload.id !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.id)) {
        return json({ error: "Enter a valid name." }, { status: 400 });
      }
      try {
        if (url.pathname === "/api/business") {
          await env.DB.prepare("INSERT INTO business_profile (singleton, id, name, tagline) VALUES (1, ?, ?, '') ON CONFLICT(singleton) DO NOTHING").bind(payload.id, payload.name.trim()).run();
          return json({ business: await env.DB.prepare("SELECT id, name, tagline FROM business_profile WHERE singleton = 1").first() });
        }
        const business = await env.DB.prepare("SELECT id FROM business_profile WHERE singleton = 1").first<{ id: string }>();
        if (!business) return json({ error: "Set up your business first." }, { status: 409 });
        if (typeof payload.priceMinor !== "number" || !Number.isSafeInteger(payload.priceMinor) || payload.priceMinor < 0 || typeof payload.unit !== "string" || !["piece", "plate", "cup", "portion", "item", "kg", "bottle", "can", "glass", "litre", "ml", "packet", "box", "dozen", "tray", "bowl", "skewer"].includes(payload.unit)) {
          return json({ error: "Enter a valid price and unit." }, { status: 400 });
        }
        await env.DB.prepare("INSERT INTO products (id, business_id, name, price_minor, unit, category, active) VALUES (?, ?, ?, ?, ?, 'Menu', 1) ON CONFLICT(id) DO NOTHING").bind(payload.id, business.id, payload.name.trim(), payload.priceMinor, payload.unit).run();
        return json({ ok: true });
      } catch (error) {
        console.error("Business setup failed", error);
        return json({ error: "Unable to save. Check the database connection and try again." }, { status: 503 });
      }
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, database: "connected" });
      } catch {
        return json({ ok: false, database: "unavailable" }, { status: 503 });
      }
    }

    if (url.pathname === "/api/dashboard" && request.method === "GET") {
      try {
        const range = requestedDateRange(url);
        if (range === "invalid") return json({ error: "Use a valid Nairobi date range." }, { status: 400 });
        const business = await env.DB.prepare("SELECT id, name, tagline FROM business_profile WHERE singleton = 1").first<BusinessProfile>();
        if (!business) return json({ business: null, products: [], events: [] });
        const eventStatement = range
          ? env.DB.prepare(`SELECT id, business_id AS businessId, device_id AS deviceId, type,
              item_id AS itemId, item_name AS itemName, quantity, amount, note,
              occurred_at AS occurredAt, business_date AS businessDate, created_at AS createdAt FROM business_events
              WHERE business_id = ? AND business_date BETWEEN ? AND ? ORDER BY occurred_at DESC`).bind(business.id, range.from, range.to)
          : env.DB.prepare(`SELECT id, business_id AS businessId, device_id AS deviceId, type,
              item_id AS itemId, item_name AS itemName, quantity, amount, note,
              occurred_at AS occurredAt, business_date AS businessDate, created_at AS createdAt FROM business_events
              WHERE business_id = ? ORDER BY occurred_at DESC`).bind(business.id);
        const [products, events] = await env.DB.batch<Record<string, unknown>>([
          env.DB.prepare("SELECT id, name, price_minor / 100.0 AS price, unit, category, active FROM products WHERE business_id = ? AND active = 1 ORDER BY category, name").bind(business.id),
          eventStatement
        ]);
        return json({ business, products: products.results.map((row) => ({ ...row, active: Boolean(row.active) })), events: events.results });
      } catch (error) {
        console.error("Dashboard database read failed", error);
        return json({ error: "Database unavailable or dashboard migrations missing." }, { status: 503 });
      }
    }

    if (url.pathname === "/api/events" && request.method === "GET") {
      const range = requestedDateRange(url);
      if (range === "invalid") return json({ error: "Use a valid Nairobi date range." }, { status: 400 });
      const business = await env.DB.prepare("SELECT id FROM business_profile WHERE singleton = 1").first<{ id: string }>();
      if (!business) return json({ events: [] });
      const businessId = business.id;
      const result = range
        ? await env.DB.prepare(`SELECT id, business_id AS businessId, device_id AS deviceId, type, item_id AS itemId, item_name AS itemName, quantity, amount, note,
                occurred_at AS occurredAt, business_date AS businessDate, created_at AS createdAt
           FROM business_events WHERE business_id = ? AND business_date BETWEEN ? AND ? ORDER BY occurred_at DESC`).bind(businessId, range.from, range.to).all()
        : await env.DB.prepare(`SELECT id, business_id AS businessId, device_id AS deviceId, type, item_id AS itemId, item_name AS itemName, quantity, amount, note,
                occurred_at AS occurredAt, business_date AS businessDate, created_at AS createdAt
           FROM business_events WHERE business_id = ? ORDER BY occurred_at DESC`).bind(businessId).all();

      return json({ events: result.results });
    }

    if (url.pathname === "/api/sync" && request.method === "POST") {
      const payload = (await request.json()) as SyncRequest;
      const events = Array.isArray(payload.events) ? payload.events : [];

      if (events.length === 0) return json({ syncedIds: [] });
      if (events.length > 200) return json({ error: "Too many events in one sync." }, { status: 413 });

      const business = await env.DB.prepare("SELECT id FROM business_profile WHERE singleton = 1").first<{ id: string }>();
      if (!business) return json({ error: "Configure the business first." }, { status: 409 });
      const types = new Set(["sale", "expense", "stock_purchase", "top_up", "withdrawal", "production", "stock_count"]);
      if (events.some((event) => !event || event.businessId !== business.id || !event.id || !event.deviceId || !types.has(event.type) || !Number.isFinite(Date.parse(event.occurredAt)) || !Number.isFinite(Date.parse(event.createdAt)) || (event.businessDate != null && (!isBusinessDate(event.businessDate) || event.businessDate !== businessDateAt(event.occurredAt))) || (event.amount != null && (!Number.isFinite(event.amount) || event.amount < 0)) || (event.quantity != null && (!Number.isFinite(event.quantity) || event.quantity < 0)))) {
        return json({ error: "Invalid business record." }, { status: 400 });
      }

      // Never accept a device or server-local calendar date. This computed Nairobi date is what D1 persists and queries.
      const recordedEvents = events.map((event) => ({ ...event, businessDate: businessDateAt(event.occurredAt) }));

      const existing = await env.DB.prepare(`SELECT id, type, item_id AS itemId, quantity, occurred_at AS occurredAt
        FROM business_events WHERE business_id = ? AND type IN ('production', 'stock_count', 'sale')
        ORDER BY occurred_at ASC, created_at ASC`).bind(business.id).all();
      const knownIds = new Set(existing.results.map((row) => String((row as { id: string }).id)));
      const timeline = [
        ...existing.results.map((row) => ({ ...(row as { id: string; type: BusinessEvent["type"]; itemId?: string; quantity?: number; occurredAt: string }), incoming: false })),
        ...recordedEvents.filter((event) => !knownIds.has(event.id)).map((event) => ({ id: event.id, type: event.type, itemId: event.itemId, quantity: event.quantity, occurredAt: event.occurredAt, incoming: true }))
      ].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      const stock = new Map<string, { made: number; counted: boolean; available: number }>();
      for (const event of timeline) {
        if (!event.itemId || !["production", "stock_count", "sale"].includes(event.type)) continue;
        const state = stock.get(event.itemId) ?? { made: 0, counted: false, available: 0 };
        const quantity = event.quantity ?? 0;
        if (event.type === "production") {
          state.made += quantity;
          // Production is stock-in; stock counts are later corrections.
          state.available += quantity;
        } else if (event.type === "stock_count") {
          state.counted = true;
          state.available = quantity;
        } else if (event.type === "sale") {
          if (state.made <= 0 || state.available < quantity) {
            if (event.incoming) return json({ error: "Sale rejected: make the food before selling it. The sale quantity cannot exceed stock left." }, { status: 409 });
            console.error("Existing invalid sale found", event.id);
            continue;
          }
          state.available -= quantity;
        }
        stock.set(event.itemId, state);
      }

      const statements = recordedEvents.map((event) =>
        env.DB.prepare(
          `INSERT INTO business_events
            (id, business_id, device_id, type, item_id, item_name, quantity, amount, note, occurred_at, business_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`
        ).bind(
          event.id,
          event.businessId,
          event.deviceId,
          event.type,
          event.itemId ?? null,
          event.itemName ?? null,
          event.quantity ?? null,
          event.amount ?? null,
          event.note ?? null,
          event.occurredAt,
          event.businessDate,
          event.createdAt
        )
      );

      await env.DB.batch(statements);
      return json({ syncedIds: events.map((event) => event.id) });
    }

    return json({ error: "Not found" }, { status: 404 });
  }
} satisfies ExportedHandler<Env>;
