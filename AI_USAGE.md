# AI Usage Report — Trade Blotter

*Log starts 2026-08-21. No AI-assisted work prior to this date was recorded, so this report
covers sessions from this date forward only.*

## 1. Which AI tools were used

- **Claude Code** (Sonnet 5, VS Code extension) — the only AI tool used on this repo so far.

## 2. How it was used

Used agentically: given a task in plain language, it reads the relevant files itself, proposes
or makes edits, and runs commands, with every change reviewed before being kept. Typical flow:
inspect the current state of the repo → clarify scope if a request is ambiguous → implement →
hand back for review.

## 3. Example prompts

- *"Create a short document for AI usage report which contains the following: which AI tools
  were used, how they were used, examples of prompts, key architectural or implementation
  decisions influenced by AI, areas where you accepted or rejected AI-generated suggestions."*
  → produced this file.
- *"Create a backend folder in the root for API using Typescript and Node.js + Express"*
  → scaffolds a `backend/` service (Express + TypeScript) alongside the existing Vite/React
  `frontend/`.

## 4. Key architectural / implementation decisions influenced by AI

| Decision | AI's role | Who decided |
|---|---|---|
| This AI usage report is a log appended per session, not a one-time retrospective write-up. | Proposed the option (alongside a fill-in-the-blanks template and a "paste your history" option). | Developer chose this option. |
| Backend lives in its own `backend/` folder with its own `package.json`/`tsconfig.json`, separate from the frontend's root config, rather than a shared monorepo/workspace setup. | Claude's default scaffolding choice, since the frontend isn't currently set up as a workspace root. | Applied as proposed; open to revisiting if the project moves to npm workspaces. |
| The `/api/trades` routes cover the four functional requirements discussed (display, create, amend, cancel) as separate REST endpoints (`GET`, `POST`, `PATCH`, `POST /:id/cancel`) over the existing `TradeStore`, with validation on both the client (immediate feedback) and server (source of truth), and cancelled trades blocked from further amend/cancel. | Claude proposed this route shape and validation split as the default after the developer confirmed a plain `<table>` grid and a shared create/amend modal. | Developer approved via "start to build" without further changes. |

## 5. Accepted / rejected AI suggestions

**Accepted:** starting the AI usage log from the current session rather than reconstructing
earlier work from memory, since no transcript of prior sessions existed to draw from.

**Rejected:** Claude's first suggested format for this report — a long template with tables,
placeholder markers, and a "Maintenance" section explaining how to keep the log going. Cut
down to this shorter version instead.

*(This section will grow as more decisions get made; right now the project has only this
report and an initial backend scaffold.)*