"use strict";

/* Jodi server — rooms, rounds, answers. Koi dependency nahi, koi database nahi:
   sab kuch memory me, aur room ka code hi pairing hai.
   Raund chalata server hai, isliye ek phone ka jawab doosre pe turant pahunchta hai,
   par dono ke jawab aane tak chhupa rehta hai. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const CONTENT = JSON.parse(fs.readFileSync(path.join(ROOT, "content.json"), "utf8"));

const FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "application/javascript; charset=utf-8"],
  "/local.js": ["local.js", "application/javascript; charset=utf-8"],
  "/scene3d.js": ["scene3d.js", "application/javascript; charset=utf-8"],
  "/game3d.js": ["game3d.js", "application/javascript; charset=utf-8"],
  "/three.module.min.js": ["three.module.min.js", "application/javascript; charset=utf-8"],
  "/sw.js": ["sw.js", "application/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/content.json": ["content.json", "application/json; charset=utf-8"]
};

const rooms = new Map();
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAP_MS = 12500;
/* har deploy/restart pe naya — client isse dekh ke khud reload kar leta hai */
const BOOT = String(Date.now());

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(), payment=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.freemilk.app; frame-src https://www.youtube.com https://www.youtube-nocookie.com; media-src 'self' blob:; base-uri 'none'; form-action 'none'"
};
const DUCK_MS = 15000;
const DRAW_MS = 90000;
const C4_COLS = 7;
const C4_ROWS = 6;

/* ------------------------------------------------------------- helpers */

function newCode() {
  for (;;) {
    let code = "";
    for (let i = 0; i < 6; i += 1) code += LETTERS[crypto.randomInt(LETTERS.length)];
    if (!rooms.has(code)) return code;
  }
}

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function dayNo() {
  return Math.floor(Date.now() / 86400000);
}

function clean(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function norm(value) {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
}

/* ---------------------------------------------------------------- deck */

function buildDeck(game, room) {
  if (game === "daily") {
    return [{
      kind: "text",
      text: CONTENT.dailyQuestions[dayNo() % CONTENT.dailyQuestions.length]
    }];
  }
  if (game === "this-or-that") {
    return shuffle(CONTENT.thisOrThat).slice(0, 5).map((pair) => ({
      kind: "choice",
      text: "Kaunsa chunoge?",
      options: [pair.a, pair.b]
    }));
  }
  if (game === "never") {
    return shuffle(CONTENT.neverHave).slice(0, 5).map((line) => ({
      kind: "choice",
      text: "Never have I ever — " + line,
      options: ["I have", "Never"]
    }));
  }
  if (game === "who") {
    const names = room.players.map((p) => p.name);
    return shuffle(CONTENT.whoMore).slice(0, 5).map((line) => ({
      kind: "choice",
      text: line,
      options: [names[0] || "You", names[1] || "Partner"]
    }));
  }
  if (game === "connect4") {
    return [{ kind: "board", text: "Char me se chaar — pehle kaun?" }];
  }
  if (game === "ttt") {
    return [{ kind: "board", text: "Teen me se teen — X ya O?" }];
  }
  if (game === "quiz") {
    return shuffle(CONTENT.trivia).slice(0, 5).map((item) => {
      const options = shuffle(item.options);
      return {
        kind: "quiz",
        text: item.q,
        options: options,
        correct: options.indexOf(item.options[item.answer])
      };
    });
  }
  if (game === "rps") {
    return [0, 1, 2, 3, 4].map(() => ({
      kind: "rps",
      text: "Rock, paper, scissors — 1, 2, 3!",
      options: ["✊ Rock", "✋ Paper", "✌️ Scissors"]
    }));
  }
  if (game === "react") {
    return [{ kind: "react", text: "Rang badalte hi tap karo. Sabse tez jeeta." }];
  }
  if (game === "cards") {
    return shuffle(CONTENT.cards).slice(0, 8).map((card) => ({
      kind: "card",
      text: card.text,
      tag: card.tag
    }));
  }
  if (game === "penalty") {
    const rounds = [];
    for (let i = 0; i < 10; i += 1) {
      rounds.push({
        kind: "penalty",
        text: i % 2 === 0 ? "Tumhara shot — direction chuno" : "Tum keeper ho — dive kahan?",
        shooter: i % 2
      });
    }
    return rounds;
  }
  if (game === "cricket") {
    const rounds = [];
    for (let i = 0; i < 24; i += 1) {
      const inning = Math.floor(i / 12);
      rounds.push({
        kind: "cricket",
        text: inning === 0 ? "Pehli innings" : "Doosri innings",
        batter: inning,
        bowler: 1 - inning
      });
    }
    return rounds;
  }
  if (game === "spell") {
    return shuffle(CONTENT.words).slice(0, 5).map((item) => ({
      kind: "spell",
      text: item.hint,
      word: item.word
    }));
  }
  if (game === "duck") {
    return [{ kind: "duck", text: "Duck udte hi tap karo — 15 second" }];
  }
  if (game === "meter") {
    const rounds = [];
    for (let i = 0; i < 10; i += 1) {
      rounds.push({ kind: "meter", text: "Free throw — meter ko beech me roko" });
    }
    return rounds;
  }
  if (game === "draw") {
    return [{ kind: "draw", text: "Banao aur batao — ek banata hai, doosra pehchanta hai" }];
  }
  if (game === "tap") {
    return [{ kind: "tap", text: "10 second me sabse zyada tap kaun karega?" }];
  }
  return null;
}

/* --------------------------------------------------------------- rooms */

/* -------------------------------------------------------------- board */

function newBoard(type) {
  return {
    type: type === "ttt" ? "ttt" : "c4",
    cells: new Array(type === "ttt" ? 9 : C4_COLS * C4_ROWS).fill(-1),
    turn: 0,
    over: false,
    winner: -1
  };
}

/* "win" | "draw" | "ok" | false */
function tttPlay(board, at, player) {
  if (!(at >= 0 && at < 9)) return false;
  if (board.cells[at] !== -1) return false;
  board.cells[at] = player;
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.every((k) => board.cells[k] === player)) return "win";
  }
  return board.cells.indexOf(-1) === -1 ? "draw" : "ok";
}

