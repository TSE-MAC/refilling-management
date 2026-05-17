# RefillOps — PRD

## Original Problem Statement
Internal full-stack web application for a fire extinguisher refilling plant. Single-user login (no registration), JWT auth in localStorage, screens for Dashboard, Jobs (Active/Dispatched), New Job, Job Detail, History, Parties, Stock. Built on FastAPI + React + MongoDB (per user choice; original spec mentioned Node/Express + Vite).

## Architecture
- **Backend**: FastAPI on `/api/*`, MongoDB (motor), JWT (PyJWT), HTTPBearer dependency
- **Frontend**: React (CRA), React Router, Tailwind, shadcn/ui, sonner toasts, axios with bearer interceptor
- **Auth**: hardcoded credentials via backend `.env` (`LOGIN_USER` / `LOGIN_PASS`); JWT stored in `localStorage`
- **Seed**: 6 spare parts on first run (ABC Valve, Spindle, ABC Pipe, CO2 Discharge Set, CO2 Pipe, CO2 Horn)

## User Personas
- **Plant operator** — single internal user managing daily refill jobs, dispatches, and stock.

## Core (Static) Requirements
- Single hardcoded login `suresafe / suresafe123`
- Color palette: navy `#1E3A5F` + red `#DC2626` for alerts
- Currency `₹`, dates `DD MMM YYYY`
- Mobile + desktop responsive (sidebar desktop / bottom nav mobile)
- Active jobs editable; dispatched jobs read-only

## What's Been Implemented (Feb 2026)
- Login + JWT issuance/verification, route protection, logout
- Parties CRUD (UI + API)
- Jobs CRUD + dispatch (deducts spare parts, writes StockLog `out` entries)
- New Job form: extinguisher rows (type/size/unit/qty with dynamic size dropdown) + spare parts rows + delivery charge
- Job Detail: editable mode (active) and read-only mode (dispatched)
- History page: live company search + date range filters + summary footer
- Stock: parts list with Low/OK badges (Low when `< 5`), Add Stock modal (creates `in` log), Stock Log tab sorted desc
- Dashboard stats endpoint + 4 cards
- Seed of 6 spare parts on startup if collection empty
- Comprehensive backend pytest suite (11/11 passing) at `/app/backend/tests/backend_test.py`

## Frontend Redesign v2 (May 2026)
- **Stack preserved**: FastAPI + React (CRA) + yarn + supervisor — unchanged
- **Mobile-first industrial UI overhaul** with Framer Motion (added via `yarn add framer-motion`)
- Bottom navigation (5 items, animated active pill) + sticky top app bar on mobile
- Compact navy sidebar with animated active rail on desktop
- Floating action button "New Job" on Home + Jobs routes (mobile only)
- Slide-up Drawers (vaul) replace AlertDialogs for dispatch confirm, party add/edit/delete, add stock
- Custom palette: `#183153` navy, `#224b7a` deep blue, `#f3f4f6` background, `#dc2626` red, `#16a34a` green
- Typography: Archivo (display, industrial) + IBM Plex Sans (body) + JetBrains Mono (numbers)
- Dashboard: greeting card with live status, 4 animated stat cards, "Awaiting Dispatch" task cards with urgency, "Low Stock Warnings", "Quick Actions", "Recent Activity" timeline
- Jobs: task-card layout with colored-left-border (per extinguisher type / red if aged ≥3d), Today/Aged badges, swipeable-style tabs with motion pill
- New Job: grouped form sections, sticky bottom save bar (with right padding to avoid preview badge), inline ext-type accent, walk-in vs existing party chips
- Job Detail: gradient header (navy when active, emerald when dispatched), header CTAs + sticky save bar (active only)
- History: 3-stat summary strip, filter Drawer with date range, mobile cards / desktop table, active filter chips
- Parties: contact-card grid with `tel:` phone links, search filter
- Stock: Critical/Low/OK left-border severity, +1/+5/+10/+25/+50 quick chips in Add Stock drawer, IN/OUT movement log timeline
- Page transitions, animated counters on stats, layout pill animations on tabs, skeleton shimmer loaders
- Every interactive element has `data-testid` (separate mobile suffix for bottom-nav to avoid duplicate IDs)
- Iteration 2 test report: 95% frontend success — issues fixed: sticky save bar right padding for badge collision, mobile bottom-nav testids added, Stock tab key renamed `inventory`

## Backlog / Next Tasks
**P1**
- Replace native HTML5 date inputs on History with shadcn Calendar/DatePicker for locale-stable UX
- Capitalize Jobs tab labels (cosmetic — currently `capitalize` class)
- Add `DialogDescription` to Parties dialog to remove Radix a11y warning

**P2**
- Validate stock availability before dispatch (warn if deduction would go negative)
- Concurrency guard on dispatch (atomic status flip)
- Migrate from `@app.on_event` to FastAPI lifespan context
- Tighten CORS origins for production
- Per-row "View History" deep-link should pre-select the party in History (already passes `?q=`)

**P3 / Future**
- Job invoice/receipt printable view
- Per-extinguisher refill pricing & customer billing totals
- Date-range "Total Delivery Cost" rollups exportable as CSV
- Multi-user with roles (operator vs. owner)
