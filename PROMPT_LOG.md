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


