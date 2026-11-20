// The story of Verano Heat, as data and a small stage machine. Diego Marín
// owes Rosa Delgado four thousand dollars for his late brother's boat; five
// jobs across Puerto Verano pay it off, and Vito Azar's Azules crew would
// rather he didn't. Each mission is a list of stages — go somewhere, steal
// something, stop someone, escape — and this module walks the player through
// them, feeding the HUD its objective, its marker and its dialogue.

import { PLACES } from './config.js';
import { ACTION_CONFIRM } from './input.js';
import { addCrime, setWantedLevel } from './police.js';
import { driveLaneCar, placeOnRoad } from './traffic.js';
import { createVehicle } from './vehicles.js';
import { dist2 } from './world.js';

export const GIVERS = {
  rosa: { name: 'Rosa Delgado', color: '#7fc8bc' },
  tito: { name: 'Tito Fuentes', color: '#ecc987' },
};

export const MISSIONS = [
  {
    name: 'Welcome Home',
    giver: 'rosa',
    giverPlace: 'rosaDock',
    reward: 600,
    intro: [
      { who: 'rosa', text: 'Diego Marín. Six years gone, and you walk back owing me four grand for your brother\'s boat.' },
      { who: 'diego', text: 'I\'ll work it off, Rosa. You know I\'m good for it.' },
      { who: 'rosa', text: 'Then work. A crate of rum landed at the Mercado by mistake. Fetch it to my warehouse — quickly.' },
    ],
    stages: [
      { type: 'timed', place: 'mercadoPlaza', radius: 85, timer: 110, objective: 'Pick up the crate at Mercado plaza', dialogue: [{ who: 'rosa', text: 'The crate sits by the blue stalls. The clock is running, Diego.' }] },
      { type: 'timed', place: 'rosaWarehouse', radius: 95, timer: 110, objective: 'Deliver the crate to Almacén Rosa', dialogue: [{ who: 'diego', text: 'One crate of rum, slightly illegal. On my way.' }] },
    ],
    outro: [{ who: 'rosa', text: 'Good boy. Tito at the garage has work too — real money, real trouble.' }],
  },
  {
    name: 'Hot Property',
    giver: 'tito',
    giverPlace: 'titoGarage',
    reward: 900,
    intro: [
      { who: 'tito', text: 'Diego! Rosa says you drive like the devil owes you money.' },
      { who: 'tito', text: 'A coral-red Tormenta coupe is sitting in the downtown parking. Bring her to me — and if the law notices, lose them first.' },
    ],
    stages: [
      { type: 'steal', place: 'downtownParking', objective: 'Steal the coral-red Tormenta from downtown parking' },
      { type: 'loseHeat', objective: 'Lose the heat' },
      { type: 'deliverCar', place: 'titoGarage', radius: 100, objective: 'Deliver the Tormenta to Tito\'s garage' },
    ],
    outro: [{ who: 'tito', text: 'Beautiful. Word is Vito\'s Azules move product tonight — Rosa will want to hear that.' }],
  },
  {
    name: 'Serpent Business',
    giver: 'rosa',
    giverPlace: 'rosaDock',
    reward: 1200,
    intro: [
      { who: 'rosa', text: 'Los Azules are running a van from the Mercado to Club Brisa. Vito\'s whole take is in the back.' },
      { who: 'rosa', text: 'Stop the van, take the briefcase, bring it to my warehouse. Don\'t be gentle.' },
    ],
    stages: [
      { type: 'chase', objective: 'Stop the Azules van before it reaches Club Brisa' },
      { type: 'collect', objective: 'Take the briefcase from the van', dialogue: [{ who: 'diego', text: 'Sorry, friend. Rosa sends her regards.' }] },
      { type: 'goto', place: 'rosaWarehouse', radius: 95, objective: 'Bring the briefcase to Almacén Rosa' },
    ],
    outro: [{ who: 'rosa', text: 'Vito will feel that in his pocket. Careful now — he is the kind to answer.' }],
  },
  {
    name: 'Harbour Heat',
    giver: 'rosa',
    giverPlace: 'rosaDock',
    reward: 1500,
    intro: [
      { who: 'rosa', text: 'One crate waits at my dock, Diego. No questions. The harbour patrol has been paid to look away — probably.' },
      { who: 'diego', text: 'Probably?' },
      { who: 'rosa', text: 'If it goes wrong, run. Casa Verano. Lose them, then come home.' },
    ],
    stages: [
      { type: 'goto', x: 2838, y: 372, radius: 58, onFoot: true, objective: 'Pick up the crate at the dock' },
      { type: 'escape', place: 'safehouse', radius: 100, heat: 4, objective: 'Lose the heat and reach Casa Verano', dialogue: [{ who: 'rosa', text: 'The patrol is coming in hot — shake them, Diego!' }] },
    ],
    outro: [{ who: 'rosa', text: 'You smell of salt and trouble. One more job — the big one — and your debt is ash.' }],
  },
  {
    name: 'Last Light',
    giver: 'rosa',
    giverPlace: 'rosaWarehouse',
    reward: 3000,
    intro: [
      { who: 'rosa', text: 'Vito is leaving Puerto Verano tonight, and his car — loaded with everything he owns — is expected at Club Brisa.' },
      { who: 'rosa', text: 'Drive it there yourself, under his own colours, and his whole crew watches the joke land. The Azules have called the police on it. Go.' },
    ],
    stages: [
      { type: 'timed', place: 'beachClub', radius: 100, timer: 115, heat: 3, objective: 'Reach Club Brisa before Vito\'s boat leaves' },
    ],
    outro: [{ who: 'rosa', text: 'Debt\'s paid, Diego. Puerto Verano is yours now — try not to burn it down.' }],
  },
];

