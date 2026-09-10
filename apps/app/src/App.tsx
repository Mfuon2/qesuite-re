import { useEffect, useMemo, useRef, useState } from "react";
import { CookingPot, CupSoda, Sparkles, Utensils, Wheat, type LucideIcon } from "lucide-react";
import type { BusinessEvent, BusinessEventType, BusinessProfile, Product } from "@qesuite/shared";
import { ActionSheet } from "./components/ActionSheet";
import { SplashExperience } from "./components/SplashExperience";
import { DateRangeButton, DateRangePicker } from "./components/DateRangePicker";
import { FinancialTrendChart } from "./components/FinancialTrendChart";
import { MenuSettings } from "./components/MenuSettings";
import { Icon } from "./components/Icon";
import { prepareOffline } from "./lib/offline";
import { getBusiness, getEvents, getProducts, initializeLocalData, pullDashboard, saveEvent, saveSetup, seedRestaurantMenu, syncPendingEvents } from "./lib/db";
import { calculateSummary, eventsForDateRange, foodSnapshot, formatMoney } from "./lib/metrics";
import { formatDateRange, formatNairobiDate, nairobiHour, todayRange, type DateRange } from "./lib/nairobi";
import { APP_VERSION } from "./version";

type Tab = "home" | "history" | "more" | "stock" | "menu";
type Action = "sale" | "stock_purchase" | "expense" | "top_up" | "withdrawal" | "production" | "stock_count";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const actionMeta: { key: Action; label: string; description: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { key: "sale", label: "Record a Sale", description: "Sold food or drinks", icon: "register" },
  { key: "production", label: "Make Food", description: "Prepare food for sale", icon: "pot" },
  { key: "stock_purchase", label: "Buy Stock", description: "Buy ingredients and supplies", icon: "cart" },
  { key: "expense", label: "Record an Expense", description: "Rent, electricity, gas", icon: "receipt" },
  { key: "top_up", label: "Top Up Cash", description: "Add your own money", icon: "wallet" },
  { key: "withdrawal", label: "Withdraw Cash", description: "Take money for personal use", icon: "arrow-up" }
];

const stockIcons: Record<Product["unit"], LucideIcon> = {
  cup: CupSoda,
  plate: CookingPot,
  piece: Wheat,
  portion: CookingPot,
  item: Utensils,
  kg: Wheat,
  bottle: CupSoda,
  can: CupSoda,
  glass: CupSoda,
  litre: CupSoda,
  ml: CupSoda,
  packet: Utensils,
  box: Utensils,
  dozen: Utensils,
  tray: CookingPot,
  bowl: CookingPot,
  skewer: Utensils
};

