// Puerto Verano itself: the street grid, the buildings between the streets, the
// beach and the sea, palms, piers, market stalls and parking spots. The city is
// generated once from a seed, so every visit (and every screenshot) sees the
// same streets. This module also answers the questions every system asks it:
// is this point on a road, and what does a circle bump into here?

import { DISTRICTS, LANE_OFFSET, PALETTE, PLACES, ROADS_X, ROADS_Y, ROAD_WIDTH, SAND_X, WATER_X, WORLD } from './config.js';

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function districtAt(x, y) {
  for (const d of DISTRICTS) if (pointInRect(x, y, d)) return d.name;
  return 'SOLANA';
}

/** Hand-placed buildings the story needs; generated buildings keep out of their way. */
const LANDMARKS = [
  { x: 2450, y: 380, w: 130, h: 90, hgt: 46, label: 'CASA VERANO', color: '#f2e3c6' },
  { x: 2822, y: 262, w: 74, h: 64, hgt: 20, label: "ROSA'S", color: '#7fc8bc' },
  { x: 2820, y: 1836, w: 84, h: 120, hgt: 24, label: 'CLUB BRISA', color: '#e5a3b4' },
  { x: 770, y: 2010, w: 120, h: 84, hgt: 22, label: "TITO'S GARAGE", color: '#ecc987' },
  { x: 1080, y: 1300, w: 150, h: 110, hgt: 30, label: 'ALMACÉN ROSA', color: '#d98e6a' },
  { x: 1430, y: 950, w: 150, h: 110, hgt: 64, label: 'TORRE SOL', color: '#5d7f96' },
];

/** The mercado plaza and the park are open ground, not building plots. */
const PLAZA = { x: 339, y: 1839, w: 342, h: 242 };
const PARK = { x: 1339, y: 1839, w: 342, h: 242 };

function blockPlots() {
  const xs = [0, ...ROADS_X.flatMap((cx) => [cx - ROAD_WIDTH / 2, cx + ROAD_WIDTH / 2]), SAND_X];
  const ys = [0, ...ROADS_Y.flatMap((cy) => [cy - ROAD_WIDTH / 2, cy + ROAD_WIDTH / 2]), WORLD.height];
  const plots = [];
  for (let i = 0; i < xs.length - 1; i += 2) {
    for (let j = 0; j < ys.length - 1; j += 2) {
      plots.push({ x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], h: ys[j + 1] - ys[j] });
    }
  }
  return plots;
}

function generateBuildings(rng, world) {
  const buildings = [];
  for (const lm of LANDMARKS) {
    buildings.push({ ...lm, roof: rng.pick(PALETTE.roofs), district: districtAt(lm.x, lm.y), landmark: true });
  }
  for (const plot of blockPlots()) {
    if (plot.w < 90 || plot.h < 90) continue;
    if (pointInRect(plot.x + plot.w / 2, plot.y + plot.h / 2, PLAZA) || pointInRect(plot.x + plot.w / 2, plot.y + plot.h / 2, PARK)) continue;
    const inner = { x: plot.x + 16, y: plot.y + 16, w: plot.w - 32, h: plot.h - 32 };
    const downtown = districtAt(plot.x + plot.w / 2, plot.y + plot.h / 2) === 'DOWNTOWN';
    const cols = inner.w > 240 ? 2 : 1;
    const rows = inner.h > 240 ? 2 : 1;
    const cellW = inner.w / cols;
    const cellH = inner.h / rows;
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        if (rng.chance(0.08)) continue; // the odd empty lot
        const b = {
          x: inner.x + c * cellW + 7,
          y: inner.y + r * cellH + 7,
          w: cellW - 14,
          h: cellH - 14,
          hgt: downtown ? rng.range(52, 104) : rng.range(18, 48),
          color: downtown && rng.chance(0.6) ? rng.pick(PALETTE.glass) : rng.pick(PALETTE.buildings),
          roof: rng.pick(PALETTE.roofs),
          district: districtAt(plot.x + plot.w / 2, plot.y + plot.h / 2),
          landmark: false,
          label: null,
        };
        const clash = LANDMARKS.some((lm) => b.x < lm.x + lm.w + 12 && b.x + b.w > lm.x - 12 && b.y < lm.y + lm.h + 12 && b.y + b.h > lm.y - 12);
        if (!clash) buildings.push(b);
      }
    }
  }
  return buildings;
}

