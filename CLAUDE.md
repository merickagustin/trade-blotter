# Trade Blotter

## Backend Architecture

`backend/src/` follows a layered structure — each folder has exactly one job:

```
models/         — types only (Trade, NewTrade). No logic.
repositories/   — SQL only. One class per table, implementing an I*Repository interface
                  (e.g. `class TradeRepository implements ITradeRepository`). No business rules.
services/       — business logic: validation, guards (e.g. blocking amend/cancel on a
                  cancelled trade), orchestrating repository calls + side effects (WebSocket
                  broadcast()). A service class takes its repository via constructor injection,
                  defaulting to the real implementation:
                    class TradeService {
                      constructor(private repository: ITradeRepository = new TradeRepository()) {}
                    }
                  This is what makes business logic unit-testable against a fake, in-memory
                  repository instead of a real MySQL connection.
controllers/    — thin (req, res) handlers. Parse the request, call the matching service
                  method, map the result to an HTTP response. This is where ServiceError →
                  status code translation happens — the service itself stays HTTP-agnostic.
routes/         — purely declarative: `Router()` + path/method → controller function.
                  No logic, no imports of services/repositories.
```

**Error handling convention:** services return `Trade | ServiceError` (where
`ServiceError = { error: string; code: number }`) rather than throwing. Controllers check
`'error' in result` and translate `code`/`error` straight to `res.status(...).json(...)`. No
custom error classes, no centralized error middleware — deliberately kept simple.

**Adding a new resource** follows the same five-file pattern: a type in `models/`, a repository
class + interface in `repositories/`, a service class in `services/`, handler functions in
`controllers/`, and declarative route wiring in `routes/`.

**Audit trail:** `PATCH /api/trades/:tradeId` amendments are recorded in `audit_trade_amendments`
(full before/after JSON snapshots, not a field-level diff) and readable via
`GET /api/trades/:tradeId/history`. Cancellations aren't recorded here — amendments only. No
actor/"amended by" field — there's no real authenticated user to attribute it to yet.

## Tests

Tests live in `backend/test/`, mirroring `src/`'s structure — **not** co-located with source
files (e.g. `backend/test/services/tradeService.test.ts`, not
`backend/src/services/tradeService.test.ts`).

Because `backend/tsconfig.json` has `rootDir: "src"`, it can't type-check a sibling `test/`
folder. Use `backend/tsconfig.test.json` (`npx tsc -p tsconfig.test.json`) to type-check
`src/` + `test/` together; the build config stays scoped to `src/` only, so `dist/`'s output
shape and the Dockerfile are unaffected. Run tests with `npm run test` (Vitest).

Favor "simple unit tests where appropriate" — pure logic (validation, guards via a fake
repository) over integration tests requiring a live database.

## Other backend pieces

- `db/init.ts` — startup: connects to MySQL (with retry, since Docker's MySQL image restarts
  itself during first-time init), creates the schema, seeds realistic random data if the
  `trades` table is empty. Seeding calls the repository directly, bypassing the service layer's
  validation/broadcast, since seeding is infrastructure bootstrap, not a user action.
- `ws/server.ts` — WebSocket server; `broadcast()` pushes trade create/amend/cancel events to
  all connected clients.
- `database/` — a separate root-level local package (`@trade-blotter/database`, linked via
  `file:../database`) holding the MySQL connection pool and schema — kept generic/reusable,
  with no trade-specific domain logic.
