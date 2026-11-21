# Jodi — agent notes

## Vendored skills (three packs)

This repo vendors three MIT/Apache-licensed skill packs into `skills/`; they are guidance for
agents, not shipped code (`Dockerfile`, `sw.js` and `server.js` never serve them).

**1. `skills/` (root) — threejs-game-skills** by Majid Manzarpour
(https://github.com/majidmanzarpour/threejs-game-skills, MIT).
Router: `skills/threejs-game-director/SKILL.md` → gameplay-systems (+ `game-feel.md`,
`genre-design.md`), aaa-graphics-builder (+ `technical-art.md`, `visual-scorecard.md`),
game-ui-designer (+ `ui-patterns.md`), debug-profiler, qa-release (+ `release-checks.md`),
and generators (3d / image / audio) only when asset keys exist.

**2. `skills/forge/` — ForgeSkills** by sekaikx (https://github.com/sekaikx/ForgeSkills, Apache-2.0).
Use for craft and iteration discipline: `gamedev-orchestrator`, `gamedev-art-direction`,
`gamedev-gameplay-systems`, `gamedev-camera`, `gamedev-vfx-impact`,
`gamedev-visual-iteration`, `gamedev-visual-artifacts` (+ `references/symptoms.md`),
`gamedev-performance`, `gamedev-verification`, `gamedev-game-testing`,
`gamedev-procedural-modeling`, `gamedev-texture-authoring`, `gamedev-audio-wire`.

**3. `skills/game-dev-skill/` — game-dev-skill** by aresbit
(https://github.com/aresbit/game-dev-skill, MIT).
Use `SKILL.md` + `references/pipeline-scene.md`, `quality-review-and-assets.md`,
`tooling-and-setup.md` for scope → pipeline → quality review, and
`assets/prd-seed-template.md` as the design brief template.

Order that works for this repo: art-direction + gameplay-systems (what the game is) →
procedural-modeling / visual-artifacts (how it looks) → vfx-impact + camera (feel) →
performance + verification (checks) → threejs director for renderer specifics.

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
