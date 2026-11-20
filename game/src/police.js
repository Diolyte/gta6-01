// The law. Crimes witnessed in Puerto Verano earn wanted points; points become
// stars; stars bring patrol cars that hunt the player down. Stay out of sight
// and the heat cools. Get cornered on foot, or sit still in a car with an
// officer alongside, and the bust meter fills — then it is Busted.

import { POLICE_PER_STAR, WANTED_THRESHOLDS } from './config.js';
import { createVehicle, stepVehicle } from './vehicles.js';
import { dist2, randomRoadPoint } from './world.js';

export function levelForPoints(points) {
  let level = 0;
  for (let i = 0; i < WANTED_THRESHOLDS.length; i += 1) if (points >= WANTED_THRESHOLDS[i]) level = i;
  return level;
}

/** Scripted heat: set the wanted level directly (missions use this). */
export function setWantedLevel(state, level) {
  state.wanted.points = WANTED_THRESHOLDS[level];
  state.wanted.level = level;
  state.wanted.seenTimer = 0;
}

/**
 * A crime is committed. It only fully counts when someone saw it — a pedestrian,
 * a driver, or an officer within earshot; unseen, it barely registers.
 */
export function addCrime(state, points) {
  if (state.screen !== 'play') return;
  const px = state.player.car ? state.player.car.x : state.player.x;
  const py = state.player.car ? state.player.car.y : state.player.y;
  let witnessed = state.wanted.level > 0;
  if (!witnessed) {
    for (const ped of state.peds) {
      if (ped.state !== 'down' && dist2(ped.x, ped.y, px, py) < 320 * 320) { witnessed = true; break; }
    }
  }
  if (!witnessed) {
    for (const car of state.cars) {
      if (car.kind === 'traffic' && dist2(car.x, car.y, px, py) < 300 * 300) { witnessed = true; break; }
    }
  }
  state.wanted.points += witnessed ? points : Math.ceil(points * 0.25);
  const level = levelForPoints(state.wanted.points);
  if (level > state.wanted.level) state.wanted.justRose = true;
  state.wanted.level = level;
  if (witnessed) state.wanted.seenTimer = 0;
}

export function spawnPolice(state, x, y) {
  const car = createVehicle(state.rng, x, y, 0, 'police');
  car.cruise = 330;
  state.cars.push(car);
  return car;
}

function policeTargetSpeed(state, car, dist) {
  const level = state.wanted.level;
  const top = 268 + level * 14;
  if (dist > 260) return top;
  if (dist > 90) return top * 0.82;
  return state.player.car ? Math.max(60, Math.abs(state.player.car.speed) * 0.92) : 0;
}

function updatePoliceCar(state, car, dt) {
  const target = state.player.car ?? state.player;
  const lead = state.player.car ? 0.32 : 0;
  const tx = target.x + Math.cos(target.angle ?? 0) * (target.speed ?? 0) * lead;
  const ty = target.y + Math.sin(target.angle ?? 0) * (target.speed ?? 0) * lead;
  const dist = Math.sqrt(dist2(car.x, car.y, target.x, target.y));
  const desired = Math.atan2(ty - car.y, tx - car.x);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.6));
  const speed = car.dead ? 0 : policeTargetSpeed(state, car, dist);
  const throttle = Math.max(-0.7, Math.min(1, (speed - car.speed) / 50));
  stepVehicle(car, car.dead ? 0 : throttle, steer, false, dt);
  // An officer alongside a stationary player starts the arrest.
  const playerSlow = state.player.car ? Math.abs(state.player.car.speed) < 14 : true;
  if (dist < 96 && playerSlow && state.wanted.level > 0) {
    state.wanted.bustTimer += dt * (state.player.car ? 0.9 : 1.5);
  }
}

export function updatePolice(state, dt) {
  const wanted = state.wanted;
  // The stars always match the points: crimes raise them here as surely as
  // addCrime does, and the cooling below lowers them again.
  wanted.level = levelForPoints(wanted.points);
  const px = state.player.car ? state.player.car.x : state.player.x;
  const py = state.player.car ? state.player.car.y : state.player.y;

  // Sight: any officer within 430 counts as seeing the player.
  let seen = false;
  let policeCount = 0;
  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    policeCount += 1;
    if (dist2(car.x, car.y, px, py) < 430 * 430) seen = true;
  }
  if (seen) wanted.seenTimer = 0;
  else wanted.seenTimer += dt;

  // Heat cools while unseen; at zero the patrol gives up and drifts away.
  if (wanted.level > 0 && wanted.seenTimer > 6) {
    wanted.points = Math.max(0, wanted.points - 7 * dt);
    wanted.level = levelForPoints(wanted.points);
  }
  if (wanted.level === 0 && wanted.points > 0) wanted.points = Math.max(0, wanted.points - 7 * dt);

  // Reinforce up to the strength the stars demand.
  const desired = POLICE_PER_STAR[wanted.level];
  wanted.spawnTimer -= dt;
  if (policeCount < desired && wanted.spawnTimer <= 0) {
    wanted.spawnTimer = 1.1;
    for (let tries = 0; tries < 8; tries += 1) {
      const p = randomRoadPoint(state.rng, px, py, 560);
      const d2 = dist2(p.x, p.y, px, py);
      if (d2 > 540 * 540 && d2 < 900 * 900) {
        spawnPolice(state, p.x, p.y);
        break;
      }
      if (tries === 7) spawnPolice(state, p.x, p.y);
    }
  }

  // Heat only cools while unseen, so when it reaches zero every officer is
  // already out of sight: the patrol melts away without the player noticing.
  if (wanted.level === 0) {
    state.cars = state.cars.filter((car) => car.kind !== 'police');
  }

  wanted.bustTimer = Math.max(0, wanted.bustTimer - dt * 0.7);
  for (const car of state.cars) {
    if (car.kind === 'police') updatePoliceCar(state, car, dt);
  }
  if (wanted.bustTimer > 2.6 && state.screen === 'play') {
    state.busted = true;
  }
  // Sirens for the audio system: loudest when an officer is near.
  let nearest = Infinity;
  for (const car of state.cars) {
    if (car.kind === 'police') nearest = Math.min(nearest, Math.sqrt(dist2(car.x, car.y, px, py)));
  }
  state.sirenLevel = nearest === Infinity ? 0 : Math.max(0, 1 - nearest / 700);
}
