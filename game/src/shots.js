// The screenshot scenes behind ?shot=cover|chase|street|mission. Each one
// arranges a real moment of the game — Diego driving downtown, a five-star
// chase, a busy beach-strip street, an arrival mid-mission — and then the
// main loop runs the ordinary simulation forward for a second or two, so the
// frame is the game as it truly plays, never a mock-up.

import { PLACES } from './config.js';
import { forceStage } from './missions.js';
import { setWantedLevel, spawnPolice } from './police.js';
import { createVehicle } from './vehicles.js';

function putPlayerInCar(state, x, y, angle, speed, color) {
  const car = createVehicle(state.rng, x, y, angle, 'player');
  car.speed = speed;
  if (color) car.color = color;
  state.cars.push(car);
  state.player.car = car;
  state.player.x = x;
  state.player.y = y;
  state.player.angle = angle;
  state.camera.x = Math.max(0, x - state.view.w / 2);
  state.camera.y = Math.max(0, y - state.view.h / 2);
  return car;
}

/** Cover: mid-morning traffic downtown, Diego at the wheel, the first job waiting. */
function stageCover(state) {
  putPlayerInCar(state, 1330, 1277, 0, 205, '#c94f42');
  state.shotDrive = true;
}

/** Chase: Harbour Heat has gone wrong — five stars over the Avenida Central. */
function stageChase(state) {
  putPlayerInCar(state, 1830, 1277, 0, 248, '#3f7fbf');
  forceStage(state, 3, 0);
  setWantedLevel(state, 5);
  spawnPolice(state, 1690, 1243);
  spawnPolice(state, 1620, 1294);
  spawnPolice(state, 1985, 1243);
  state.shotDrive = true;
}

/** Street: on foot on the Playa boardwalk, the city walking past. */
function stageStreet(state) {
  const p = state.player;
  p.x = 2872;
  p.y = 1500;
  p.angle = Math.PI;
  state.camera.x = Math.max(0, p.x - state.view.w / 2);
  state.camera.y = Math.max(0, p.y - state.view.h / 2);
  for (let i = 0; i < 9 && i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    ped.x = p.x + state.rng.range(-190, 150);
    ped.y = p.y + state.rng.range(-170, 190);
    ped.state = 'walk';
    const t = { x: ped.x + state.rng.range(-60, 60), y: ped.y + state.rng.range(-160, 160) };
    ped.targetX = t.x;
    ped.targetY = t.y;
  }
}

/** Mission: the rum run, seconds from the warehouse door, the clock running. */
function stageMission(state) {
  putPlayerInCar(state, PLACES.rosaWarehouse.x, PLACES.rosaWarehouse.y + 118, -Math.PI / 2, 42, '#5da85f');
  forceStage(state, 0, 1);
}

export function stageShot(name, state) {
  if (name === 'chase') stageChase(state);
  else if (name === 'street') stageStreet(state);
  else if (name === 'mission') stageMission(state);
  else stageCover(state);
}
