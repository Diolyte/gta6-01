// Cars: one arcade physics step shared by the player, traffic and the police,
// and the drawing of every kind of car. A car is a position, a heading and a
// speed; steering turns it in proportion to how fast it is moving, which is
// what makes it feel like a car and not a cursor.

import { CAR, PALETTE } from './config.js';

const TRAFFIC_COLORS = ['#c94f42', '#3f7fbf', '#e0a458', '#5da85f', '#8d6fc0', '#d8d3c3', '#4a4f57', '#c76b98', '#3aa79b', '#e5e0d5'];

let nextCarId = 1;

export function createVehicle(rng, x, y, angle, kind) {
  const car = {
    id: nextCarId,
    x, y, angle,
    speed: 0,
    steer: 0,
    width: CAR.width,
    length: CAR.length,
    radius: CAR.radius,
    kind, // 'traffic' | 'parked' | 'police' | 'mission'
    color: kind === 'police' ? '#eef1f5' : rng.pick(TRAFFIC_COLORS),
    hp: 100,
    maxHp: 100,
    dead: false,
    // Traffic/police driver state, filled in by their own modules.
    dirX: Math.round(Math.cos(angle)),
    dirY: Math.round(Math.sin(angle)),
    wpX: x,
    wpY: y,
    cruise: 120,
    throttle: 0,
    steerInput: 0,
    honkAt: 0,
    smokeAt: 0,
  };
  nextCarId += 1;
  if (kind === 'mission') { car.length = 56; car.width = 26; car.radius = 24; }
  return car;
}

/**
 * Advance one car. `throttle` is -1..1 (reverse..full), `steer` is -1..1
 * (left..right). Handbrake locks the rear wheels for tight, sliding turns.
 */
export function stepVehicle(car, throttle, steer, handbrake, dt) {
  const accel = throttle > 0 ? CAR.accel * throttle : CAR.reverseAccel * throttle;
  car.speed += accel * dt;
  car.speed -= car.speed * CAR.drag * dt;
  if (handbrake) car.speed -= car.speed * 2.4 * dt;
  if (throttle === 0 && Math.abs(car.speed) < 4) car.speed = 0;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));

  const grip = handbrake ? 1.5 : 1;
  const turn = steer * CAR.steerRate * grip * Math.min(1, Math.abs(car.speed) / 90) * (car.speed < 0 ? -1 : 1);
  car.angle += turn * dt;
  car.steer = steer;

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

export function drawVehicle(ctx, car, time) {
  const half = car.length / 2;
  const halfW = car.width / 2;
  ctx.save();
  ctx.translate(car.x, car.y);

  // Long golden-hour shadow, stretched away from the low sun.
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(10, 13, half, halfW, car.angle, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(car.angle);
  // Wheels.
  ctx.fillStyle = '#17181c';
  const wheelW = 9;
  const wheelH = 5;
  ctx.fillRect(half - 16, -halfW - 2, wheelW, wheelH);
  ctx.fillRect(half - 16, halfW - 3, wheelW, wheelH);
  ctx.fillRect(-half + 7, -halfW - 2, wheelW, wheelH);
  ctx.fillRect(-half + 7, halfW - 3, wheelW, wheelH);
  // Body.
  ctx.fillStyle = car.dead ? '#3a3a3a' : car.color;
  roundRect(ctx, -half, -halfW, car.length, car.width, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (car.kind === 'police') {
    ctx.fillStyle = '#22242a';
    ctx.fillRect(-6, -halfW + 1, 15, car.width - 2);
    // Light bar: red and blue halves trading places twice a second.
    const phase = Math.floor(time * 2.4) % 2 === 0;
    ctx.fillStyle = phase ? '#ff4040' : '#7fb2ff';
    ctx.fillRect(-4, -halfW + 3, 9, 6);
    ctx.fillStyle = phase ? '#7fb2ff' : '#ff4040';
    ctx.fillRect(-4, halfW - 9, 9, 6);
  }
  // Cabin: windscreen, roof, rear window.
  ctx.fillStyle = 'rgba(24, 34, 44, 0.9)';
  roundRect(ctx, -half + 12, -halfW + 4, car.length - 24, car.width - 8, 5);
  ctx.fill();
  ctx.fillStyle = car.dead ? '#2c2c2c' : shade(car.color, 26);
  roundRect(ctx, -half + 18, -halfW + 6, car.length - 38, car.width - 12, 4);
  ctx.fill();
  // Headlights and tail lights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(half - 3, -halfW + 3, 3, 5);
  ctx.fillRect(half - 3, halfW - 8, 3, 5);
  ctx.fillStyle = '#c23b2e';
  ctx.fillRect(-half, -halfW + 3, 3, 5);
  ctx.fillRect(-half, halfW - 8, 3, 5);
  if (car.kind === 'mission') {
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(-half + 4, -halfW + 4, 14, car.width - 8);
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Lighten (positive) or darken a #rrggbb colour by an amount per channel. */
export function shade(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
