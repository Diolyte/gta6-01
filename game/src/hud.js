// The HUD and the screens: a minimap with blips for the law and the job, the
// wanted stars, health and armour, cash and the pistol, the objective the
// story is asking for, the dialogue box, and the title / pause / busted /
// wasted panels. Everything is drawn in screen space over the world.

import { FONT, PALETTE, ROADS_X, ROADS_Y, ROAD_WIDTH, SAND_X, WATER_X, WORLD } from './config.js';
import { roundRect } from './vehicles.js';
import { dist2 } from './world.js';

const SPEAKERS = {
  rosa: { name: 'Rosa Delgado', color: '#7fc8bc' },
  tito: { name: 'Tito Fuentes', color: '#ecc987' },
  diego: { name: 'Diego', color: '#ff9a76' },
};

function star(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fill();
  }
  ctx.strokeStyle = filled ? '#8a6a10' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawMinimap(ctx, state, view) {
  const size = 176;
  const x = 16;
  const y = view.h - size - 16;
  ctx.save();
  ctx.fillStyle = 'rgba(18, 14, 10, 0.82)';
  roundRect(ctx, x - 4, y - 4, size + 8, size + 8, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 201, 76, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  roundRect(ctx, x, y, size, size, 7);
  ctx.clip();
  const scale = size / WORLD.width;
  const oy = y + (size - WORLD.height * scale) / 2;
  ctx.fillStyle = PALETTE.minimapGround;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#79a85b';
  ctx.fillRect(x + state.world.park.x * scale, oy + state.world.park.y * scale, state.world.park.w * scale, state.world.park.h * scale);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x + SAND_X * scale, oy, (WORLD.width - SAND_X) * scale, size);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x + WATER_X * scale, oy, (WORLD.width - WATER_X) * scale, size);
  ctx.fillStyle = PALETTE.minimapRoad;
  for (const cx of ROADS_X) ctx.fillRect(x + (cx - ROAD_WIDTH / 2) * scale, oy, ROAD_WIDTH * scale, WORLD.height * scale);
  for (const cy of ROADS_Y) ctx.fillRect(x, oy + (cy - ROAD_WIDTH / 2) * scale, size, ROAD_WIDTH * scale);

  const blip = (wx, wy, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + wx * scale, oy + wy * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (state.mission.targetCar && state.mission.active) {
    blip(state.mission.targetCar.x, state.mission.targetCar.y, '#ff5040', 3.4);
  }
  const flash = Math.floor(state.time * 2.4) % 2 === 0;
  for (const car of state.cars) {
    if (car.kind === 'police') blip(car.x, car.y, flash ? '#5ea0ff' : '#ff5040', 2.8);
  }
  if (state.marker) {
    const pulse = 3.4 + Math.sin(state.time * 4) * 1.1;
    blip(state.marker.x, state.marker.y, PALETTE.gold, pulse);
  }
  // The player: a white arrow that turns with Diego (or his car).
  const px = x + state.player.x * scale;
  const py = oy + state.player.y * scale;
  ctx.translate(px, py);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4.4, -3.8);
  ctx.lineTo(-4.4, 3.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `700 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('N', x + 3, y - 8);
}

function drawBars(ctx, state, view) {
  const x = 208;
  const w = 172;
  const player = state.player;
  const bar = (yy, frac, color, label) => {
    ctx.fillStyle = 'rgba(18, 14, 10, 0.75)';
    roundRect(ctx, x - 3, yy - 3, w + 6, 15, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(ctx, x, yy, w, 9, 3);
    ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, x, yy, Math.max(6, w * frac), 9, 3);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, yy - 6);
  };
  bar(view.h - 30, Math.max(0, player.health) / 100, `hsl(${Math.max(0, player.health) * 1.15}, 72%, 46%)`, 'HEALTH');
  if (player.armour > 0) bar(view.h - 56, Math.max(0, player.armour) / 100, '#7fa8c9', 'ARMOUR');
}

function drawWantedAndCash(ctx, state, view) {
  const level = state.wanted.level;
  for (let i = 0; i < 5; i += 1) {
    star(ctx, view.w - 26 - (4 - i) * 30, 30, 12.5, i < level);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillStyle = '#7ee787';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 3;
  const cash = `$${state.player.cash.toLocaleString()}`;
  ctx.strokeText(cash, view.w - 18, 82);
  ctx.fillText(cash, view.w - 18, 82);
  ctx.font = `600 14px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  const weapon = state.weapon;
  const ammo = weapon.reloading > 0 ? 'RELOADING…' : `PISTOL  ${weapon.mag} / ∞`;
  ctx.fillText(ammo, view.w - 18, 104);
  if (state.audio?.muted) {
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText('SOUND OFF — M to unmute', 18, 24);
  }
}

