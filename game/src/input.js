// Keyboard and mouse input. Held keys live in a set the systems read every step;
// one-shot presses (pause, interact, confirm) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_RELOAD = 8;
export const ACTION_MUTE = 16;

const ACTION_KEYS = new Map([
  ['Space', ACTION_CONFIRM],
  ['Enter', ACTION_CONFIRM],
  ['KeyP', ACTION_PAUSE],
  ['Escape', ACTION_PAUSE],
  ['KeyF', ACTION_INTERACT],
  ['KeyE', ACTION_INTERACT],
  ['KeyR', ACTION_RELOAD],
  ['KeyM', ACTION_MUTE],
]);

const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight',
]);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    const action = ACTION_KEYS.get(event.code);
    if (action !== undefined && !event.repeat) actions |= action;
    if (action !== undefined || GAME_KEYS.has(event.code) || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  canvas.addEventListener('pointermove', trackMouse);
  canvas.addEventListener('pointerdown', (event) => {
    trackMouse(event);
    mouse.down = true;
    mouse.clicked = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** True while a key (by KeyboardEvent.code) is held down. */
    down: (code) => held.has(code),
    /** Movement axes from the held keys: x is -1..1 (left..right), y is -1..1 (up..down). */
    axes() {
      const x = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      const y = (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    running: () => held.has('ShiftLeft') || held.has('ShiftRight'),
    braking: () => held.has('Space'),
    mouse,
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** True once per physical click, then clears. */
    takeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was;
    },
  };
}
