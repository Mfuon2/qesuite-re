import type { BusinessProfile, BusinessEvent, Product } from "@qesuite/shared";
import { nairobiDate, type DateRange } from "./nairobi";

const DB_NAME = "qesuite-re";
const LEGACY_DB_NAME = "qesuite-restaurant-lite";
const DB_VERSION = 1;
const EVENT_STORE = "events";
const PRODUCT_STORE = "products";
const BUSINESS_KEY = "qesuite-re:business-profile";
const DEVICE_KEY = "qesuite-re:device-id";
const LEGACY_MIGRATION_KEY = "qesuite-re:legacy-storage-migrated";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVENT_STORE)) {
        const events = db.createObjectStore(EVENT_STORE, { keyPath: "id" });
        events.createIndex("occurredAt", "occurredAt");
        events.createIndex("syncState", "syncState");
      }
      if (!db.objectStoreNames.contains(PRODUCT_STORE)) {
        db.createObjectStore(PRODUCT_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function initializeLocalData(): Promise<void> {
  migrateLegacyLocalStorage();
  const db = await openDb();
  try {
    await migrateLegacyIndexedDb(db);
  } catch (error) {
    // The current database must remain usable even if an old browser database
    // is blocked or damaged. Its data is left untouched for a later retry.
    console.warn("Legacy QeSuite storage migration will be retried.", error);
  }
}

export function getBusiness(): BusinessProfile | null {
  const cached = localStorage.getItem(BUSINESS_KEY);
  return cached ? JSON.parse(cached) as BusinessProfile : null;
}

export async function getProducts(): Promise<Product[]> {
  if (!getBusiness()) return [];
  const db = await openDb();
  const tx = db.transaction(PRODUCT_STORE, "readonly");
  const products = await requestAsPromise(tx.objectStore(PRODUCT_STORE).getAll());
  return (products as Product[]).filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEvents(): Promise<BusinessEvent[]> {
  const db = await openDb();
  const tx = db.transaction(EVENT_STORE, "readonly");
  const events = (await requestAsPromise(tx.objectStore(EVENT_STORE).getAll())) as BusinessEvent[];
  return events.filter((event) => event.businessId === getBusiness()?.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function saveEvent(event: Omit<BusinessEvent, "id" | "businessId" | "deviceId" | "createdAt" | "syncState">): Promise<BusinessEvent> {
  const now = new Date().toISOString();
  const business = getBusiness();
  if (!business) throw new Error("Connect your business before recording entries.");
  const record: BusinessEvent = {
    ...event,
    id: crypto.randomUUID(),
    businessId: business.id,
    deviceId: getDeviceId(),
    businessDate: nairobiDate(event.occurredAt),
    createdAt: now,
    syncState: "pending"
  };

  const db = await openDb();
  const tx = db.transaction(EVENT_STORE, "readwrite");
  tx.objectStore(EVENT_STORE).put(record);
  await transactionDone(tx);
  return record;
}

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function syncPendingEvents(): Promise<number> {
  if (!navigator.onLine) return 0;

  const events = await getEvents();
  const pending = events.filter((event) => event.syncState !== "synced").slice(0, 200);
  if (pending.length === 0) return 0;

  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events: pending })
  });

  const payload = await response.json().catch(() => ({})) as { syncedIds?: string[]; error?: string };
  if (!response.ok) throw new Error(payload.error || "Sync failed. Please retry.");
  const syncedIds = payload.syncedIds ?? [];
  const synced = new Set(syncedIds);

  const db = await openDb();
  const tx = db.transaction(EVENT_STORE, "readwrite");
  const store = tx.objectStore(EVENT_STORE);
  pending.forEach((event) => {
    if (synced.has(event.id)) store.put({ ...event, syncState: "synced" as const });
  });
  await transactionDone(tx);
  if (synced.size !== pending.length) throw new Error("Some records could not be synced. Please retry.");
  return synced.size + (events.filter((event) => event.syncState !== "synced").length > pending.length ? await syncPendingEvents() : 0);
}

export async function pullDashboard(range?: DateRange): Promise<void> {
  const query = range ? `?${new URLSearchParams({ from: range.from, to: range.to })}` : "";
  const response = await fetch(`/api/dashboard${query}`, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || "Could not load the database. Please retry.");
  }
  const payload = await response.json() as { business: BusinessProfile | null; products: Product[]; events: BusinessEvent[] };
  const db = await openDb();
  const tx = db.transaction([PRODUCT_STORE, EVENT_STORE], "readwrite");
  const done = transactionDone(tx);
  const products = tx.objectStore(PRODUCT_STORE);
  products.clear();
  payload.products.forEach((product) => products.put(product));
  const events = tx.objectStore(EVENT_STORE);
  payload.events.forEach((event) => events.put({ ...event, syncState: "synced" }));
  await done;
  if (payload.business) localStorage.setItem(BUSINESS_KEY, JSON.stringify(payload.business));
  else localStorage.removeItem(BUSINESS_KEY);
}

