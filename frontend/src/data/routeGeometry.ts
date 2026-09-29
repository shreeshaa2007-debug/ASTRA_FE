import { LogisticsOption, TransportMode } from '../types/oilshield';

export type LatLng = [number, number];

export interface RoutePoint {
  name: string;
  coords: LatLng;
  role: 'origin' | 'via' | 'destination';
}

export interface RouteGeometry {
  path: LatLng[];
  points: RoutePoint[];
  /** true when the line is a straight join of two known places, not a mapped corridor */
  approximate: boolean;
}

// Places the route data mentions. Matched by keyword against the free-text origin/destination.
const PLACES: { keys: string[]; name: string; coords: LatLng }[] = [
  { keys: ['ras tanura'], name: 'Ras Tanura', coords: [26.64, 50.16] },
  { keys: ['arabian sea transit'], name: 'Arabian Sea Transit Point', coords: [16.0, 68.5] },
  { keys: ['chennai outer'], name: 'Chennai Outer Anchorage', coords: [13.1, 80.45] },
  { keys: ['chennai port'], name: 'Chennai Port', coords: [13.0995, 80.296] },
  { keys: ['ennore', 'kamarajar'], name: 'Kamarajar Port (Ennore)', coords: [13.2464, 80.334] },
  { keys: ['kochi'], name: 'Kochi Terminal', coords: [9.9312, 76.2673] },
  { keys: ['coimbatore'], name: 'Coimbatore', coords: [11.0168, 76.9558] },
  { keys: ['manali', 'cpcl', 'chennai refinery'], name: 'Chennai Refinery (Manali)', coords: [13.1672, 80.2644] },
  { keys: ['chennai international', 'chennai airport'], name: 'Chennai Airport', coords: [12.99, 80.1693] },
];

export const resolvePlace = (text: string): { name: string; coords: LatLng } | null => {
  const t = text.toLowerCase();
  const hit = PLACES.find((p) => p.keys.some((k) => t.includes(k)));
  return hit ? { name: hit.name, coords: hit.coords } : null;
};

// Ras Tanura -> Strait of Hormuz -> Gulf of Oman -> Arabian Sea -> round the south of Sri Lanka
// -> up the Coromandel coast. Every vertex is open water; it does not cross India or Sri Lanka.
const SEA_LANE_TO_CHENNAI: LatLng[] = [
  [26.64, 50.16],
  [26.9, 51.2],
  [26.2, 52.5],
  [25.9, 54.0],
  [26.3, 56.0],
  [26.6, 56.45], // Strait of Hormuz
  [25.7, 57.3],
  [23.8, 59.9],
  [22.5, 60.8],
  [20.0, 64.5],
  [16.0, 68.5],
  [12.0, 72.0],
  [8.8, 75.0],
  [6.9, 77.8],
  [5.4, 80.6], // south of Dondra Head
  [5.7, 81.8],
  [7.5, 82.6],
  [10.5, 82.0],
  [12.0, 81.2],
  [12.9, 80.7],
];
const CHENNAI_APPROACH: LatLng[] = [[13.0995, 80.296]];
const ENNORE_DIVERSION: LatLng[] = [[13.1, 80.45], [13.2, 80.38], [13.2464, 80.334]];

// Southern Railway freight corridor Coimbatore -> Erode -> Salem -> Jolarpettai -> Katpadi -> Arakkonam -> Chennai
const RAIL_COIMBATORE_CHENNAI: LatLng[] = [
  [11.0168, 76.9558],
  [11.11, 77.34],
  [11.34, 77.72],
  [11.66, 78.15],
  [12.57, 78.57],
  [12.97, 79.14],
  [13.0843, 79.6706],
  [13.0827, 80.2707],
  [13.1672, 80.2644],
];

// NH-544 / NH-44 Coimbatore -> Salem -> Krishnagiri -> Ambur -> Vellore -> Sriperumbudur -> Chennai
const ROAD_COIMBATORE_CHENNAI: LatLng[] = [
  [11.0168, 76.9558],
  [11.34, 77.72],
  [11.66, 78.15],
  [12.52, 78.21],
  [12.79, 78.72],
  [12.92, 79.13],
  [12.97, 79.94],
  [13.1672, 80.2644],
];