function checkWin(board, row, col, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let d = 0; d < dirs.length; d += 1) {
    const dr = dirs[d][0];
    const dc = dirs[d][1];
    let count = 1;
    for (let s = -1; s <= 1; s += 2) {
      let r = row + dr * s;
      let c = col + dc * s;
      while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS &&
        board.cells[r * C4_COLS + c] === player) {
        count += 1;
        r += dr * s;
        c += dc * s;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

/* "win" | "draw" | "ok" | false */
function dropChip(board, col, player) {
  if (!(col >= 0 && col < C4_COLS)) return false;
  for (let row = C4_ROWS - 1; row >= 0; row -= 1) {
    const at = row * C4_COLS + col;
    if (board.cells[at] === -1) {
      board.cells[at] = player;
      if (checkWin(board, row, col, player)) return "win";
      return board.cells.indexOf(-1) === -1 ? "draw" : "ok";
    }
  }
  return false;
}

function makeRoom(name) {
  const room = {
    code: newCode(),
    players: [{ id: newId(), name: name, seen: Date.now() }],
    game: null,
    board: null,
    score: [0, 0],
    rounds: [],
    i: 0,
    phase: "lobby",
    answers: [null, null],
    matches: 0,
    played: 0,
    lastMatch: false,
    quizRight: null,
    rpsWinner: null,
    reactWinner: null,
    spellRight: null,
    roundKick: null,
    roundBall: null,
    meterPoints: null,
    kick: [],
    cricket: { runs: [0, 0], balls: [0, 0], wickets: [0, 0] },
    watch: null,
    draw: null,
    goAt: 0,
    tapEndsAt: 0,
    chat: [],
    signals: [],
    signalId: 0,
    call: null,
    touched: Date.now()
  };
  rooms.set(room.code, room);
  return room;
}

/* --------------------------------------------------------------- draw */

function newDraw(round) {
  const words = CONTENT.words.map((w) => w.word);
  return {
    round: round,
    total: 6,
    painter: round % 2,
    word: words[crypto.randomInt(words.length)],
    revealed: false,
    answer: "",
    strokes: [],
    guesses: [],
    endsAt: Date.now() + DRAW_MS
  };
}

function maskWord(word) {
  return String(word || "").split("").map((ch) => (ch === " " ? "/" : "_")).join(" ");
}

function optionsFor(round, index) {  if (!round) return null;
  if (round.kind === "penalty") return ["⬅️ Left", "⬆️ Centre", "➡️ Right"];
  if (round.kind === "cricket") {
    return index === round.batter
      ? ["🛡️ Defend", "🏏 Drive", "🚀 Loft"]
      : ["⚡ Pace", "🌀 Spin", "🐢 Slower"];
  }
  return round.options || null;
}

function beginRound(room) {
  const round = room.rounds[room.i];
  room.answers = [null, null];
  room.phase = "answering";
  room.lastMatch = false;
  room.quizRight = null;
  room.rpsWinner = null;
  room.reactWinner = null;
  room.spellRight = null;
  room.roundKick = null;
  room.roundBall = null;
  room.meterPoints = null;
  room.tapEndsAt = (round.kind === "tap" || round.kind === "duck") ? Date.now() + (round.kind === "duck" ? DUCK_MS : TAP_MS) : 0;
  room.goAt = round.kind === "react" ? Date.now() + 2500 + Math.floor(Math.random() * 2000) : 0;
  room.botAt = Date.now() + 1500;
}

function view(room, id) {
  const index = room.players.findIndex((p) => p.id === id);
  if (index < 0) return null;
  const round = room.rounds[room.i] || null;
  const revealed = room.phase === "reveal" || room.phase === "done";
  const mine = room.answers[index];
  const theirs = revealed ? room.answers[1 - index] : null;
  return {
    code: room.code,
    now: Date.now(),
    me: index,
    players: room.players.map((p) => p.name),
    game: room.game,
    phase: room.phase,
    roundNo: room.i,
    total: room.rounds.length,
    round: round ? {
      kind: round.kind,
      text: round.text,
      options: round.options || null,
      shooter: round.shooter == null ? null : round.shooter,
      batter: round.batter == null ? null : round.batter
    } : null,
    board: room.board ? {
      type: room.board.type,
      cells: room.board.cells,
      turn: room.board.turn,
      over: room.board.over,
      winner: room.board.winner
    } : null,
    score: room.score || [0, 0],
    correct: revealed && round && round.correct != null ? round.correct : null,
    quizRight: revealed ? room.quizRight : null,
    rpsWinner: revealed ? room.rpsWinner : null,
    reactWinner: revealed ? room.reactWinner : null,
    goAt: round && round.kind === "react" && room.phase === "answering" ? room.goAt : 0,
    chat: room.chat || [],
    call: room.call || null,
    signals: (room.signals || []).filter((s) => s.to === index),
    myOptions: optionsFor(round, index),
    kick: room.kick || [],
    roundKick: revealed ? room.roundKick : null,
    roundBall: revealed ? room.roundBall : null,
    cricket: room.cricket || null,
    spellRight: revealed ? room.spellRight : null,
    meterPoints: revealed ? room.meterPoints : null,
    word: revealed && round && round.word ? round.word : null,
    watch: room.watch || null,
    bots: room.players.map((p) => !!p.bot),
    draw: room.draw ? {
      round: room.draw.round,
      total: room.draw.total,
      painter: room.draw.painter,
      word: room.draw.painter === index ? room.draw.word : null,
      masked: maskWord(room.draw.word),
      answer: room.draw.revealed ? room.draw.word : "",
      revealed: room.draw.revealed,
      guesses: room.draw.guesses,
      endsAt: room.draw.revealed ? 0 : room.draw.endsAt,
      strokeCount: room.draw.strokes.length
    } : null,
    myAnswer: mine == null ? null : mine,
    theirAnswer: theirs == null ? null : theirs,
    lastMatch: room.lastMatch,
    matches: room.matches,
    played: room.played,
    tapEndsAt: round && (round.kind === "tap" || round.kind === "duck") && room.phase === "answering" ? room.tapEndsAt : 0
  };
}

/* ---------------------------------------------------------------- api */

function handleApi(name, body, reply) {
  const code = clean(body.code, 8).toUpperCase();
  const id = clean(body.pid, 64);

  if (name === "create") {
    const room = makeRoom(clean(body.name, 24) || "Someone");
    const mine = room.players[0];
    reply({ ok: true, code: room.code, pid: mine.id, room: view(room, mine.id) });
    return;
  }

  if (name === "demo") {
    const room = makeRoom(clean(body.name, 24) || "Admin");
    room.players.push({ id: newId(), name: "Jodi Bot", seen: Date.now(), bot: true });
    room.botAt = Date.now() + 1200;
    const mine = room.players[0];
    reply({ ok: true, code: room.code, pid: mine.id, room: view(room, mine.id) });
    return;
  }

  if (name === "join") {
    const room = rooms.get(code);
    if (!room) {
      reply({ ok: false, error: "Yeh code nahi mila" });
      return;
    }
    let joined;
    if (room.players.length >= 2) {
      const second = room.players[1];
      if (Date.now() - second.seen < 60000) {
        reply({ ok: false, error: "Room bhara hua hai" });
        return;
      }
      joined = { id: newId(), name: clean(body.name, 24) || "Partner", seen: Date.now() };
      room.players[1] = joined;
    } else {
      joined = { id: newId(), name: clean(body.name, 24) || "Partner", seen: Date.now() };
      room.players.push(joined);
    }
    room.touched = Date.now();
    reply({ ok: true, code: room.code, pid: joined.id, room: view(room, joined.id) });
    return;
  }

  const room = rooms.get(code);
  if (!room) {
    reply({ ok: false, gone: true, error: "Room band ho gaya" });
    return;
  }
  const player = room.players.find((p) => p.id === id);
  if (!player) {
    reply({ ok: false, gone: true, error: "Tum is room me nahi ho" });
    return;
  }
  player.seen = Date.now();
  room.touched = Date.now();

  if (name === "start") {
    if (room.players.length < 2) {
      reply({ ok: false, error: "Partner ke aane ka intezaar karo" });
      return;
    }
    const game = clean(body.game, 20);
    const deck = buildDeck(game, room);
    if (!deck) {
      reply({ ok: false, error: "Yeh game nahi mila" });
      return;
    }
    room.game = game;
    room.rounds = deck;
    room.i = 0;
    room.matches = 0;
    room.played = 0;
    room.board = deck[0].kind === "board" ? newBoard(game === "ttt" ? "ttt" : "c4") : null;
    room.kick = [];
    room.cricket = { runs: [0, 0], balls: [0, 0], wickets: [0, 0] };
    room.roundKick = null;
    room.roundBall = null;
    room.meterPoints = null;
    room.draw = game === "draw" ? newDraw(0) : null;
    beginRound(room);
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "answer") {
    if (room.phase !== "answering") {
      reply({ ok: false, error: "Is round me jawab band ho gaya" });
      return;
    }
    const index = room.players.findIndex((p) => p.id === id);
    if (room.answers[index] != null) {
      reply({ ok: true, room: view(room, id) });
      return;
    }
    const round = room.rounds[room.i];
    const roleOptions = optionsFor(round, index);
    let value;
    if (round.kind === "tap" || round.kind === "react") {
      value = String(Math.max(0, Math.min(9999, Math.floor(Number(body.value) || 0))));
    } else if (round.kind === "duck") {
      value = String(Math.max(0, Math.min(500, Math.floor(Number(body.value) || 0))));
    } else if (round.kind === "meter") {
      value = String(Math.max(0, Math.min(100, Math.floor(Number(body.value) || 0))));
    } else if (roleOptions && roleOptions.length) {
      const k = Math.floor(Number(body.value));
      if (!(k >= 0 && k < roleOptions.length)) {
        reply({ ok: false, error: "Galat option" });
        return;
      }
      value = String(k);
    } else {
      value = clean(body.value, 500);
      if (!value) {
        reply({ ok: false, error: "Kuch likho" });
        return;
      }
    }

    room.answers[index] = value;

    if (room.answers[0] != null && room.answers[1] != null) {
      room.played += 1;

      if (round.kind === "quiz") {
        const right = [room.answers[0] === String(round.correct), room.answers[1] === String(round.correct)];
        room.quizRight = right;
        room.lastMatch = room.answers[0] === room.answers[1];
        if (right[0]) room.score[0] = (room.score[0] || 0) + 1;
        if (right[1]) room.score[1] = (room.score[1] || 0) + 1;
      } else if (round.kind === "rps") {
        const a = Number(room.answers[0]);
        const b = Number(room.answers[1]);
        let winner = -1;
        if (a !== b) winner = ((a - b + 3) % 3 === 1) ? 0 : 1;
        room.rpsWinner = winner;
        room.lastMatch = winner === -1;
        if (winner >= 0) room.score[winner] = (room.score[winner] || 0) + 1;
      } else if (round.kind === "react") {
        const a = Number(room.answers[0]);
        const b = Number(room.answers[1]);
        const winner = a === b ? -1 : (a < b ? 0 : 1);
        room.reactWinner = winner;
        room.lastMatch = false;
        if (winner >= 0) room.score[winner] = (room.score[winner] || 0) + 1;
      } else if (round.kind === "penalty") {
        const shooter = round.shooter;
        const target = Number(room.answers[shooter]);
        const dive = Number(room.answers[1 - shooter]);
        const goal = target !== dive;
        room.roundKick = { shooter: shooter, target: target, dive: dive, goal: goal };
        room.kick.push(goal);
        if (goal) room.score[shooter] = (room.score[shooter] || 0) + 1;
        room.lastMatch = goal;
      } else if (round.kind === "cricket") {
        const batter = round.batter;
        const shot = Number(room.answers[batter]);
        const bowl = Number(room.answers[1 - batter]);
        const table = [[0, 1, 0], [4, 1, 2], [6, 0, -1]];
        let runs = table[shot][bowl];
        let out = false;
        if (runs < 0) {
          out = true;
          runs = 0;
        }
        room.roundBall = { batter: batter, shot: shot, bowl: bowl, runs: runs, out: out };
        const c = room.cricket;
        c.runs[batter] += runs;
        c.balls[batter] += 1;
        if (out) c.wickets[batter] += 1;
        if (runs > 0) room.score[batter] = (room.score[batter] || 0) + runs;
        room.lastMatch = runs > 0;
      } else if (round.kind === "spell") {
        const right = [
          norm(room.answers[0]) === norm(round.word),
          norm(room.answers[1]) === norm(round.word)
        ];
        room.spellRight = right;
        if (right[0]) room.score[0] = (room.score[0] || 0) + 1;
        if (right[1]) room.score[1] = (room.score[1] || 0) + 1;
        room.lastMatch = right[0] && right[1];
      } else if (round.kind === "duck") {
        const a = Number(room.answers[0]);
        const b = Number(room.answers[1]);
        room.score[0] = (room.score[0] || 0) + a;
        room.score[1] = (room.score[1] || 0) + b;
        room.lastMatch = a === b;
      } else if (round.kind === "meter") {
        const pointsOf = function (at) {
          const acc = Math.max(0, 100 - Math.abs(50 - at) * 2);
          if (acc >= 90) return 3;
          if (acc >= 70) return 2;
          if (acc >= 45) return 1;
          return 0;
        };
        const pa = pointsOf(Number(room.answers[0]));
        const pb = pointsOf(Number(room.answers[1]));
        room.meterPoints = [pa, pb];
        room.score[0] = (room.score[0] || 0) + pa;
        room.score[1] = (room.score[1] || 0) + pb;
        room.lastMatch = pa === pb;
      } else {
        let match = false;
        if (round.kind === "choice") match = room.answers[0] === room.answers[1];
        else if (round.kind === "text") {
          match = norm(room.answers[0]) !== "" && norm(room.answers[0]) === norm(room.answers[1]);
        } else match = Number(room.answers[0]) === Number(room.answers[1]);
        room.lastMatch = match;
        if (match) room.matches += 1;
      }

      room.phase = "reveal";
      room.tapEndsAt = 0;
      room.goAt = 0;
    }

    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "say") {
    const text = clean(body.text, 400);
    if (!text) {
      reply({ ok: false, error: "Kuch likho" });
      return;
    }
    const index = room.players.findIndex((p) => p.id === id);
    room.chat.push({ from: index, text: text, at: Date.now() });
    if (room.chat.length > 100) room.chat = room.chat.slice(-100);
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "call") {
    const action = clean(body.action, 12);
    const index = room.players.findIndex((p) => p.id === id);
    if (action === "ring") {
      if (room.players.length < 2) {
        reply({ ok: false, error: "Partner online nahi hai" });
        return;
      }
      room.call = { from: index, media: "audio", state: "ringing", at: Date.now() };
      room.signals = [];
    } else if (action === "accept") {
      if (room.call) {
        room.call = { from: room.call.from, media: "audio", state: "active", at: room.call.at };
      }
    } else {
      room.call = null;
      room.signals = [];
    }
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "signal") {
    const index = room.players.findIndex((p) => p.id === id);
    if (room.players.length < 2) {
      reply({ ok: false, error: "Koi doosra nahi hai" });
      return;
    }
    const kind = clean(body.kind, 10);
    if (kind !== "offer" && kind !== "answer" && kind !== "ice") {
      reply({ ok: false, error: "Galat signal" });
      return;
    }
    room.signalId += 1;
    room.signals.push({ id: room.signalId, from: index, to: 1 - index, kind: kind, data: body.data });
    if (room.signals.length > 60) room.signals = room.signals.slice(-60);
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "watch") {
    const index = room.players.findIndex((p) => p.id === id);
    if (clean(body.action, 10) === "set") {
      const videoId = clean(body.videoId, 24);
      if (!videoId) {
        reply({ ok: false, error: "Video nahi mila" });
        return;
      }
      room.watch = { videoId: videoId, startedAt: Date.now() + 5000, by: index };
    } else {
      room.watch = null;
    }
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "paint") {
    if (room.game !== "draw" || !room.draw || room.draw.revealed) {
      reply({ ok: false, error: "Ab drawing band" });
      return;
    }
    const index = room.players.findIndex((p) => p.id === id);
    if (index !== room.draw.painter) {
      reply({ ok: false, error: "Sirf painter banata hai" });
      return;
    }
    if (body.clear) room.draw.strokes = [];
    const list = Array.isArray(body.segments) ? body.segments : [];
    for (let i = 0; i < list.length; i += 1) {
      const seg = list[i];
      if (!Array.isArray(seg) || seg.length < 4) continue;
      room.draw.strokes.push([
        Math.max(0, Math.min(1000, Math.round(Number(seg[0]) || 0))),
        Math.max(0, Math.min(1000, Math.round(Number(seg[1]) || 0))),
        Math.max(0, Math.min(1000, Math.round(Number(seg[2]) || 0))),
        Math.max(0, Math.min(1000, Math.round(Number(seg[3]) || 0)))
      ]);
    }
    if (room.draw.strokes.length > 6000) room.draw.strokes = room.draw.strokes.slice(-6000);
    reply({ ok: true });
    return;
  }

  if (name === "guess") {
    if (room.game !== "draw" || !room.draw || room.draw.revealed) {
      reply({ ok: false, error: "Ab guess band" });
      return;
    }
    const index = room.players.findIndex((p) => p.id === id);
    if (index === room.draw.painter) {
      reply({ ok: false, error: "Tum painter ho" });
      return;
    }
    const text = clean(body.text, 60);
    if (!text) {
      reply({ ok: false, error: "Kuch likho" });
      return;
    }
    room.draw.guesses.push(text);
    if (room.draw.guesses.length > 6) room.draw.guesses = room.draw.guesses.slice(-6);
    if (norm(text) === norm(room.draw.word)) {
      room.draw.revealed = true;
      room.draw.answer = text;
      room.score[index] = (room.score[index] || 0) + 2;
      room.score[room.draw.painter] = (room.score[room.draw.painter] || 0) + 1;
      room.lastMatch = true;
    }
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "move") {
    if (!room.board || room.phase !== "answering") {
      reply({ ok: false, error: "Ab move nahi" });
      return;
    }
    const index = room.players.findIndex((p) => p.id === id);
    if (room.board.turn !== index) {
      reply({ ok: false, error: "Partner ki baari hai" });
      return;
    }
    const col = Math.floor(Number(body.col));
    const result = room.board.type === "ttt"
      ? tttPlay(room.board, col, index)
      : dropChip(room.board, col, index);
    if (!result) {
      reply({ ok: false, error: "Yeh column bhara hai" });
      return;
    }
    if (result === "win") {
      room.board.over = true;
      room.board.winner = index;
      room.score[index] = (room.score[index] || 0) + 1;
      room.matches += 1;
      room.played += 1;
      room.phase = "done";
    } else if (result === "draw") {
      room.board.over = true;
      room.board.winner = -1;
      room.played += 1;
      room.phase = "done";
    } else {
      room.board.turn = 1 - index;
      room.botAt = Date.now() + 700;
    }
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "next") {
    if (room.game === "draw") {
      if (!room.draw || !room.draw.revealed) {
        reply({ ok: false, error: "Pehle round khatam hone do" });
        return;
      }
      const nextNo = room.draw.round + 1;
      if (nextNo >= room.draw.total) {
        room.phase = "done";
        room.draw = null;
      } else {
        room.draw = newDraw(nextNo);
        room.botAt = Date.now() + 1500;
      }
      room.touched = Date.now();
      reply({ ok: true, room: view(room, id) });
      return;
    }
    const looking = room.rounds[room.i];
    const isCard = room.phase === "answering" && looking && looking.kind === "card";
    if (room.phase !== "reveal" && !isCard) {
      reply({ ok: false, error: "Pehle jawab reveal hone do" });
      return;
    }
    if (room.i + 1 >= room.rounds.length) {
      room.phase = "done";
      room.tapEndsAt = 0;
      room.goAt = 0;
    } else {
      room.i += 1;
      beginRound(room);
    }
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "lobby") {
    room.phase = "lobby";
    room.game = null;
    room.board = null;
    room.draw = null;
    room.rounds = [];
    room.i = 0;
    room.answers = [null, null];
    room.matches = 0;
    room.played = 0;
    room.lastMatch = false;
    room.tapEndsAt = 0;
    reply({ ok: true, room: view(room, id) });
    return;
  }

  if (name === "leave") {
    room.players = room.players.filter((p) => p.id !== id);
    room.phase = "lobby";
    room.game = null;
    room.board = null;
    room.draw = null;
    room.rounds = [];
    room.i = 0;
    room.answers = [null, null];
    room.matches = 0;
    room.played = 0;
    room.tapEndsAt = 0;
    if (!room.players.length) rooms.delete(room.code);
    reply({ ok: true });
    return;
  }

  reply({ ok: false, error: "Kya karna hai?" });
}

/* ---------------------------------------------------------------- http */

function sendJson(res, obj, status) {
  const body = JSON.stringify(obj);
  res.writeHead(status || 200, Object.assign({}, SECURITY, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  }));
  res.end(body);
}

/* --------------------------------------------------------------- limits */

const hits = new Map();

function allow(ip, limit) {
  const now = Date.now();
  let rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    rec = { count: 0, reset: now + 60000 };
    hits.set(ip, rec);
  }
  rec.count += 1;
  return rec.count <= limit;
}

