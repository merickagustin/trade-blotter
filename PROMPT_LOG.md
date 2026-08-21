Classification: Public

# Prompt Log — Trade Blotter

A representative sample of significant prompts used during development with Claude Code, and
what came of them. Not an exhaustive transcript — see [AI_USAGE.md](AI_USAGE.md) for the
fuller usage report this log supports.

---

Prompt:
"Create a backend folder in the root for API using Typescript and Node.js + Express"

Outcome:
Scaffolded `backend/` as its own Node/TypeScript project — separate `package.json` and
`tsconfig.json` from the frontend, Express + `cors`, `tsx` for the dev watch loop, and a
`/api/health` route to confirm it boots. Kept it standalone rather than an npm workspace,
since the frontend wasn't set up as a workspace root.

---

Prompt:
"Create a Trade Model to handle our data for the backend" (with the `Trade` interface —
`id`, `symbol`, `quantity`, `price`, `side`, `trader`, `tradeDate`, `status` — supplied)

Outcome:
Added `backend/src/models/trade.ts` with the given interface plus a `NewTrade` helper type,
and an in-memory `TradeStore` (`backend/src/models/tradeStore.ts`) with `getAll`/`getById`/
`create`/`cancel` so there was something for routes to call against ahead of a real database.

---

Prompt:
"I want to modify the frontend folder that display the trade blotter to display our data from
Trade model. In a dashboard should contain Trade blotter (grid display our data), Create
Trade, Amend Trade and Cancel trade. [...] Will this be a better simple design? This will be
generate in main.tsx"

Outcome:
Recommended against building the dashboard in `main.tsx` — kept it as the plain React
bootstrap and proposed the dashboard live in `App.tsx`, composed from separate components
(grid, form, actions) talking to the backend through a small API client. Held off implementing
until the design was confirmed, per the developer's "not yet."

---

Prompt:
"Include a modal for Create Trade and Amend Trade functionality"

Outcome:
Refined the design to one shared modal for both Create and Amend (same form, prefilled on
amend), with Cancel left as a lightweight inline row action rather than going through a modal.

---

Prompt:
"will go for plain table for the meantime."

Outcome:
Locked in a plain HTML `<table>` for the grid instead of a grid library (e.g. AG Grid /
TanStack Table), on the understanding it's swappable later without touching the data layer.

---

Prompt:
"start to build"

Outcome:
Implemented the agreed design: `GET/POST /api/trades`, `PATCH /api/trades/:id` (amend), and
`POST /api/trades/:id/cancel` on the backend (with validation and a guard against
amending/cancelling already-cancelled trades), plus `TradeBlotter` and `TradeFormModal`
components on the frontend wired to those routes via a Vite dev-server proxy. Verified with
live requests (create → amend → cancel) rather than just a type-check, since it changes
runtime behaviour.

---

Prompt:
"Could you scan the whole project? document its architecture to README.md. Clear it's
existing document."

Outcome:
Replaced the default Vite template README with a description of the actual project instead
of leaving the generic Vite boilerplate in place.

---

Prompt:
"Create a database folder for MySQL connection" → refined to "database/ becomes its own
local package" after review

Outcome:
Scaffolded `database/` as its own root-level npm package (`@trade-blotter/database`),
linked into `backend/` via a `file:` dependency, instead of embedding the connection code
inside `backend/`.

---

Prompt:
"switch over to query MySQL"

Outcome:
Rewrote `TradeStore` to query MySQL instead of an in-memory `Map`. Found and fixed a real
bug: the connection pool was created at import time, before `.env` loaded, so it silently
ignored real credentials — fixed with a lazy `getPool()`.

Prompt:
"We want trades table to be like this [...]" (JSON spec: tradeId, symbol, side, quantity,
price, trader, book, counterparty, tradeTimestamp, status)

Outcome:
Reshaped the domain model to match exactly — added `book`/`counterparty`, renamed
`tradeDate` to `tradeTimestamp` (full ISO datetime) — across schema, backend, and frontend.

---

Prompt:
"Clean cache. Remove the sampleTrade object. Switch to database for live data."

Outcome:
Removed the `sampleTrade` fixture and the startup seeding step; truncated the live tables.
The app now starts empty, populated only by real data created through it.

---

Prompt:
"Add websocket for Real Time updates. Setup for the configuration before updating the
functionalities."

Outcome:
Added a WebSocket server on `/ws` with connection logging and a `broadcast()` helper —
deliberately not called from the trade routes yet, per the "setup first" instruction.

---

Prompt:
"Start updating to create/amend/cancel" → "change to emit to prevent double on live update"

Outcome:
Wired `broadcast()` into create/amend/cancel and added a frontend listener that upserts by
`tradeId`. Then removed the frontend's optimistic local updates so the WebSocket message is
the single source of truth, eliminating a double-update on the initiating client.