function drawObjective(ctx, state, view) {
  if (!state.objective) return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 11px ${FONT}`;
  const nameW = ctx.measureText(state.missionName || '').width;
  ctx.font = `600 15.5px ${FONT}`;
  const objW = ctx.measureText(state.objective).width;
  const w = Math.max(nameW, objW) + 36;
  const x = (view.w - w) / 2;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, 12, w, state.missionName ? 52 : 38, 9);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x, 12, 4, state.missionName ? 52 : 38);
  if (state.missionName) {
    ctx.font = `700 11px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(state.missionName.toUpperCase(), view.w / 2, 30);
  }
  ctx.font = `600 15.5px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(state.objective, view.w / 2, state.missionName ? 54 : 38);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(next).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

function drawDialogue(ctx, state, view) {
  const dialogue = state.dialogue;
  if (!dialogue) return;
  const line = dialogue.lines[dialogue.index];
  const speaker = SPEAKERS[line.who] ?? { name: line.who, color: PALETTE.gold };
  const w = Math.min(620, view.w - 48);
  const x = (view.w - w) / 2;
  ctx.font = `500 16px ${FONT}`;
  const lines = wrapText(ctx, line.text, w - 36);
  const h = 44 + lines.length * 21;
  const y = view.h - h - 18;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = speaker.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 12.5px ${FONT}`;
  ctx.fillStyle = speaker.color;
  ctx.fillText(speaker.name.toUpperCase(), x + 18, y + 22);
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  lines.forEach((textLine, i) => ctx.fillText(textLine, x + 18, y + 46 + i * 21));
  ctx.textAlign = 'right';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('F ▸', x + w - 14, y + h - 8);
}

function drawBanner(ctx, state, view) {
  const banner = state.banner;
  if (!banner) return;
  const alpha = Math.min(1, banner.timer / 0.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = `800 36px ${FONT}`;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 5;
  ctx.strokeText(banner.title, view.w / 2, 128);
  ctx.fillStyle = banner.color;
  ctx.fillText(banner.title, view.w / 2, 128);
  ctx.font = `600 17px ${FONT}`;
  ctx.strokeText(banner.text, view.w / 2, 158);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(banner.text, view.w / 2, 158);
  ctx.restore();
}

function drawMarkerArrow(ctx, state, view) {
  const marker = state.marker;
  if (!marker) return;
  const cam = state.camera;
  const sx = marker.x - cam.x;
  const sy = marker.y - cam.y;
  if (sx > 30 && sx < view.w - 30 && sy > 30 && sy < view.h - 30) return;
  const cx = view.w / 2;
  const cy = view.h / 2;
  const angle = Math.atan2(sy - cy, sx - cx);
  const ex = Math.max(36, Math.min(view.w - 36, sx));
  const ey = Math.max(88, Math.min(view.h - 64, sy));
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(angle);
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(-8, -8);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const metres = Math.round(Math.sqrt(dist2(state.player.x, state.player.y, marker.x, marker.y)) / 9);
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`${metres}m`, ex, ey + 24);
}

