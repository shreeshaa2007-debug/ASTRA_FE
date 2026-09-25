/**
 * Reference data grounded in the real processed datasets (Phase 2/3) and the
 * real network the backend serves (backend/agents/logistics/tools.py,
 * backend/agents/inventory/tools.py) — not fixture/mock business numbers.
 * Nothing here is fetched from an endpoint because none exists for it yet
 * (there's no "list of valid product ids" endpoint), so it's pinned here
 * instead of invented per-component.
 */

// The 3 warehouses the inventory ledger tracks (backend/services/preprocessing/inventory.py).
export const WAREHOUSES = ['Mumbai', 'Chennai', 'Delhi'] as const;

// Demo signals verified against the live Sensing Agent (Phase 13/14/20) —
// real free-text reports that actually route through gemini-2.5-flash to a validated
// DisruptionEvent (or, for the last one, correctly to NO_DISRUPTION). Not scripted
// outcomes: the LLM call is real, so wording matters and results can vary run to run.
export interface DemoSignal {
  id: string;
  label: string;
  description: string;
  signal: string;
  suggestedProductId: string;
}

export const DEMO_SIGNALS: DemoSignal[] = [
  {
    id: 'suez-closure',
    label: 'Suez Canal Closure',
    description: 'Grounded vessel blocks the canal — the 4 *-SUEZ lanes (Shanghai/Singapore/Mumbai/Chennai -> Rotterdam) go DISRUPTED.',
    signal: 'The container vessel Ever Forward has run aground in the Suez Canal, blocking all traffic. Salvage teams expect about 10 days to refloat it.',
    suggestedProductId: '22197',
  },
  {
    id: 'supplier-fire',
    label: 'Supplier Fire (Istanbul)',
    description: 'A plant fire at supplier S007 (Turkey) — that supplier goes DISRUPTED; routes are untouched.',
    signal: 'Fire at the Istanbul plant',
    suggestedProductId: '22197',
  },
  {
    id: 'mumbai-cyclone',
    label: 'Mumbai Cyclone',
    description: 'A cyclone closes the port of Mumbai — the Mumbai lane goes DISRUPTED and the plan must find supply another way.',
    signal: 'A severe cyclone has made landfall at Mumbai and the port has been closed to all shipping for the next five days.',
    suggestedProductId: '22197',
  },
  {
    id: 'no-disruption',
    label: 'Weather Chat (control)',
    description: 'A harmless message with no supply-chain content — the Sensing Agent should correctly report NO_DISRUPTION.',
    signal: 'The weather in Lisbon looks lovely this weekend, with sunshine and light winds.',
    suggestedProductId: '22197',
  },
];

// Real coordinates for the ports/hubs that appear in routes.csv and the
// inventory ledger's warehouses (backend/services/preprocessing/ports_routes.py
// + inventory.py). Sea ports are World Port Index entries.
export const PORT_COORDS: Record<string, [number, number]> = {
  Shanghai: [31.2167, 121.5],
  Singapore: [1.2655, 103.823],
  Rotterdam: [51.9, 4.4833],
  Mumbai: [18.95, 72.95], // JNPT
  Chennai: [13.0827, 80.2707],
  Delhi: [28.6139, 77.209],
};

export const SUEZ: [number, number] = [30.5, 32.35];
export const CAPE_OF_GOOD_HOPE: [number, number] = [-34.3568, 18.474];
