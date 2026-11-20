// The save game: cash, story progress and Diego's health, kept in the
// browser's local storage. Saving happens when a mission is completed; the
// title screen offers Continue when a save exists.

import { SAVE_KEY } from './config.js';

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.player.cash,
      armour: state.player.armour,
      nextMission: state.mission.nextIndex,
      storyComplete: state.storyComplete,
    }));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