function sendFile(pathname, res) {
  const known = Object.prototype.hasOwnProperty.call(FILES, pathname);
  const entry = known ? FILES[pathname] : FILES["/index.html"];
  fs.readFile(path.join(ROOT, entry[0]), (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("File nahi mili: " + entry[0]);
      return;
    }
    res.writeHead(200, Object.assign({}, SECURITY, {
      "Content-Type": entry[1],
      "Cache-Control": (entry[0] === "index.html" || entry[0] === "sw.js") ? "no-cache" : "public, max-age=60",
      "Content-Length": data.length
    }));
    res.end(data);
  });
}

function readBody(req, done) {
  let raw = "";
  let tooBig = false;
  req.on("data", (chunk) => {
    if (tooBig) return;
    raw += chunk;
    if (raw.length > 20000) {
      tooBig = true;
      raw = "";
    }
  });
  req.on("end", () => {
    if (tooBig) {
      done(null);
      return;
    }
    try {
      done(raw ? JSON.parse(raw) : {});
    } catch (e) {
      done(null);
    }
  });
}

/* live stream: room ki haalat push hoti hai, isliye ~0.3s me sab sync */
function streamRoom(req, res, url) {
  const code = clean(url.searchParams.get("code"), 8).toUpperCase();
  const id = clean(url.searchParams.get("pid"), 64);
  const room = rooms.get(code);
  const player = room ? room.players.find((p) => p.id === id) : null;
  if (!room || !player) {
    sendJson(res, { ok: false, gone: true, error: "Room band ho gaya" });
    return;
  }

  res.writeHead(200, Object.assign({}, SECURITY, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  }));
  res.write("retry: 2000\n\n");

  let alive = true;
  let last = "";
  let timer = null;

  const close = () => {
    if (!alive) return;
    alive = false;
    if (timer) clearInterval(timer);
    try { res.end(); } catch (e) { /* pehle se band */ }
  };

  const send = () => {
    if (!alive) return;
    try {
      player.seen = Date.now();
      room.touched = Date.now();
      if (room.game === "draw" && room.draw && !room.draw.revealed && Date.now() > room.draw.endsAt) {
        room.draw.revealed = true;
        room.draw.answer = "";
      }
      const payload = JSON.stringify({ ok: true, room: view(room, id) });
      if (payload === last) {
        res.write(": ping\n\n");
        return;
      }
      last = payload;
      res.write("data: " + payload + "\n\n");
    } catch (e) {
      close();
    }
  };

  send();
  timer = setInterval(send, 350);

  req.on("close", close);
  req.on("error", close);
  res.on("error", close);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const pathname = url.pathname;

  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .split(",")[0].trim();
  const isGet = req.method === "GET" || req.method === "HEAD";
  if (!allow(ip || "anon", isGet ? 1200 : 240)) {
    sendJson(res, { ok: false, error: "Bahut jaldi — ek minute ruko" }, 429);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    if (pathname === "/health" || pathname === "/api/ping") {
      sendJson(res, { ok: true, t: Date.now(), rooms: rooms.size });
      return;
    }
    if (pathname === "/api/version") {
      sendJson(res, { ok: true, version: BOOT });
      return;
    }
    if (pathname === "/api/state") {
      const code = clean(url.searchParams.get("code"), 8).toUpperCase();
      const id = clean(url.searchParams.get("pid"), 64);
      const room = rooms.get(code);
      if (!room) {
        sendJson(res, { ok: false, gone: true, error: "Room band ho gaya" });
        return;
      }
      const player = room.players.find((p) => p.id === id);
      if (!player) {
        sendJson(res, { ok: false, gone: true, error: "Tum is room me nahi ho" });
        return;
      }
      player.seen = Date.now();
      room.touched = Date.now();
      if (room.game === "draw" && room.draw && !room.draw.revealed && Date.now() > room.draw.endsAt) {
        room.draw.revealed = true;
        room.draw.answer = "";
      }
      sendJson(res, { ok: true, room: view(room, id) });
      return;
    }
    if (pathname === "/api/strokes") {
      const code = clean(url.searchParams.get("code"), 8).toUpperCase();
      const id = clean(url.searchParams.get("pid"), 64);
      const room = rooms.get(code);
      const player = room ? room.players.find((p) => p.id === id) : null;
      if (!room || !player) {
        sendJson(res, { ok: false, gone: true });
        return;
      }
      if (!room.draw) {
        sendJson(res, { ok: true, count: 0, segments: [] });
        return;
      }
      const since = Math.max(0, Math.floor(Number(url.searchParams.get("since")) || 0));
      sendJson(res, {
        ok: true,
        count: room.draw.strokes.length,
        segments: room.draw.strokes.slice(since)
      });
      return;
    }
    if (pathname === "/api/events") {
      streamRoom(req, res, url);
      return;
    }
    if (pathname.indexOf("/api/") === 0) {
      sendJson(res, { ok: false, error: "Galat request" }, 404);
      return;
    }
    sendFile(pathname, res);
    return;
  }

  if (req.method === "POST" && pathname.indexOf("/api/") === 0) {
    const name = pathname.slice(5);
    readBody(req, (body) => {
      if (!body) {
        sendJson(res, { ok: false, error: "Request padhi nahi gayi" }, 400);
        return;
      }
      try {
        handleApi(name, body, (obj) => sendJson(res, obj));
      } catch (e) {
        sendJson(res, { ok: false, error: "Server error" }, 500);
      }
    });
    return;
  }

  sendJson(res, { ok: false, error: "Galat request" }, 405);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Jodi chalu — port " + PORT);
});

