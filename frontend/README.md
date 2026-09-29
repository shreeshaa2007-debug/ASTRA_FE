# ASTRA_FE — OilShield frontend

**OilShield — Agentic AI Oil Supply Chain Control Tower.** The frontend for **ResilientSC**,
an AI-assisted supply-chain disruption response system built for an SAP Hackfest. It presents
a disruption, the six specialized agents' findings, the recovery options they produce, and the
human-approval gate a plan has to pass before it's final.

This repo is the **frontend-only** counterpart to [ASTRA_BE](https://github.com/shreeshaa2007-debug/ASTRA_BE)
(the backend) — both are split out of the same ResilientSC project for parallel development.
React 19 + Vite + Tailwind, generated in Google AI Studio and iterated on since.

## Status (this branch, `optimized`)

**This UI currently runs on an in-memory mock dataset** (`src/data/mockOilShieldData.ts`),
seeded once at load and mutated only in the browser — it is not yet wired to `ASTRA_BE`. The
real-API client is already written (`src/services/api.ts`, `src/types/api.ts`, matching the
backend's actual REST contract) and just needs `src/context/OilShieldContext.tsx` pointed at
it instead of the mock arrays. Until then, treat every screen as a UI/UX prototype: the
*shape* of the data is real (it mirrors the backend's schemas), the *values* are not.

## Layout

```
src/
├── App.tsx                    view router (OilShieldView) — 8 screens
├── context/
│   ├── OilShieldContext.tsx   current state; today backed by mockOilShieldData.ts
│   └── SimulationContext.tsx  the real-API client's simulation lifecycle (create/run/poll/
│                              approve/reject) — written, not yet wired into OilShieldContext
├── services/api.ts            typed REST client for the real backend (docs on the backend
│                              side: POST /api/simulations, /run, /api/decisions/{id}, ...)
├── types/
│   ├── oilshield.ts           the UI's own domain types (oil vocabulary: barrels, vessels,
│   │                          crude grade, API gravity, sulfur %, ...)
│   └── api.ts                 types mirroring the real backend's actual JSON responses
├── data/mockOilShieldData.ts  the current data source (see Status above)
├── components/
│   ├── layout/                OilShieldShell / OilShieldHeader / OilShieldSidebar
│   ├── views/                 Overview, Supply Network, Supplier Intelligence, Logistics &
│   │                          Transport, Recovery Options, Approvals & Decisions, Audit
│   │                          Trail, Settings — plus a few built-but-unrouted views
│   │                          (AgentIntelligenceView, DisruptionCenterView, ...)
│   └── common/                shared cards, the map, notifications, status badges
└── hooks/useFetch.ts           the fetch pattern the real integration will use: a screen has
                                data, is loading, or shows the error — never a fallback that
                                looks like data and isn't
```

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build         # production bundle
npm run build:btp      # behind the SAP Approuter — see ../mta.yaml on the backend side
npm run lint             # tsc --noEmit
```

No API key is required to run this branch — despite an older revision's note about a
`GEMINI_API_KEY`, nothing in this codebase currently calls it; the mock data needs no network
access at all.

## Wiring it to the real backend

Point `VITE_API_BASE_URL` at a running `ASTRA_BE` instance (default `http://localhost:8000`;
see that repo's README) and replace `OilShieldContext`'s mock `useState(INITIAL_*)` calls with
`SimulationContext` + `services/api.ts` calls, mapping the real response shapes
(`src/types/api.ts`) onto the UI's oil-vocabulary types (`src/types/oilshield.ts`) — the
backend's data is generic (products/warehouses/suppliers/routes, no real crude-oil fields like
API gravity or sulfur content), so that mapping is a relabeling layer, not a 1:1 field match.
