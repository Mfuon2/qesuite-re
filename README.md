# QeSuite

A mobile-first, offline-friendly restaurant operations PWA built as **one Cloudflare application**:

- React + TypeScript UI
- Cloudflare Worker API under `/api/*`
- Cloudflare D1 cloud persistence
- IndexedDB local-first records for unstable/offline connectivity
- Service Worker + web app manifest for installable PWA behavior
- One Vite development process and one Cloudflare deployment

The first release intentionally uses plain business language: **Sale, Buy stock, Expense, Top up, Make food, Withdraw, Cash, Profit**.

Public branding uses **QeSuite**. Infrastructure uses the short identifier
`qesuite-re` consistently for the package, Cloudflare Worker, D1 database and
browser IndexedDB. Existing browser records from `qesuite-restaurant-lite` are
copied into `qesuite-re` once, without overwriting newer local records.

## Repository layout

```text
qesuite-re/
├── apps/
│   └── app/
│       ├── src/                 # React application
│       ├── worker/              # /api Worker
│       ├── migrations/          # D1 schema
│       ├── public/              # PWA manifest, icons, service worker
│       ├── vite.config.ts
│       └── wrangler.jsonc
├── packages/
│   └── shared/                  # shared frontend/Worker event types
└── package.json                 # npm workspaces
```

## Why this is a single application

`@cloudflare/vite-plugin` runs the React frontend and Worker runtime together. The browser calls relative routes such as `/api/sync`; no second backend origin, CORS setup, API host, or separate server is required.

Production is also a single deployment: Cloudflare serves the built SPA assets and invokes the same Worker for `/api/*`.

## Local setup

Requirements: Node.js 22+ and a Cloudflare account for D1/deployment.

```bash
npm install
```

The production D1 database is named `qesuite-re` and its non-secret UUID is
checked into `apps/app/wrangler.jsonc`. Local development continues to use
Wrangler's isolated local D1 storage unless the binding is explicitly changed
to remote mode.

Apply the schema locally:

```bash
cd apps/app
npx wrangler d1 migrations apply qesuite-re --local
cd ../..
```

Start the entire frontend + Worker application:

```bash
npm run dev
```

The dev lifecycle applies any pending local D1 migrations before Vite starts,
so a fresh checkout cannot fail with a missing `business_profile` table. There
is only **one** dev command/process.

## Production D1

Set the selected database's name and UUID in `apps/app/wrangler.jsonc` before running remote commands.
For local Vite development against that remote database, add `"remote": true` to its D1 binding.
Without this flag, development uses a separate local D1 database.

Apply migrations to Cloudflare before first production use:

```bash
cd apps/app
npx wrangler d1 migrations apply qesuite-re --remote
cd ../..
```

## Build and deploy

```bash
npm test
npm run typecheck
npm run build
npm run deploy:check
npm run deploy
```

The deployment includes both the React assets and Worker API.

## Automatic production deployment

Cloudflare Workers Builds watches the repository's `main` branch. A merge to
`main` validates and builds QeSuite, applies only pending migrations to the
production `qesuite-re` D1 database, and then deploys the Worker and React
assets. A failed check or migration prevents deployment. GitHub Actions only
validates pull requests and never writes to Cloudflare.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the exact Workers Builds settings,
release flow, and recovery procedure.

## Current API

- `GET /api/health`
- `GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` — business profile, active products, and records in an optional Nairobi date range
- `GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD` — records for the configured business in an optional Nairobi date range
- `POST /api/sync`
- `POST /api/business` — first-run business setup (does not overwrite an existing profile)
- `POST /api/products` — add a menu item with its price and unit

The browser records first to IndexedDB. It uploads pending events to D1, then downloads dashboard data when online. Event IDs are UUIDs; duplicate inserts do not overwrite financial records. Failed connections retain locally cached data and show a retry state.

Migration `0002_dashboard.sql` adds `business_profile` and `products`. No demo name, menu, price, balance, or stock data is seeded. The profile table has one row (`singleton = 1`) containing the real business ID, name, and optional tagline. Products belong to that business and store prices in integer minor units (`price_minor`, 100 minor units per KSh). Open Settings → Menu Items & Prices to set up the business and add menu items. Sale, production, and stock-count panels use the shared `SearchableSelect` component to select saved items. All dropdowns use app styling with search, keyboard navigation, and accessible combobox/listbox roles. Setup requires connectivity to the configured database. Existing profiles/products can be used to record entries offline. Editing existing profile/catalog records and authentication remain outside this change.

Migration `0003_business_dates.sql` adds the indexed `business_date` field. The Worker calculates it from every event timestamp using `Africa/Nairobi`, and a D1 trigger rejects a value that does not match Nairobi time. The Home dashboard and Reports share the branded date-range picker; totals, stock view, record lists, and server queries use the selected range. Event timestamps and displayed record times are formatted in `Africa/Nairobi`.

## Dashboard verification

```bash
npm test
npm run typecheck
npm run build
npm run deploy:check
```

Tests cover cash carry-forward, owner contributions, stock movements after counts, empty data, product prices, records beyond the old 250-record limit, and idempotent sync. API tests use an isolated SQLite database with the version-controlled migrations. Browser checks were also performed at 320, 390, 768, and 1440 CSS pixels using isolated API fixtures.

## Business rules implemented

- Sales increase sales and cash.
- Stock purchases and expenses reduce cash and estimated profit.
- Top-ups increase cash only; they do **not** increase sales/profit.
- Withdrawals reduce cash only; they do **not** count as business expense.
- Make Food is stock-in: each prepared quantity immediately becomes available for sale.
- A stock count is a physical reconciliation that corrects the available quantity. A sale requires food to have been made and cannot exceed stock left. The UI disables invalid sales and the Worker rejects them again during sync.
- All quick-entry operations are written locally first so the owner can keep working offline.

## PWA / iPhone

To test offline use, load the app online once, then select Offline in DevTools and reload normally. The first online visit caches the page, JavaScript, CSS, and development modules. Existing business records remain in IndexedDB, and new entries stay pending until connectivity returns. Initial business/menu setup still requires a connection. A first-ever visit without a connection, cleared site storage, or DevTools “Bypass for network” cannot use the cached app.

The manifest uses `display: standalone`. On iPhone, users install from Safari using **Share → Add to Home Screen → Open as Web App**. The app includes an iPhone-specific instruction sheet because Safari does not expose the Android-style install prompt.

## Before real customer rollout

This starter intentionally leaves authentication and tenant onboarding out of the first UI. Before onboarding multiple restaurants, add:

1. authenticated user/session identity,
2. business membership/roles,
3. server-side authorization on every API call,
4. per-business product configuration,
5. opening cash / cash reconciliation,
6. backups/export and audit controls,
7. stronger sync conflict/version handling for multi-device businesses.
