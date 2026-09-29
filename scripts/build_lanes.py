"""Draws the map's shipping lanes: waypoints through the real straits -> smooth curves -> frontend/src/data/lanes.json.

    python scripts/build_lanes.py            (re)write the file
    python scripts/build_lanes.py --check    exit 1 if the checked-in file is not what this script produces

Why a file and not arcs computed in the browser: an arc between two ports cuts across land (the Cape route used to clip West
Africa). A sea lane goes *through* Malacca, Bab-el-Mandeb, Suez, Gibraltar and round the Cape, so the waypoints below say where
the water is, and backend/tests/test_map_lanes.py checks the finished curves against the bundled land polygons.

These are schematic lanes for reading the map, NOT vessel tracks: what a route costs and how long it takes come from
routes.csv, whose distances are the model's own (great-circle plus a documented detour rule), not the length drawn here.
The ports' coordinates are read from frontend/src/data/network.ts, so there is one place they are written down.
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "src" / "data" / "lanes.json"
NETWORK_TS = ROOT / "frontend" / "src" / "data" / "network.ts"

LatLng = tuple[float, float]


def ports() -> dict[str, LatLng]:
    """PORT_COORDS from network.ts — `Shanghai: [31.2167, 121.5],` — so the drawn lanes start and end where the markers are."""
    block = re.search(r"PORT_COORDS[^{]*\{(.*?)\};", NETWORK_TS.read_text(encoding="utf-8"), re.S).group(1)
    return {name: (float(a), float(b)) for name, a, b in re.findall(r"(\w+):\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]", block)}


PORTS = ports()
SUEZ: LatLng = (30.5, 32.35)  # the same point network.ts calls SUEZ: the middle of the canal
CAPE: LatLng = (-34.3568, 18.474)

# --- chokepoints the map labels; a lane says which it passes ---------------------------------------------------------
CHOKEPOINTS = {
    "Strait of Malacca": {"at": (2.5, 101.4), "kind": "strait"},
    "Bab-el-Mandeb": {"at": (12.6, 43.4), "kind": "strait"},
    "Suez Canal": {"at": SUEZ, "kind": "canal"},
    "Strait of Gibraltar": {"at": (35.95, -5.5), "kind": "strait"},
    "Cape of Good Hope": {"at": CAPE, "kind": "cape"},
}

# --- water, in the order a ship meets it ---------------------------------------------------------------------------
SHANGHAI_TO_SINGAPORE: list[LatLng] = [
    (31.0, 122.8), (28.5, 122.9), (26.5, 121.3), (24.8, 119.6), (22.2, 116.8), (20.4, 114.6), (16.0, 111.6),
    (11.0, 110.0), (8.5, 107.8), (5.0, 105.5), (2.5, 104.7), (1.2, 104.0),
]
MALACCA_TO_SRI_LANKA: list[LatLng] = [  # from the Singapore Strait, out past Sumatra, south of Sri Lanka
    (1.15, 103.4), (1.85, 102.2), (2.5, 101.4), (3.5, 100.5), (4.5, 99.3), (5.6, 97.5), (6.6, 95.8), (6.0, 93.0), (5.4, 88.0), (5.2, 83.0), (5.0, 81.0),
]
CHENNAI_TO_SRI_LANKA: list[LatLng] = [(12.4, 81.3), (10.5, 81.9), (8.6, 82.8), (6.0, 82.4), (5.0, 81.0)]
SRI_LANKA_TO_ADEN_GATE: list[LatLng] = [(5.3, 79.5), (7.5, 76.5), (9.0, 73.0), (10.5, 66.0), (11.5, 58.0), (11.2, 54.0), (12.4, 51.0)]
MUMBAI_TO_ADEN_GATE: list[LatLng] = [(18.4, 71.6), (15.5, 68.0), (12.5, 62.0), (11.5, 58.0), (11.2, 54.0), (12.4, 51.0)]
GULF_OF_ADEN_TO_SUEZ: list[LatLng] = [  # Guardafui -> Bab-el-Mandeb -> the length of the Red Sea -> the Gulf of Suez -> the canal
    (12.6, 48.0), (12.3, 45.0), (12.55, 43.4), (13.5, 42.6), (17.0, 40.5), (20.0, 38.4), (22.0, 37.9), (25.0, 35.9), (27.0, 34.4),
    (28.0, 33.35), (28.6, 32.98), (29.0, 32.75), (29.4, 32.55), (29.6, 32.45),  # the Gulf of Suez: a 2-pixel sliver at 110m
    SUEZ, (31.3, 32.3),
]
MEDITERRANEAN: list[LatLng] = [  # Port Said -> Gibraltar, keeping to the water between Crete, Malta, Sicily and Tunisia
    (32.8, 31.0), (33.0, 30.0), (34.0, 25.0), (34.6, 21.0), (35.0, 14.0), (37.4, 11.8), (37.9, 9.3), (38.0, 6.0), (37.8, 3.0), (37.0, -1.0), (35.9, -3.5), (35.95, -5.5),
]
GIBRALTAR_TO_ATLANTIC: list[LatLng] = [(35.9, -6.6), (36.2, -8.0), (36.7, -9.9)]
ATLANTIC_TO_ROTTERDAM: list[LatLng] = [  # the trunk both routes end on: Portugal, Biscay, the Channel, the North Sea
    (38.5, -11.0), (41.5, -11.2), (43.6, -10.6), (45.4, -7.0), (47.6, -6.2), (48.6, -5.9), (49.4, -4.6), (49.8, -3.0), (50.1, -1.5), (50.4, 0.0),
    (50.5, 0.8), (51.0, 1.55), (51.6, 2.4), (52.0, 3.2),
]
INDIAN_OCEAN_TO_CAPE: list[LatLng] = [  # from south of Sri Lanka, straight across the Indian Ocean, south of Madagascar, round Agulhas
    (4.0, 78.0), (-1.0, 71.0), (-10.0, 62.0), (-20.0, 54.0), (-27.5, 46.0), (-32.5, 36.0), (-35.4, 22.0), (-35.1, 19.0),
]
CAPE_TO_IBERIA: list[LatLng] = [  # up the Atlantic side of Africa, well offshore, west of the Canaries and Madeira
    (-33.0, 15.0), (-27.5, 13.0), (-20.0, 10.0), (-10.0, 5.5), (-3.0, 3.0), (2.0, -1.5), (3.0, -8.5), (7.0, -15.0), (11.0, -18.5), (15.0, -19.5),
    (21.0, -19.0), (26.0, -17.5), (28.0, -19.8), (32.0, -18.5), (35.5, -14.0),
]

# China -> Europe by rail: overland, via the cities the Railway Express actually calls at (a schematic line, not a track)
RAIL_SHANGHAI_TO_EUROPE: list[LatLng] = [
    (32.06, 118.8), (34.3, 108.9), (36.06, 103.8), (43.8, 87.6), (44.2, 80.4), (51.2, 71.4), (53.2, 63.6), (53.2, 50.1), (55.75, 37.6), (53.9, 27.6),
    (52.2, 21.0), (52.5, 13.4), (51.4, 6.75),
]


def _lane(origin: str, *segments: list[LatLng]) -> list[LatLng]:
    return [PORTS[origin], *[p for segment in segments for p in segment], PORTS["Rotterdam"]]


SUEZ_TAIL = (GULF_OF_ADEN_TO_SUEZ, MEDITERRANEAN, GIBRALTAR_TO_ATLANTIC, ATLANTIC_TO_ROTTERDAM)
CAPE_TAIL = (INDIAN_OCEAN_TO_CAPE, CAPE_TO_IBERIA, ATLANTIC_TO_ROTTERDAM)

WAYPOINTS: dict[str, list[LatLng]] = {
    "SHA-ROT-SUEZ": _lane("Shanghai", SHANGHAI_TO_SINGAPORE, MALACCA_TO_SRI_LANKA, SRI_LANKA_TO_ADEN_GATE, *SUEZ_TAIL),
    "SIN-ROT-SUEZ": _lane("Singapore", MALACCA_TO_SRI_LANKA, SRI_LANKA_TO_ADEN_GATE, *SUEZ_TAIL),
    "MUM-ROT-SUEZ": _lane("Mumbai", MUMBAI_TO_ADEN_GATE, *SUEZ_TAIL),
    "CHE-ROT-SUEZ": _lane("Chennai", CHENNAI_TO_SRI_LANKA, SRI_LANKA_TO_ADEN_GATE, *SUEZ_TAIL),
    "SHA-ROT-CAPE": _lane("Shanghai", SHANGHAI_TO_SINGAPORE, MALACCA_TO_SRI_LANKA, *CAPE_TAIL),
    "SIN-ROT-CAPE": _lane("Singapore", MALACCA_TO_SRI_LANKA, *CAPE_TAIL),
    "SHA-ROT-RAIL": _lane("Shanghai", RAIL_SHANGHAI_TO_EUROPE),
}
VIA = {
    "SHA-ROT-SUEZ": ["Strait of Malacca", "Bab-el-Mandeb", "Suez Canal", "Strait of Gibraltar"],
    "SIN-ROT-SUEZ": ["Strait of Malacca", "Bab-el-Mandeb", "Suez Canal", "Strait of Gibraltar"],
    "MUM-ROT-SUEZ": ["Bab-el-Mandeb", "Suez Canal", "Strait of Gibraltar"],
    "CHE-ROT-SUEZ": ["Bab-el-Mandeb", "Suez Canal", "Strait of Gibraltar"],
    "SHA-ROT-CAPE": ["Strait of Malacca", "Cape of Good Hope"],
    "SIN-ROT-CAPE": ["Strait of Malacca", "Cape of Good Hope"],
    "SHA-ROT-RAIL": [],
    "SHA-ROT-AIR": [],
}


def great_circle(a: LatLng, b: LatLng, n: int = 80) -> list[LatLng]:
    """Points along the shortest path over the globe (spherical interpolation): what an aircraft flies."""
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    d = 2 * math.asin(math.sqrt(math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))
    out = []
    for i in range(n + 1):
        f = i / n
        s1, s2 = math.sin((1 - f) * d) / math.sin(d), math.sin(f * d) / math.sin(d)
        x = s1 * math.cos(la1) * math.cos(lo1) + s2 * math.cos(la2) * math.cos(lo2)
        y = s1 * math.cos(la1) * math.sin(lo1) + s2 * math.cos(la2) * math.sin(lo2)
        z = s1 * math.sin(la1) + s2 * math.sin(la2)
        out.append((math.degrees(math.atan2(z, math.hypot(x, y))), math.degrees(math.atan2(y, x))))
    return out


def catmull_rom(points: list[LatLng], samples: int = 8, alpha: float = 0.5) -> list[LatLng]:
    """A smooth curve through every waypoint (centripetal, so it does not loop or overshoot at a sharp turn); the two ends are extended
    by reflection so the curve starts and ends exactly on the first and last point."""
    ghost_start = (2 * points[0][0] - points[1][0], 2 * points[0][1] - points[1][1])
    ghost_end = (2 * points[-1][0] - points[-2][0], 2 * points[-1][1] - points[-2][1])
    p = [ghost_start, *points, ghost_end]
    out: list[LatLng] = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        t0 = 0.0
        t1 = t0 + max(math.dist(p0, p1), 1e-6) ** alpha
        t2 = t1 + max(math.dist(p1, p2), 1e-6) ** alpha
        t3 = t2 + max(math.dist(p2, p3), 1e-6) ** alpha
        for s in range(samples):
            t = t1 + (t2 - t1) * s / samples
            pt = []
            for axis in (0, 1):
                a1 = ((t1 - t) * p0[axis] + (t - t0) * p1[axis]) / (t1 - t0)
                a2 = ((t2 - t) * p1[axis] + (t - t1) * p2[axis]) / (t2 - t1)
                a3 = ((t3 - t) * p2[axis] + (t - t2) * p3[axis]) / (t3 - t2)
                b1 = ((t2 - t) * a1 + (t - t0) * a2) / (t2 - t0)
                b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1)
                pt.append(((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1))
            out.append((pt[0], pt[1]))
    out.append(points[-1])
    return out


def build() -> dict:
    lanes: dict[str, dict] = {}
    for route_id, waypoints in WAYPOINTS.items():
        path = catmull_rom(waypoints)
        lane = {"path": [[round(a, 3), round(b, 3)] for a, b in path], "via": VIA[route_id]}
        if "Suez Canal" in VIA[route_id]:  # where the lane is cut when the canal is closed: everything after this point is unreachable
            lane["blocked_at"] = min(range(len(path)), key=lambda i: math.dist(path[i], SUEZ))
        lanes[route_id] = lane
    air = great_circle(PORTS["Shanghai"], PORTS["Rotterdam"])
    lanes["SHA-ROT-AIR"] = {"path": [[round(a, 3), round(b, 3)] for a, b in air], "via": VIA["SHA-ROT-AIR"]}
    return {
        "note": "generated by scripts/build_lanes.py; schematic lanes for reading the map, not vessel tracks",
        "chokepoints": {name: {"at": list(c["at"]), "kind": c["kind"]} for name, c in CHOKEPOINTS.items()},
        "lanes": lanes,
    }


def render() -> str:
    return json.dumps(build(), separators=(",", ":")) + "\n"


def main(argv: list[str]) -> int:
    text = render()
    if "--check" in argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print(f"{OUT} is out of date: run python scripts/build_lanes.py", file=sys.stderr)
            return 1
        print("lanes.json is up to date")
        return 0
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {OUT} ({len(text) / 1024:.0f} KB, {len(WAYPOINTS) + 1} lanes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
