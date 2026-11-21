# Jodi — agent notes

## Vendored skills (three.js game pack)

This repo vendors the MIT-licensed **threejs-game-skills** pack by Majid Manzarpour into
`skills/` (upstream: https://github.com/majidmanzarpour/threejs-game-skills).
It is guidance for agents, not shipped code: `Dockerfile`, `sw.js` and `server.js` never serve it.

Router order for any "build / upgrade / finish a game" task:

1. `skills/threejs-game-director/SKILL.md` — read first; it routes to the siblings.
2. `skills/threejs-gameplay-systems/SKILL.md` + `references/game-feel.md`, `references/genre-design.md`
3. `skills/threejs-aaa-graphics-builder/SKILL.md` + `references/technical-art.md`, `references/visual-scorecard.md`
4. `skills/threejs-game-ui-designer/SKILL.md` + `references/ui-patterns.md`
5. `skills/threejs-debug-profiler/SKILL.md`
6. `skills/threejs-qa-release/SKILL.md` + `references/release-checks.md`
7. Generators only when asset keys exist: `threejs-3d-generator`, `threejs-image-generator`, `threejs-audio-generator`

## Project constraints that override skill defaults

- **No runtime third-party requests.** The CSP is `script-src 'self'`; there is no CDN, no
  Google Fonts, no analytics. If we adopt three.js it must be **vendored into this repo**
  (e.g. `three.module.js`) and added to `sw.js` shell + `Dockerfile`.
- **Zero server dependencies.** `server.js` uses Node core only (`http`, `fs`, `path`, `crypto`).
  Do not add npm packages to the runtime.
- **Target is the iOS in-app browser.** Touch first, 60fps on a phone, `playsinline`,
  pointer events; keep a Canvas 2D path working if WebGL is unavailable.
- **Privacy is a feature.** Rooms live in memory, no content logs, no accounts. Any change that
  stores or sends data must be reflected in the in-app Privacy screen (`#/privacy`) and README.
- **Do not regress the working app**: 17 games, live rooms (SSE + polling fallback), chat,
  video call, watch-along, Hamari Kitaab, demo mode with the bot, service worker updates.
- Content stays original — no scraped text, no copyrighted characters, no ripped assets.
  Emoji + CSS + procedural drawing only, or generated assets the user owns.

## Current renderer

`scene3d.js` is a hand-written **Canvas 2D perspective renderer** (metres → screen) used by the
Penalty, Cricket and Basketball scenes. It exists because the app is dependency-free and offline
cached. Adopting three.js means replacing those three scenes one at a time, behind the same
`gameView` contract, so the rest of the app keeps working.

## Verification in this environment

There is no shell, no browser and no test runner available to the agent here: `npm run build`,
Playwright screenshots, the canvas inspector and bot playtests from
`skills/threejs-qa-release` **cannot be executed** in this chat. So:

- be rigorous about syntax, imports and paths (nothing runs between tool rounds),
- keep the Docker build green via the app's publish step,
- and say plainly which checks were not run instead of implying they passed.