function generatePalms(rng) {
  const palms = [];
  for (let y = 120; y < WORLD.height - 80; y += 95) {
    palms.push({ x: SAND_X + 34 + rng.range(-8, 8), y: y + rng.range(-16, 16), s: rng.range(0.85, 1.25), lean: rng.range(-0.16, 0.16) });
  }
  for (let i = 0; i < 30; i += 1) {
    palms.push({ x: PARK.x + rng.range(16, PARK.w - 16), y: PARK.y + rng.range(16, PARK.h - 16), s: rng.range(0.8, 1.3), lean: rng.range(-0.2, 0.2) });
  }
  for (let i = 0; i < 42; i += 1) {
    const onX = rng.chance(0.5);
    const cx = rng.pick(ROADS_X);
    const cy = rng.pick(ROADS_Y);
    palms.push({
      x: onX ? cx + rng.range(-1, 1) * (ROAD_WIDTH / 2 + 12) : rng.range(80, SAND_X - 60),
      y: onX ? rng.range(80, WORLD.height - 80) : cy + rng.range(-1, 1) * (ROAD_WIDTH / 2 + 12),
      s: rng.range(0.75, 1.15),
      lean: rng.range(-0.18, 0.18),
    });
  }
  return palms;
}

function generateStalls(rng) {
  const stalls = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (rng.chance(0.15)) continue;
      stalls.push({
        x: PLAZA.x + 26 + col * 82,
        y: PLAZA.y + 30 + row * 76,
        w: 54,
        h: 34,
        color: rng.pick(PALETTE.neon.concat(['#f2e3c6', '#e8836f'])),
      });
    }
  }
  return stalls;
}

