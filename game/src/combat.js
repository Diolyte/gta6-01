// Gunfire and its mess: Diego's pistol, the bullets it throws, the sparks and
// smoke of a city being damaged. Shooting is loud — pedestrians hear it, and
// anyone who sees it will remember it to the police.

import { ACTION_RELOAD } from './input.js';
import { addCrime } from './police.js';
import { spawnSparks } from './traffic.js';
import { dist2, pointInRect } from './world.js';

export const MAGAZINE = 12;

export function createWeapon() {
  return { mag: MAGAZINE, cooldown: 0, reloading: 0 };
}

function fireBullet(state) {
  const player = state.player;
  const spread = state.rng.range(-0.022, 0.022);
  state.bullets.push({
    x: player.x + Math.cos(player.angle) * 15,
    y: player.y + Math.sin(player.angle) * 15,
    angle: player.angle + spread,
    speed: 920,
    life: 0.5,
  });
  state.particles.push({
    x: player.x + Math.cos(player.angle) * 17,
    y: player.y + Math.sin(player.angle) * 17,
    vx: 0, vy: 0, life: 0, maxLife: 0.05, color: '#ffd97a', size: 7, kind: 'flash',
  });
  state.lastShot = { x: player.x, y: player.y, t: state.time };
  addCrime(state, 4);
  state.audio?.shot();
}

export function updateCombat(state, input, actions, dt) {
  const weapon = state.weapon;
  const player = state.player;
  weapon.cooldown -= dt;
  if (weapon.reloading > 0) {
    weapon.reloading -= dt;
    if (weapon.reloading <= 0) weapon.mag = MAGAZINE;
  }
  if (actions & ACTION_RELOAD && weapon.mag < MAGAZINE && weapon.reloading <= 0) {
    weapon.reloading = 0.9;
    state.audio?.reload();
  }

  if (player.car === null && input.mouse.down && weapon.cooldown <= 0 && weapon.reloading <= 0) {
    if (weapon.mag > 0) {
      weapon.mag -= 1;
      weapon.cooldown = 0.135;
      fireBullet(state);
      if (weapon.mag === 0) {
        weapon.reloading = 0.9;
        state.audio?.reload();
      }
    } else {
      weapon.cooldown = 0.25;
      state.audio?.dryFire();
    }
  }

  // Bullets.
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      for (const building of state.world.buildings) {
        if (pointInRect(b.x, b.y, building)) {
          spawnSparks(state, b.x, b.y, 3);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of state.cars) {
        if (car === player.car) continue;
        if (dist2(b.x, b.y, car.x, car.y) < (car.radius + 3) * (car.radius + 3)) {
          car.hp -= 7;
          if (car.hp <= 0 && !car.dead) car.dead = true;
          spawnSparks(state, b.x, b.y, 4);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const ped of state.peds) {
        if (ped.state === 'down') continue;
        if (dist2(b.x, b.y, ped.x, ped.y) < 10 * 10) {
          ped.hp -= 34;
          if (ped.hp <= 0) {
            ped.state = 'down';
            ped.downAt = state.time;
            addCrime(state, 55);
          } else {
            ped.state = 'flee';
            ped.fleeUntil = state.time + 2.2;
          }
          dead = true;
          break;
        }
      }
    }
    if (dead) {
      state.bullets[i] = state.bullets[state.bullets.length - 1];
      state.bullets.pop();
    }
  }

  // Damaged cars smoke; wrecked cars burn.
  for (const car of state.cars) {
    if (car.hp >= 50 && !car.dead) continue;
    car.smokeAt -= dt;
    if (car.smokeAt <= 0) {
      car.smokeAt = car.dead ? 0.07 : 0.16;
      state.particles.push({
        x: car.x + state.rng.range(-8, 8),
        y: car.y + state.rng.range(-8, 8),
        vx: state.rng.range(-6, 6),
        vy: state.rng.range(-26, -14),
        life: 0,
        maxLife: state.rng.range(0.7, 1.3),
        color: car.dead && state.rng.chance(0.4) ? '#ff9a3c' : '#5a5a5a',
        size: state.rng.range(4, 8),
        kind: 'smoke',
      });
    }
  }

  // Particles.
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      state.particles[i] = state.particles[state.particles.length - 1];
      state.particles.pop();
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'spark') p.vy += 320 * dt;
    if (p.kind === 'smoke') p.size += 7 * dt;
  }
}

export function drawCombat(ctx, state) {
  for (const b of state.bullets) {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(b.angle) * 9, b.y - Math.sin(b.angle) * 9);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const p of state.particles) {
    const fade = 1 - p.life / p.maxLife;
    if (p.kind === 'smoke') {
      ctx.fillStyle = p.color === '#ff9a3c' ? `rgba(255, 140, 50, ${0.5 * fade})` : `rgba(70, 66, 62, ${0.42 * fade})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'flash') {
      ctx.fillStyle = `rgba(255, 217, 122, ${fade})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * fade + 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = fade;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
}