/* ----------------------------------------------------------------- bot */

function botAnswer(round, index) {
  const pick = (n) => String(crypto.randomInt(n || 1));
  if (round.kind === "quiz") {
    return crypto.randomInt(2) === 0 ? String(round.correct) : pick((round.options || []).length);
  }
  if (round.kind === "spell") {
    return crypto.randomInt(2) === 0 ? round.word : "galat spelling";
  }
  if (round.kind === "choice" || round.kind === "rps" || round.kind === "penalty" || round.kind === "cricket") {
    const options = optionsFor(round, index) || [];
    return pick(options.length || 2);
  }
  if (round.kind === "tap") return String(18 + crypto.randomInt(40));
  if (round.kind === "react") return String(260 + crypto.randomInt(260));
  if (round.kind === "duck") return String(5 + crypto.randomInt(20));
  if (round.kind === "meter") return String(25 + crypto.randomInt(50));
  const lines = [
    "Hmm… pehle tum batao?",
    "Aaj bas tumhari yaad aayi.",
    "Yeh sawaal mushkil hai yaar.",
    "Main soch raha hoon, tumhara jawab sunna chahta hoon."
  ];
  return lines[crypto.randomInt(lines.length)];
}

function botBoardMove(board) {
  const empty = [];
  if (board.type === "ttt") {
    board.cells.forEach((cell, i) => { if (cell === -1) empty.push(i); });
  } else {
    for (let c = 0; c < C4_COLS; c += 1) {
      if (board.cells[c] === -1) empty.push(c);
    }
  }
  return empty.length ? empty[crypto.randomInt(empty.length)] : -1;
}