function generateParkSpots(rng) {
  const spots = [];
  for (const cx of ROADS_X) {
    for (let i = 0; i < 3; i += 1) {
      const y = rng.range(120, WORLD.height - 120);
      if (ROADS_Y.some((cy) => Math.abs(cy - y) < 120)) continue;
      const side = rng.chance(0.5) ? -1 : 1;
      spots.push({ x: cx + side * (ROAD_WIDTH / 2 - 15), y, angle: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
  }
  for (const cy of ROADS_Y) {
    for (let i = 0; i < 3; i += 1) {
      const x = rng.range(120, SAND_X - 120);
      if (ROADS_X.some((cx) => Math.abs(cx - x) < 120)) continue;
      const side = rng.chance(0.5) ? -1 : 1;
      spots.push({ x, y: cy + side * (ROAD_WIDTH / 2 - 15), angle: side > 0 ? Math.PI : 0 });
    }
  }
  return spots;
}

export function buildWorld(rng) {
  const intersections = [];
  for (const x of ROADS_X) for (const y of ROADS_Y) intersections.push({ x, y });
  const world = {
    buildings: [],
    palms: generatePalms(rng),
    stalls: generateStalls(rng),
    parkSpots: generateParkSpots(rng),
    intersections,
    plaza: PLAZA,
    park: PARK,
    piers: [240, 900, 1700].map((y) => ({ x: WATER_X, y: y - 13, w: 200, h: 26 })),
    boats: [],
    labels: DISTRICTS.map((d) => ({ x: d.x + d.w / 2, y: d.y + d.h / 2, text: d.name })),
  };
  world.buildings = generateBuildings(rng, world);
  for (let i = 0; i < 7; i += 1) {
    world.boats.push({ x: rng.range(WATER_X + 60, WORLD.width - 120), y: rng.range(80, WORLD.height - 80), angle: rng.range(0, Math.PI * 2), s: rng.range(0.8, 1.5), color: rng.pick(['#f5efe0', '#e8836f', '#7fc8bc', '#f2c94c']) });
  }
  return world;
}

/** True when the point is on tarmac: any road, the plaza, or a parking plot. */
export function isOnRoad(world, x, y) {
  if (x > SAND_X) return false;
  for (const cx of ROADS_X) if (Math.abs(x - cx) <= ROAD_WIDTH / 2) return true;
  for (const cy of ROADS_Y) if (Math.abs(y - cy) <= ROAD_WIDTH / 2) return true;
  return pointInRect(x, y, world.plaza);
}

/** The lane centre for a car travelling (dx, dy) along the road whose centre-line is `centre`. */
export function laneCoord(centre, dx, dy) {
  if (dx > 0) return centre + LANE_OFFSET;
  if (dx < 0) return centre - LANE_OFFSET;
  if (dy > 0) return centre - LANE_OFFSET;
  return centre + LANE_OFFSET;
}

function onPier(world, x, y) {
  return world.piers.some((p) => pointInRect(x, y, p));
}

/**
 * Push a circle (an object with x/y, mutated in place) out of the sea and out of
 * every building and stall. Returns true when it touched anything.
 */
export function collideCircle(world, p, radius) {
  let hit = false;
  if (p.x < radius) { p.x = radius; hit = true; }
  if (p.y < radius) { p.y = radius; hit = true; }
  if (p.y > WORLD.height - radius) { p.y = WORLD.height - radius; hit = true; }
  if (p.x > WORLD.width - radius) { p.x = WORLD.width - radius; hit = true; }
  if (p.x + radius > WATER_X && !onPier(world, p.x, p.y)) { p.x = WATER_X - radius; hit = true; }

  const solids = world.buildings;
  for (let i = 0; i < solids.length; i += 1) {
    const b = solids[i];
    if (p.x + radius < b.x || p.x - radius > b.x + b.w || p.y + radius < b.y || p.y - radius > b.y + b.h) continue;
    const nearX = Math.max(b.x, Math.min(p.x, b.x + b.w));
    const nearY = Math.max(b.y, Math.min(p.y, b.y + b.h));
    const dx = p.x - nearX;
    const dy = p.y - nearY;
    const d2 = dx * dx + dy * dy;
    if (d2 > radius * radius) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      p.x = nearX + (dx / d) * radius;
      p.y = nearY + (dy / d) * radius;
    } else {
      // Centre inside the box: leave by the shortest side.
      const left = p.x - b.x;
      const right = b.x + b.w - p.x;
      const top = p.y - b.y;
      const bottom = b.y + b.h - p.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) p.x = b.x - radius;
      else if (min === right) p.x = b.x + b.w + radius;
      else if (min === top) p.y = b.y - radius;
      else p.y = b.y + b.h + radius;
    }
  }
  for (let i = 0; i < world.stalls.length; i += 1) {
    const s = world.stalls[i];
    if (p.x + radius > s.x && p.x - radius < s.x + s.w && p.y + radius > s.y && p.y - radius < s.y + s.h) {
      const left = p.x - (s.x - radius);
      const right = (s.x + s.w + radius) - p.x;
      const top = p.y - (s.y - radius);
      const bottom = (s.y + s.h + radius) - p.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) p.x = s.x - radius;
      else if (min === right) p.x = s.x + s.w + radius;
      else if (min === top) p.y = s.y - radius;
      else p.y = s.y + s.h + radius;
      hit = true;
    }
  }
  return hit;
}

/** A random point on a random road, at least `minDist` from (x, y) when given. */
export function randomRoadPoint(rng, x = -9999, y = -9999, minDist = 0) {
  for (let tries = 0; tries < 12; tries += 1) {
    let px;
    let py;
    if (rng.chance(0.5)) {
      px = rng.pick(ROADS_X);
      py = rng.range(70, WORLD.height - 70);
    } else {
      px = rng.range(70, SAND_X - 40);
      py = rng.pick(ROADS_Y);
    }
    if (dist2(px, py, x, y) >= minDist * minDist) return { x: px, y: py };
  }
  return { x: ROADS_X[1], y: ROADS_Y[1] };
}

export { PLACES };
