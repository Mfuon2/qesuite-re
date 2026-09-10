# Architecture

```text
                    One Cloudflare deployment

      ┌──────────────────────────────────────────┐
      │                  QeSuite                 │
      │                                          │
Phone │  React SPA          Cloudflare Worker    │
─────▶│  static assets ───▶ /api/*               │
      │       │                  │                │
      └───────┼──────────────────┼────────────────┘
              │                  │
              ▼                  ▼
         IndexedDB              D1
         local-first        cloud source
              │                  ▲
              └──── sync queue ──┘
```

## Request routing

- `/api/*` → Worker first.
- Existing frontend assets → Cloudflare static asset serving.
- Other navigation routes → SPA `index.html` fallback.

There is no separately hosted API and no localhost backend port.

## Offline model

Every user action becomes an immutable business event and is stored locally before sync. This prevents restaurant operations from being blocked by connectivity.

The initial event model intentionally prioritizes simple capture over perfect accounting. More advanced inventory costing and double-entry accounting can be derived or layered behind the simple UI later without changing the owner's daily language.
