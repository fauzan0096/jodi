/* Jodi — do phone, ek game.
   Room code se judte ho. Jawab server ke paas jaate hain aur dono ke dene ke baad hi khulte hain. */

(function () {
  "use strict";

  var LS = "jodi.v2";
  var root = document.getElementById("app");

  var GAMES = [
    { id: "daily", cat: "Daily", title: "Daily Question", sub: "roz ek sawaal, dono ke jawab", emoji: "🌤️", tint: "saffron" },
    { id: "this-or-that", cat: "Conversation", title: "This or That", sub: "dono ek side? match.", emoji: "🍨", tint: "rose" },
    { id: "never", cat: "Conversation", title: "Never Have I Ever", sub: "imaandaari se, phir hisaab", emoji: "🙈", tint: "pista" },
    { id: "who", cat: "Conversation", title: "Who's More Likely", sub: "dono ka vote, phir reveal", emoji: "🫣", tint: "saffron" },
    { id: "cards", cat: "Conversation", title: "Truth or Dare", sub: "card kheencho, jise mila use karna hai", emoji: "🎴", tint: "rose" },
    { id: "connect4", cat: "Board", title: "Connect Four", sub: "ek board, do phone", emoji: "🔴", tint: "pista" },
    { id: "ttt", cat: "Board", title: "Tic-Tac-Toe", sub: "teen ka khel, ek board", emoji: "⭕", tint: "saffron" },
    { id: "quiz", cat: "Quiz", title: "Trivia", sub: "sahi jawab, seedha point", emoji: "🧠", tint: "pista" },
    { id: "spell", cat: "Quiz", title: "Spell Karo", sub: "hint padho, sahi spelling likho", emoji: "🔤", tint: "saffron" },
    { id: "penalty", cat: "Sport", title: "Penalty Shootout", sub: "ek maarta hai, ek bachata hai", emoji: "⚽", tint: "pista" },
    { id: "cricket", cat: "Sport", title: "Cricket — 2 Overs", sub: "12 ball ki innings, dono ki baari", emoji: "🏏", tint: "rose" },
    { id: "meter", cat: "Sport", title: "Basketball Free Throws", sub: "meter ko beech me roko", emoji: "🏀", tint: "saffron" },
    { id: "draw", cat: "Arcade", title: "Banao Aur Batao", sub: "ek banata hai, doosra pehchanta hai", emoji: "🎨", tint: "pista" },
    { id: "rps", cat: "Arcade", title: "Rock Paper Scissors", sub: "paanch round, seedha muqabla", emoji: "✊", tint: "rose" },
    { id: "duck", cat: "Arcade", title: "Duck Hunt", sub: "15 second, jitni duck utne point", emoji: "🦆", tint: "pista" },
    { id: "react", cat: "Arcade", title: "Reaction Duel", sub: "jo pehle tap kare wo jeeta", emoji: "💥", tint: "saffron" },
    { id: "tap", cat: "Arcade", title: "Tap Duel", sub: "10 second, ek ungli", emoji: "⚡", tint: "rose" }
  ];

  function gameById(id) {
    for (var i = 0; i < GAMES.length; i += 1) {
      if (GAMES[i].id === id) return GAMES[i];
    }
    return null;
  }

  var app = {
    name: "",
    code: "",
    pid: "",
    notes: [],
    book: [],
    bookKeys: [],
    room: null,
    sig: "",
    poll: null,
    skew: 0,
    tapRunning: false,
    tapCount: 0,
    tapTimer: null,
    reactReady: false,
    reactAt: 0,
    reactTimer: null,
    local: false,
    live: null,
    liveOpen: false,
    liveWatchdog: null,
    ping: null,
    aim: null
  };

  /* ------------------------------------------------------------- storage */

  function load() {
    try {
      var raw = localStorage.getItem(LS);
      var saved = raw ? JSON.parse(raw) : null;
      if (!saved || typeof saved !== "object") return;
      app.name = typeof saved.name === "string" ? saved.name : "";
      app.code = typeof saved.code === "string" ? saved.code : "";
      app.pid = typeof saved.pid === "string" ? saved.pid : "";
      app.notes = Array.isArray(saved.notes) ? saved.notes : [];
      app.book = Array.isArray(saved.book) ? saved.book : [];
      app.bookKeys = Array.isArray(saved.bookKeys) ? saved.bookKeys : [];
    } catch (e) {
      /* kuch nahi */
    }
  }

  function save() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        name: app.name,
        code: app.local ? "" : app.code,
        pid: app.local ? "" : app.pid,
        notes: app.notes,
        book: app.book,
        bookKeys: app.bookKeys
      }));
    } catch (e) {
      /* private mode */
    }
  }

  /* ------------------------------------------------------------- helpers */

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function dateKey() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  function encUrl(obj) {
    try {
      var bytes = new TextEncoder().encode(JSON.stringify(obj));
      var bin = "";
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) {
      return "";
    }
  }

  function decUrl(s) {
    try {
      var b64 = s.replace(/-/g, "+").replace(/_/g, "/");
      var pad = (4 - (b64.length % 4)) % 4;
      var bin = atob(b64 + "=".repeat(pad));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return null;
    }
  }

  function decodeHash(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function copyText(text, msg) {
    function ok() { toast(msg || "Copy ho gaya"); }
    function manual() {
      var t = document.createElement("textarea");
      t.value = text;
      t.style.position = "fixed";
      t.style.top = "0";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (e) { done = false; }
      t.remove();
      if (done) ok();
      else toast("Copy nahi hua");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, manual);
    } else {
      manual();
    }
  }

  function shareLink(url, text) {
    if (navigator.share) {
      navigator.share({ title: "Jodi", text: text || "Jodi", url: url })
        .catch(function () { copyText(url, "Link copy ho gaya"); });
      return;
    }
    copyText(url, "Link copy ho gaya");
  }

  /* ----------------------------------------------------------------- api */

  /* preview gate token (agar URL me hai) ko API calls ke saath bhi bhejo */
  function apiUrl(path) {
    var q = location.search || "";
    if (q.length < 2) return path;
    return path + (path.indexOf("?") >= 0 ? "&" : "?") + q.slice(1);
  }

  function api(path, body) {
    if (app.local && window.JodiLocal) {
      return Promise.resolve(window.JodiLocal.handle(path, body || null));
    }
    var opts = body ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    } : { method: "GET", cache: "no-store" };
    return fetch(apiUrl(path), opts).then(function (res) {
      var type = String(res.headers.get("content-type") || "");
      return res.text().then(function (text) {
        if (type.indexOf("json") < 0) {
          return { ok: false, gate: true, error: "session" };
        }
        try {
          return JSON.parse(text);
        } catch (e) {
          return { ok: false, gate: true, error: "session" };
        }
      });
    });
  }

  function pingServer() {
    var started = Date.now();
    app.ping = null;
    return api("/api/ping").then(function (res) {
      app.ping = {
        ok: !!(res && res.ok),
        gate: !!(res && res.gate),
        ms: Date.now() - started,
        why: res && res.ok ? "" : (res && res.gate ? "preview session" : ((res && res.error) || "ajeeb jawab"))
      };
      return app.ping;
    }).catch(function (err) {
      app.ping = {
        ok: false,
        gate: false,
        ms: Date.now() - started,
        why: (err && err.message) ? err.message : "network error"
      };
      return app.ping;
    });
  }

  function signature(room) {
    return [
      room.phase,
      room.roundNo,
      room.game,
      room.players.join(","),
      room.myAnswer == null ? "-" : "+",
      room.theirAnswer == null ? "-" : "+",
      room.board ? room.board.cells.join(",") + ":" + room.board.turn + ":" + (room.board.over ? 1 : 0) : "-",
      room.draw ? room.draw.round + ":" + (room.draw.revealed ? 1 : 0) + ":" + room.draw.guesses.length : "-",
      room.matches,
      room.played,
      room.lastMatch ? 1 : 0
    ].join("|");
  }

  function startPolling() {
    stopPolling();
    pollOnce();
    app.poll = setInterval(pollOnce, app.local ? 500 : 800);
  }

  function stopLive() {
    if (app.live) {
      try { app.live.close(); } catch (e) { /* pehle se band */ }
      app.live = null;
    }
    if (app.liveWatchdog) {
      clearTimeout(app.liveWatchdog);
      app.liveWatchdog = null;
    }
    app.liveOpen = false;
  }

  /* push sync: ~0.35s me sab kuch dono phone pe. Fail ho to polling pe wapas. */
  function startSync() {
    stopLive();
    stopPolling();
    if (!app.code || !app.pid) return;
    pollOnce();
    if (app.local || typeof EventSource === "undefined") {
      startPolling();
      return;
    }
    try {
      app.live = new EventSource(apiUrl("/api/events?code=" + encodeURIComponent(app.code) +
        "&pid=" + encodeURIComponent(app.pid)));
    } catch (e) {
      startPolling();
      return;
    }
    app.liveWatchdog = setTimeout(function () {
      if (!app.liveOpen) {
        stopLive();
        startPolling();
      }
    }, 6000);
    app.live.onopen = function () {
      app.liveOpen = true;
      if (app.liveWatchdog) {
        clearTimeout(app.liveWatchdog);
        app.liveWatchdog = null;
      }
      stopPolling();
      app.poll = setInterval(pollOnce, 2500);
    };
    app.live.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        if (data && data.ok && data.room) applyRoom(data.room);
      } catch (e) { /* khaali */ }
    };
    app.live.onerror = function () {
      stopLive();
      startPolling();
    };
  }

  function stopPolling() {
    if (app.poll) {
      clearInterval(app.poll);
      app.poll = null;
    }
  }

  function pollOnce() {
    if (!app.code || !app.pid) return;
    api("/api/state?code=" + encodeURIComponent(app.code) + "&pid=" + encodeURIComponent(app.pid))
      .then(function (res) {
        if (!res || !res.ok) {
          if (res && res.gone) forgetRoom("Room band ho gaya — naya banao");
          return;
        }
        applyRoom(res.room);
      })
      .catch(function () { /* network hiccup, agli baar */ });
  }

  function applyRoom(room) {
    app.room = room;
    app.skew = room.now - Date.now();
    syncChat();
    syncCall();
    recordRound(room);
    recordBoard(room);
    var sig = signature(room);
    if (sig !== app.sig) {
      app.sig = sig;
      render();
    } else if (app.tapRunning) {
      paintTap();
    }
  }

  function post(path, body) {
    return api(path, body).then(function (res) {
      if (res && res.ok && res.room) {
        applyRoom(res.room);
      } else if (res && !res.ok) {
        if (res.gate) toast("Preview session khatam — toolbar se Run dobara dabao");
        else if (res.gone) forgetRoom("Room band ho gaya — naya banao");
        else toast(res.error || "Nahi hua");
      }
      return res;
    }).catch(function (err) {
      toast("Server se baat nahi hui: " + ((err && err.message) || "network"));
    });
  }

  function forgetRoom(message) {
    app.local = false;
    app.code = "";
    app.pid = "";
    app.room = null;
    app.sig = "";
    cleanupCall();
    closeChat();
    closeWatch();
    save();
    stopLive();
    stopPolling();
    if (staleBuild) {
      location.reload();
      return;
    }
    if (message) toast(message);
    render();
  }

  /* -------------------------------------------------------------- actions */

  function saveName() {
    var name = val("in-name");
    if (!name) return toast("Naam likho");
    app.name = name.slice(0, 24);
    save();
    render();
  }

  function createRoom() {
    if (!app.name) return toast("Pehle naam");
    api("/api/create", { name: app.name }).then(function (res) {
      if (!res || !res.ok) {
        if (res && res.gate) return toast("Preview session khatam — toolbar se Run dobara dabao");
        return toast((res && res.error) || "Room nahi bana");
      }
      app.code = res.code;
      app.pid = res.pid;
      app.room = res.room;
      app.sig = signature(res.room);
      save();
      startSync();
      render();
    }).catch(function (err) {
      toast("Server se baat nahi hui: " + ((err && err.message) || "network"));
      pingServer().then(refreshServerLine);
    });
  }

  function createDemo() {
    if (!app.name) return toast("Pehle naam");
    app.local = false;
    api("/api/demo", { name: app.name }).catch(function () { return null; }).then(function (res) {
      if (res && res.ok) return res;
      if (res && !res.gate && res.error) {
        toast(res.error);
        return null;
      }
      /* server nahi mila — demo browser ke andar hi chalao */
      if (!window.JodiLocal) {
        toast("Server nahi mila");
        refreshServerLine();
        return null;
      }
      app.local = true;
      return api("/api/demo", { name: app.name });
    }).then(function (res) {
      if (!res) return;
      if (!res.ok) {
        app.local = false;
        toast(res.error || "Demo nahi khula");
        return;
      }
      app.code = res.code;
      app.pid = res.pid;
      app.room = res.room;
      app.sig = signature(res.room);
      save();
      startSync();
      render();
      toast(app.local ? "Offline demo ready — bina server ke chal raha hai" : "Demo ready — koi bhi game chuno");
    });
  }

  function joinRoom(code) {
    code = String(code || "").trim().toUpperCase();
    if (code.length !== 6) return toast("6 letter ka code daalo");
    if (!app.name) return toast("Pehle naam likho");
    api("/api/join", { code: code, name: app.name }).then(function (res) {
      if (!res || !res.ok) {
        if (res && res.gate) return toast("Preview session khatam — toolbar se Run dobara dabao");
        return toast((res && res.error) || "Join nahi hua");
      }
      app.code = res.code;
      app.pid = res.pid;
      app.room = res.room;
      app.sig = signature(res.room);
      save();
      if (location.hash && location.hash !== "#/") location.hash = "#/";
      startSync();
      render();
    }).catch(function (err) {
      toast("Server se baat nahi hui: " + ((err && err.message) || "network"));
      pingServer().then(refreshServerLine);
    });
  }

  function joinFromInput() {
    joinRoom(val("in-code"));
  }

  function copyCode() {
    if (!app.room) return;
    copyText(app.room.code, "Code copy ho gaya");
  }

  function shareCode() {
    if (!app.room) return;
    var url = location.origin + location.pathname + "#/join/" + app.room.code;
    shareLink(url, "Jodi pe room " + app.room.code + " — code daal ke judo");
  }

  function startGame(id) {
    if (!app.code || !id) return;
    stopTap();
    post("/api/start", { code: app.code, pid: app.pid, game: id });
  }

  function submit(value) {
    if (!app.code) return;
    stopTap();
    post("/api/answer", { code: app.code, pid: app.pid, value: value });
  }

  function submitText() {
    var text = val("answer");
    if (!text) return toast("Kuch likho pehle :)");
    submit(text);
  }

  function nextRound() {
    if (!app.code) return;
    app.aim = null;
    stopTap();
    post("/api/next", { code: app.code, pid: app.pid });
  }

  function move(col) {
    if (!app.code) return;
    post("/api/move", { code: app.code, pid: app.pid, col: Number(col) });
  }

  function backToLobby() {
    if (!app.code) return;
    post("/api/lobby", { code: app.code, pid: app.pid });
  }

  function leaveRoom() {
    if (app.code) {
      api("/api/leave", { code: app.code, pid: app.pid }).catch(function () {});
    }
    forgetRoom("");
    if (location.hash && location.hash !== "#/") location.hash = "#/";
    render();
  }

  function resetAll() {
    if (!window.confirm("Sab kuch mit jaayega — naam, room, notes. Pakka?")) return;
    try { localStorage.removeItem(LS); } catch (e) {}
    app.name = "";
    app.notes = [];
    leaveRoom();
  }

  /* ----------------------------------------------------------------- tap */

  function tapLeft() {
    var room = app.room;
    if (!room || !room.tapEndsAt) return 0;
    return Math.max(0, (room.tapEndsAt - app.skew) - Date.now());
  }

  function stopTap() {
    if (app.tapTimer) {
      clearInterval(app.tapTimer);
      app.tapTimer = null;
    }
    app.tapRunning = false;
  }

  function paintTap() {
    var c = root.querySelector(".tap-count");
    if (c) c.textContent = String(app.tapCount || 0);
    var l = root.querySelector(".tap-left");
    if (l) l.textContent = (tapLeft() / 1000).toFixed(1) + "s";
  }

  function tickTap() {
    paintTap();
    if (tapLeft() <= 0) {
      stopTap();
      submit(String(app.tapCount || 0));
    }
  }

  function tapHit() {
    var room = app.room;
    if (!room || room.phase !== "answering" || !room.round || room.round.kind !== "tap") return;
    if (room.myAnswer != null) return;
    if (tapLeft() <= 0) {
      submit(String(app.tapCount || 0));
      return;
    }
    if (!app.tapRunning) {
      app.tapRunning = true;
      app.tapCount = 1;
      paintTap();
      app.tapTimer = setInterval(tickTap, 80);
      return;
    }
    app.tapCount += 1;
    paintTap();
    var pad = root.querySelector(".tap-pad");
    if (pad) {
      pad.classList.remove("pop");
      void pad.offsetWidth;
      pad.classList.add("pop");
    }
  }

  /* --------------------------------------------------------------- react */

  function stopReact() {
    if (app.reactTimer) {
      clearTimeout(app.reactTimer);
      app.reactTimer = null;
    }
    app.reactReady = false;
  }

  function markReactGo() {
    app.reactTimer = null;
    app.reactReady = true;
    var label = document.getElementById("react-label");
    if (label) label.textContent = "TAP!";
    var pad = root.querySelector(".react-pad");
    if (pad) pad.classList.add("go");
  }

  function armReact() {
    stopReact();
    var room = app.room;
    if (!room || room.phase !== "answering" || room.myAnswer != null) return;
    if (!room.round || room.round.kind !== "react") return;
    var goLocal = room.goAt - app.skew;
    var wait = goLocal - Date.now();
    app.reactAt = goLocal;
    if (wait <= 0) markReactGo();
    else app.reactTimer = setTimeout(markReactGo, wait);
  }

  function reactTap() {
    var room = app.room;
    if (!room || !room.round || room.round.kind !== "react" || room.myAnswer != null) return;
    if (!app.reactReady) {
      stopReact();
      toast("Jaldi daba diya — 5 second penalty");
      submit("5000");
      return;
    }
    var ms = Math.max(0, Date.now() - app.reactAt);
    stopReact();
    submit(String(Math.min(9999, ms)));
  }

  /* --------------------------------------------------------------- notes */

  function pushNote(text, from) {
    app.notes.push({ text: text, at: dateKey(), from: from || app.name || "tum" });
    save();
  }

  function saveNote() {
    var text = val("note-text");
    if (!text) return toast("Pehle kuch likho");
    pushNote(text, app.name);
    render();
    toast("Note save ho gaya");
  }

  function shareTyped() {
    var text = val("note-text");
    if (!text) return toast("Pehle kuch likho");
    pushNote(text, app.name);
    render();
    var url = location.origin + location.pathname + "#/in/" + encUrl({
      t: "note", from: app.name || "tum", text: text, at: dateKey()
    });
    shareLink(url, text);
  }

  function shareSaved(i) {
    var note = app.notes[i];
    if (!note) return;
    var url = location.origin + location.pathname + "#/in/" + encUrl({
      t: "note", from: note.from || app.name, text: note.text, at: note.at || ""
    });
    shareLink(url, note.text);
  }

  function keepNote(text, from) {
    if (!text) return toast("Yeh note khaali hai");
    pushNote(text, from || "partner");
    location.hash = "#/notes";
    render();
    toast("Wall pe rakh diya");
  }

  /* ---------------------------------------------------------- small views */

  function topBar() {
    var right = "";
    var room = app.room;
    if (room) {
      right = '<div class="top-actions">' +
        '<a class="pill" href="#/book">📖</a>' +
        '<button class="pill" data-act="chat">💬</button>' +
        '<button class="pill" data-act="call">📞</button>' +
        '<button class="pill" data-act="watch">🎬</button>' +
        '<a class="pair" href="#/us">' + esc(room.players.join(" × ")) + "</a>" +
        "</div>";
    } else if (app.name) {
      right = '<div class="top-actions">' +
        '<a class="pill" href="#/book">📖</a>' +
        '<a class="pair" href="#/us">' + esc(app.name) + "</a>" +
        "</div>";
    }
    return '<header class="top"><a class="brand" href="#/">Jodi</a>' + right + "</header>";
  }

  function nameView() {
    return topBar() +
      '<section class="card hero">' +
        '<p class="kicker">do logon ke liye</p>' +
        '<h1 class="h1">Ek room, do phone,<br>ek hi game.</h1>' +
        '<p class="sub">Koi account nahi, koi password nahi. Bas naam, aur ek 6-letter code.</p>' +
      "</section>" +
      '<section class="card">' +
        '<label class="field"><span>Tumhara naam</span>' +
          '<input class="input" id="in-name" autocomplete="off" placeholder="Aarav" value="' + esc(app.name) + '"></label>' +
        '<button class="btn" data-act="save-name">Aage badho</button>' +
      "</section>";
  }

  function serverInner() {
    var p = app.ping;
    if (!p) return '<p class="tiny center">server check ho raha hai…</p>';
    if (p.ok) return '<p class="tiny center"><span class="dot ok"></span>server theek hai · ' + p.ms + "ms</p>";
    if (p.gate) {
      return '<div class="card warn"><p class="kicker">preview session</p>' +
        '<p class="mid">Preview session khatam ho gaya — toolbar se <b>Run</b> dobara dabao.</p></div>';
    }
    return '<div class="card warn"><p class="kicker">server nahi mila</p>' +
      '<p class="mid">Do phone se khelne ke liye Jodi ka server chalna chahiye (<code>npm start</code> ya deploy). ' +
      "Abhi <b>Demo kholo</b> dabao — woh bina server ke, Jodi Bot ke saath, saare games dikha dega.</p>" +
      '<p class="tiny">(' + esc(p.why) + ') · <a href="#" data-act="ping" class="linky">dobara check</a></p></div>';
  }

  function serverLine() {
    return '<div id="server-line">' + serverInner() + "</div>";
  }

  /* sirf server wali line badlo — baaki page (aur type kiya hua text) ko mat chhedo */
  function refreshServerLine() {
    var el = document.getElementById("server-line");
    if (el) el.innerHTML = serverInner();
  }

  function doorView() {
    return topBar() +
      '<section class="card hero">' +
        '<p class="kicker">shuru karo</p>' +
        '<h1 class="h1">Room banao,<br>ya code daalo.</h1>' +
      "</section>" +
      ritualCard() +
      '<section class="card">' +
        '<p class="mid">Naya room kholo aur code partner ko bhej do.</p>' +
        '<button class="btn" data-act="create">Room banao</button>' +
      "</section>" +
      '<section class="card">' +
        '<p class="mid">Partner ne code diya hai?</p>' +
        '<label class="field"><span>6 letter ka code</span>' +
          '<input class="input code-input" id="in-code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABCDEF"></label>' +
        '<button class="btn ghost" data-act="join">Judo</button>' +
      "</section>" +
      '<section class="card" style="background:linear-gradient(150deg,#fff,var(--pista-soft))">' +
        '<p class="kicker">admin · demo</p>' +
        '<p class="mid">Akela sab kuch dekh lo — <b>Jodi Bot</b> doosri taraf khelega, kisi ko invite karne ki zaroorat nahi. Saare 17 games turant khul jaayenge.</p>' +
        '<button class="btn" data-act="demo">Demo kholo</button>' +
      "</section>" +
      '<a class="card soft" href="#/notes" style="display:block;text-decoration:none;color:inherit">' +
        '<span class="kicker">notes</span>' +
        '<p class="mid">Chhota note likho aur link bana ke bhej do.</p>' +
        '<span class="linky">Kholo →</span>' +
      "</a>" +
      serverLine();
  }

  function joinView(code) {
    code = String(code || "").toUpperCase().slice(0, 6);
    return topBar() +
      '<section class="card hero">' +
        '<p class="kicker">room ' + esc(code) + "</p>" +
        '<h1 class="h1">Partner ne bulaya hai.</h1>' +
        '<p class="sub">Apna naam daalo aur judo.</p>' +
      "</section>" +
      '<section class="card">' +
        '<label class="field"><span>Tumhara naam</span>' +
          '<input class="input" id="in-name" autocomplete="off" placeholder="Meera" value="' + esc(app.name) + '"></label>' +
        '<button class="btn" data-act="join-with-name" data-code="' + esc(code) + '">Judo</button>' +
      "</section>";
  }

  function connectingView() {
    return topBar() +
      '<section class="card hero connecting">' +
        '<p class="kicker">room ' + esc(app.code) + "</p>" +
        '<h1 class="h1 small">Jud raha hai…</h1>' +
        '<p class="sub">Ek second. Zyada der lage to server band hai ya room mit gaya.</p>' +
        '<button class="btn ghost" data-act="leave">Room chhodo</button>' +
      "</section>" +
      serverLine();
  }

  function lobbyView() {
    var room = app.room;
    var players = room.players || [];

    if (players.length < 2) {
      return topBar() +
        '<section class="card hero center">' +
          '<p class="kicker">tumhara code</p>' +
          '<p class="code">' + esc(room.code) + "</p>" +
          '<p class="sub center">Partner is code se judega. Dono phone pe Jodi kholo.</p>' +
          '<button class="btn" data-act="share-code">Code bhej do</button>' +
          '<button class="btn ghost" data-act="copy-code">Copy karo</button>' +
        "</section>" +
        '<section class="card center">' +
          '<p class="mid">intezaar… <span class="blink">●</span></p>' +
          '<p class="tiny">Yeh page khula rakho. Partner judte hi games aa jaayenge.</p>' +
        "</section>" +
        ritualCard() +
        '<button class="btn ghost danger" data-act="leave">Room chhodo</button>';
    }

    var cats = [];
    GAMES.forEach(function (g) {
      if (cats.indexOf(g.cat) < 0) cats.push(g.cat);
    });
    var groups = cats.map(function (cat) {
      var tiles = GAMES.filter(function (g) { return g.cat === cat; }).map(function (g) {
        return '<button class="tile t-' + g.tint + '" data-act="start" data-game="' + g.id + '">' +
          '<span class="tile-emoji">' + g.emoji + "</span>" +
          '<span class="tile-title">' + esc(g.title) + "</span>" +
          '<span class="tile-sub">' + esc(g.sub) + "</span>" +
          "</button>";
      }).join("");
      return '<h2 class="h2">' + esc(cat) + "</h2>" + '<div class="grid">' + tiles + "</div>";
    }).join("");

    var demo = (room.bots || []).some(function (b) { return b; });

    return topBar() +
      '<section class="card hero">' +
        '<p class="kicker">' + (demo ? "demo · bot ke saath" : "dono aa gaye") + "</p>" +
        '<h1 class="h1">' + esc(players[0]) + " × " + esc(players[1]) + "</h1>" +
        '<p class="sub">' + (demo
          ? "Game chuno — bot doosri taraf khelega. Baad me kisi ko bulana ho to yahi code share kar dena."
          : "Game chuno — dono phone pe ek saath shuru hoga.") + "</p>" +
      "</section>" +
      ritualCard() +
      groups +
      '<p class="tiny center">room code: <b>' + esc(room.code) + "</b></p>" +
      '<a class="card soft" href="#/notes" style="display:block;text-decoration:none;color:inherit">' +
        '<span class="kicker">notes</span>' +
        '<p class="mid">Game ke baad ke liye: ek chhota note.</p>' +
        '<span class="linky">Kholo →</span>' +
      "</a>";
  }

  function pipsView(room) {
    if (!room || room.total < 2) return "";
    if (room.total > 12) {
      return '<p class="tiny center">Round ' + (room.roundNo + 1) + " / " + room.total + "</p>";
    }
    var out = "";
    for (var i = 0; i < room.total; i += 1) {
      var cls = "pip" + (i < room.roundNo ? " done" : "") + (i === room.roundNo ? " now" : "");
      out += '<span class="' + cls + '"></span>';
    }
    return '<div class="pips">' + out + "</div>";
  }

  function label(round, value) {
    var k = Number(value);
    if (round.options && round.options[k] != null) return round.options[k];
    return String(value == null ? "—" : value);
  }

  function box(name, value, mine) {
    return '<div class="pick"><span class="who">' + esc(name) + (mine ? " · tum" : "") +
      "</span><b>" + esc(value) + "</b></div>";
  }

  function revealCard(room, round) {
    var mineName = room.players[room.me] || "Tum";
    var theirName = room.players[1 - room.me] || "Partner";
    var inner;

    if (round.kind === "quiz") {
      inner = '<div class="reveal">' +
        box(mineName, label(round, room.myAnswer), true) +
        box(theirName, label(round, room.theirAnswer), false) +
        "</div>" +
        '<p class="mid center">Sahi jawab: <b>' + esc(label(round, room.correct)) + "</b></p>" +
        '<p class="tiny center">' + esc(mineName) + ": " +
          (room.quizRight && room.quizRight[room.me] ? "sahi ✓" : "galat ✗") + "  ·  " +
          esc(theirName) + ": " +
          (room.quizRight && room.quizRight[1 - room.me] ? "sahi ✓" : "galat ✗") + "</p>";
    } else if (round.kind === "rps") {
      var w = room.rpsWinner;
      inner = '<div class="reveal">' +
        box(mineName, label(round, room.myAnswer), true) +
        box(theirName, label(round, room.theirAnswer), false) +
        "</div>" +
        '<p class="mid center">' +
          esc(w == null || w < 0 ? "Barabar!" : (w === room.me ? "Yeh round tumhara" : theirName + " ka round")) +
        "</p>";
    } else if (round.kind === "choice") {
      inner = '<div class="reveal">' +
        box(mineName, label(round, room.myAnswer), true) +
        box(theirName, label(round, room.theirAnswer), false) +
        "</div>";
    } else if (round.kind === "text") {
      inner = '<div class="quotes">' +
        '<blockquote class="quote"><span class="who">' + esc(mineName) + "</span>" + esc(room.myAnswer) + "</blockquote>" +
        '<blockquote class="quote"><span class="who">' + esc(theirName) + "</span>" + esc(room.theirAnswer) + "</blockquote>" +
        "</div>";
    } else if (round.kind === "penalty") {
      var kick = room.roundKick || {};
      inner = '<canvas class="scene" id="scene" width="640" height="420"></canvas>' +
        '<p class="verdict ' + (kick.goal ? "good" : "bad") + '">' +
          (kick.goal ? "⚽ Goal!" : "🧤 Save!") + "</p>" +
        '<div class="reveal">' +
          box(room.players[kick.shooter] || "Shooter", PEN_OPTS[kick.target] || "—", kick.shooter === room.me) +
          box(room.players[1 - kick.shooter] || "Keeper", PEN_OPTS[kick.dive] || "—", kick.shooter !== room.me) +
        "</div>";
    } else if (round.kind === "cricket") {
      var ball = room.roundBall || {};
      var label2 = ball.out ? "OUT! 🎯" : (ball.runs === 0 ? "0 run" : ball.runs + " run" + (ball.runs > 1 ? "s" : ""));
      inner = '<canvas class="scene" id="scene" width="640" height="420"></canvas>' +
        '<p class="verdict ' + (ball.out ? "bad" : (ball.runs >= 4 ? "good" : "")) + '">' +
          esc(label2) + "</p>" +
        '<div class="reveal">' +
          box(room.players[ball.batter] || "Batter", CRICKET_BAT[ball.shot] || "—", ball.batter === room.me) +
          box(room.players[1 - ball.batter] || "Bowler", CRICKET_BOWL[ball.bowl] || "—", ball.batter !== room.me) +
        "</div>";
    } else if (round.kind === "spell") {
      inner = '<div class="reveal">' +
          box(mineName, room.myAnswer, true) +
          box(theirName, room.theirAnswer, false) +
        "</div>" +
        '<p class="mid center">Sahi spelling: <b>' + esc(room.word || "") + "</b></p>" +
        '<p class="tiny center">' + esc(mineName) + ": " +
          (room.spellRight && room.spellRight[room.me] ? "sahi ✓" : "galat ✗") + "  ·  " +
          esc(theirName) + ": " +
          (room.spellRight && room.spellRight[1 - room.me] ? "sahi ✓" : "galat ✗") + "</p>";
    } else if (round.kind === "duck") {
      var da = Number(room.myAnswer) || 0;
      var db = Number(room.theirAnswer) || 0;
      inner = '<div class="reveal">' +
          box(mineName, da + " 🦆", true) +
          box(theirName, db + " 🦆", false) +
        "</div>" +
        '<p class="mid center">' + esc(da === db ? "Barabar!" : (da > db ? "Tum jeete 🏆" : theirName + " jeeta 🏆")) + "</p>";
    } else if (round.kind === "meter") {
      var mp = room.meterPoints || [0, 0];
      inner = '<canvas class="scene" id="scene" width="640" height="420"></canvas>' +
        '<div class="reveal">' +
          box(mineName, mp[room.me] + " point", true) +
          box(theirName, mp[1 - room.me] + " point", false) +
        "</div>" +
        '<p class="mid center">' + esc(mp[room.me] === mp[1 - room.me] ? "Barabar!" : (mp[room.me] > mp[1 - room.me] ? "Tum aage 🏆" : theirName + " aage 🏆")) + "</p>";
    } else {
      var a = Number(room.myAnswer) || 0;
      var b = Number(room.theirAnswer) || 0;
      var win;
      if (round.kind === "react") {
        win = a === b ? "Barabar!" : (a < b ? mineName + " sabse tez 🏆" : theirName + " sabse tez 🏆");
      } else {
        win = a === b ? "Barabar! Koi nahi jeeta." : (a > b ? mineName + " jeeta 🏆" : theirName + " jeeta 🏆");
      }
      inner = '<div class="reveal">' + box(mineName, a, true) + box(theirName, b, false) + "</div>" +
        '<p class="mid center">' + esc(win) + "</p>";
    }

    var badge = round.kind === "choice"
      ? '<p class="badge ' + (room.lastMatch ? "yes" : "no") + '">' +
        (room.lastMatch ? "Match! 🎉" : "Alag alag 😅") + "</p>"
      : "";

    var last = room.roundNo + 1 >= room.total;

    return '<section class="card reveal-card">' +
      badge + inner +
      '<button class="btn" data-act="next">' + (last ? "Khatam" : "Next") + "</button>" +
      "</section>";
  }

  function doneCard(room, game) {
    var cat = game ? game.cat : "";
    if (game && game.id === "cards") {
      return '<section class="card hero">' +
        '<p class="kicker">cards khatam</p>' +
        '<h1 class="h1">Aaj ke card ho gaye.</h1>' +
        '<p class="sub">Phir kheench lo — naye card, nayi baatein.</p>' +
        '<button class="btn" data-act="again">Phir se</button>' +
        '<button class="btn ghost" data-act="lobby">Doosra game</button>' +
        "</section>";
    }
    if (cat === "Board") {
      var winner = room.board ? room.board.winner : -1;
      var boardLine = winner === room.me ? "Tum jeete 🏆"
        : winner === 1 - room.me ? (room.players[1 - room.me] || "Partner") + " jeeta 🏆"
        : "Barabar! Koi nahi jeeta.";
      var box2 = room.score || [0, 0];
      return '<section class="card hero">' +
        '<p class="kicker">' + esc(game.title) + " khatam</p>" +
        '<h1 class="h1">' + esc(boardLine) + "</h1>" +
        '<p class="sub">Score: ' + box2[0] + " – " + box2[1] + "</p>" +
        '<button class="btn" data-act="again">Phir se</button>' +
        '<button class="btn ghost" data-act="lobby">Doosra game</button>' +
        "</section>";
    }
    if (cat === "Sport" && game && game.id === "cricket" && room.cricket) {
      var cr = room.cricket;
      var me2 = room.me;
      var them2 = 1 - room.me;
      var verdict = cr.runs[me2] === cr.runs[them2] ? "Barabar — tie!"
        : cr.runs[me2] > cr.runs[them2] ? "Tum jeete 🏆" : (room.players[them2] || "Partner") + " jeeta 🏆";
      return '<section class="card hero">' +
        '<p class="kicker">cricket khatam</p>' +
        '<h1 class="h1">' + cr.runs[me2] + "/" + cr.wickets[me2] + " – " + cr.runs[them2] + "/" + cr.wickets[them2] + "</h1>" +
        '<p class="sub">' + esc(verdict) + "</p>" +
        '<button class="btn" data-act="again">Phir se</button>' +
        '<button class="btn ghost" data-act="lobby">Doosra game</button>' +
        "</section>";
    }
    if (cat === "Quiz" || cat === "Arcade" || cat === "Sport") {
      var sc = room.score || [0, 0];
      var lead = sc[0] === sc[1] ? "Barabar — tie!"
        : (sc[room.me] > sc[1 - room.me] ? "Tum aage ho 🏆" : (room.players[1 - room.me] || "Partner") + " aage hai 🏆");
      return '<section class="card hero">' +
        '<p class="kicker">' + esc(game ? game.title : "game") + " khatam</p>" +
        '<h1 class="h1">' + sc[0] + " – " + sc[1] + "</h1>" +
        '<p class="sub">' + esc(lead) + "</p>" +
        '<button class="btn" data-act="again">Phir se</button>' +
        '<button class="btn ghost" data-act="lobby">Doosra game</button>' +
        "</section>";
    }
    var played = room.played;
    var pct = played ? Math.round((room.matches / played) * 100) : 0;
    var line = pct >= 80 ? "Ek hi dimaag ho tum dono ke."
      : pct >= 50 ? "Aadha match, aadha masala. Perfect."
      : "Bilkul alag — ab baat karne ka bahana mil gaya.";
    return '<section class="card hero">' +
      '<p class="kicker">' + esc(game ? game.title : "game") + " khatam</p>" +
      '<h1 class="h1">' + room.matches + "/" + played + "</h1>" +
      '<p class="sub">' + esc(line) + " (" + pct + "% same)</p>" +
      '<button class="btn" data-act="again">Phir se</button>' +
      '<button class="btn ghost" data-act="lobby">Doosra game</button>' +
      "</section>";
  }

  function boardView(room) {
    var board = room.board;
    var ttt = board.type === "ttt";
    var myTurn = !board.over && board.turn === room.me;
    var theirName = room.players[1 - room.me] || "Partner";
    var myChip = ttt ? (room.me === 0 ? "X" : "O") : (room.me === 0 ? "🔴" : "🟡");
    var theirChip = ttt ? (room.me === 0 ? "O" : "X") : (room.me === 0 ? "🟡" : "🔴");

    var status = board.over
      ? (board.winner === room.me ? "Tum jeete 🏆"
        : board.winner === 1 - room.me ? theirName + " jeeta 🏆" : "Barabar!")
      : (myTurn ? "Tumhari baari " + myChip : theirName + " ki baari " + theirChip + "…");

    var cells = "";
    for (var i = 0; i < board.cells.length; i += 1) {
      var col = ttt ? i : i % 7;
      var v = board.cells[i];
      var full = ttt ? v !== -1 : board.cells[col] !== -1;
      var cls = "cell" + (v === 0 ? " p0" : v === 1 ? " p1" : "");
      var body = ttt ? (v === 0 ? "X" : v === 1 ? "O" : "") : "";
      var off = !myTurn || full ? " disabled" : "";
      cells += '<button class="' + cls + '" data-act="move" data-col="' + col + '"' + off + ">" + body + "</button>";
    }

    return '<section class="card">' +
      '<p class="kicker">' + esc(status) + "</p>" +
      '<h2 class="prompt">' + (ttt ? "Teen me se teen — X ya O?" : "Char me se chaar — pehle kaun?") + "</h2>" +
      '<div class="board-grid' + (ttt ? " ttt" : "") + '">' + cells + "</div>" +
      '<p class="tiny center">Tum ' + myChip + " · " + esc(theirName) + " " + theirChip + "</p>" +
      "</section>";
  }

  var PEN_OPTS = ["⬅️ Left", "⬆️ Centre", "➡️ Right"];
  var CRICKET_BAT = ["🛡️ Defend", "🏏 Drive", "🚀 Loft"];
  var CRICKET_BOWL = ["⚡ Pace", "🌀 Spin", "🐢 Slower"];

  function answerLabel(room, round, value, mine) {
    if (!round) return String(value == null ? "" : value);
    var opts = null;
    if (round.kind === "penalty") {
      opts = PEN_OPTS;
    } else if (round.kind === "cricket") {
      var iAmBatter = round.batter === room.me;
      var isBatter = mine ? iAmBatter : !iAmBatter;
      opts = isBatter ? CRICKET_BAT : CRICKET_BOWL;
    } else if (round.kind === "meter") {
      return (Number(value) || 0) + " meter";
    } else if (round.kind === "duck") {
      return (Number(value) || 0) + " duck";
    } else if (round.options && round.options.length) {
      opts = round.options;
    }
    if (opts) {
      var k = Number(value);
      if (opts[k] != null) return opts[k];
    }
    return String(value == null ? "" : value);
  }

  function cricketBoard(room) {
    var c = room.cricket;
    if (!c) return "";
    var my = room.me;
    var them = 1 - room.me;
    return '<div class="scoreboard">' +
      '<div class="score-side"><b>' + c.runs[my] + "/" + c.wickets[my] + "</b>" +
        "<span>" + esc(room.players[my] || "Tum") + " · " + c.balls[my] + " ball</span></div>" +
      '<div class="score-vs">vs</div>' +
      '<div class="score-side"><b>' + c.runs[them] + "/" + c.wickets[them] + "</b>" +
        "<span>" + esc(room.players[them] || "Partner") + " · " + c.balls[them] + " ball</span></div>" +
      "</div>";
  }

  function penaltyBoard(room) {
    var kicks = room.kick || [];
    var out = "";
    for (var i = 0; i < 10; i += 1) {
      var played = i < kicks.length;
      var goal = played && kicks[i];
      var cls = "kick" + (played ? (goal ? " goal" : " miss") : "") + (i % 2 === room.me ? " mine" : "");
      out += '<span class="' + cls + '">' + (played ? (goal ? "⚽" : "✕") : "•") + "</span>";
    }
    return '<div class="kick-row">' + out + "</div>";
  }

  function gameView() {
    var room = app.room;
    var game = gameById(room.game);
    var head = '<div class="game-top">' +
      '<button class="back" data-act="lobby">←</button>' +
      "<div>" +
        '<p class="kicker">' + esc(game ? game.sub : "") +
          (room.total > 1 ? " · " + (room.roundNo + 1) + "/" + room.total : "") + "</p>" +
        '<h1 class="h2 tight">' + (game ? game.emoji + " " + esc(game.title) : "") + "</h1>" +
      "</div>" +
      "</div>";

    if (room.phase === "done") return head + doneCard(room, game);

    var round = room.round;
    if (!round) {
      return head + '<section class="card connecting"><p class="mid">Round load ho raha hai…</p></section>';
    }

    if (round.kind === "board") return head + boardView(room) + pipsView(room);

    if (round.kind === "draw") return head + drawView(room);

    if (round.kind === "card") {
      return head +
        '<section class="card hero">' +
          '<p class="kicker">' + esc(round.tag || "card") + "</p>" +
          '<h2 class="prompt">' + esc(round.text) + "</h2>" +
          '<p class="tiny">Jo card aaya, woh karna hai. Koi point nahi, sirf maza.</p>' +
          '<button class="btn" data-act="next">' +
            (room.roundNo + 1 >= room.total ? "Khatam" : "Agla card") + "</button>" +
        "</section>" + pipsView(room);
    }

    if (room.phase === "reveal") {
      return head +
        (round.kind === "cricket" ? cricketBoard(room) : "") +
        (round.kind === "penalty" ? penaltyBoard(room) : "") +
        revealCard(room, round) + pipsView(room);
    }

    if (room.myAnswer != null) {
      var waitingScene = (round.kind === "penalty" || round.kind === "cricket" || round.kind === "meter")
        ? '<canvas class="scene" id="scene" width="640" height="420"></canvas>'
        : "";
      return head +
        '<section class="card center">' +
          waitingScene +
          '<p class="kicker">jawab chala gaya</p>' +
          '<h2 class="prompt">' + esc(answerLabel(room, round, room.myAnswer, true)) + "</h2>" +
          '<p class="sub">' + esc(room.players[1 - room.me] || "Partner") + ' ka intezaar… <span class="blink">●</span></p>' +
        "</section>" + pipsView(room);
    }

    var pick;
    if (round.kind === "text" || round.kind === "spell") {
      pick = '<textarea class="input area" id="answer" rows="3" placeholder="' +
        (round.kind === "spell" ? "Sahi spelling likho…" : "Seedha dil se likho…") + '"></textarea>' +
        '<button class="btn" data-act="answer-text">Lock jawab</button>';
    } else if (round.kind === "tap") {
      pick = '<div class="tap-pad" data-act="tap">' +
          '<span class="tap-count">0</span>' +
          '<span class="tap-label">tap tap tap</span>' +
        "</div>" +
        '<p class="tiny center"><span class="tap-left">' + (tapLeft() / 1000).toFixed(1) + "s</span> bacha</p>";
    } else if (round.kind === "react") {
      pick = '<div class="tap-pad react-pad" data-act="react">' +
          '<span class="react-label" id="react-label">Intezaar…</span>' +
        "</div>" +
        '<p class="tiny center">Jab rang badle tab tap karo. Pehle dabaya to 5 second penalty.</p>';
    } else if (round.kind === "duck") {
      pick = '<div class="duck-sky" id="duck-sky"><span class="duck-count" id="duck-count">0</span></div>' +
        '<p class="tiny center"><span class="tap-left">15.0s</span> bacha — duck pe tap karo</p>';
    } else if (round.kind === "penalty") {
      pick = '<canvas class="scene" id="scene" width="640" height="420"></canvas>' +
        '<div class="choices mini">' + (room.myOptions || []).map(function (option, index) {
          return '<button class="choice" data-act="answer" data-value="' + index + '">' + esc(option) + "</button>";
        }).join("") + "</div>" +
        '<p class="tiny center">Goal pe tap karo — ya neeche se direction chuno.</p>';
    } else if (round.kind === "cricket") {
      pick = '<canvas class="scene" id="scene" width="640" height="420"></canvas>' +
        '<div class="choices">' + (room.myOptions || []).map(function (option, index) {
          return '<button class="choice" data-act="answer" data-value="' + index + '">' + esc(option) + "</button>";
        }).join("") + "</div>";
    } else if (round.kind === "meter") {
      pick = '<canvas class="scene" id="scene" width="640" height="420"></canvas>' +
        '<div class="meter" data-act="meter">' +
          '<div class="meter-zone"></div>' +
          '<div class="meter-mark" id="meter-mark"></div>' +
        "</div>" +
        '<p class="tiny center">Tap karke meter ko beech me roko</p>';
    } else {
      var opts = room.myOptions || round.options || [];
      pick = '<div class="choices">' + opts.map(function (option, index) {
        return '<button class="choice" data-act="answer" data-value="' + index + '">' + esc(option) + "</button>";
      }).join("") + "</div>";
    }

    var prompt = round.text;
    if (round.kind === "penalty") {
      prompt = round.shooter === room.me ? "Tumhara shot — direction chuno" : "Tum keeper ho — dive kahan?";
    } else if (round.kind === "cricket") {
      prompt = round.batter === room.me ? "Tum batting pe ho — shot chuno" : "Tum bowling kar rahe ho — delivery chuno";
    }

    return head +
      (round.kind === "cricket" ? cricketBoard(room) : "") +
      (round.kind === "penalty" ? penaltyBoard(room) : "") +
      '<section class="card">' +
        '<p class="kicker">tumhari baari</p>' +
        '<h2 class="prompt">' + esc(prompt) + "</h2>" +
        pick +
      "</section>" + pipsView(room);
  }

  function notesView() {
    var list = app.notes.slice().reverse();
    var items = list.length
      ? list.map(function (note, i) {
          var real = app.notes.length - 1 - i;
          var meta = esc(note.from || app.name || "tum") + (note.at ? " · " + esc(note.at) : "");
          return '<div class="note">' +
            '<p class="note-text">' + esc(note.text) + "</p>" +
            '<p class="note-meta">' + meta + "</p>" +
            '<button class="mini" data-act="share-saved" data-i="' + real + '">Share</button>' +
            "</div>";
        }).join("")
      : '<p class="tiny">Abhi khaali hai. Pehla note tumhara.</p>';

    return topBar() +
      '<h1 class="h1 small" style="margin-top:4px">Notes</h1>' +
      '<p class="sub">Chhoti baatein, jo call pe kehna bhool jaate ho.</p>' +
      '<section class="card">' +
        '<textarea class="input area" id="note-text" rows="3" placeholder="Aaj tumhare baare me ek baat sochi…"></textarea>' +
        '<div class="row2">' +
          '<button class="btn" data-act="save-note">Save</button>' +
          '<button class="btn ghost" data-act="share-typed">Bhej do</button>' +
        "</div>" +
        '<p class="tiny">"Bhej do" ek link banata hai — woh link partner ke phone pe khulta hai.</p>' +
      "</section>" +
      '<section class="card">' + items + "</section>";
  }

  function privacyView() {
    return topBar() +
      '<h1 class="h1 small" style="margin-top:4px">Privacy</h1>' +
      '<p class="sub">Tumhare data ka poora hisaab — chhota aur saaf.</p>' +
      '<section class="card">' +
        '<p class="kicker">is phone pe</p>' +
        '<p class="mid">Naam, room code, notes, kitaab ke panno, scores — sab <b>tumhare browser ke localStorage</b> me rehte hain. Hamare paas iski copy nahi hai.</p>' +
        '<p class="tiny">Browser ka data clear karo ya "Sab kuch mita do" dabao — sab chala jaayega.</p>' +
      '</section>' +
      '<section class="card">' +
        '<p class="kicker">server pe (sirf memory)</p>' +
        '<p class="mid">Khel ke dauraan: room code, naam, jawab, chat, drawing strokes aur call signaling. Server restart hote hi sab mit jaata hai — koi database nahi.</p>' +
        '<p class="tiny">Koi analytics nahi, koi tracker nahi, koi ad nahi, koi account nahi.</p>' +
      '</section>' +
      '<section class="card">' +
        '<p class="kicker">bahar kya jaata hai</p>' +
        '<p class="mid">Default me kuch nahi. Sirf jab tum khud YouTube chuno (Saath Dekho) — tab Google se connect hota hai. "Sirf timer" me kuch nahi jaata.</p>' +
        '<p class="tiny">Fonts app ke andar se aate hain (koi Google Fonts request nahi). Call peer-to-peer hoti hai — awaaz/video server se nahi guzarte aur record nahi hote.</p>' +
      '</section>' +
      '<section class="card">' +
        '<p class="kicker">tumhare haq</p>' +
        '<p class="mid">Sab delete karne ke liye: <a href="#/us" style="color:var(--rose)">Tum</a> → "Sab kuch mita do". Room chhodne pe server ka data usi waqt hat jaata hai.</p>' +
        '<p class="tiny">Yeh app 18+ ke liye nahi hai — koi bhi khel sakta hai, par kuch bhi sensitive share karne se pehle soch lo.</p>' +
      '</section>';
  }

  function usView() {
    return topBar() +
      '<h1 class="h1 small" style="margin-top:4px">Tum</h1>' +
      '<section class="card">' +
        '<p class="mid">Naam: <b>' + esc(app.name || "—") + "</b></p>" +
        (app.code ? '<p class="mid">Room: <b>' + esc(app.code) + "</b></p>" : "") +
        (app.code ? '<button class="btn ghost" data-act="leave">Room chhodo</button>' : "") +
        '<p class="tiny">Naam badalna ho to room chhodo, phir naya banao.</p>' +
      "</section>" +
      '<section class="card soft">' +
        '<p class="mid">App home screen pe: Safari me Share → <b>Add to Home Screen</b>.</p>' +
        '<a class="btn ghost" href="#/privacy">Privacy — kya save hota hai</a>' +
        '<button class="btn ghost danger" data-act="reset">Sab kuch mita do</button>' +
      "</section>";
  }

  function incomingView(payload) {
    if (!payload) {
      return topBar() +
        '<section class="card hero">' +
          '<p class="kicker">link</p>' +
          '<h1 class="h1 small">Yeh link toota lagta hai</h1>' +
          '<p class="sub">Dobara bhejne ko bolo.</p>' +
          '<a class="btn" href="#/">Home</a>' +
        "</section>";
    }
    if (payload.t === "note") {
      return topBar() +
        '<section class="card hero">' +
          '<p class="kicker">' + esc(payload.from || "Partner") + " ka note</p>" +
          '<p class="quote">' + esc(payload.text || "") + "</p>" +
          '<button class="btn" data-act="keep-note" data-text="' + esc(payload.text || "") +
            '" data-from="' + esc(payload.from || "") + '">Apne wall pe rakho</button>' +
          '<a class="btn ghost" href="#/">Home</a>' +
        "</section>";
    }
    return topBar() +
      '<section class="card hero">' +
        '<p class="kicker">link</p>' +
        '<h1 class="h1 small">Kuch samajh nahi aaya</h1>' +
        '<a class="btn" href="#/">Home</a>' +
      "</section>";
  }

  /* ----------------------------------------------------------- chat + call */

  var chat = { open: false, count: -1 };
  var call = { pc: null, stream: null, open: false, sig: 0, ice: [], until: 0 };

  function ensureChat() {
    if (document.getElementById("chat-sheet")) return;
    var sheet = document.createElement("div");
    sheet.id = "chat-sheet";
    sheet.className = "sheet";
    sheet.innerHTML =
      '<div class="sheet-head"><span>Chat</span>' +
        '<button type="button" data-sheet="close-chat">✕</button></div>' +
      '<div class="sheet-body" id="chat-list"></div>' +
      '<div class="sheet-foot">' +
        '<input class="input" id="chat-input" autocomplete="off" placeholder="Message likho…">' +
        '<button type="button" data-sheet="send-chat">Bhejo</button>' +
      "</div>";
    document.body.appendChild(sheet);
  }

  function openChat() {
    ensureChat();
    chat.open = true;
    var sheet = document.getElementById("chat-sheet");
    if (sheet) sheet.classList.add("open");
    paintChat();
    var input = document.getElementById("chat-input");
    if (input) input.focus();
  }

  function closeChat() {
    chat.open = false;
    var sheet = document.getElementById("chat-sheet");
    if (sheet) sheet.classList.remove("open");
  }

  function paintChat() {
    var list = document.getElementById("chat-list");
    var room = app.room;
    if (!list || !room) return;
    var html = (room.chat || []).map(function (m) {
      var mine = m.from === room.me;
      return '<div class="bubble ' + (mine ? "mine" : "theirs") + '">' + esc(m.text) + "</div>";
    }).join("");
    if (!html) html = '<p class="tiny center">Abhi koi message nahi. Pehla tumhara.</p>';
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
  }

  function sendChat() {
    var input = document.getElementById("chat-input");
    if (!input) return;
    var text = String(input.value || "").trim();
    if (!text) return;
    input.value = "";
    post("/api/say", { code: app.code, pid: app.pid, text: text });
  }

  function syncChat() {
    var room = app.room;
    var count = room && room.chat ? room.chat.length : 0;
    if (count !== chat.count) {
      chat.count = count;
      if (chat.open) paintChat();
    }
  }

  function ensureCallUi() {
    if (document.getElementById("call-ui")) return;
    var ui = document.createElement("div");
    ui.id = "call-ui";
    ui.className = "call-ui";
    ui.innerHTML =
      '<div class="call-card">' +
        '<video id="call-video" class="call-video" autoplay playsinline></video>' +
        '<video id="call-self" class="call-self" autoplay playsinline muted></video>' +
        '<p class="kicker">call</p>' +
        '<h2 class="h1 small" id="call-title">…</h2>' +
        '<p class="sub" id="call-note">…</p>' +
        '<div class="call-actions" id="call-actions"></div>' +
      "</div>";
    document.body.appendChild(ui);
    var audio = document.createElement("audio");
    audio.id = "call-audio";
    audio.autoplay = true;
    audio.setAttribute("playsinline", "");
    document.body.appendChild(audio);
  }

  var CALL_ACTIONS = {
    incoming: '<button class="btn" data-sheet="accept-call">Uthao</button>' +
      '<button class="btn ghost" data-sheet="end-call">Reject</button>',
    outgoing: '<button class="btn ghost" data-sheet="end-call">Band karo</button>',
    active: '<div class="call-toggles">' +
      '<button class="pill" data-sheet="toggle-mic">🎤</button>' +
      '<button class="pill" data-sheet="toggle-cam">📷</button>' +
      "</div>" +
      '<button class="btn ghost" data-sheet="end-call">Call band karo</button>'
  };

  function showCall(title, note, actions) {
    ensureCallUi();
    var ui = document.getElementById("call-ui");
    if (!ui) return;
    document.getElementById("call-kicker").textContent = "call";
    document.getElementById("call-title").textContent = title;
    document.getElementById("call-note").textContent = note;
    document.getElementById("call-actions").innerHTML = actions;
    ui.classList.add("open");
    call.open = true;
  }

  function hideCall() {
    var ui = document.getElementById("call-ui");
    if (ui) ui.classList.remove("open");
    call.open = false;
  }

  function syncCall() {
    var room = app.room;
    if (!room) {
      if (call.open) cleanupCall();
      return;
    }
    if (call.until && Date.now() < call.until) return;
    var info = room.call;
    if (!info) {
      if (call.open) cleanupCall();
      return;
    }
    var them = room.players[1 - room.me] || "Partner";
    if (info.state === "ringing" && info.from === room.me) {
      showCall("Ring ho raha hai…", them + " ka intezaar", CALL_ACTIONS.outgoing);
    } else if (info.state === "ringing") {
      showCall(them, "Call kar rahe hain", CALL_ACTIONS.incoming);
    } else {
      if (!call.pc) activateCall();
      showCall(them, call.pc && call.pc.connectionState === "connected" ? "Connected" : "Jud raha hai…", CALL_ACTIONS.active);
    }
    processSignals(room);
  }

  function processSignals(room) {
    var sigs = room.signals || [];
    for (var i = 0; i < sigs.length; i += 1) {
      var s = sigs[i];
      if (s.id <= call.sig) continue;
      call.sig = s.id;
      handleSignal(s);
    }
  }

  function handleSignal(s) {
    if (!call.pc) return;
    if (s.kind === "offer") {
      call.pc.setRemoteDescription(new RTCSessionDescription(s.data))
        .then(function () { return call.pc.createAnswer(); })
        .then(function (answer) { return call.pc.setLocalDescription(answer); })
        .then(function () {
          sendSignal("answer", call.pc.localDescription);
          flushIce();
        })
        .catch(function () {});
    } else if (s.kind === "answer") {
      call.pc.setRemoteDescription(new RTCSessionDescription(s.data))
        .then(flushIce)
        .catch(function () {});
    } else if (s.kind === "ice") {
      if (call.pc.remoteDescription) {
        call.pc.addIceCandidate(new RTCIceCandidate(s.data)).catch(function () {});
      } else {
        call.ice.push(s.data);
      }
    }
  }

  function flushIce() {
    while (call.ice.length) {
      var data = call.ice.shift();
      call.pc.addIceCandidate(new RTCIceCandidate(data)).catch(function () {});
    }
  }

  function sendSignal(kind, data) {
    if (!app.code) return;
    api("/api/signal", { code: app.code, pid: app.pid, kind: kind, data: data })
      .catch(function () {});
  }

  function activateCall() {
    var room = app.room;
    if (!room || !room.call) return;
    ensureCallUi();
    var pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    call.pc = pc;
    if (call.stream) {
      call.stream.getTracks().forEach(function (track) { pc.addTrack(track, call.stream); });
    }
    pc.ontrack = function (event) {
      var stream = event.streams && event.streams[0];
      if (!stream) return;
      if (event.track.kind === "video") {
        var video = document.getElementById("call-video");
        if (video) {
          video.srcObject = stream;
          video.classList.add("on");
          video.play().catch(function () {});
        }
        var audioEl = document.getElementById("call-audio");
        if (audioEl) audioEl.srcObject = null;
      } else {
        var videoNode = document.getElementById("call-video");
        if (videoNode && videoNode.srcObject) return;
        var audioNode = document.getElementById("call-audio");
        if (audioNode) {
          audioNode.srcObject = stream;
          audioNode.play().catch(function () {});
        }
      }
    };
    pc.onicecandidate = function (event) {
      if (event.candidate) sendSignal("ice", event.candidate);
    };
    if (room.call.from === room.me) {
      pc.createOffer()
        .then(function (offer) { return pc.setLocalDescription(offer); })
        .then(function () { sendSignal("offer", pc.localDescription); })
        .catch(function () {});
    }
  }

  function openMedia() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    return navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } })
      .catch(function () {
        return navigator.mediaDevices.getUserMedia({ audio: true });
      });
  }

  function attachSelf(stream) {
    ensureCallUi();
    var self = document.getElementById("call-self");
    if (self) {
      self.srcObject = stream;
      self.classList.add("on");
      self.play().catch(function () {});
    }
  }

  function toggleTrack(kind) {
    if (!call.stream) return;
    var tracks = call.stream.getTracks();
    for (var i = 0; i < tracks.length; i += 1) {
      if (tracks[i].kind === kind) tracks[i].enabled = !tracks[i].enabled;
    }
  }

  function startCall() {
    if (!app.room) return;
    if (app.room.players.length < 2) return toast("Partner online nahi hai");
    var pending = openMedia();
    if (!pending) return toast("Is browser me mic/camera nahi milta — normal call karo");
    toast("Camera/mic ki permission maang rahe hain…");
    pending.then(function (stream) {
      call.stream = stream;
      attachSelf(stream);
      api("/api/call", { code: app.code, pid: app.pid, action: "ring" })
        .then(function (res) {
          if (res && res.ok && res.room) applyRoom(res.room);
          else toast((res && res.error) || "Ring nahi hua");
        })
        .catch(function () { toast("Server se baat nahi hui"); });
    }).catch(function () {
      toast("Mic/camera permission nahi mili — browser settings me allow karo");
    });
  }

  function acceptCall() {
    var pending = openMedia();
    if (!pending) {
      toast("Is browser me mic/camera nahi milta");
      endCall();
      return;
    }
    pending.then(function (stream) {
      call.stream = stream;
      attachSelf(stream);
      post("/api/call", { code: app.code, pid: app.pid, action: "accept" });
    }).catch(function () {
      toast("Mic/camera permission nahi mili");
      endCall();
    });
  }

  function endCall() {
    cleanupCall();
    call.until = Date.now() + 2000;
    if (app.code) {
      post("/api/call", { code: app.code, pid: app.pid, action: "end" });
    }
  }

  function cleanupCall() {
    if (call.pc) {
      try { call.pc.close(); } catch (e) { /* pehle se band */ }
      call.pc = null;
    }
    if (call.stream) {
      call.stream.getTracks().forEach(function (track) { track.stop(); });
      call.stream = null;
    }
    call.ice = [];
    call.sig = 0;
    hideCall();
    var audio = document.getElementById("call-audio");
    if (audio) audio.srcObject = null;
    var video = document.getElementById("call-video");
    if (video) {
      video.srcObject = null;
      video.classList.remove("on");
    }
    var self = document.getElementById("call-self");
    if (self) {
      self.srcObject = null;
      self.classList.remove("on");
    }
  }

  /* -------------------------------------------------------------- scene */

  var scene = { raf: null, kind: "" };

  function stopScene() {
    if (scene.raf) {
      cancelAnimationFrame(scene.raf);
      scene.raf = null;
    }
    scene.kind = "";
  }

  function sceneState(room, elapsed) {
    var round = room.round;
    var revealed = room.phase === "reveal" || room.phase === "done";
    var st = {
      mode: revealed ? "shot" : "aim",
      t: Math.min(1, elapsed / 0.9)
    };

    if (round.kind === "penalty") {
      var kick = room.roundKick || {};
      st.targetZone = revealed ? Number(kick.target) : null;
      st.diveZone = revealed ? Number(kick.dive) : null;
      st.saved = revealed ? !kick.goal : false;
      st.aim = !revealed && app.aim ? { zone: app.aim.zone } : null;
    } else if (round.kind === "meter") {
      st.aim = Number(revealed ? room.myAnswer : meter.pos) || 0;
      st.points = revealed && room.meterPoints ? (Number(room.meterPoints[room.me]) || 0) : 0;
    } else if (round.kind === "cricket") {
      var ball = room.roundBall || {};
      st.out = revealed ? !!ball.out : false;
      st.runs = revealed ? (Number(ball.runs) || 0) : 0;
    }
    return st;
  }

  function startScene() {
    stopScene();
    var room = app.room;
    if (!room || !room.round) return;
    var kind = room.round.kind;
    if (kind !== "penalty" && kind !== "cricket" && kind !== "meter") return;
    var canvas = document.getElementById("scene");
    if (!canvas || !window.Jodi3D) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    scene.kind = kind;

    if (kind === "penalty" && room.phase === "answering" && room.myAnswer == null) {
      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", function (e) {
        if (!app.room || app.room.phase !== "answering" || app.room.myAnswer != null) return;
        var rect = canvas.getBoundingClientRect();
        var fx = (e.clientX - rect.left) / rect.width;
        var zone = fx < 0.36 ? 0 : fx > 0.64 ? 2 : 1;
        app.aim = { zone: zone };
        submit(String(zone));
      });
    }

    var begin = performance.now();
    var frame = function (now) {
      if (!app.room || !app.room.round) return;
      var st = sceneState(app.room, (now - begin) / 1000);
      if (kind === "penalty") window.Jodi3D.penalty(ctx, st);
      else if (kind === "meter") window.Jodi3D.hoop(ctx, st);
      else window.Jodi3D.cricket(ctx, st);
      scene.raf = requestAnimationFrame(frame);
    };
    scene.raf = requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- draw */

  var drawState = {
    canvas: null, ctx: null, last: null, painting: false,
    pending: [], since: 0, fetchTimer: null, flushTimer: null, tickTimer: null
  };

  function stopDraw() {
    if (drawState.fetchTimer) { clearInterval(drawState.fetchTimer); drawState.fetchTimer = null; }
    if (drawState.flushTimer) { clearInterval(drawState.flushTimer); drawState.flushTimer = null; }
    if (drawState.tickTimer) { clearInterval(drawState.tickTimer); drawState.tickTimer = null; }
    drawState.pending = [];
    drawState.painting = false;
    drawState.last = null;
    drawState.since = 0;
  }

  function drawSeg(ctx, canvas, s) {
    var x0 = (s[0] / 1000) * canvas.width;
    var y0 = (s[1] / 1000) * canvas.height;
    var x1 = (s[2] / 1000) * canvas.width;
    var y1 = (s[3] / 1000) * canvas.height;
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#3A2733";
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 === x0 && y1 === y0 ? x0 + 0.1 : x1, y1);
    ctx.stroke();
  }

  function fetchStrokes(canvas, ctx, reset) {
    if (reset) {
      drawState.since = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    api("/api/strokes?code=" + encodeURIComponent(app.code) +
      "&pid=" + encodeURIComponent(app.pid) + "&since=" + drawState.since)
      .then(function (res) {
        if (!res || !res.ok || !res.segments) return;
        if (res.count < drawState.since) {
          drawState.since = 0;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        for (var i = 0; i < res.segments.length; i += 1) drawSeg(ctx, canvas, res.segments[i]);
        drawState.since = res.count;
      })
      .catch(function () {});
  }

  function setupDraw() {
    stopDraw();
    var room = app.room;
    if (!room || !room.draw) return;
    var canvas = document.getElementById("draw-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawState.canvas = canvas;
    drawState.ctx = ctx;

    fetchStrokes(canvas, ctx, true);

    drawState.tickTimer = setInterval(function () {
      var el = document.getElementById("draw-timer");
      if (!el || !app.room || !app.room.draw) return;
      var left = Math.max(0, ((app.room.draw.endsAt || 0) - app.skew) - Date.now());
      el.textContent = Math.ceil(left / 1000) + "s";
    }, 300);

    var iAmPainter = room.draw.painter === room.me && !room.draw.revealed;

    if (!iAmPainter) {
      drawState.fetchTimer = setInterval(function () {
        if (!app.room || !app.room.draw || app.room.draw.revealed) return;
        fetchStrokes(canvas, ctx, false);
      }, 350);
      return;
    }

    function point(e) {
      var rect = canvas.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 1000;
      var y = ((e.clientY - rect.top) / rect.height) * 1000;
      return [
        Math.max(0, Math.min(1000, Math.round(x))),
        Math.max(0, Math.min(1000, Math.round(y)))
      ];
    }

    canvas.addEventListener("pointerdown", function (e) {
      if (!app.room || !app.room.draw || app.room.draw.revealed) return;
      e.preventDefault();
      drawState.painting = true;
      drawState.last = point(e);
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!drawState.painting) return;
      e.preventDefault();
      var p = point(e);
      var a = drawState.last;
      if (!a) { drawState.last = p; return; }
      if (Math.abs(p[0] - a[0]) < 2 && Math.abs(p[1] - a[1]) < 2) return;
      var s = [a[0], a[1], p[0], p[1]];
      drawState.last = p;
      drawSeg(ctx, canvas, s);
      drawState.pending.push(s);
    });

    var release = function () {
      drawState.painting = false;
      drawState.last = null;
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerleave", release);

    drawState.flushTimer = setInterval(function () {
      if (!drawState.pending.length) return;
      var batch = drawState.pending.slice(0, 120);
      drawState.pending = drawState.pending.slice(batch.length);
      api("/api/paint", { code: app.code, pid: app.pid, segments: batch }).catch(function () {});
    }, 180);
  }

  function drawClear() {
    var canvas = document.getElementById("draw-canvas");
    if (canvas) {
      var ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    api("/api/paint", { code: app.code, pid: app.pid, clear: true }).catch(function () {});
  }

  function drawGuess() {
    var el = document.getElementById("draw-guess-input");
    var text = el ? String(el.value || "").trim() : "";
    if (!text) return;
    if (el) el.value = "";
    post("/api/guess", { code: app.code, pid: app.pid, text: text });
  }

  function drawView(room) {
    var d = room.draw;
    if (!d) return '<section class="card"><p class="mid">Drawing load ho rahi hai…</p></section>';

    var iAmPainter = d.painter === room.me;
    var canvas = '<canvas id="draw-canvas" class="draw-canvas" width="640" height="480"></canvas>';
    var head = '<div class="draw-top">' +
      '<span class="kicker">round ' + (d.round + 1) + "/" + d.total + "</span>" +
      (d.revealed ? "" : '<span class="draw-timer" id="draw-timer">90s</span>') +
      "</div>";

    if (d.revealed) {
      return head +
        '<section class="card">' +
          '<p class="verdict good">Word tha: ' + esc(d.answer || "") + "</p>" +
          canvas +
          '<button class="btn" data-act="next">' +
            (d.round + 1 >= d.total ? "Khatam" : "Agla round") + "</button>" +
        "</section>";
    }

    if (iAmPainter) {
      return head +
        '<section class="card">' +
          '<p class="kicker">tum banao — partner pehchane</p>' +
          '<h2 class="prompt">' + esc(d.word || "") + "</h2>" +
          canvas +
          '<button class="btn ghost" data-act="draw-clear">Saaf karo</button>' +
        "</section>";
    }

    return head +
      '<section class="card">' +
        '<p class="kicker">tumhara andaza</p>' +
        '<h2 class="prompt">' + esc(d.masked || "") + "</h2>" +
        canvas +
        '<label class="field" style="margin-top:12px"><span>Kya bana hai?</span>' +
          '<input class="input" id="draw-guess-input" autocomplete="off" placeholder="Guess likho…"></label>' +
        '<button class="btn" data-act="draw-guess">Bhejo</button>' +
        (d.guesses && d.guesses.length
          ? '<p class="tiny center">Pehle ke andaze: ' + esc(d.guesses.join(" · ")) + "</p>"
          : "") +
      "</section>";
  }

  /* ----------------------------------------------------------- duck/meter */

  var duck = { spawner: null, killer: null, count: 0, live: [], running: false };
  var meter = { timer: null, pos: 0, dir: 1 };

  function stopDuck() {
    if (duck.spawner) { clearInterval(duck.spawner); duck.spawner = null; }
    if (duck.killer) { clearInterval(duck.killer); duck.killer = null; }
    duck.running = false;
    duck.live = [];
  }

  function spawnDuck(sky) {
    if (!sky || duck.live.length > 5) return;
    var el = document.createElement("button");
    el.type = "button";
    el.className = "duck";
    el.textContent = "🦆";
    el.style.left = (6 + Math.random() * 74) + "%";
    el.style.top = (12 + Math.random() * 60) + "%";
    el.addEventListener("click", function () {
      if (!duck.running) return;
      duck.count += 1;
      var counter = document.getElementById("duck-count");
      if (counter) counter.textContent = String(duck.count);
      el.remove();
      duck.live = duck.live.filter(function (node) { return node !== el; });
    });
    sky.appendChild(el);
    duck.live.push(el);
    setTimeout(function () {
      if (el.parentNode) el.remove();
      duck.live = duck.live.filter(function (node) { return node !== el; });
    }, 1500);
  }

  function armDuck() {
    stopDuck();
    var sky = document.getElementById("duck-sky");
    var room = app.room;
    if (!sky || !room || room.phase !== "answering" || room.myAnswer != null) return;
    if (!room.round || room.round.kind !== "duck") return;
    duck.running = true;
    duck.count = 0;
    spawnDuck(sky);
    duck.spawner = setInterval(function () {
      if (tapLeft() <= 0) { finishDuck(); return; }
      spawnDuck(sky);
    }, 650);
    duck.killer = setInterval(function () {
      var left = root.querySelector(".tap-left");
      if (left) left.textContent = (tapLeft() / 1000).toFixed(1) + "s";
      if (tapLeft() <= 0) finishDuck();
    }, 120);
  }

  function finishDuck() {
    if (!duck.running) return;
    var count = duck.count;
    stopDuck();
    submit(String(count));
  }

  function stopMeter() {
    if (meter.timer) { clearInterval(meter.timer); meter.timer = null; }
  }

  function armMeter() {
    stopMeter();
    var room = app.room;
    if (!room || room.phase !== "answering" || room.myAnswer != null) return;
    if (!room.round || room.round.kind !== "meter") return;
    if (!document.getElementById("meter-mark")) return;
    meter.pos = 0;
    meter.dir = 1;
    meter.timer = setInterval(function () {
      meter.pos += meter.dir * 3.4;
      if (meter.pos >= 100) { meter.pos = 100; meter.dir = -1; }
      if (meter.pos <= 0) { meter.pos = 0; meter.dir = 1; }
      var mark = document.getElementById("meter-mark");
      if (mark) mark.style.left = meter.pos + "%";
    }, 24);
  }

  function meterTap() {
    var room = app.room;
    if (!room || !room.round || room.round.kind !== "meter" || room.myAnswer != null) return;
    var at = Math.round(meter.pos);
    stopMeter();
    submit(String(at));
  }

  /* ---------------------------------------------------------------- book */

  function dayKeyOf(ms) {
    var d = new Date(ms || Date.now());
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function dayOf(ms) {
    return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function hasBookKey(key) {
    return app.bookKeys.indexOf(key) >= 0;
  }

  function addBookKey(key) {
    app.bookKeys.push(key);
    if (app.bookKeys.length > 400) app.bookKeys = app.bookKeys.slice(-400);
  }

  function pushPage(page) {
    app.book.push(page);
    if (app.book.length > 500) app.book = app.book.slice(-500);
    save();
  }

  function recordRound(room) {
    if (!room || room.phase !== "reveal" || !room.round) return;
    if (room.bots && room.bots.some(function (b) { return b; })) return;
    if (room.myAnswer == null || room.theirAnswer == null) return;
    var key = room.code + ":" + room.game + ":" + room.roundNo;
    if (hasBookKey(key)) return;
    addBookKey(key);

    var round = room.round;
    var mine = answerLabel(room, round, room.myAnswer, true);
    var theirs = answerLabel(room, round, room.theirAnswer, false);
    var result = room.lastMatch ? "match" : "alag";

    if (round.kind === "quiz") {
      result = room.quizRight && room.quizRight[room.me] ? "sahi" : "galat";
    } else if (round.kind === "spell") {
      result = room.spellRight && room.spellRight[room.me] ? "sahi" : "galat";
    } else if (round.kind === "penalty") {
      result = room.roundKick && room.roundKick.goal ? "sahi" : "galat";
    } else if (round.kind === "cricket") {
      result = room.roundBall && room.roundBall.out ? "galat" : "sahi";
    } else if (round.kind === "meter" || round.kind === "duck") {
      result = "";
    } else if (round.kind === "rps") {
      result = room.rpsWinner === -1 ? "barabar" : (room.rpsWinner === room.me ? "jeeta" : "haara");
    } else if (round.kind === "tap" || round.kind === "react") {
      var a = Number(room.myAnswer);
      var b = Number(room.theirAnswer);
      if (a === b) result = "barabar";
      else if (round.kind === "tap") result = a > b ? "jeeta" : "haara";
      else result = a < b ? "jeeta" : "haara";
    }

    pushPage({
      at: Date.now(),
      game: room.game,
      kind: round.kind,
      prompt: round.text,
      mine: String(mine == null ? "" : mine),
      theirs: String(theirs == null ? "" : theirs),
      mineName: room.players[room.me] || "Tum",
      theirsName: room.players[1 - room.me] || "Partner",
      result: result
    });
  }

  function recordBoard(room) {
    if (!room || room.phase !== "done" || !room.board) return;
    if (room.bots && room.bots.some(function (b) { return b; })) return;
    var sc = room.score || [0, 0];
    var key = room.code + ":" + room.game + ":board:" + sc[0] + "-" + sc[1] + ":" + room.board.cells.join(",");
    if (hasBookKey(key)) return;
    addBookKey(key);

    var winner = room.board.winner;
    var game = gameById(room.game);
    pushPage({
      at: Date.now(),
      game: room.game,
      kind: "board",
      prompt: game ? game.title : room.game,
      mine: winner === room.me ? "Jeeta 🏆" : winner === -1 ? "Barabar" : "Haara",
      theirs: "Score " + sc[0] + " – " + sc[1],
      mineName: room.players[room.me] || "Tum",
      theirsName: room.players[1 - room.me] || "Partner",
      result: winner === room.me ? "jeeta" : winner === -1 ? "barabar" : "haara"
    });
  }

  function bookStreak() {
    if (!app.book.length) return 0;
    var days = {};
    app.book.forEach(function (page) { days[dayKeyOf(page.at)] = true; });
    var d = new Date();
    if (!days[dayKeyOf(d.getTime())]) d.setDate(d.getDate() - 1);
    var streak = 0;
    while (days[dayKeyOf(d.getTime())]) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function resultText(result) {
    return {
      match: "Match",
      alag: "Alag alag",
      jeeta: "Tum jeete",
      haara: "Tum haare",
      barabar: "Barabar",
      sahi: "Sahi",
      galat: "Galat"
    }[result] || "";
  }

  function ritualCard() {
    var today = dayKeyOf(Date.now());
    var todays = app.book.filter(function (page) { return dayKeyOf(page.at) === today; });
    var asked = todays.some(function (page) { return page.game === "daily"; });
    var played = todays.length > 0;
    var noted = app.notes.some(function (note) { return note.at === today; });
    var done = (asked ? 1 : 0) + (played ? 1 : 0) + (noted ? 1 : 0);
    var streak = bookStreak();
    var tick = function (ok) { return ok ? "✓" : "○"; };

    return '<a class="card ritual" href="#/book" style="display:block;text-decoration:none;color:inherit">' +
      '<p class="kicker">aaj ka ritual · ' + done + "/3</p>" +
      '<p class="mid">' + tick(asked) + " Aaj ka sawaal &nbsp;·&nbsp; " + tick(played) +
        " Ek game &nbsp;·&nbsp; " + tick(noted) + " Ek note</p>" +
      '<p class="tiny">' + (streak > 1 ? "🔥 " + streak + " din se kitaab likh rahi hai" : "Aaj pehla panna likho") +
        " · Hamari Kitaab kholo →</p>" +
      "</a>";
  }

  function bookText() {
    var lines = ["Hamari Kitaab — Jodi", ""];
    app.book.forEach(function (page) {
      var game = gameById(page.game);
      lines.push(dayOf(page.at) + " · " + (game ? game.title : page.game));
      lines.push(page.prompt);
      lines.push((page.mineName || "Tum") + ": " + page.mine);
      if (page.theirs) lines.push((page.theirsName || "Partner") + ": " + page.theirs);
      var tag = resultText(page.result);
      if (tag) lines.push("(" + tag + ")");
      lines.push("");
    });
    return lines.join("\n");
  }

  function shareBook() {
    if (!app.book.length) return toast("Kitaab me abhi kuch nahi");
    var text = bookText();
    if (navigator.share) {
      navigator.share({ title: "Hamari Kitaab", text: text })
        .catch(function () { copyText(text, "Kitaab copy ho gayi"); });
      return;
    }
    copyText(text, "Kitaab copy ho gayi");
  }

  function clearBook() {
    if (!window.confirm("Kitaab ke saare panno mit jaayenge. Pakka?")) return;
    app.book = [];
    app.bookKeys = [];
    save();
    render();
  }

  function bookView() {
    var entries = app.book.slice().reverse();
    var streak = bookStreak();
    var head = topBar() +
      '<h1 class="h1 small" style="margin-top:4px">Hamari Kitaab</h1>' +
      '<p class="sub">Jo tum dono ne khela, woh yahan apne aap likh jaata hai — is phone pe.</p>';

    if (!entries.length) {
      return head +
        '<section class="card hero">' +
          '<p class="kicker">pehla panna</p>' +
          '<h1 class="h1 small">Kitaab khaali hai.</h1>' +
          '<p class="sub">Ek game khelo — har round ka apna panna ban jaayega.</p>' +
          '<a class="btn" href="#/">Khelo</a>' +
        "</section>";
    }

    var groups = {};
    var order = [];
    entries.forEach(function (page) {
      var key = dayKeyOf(page.at);
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(page);
    });

    var pages = order.map(function (key) {
      var items = groups[key].map(function (page) {
        var game = gameById(page.game);
        var tag = resultText(page.result);
        return '<div class="page">' +
          '<p class="page-game">' + (game ? game.emoji + " " + esc(game.title) : esc(page.game)) + "</p>" +
          '<p class="page-q">' + esc(page.prompt) + "</p>" +
          '<p class="page-a"><b>' + esc(page.mineName || "Tum") + "</b>" + esc(page.mine) + "</p>" +
          (page.theirs ? '<p class="page-a"><b>' + esc(page.theirsName || "Partner") + "</b>" + esc(page.theirs) + "</p>" : "") +
          (tag ? '<span class="page-tag">' + esc(tag) + "</span>" : "") +
          "</div>";
      }).join("");
      return '<h2 class="h2">' + esc(dayOf(groups[key][0].at)) + "</h2>" +
        '<section class="card">' + items + "</section>";
    }).join("");

    return head +
      '<div class="stats one">' +
        "<div class=\"stat\"><b>" + app.book.length + "</b><span>panno</span></div>" +
        "<div class=\"stat\"><b>" + Object.keys(groups).length + "</b><span>din</span></div>" +
        "<div class=\"stat\"><b>" + streak + "</b><span>din ka streak</span></div>" +
      "</div>" +
      pages +
      '<button class="btn" data-act="share-book">Kitaab bhejo</button>' +
      '<button class="btn ghost danger" data-act="clear-book">Kitaab saaf karo</button>';
  }

  /* ---------------------------------------------------------- saath dekho */

  var watch = { open: false, videoId: "", loaded: false, stageKey: "", timer: null };

  function ensureWatchUi() {
    if (document.getElementById("watch-ui")) return;
    var el = document.createElement("div");
    el.id = "watch-ui";
    el.className = "call-ui";
    el.innerHTML =
      '<div class="call-card watch-card">' +
        '<p class="kicker">saath dekho</p>' +
        '<h2 class="h1 small" id="watch-title">Movie night</h2>' +
        '<div id="watch-stage"></div>' +
        '<div class="call-actions" id="watch-actions"></div>' +
      "</div>";
    document.body.appendChild(el);
  }

  function showWatchShell() {
    ensureWatchUi();
    var ui = document.getElementById("watch-ui");
    if (ui) ui.classList.add("open");
    watch.open = true;
  }

  function closeWatch() {
    if (watch.timer) { clearInterval(watch.timer); watch.timer = null; }
    var ui = document.getElementById("watch-ui");
    if (ui) ui.classList.remove("open");
    watch.open = false;
    watch.loaded = false;
    watch.stageKey = "";
    watch.videoId = "";
  }

  function openWatch() {
    if (!app.room || app.room.players.length < 2) return toast("Partner online nahi hai");
    if (app.room.watch) { syncWatch(); return; }
    showWatchShell();
    var stage = document.getElementById("watch-stage");
    var actions = document.getElementById("watch-actions");
    var title = document.getElementById("watch-title");
    if (title) title.textContent = "Movie night";
    if (stage) {
      stage.innerHTML =
        '<label class="field"><span>YouTube link</span>' +
        '<input class="input" id="watch-link" autocomplete="off" placeholder="https://youtu.be/…"></label>' +
        '<p class="tiny">Dono phone pe ek hi waqt video shuru hoga. Netflix/Prime is browser me nahi chalega — ' +
        "unke liye 'sirf timer' chuno.</p>";
    }
    if (actions) {
      actions.innerHTML =
        '<button class="btn" data-sheet="watch-play">Saath shuru karo</button>' +
        '<button class="btn ghost" data-sheet="watch-timer">Sirf timer (koi bhi app)</button>' +
        '<button class="btn ghost" data-sheet="close-watch">Band karo</button>';
    }
  }

  function parseYouTube(text) {
    var raw = String(text || "").trim();
    var m = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,20})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{6,20}$/.test(raw)) return raw;
    return "";
  }

  function startWatch(solo) {
    var el = document.getElementById("watch-link");
    var id = solo ? "timer" : parseYouTube(el ? el.value : "");
    if (!id) return toast("YouTube link samajh nahi aaya");
    if (!solo && !window.confirm("YouTube Google se connect hota hai — tumhara IP aur video id Google ko jaayega. Privacy chahiye to 'Sirf timer' chuno. Aage badhun?")) {
      return;
    }
    post("/api/watch", { code: app.code, pid: app.pid, action: "set", videoId: id });
  }

  function stopWatch() {
    post("/api/watch", { code: app.code, pid: app.pid, action: "stop" });
    closeWatch();
  }

  function syncWatch() {
    var room = app.room;
    var info = room ? room.watch : null;
    if (!info) {
      if (watch.open) closeWatch();
      return;
    }
    showWatchShell();
    if (watch.videoId !== info.videoId) {
      watch.videoId = info.videoId;
      watch.loaded = false;
      watch.stageKey = "";
    }
    paintWatch(info);
  }

  function paintWatch(info) {
    var stage = document.getElementById("watch-stage");
    var actions = document.getElementById("watch-actions");
    var title = document.getElementById("watch-title");
    if (!stage || !actions || !info) return;

    var now = Date.now() + app.skew;
    var left = info.startedAt - now;
    var elapsed = Math.max(0, Math.floor((now - info.startedAt) / 1000));
    var timerOnly = info.videoId === "timer";

    if (left > 0) {
      if (title) title.textContent = "Shuru hone wala hai";
      var count = stage.querySelector(".watch-count");
      if (!count) {
        stage.innerHTML = '<p class="watch-count">' + Math.ceil(left / 1000) + "</p>" +
          '<p class="tiny center">Dono phone pe yahi countdown chal raha hai. 0 hote hi play.</p>';
        actions.innerHTML = '<button class="btn ghost" data-sheet="watch-stop">Cancel</button>';
      } else {
        count.textContent = String(Math.ceil(left / 1000));
      }
      return;
    }

    var key = info.videoId + ":play";
    if (watch.stageKey === key) return;
    watch.stageKey = key;

    if (timerOnly) {
      stage.innerHTML = '<p class="watch-count"><span id="watch-elapsed">' + elapsed + "</span>s</p>" +
        '<p class="tiny center">Ab dono apni app me movie play karo — timer saath chal raha hai.</p>';
      if (watch.timer) { clearInterval(watch.timer); watch.timer = null; }
      watch.timer = setInterval(function () {
        var node = document.getElementById("watch-elapsed");
        if (node) node.textContent = String(Number(node.textContent) + 1);
      }, 1000);
    } else {
      stage.innerHTML = '<div class="watch-frame"><iframe src="https://www.youtube-nocookie.com/embed/' +
        encodeURIComponent(info.videoId) + "?autoplay=1&playsinline=1&rel=0&start=" + elapsed +
        '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
    }

    if (title) title.textContent = "Saath chal raha hai";
    actions.innerHTML =
      (timerOnly ? "" : '<a class="btn" href="https://www.youtube.com/watch?v=' +
        encodeURIComponent(info.videoId) + "&t=" + elapsed + 's" target="_blank" rel="noopener">YouTube me kholo</a>') +
      '<button class="btn ghost" data-sheet="watch-stop">Band karo</button>';
  }

  /* -------------------------------------------------------------- render */

  function render() {
    var parts = (location.hash || "#/").replace(/^#/, "").split("/").filter(Boolean);
    var room = app.room;

    if (!room || room.phase !== "answering") stopTap();
    stopReact();
    stopDuck();
    stopMeter();
    stopDraw();
    stopScene();

    var html;
    if (parts[0] === "in" && parts[1]) {
      html = incomingView(decUrl(decodeHash(parts[1])));
    } else if (parts[0] === "join" && parts[1]) {
      html = joinView(parts[1]);
    } else if (!app.name) {
      html = nameView();
    } else if (parts[0] === "notes") {
      html = notesView();
    } else if (parts[0] === "book") {
      html = bookView();
    } else if (parts[0] === "privacy") {
      html = privacyView();
    } else if (parts[0] === "us") {
      html = usView();
    } else if (!app.code) {
      html = doorView();
    } else if (!room) {
      html = connectingView();
    } else if (room.phase === "lobby") {
      html = lobbyView();
    } else {
      html = gameView();
    }

    root.innerHTML = html;
    window.scrollTo(0, 0);
    if (app.tapRunning) paintTap();
    armReact();
    armDuck();
    armMeter();
    setupDraw();
    startScene();
  }

  /* -------------------------------------------------------------- wiring */

  root.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act");

    if (act === "save-name") { saveName(); return; }
    if (act === "ping") { app.ping = null; refreshServerLine(); pingServer().then(refreshServerLine); return; }
    if (act === "create") { createRoom(); return; }
    if (act === "demo") { createDemo(); return; }
    if (act === "join") { joinFromInput(); return; }
    if (act === "join-with-name") {
      var name = val("in-name");
      if (!name) { toast("Naam likho"); return; }
      app.name = name.slice(0, 24);
      save();
      joinRoom(el.getAttribute("data-code"));
      return;
    }
    if (act === "copy-code") { copyCode(); return; }
    if (act === "share-code") { shareCode(); return; }
    if (act === "start") { startGame(el.getAttribute("data-game")); return; }
    if (act === "answer") { submit(el.getAttribute("data-value")); return; }
    if (act === "answer-text") { submitText(); return; }
    if (act === "tap") { tapHit(); return; }
    if (act === "next") { nextRound(); return; }
    if (act === "move") { move(el.getAttribute("data-col")); return; }
    if (act === "react") { reactTap(); return; }
    if (act === "chat") { openChat(); return; }
    if (act === "call") { startCall(); return; }
    if (act === "watch") { openWatch(); return; }
    if (act === "meter") { meterTap(); return; }
    if (act === "draw-clear") { drawClear(); return; }
    if (act === "draw-guess") { drawGuess(); return; }
    if (act === "again") { startGame(app.room && app.room.game); return; }
    if (act === "lobby") { backToLobby(); return; }
    if (act === "leave") { leaveRoom(); return; }
    if (act === "save-note") { saveNote(); return; }
    if (act === "share-book") { shareBook(); return; }
    if (act === "clear-book") { clearBook(); return; }
    if (act === "share-typed") { shareTyped(); return; }
    if (act === "share-saved") { shareSaved(Number(el.getAttribute("data-i"))); return; }
    if (act === "keep-note") {
      keepNote(el.getAttribute("data-text"), el.getAttribute("data-from"));
      return;
    }
    if (act === "reset") { resetAll(); return; }
  });

  root.addEventListener("input", function (e) {
    var el = e.target;
    if (el && el.id === "in-code") {
      el.value = String(el.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    }
  });

  root.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "in-code") {
      e.preventDefault();
      joinFromInput();
    }
    if (e.key === "Enter" && e.target && e.target.id === "draw-guess-input") {
      e.preventDefault();
      drawGuess();
    }
  });

  window.addEventListener("hashchange", render);

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-sheet]");
    if (!el) return;
    var act = el.getAttribute("data-sheet");
    if (act === "close-chat") { closeChat(); return; }
    if (act === "send-chat") { sendChat(); return; }
    if (act === "accept-call") { acceptCall(); return; }
    if (act === "end-call") { endCall(); return; }
    if (act === "toggle-mic") { toggleTrack("audio"); return; }
    if (act === "toggle-cam") { toggleTrack("video"); return; }
    if (act === "watch-play") { startWatch(false); return; }
    if (act === "watch-timer") { startWatch(true); return; }
    if (act === "watch-stop") { stopWatch(); return; }
    if (act === "close-watch") { closeWatch(); return; }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "chat-input") {
      e.preventDefault();
      sendChat();
    }
  });

  /* ------------------------------------------------------ update engine */

  var buildSeen = "";
  var staleBuild = false;

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("/sw.js").then(function (reg) {
      if (reg.update) reg.update().catch(function () {});
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && reg.update) {
          reg.update().catch(function () {});
        }
      });
    }).catch(function () {});
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController) return;
      if (window.__jodiReload) return;
      window.__jodiReload = true;
      location.reload();
    });
  }

  /* server har deploy pe naya BOOT id deta hai — dikhte hi reload */
  function checkVersion() {
    if (app.local) return;
    api("/api/version").then(function (res) {
      if (!res || !res.ok || !res.version) return;
      var seen = "";
      try { seen = localStorage.getItem("jodi.v") || ""; } catch (e) { seen = ""; }
      if (!seen) {
        try { localStorage.setItem("jodi.v", res.version); } catch (e) { /* ignore */ }
        buildSeen = res.version;
        return;
      }
      if (seen === res.version) return;
      try { localStorage.setItem("jodi.v", res.version); } catch (e) { /* ignore */ }
      buildSeen = res.version;
      if (!app.code) {
        location.reload();
        return;
      }
      staleBuild = true;
      toast("Naya version aa gaya — room chhodte hi reload ho jaayega");
    }).catch(function () {});
  }

  load();
  render();
  pingServer().then(function (p) {
    refreshServerLine();
    if (p && !p.ok && !p.gate) {
      setTimeout(function () { pingServer().then(refreshServerLine); }, 2500);
    }
  });
  if (app.code && app.pid) startSync();

  registerSw();
  checkVersion();
  setInterval(checkVersion, 90000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") checkVersion();
  });
})();