export default function App() {
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [navigation, setNavigation] = useState<Tab[]>(["home"]);
  const tab = navigation[navigation.length - 1];

  function setTab(next: Tab, root = false) {
    setNavigation((previous) => next === "home" ? ["home"] : root ? ["home", next] : previous[previous.length - 1] === next ? previous : [...previous, next]);
    window.scrollTo(0, 0);
  }

  function goBack() {
    setNavigation((previous) => previous.length > 1 ? previous.slice(0, -1) : ["home"]);
    window.scrollTo(0, 0);
  }

  const backButton = <button className="back-button" onClick={goBack}><Icon name="chevron" /><span>Back</span></button>;
  const [action, setAction] = useState<Action | null>(null);
  const [saleResumeProductId, setSaleResumeProductId] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSplash, setShowSplash] = useState(() => {
    try {
      const replayRequested = new URLSearchParams(window.location.search).get("splash") === "1";
      return replayRequested || window.sessionStorage.getItem("qesuite-re:splash-version") !== APP_VERSION;
    } catch {
      return true;
    }
  });
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [dateRange, setDateRange] = useState<DateRange>(() => todayRange());
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const lastRecordedAt = useRef(0);

  async function refresh() {
    const [nextEvents, nextProducts] = await Promise.all([getEvents(), getProducts()]);
    setEvents(nextEvents);
    setProducts(nextProducts);
    setBusiness(getBusiness());
  }

  async function sync() {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      await syncPendingEvents();
      await pullDashboard();
      await refresh();
      setSyncError("");
      setConnected(true);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Unable to sync. Please retry.");
      setConnected(false);
    } finally {
      setSyncing(false);
      setLoaded(true);
    }
  }

  useEffect(() => {
    // The HTML shell shows the cached boot splash before JavaScript loads.
    // Remove it only after React has committed the application surface.
    document.getElementById("boot-splash")?.remove();
    void initializeLocalData().then(refresh).then(sync).catch(() => { setSyncError("Unable to open local storage."); }).finally(() => setLoaded(true));
    const timer = window.setInterval(() => setNow(new Date()), 30_000);

    const onOnline = () => {
      setOnline(true);
      void sync();
      void prepareOffline().catch(() => undefined);
    };
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);

    void prepareOffline().catch(() => undefined);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!navigator.onLine) return;
    void pullDashboard(dateRange).then(refresh).catch(() => undefined);
  }, [dateRange]);

  // Inventory is authoritative at the point of sale. API routes are no-store
  // and the service worker never caches them; this replaces the local event
  // ledger with a fresh D1 read whenever Stock or Record Sale is opened online.
  useEffect(() => {
    if (!online || (tab !== "stock" && action !== "sale")) return;
    void pullDashboard().then(refresh).catch(() => undefined);
  }, [action, online, tab]);

  const summary = useMemo(() => calculateSummary(events, dateRange), [events, dateRange]);
  const food = useMemo(() => foodSnapshot(products, events, dateRange), [products, events, dateRange]);
  const currentFood = useMemo(() => foodSnapshot(products, events, todayRange()), [products, events]);
  const eventsInRange = useMemo(() => eventsForDateRange(events, dateRange), [events, dateRange]);
  const pendingCount = useMemo(() => events.filter((event) => event.syncState !== "synced").length, [events]);

  async function record(draft: { type: BusinessEventType; itemId?: string; itemName?: string; quantity?: number; amount?: number; note?: string }) {
    const occurredAt = Math.max(Date.now(), lastRecordedAt.current + 1);
    lastRecordedAt.current = occurredAt;
    await saveEvent({ ...draft, occurredAt: new Date(occurredAt).toISOString() });
    await refresh();
    void sync();
  }

  async function setup(path: "/api/business" | "/api/products", data: unknown) {
    await saveSetup(path, data);
    await refresh();
    setConnected(true);
    setSyncError("");
  }

  async function seedMenu() {
    await seedRestaurantMenu();
    await refresh();
    setConnected(true);
    setSyncError("");
  }

  const greeting = nairobiHour(now) < 12 ? "Good morning" : nairobiHour(now) < 17 ? "Good afternoon" : "Good evening";
  const money = (value: number) => business ? formatMoney(value) : "—";

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isiOS) setShowIosInstall(true);
  }

  return (
    <div className="app-shell">
      <main className="phone-canvas">
        <aside className="desktop-sidebar" aria-label="Desktop navigation">
          <div className="desktop-business-brand">
            <Icon name="cutlery" />
            <div><strong>{business?.name || (loaded ? "Your business" : "Loading…")}</strong>{business?.tagline && <span>{business.tagline}</span>}</div>
          </div>
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavButton label="Home" icon="home" active={tab === "home"} onClick={() => setTab("home")} />
            <NavButton label="Reports" icon="chart" active={tab === "history"} onClick={() => setTab("history", true)} />
            <NavButton label="More" icon="user" active={tab === "more" || tab === "stock" || tab === "menu"} onClick={() => setTab("more", true)} />
          </nav>
        </aside>
        <header className="topbar">
          <div className="business-brand">
            <Icon name="cutlery" />
            <div><h1>{business?.name || (loaded ? "Your business" : "Loading…")}</h1>
            {business?.tagline && <p>{business.tagline}</p>}</div>
          </div>
          <button className="icon-button" aria-label="Settings" onClick={() => setTab("more")}><Icon name="settings" /></button>
        </header>

        {tab === "home" && (
          <div className="page-content">
            <section className="greeting-row">
              <div><div className="greeting">{greeting}!</div><p className="greeting-message">Let’s make today a great day <Sparkles aria-hidden="true" /></p></div>
              <DateRangeButton range={dateRange} onClick={() => setDateRangeOpen(true)} />
            </section>

            <section className="summary-section">
              <div className="metric-list" aria-label="Today's totals" aria-busy={!loaded}>
                <div className="metric-card sales"><Icon name="chart" /><span>Sales Today</span><strong>{money(summary.sales)}</strong></div>
                <div className="metric-card expenses"><Icon name="cart" /><span>Expenses</span><strong>{money(summary.expenses)}</strong></div>
                <div className="metric-card profit" title="Estimated profit: sales less stock purchases and expenses"><Icon name="coins" /><span>Profit</span><strong>{money(summary.estimatedProfit)}</strong></div>
                <div className="metric-card cash"><Icon name="wallet" /><span>Cash on Hand</span><strong>{money(summary.cash)}</strong></div>
              </div>
              {summary.topUps > 0 && <div className="quiet-note">Includes {formatMoney(summary.topUps)} topped up from your own money.</div>}
            </section>

            <section className="actions-section">
              <div className="action-grid">
                {actionMeta.map((item) => (
                  <button key={item.key} className={`action-button action-${item.key}`} onClick={() => setAction(item.key)}>
                    <span className="action-icon"><Icon name={item.icon} /></span><span className="action-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                  </button>
                ))}
              </div>
            </section>

            <button className="summary-link" onClick={() => setTab("history")}><Icon name="receipt" /><span><strong>View Summary</strong><small>See sales, expenses, stock and more</small></span><Icon name="chevron" /></button>

            <section className="food-section">
              <div className="section-heading"><h2>Quick Stock View</h2><button className="text-button see-all" onClick={() => setTab("stock")}>See all <Icon name="chevron" /></button></div>
              <div className="stock-grid">
                {food.slice(0, 4).map((row) => {
                  const StockIcon = stockIcons[row.product.unit];
                  return <div className="stock-card" key={row.product.id}><StockIcon className="stock-art" aria-hidden="true" /><div><strong>{row.product.name}</strong><span>Left: {row.left}</span></div></div>;
                })}
              </div>
              {food.length === 0 && <p className="stock-empty">{!loaded ? "Loading stock…" : business ? "No products have been added yet." : "Connect your business to view stock."}</p>}
            </section>
          </div>
        )}

        {tab === "history" && (
          <div className="page-content subpage">
            {backButton}
            <div className="page-title report-title"><div><div className="eyebrow">Business records</div><h2>Report Summary</h2></div><DateRangeButton range={dateRange} compact onClick={() => setDateRangeOpen(true)} /></div>
            <p className="report-range-label">{formatDateRange(dateRange)} · {eventsInRange.length} record{eventsInRange.length === 1 ? "" : "s"}</p>
            <FinancialTrendChart events={eventsInRange} range={dateRange} />
            <div className="report-totals"><p>Sales <strong>{money(summary.sales)}</strong></p><p>Expenses <strong>{money(summary.expenses)}</strong></p><p>Estimated profit <strong>{money(summary.estimatedProfit)}</strong></p><p>Cash on hand <strong>{money(summary.cash)}</strong></p></div>
            <h3>All records</h3>
            <div className="history-list">
              {eventsInRange.length === 0 ? <div className="empty-state">No records for these dates.</div> : eventsInRange.slice(0, 10).map((event) => <HistoryRow key={event.id} event={event} />)}
            </div>
            {eventsInRange.length > 10 && <button className="show-more-records" onClick={() => setRecordsOpen(true)}>Show more interactions <span>{eventsInRange.length} records</span><Icon name="chevron" /></button>}
          </div>
        )}

        {tab === "stock" && <div className="page-content subpage">{backButton}<div className="page-title"><h2>Stock</h2><button className="text-button" onClick={() => setAction("stock_count")}>Count left</button></div>{food.length === 0 ? <p className="empty-state">No products have been added yet.</p> : food.map((row) => <div className="food-row" key={row.product.id}><strong>{row.product.name}</strong><div className="food-numbers"><span>{row.sold} sold</span><span>{row.left} left</span></div></div>)}</div>}

        {tab === "menu" && <div className="page-content subpage">{backButton}<MenuSettings products={products} hasBusiness={Boolean(business)} onSetup={setup} onSeed={seedMenu} /></div>}

        {tab === "more" && (
          <div className="page-content subpage">
            {backButton}
            <div className="page-title"><div><div className="eyebrow">QeSuite</div><h2>More</h2></div></div>
            <section className="simple-card install-card">
              <div><strong>Keep QeSuite on this phone</strong><p>Open it faster and keep recording even when the internet is unstable.</p></div>
              <button className="secondary-button" onClick={installApp}>Install app</button>
            </section>
            <section className="settings-list">
              <button onClick={() => setTab("menu")}><span>Menu Items & Prices</span><Icon name="chevron" /></button>
              <div className="business-details"><strong>{business?.name || "Business not configured"}</strong><p>{business?.tagline}</p></div>
              <button onClick={() => setTab("stock")}><span>Stock</span><Icon name="chevron" /></button>
              <button onClick={() => setTab("history")}><span>Reports</span><Icon name="chevron" /></button>
              <button onClick={() => void sync()}><span>Sync now</span><span className="muted">{!online ? "Offline" : syncing ? "Syncing…" : syncError ? "Retry connection" : pendingCount ? `${pendingCount} pending` : connected ? "Up to date" : "Not connected"}</span></button>
            </section>
          </div>
        )}

        <nav className="bottom-nav" aria-label="Main navigation">
          <NavButton label="Home" icon="home" active={tab === "home"} onClick={() => setTab("home")} />
          <NavButton label="Reports" icon="chart" active={tab === "history"} onClick={() => setTab("history", true)} />
          <NavButton label="More" icon="user" active={tab === "more" || tab === "stock" || tab === "menu"} onClick={() => setTab("more", true)} />
        </nav>
      </main>

      {action && <ActionSheet key={`${action}-${saleResumeProductId ?? "new"}`} action={action} products={products} food={currentFood} hasBusiness={Boolean(business)} onSetup={setup} onManageMenu={() => { setAction(null); setSaleResumeProductId(null); setTab("menu"); }} onClose={() => { setAction(null); setSaleResumeProductId(null); }} onSave={record} initialProductId={saleResumeProductId ?? undefined} continueSaleAfterSave={action === "production" && Boolean(saleResumeProductId)} onPrepareForSale={(productId) => { setSaleResumeProductId(productId); setAction("production"); }} onContinueToSale={(productId) => { setSaleResumeProductId(productId); setAction("sale"); }} />}

      {dateRangeOpen && <DateRangePicker range={dateRange} onClose={() => setDateRangeOpen(false)} onChange={(range) => { setDateRange(range); setDateRangeOpen(false); }} />}

      {recordsOpen && <RecordsDialog events={eventsInRange} onClose={() => setRecordsOpen(false)} />}

      {showSplash && <SplashExperience onContinue={() => {
        try { window.sessionStorage.setItem("qesuite-re:splash-version", APP_VERSION); } catch { /* session storage can be unavailable in private contexts */ }
        if (new URLSearchParams(window.location.search).get("splash") === "1") {
          const url = new URL(window.location.href);
          url.searchParams.delete("splash");
          window.history.replaceState({}, "", url);
        }
        setShowSplash(false);
      }} />}

      {showIosInstall && (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowIosInstall(false)}>
          <section className="sheet compact-sheet">
            <div className="sheet-handle" />
            <header className="sheet-header"><div><div className="eyebrow">iPhone</div><h2>Add QeSuite to Home Screen</h2></div><button className="icon-button" onClick={() => setShowIosInstall(false)}><Icon name="close" /></button></header>
            <ol className="install-steps"><li>Open this page in Safari.</li><li>Tap the <strong>Share</strong> button.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Turn on <strong>Open as Web App</strong>, then tap Add.</li></ol>
          </section>
        </div>
      )}
    </div>
  );
}

