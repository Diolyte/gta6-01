[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Diolyte/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Diolyte/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Verano Heat

Verano Heat is a top-down open-world crime game that runs entirely in the browser, built as an entry for the make.fun "Make GTA 6" bounty. There is no build step and nothing to install: the whole game is a folder of static files under `game/`, drawn and sounded in code, ready to serve as-is.

## The story

Diego Marín comes home to the port city of Puerto Verano after six years away, and he comes home in debt — $4,000 owed to fixer Rosa Delgado for his late brother's boat. Rosa doesn't take IOUs. She takes work.

Across five chained story missions, Diego runs errands that get dirtier as the money gets better: a timed rum run from Mercado plaza to Rosa's warehouse, a coral-red Tormenta coupe lifted from downtown parking for Tito Fuentes at his garage, an Azules crew van stopped on the road to Club Brisa so its briefcase can change owners, a dock pickup that turns into a four-star escape to the Casa Verano safehouse, and one last drive under the colours of Vito Azar — the Azules boss who would rather Diego never finished paying. Clear the final job and the debt is ash; Puerto Verano is yours to roam.

Missions pay out in cash, unlock one after another, and can be retried if they go wrong. Between jobs the city stays open — steal a car, make some noise, and see how long you last.

## The city

Puerto Verano is one continuous map of five districts — the Marina, Downtown, the Mercado, the Playa and Solana — tied together by a working road network with named streets and familiar landmarks: Rosa's dock office, the Almacén Rosa warehouse, Tito's garage, Mercado plaza, Club Brisa on the beach, and the Casa Verano safehouse. A minimap keeps the whole city, your objective marker and the law in view at all times.

## Features

- **One open world, two ways to move** — cross the city on foot or behind the wheel, seamlessly.
- **Any car is your car** — walk up to parked or moving traffic, take it, and drive; every vehicle on the road is stealable.
- **Living traffic** — AI drivers follow their lanes, queue, brake and react around you.
- **Pedestrians** — the streets are populated, and people go about their day until your day interrupts it.
- **A wanted system with teeth** — crimes raise your heat from one to five stars; police give chase, a bust meter fills while they have you pinned, and the only ways out are to run, hide, or get caught.
- **Mouse-aim pistol combat** — point with the mouse, click to shoot, reload before the worst moment.
- **A full HUD** — minimap with objective and police blips, wanted stars, health, cash and the current objective, plus a dialogue system that carries the story.
- **Synthesised sound** — every effect is generated live with WebAudio; nothing is a file. Press M to mute.
- **Progress that sticks** — your story position and cash are kept in `localStorage`, so you can close the tab and Continue later.

## Controls

| Input | Action |
| --- | --- |
| WASD or arrow keys | Move on foot / drive |
| F | Enter or exit a car |
| Mouse | Aim |
| Click | Shoot |
| R | Reload |
| Shift | Run |
| Space | Handbrake |
| P | Pause |
| M | Mute |

## Play it locally

With Node installed, from the repository root:

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. `serve.ts` is a small standard-library static server for the `game/` folder and accepts `--port <n>` if 8080 is taken. If you'd rather use your own tooling, serve the `game/` directory with any static file server and open its `index.html` — the game needs nothing else.

## Originality

Everything in Verano Heat was made for this game: the city of Puerto Verano and its districts, Diego, Rosa, Tito and Vito, the Azules, the mission scripts and dialogue, and the look of the place. The art is drawn in code on a canvas and the audio is synthesised with WebAudio — the entry ships with no external assets at all: no images, no sound files, no fonts, nothing borrowed.
