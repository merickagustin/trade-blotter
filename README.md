# Trade Blotter

A trade blotter application: a `frontend` (React) and `backend` (Express API) as two
independent projects in one repository, no shared workspace tooling between them.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| Backend | Node.js, Express 5, TypeScript |
| Linting | ESLint 10 (`typescript-eslint`, `eslint-plugin-react-hooks`) — frontend only |

## Project structure

```
trade-blotter/
├── frontend/              # React app (Vite root is repo root; source lives here)
│   ├── main.tsx           # React entry point, mounts <App /> into #root
│   ├── App.tsx            # Top-level component
│   ├── App.css            # Component styles
│   ├── index.css          # Global styles / CSS variables (light + dark theme)
│   └── assets/            # Static assets bundled by Vite
├── public/                # Static assets served as-is (favicon, sprite icons)
├── backend/                # Express API (separate Node project, own package.json)
│   ├── src/
│   │   ├── index.ts       # App entry point — creates the Express app, starts the server
│   │   └── models/
│   │       ├── trade.ts      # Trade / NewTrade type definitions
│   │       └── tradeStore.ts # In-memory data store for trades
│   ├── package.json
│   └── tsconfig.json
├── vite.config.ts         # Vite config (React plugin)
├── tsconfig.json          # Root TS project references (app + node configs)
├── tsconfig.app.json       # TS config for frontend/ (bundler resolution, DOM lib)
├── tsconfig.node.json      # TS config for vite.config.ts (Node lib)
├── eslint.config.js        # Flat ESLint config for the frontend
└── package.json            # Frontend package manifest and scripts
```

The frontend and backend are **not** an npm workspace — each has its own `package.json`
and `node_modules`, and is installed/run independently.

## Frontend

- Entry point: [frontend/main.tsx](frontend/main.tsx) mounts `<App />` (from
  [frontend/App.tsx](frontend/App.tsx)) into the `#root` element in `index.html`, wrapped in
  `<StrictMode>`.
- Styling is plain CSS: [frontend/index.css](frontend/index.css) defines CSS custom properties
  for a light/dark theme (via `prefers-color-scheme`), [frontend/App.css](frontend/App.css)
  holds component-level styles.
- No routing, state management, or data-fetching library is installed yet — `App.tsx` is
  currently the unmodified Vite template and does not talk to the backend.

**Scripts** (run from the repo root, `package.json`):
| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview a production build locally |

## Backend

- Entry point: [backend/src/index.ts](backend/src/index.ts) — creates an Express app, enables
  CORS and JSON body parsing, and exposes one route: `GET /api/health`.
- Data model: [backend/src/models/trade.ts](backend/src/models/trade.ts) defines the `Trade`
  interface:

  ```ts
  interface Trade {
    id: string
    symbol: string
    quantity: number
    price: number
    side: 'BUY' | 'SELL'
    trader: string
    tradeDate: string
    status: 'ACTIVE' | 'CANCELLED'
  }
  ```

  `NewTrade` (`Omit<Trade, 'id' | 'status'>`) is the shape used to create a trade before an id
  and status are assigned.
- Storage: [backend/src/models/tradeStore.ts](backend/src/models/tradeStore.ts) is an
  **in-memory** store (a `Map` keyed by id) — no database is configured. It resets whenever
  the server restarts. It currently exposes `getAll`, `getById`, `create`, and `cancel`.
- **Not yet built:** there are no HTTP routes wired up to `TradeStore` beyond the health
  check — no `GET/POST /api/trades`, no amend/cancel endpoints, and no request validation.
  The frontend does not call the backend yet.

**Scripts** (run from `backend/`):
| Script | Purpose |
|---|---|
| `npm run dev` | Start the API with `tsx watch` (serves on `http://localhost:3001`, override with `PORT`) |
| `npm run build` | Compile TypeScript to `backend/dist` |
| `npm run start` | Run the compiled server (`node dist/index.js`) |

## Running locally

```sh
# Frontend (repo root)
npm install
npm run dev

# Backend (separate terminal)
cd backend
npm install
npm run dev
```

The two currently run as unconnected services — the frontend has no configured proxy or base
URL pointing at the backend yet.

## Current status

This is early-stage scaffolding, not a working application yet:

- Frontend is the default Vite + React template; the trade blotter UI (grid, create/amend
  modal, cancel action) has not been built.
- Backend has a `Trade` model and an in-memory store, but no routes exposing it over HTTP.
- No persistence layer (database) — restarting the API loses all data.
- No tests, no CI, no environment-variable configuration beyond `PORT`.