function NavButton({ label, icon, active, onClick }: { label: string; icon: Parameters<typeof Icon>[0]["name"]; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}><Icon name={icon} /><span>{label}</span></button>;
}

function HistoryRow({ event }: { event: BusinessEvent }) {
  const labels: Record<BusinessEventType, string> = {
    sale: "Sale",
    expense: "Expense",
    stock_purchase: "Stock bought",
    top_up: "Top up",
    withdrawal: "Withdrawal",
    production: "Food made",
    stock_count: "Stock count"
  };
  const isIncoming = event.type === "sale" || event.type === "top_up";
  const amount = event.amount ? `${isIncoming ? "+" : "-"}${formatMoney(event.amount)}` : event.quantity ? `${event.quantity}` : "";
  return (
    <div className="history-row">
      <div><strong>{event.itemName || labels[event.type]}</strong><small>{labels[event.type]} · {formatNairobiDate(event.occurredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></div>
      <div className="history-amount"><strong className={isIncoming ? "positive" : event.amount ? "negative" : ""}>{amount}</strong><small>{event.syncState === "synced" ? "Synced" : "Pending"}</small></div>
    </div>
  );
}

function RecordsDialog({ events, onClose }: { events: BusinessEvent[]; onClose: () => void }) {
  const pageSize = 15;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(events.length / pageSize));
  const start = page * pageSize;
  const pageEvents = events.slice(start, start + pageSize);

  useEffect(() => setPage(0), [events]);

  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="sheet records-dialog" role="dialog" aria-modal="true" aria-labelledby="interactions-title">
      <div className="sheet-handle" />
      <header className="sheet-header"><div><div className="eyebrow">Business records</div><h2 id="interactions-title">All interactions</h2></div><button className="icon-button" onClick={onClose} aria-label="Close interactions"><Icon name="close" /></button></header>
      <p className="records-page-summary">Showing {start + 1}–{Math.min(start + pageSize, events.length)} of {events.length} records</p>
      <div className="history-list dialog-history-list">{pageEvents.map((event) => <HistoryRow key={event.id} event={event} />)}</div>
      {pageCount > 1 && <nav className="record-pagination" aria-label="Interactions pages"><button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}><Icon name="chevron" /><span>Previous</span></button><span>Page {page + 1} of {pageCount}</span><button onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page === pageCount - 1}><span>Next</span><Icon name="chevron" /></button></nav>}
    </section>
  </div>;
}