function migrateLegacyLocalStorage(): void {
  try {
    const mappings = [
      ["qesuite-business-profile", BUSINESS_KEY],
      ["qesuite-device-id", DEVICE_KEY]
    ] as const;
    for (const [legacyKey, currentKey] of mappings) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (localStorage.getItem(currentKey) === null && legacyValue !== null) localStorage.setItem(currentKey, legacyValue);
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Storage can be restricted in private contexts; IndexedDB remains usable.
  }
}

async function migrateLegacyIndexedDb(target: IDBDatabase): Promise<void> {
  try {
    if (localStorage.getItem(LEGACY_MIGRATION_KEY) === "1") return;
  } catch {
    // Continue safely; missing-key checks below make repeated migration idempotent.
  }

  const legacy = await openLegacyDb();
  if (!legacy) {
    markLegacyMigrationComplete();
    return;
  }

  try {
    const legacyTx = legacy.transaction([EVENT_STORE, PRODUCT_STORE], "readonly");
    const [legacyEvents, legacyProducts] = await Promise.all([
      requestAsPromise(legacyTx.objectStore(EVENT_STORE).getAll()) as Promise<BusinessEvent[]>,
      requestAsPromise(legacyTx.objectStore(PRODUCT_STORE).getAll()) as Promise<Product[]>
    ]);

    const currentTx = target.transaction([EVENT_STORE, PRODUCT_STORE], "readonly");
    const [eventKeys, productKeys] = await Promise.all([
      requestAsPromise(currentTx.objectStore(EVENT_STORE).getAllKeys()),
      requestAsPromise(currentTx.objectStore(PRODUCT_STORE).getAllKeys())
    ]);
    const knownEvents = new Set(eventKeys.map(String));
    const knownProducts = new Set(productKeys.map(String));
    const writeTx = target.transaction([EVENT_STORE, PRODUCT_STORE], "readwrite");
    for (const event of legacyEvents) if (!knownEvents.has(event.id)) writeTx.objectStore(EVENT_STORE).put(event);
    for (const product of legacyProducts) if (!knownProducts.has(product.id)) writeTx.objectStore(PRODUCT_STORE).put(product);
    await transactionDone(writeTx);
    markLegacyMigrationComplete();
  } finally {
    legacy.close();
  }
}

function openLegacyDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    let createdEmptyDatabase = false;
    const request = indexedDB.open(LEGACY_DB_NAME);
    request.onupgradeneeded = () => { createdEmptyDatabase = true; };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (createdEmptyDatabase || !db.objectStoreNames.contains(EVENT_STORE) || !db.objectStoreNames.contains(PRODUCT_STORE)) {
        db.close();
        if (createdEmptyDatabase) indexedDB.deleteDatabase(LEGACY_DB_NAME);
        resolve(null);
      } else resolve(db);
    };
  });
}

function markLegacyMigrationComplete(): void {
  try { localStorage.setItem(LEGACY_MIGRATION_KEY, "1"); } catch { /* private storage can reject writes */ }
}

export async function saveSetup(path: "/api/business" | "/api/products", data: unknown): Promise<void> {
  if (!navigator.onLine) throw new Error("Connect to the internet to set up your business or add menu items. Existing items can still be recorded offline.");
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || "Unable to save. Please retry.");
  }
  await pullDashboard();
}

export async function seedRestaurantMenu(): Promise<void> {
  if (!navigator.onLine) throw new Error("Connect to the internet to add the restaurant menu.");
  const response = await fetch("/api/products/seed", { method: "POST" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || "Unable to add the restaurant menu. Please retry.");
  }
  await pullDashboard();
}
