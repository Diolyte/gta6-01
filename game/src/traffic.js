// Traffic: the cars that make Puerto Verano feel alive. Each driver follows the
// right-hand lane of its road to the next intersection, chooses a new direction
// there (a mission van chooses the direction that closes on its goal), and
// slows for whatever is in front of it. Parked cars wait at the kerb to be
// stolen. This module also resolves car-against-car bumps for the whole city.

import { PARKED_COUNT, ROADS_X, ROADS_Y, TRAFFIC_COUNT } from './config.js';
import { createVehicle, stepVehicle } from './vehicles.js';
import { dist2, laneCoord, randomRoadPoint } from './world.js';

function nextAlong(list, pos, dir) {
  let best = null;
  for (const v of list) {
    if (dir > 0 && v > pos + 4 && (best === null || v < best)) best = v;
    if (dir < 0 && v < pos - 4 && (best === null || v > best)) best = v;
  }
  return best;
}

/** Point the car at the next intersection down its lane. */
function setWaypoint(car) {
  if (car.dirX !== 0) {
    const next = nextAlong(ROADS_X, car.x, car.dirX);
    car.wpX = next === null ? car.x + car.dirX * 700 : next;
    car.wpY = laneCoord(car.roadC, car.dirX, 0);
  } else {
    const next = nextAlong(ROADS_Y, car.y, car.dirY);
    car.wpY = next === null ? car.y + car.dirY * 700 : next;
    car.wpX = laneCoord(car.roadC, 0, car.dirY);
  }
}

/** At an intersection, pick the next direction and lane. */
function chooseDirection(state, car) {
  const centre = car.dirX !== 0 ? { x: car.wpX, y: car.roadC } : { x: car.roadC, y: car.wpY };
  const options = [
    { x: car.dirX, y: car.dirY },
    { x: -car.dirY, y: car.dirX },
    { x: car.dirY, y: -car.dirX },
  ];
  const viable = options.filter((d) => {
    if (d.x !== 0) return nextAlong(ROADS_X, centre.x, d.x) !== null;
    return nextAlong(ROADS_Y, centre.y, d.y) !== null;
  });
  let choice;
  if (viable.length === 0) {
    choice = { x: -car.dirX, y: -car.dirY };
  } else if (car.aiMode === 'goal') {
    let bestScore = Infinity;
    choice = viable[0];
    for (const d of viable) {
      const nx = d.x !== 0 ? nextAlong(ROADS_X, centre.x, d.x) : centre.x;
      const ny = d.y !== 0 ? nextAlong(ROADS_Y, centre.y, d.y) : centre.y;
      const score = dist2(nx, ny, car.goalX, car.goalY) + state.rng.range(0, 9000);
      if (score < bestScore) { bestScore = score; choice = d; }
    }
  } else {
    choice = state.rng.chance(0.55) ? viable[0] : state.rng.pick(viable);
  }
  car.dirX = choice.x;
  car.dirY = choice.y;
  car.roadC = choice.x !== 0 ? centre.y : centre.x;
  setWaypoint(car);
}

function spawnTrafficCar(state, anywhere) {
  const p = randomRoadPoint(state.rng, state.player.x, state.player.y, anywhere ? 0 : 640);
  const onVertical = ROADS_X.some((cx) => Math.abs(cx - p.x) < 2);
  const car = createVehicle(state.rng, p.x, p.y, 0, 'traffic');
  if (onVertical) {
    car.dirX = 0;
    car.dirY = state.rng.chance(0.5) ? 1 : -1;
    car.roadC = p.x;
    car.x = laneCoord(p.x, 0, car.dirY);
    car.angle = car.dirY > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    car.dirX = state.rng.chance(0.5) ? 1 : -1;
    car.dirY = 0;
    car.roadC = p.y;
    car.y = laneCoord(p.y, car.dirX, 0);
    car.angle = car.dirX > 0 ? 0 : Math.PI;
  }
  car.aiMode = 'wander';
  car.cruise = state.rng.range(105, 150);
  setWaypoint(car);
  return car;
}

/** Put a car on a road facing (dirX, dirY), in the right-hand lane, aimed at its next intersection. */
export function placeOnRoad(car, x, y, dirX, dirY) {
  car.dirX = dirX;
  car.dirY = dirY;
  if (dirX !== 0) {
    car.roadC = y;
    car.x = x;
    car.y = laneCoord(y, dirX, 0);
    car.angle = dirX > 0 ? 0 : Math.PI;
  } else {
    car.roadC = x;
    car.y = y;
    car.x = laneCoord(x, 0, dirY);
    car.angle = dirY > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  setWaypoint(car);
}

export function initTraffic(state) {
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) state.cars.push(spawnTrafficCar(state, true));
  const spots = [...state.world.parkSpots];
  for (let i = 0; i < PARKED_COUNT && spots.length > 0; i += 1) {
    const spot = spots.splice(state.rng.int(0, spots.length - 1), 1)[0];
    const car = createVehicle(state.rng, spot.x, spot.y, spot.angle, 'parked');
    state.cars.push(car);
  }
}