function botPaint(room) {
  const draw = room.draw;
  if (!draw || draw.strokes.length) return;
  const pts = [
    [250, 200], [420, 200], [420, 380], [250, 380], [250, 200],
    [190, 200], [335, 120], [480, 200],
    [335, 380], [335, 470]
  ];
  for (let i = 1; i < pts.length; i += 1) {
    draw.strokes.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
  }
}

function botStep(room) {
  const botIndex = room.players.findIndex((p) => p.bot);
  if (botIndex < 0) return;
  if (room.botAt && Date.now() < room.botAt) return;

  const bot = room.players[botIndex];
  const call = (name, body) => handleApi(
    name,
    Object.assign({ code: room.code, pid: bot.id }, body),
    () => {}
  );

  if (room.phase === "lobby") return;

  if (room.game === "draw" && room.draw) {
    if (room.draw.revealed) return;
    if (room.draw.painter === botIndex) {
      botPaint(room);
      if (Date.now() > (room.botAt || 0) + 6000) {
        room.draw.revealed = true;
        room.draw.answer = room.draw.word;
      }
      return;
    }
    if (!room.draw.guesses.length) call("guess", { text: "kya bana hai?" });
    else call("guess", { text: room.draw.word });
    room.botAt = Date.now() + 6000;
    return;
  }

  if (room.phase !== "answering") return;

  if (room.board) {
    if (room.board.turn === botIndex && !room.board.over) {
      const col = botBoardMove(room.board);
      if (col >= 0) call("move", { col: col });
      room.botAt = Date.now() + 900;
    }
    return;
  }

  const round = room.rounds[room.i];
  if (!round) return;
  if (room.answers[botIndex] != null) return;
  call("answer", { value: botAnswer(round, botIndex) });
}

setInterval(() => {
  for (const [code, room] of rooms) {
    if (!room.players.some((p) => p.bot)) continue;
    try {
      botStep(room);
    } catch (e) {
      /* bot ki galti se server na gire */
    }
  }
}, 700);

/* purane rooms hatao, memory saaf rakho */
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.touched > 3 * 60 * 60 * 1000) rooms.delete(code);
  }
  for (const [ip, rec] of hits) {
    if (now > rec.reset) hits.delete(ip);
  }
  while (rooms.size > 400) {
    let oldest = null;
    for (const [code, room] of rooms) {
      if (!oldest || room.touched < oldest.touched) oldest = room;
    }
    if (!oldest) break;
    rooms.delete(oldest.code);
  }
}, 5 * 60 * 1000);
