# Jodi — games for two

Do phone, ek game. Ek banda room banata hai, **6-letter code** partner ko bhejta hai,
dono judte hain aur saath me khelte hain — long distance ke liye banaya gaya.
Koi account nahi, koi password nahi, koi tracker nahi.

## Privacy first

Yeh app jaan-boojh ke "data nahi maangta" design pe bani hai:

- **Koi account nahi** — naam + room code bas. Na email, na phone number, na DOB.
- **Koi third-party request nahi** — koi Google Fonts, koi analytics, koi ad SDK, koi CDN.
  Fonts system se aate hain (isliye app offline-ish aur fast hai).
- **Rooms sirf memory me** — server restart hote hi rooms, chat, strokes, sab mit jaate hain.
  Koi database, koi log file, koi backup nahi.
- **Tumhara data tumhare phone pe** — naam, kitaab ke panno, notes, scores `localStorage` me.
  "Sab kuch mita do" dabao → sab chala jaata hai.
- **Server headers** — `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Permissions-Policy` (sirf camera/mic), aur ek tight CSP
  (`script-src 'self'`, `frame-src` sirf YouTube).
- **Rate limit** — per IP 120 POST/min aur 300 GET/min (Cloud Run ke `x-forwarded-for` se),
  taaki koi room code brute-force na kar sake.
- **6-letter code** — 32^6 ≈ 1 arab combinations, aur code galat ho to room nahi khulta.
- **Saath Dekho** me YouTube **opt-in** hai: button dabane pe confirm aata hai ki Google ko
  IP jaayega; embed `youtube-nocookie.com` se load hota hai; "sirf timer" me kuch bahar nahi jaata.
- **Call peer-to-peer** — WebRTC, sirf signaling server se guzarta hai; awaaz/video record nahi hote.
- App me hi **Privacy screen** hai (`Tum → Privacy`) jisme yeh sab saaf likha hai.

## Latency (Kulfi jaisi der nahi)

Pehle client har 0.8s pe poochta tha — usme "der" feel hoti thi. Ab:

- **Server push (SSE)** — `/api/events` ek stream hai; server room badalte hi ~0.35s me
  naya state bhej deta hai. Doosre phone pe chaal/answer lagbhag turant dikhta hai.
- **Fallback** — agar SSE block ho (proxy), client 6s ke andar polling (0.8s) pe wapas aa jaata hai.
- **Drawing** — painter 180ms me stroke batch bhejta hai, partner 350ms pe kheenchta hai;
  canvas lagbhag live lagta hai.
- **Optimistic UI** — apni chaal/jawab apne phone pe turant dikhta hai, server ka wait nahi.
- Haalat badli ho tabhi page dobara banta hai (signature compare), isliye typing/typing-drawing
  beech me nahi tootti.

## Sabse alag cheez: Hamari Kitaab

Khelte-khelte **tumhari kahani khud likhti jaati hai** — har round ke baad sawaal, dono ke jawab,
kaun jeeta. 📖 se kitaab, "Kitaab bhejo" se text share/copy, saath me **aaj ka ritual**
(sawaal + game + note) aur **streak**.

## Games (17)

- **Daily** — Daily Question
- **Conversation** — This or That, Never Have I Ever, Who's More Likely, Truth or Dare
- **Board** — Connect Four (four in a row), Tic-Tac-Toe
- **Quiz** — Trivia, Spell Karo
- **Sport** — Penalty Shootout, Cricket 2 Overs, Basketball Free Throws
- **Arcade** — Banao Aur Batao (live drawing), Rock Paper Scissors, Duck Hunt, Reaction Duel, Tap Duel

## Chat + video call

- **Chat** — 💬, room ke andar, memory me.
- **Call** — 📞 WebRTC video + audio, 🎤 mute / 📷 camera toggle, camera na mile to audio-only.
- Sirf `stun` — bahut strict network pe call judna fail ho sakta hai (TURN server chahiye hoga).

## Saath Dekho

🎬: YouTube link (synced start, `youtube-nocookie`) ya "sirf timer" (Netflix/Prime/koi bhi app —
dono apni app me play karte ho, Jodi saath-saath timer dikhata hai). Screen sharing iPhone
browser me possible nahi (`getDisplayMedia` iOS Safari me nahi hai).