export function createMissionState() {
  return {
    nextIndex: 0,
    active: false,
    index: -1,
    stage: 0,
    stageStarted: false,
    timer: -1,
    targetCar: null,
    briefcase: null,
  };
}

export function setDialogue(state, lines) {
  state.dialogue = lines && lines.length > 0 ? { lines, index: 0, timer: 0 } : null;
}

function stagePoint(stage) {
  if (stage.place) return PLACES[stage.place];
  return { x: stage.x, y: stage.y };
}

function beginMission(state, index) {
  const m = state.mission;
  m.active = true;
  m.index = index;
  m.stage = 0;
  m.stageStarted = false;
  m.targetCar = null;
  m.briefcase = null;
  setDialogue(state, MISSIONS[index].intro);
  state.audio?.chime();
}

function startStage(state) {
  const m = state.mission;
  const def = MISSIONS[m.index];
  const stage = def.stages[m.stage];
  m.stageStarted = true;
  m.timer = stage.timer ?? -1;
  if (stage.heat) setWantedLevel(state, stage.heat);
  if (stage.dialogue) setDialogue(state, stage.dialogue);
  if (stage.type === 'steal') {
    const p = stagePoint(stage);
    const car = createVehicle(state.rng, p.x, p.y, 0.35, 'parked');
    car.color = '#e2483d';
    car.cruise = 0;
    m.targetCar = car;
    state.cars.push(car);
  }
  if (stage.type === 'chase') {
    const van = createVehicle(state.rng, 480, 1760, 0, 'mission');
    van.color = '#3f6fb5';
    van.hp = 130;
    van.maxHp = 130;
    van.cruise = 198;
    van.aiMode = 'goal';
    van.goalX = PLACES.beachClub.x;
    van.goalY = PLACES.beachClub.y;
    van.noEnter = true;
    placeOnRoad(van, 480, 1760, 1, 0);
    m.targetCar = van;
    state.cars.push(van);
  }
}

function cleanupStageCars(state) {
  const m = state.mission;
  if (m.targetCar && state.player.car !== m.targetCar) {
    state.cars = state.cars.filter((car) => car !== m.targetCar);
  }
  m.targetCar = null;
  m.briefcase = null;
}

function failMission(state, reason) {
  const m = state.mission;
  cleanupStageCars(state);
  m.active = false;
  m.stageStarted = false;
  state.banner = { title: 'MISSION FAILED', text: reason, timer: 3.6, color: '#e5534b' };
  state.audio?.fail();
}

function completeMission(state) {
  const m = state.mission;
  const def = MISSIONS[m.index];
  cleanupStageCars(state);
  m.active = false;
  m.stageStarted = false;
  m.nextIndex = m.index + 1;
  state.player.cash += def.reward;
  state.banner = { title: 'MISSION COMPLETE', text: `${def.name} — $${def.reward.toLocaleString()}`, timer: 4, color: '#f2c94c' };
  setDialogue(state, def.outro);
  state.audio?.cash();
  state.audio?.missionDone();
  if (m.nextIndex >= MISSIONS.length) state.storyComplete = true;
  state.justCompleted = true;
}

