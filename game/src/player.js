// Diego Marín, the player: walking and running the streets, aiming with the
// mouse, and getting into any car in Puerto Verano — borrowed, bought or
// stolen. While he drives, the car is the player; the wanted system and the
// missions all read his position from here.

import { PLAYER } from './config.js';
import { ACTION_INTERACT } from './input.js';
import { addCrime } from './police.js';
import { stepVehicle } from './vehicles.js';
import { dist2 } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    armour: 0,
    cash: 250,
    car: null,
    stride: 0,
    invulnerable: 0,
    speedNow: 0,
  };
}

/** Hurt Diego. Armour soaks up most of a hit before health feels it. */
export function damagePlayer(state, amount) {
  const player = state.player;
  if (player.invulnerable > 0 || state.screen !== 'play') return;
  const absorbed = Math.min(player.armour, amount * 0.6);
  player.armour -= absorbed;
  player.health -= amount - absorbed;
  if (player.health <= 0) {
    player.health = 0;
    state.wasted = true;
  }
}

function nearestEnterableCar(state) {
  const player = state.player;
  let best = null;
  let bestD2 = 50 * 50;
  for (const car of state.cars) {
    if (car.dead || car.noEnter) continue;
    const d2 = dist2(player.x, player.y, car.x, car.y);
    if (d2 < bestD2) { bestD2 = d2; best = car; }
  }
  return best;
}

function enterCar(state, car) {
  const player = state.player;
  if (car.kind === 'traffic') addCrime(state, 22);
  if (car.kind === 'police') addCrime(state, 40);
  car.kind = 'player';
  car.blockedBy = undefined;
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  state.audio?.unlock();
}

function exitCar(state) {
  const player = state.player;
  const car = player.car;
  car.kind = 'parked';
  car.speed = 0;
  // Step out on the left side of the car.
  player.x = car.x + Math.cos(car.angle - Math.PI / 2) * (car.width / 2 + 14);
  player.y = car.y + Math.sin(car.angle - Math.PI / 2) * (car.width / 2 + 14);
  player.car = null;
}

export function updatePlayer(state, input, actions, dt) {
  const player = state.player;
  if (player.invulnerable > 0) player.invulnerable -= dt;

  if (player.car) {
    const car = player.car;
    const axes = input.axes();
    const throttle = car.dead ? 0 : -axes.y;
    const steer = axes.x;
    stepVehicle(car, throttle, steer, input.braking(), dt);
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    player.speedNow = Math.abs(car.speed);
    if (actions & ACTION_INTERACT) exitCar(state);
    return;
  }

  // On foot: WASD moves, the mouse aims (twin-stick), Shift runs.
  const axes = input.axes();
  const len = Math.hypot(axes.x, axes.y);
  const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (len > 0) {
    const nx = axes.x / (len || 1);
    const ny = axes.y / (len || 1);
    player.x += nx * speed * dt;
    player.y += ny * speed * dt;
    player.stride += speed * dt * 0.09;
    player.speedNow = speed;
    if (!input.mouse.down) player.angle = Math.atan2(ny, nx);
  } else {
    player.speedNow = 0;
  }
  if (input.mouse.down || state.time - (state.lastShot?.t ?? -99) < 2.5) {
    player.angle = Math.atan2(state.mouseWorld.y - player.y, state.mouseWorld.x - player.x);
  }

  if (actions & ACTION_INTERACT) {
    const car = nearestEnterableCar(state);
    if (car) enterCar(state, car);
  }

  // Traffic does not always stop in time.
  for (const car of state.cars) {
    if (car.kind === 'player' || car.kind === 'parked') continue;
    const reach = car.radius + PLAYER.radius;
    if (dist2(player.x, player.y, car.x, car.y) < reach * reach && Math.abs(car.speed) > 70) {
      damagePlayer(state, 20);
      const d = Math.sqrt(dist2(player.x, player.y, car.x, car.y)) || 1;
      player.x += ((player.x - car.x) / d) * 26;
      player.y += ((player.y - car.y) / d) * 26;
      player.invulnerable = 0.9;
      state.audio?.crash(8);
    }
  }
}

export function drawPlayer(ctx, state) {
  const player = state.player;
  if (player.car) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(74, 36, 8, 0.32)';
  ctx.beginPath();
  ctx.ellipse(3, 5, 9, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const blink = player.invulnerable > 0 && Math.floor(state.time * 12) % 2 === 0;
  if (!blink) {
    const bob = Math.sin(player.stride) * (player.speedNow > 10 ? 1.3 : 0);
    ctx.fillStyle = PLAYER.trousers;
    ctx.beginPath();
    ctx.arc(0, bob * 0.25, 7.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PLAYER.shirt;
    ctx.beginPath();
    ctx.arc(0, bob * 0.25, 6.4, 0, Math.PI * 2);
    ctx.fill();
    // The pistol, when it is out: aiming, firing, or just fired.
    if (state.input.mouse.down || state.time - (state.lastShot?.t ?? -99) < 2.5) {
      ctx.save();
      ctx.rotate(player.angle);
      ctx.fillStyle = '#22242a';
      ctx.fillRect(5, -1.6, 10, 3.2);
      ctx.restore();
    }
    ctx.fillStyle = PLAYER.skin;
    ctx.beginPath();
    ctx.arc(Math.cos(player.angle) * 2.2, Math.sin(player.angle) * 2.2 + bob * 0.25, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