// Kochi -> Palakkad -> Coimbatore -> Erode -> Salem -> Tiruvannamalai -> Chennai (schematic)
const PIPELINE_KOCHI_CHENNAI: LatLng[] = [
  [9.9312, 76.2673],
  [10.78, 76.65],
  [11.0168, 76.9558],
  [11.34, 77.72],
  [11.66, 78.15],
  [12.23, 79.07],
  [13.1672, 80.2644],
];

const P = (name: string, coords: LatLng, role: RoutePoint['role']): RoutePoint => ({ name, coords, role });

const CURATED: Record<string, RouteGeometry> = {
  'LOG-01': {
    path: [...SEA_LANE_TO_CHENNAI, ...CHENNAI_APPROACH],
    points: [
      P('Ras Tanura', [26.64, 50.16], 'origin'),
      P('Strait of Hormuz', [26.6, 56.45], 'via'),
      P('South of Sri Lanka', [5.4, 80.6], 'via'),
      P('Chennai Port', [13.0995, 80.296], 'destination'),
    ],
    approximate: false,
  },
  'LOG-02': {
    path: [...SEA_LANE_TO_CHENNAI, ...ENNORE_DIVERSION],
    points: [
      P('Ras Tanura', [26.64, 50.16], 'origin'),
      P('Strait of Hormuz', [26.6, 56.45], 'via'),
      P('South of Sri Lanka', [5.4, 80.6], 'via'),
      P('Chennai Outer Anchorage', [13.1, 80.45], 'via'),
      P('Kamarajar Port (Ennore)', [13.2464, 80.334], 'destination'),
    ],
    approximate: false,
  },
  'LOG-03': {
    path: PIPELINE_KOCHI_CHENNAI,
    points: [
      P('Kochi Terminal', [9.9312, 76.2673], 'origin'),
      P('Coimbatore', [11.0168, 76.9558], 'via'),
      P('Salem', [11.66, 78.15], 'via'),
      P('Chennai Refinery (Manali)', [13.1672, 80.2644], 'destination'),
    ],
    approximate: true,
  },
  'LOG-04': {
    path: RAIL_COIMBATORE_CHENNAI,
    points: [
      P('Coimbatore', [11.0168, 76.9558], 'origin'),
      P('Salem', [11.66, 78.15], 'via'),
      P('Jolarpettai', [12.57, 78.57], 'via'),
      P('Chennai CPCL Siding', [13.1672, 80.2644], 'destination'),
    ],
    approximate: false,
  },
  'LOG-05': {
    path: ROAD_COIMBATORE_CHENNAI,
    points: [
      P('Coimbatore', [11.0168, 76.9558], 'origin'),
      P('Krishnagiri', [12.52, 78.21], 'via'),
      P('Vellore', [12.92, 79.13], 'via'),
      P('Chennai Refinery (Manali)', [13.1672, 80.2644], 'destination'),
    ],
    approximate: false,
  },
};

/**
 * The path to draw for a route option. Known routes use a mapped corridor for their mode;
 * routes added in the UI are joined origin -> destination when both places can be resolved.
 * Returns null when an end point can't be placed, so the map shows nothing rather than a guess.
 */
export const getRouteGeometry = (route: LogisticsOption): RouteGeometry | null => {
  if (CURATED[route.id]) return CURATED[route.id];

  const from = resolvePlace(route.origin);
  const to = resolvePlace(route.alternativePort || route.destination) ?? resolvePlace(route.destination);
  if (!from || !to) return null;

  return {
    path: [from.coords, to.coords],
    points: [P(from.name, from.coords, 'origin'), P(to.name, to.coords, 'destination')],
    approximate: true,
  };
};

export interface ModeStyle {
  label: string;
  color: string;
  weight: number;
  dashArray?: string;
  /** railway: a second white dashed line is laid over the dark one, like a track */
  track?: boolean;
}

export const MODE_STYLE: Record<TransportMode, ModeStyle> = {
  SEA: { label: 'Sea lane', color: '#0284c7', weight: 3 },
  PIPELINE: { label: 'Pipeline', color: '#7c3aed', weight: 3, dashArray: '2, 7' },
  RAIL: { label: 'Railway', color: '#1e293b', weight: 5, track: true },
  ROAD: { label: 'Road', color: '#d97706', weight: 3.5 },
  AIR: { label: 'Air', color: '#db2777', weight: 2.5, dashArray: '10, 8' },
};