function advanceStage(state) {
  const m = state.mission;
  m.stage += 1;
  m.stageStarted = false;
  if (m.stage >= MISSIONS[m.index].stages.length) completeMission(state);
}

/** For the screenshot scenes: jump the active mission to a stage, fresh. */
export function forceStage(state, missionIndex, stageIndex) {
  const m = state.mission;
  if (!m.active || m.index !== missionIndex) beginMission(state, missionIndex);
  m.stage = stageIndex;
  m.stageStarted = false;
}

export function updateMissions(state, input, actions, dt) {
  const m = state.mission;
  const player = state.player;

  // Dialogue ticks on its own clock; a click or F hurries it along.
  if (state.dialogue) {
    const clicked = input.takeClick();
    state.dialogue.timer += dt;
    if (state.dialogue.timer > 3.8 || (actions & ACTION_CONFIRM) || clicked) {
      state.dialogue.index += 1;
      state.dialogue.timer = 0;
      if (state.dialogue.index >= state.dialogue.lines.length) state.dialogue = null;
    }
  }
  if (state.banner) {
    state.banner.timer -= dt;
    if (state.banner.timer <= 0) state.banner = null;
  }

  if (state.storyComplete) {
    state.objective = 'Free roam — Puerto Verano is yours';
    state.missionName = '';
    state.marker = null;
    return;
  }

  if (!m.active) {
    const def = MISSIONS[m.nextIndex];
    const giver = PLACES[def.giverPlace];
    state.marker = { x: giver.x, y: giver.y, label: def.name };
    state.missionName = def.name;
    state.objective = `Meet ${GIVERS[def.giver].name} — ${def.name}`;
    if (!player.car && dist2(player.x, player.y, giver.x, giver.y) < 62 * 62) {
      beginMission(state, m.nextIndex);
    }
    return;
  }

  const def = MISSIONS[m.index];
  const stage = def.stages[m.stage];
  state.missionName = def.name;
  if (!m.stageStarted) startStage(state);
  state.objective = stage.objective;

  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;

  switch (stage.type) {
    case 'goto':
    case 'timed':
    case 'escape': {
      const p = stagePoint(stage);
      state.marker = { x: p.x, y: p.y, label: '' };
      if (stage.type === 'timed') {
        m.timer -= dt;
        state.objective = `${stage.objective} — ${Math.max(0, Math.ceil(m.timer))}s`;
        if (m.timer <= 0) {
          failMission(state, 'Out of time. Head back and try again.');
          return;
        }
      }
      const arrived = dist2(px, py, p.x, p.y) < stage.radius * stage.radius && (!stage.onFoot || !player.car);
      if (arrived && (stage.type !== 'escape' || state.wanted.level === 0)) advanceStage(state);
      break;
    }
    case 'steal': {
      const car = m.targetCar;
      state.marker = { x: car.x, y: car.y, label: 'Tormenta' };
      if (player.car === car) {
        addCrime(state, 30);
        advanceStage(state);
      }
      break;
    }
    case 'loseHeat': {
      state.marker = null;
      if (state.wanted.level === 0) advanceStage(state);
      break;
    }
    case 'deliverCar': {
      const p = stagePoint(stage);
      state.marker = { x: p.x, y: p.y, label: '' };
      if (player.car === m.targetCar && dist2(px, py, p.x, p.y) < stage.radius * stage.radius) {
        // Diego steps out; the Tormenta is Tito's now.
        player.car = null;
        m.targetCar.kind = 'parked';
        player.x = p.x + 30;
        player.y = p.y + 24;
        advanceStage(state);
      }
      break;
    }
    case 'chase': {
      const van = m.targetCar;
      state.marker = { x: van.x, y: van.y, label: 'Azules van' };
      driveLaneCar(state, van, dt);
      if (van.dead || van.hp <= 0) {
        m.briefcase = { x: van.x, y: van.y };
        advanceStage(state);
      } else if (dist2(van.x, van.y, PLACES.beachClub.x, PLACES.beachClub.y) < 110 * 110) {
        failMission(state, 'The van reached Club Brisa. Rosa is not pleased.');
      }
      break;
    }
    case 'collect': {
      const b = m.briefcase;
      state.marker = { x: b.x, y: b.y, label: 'Briefcase' };
      if (!player.car && dist2(player.x, player.y, b.x, b.y) < 26 * 26) {
        m.briefcase = null;
        state.audio?.chime();
        advanceStage(state);
      }
      break;
    }
    default:
      break;
  }
}