function drawBustMeter(ctx, state, view) {
  const bust = state.wanted.bustTimer;
  if (bust <= 0.12 || state.screen !== 'play') return;
  const sx = state.player.x - state.camera.x;
  const sy = state.player.y - state.camera.y - 44;
  ctx.fillStyle = 'rgba(18,14,10,0.8)';
  roundRect(ctx, sx - 32, sy - 8, 64, 12, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.policeBlue;
  roundRect(ctx, sx - 30, sy - 6, 60 * Math.min(1, bust / 2.6), 8, 4);
  ctx.fill();
  ctx.font = `800 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('BUSTED', sx, sy - 12);
}

export function drawHUD(ctx, state, view) {
  drawMinimap(ctx, state, view);
  drawBars(ctx, state, view);
  drawWantedAndCash(ctx, state, view);
  drawObjective(ctx, state, view);
  drawDialogue(ctx, state, view);
  drawBanner(ctx, state, view);
  drawMarkerArrow(ctx, state, view);
  drawBustMeter(ctx, state, view);
  if (state.player.health < 30 && state.screen === 'play') {
    const pulse = 0.14 + Math.sin(state.time * 5) * 0.05;
    const grad = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.36, view.w / 2, view.h / 2, view.h * 0.8);
    grad.addColorStop(0, 'rgba(190, 20, 10, 0)');
    grad.addColorStop(1, `rgba(190, 20, 10, ${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, view.w, view.h);
  }
  if (state.time < 26 && state.screen === 'play') {
    ctx.textAlign = 'right';
    ctx.font = `500 12px ${FONT}`;
    ctx.fillStyle = 'rgba(253, 246, 233, 0.66)';
    ctx.fillText('WASD move / drive · F enter car · mouse aim · click shoot · Shift run · Space brake · P pause', view.w - 18, view.h - 18);
  }
}

function panel(ctx, view, w, h) {
  const x = (view.w - w) / 2;
  const y = (view.h - h) / 2;
  ctx.fillStyle = 'rgba(16, 10, 7, 0.55)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 201, 76, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  return { x, y };
}

export function drawTitleScreen(ctx, state, view) {
  const { x, y } = panel(ctx, view, 660, 470);
  const cx = view.w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleGrad = ctx.createLinearGradient(cx - 240, 0, cx + 240, 0);
  titleGrad.addColorStop(0, '#f2c94c');
  titleGrad.addColorStop(0.5, '#fb923c');
  titleGrad.addColorStop(1, '#ff5d8f');
  ctx.font = `900 64px ${FONT}`;
  ctx.fillStyle = titleGrad;
  ctx.fillText('VERANO HEAT', cx, y + 84);
  ctx.font = `600 16.5px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Puerto Verano — an original open-world crime story', cx, y + 116);
  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  const story = [
    'Diego Marín is home after six years, owing Rosa Delgado $4,000',
    'for his late brother\'s boat. Five jobs across the city will pay it off —',
    'if Vito Azar and the Puerto Verano police let him live that long.',
  ];
  story.forEach((line, i) => ctx.fillText(line, cx, y + 152 + i * 22));
  ctx.font = `500 14.5px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  const controls = [
    'WASD / arrows — move and drive      Shift — run      Space — brake',
    'F — enter / exit a car      Mouse — aim      Click — shoot      R — reload',
    'P — pause      M — sound on/off      Follow the gold marker to work',
  ];
  controls.forEach((line, i) => ctx.fillText(line, cx, y + 246 + i * 24));
  ctx.font = `800 21px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  if (state.hasSave) {
    ctx.fillText('ENTER — Continue        N — New game', cx, y + 372);
  } else {
    ctx.fillText('Press ENTER to start', cx, y + 372);
  }
  ctx.font = `400 12.5px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Steal cars, run jobs, mind the stars. Your progress saves when a mission lands.', cx, y + 404);
  ctx.fillText('Every name, street and story in Puerto Verano was invented for this game.', cx, y + 426);
  void x;
}

export function drawPausedScreen(ctx, state, view) {
  panel(ctx, view, 460, 250);
  const cx = view.w / 2;
  const cy = view.h / 2;
  ctx.textAlign = 'center';
  ctx.font = `900 40px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('PAUSED', cx, cy - 58);
  ctx.font = `500 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('The city waits. Your progress is saved at every mission.', cx, cy - 16);
  ctx.fillText(`Cash $${state.player.cash.toLocaleString()} · ${state.storyComplete ? 'Story complete' : `Next job: ${state.missionName || '—'}`}`, cx, cy + 14);
  ctx.font = `800 18px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('Press P to keep driving', cx, cy + 62);
}

export function drawOverScreen(ctx, state, view) {
  panel(ctx, view, 520, 280);
  const cx = view.w / 2;
  const cy = view.h / 2;
  ctx.textAlign = 'center';
  const busted = state.overKind === 'busted';
  ctx.font = `900 54px ${FONT}`;
  ctx.fillStyle = busted ? '#5ea0ff' : PALETTE.danger;
  ctx.fillText(busted ? 'BUSTED' : 'WASTED', cx, cy - 62);
  ctx.font = `500 15.5px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(
    busted
      ? 'The Puerto Verano police walk Diego to a cell. The fine stings.'
      : 'Diego wakes up outside Hospital Solana, patched and poorer.',
    cx,
    cy - 22,
  );
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Fine and fees: $${state.overFine ?? 0} · Cash left: $${state.player.cash.toLocaleString()}`, cx, cy + 8);
  ctx.font = `800 19px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('Press ENTER to get back up', cx, cy + 58);
}