## Files

- `index.html` — dhaancha, meta tags (koi external font/CDN nahi)
- `app.js` — client: rooms, 17 games, canvas, chat, call, sync, kitaab, privacy screen
- `server.js` — Node server (zero dependency): rooms, rules, SSE, headers, rate limit, signaling
- `content.json` — sawaal, options, trivia, cards, words
- `local.js` — **auto-generated** (`node build-local.js`): server ka logic browser ke andar, sirf offline Demo ke liye
- `build-local.js` — local.js banane wala tool (server.js/content.json badalne ke baad chalao)
- `package.json` — `npm start`
- `sw.js` — service worker: app shell cache + **naya deploy turant activate**
- `styles.css` — cream-rose-pista designer look
- `Dockerfile` — `node:22-slim`, `node server.js`, `$PORT` (8080)

## API

- `POST /api/create` `{name}` → `{code, pid, room}`
- `POST /api/join` `{code, name}` → `{code, pid, room}`
- `GET  /api/state?code=&pid=` → `{room}` (fallback)
- `GET  /api/events?code=&pid=` → SSE stream (primary)
- `GET  /api/strokes?code=&pid=&since=` → `{count, segments}`
- `POST /api/start` `{code, pid, game}` · `POST /api/answer` · `POST /api/move` · `POST /api/next`
- `POST /api/paint` `{segments|clear}` · `POST /api/guess` `{text}`
- `POST /api/say` `{text}` · `POST /api/call` `{action}` · `POST /api/signal` `{kind,data}`
- `POST /api/watch` `{action, videoId}` · `POST /api/lobby` / `POST /api/leave`

## Chalane ka tareeka

```
npm start        # ya: node server.js   → http://localhost:8080
```

Do phone se khelne ke liye server zaroori hai (Node 18+). Agar `index.html` seedha file se ya
static hosting (GitHub Pages) pe khola, to **Demo kholo** bina server ke chalta hai (Jodi Bot ke
saath, 17 games) — par room/code/chat/call ke liye server chahiye.

## Test karne ka tareeka

Ek phone pe bhi test ho sakta hai: room banao, code note karo, wahi preview link Safari me
kholo aur code se judo — doosra banda ban jaoge. Do tab sabse aasan hain.

## Admin / demo mode

Kisi ko invite kiye bina sab kuch dekhna ho: home screen pe **"Demo kholo"** dabao.
Ek room khulta hai jisme doosra player **Jodi Bot** hai — saare 17 games turant khelne layak,
bot khud jawab/chaal karta hai (1–2 second ke andar), tum Next dabate ho.

- Demo room me bot ka koi data nahi jaata, koi invite nahi, koi code share karne ki zaroorat nahi.
- Bot ke saath drawing bhi chalti hai: bot painter ho to doodle banata hai aur 7s me round
  khatam, bot guesser ho to do-guess me word pakad leta hai.
- Demo room bhi memory me hi hai — 3 ghante me khud mit jaata hai.
- Asli partner ko bulana ho to wahi room code share kar do (bot ki jagah nahi milegi — naya room banao).

## 3D-ish scenes (asli khel, text nahi)

`scene3d.js` ek chhota perspective renderer hai — **Canvas 2D + asli projection**, koi WebGL
ya library nahi. Har point (x, y, depth) metres me hota hai aur screen pe project hota hai,
isliye goal, pitch aur hoop me asli depth dikhti hai.

- **Penalty** — goal post + net + keeper (dive karta hai) + ball. Shooter **goal pe tap karta hai**
  (left/centre/right), keeper dive zone chunta hai; reveal pe ball udta hai aur keeper
  usi taraf jhapta hai — GOAL ya SAVE, dono phone pe wahi scene.
- **Cricket** — pitch, dono stumps, batter aur bowler; ball, run ya OUT ke hisaab se
  alag trajectory (chauka hawa me, OUT pe stumps pe).
- **Basketball** — backboard, rim, net aur ball ka parabola; meter ki position hi shot ka
  offset ban jaati hai, isliye jo tumne khela wahi dikhta hai.

