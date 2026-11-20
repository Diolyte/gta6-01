// Drawing the world: Puerto Verano at golden hour. The ground goes down first
// (pavements, roads, the beach, the sea), then the buildings with their long
// shadows, the palms and stalls, the mission marker's beam of light, and
// finally the cars, people and gunfire that the other modules draw. A warm
// grade and a vignette finish every frame, whatever screen the game is on.

import { PALETTE, ROADS_X, ROADS_Y, ROAD_WIDTH, SAND_X, STREET_NAMES_X, STREET_NAMES_Y, WATER_X, WORLD } from './config.js';
import { drawCombat } from './combat.js';
import { drawHUD, drawOverScreen, drawPausedScreen, drawTitleScreen } from './hud.js';
import { drawPedestrian } from './pedestrians.js';
import { drawPlayer } from './player.js';
import { drawVehicle } from './vehicles.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function hash(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 720, dpr: 1 };

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function visible(cam, x, y, w, h) {
    return x + w > cam.x - 80 && y + h > cam.y - 80 && x < cam.x + view.w + 80 && y < cam.y + view.h + 80;
  }

  function drawGround(state, cam) {
    const world = state.world;
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(cam.x, cam.y, view.w, view.h);

    // The park and the mercado plaza are open ground.
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(world.park.x, world.park.y, world.park.w, world.park.h);
    ctx.fillStyle = '#c2ab84';
    ctx.fillRect(world.plaza.x, world.plaza.y, world.plaza.w, world.plaza.h);

    // Sand, boardwalk and sea down the east edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(SAND_X, cam.y, WATER_X - SAND_X, view.h);
    ctx.fillStyle = PALETTE.boardwalk;
    ctx.fillRect(SAND_X + 6, cam.y, 12, view.h);
    const sea = ctx.createLinearGradient(WATER_X, 0, WORLD.width, 0);
    sea.addColorStop(0, PALETTE.water);
    sea.addColorStop(1, PALETTE.waterDeep);
    ctx.fillStyle = sea;
    ctx.fillRect(WATER_X, cam.y, WORLD.width - WATER_X, view.h);
    ctx.strokeStyle = 'rgba(255, 240, 200, 0.25)';
    ctx.lineWidth = 2;
    for (let y = Math.floor(cam.y / 52) * 52; y < cam.y + view.h + 52; y += 52) {
      ctx.beginPath();
      for (let x = WATER_X + 12; x < WORLD.width; x += 64) {
        const lift = Math.sin(state.time * 1.3 + y * 0.05 + x * 0.02) * 4;
        if (x === WATER_X + 12) ctx.moveTo(x, y + lift);
        else ctx.lineTo(x, y + lift);
      }
      ctx.stroke();
    }
    for (const pier of world.piers) {
      ctx.fillStyle = PALETTE.pier;
      ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let x = pier.x + 14; x < pier.x + pier.w; x += 30) ctx.fillRect(x, pier.y, 3, pier.h);
    }
    for (const boat of world.boats) {
      ctx.save();
      ctx.translate(boat.x, boat.y);
      ctx.rotate(boat.angle);
      ctx.fillStyle = 'rgba(23, 60, 70, 0.35)';
      ctx.beginPath();
      ctx.ellipse(3, 5, 20 * boat.s, 8 * boat.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = boat.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20 * boat.s, 7.5 * boat.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5efe0';
      ctx.fillRect(-6 * boat.s, -3 * boat.s, 12 * boat.s, 6 * boat.s);
      ctx.restore();
    }

    // Roads: tarmac, edge lines, dashed centres, crosswalks at the junctions.
    ctx.fillStyle = PALETTE.asphalt;
    for (const cx of ROADS_X) ctx.fillRect(cx - ROAD_WIDTH / 2, cam.y, ROAD_WIDTH, view.h);
    for (const cy of ROADS_Y) ctx.fillRect(cam.x, cy - ROAD_WIDTH / 2, view.w, ROAD_WIDTH);
    ctx.strokeStyle = 'rgba(232, 217, 160, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    ctx.beginPath();
    for (const cx of ROADS_X) { ctx.moveTo(cx, cam.y); ctx.lineTo(cx, cam.y + view.h); }
    for (const cy of ROADS_Y) { ctx.moveTo(cam.x, cy); ctx.lineTo(cam.x + view.w, cy); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(216, 210, 196, 0.5)';
    for (const ix of ROADS_X) {
      for (const iy of ROADS_Y) {
        if (!visible(cam, ix - 70, iy - 70, 140, 140)) continue;
        for (let s = -2; s <= 2; s += 1) {
          ctx.fillRect(ix - 58, iy + s * 13 - 3, 34, 6);
          ctx.fillRect(ix + 24, iy + s * 13 - 3, 34, 6);
          ctx.fillRect(ix + s * 13 - 3, iy - 58, 6, 34);
          ctx.fillRect(ix + s * 13 - 3, iy + 24, 6, 34);
        }
      }
    }

    // District names painted on the ground, street names along the kerbs.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const label of world.labels) {
      if (!visible(cam, label.x - 300, label.y - 60, 600, 120)) continue;
      ctx.font = '700 62px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(70, 44, 18, 0.13)';
      ctx.fillText(label.text, label.x, label.y);
    }
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 248, 225, 0.5)';
    for (let i = 0; i < ROADS_X.length; i += 1) {
      for (const iy of ROADS_Y) {
        ctx.save();
        ctx.translate(ROADS_X[i] - ROAD_WIDTH / 2 + 12, iy - 84);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(STREET_NAMES_X[i], 0, 0);
        ctx.restore();
      }
    }
    for (let i = 0; i < ROADS_Y.length; i += 1) {
      for (const ix of ROADS_X) {
        ctx.fillText(STREET_NAMES_Y[i], ix + 88, ROADS_Y[i] - ROAD_WIDTH / 2 + 12);
      }
    }
  }

  function drawBuildings(state, cam) {
    const buildings = state.world.buildings;
    for (const b of buildings) {
      if (!visible(cam, b.x, b.y, b.w + b.hgt, b.h + b.hgt)) continue;
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(b.x + b.hgt * 0.34, b.y + b.hgt * 0.2, b.w, b.h);
    }
    for (const b of buildings) {
      if (!visible(cam, b.x, b.y, b.w, b.h)) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      const inset = Math.min(11, b.w * 0.09, b.h * 0.09);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + inset, b.y + inset, b.w - inset * 2, b.h - inset * 2);
      ctx.strokeStyle = 'rgba(255, 246, 220, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + inset, b.y + inset, b.w - inset * 2, b.h - inset * 2);
      // Tall towers get a glass grid on the roof, so downtown reads as towers, not slabs.
      if (b.hgt > 50) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = b.x + inset + 18; gx < b.x + b.w - inset - 4; gx += 18) {
          ctx.moveTo(gx, b.y + inset + 2);
          ctx.lineTo(gx, b.y + b.h - inset - 2);
        }
        for (let gy = b.y + inset + 18; gy < b.y + b.h - inset - 4; gy += 18) {
          ctx.moveTo(b.x + inset + 2, gy);
          ctx.lineTo(b.x + b.w - inset - 2, gy);
        }
        ctx.stroke();
      }
      // Rooftop clutter: a plant room and a water tank, placed by hash so they never move.
      const h1 = hash(b.x, b.y);
      const h2 = hash(b.y, b.x);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(b.x + inset + h1 * Math.max(1, b.w - inset * 2 - 22), b.y + inset + 3, 20, 13);
      ctx.beginPath();
      ctx.arc(b.x + inset + 12 + h2 * Math.max(1, b.w - inset * 2 - 24), b.y + b.h - inset - 12, 6.5, 0, Math.PI * 2);
      ctx.fill();
      if (b.label) {
        ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(46, 28, 10, 0.75)';
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      }
    }
    // Market stalls: a wooden counter under a bright striped awning.
    for (const s of state.world.stalls) {
      if (!visible(cam, s.x, s.y, s.w, s.h)) continue;
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(s.x + 5, s.y + 5, s.w, s.h);
      ctx.fillStyle = '#7a5a38';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x - 3, s.y - 3, s.w + 6, 13);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let x = s.x + 4; x < s.x + s.w; x += 14) ctx.fillRect(x, s.y - 3, 6, 13);
    }
  }

  function drawPalms(state, cam) {
    for (const palm of state.world.palms) {
      if (!visible(cam, palm.x - 40, palm.y - 10, 90, 60)) continue;
      const crownX = palm.x + palm.lean * 34;
      const crownY = palm.y - 30 * palm.s;
      ctx.strokeStyle = 'rgba(74, 36, 8, 0.25)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(palm.x + 8, palm.y + 6);
      ctx.lineTo(crownX + 8, crownY + 6);
      ctx.stroke();
      ctx.strokeStyle = '#8a6a42';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.quadraticCurveTo(palm.x + palm.lean * 18, palm.y - 16 * palm.s, crownX, crownY);
      ctx.stroke();
      ctx.strokeStyle = '#55803c';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + palm.lean * 3;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(
          crownX + Math.cos(a) * 15 * palm.s,
          crownY + Math.sin(a) * 8 * palm.s - 6,
          crownX + Math.cos(a) * 27 * palm.s,
          crownY + Math.sin(a) * 13 * palm.s + 5,
        );
        ctx.stroke();
      }
    }
  }

  function drawMarker(state) {
    const marker = state.marker;
    if (!marker) return;
    const pulse = Math.sin(state.time * 4) * 4;
    const beam = ctx.createLinearGradient(0, marker.y - 210, 0, marker.y);
    beam.addColorStop(0, 'rgba(242, 201, 76, 0)');
    beam.addColorStop(1, 'rgba(242, 201, 76, 0.4)');
    ctx.fillStyle = beam;
    ctx.fillRect(marker.x - 17, marker.y - 210, 34, 210);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 27 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(242, 201, 76, 0.3)';
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 27 + pulse, 0, Math.PI * 2);
    ctx.fill();
    if (state.mission.briefcase) {
      const b = state.mission.briefcase;
      ctx.fillStyle = '#6d4520';
      ctx.fillRect(b.x - 9, b.y - 6, 18, 12);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(b.x - 2, b.y - 6, 4, 12);
    }
  }

  function drawGrade() {
    const warm = ctx.createLinearGradient(0, 0, view.w, view.h);
    warm.addColorStop(0, 'rgba(255, 138, 42, 0.10)');
    warm.addColorStop(0.55, 'rgba(255, 110, 60, 0.03)');
    warm.addColorStop(1, 'rgba(66, 24, 88, 0.10)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, view.w, view.h);
    const glow = ctx.createRadialGradient(view.w * 0.1, -60, 40, view.w * 0.1, -60, 460);
    glow.addColorStop(0, 'rgba(255, 186, 92, 0.20)');
    glow.addColorStop(1, 'rgba(255, 186, 92, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, view.w, view.h);
    const vignette = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.42, view.w / 2, view.h / 2, view.h * 0.95);
    vignette.addColorStop(0, 'rgba(30, 12, 0, 0)');
    vignette.addColorStop(1, 'rgba(30, 12, 0, 0.24)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  /** Paint one frame: the city, its people, then the HUD or the screen's panel. */
  function draw(state, screen) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, view.w, view.h);
    const cam = state.camera;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    drawGround(state, cam);
    drawBuildings(state, cam);
    drawPalms(state, cam);
    drawMarker(state);
    for (const car of state.cars) drawVehicle(ctx, car, state.time);
    for (const ped of state.peds) drawPedestrian(ctx, ped);
    drawPlayer(ctx, state);
    drawCombat(ctx, state);
    ctx.restore();
    drawGrade();
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHUD(ctx, state, view);
    if (screen === SCREEN_TITLE) drawTitleScreen(ctx, state, view);
    else if (screen === SCREEN_PAUSED) drawPausedScreen(ctx, state, view);
    else if (screen === SCREEN_OVER) drawOverScreen(ctx, state, view);
  }

  return { draw, view };
}
