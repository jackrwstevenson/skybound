# Skybound: A Lifetime Together

A browser-based 3D action RPG built with [Three.js](https://threejs.org/). Meet three hatchlings, choose and name a companion, grow up together through four life stages, and fly across a connected island of mountains, dragons, mermaids and pirates.

No build tooling is required to play: the whole game ships as one static HTML file.

## Play locally

```bash
npm start        # builds, then serves http://localhost:3000
```

Or just open `public/index.html` in a browser after `npm run build`.

> Three.js is loaded from a CDN at runtime (jsDelivr, with unpkg and cdnjs fallbacks), so the first load needs an internet connection.

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move |
| E | Interact, talk, ride or hop off |
| C | Cuddle your companion |
| Space | Dodge · take off / climb · rise when swimming |
| Shift | Sprint · flight boost |
| Q | Descend / land · dive |
| Click | Attack (aims at the cursor) |
| F | Companion ability |
| R · M · Esc | Switch weapon · map · pause |

## Recording a trailer

On the title screen choose **Record a trailer**. It plays a scripted 30-second cinematic in the real game world and saves a 1920×1080 video (MP4 or WebM, depending on the browser) with music. Keep the tab visible while it records.

## Project layout

```
src/          game source, concatenated in filename order
  shell.html  page, CSS, HUD markup and the Three.js loader
  01_util … 17_trailer.js
scripts/
  build.js    src/ -> public/index.html (+ build/game.js for tests)
  serve.js    tiny static server for `npm start`
test/         headless tests (mock Three.js + DOM, simulated clock)
public/       build output served in production
```

The `src/*.js` files are not ES modules. They are joined into one script and evaluated after Three.js loads, so top-level code must not touch `THREE` until `boot()` runs.

Edit `src/`, then run `npm run build`. `public/index.html` is committed so the site can be served without a build step, but Vercel also rebuilds it on deploy.

## Tests

```bash
npm test          # ~15 s smoke test: bundle is intact, boots, opening is playable, flight and saving work
npm run test:full # three complete scripted playthroughs (all companions), ~5 min each
```

The tests run the game logic against a stand-in for Three.js, so they catch logic and flow bugs but **not** rendering or shader problems. Check the look and performance in a real browser after any visual change.

Individual checks live in `test/` (for example `node test/trailer.js ember` and `node test/t3.js` for the ship's stairs).

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel choose **Add New → Project** and import the repo.
3. Accept the defaults. `vercel.json` already sets the build command (`npm run build`) and output directory (`public`). No framework preset or environment variables are needed.

## Saves

Progress is stored in the browser's `localStorage` under the key `skybound-lifetime-v1` and autosaves every 45 seconds and at key moments.

## License

MIT, see [LICENSE](LICENSE).
