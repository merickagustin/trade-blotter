# AI Usage Report — Trade Blotter

## Which AI tools were used

- **Claude Code** (Sonnet 5, VS Code extension)

## How it was used

- Using Plan mode for significant features(backend refactor,Position Summary, P&L and User Login). I guide AI to build a feature by prompting smaller parts until it build the feature.Asking Question to pin down ambigous scope before building and test for verification. Iterating feature for refinement during the development.


## Example prompts

- "Create modal for simple login to the trade blotter page. There is no create user option. Only user login in the modal." → triggered Plan Mode for the login feature (gating behavior, session persistence, and logout all clarified before implementation).

- "Update P&L View... Aggregate P&L = ({Total Sell Value} − {Total Buy Value}) + ({Net Position} × Latest price)" → "Why not to do simple aggregate display that display Realized P&L and  unrealized P&L instead?" — scope refined mid-plan based on a clarifying question.

## Key architectural / implementation decisions influenced by AI

For the `backend/` folder lives in its own `package.json`/`tsconfig.json` rather than shared to other layered folders to be self contained.

Dashboard built in app.tsx, not main.tsx. This is for the Trade Blotter including Create/Amend/Cancel.

Dark-first theme, unconditional (not tied to prefers-color-scheme).

`trade_id_seq` table mints 'TRD-XXXXXX' IDs, instead of a GENERATED column.

Audit trail store full before and after JSON per amendment in `audit_trade_amendments` table.

Backend refactored into layered architecture(`models`,`repositories`,`services`,`controllers`,`routes`).

For P&L View: a simple net cash-flow formula (SUM(SELL) − SUM(BUY)). As an alternative option among the other proposals before this was later replaced with a Realized/Unrealized/Total split per symbol.

Login user authentication - full gate modal, sessionstorage for session persistence which keeps the user logged in even after refreshing the browser.

Password hashing via bcryptjs, not plain text.

Frontend restructured - move the vite configurations: package.json/vite.config.ts/tsconfigs/eslint.config.js/index.html to `frontend/`. To match the `backend/`, `frontend/` and `database/` for as self contained.

Position Summary computed via SQL aggregation, not derived client-side from loaded trades.

ServiceError convention - services return errors as values, not exceptions; no error middleware.

## Accepted / rejected AI suggestions

**Dashboard**
Accepted: AI recommended against building the dashboard in `main.tsx`, proposing `App.tsx`.

**Create/Amend modal**
Accepted: Make create and amend to share a modal component.

**Grid library**
Rejected: Explicit to suggest to build the display grid using with Tanstack Table but instead in favor grid for the meantime(This was later to replace with Tanstack table with sorting and filtering function).

**Primary key format**
Rejected: Attempt to use `id CHAR(36)` as the primary key but later replace with tradeId with `TRD-XXXXXX` format. Created the trade_id_seq generate sequence for tradeId.

**Backend refactor plan**
Rejected: It suggested to had routes containing logic, unclear error-handling ownership, no dependency-injection interfaces, factory functions and unit test located along with the factory functions files.

**Database Layer**
Rejected: AI attempt to build the DB connection to the `backend/` layer but I eventually rejected to build `database/` to serve self-contained package. This decision is to setup pool connection and `Schema.sql`.

**P&L formula** 
Rejected: During P&L revision, AI tried to suggests multiple options of formula. I outright provide the formula as a guide for this current P&L View.

**Password Hashing Library**
Accepted: I requested to change to much simpler plain text login and password. AI pushback to suggests to switch the library from `crypto.scrypt` to `bcryptjs`.

**Login plan**
Rejected - couple of rejections for logout and display username placement above the tabs.

**Frontend restructuring**
Accepted: moving config files into `frontend/` to match `backend/`/`database/` was proposed after the developer questioned the layout inconsistency directly — approved with "build."