Scene har frame (requestAnimationFrame) par room ke asli state se banta hai — koi video,
koi image asset nahi (isliye app halka aur privacy-safe rehta hai).

## 3D look — saare 17 games

**Penalty ab asli WebGL hai** (`game3d.js` + repo me vendored `three.module.min.js`, r160):
asli meshes (goal posts cylinders, net lines, keeper with shirt/shorts/skin/hair, ball sphere),
hemisphere + directional light with **shadows**, fog, a camera that pushes in during the shot,
and glowing aim rings. Agar WebGL/three kisi phone pe na chale, wahi scene Canvas 2D
(`scene3d.js`) pe gir jaata hai — kaali screen nahi.

`scene3d.js` (Canvas 2D + asli projection) baaki sab chalata hai:

- **Penalty** — goal post + net + keeper (dive) + ball; goal pe tap karke shoot, GOAL/SAVE.
- **Cricket** — pitch, dono stumps, batter, bowler; chauka hawa me, OUT pe stumps.
- **Basketball** — backboard, rim, net, ball ka parabola (meter hi shot ka offset).
- **Connect Four** — asli 3D board (7×6) perspective me: cell pe tap karo, disc girta hai;
  neeche chhota grid fallback bhi hai.
- **Tic-Tac-Toe** — wahi 3D board, X/O 3×3.
- **Baaki sab** — table wala 3D stage (mombatti glow, do card, sparkles) ya arena stage
  (ring, pylons, spotlights) har game ke peeche chalta rehta hai:
  Daily, This or That, Never Have I, Who's More Likely, Truth or Dare, Trivia, Spell,
  RPS, Tap Duel, Reaction Duel, Duck Hunt.
- **Banao Aur Batao** — drawing canvas ko wooden easel frame mil gaya.

Scene har frame (requestAnimationFrame) par room ke asli state se banta hai — koi video,
koi image asset nahi.

## Skills (vendor kiye hue)

Teen skill packs vendor kiye hue hain (sirf agent guidance — Dockerfile/server/SW inhe serve nahi karte):

- `skills/` — **threejs-game-skills** (MIT, Majid Manzarpour): director + gameplay/graphics/UI/QA/debug + asset generators
- `skills/forge/` — **ForgeSkills** (Apache-2.0, sekaikx): orchestrator, art-direction, camera, vfx-impact, visual-iteration, performance, verification, procedural-modeling, texture, audio-wire
- `skills/game-dev-skill/` — **game-dev-skill** (MIT, aresbit): pipeline + quality-review + PRD seed template

Routing, order aur project ke hard rules [AGENTS.md](AGENTS.md) me hain.

Agla step: three.js ko repo me vendor karke inhi scenes ko uspe migrate karna (abhi
`scene3d.js` wala Canvas 2D renderer chal raha hai).

## Update fauran kaise aata hai

Teen layer, taaki purana version kabhi chipka na rahe:

1. **Service worker (`sw.js`)** — `install` me `skipWaiting()`, `activate` me `clients.claim()`.
   Naya deploy aate hi naya SW turant control le leta hai (page ek baar khud reload hota hai).
   Fetch **network-first** hai: online ho to hamesha latest file, offline ho to cache.
   `/api/*`, SSE aur strokes kabhi cache nahi hote.
2. **Boot version** — server har start pe `BOOT` id banata hai aur `/api/version` pe deta hai.
   Client boot pe, har 90 second me aur app foreground me aate hi isse check karta hai:
   badal gaya to **turant reload** — par agar tum room me ho to reload nahi, toast aata hai
   aur room chhodte hi reload ho jaata hai (khel beech me nahi tootta).
3. **Cache headers** — `index.html` aur `sw.js` `no-cache` (browser hamesha naya maange),
   baaki files 60s. `sw.js` khud bhi `worker-src 'self'` CSP me allowed hai.

Matlab: tum GitHub pe file badlo → `Run`/Publish → jo bhi phone pe app khula hai,
woh **~90 second ke andar (ya app foreground me aate hi)** naya version le leta hai.

## Deploy

`Run`/Publish (FreeMilk) Dockerfile se build karke chalata hai. Coding: `server.js` me rooms
memory me hain, isliye har deploy pe rooms khatam — khelne se pehle deploy kar lo.
