// Verano Heat — boot and the one loop. The world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one) and the renderer paints
// what is there. This module owns the screens (title, play, paused, and the
// busted/wasted walk-back), the camera, world collision for every body, and
// the save game. Every other rule lives in its own module.
//
// ?seed=N fixes the city. ?shot=cover|chase|street|mission (with &seed=N)
// stages that scene, runs it forward briefly, and sets window.__shotReady.

import { STEP, WORLD } from './config.js';
import { createAudio } from './audio.js';
import { createWeapon, updateCombat } from './combat.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createMissionState, updateMissions } from './missions.js';
import { createPlayer, damagePlayer, updatePlayer } from './player.js';
import { updatePolice } from './police.js';
import { initPedestrians, updatePedestrians } from './pedestrians.js';
import { createRandom } from './random.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { clearSave, hasSave, loadSave, saveGame } from './save.js';
import { stageShot } from './shots.js';
import { initTraffic, resolveCarCollisions, updateTraffic } from './traffic.js';
import { buildWorld, collideCircle } from './world.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

function createState() {
  const rng = createRandom(seed);
  const state = {
    rng,
    world: buildWorld(rng),
    time: 0,
    screen: SCREEN_TITLE,
    player: createPlayer(2520, 508),
    cars: [],
    peds: [],
    bullets: [],
    particles: [],
    weapon: createWeapon(),
    wanted: { points: 0, level: 0, seenTimer: 99, bustTimer: 0, spawnTimer: 0, justRose: false },
    mission: createMissionState(),
    dialogue: null,
    banner: null,
    marker: null,
    objective: '',
    missionName: '',
    camera: { x: 0, y: 0 },
    view: renderer.view,
    mouseWorld: { x: 0, y: 0 },
    audio,
    input,
    lastShot: null,
    sirenLevel: 0,
    busted: false,
    wasted: false,
    overKind: null,
    overFine: 0,
    storyComplete: false,
    justCompleted: false,
    hasSave: hasSave(),
    shotDrive: false,
  };
  initTraffic(state);
  initPedestrians(state);
  state.camera.x = state.player.x - renderer.view.w / 2;
  state.camera.y = state.player.y - renderer.view.h / 2;
  return state;
}

const state = createState();

// A small debug handle for the maker's own play-tests (the capture script
// reads it to prove the car, the gun and the law all work). It changes no rule.
window.__verano = state;

function announce(message) {
  status.textContent = message;
}

function startRun(continueGame) {
  if (continueGame) {
    const data = loadSave();
    if (data) {
      state.player.cash = data.cash ?? state.player.cash;
      state.player.armour = data.armour ?? 0;
      state.mission.nextIndex = Math.min(data.nextMission ?? 0, 5);
      state.storyComplete = data.storyComplete ?? false;
      if (state.mission.nextIndex >= 5) state.storyComplete = true;
    }
  } else {
    clearSave();
    state.hasSave = false;
  }
  state.screen = SCREEN_PLAY;
  announce('Playing. Follow the gold marker to your first job.');
}

function respawn() {
  const player = state.player;
  if (player.car) {
    player.car.kind = 'parked';
    player.car = null;
  }
  player.x = 2520;
  player.y = 508;
  player.health = 100;
  player.invulnerable = 1.2;
  state.wanted.points = 0;
  state.wanted.level = 0;
  state.wanted.bustTimer = 0;
  if (state.mission.active) {
    state.mission.active = false;
    state.mission.stageStarted = false;
    state.mission.briefcase = null;
  }
  state.busted = false;
  state.wasted = false;
  state.screen = SCREEN_PLAY;
  announce('Back on the street outside Casa Verano.');
}

function endRun(kind) {
  const fine = kind === 'busted'
    ? Math.min(state.player.cash, 120 + state.wanted.level * 45)
    : Math.min(state.player.cash, 180);
  state.player.cash -= fine;
  state.overFine = fine;
  state.overKind = kind;
  state.screen = SCREEN_OVER;
  announce(kind === 'busted' ? 'Busted. The police take their fine.' : 'Wasted. The hospital takes its fee.');
}