/** The speed this car may do here: cruise, less in a turn, nothing into a bumper. */
function targetSpeed(state, car) {
  let target = car.cruise;
  const toWp = Math.atan2(car.wpY - car.y, car.wpX - car.x);
  let diff = toWp - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > 0.45) target = Math.min(target, 58);
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  for (const other of state.cars) {
    if (other === car) continue;
    const relX = other.x - car.x;
    const relY = other.y - car.y;
    const ahead = relX * fx + relY * fy;
    const side = Math.abs(relX * -fy + relY * fx);
    if (ahead > 0 && ahead < 62 && side < 17) {
      target = Math.min(target, ahead < 36 ? 0 : other.speed * 0.85);
      if (other.kind === 'player' || other === state.player.car) car.blockedBy = state.time;
    }
  }
  const p = state.player;
  if (p.car === null) {
    const relX = p.x - car.x;
    const relY = p.y - car.y;
    const ahead = relX * fx + relY * fy;
    const side = Math.abs(relX * -fy + relY * fx);
    if (ahead > 4 && ahead < 46 && side < 15) target = 0;
  }
  return target;
}

/** Steer a lane-following car (traffic, or the mission van with aiMode 'goal'). */
export function driveLaneCar(state, car, dt) {
  if (car.dead) {
    stepVehicle(car, 0, 0, false, dt);
    return;
  }
  if (dist2(car.x, car.y, car.wpX, car.wpY) < 42 * 42) chooseDirection(state, car);
  const toWp = Math.atan2(car.wpY - car.y, car.wpX - car.x);
  let diff = toWp - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.4));
  const target = targetSpeed(state, car);
  const throttle = Math.max(-0.6, Math.min(1, (target - car.speed) / 55));
  stepVehicle(car, throttle, steer, false, dt);
  if (car.blockedBy !== undefined && state.time - car.blockedBy > 1.4 && car.speed < 6 && target === 0) {
    if (state.time - (car.honkAt || 0) > 3) {
      car.honkAt = state.time;
      state.audio?.horn();
    }
  }
}

export function updateTraffic(state, dt) {
  for (const car of state.cars) {
    if (car.kind !== 'traffic') continue;
    if (dist2(car.x, car.y, state.player.x, state.player.y) > 1200 * 1200) {
      const fresh = spawnTrafficCar(state, false);
      car.x = fresh.x; car.y = fresh.y; car.angle = fresh.angle;
      car.dirX = fresh.dirX; car.dirY = fresh.dirY; car.roadC = fresh.roadC;
      car.wpX = fresh.wpX; car.wpY = fresh.wpY; car.speed = 0; car.hp = 100; car.dead = false;
      continue;
    }
    driveLaneCar(state, car, dt);
  }
}

/**
 * Bump every car out of every other car. Returns the hardest impact the player
 * was part of this step (0 when none), so the caller can price the damage.
 */
export function resolveCarCollisions(state) {
  let playerImpact = 0;
  const cars = state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const minDist = a.radius + b.radius - 3;
      const d2 = dist2(a.x, a.y, b.x, b.y);
      if (d2 >= minDist * minDist || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = (b.x - a.x) / d;
      const ny = (b.y - a.y) / d;
      const push = (minDist - d) / 2;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
      const relSpeed = Math.abs(a.speed - b.speed) + Math.abs(a.speed) * 0.3;
      const impact = Math.min(30, relSpeed * 0.12);
      if (impact > 2) {
        a.hp -= impact * 0.6;
        b.hp -= impact * 0.6;
        if (a.hp <= 0) a.dead = true;
        if (b.hp <= 0) b.dead = true;
        spawnSparks(state, (a.x + b.x) / 2, (a.y + b.y) / 2, 5);
        const playerInvolved = state.player.car === a || state.player.car === b;
        if (playerInvolved) {
          playerImpact = Math.max(playerImpact, impact);
          state.audio?.crash(impact);
        }
      }
      const swap = (a.speed + b.speed) / 2;
      a.speed = swap * 0.7;
      b.speed = swap * 0.7;
    }
  }
  return playerImpact;
}

export function spawnSparks(state, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const a = state.rng.range(0, Math.PI * 2);
    const s = state.rng.range(40, 190);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0,
      maxLife: state.rng.range(0.2, 0.5),
      color: state.rng.pick(['#ffd97a', '#ff9a3c', '#fff3c4']),
      size: state.rng.range(1.5, 3),
      kind: 'spark',
    });
  }
}
