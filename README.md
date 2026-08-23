# Trade Blotter

A trade blotter application: a `frontend` (React) and `backend` (Express API) as two
independent projects in one repository, no shared workspace tooling between them.

## Tech stack
**Frontend** - React 19, TypeScript, Vite 8, TanStack Table(grid sorting/filtering)
**Backend** - Node.js, Express 5, TypeScript, Vitest(Unit Test),
**Database** - MySQL, mysql2/promise(DB connectivity)
**Linting** - ESLint 10 (`typescript-eslint`, `eslint-plugin-react-hooks`) — frontend only

## Architecture decisions
**Backend Layered**:
`backend/src` - It splits into models, repositories, services, controllers, routes
This is to provide separate purpose to maintain clean code, easy to track and separate areas of concern. Provide unit testable business logic which contain constructor injected respository interface.

`test/` - this is where the unit test to handle business logics
`ws/` - sits alongside as service layer side effect which in TradeService layer call the broadcast once there is a transaction. To provide update information to the frontend.
`db/` - to orchestrate startup call to the database layer. Including with dataseeds to be inserted to the respected tables for the demo data .

**Database Layered**:
`database/src` - that sets connection pool and schema. You can add or update tables if there are additional features to be added. This is to keep DB logic reusable and decoupled from trade specific logic.

**Frontend layered**:  
This serves as a presentation to present data for the Trade Blotter. `App.tsx` is the main page of the trade blotter where all state lives one component.

`services/` holds the requests to the backend(covering reads, writes, login auth and trades).
`components/` holds the UI pieces.
`types/` keeps shared types in one place.

## Installation instructions
Prerequisites:
Node.js 22+
Either Docker Desktop (for the containerized path) or a local MySQL 8 server (for local dev)

Local dev path - three separate installs, in this order (order matters — database/ has to be built before backend/ can use it):

Database `database/`:

cd database
npm install
npm run build

This compiles dist/ and copies schema.sql alongside it - the backend imports the compiled output, not the source.

Backend `backend/`:

cd backend
npm install
# Windows cmd
copy .env.example .env
# Windows PowerShell
Copy-Item .env.example .env

Then edit .env — DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME — to match your local MySQL server's credentials.

Fronted `frontend/`:

cd frontend
npm install

## How to run the application

### Option A — Docker (single command, from the repo root)

```
docker compose up --build
```

Starts MySQL, backend, and frontend together.

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001
- MySQL: host port **3307** → container's 3306 (won't collide with a local MySQL install)

Stop with `Ctrl+C`; `docker compose down` removes containers; add `-v` to also drop the
`mysql-data` volume (next `up` reseeds from scratch).

### Option B — Local dev (two terminals, hot-reload)

Terminal 1 — backend:

```
cd backend
npm run dev
```

Starts on http://localhost:3001 via `tsx watch`. First run against an empty database creates
the schema and seeds 500 demo trades + 14 trader logins.

Terminal 2 — frontend:

```
cd frontend
npm run dev
```

Starts the Vite dev server on http://localhost:5173, proxying `/api` and `/ws` to
`localhost:3001` (see `frontend/vite.config.ts`).

Open http://localhost:5173, log in with any seeded username + `password123` (see "First run /
demo login" below).

**NOTE**: if you edit `database/src/schema.sql` while the backend dev server is running,
rerun `npm run build` in `database/` — `tsx watch` only watches `backend/src/`, not the linked
package's source, so schema changes silently don't take effect until you rebuild it.

### demo login
These are the users that can be use for the demo:
`JSMITH, ABROWN, MJONES, KPATEL, RLEE, TWONG, SODONNELL, DKUMAR, LGARCIA, EWALSH, NCHEN, PSMITH, HFISCHER, CROSSI`

Password for each users:
password123

Log in with any seeded username + that password. This is placeholder demo data — there's no
signup flow to set a real password yet.

## How to run tests
Backend — the only place with an actual test suite (Vitest):

cd backend
npm run test

Frontend — type-check and lint only, no test suite exists:

cd frontend
npx tsc -b --force
npm run lint

## Assumptions made

- Only single MySQL instance, dev-only credentials
- This is a simple trading app for a single tenant. There is no multi organization data to isolate.
- Trade data will come from the backend API. No 3rd party API for this app. No live market feed.
- **Functional Requirements** - No specific UI design on how it will look like. UX will be simple and practical for the user based on the specific requirements.
- **Live Updates** - Only broadcast live updates from create/amend/cancel.
- **Login user authentication** - bcrypt handles password hashing and verification for login since it doesn't require Token based, MFA or SSO type of authentication.
- **Layered structure** for the project will be frontend, backend and database.
- **Containerisation**, though a bonus idea, will be setup alongside with setting up the backend to easily to configure for docker.
- **P&L View** - doesn't specify the requirements what to display aggregate P&L by symbol. Assuming the content will be Symbol, total of Realized P&L, total of Unrealized P&L, Total P&L, Latest Price by symbol. This formula is based on what I found mostly in trading.
  Formula:
  ```
  Realized P&L = Closed Quantity * (Average Sell Price - Average Buy Price)
  Unrealized P&L = Net Position * (Latest Price - Average Buy Price)
  Total P&L = Realized P&L + Unrealized P&L
  ```
- **Trade Entity** 
Price unit assuming in single currency. Trader - no requirements specific to verify if the input is a trader. Quantity data type is not decimal given by the sample data provided.
- **Position Summary** - one aggregate per symbol, not broken down by book/trader/desk


## Trade-offs accepted

- **Database layer** - a separate package that needs an explicit rebuild (`npm run build`) before schema changes take effect, in exchange for keeping DB logic reusable and decoupled from trade-specific code.
- **Frontend Layered** - all state lives in one component (`App.tsx`), in exchange for not needing Redux/Context - the cost shows up as that file growing as more features get added.
- **Login** - a UX front door only, not real API security (`/api/trades` has no auth checks), in exchange for not needing session/token infrastructure for what's currently just a login screen.
- **Unit tests** - business logic only, tested against in-memory fakes instead of a live database, in exchange for fast, DB-free test runs the repository/SQL layer itself is never automatically tested.
- **Backend Layered** - boilerplate-heavy (Layers: models, repositories, services, controllers, routes), in exchange for logic being unit-testable without a DB and each file staying easy to follow since it only does one job.
- **Audit trail** - full before/after JSON snapshots per amendment instead of a field-level diff. It will be hard to trace when having more records.
- **No Pagination/More Filters** - Trade Blotter, Position Summary and P&L symbol which displays all of the records. This is not ideal way to manage a large volume of records in actual trade event.
- **WebSocket broadcast** - it is unfiltered and unathenticated broadcast to all clients. There's no reconnect or auth mechanism, so a dropped connection silently stops delivering live broadcasts. The Refresh button or a page reload mitigates this.