/** One fixed step of the living city; the player only acts on the play screen. */
function step(dt, actions, activeInput) {
  state.time += STEP;
  state.mouseWorld.x = state.camera.x + activeInput.mouse.x;
  state.mouseWorld.y = state.camera.y + activeInput.mouse.y;

  if (state.screen === SCREEN_PLAY) {
    updateMissions(state, activeInput, actions, dt);
    updatePlayer(state, activeInput, actions, dt);
  }
  updateTraffic(state, dt);
  updatePolice(state, dt);
  updatePedestrians(state, dt);
  if (state.screen === SCREEN_PLAY) updateCombat(state, activeInput, actions, dt);
  else updateCombat(state, { mouse: { down: false }, takeClick: () => false }, 0, dt);

  // The world pushes back: buildings, stalls and the sea stop every body.
  for (const car of state.cars) {
    const before = Math.abs(car.speed);
    if (collideCircle(state.world, car, car.radius) && before > 55) {
      car.speed *= 0.42;
      car.hp -= before * 0.03;
      if (car.hp <= 0) car.dead = true;
      if (state.player.car === car) {
        state.audio?.crash(before * 0.05);
        if (before > 150) {
          damagePlayer(state, (before - 140) * 0.06);
          state.player.invulnerable = Math.max(state.player.invulnerable, 0.5);
        }
      }
    }
  }
  if (!state.player.car) collideCircle(state.world, state.player, 9);
  for (const ped of state.peds) {
    if (ped.state !== 'down') collideCircle(state.world, ped, 8);
  }
  const impact = resolveCarCollisions(state);
  if (impact > 11 && state.player.car) {
    damagePlayer(state, (impact - 9) * 0.55);
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.5);
  }

  // Home heals: Casa Verano's doorstep patches Diego up.
  const player = state.player;
  if (!player.car && player.health < 100) {
    const dx = player.x - 2520;
    const dy = player.y - 508;
    if (dx * dx + dy * dy < 48 * 48) player.health = Math.min(100, player.health + 14 * dt);
  }

  if (state.justCompleted) {
    state.justCompleted = false;
    saveGame(state);
    state.hasSave = true;
  }
  if (state.screen === SCREEN_PLAY && state.busted) endRun('busted');
  else if (state.screen === SCREEN_PLAY && state.wasted) endRun('wasted');

  // The camera leans toward wherever Diego is, and never leaves the city.
  const focus = state.player.car ?? state.player;
  const targetX = focus.x - state.view.w / 2;
  const targetY = focus.y - state.view.h / 2;
  const ease = state.screen === SCREEN_TITLE ? 0 : 1 - Math.exp(-5.5 * dt);
  state.camera.x += (targetX - state.camera.x) * ease;
  state.camera.y += (targetY - state.camera.y) * ease;
  if (state.screen === SCREEN_TITLE) {
    state.camera.x = 1080 + Math.sin(state.time * 0.05) * 880;
    state.camera.y = 820 + Math.cos(state.time * 0.037) * 620;
  }
  state.camera.x = Math.max(0, Math.min(WORLD.width - state.view.w, state.camera.x));
  state.camera.y = Math.max(0, Math.min(WORLD.height - state.view.h, state.camera.y));
}

function runShot(name) {
  state.screen = SCREEN_PLAY;
  stageShot(name, state);
  const shotInput = {
    axes: () => ({ x: 0, y: state.shotDrive ? -1 : 0 }),
    running: () => false,
    braking: () => false,
    mouse: { x: renderer.view.w / 2 + 220, y: renderer.view.h / 2 - 40, down: false },
    down: () => false,
    takeActions: () => 0,
    takeClick: () => false,
  };
  state.input = shotInput;
  const steps = name === 'cover' || name === 'chase' ? 115 : 45;
  for (let i = 0; i < steps; i += 1) step(STEP, 0, shotInput);
  let painted = 0;
  function paint() {
    renderer.draw(state, SCREEN_PLAY);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  let wasN = false;

  window.addEventListener('keydown', () => audio.unlock(), { once: false });
  window.addEventListener('pointerdown', () => audio.unlock(), { once: false });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.toggleMute();

    if (state.screen === SCREEN_TITLE) {
      const nDown = input.down('KeyN');
      if (nDown && !wasN) startRun(false);
      else if (actions & ACTION_CONFIRM) startRun(state.hasSave);
      wasN = nDown;
    } else if (state.screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) respawn();
    } else if (state.screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        state.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      state.screen = SCREEN_PAUSED;
      announce('Paused.');
    }

    let first = true;
    while (accumulator >= STEP) {
      step(STEP, first ? actions : 0, input);
      first = false;
      accumulator -= STEP;
      if (state.screen === SCREEN_TITLE || state.screen === SCREEN_OVER) break;
    }
    if (state.screen === SCREEN_PAUSED || state.screen === SCREEN_OVER) accumulator = 0;

    const engineSpeed = state.player.car ? state.player.car.speed : 0;
    audio.update(1 / 60, engineSpeed, state.screen === SCREEN_PLAY ? state.sirenLevel : 0);
    renderer.draw(state, state.screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.screen === SCREEN_PLAY) {
      state.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Verano Heat. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
