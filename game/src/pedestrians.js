// The people of Puerto Verano: they stroll the pavements, the plaza and the
// boardwalk, and they run when the day turns violent — gunfire, a car mounting
// the kerb, a police chase through their street. Being run down is the worst
// crime in the game, and the city remembers it.

import { PED_COUNT, ROAD_WIDTH, ROADS_X, ROADS_Y, SAND_X } from './config.js';
import { addCrime } from './police.js';
import { dist2 } from './world.js';

const SHIRTS = ['#f2e3c6', '#7fc8bc', '#e8836f', '#f2c94c', '#a3c585', '#e5a3b4', '#8fb8d8', '#f5efe0', '#c76b98'];
const SKINS = ['#f1c27d', '#e0ac69', '#c68863', '#8d5524', '#ffdbac'];

export function createPedestrian(rng, x, y) {
  return {
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: 0,
    hp: 30,
    state: 'walk', // 'walk' | 'flee' | 'down'
    shirt: rng.pick(SHIRTS),
    skin: rng.pick(SKINS),
    targetX: x,
    targetY: y,
    thinkAt: 0,
    fleeUntil: 0,
    downAt: 0,
    stride: rng.range(0, 6),
  };
}

/** A pleasant place to walk to: a pavement, the plaza, the park, the boardwalk. */
function wanderTarget(state, ped) {
  const rng = state.rng;
  const roll = rng.range(0, 1);
  if (roll < 0.55) {
    const onX = rng.chance(0.5);
    const cx = rng.pick(ROADS_X);
    const cy = rng.pick(ROADS_Y);
    const side = rng.chance(0.5) ? -1 : 1;
    if (onX) return { x: cx + side * (ROAD_WIDTH / 2 + rng.range(10, 26)), y: ped.y + rng.range(-320, 320) };
    return { x: ped.x + rng.range(-320, 320), y: cy + side * (ROAD_WIDTH / 2 + rng.range(10, 26)) };
  }
  if (roll < 0.7) return { x: state.world.plaza.x + rng.range(10, state.world.plaza.w - 10), y: state.world.plaza.y + rng.range(10, state.world.plaza.h - 10) };
  if (roll < 0.85) return { x: state.world.park.x + rng.range(10, state.world.park.w - 10), y: state.world.park.y + rng.range(10, state.world.park.h - 10) };
  return { x: SAND_X + rng.range(6, 90), y: ped.y + rng.range(-380, 380) };
}

export function initPedestrians(state) {
  for (let i = 0; i < PED_COUNT; i += 1) {
    const ped = createPedestrian(state.rng, 0, 0);
    const t = wanderTarget(state, ped);
    ped.x = t.x;
    ped.y = t.y;
    const next = wanderTarget(state, ped);
    ped.targetX = next.x;
    ped.targetY = next.y;
    state.peds.push(ped);
  }
}

function threatNear(state, ped) {
  const shot = state.lastShot;
  if (shot && state.time - shot.t < 1.6 && dist2(ped.x, ped.y, shot.x, shot.y) < 270 * 270) {
    return { x: shot.x, y: shot.y };
  }
  for (const car of state.cars) {
    if ((car.kind === 'police' || Math.abs(car.speed) > 150) && dist2(ped.x, ped.y, car.x, car.y) < 130 * 130) {
      return { x: car.x, y: car.y };
    }
  }
  return null;
}

export function updatePedestrians(state, dt) {
  const player = state.player;
  for (const ped of state.peds) {
    // Keep the crowd around the player: anyone left far behind reappears ahead.
    if (dist2(ped.x, ped.y, player.x, player.y) > 1250 * 1250) {
      const a = state.rng.range(0, Math.PI * 2);
      const r = state.rng.range(520, 760);
      ped.x = Math.max(20, Math.min(SAND_X + 110, player.x + Math.cos(a) * r));
      ped.y = Math.max(20, Math.min(2480, player.y + Math.sin(a) * r));
      ped.state = ped.state === 'down' ? 'walk' : ped.state;
      ped.hp = 30;
      const t = wanderTarget(state, ped);
      ped.targetX = t.x;
      ped.targetY = t.y;
    }
    if (ped.state === 'down') continue;

    const threat = threatNear(state, ped);
    if (threat) {
      ped.state = 'flee';
      ped.fleeUntil = state.time + 1.8;
      ped.targetX = ped.x + (ped.x - threat.x) * 2.2;
      ped.targetY = ped.y + (ped.y - threat.y) * 2.2;
    } else if (ped.state === 'flee' && state.time > ped.fleeUntil) {
      ped.state = 'walk';
    }

    if (ped.state === 'walk' && dist2(ped.x, ped.y, ped.targetX, ped.targetY) < 30 * 30) {
      const t = wanderTarget(state, ped);
      ped.targetX = t.x;
      ped.targetY = t.y;
    }

    const want = ped.state === 'flee' ? 172 : 56;
    const dx = ped.targetX - ped.x;
    const dy = ped.targetY - ped.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - ped.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ped.angle += Math.max(-6 * dt, Math.min(6 * dt, diff));
      ped.speed += (want - ped.speed) * Math.min(1, dt * 5);
    } else {
      ped.speed += (0 - ped.speed) * Math.min(1, dt * 5);
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    ped.stride += ped.speed * dt * 0.11;

    // Cars: step aside from a slow one; a fast one is a tragedy and a crime.
    for (const car of state.cars) {
      const d2c = dist2(ped.x, ped.y, car.x, car.y);
      const reach = car.radius + 7;
      if (d2c >= reach * reach) continue;
      if (Math.abs(car.speed) > 65) {
        ped.state = 'down';
        ped.hp = 0;
        ped.downAt = state.time;
        if (state.player.car === car) addCrime(state, 55);
        state.audio?.crash(6);
      } else {
        const d = Math.sqrt(d2c) || 1;
        ped.x += ((ped.x - car.x) / d) * 30 * dt * 4;
        ped.y += ((ped.y - car.y) / d) * 30 * dt * 4;
      }
    }
  }
}

export function drawPedestrian(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(74, 36, 8, 0.3)';
  ctx.beginPath();
  ctx.ellipse(3, 5, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (ped.state === 'down') {
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(12, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(ped.stride) * (ped.speed > 10 ? 1.4 : 0);
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(0, bob * 0.3, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(Math.cos(ped.angle) * 2.4, Math.sin(ped.angle) * 2.4 + bob * 0.3, 4.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
