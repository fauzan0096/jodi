"use strict";

/* Jodi 3D-ish scene renderer — Canvas 2D + asli perspective projection.
   Koi library nahi, koi WebGL nahi: har point (x, y, depth) ko screen pe project karta hai.
   x = baayein se daayein (metres), y = zameen se oopar, d = camera se doori.

   Scenes: penalty (goal + keeper + ball), hoop (basketball), pitch (cricket). */

(function (global) {
  var W = 640;
  var H = 420;

  function makeCam(eyeY, focal, cy) {
    var f = W * (focal || 0.86);
    var cx = W / 2;
    var base = H * (cy || 0.54);
    return {
      x: function (wx, d) { return cx + (wx / d) * f; },
      y: function (wy, d) { return base - ((wy - eyeY) / d) * f; },
      s: function (size, d) { return (size / d) * f; },
      f: f
    };
  }

  function poly(ctx, pts, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function line(ctx, cam, a, b, color, width) {
    ctx.beginPath();
    ctx.moveTo(cam.x(a[0], a[2]), cam.y(a[1], a[2]));
    ctx.lineTo(cam.x(b[0], b[2]), cam.y(b[1], b[2]));
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.stroke();
  }

  function stadium(ctx, top, bottom) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top || "#0A2036");
    g.addColorStop(1, bottom || "#123049");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (var i = 0; i < 7; i += 1) {
      ctx.fillRect(0, 26 + i * 24, W, 9 - i);
    }

    /* floodlights */
    for (var s = 0; s < 4; s += 1) {
      var fx = 60 + s * 175;
      var rad = ctx.createRadialGradient(fx, 8, 2, fx, 8, 90);
      rad.addColorStop(0, "rgba(255,246,214,0.45)");
      rad.addColorStop(1, "rgba(255,246,214,0)");
      ctx.fillStyle = rad;
      ctx.fillRect(fx - 90, -40, 180, 140);
    }
  }

  function ground(ctx, cam, near, far, halfNear, halfFar, light, dark) {
    poly(ctx, [
      [cam.x(-halfNear, near), cam.y(0, near)],
      [cam.x(halfNear, near), cam.y(0, near)],
      [cam.x(halfFar, far), cam.y(0, far)],
      [cam.x(-halfFar, far), cam.y(0, far)]
    ], light || "#1F6B3A");

    ctx.save();
    ctx.globalAlpha = 0.16;
    for (var d = near + 0.7; d < far; d += 1.4) {
      poly(ctx, [
        [cam.x(-halfNear - 6, d), cam.y(0, d)],
        [cam.x(halfNear + 6, d), cam.y(0, d)],
        [cam.x(halfNear + 6, d + 0.7), cam.y(0, d + 0.7)],
        [cam.x(-halfNear - 6, d + 0.7), cam.y(0, d + 0.7)]
      ], dark || "#0F4A28");
    }
    ctx.restore();
  }

  function shadow(ctx, cam, wx, d, size) {
    var r = cam.s(size, d);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cam.x(wx, d), cam.y(0, d), r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function figure(ctx, cam, opts) {
    var wx = opts.x;
    var d = opts.d;
    var scale = cam.s(opts.height || 1.8, d) / 100;
    var bx = cam.x(wx, d);
    var by = cam.y(0, d);
    var h = 100 * scale;

    ctx.save();
    ctx.translate(bx, by);
    if (opts.lean) ctx.rotate(opts.lean);
    ctx.strokeStyle = opts.color || "#F3E6D8";
    ctx.fillStyle = opts.color || "#F3E6D8";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, h * 0.09);

    /* legs */
    ctx.beginPath();
    ctx.moveTo(-h * 0.06, -h * 0.42);
    ctx.lineTo(-h * 0.12, 0);
    ctx.moveTo(h * 0.06, -h * 0.42);
    ctx.lineTo(h * 0.14, 0);
    ctx.stroke();

    /* body */
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.42);
    ctx.lineTo(0, -h * 0.82);
    ctx.stroke();

    /* arms */
    ctx.beginPath();
    var arm = opts.arms || [1, 1];
    ctx.moveTo(0, -h * 0.78);
    ctx.lineTo(arm[0] * h * 0.26, -h * (arm[0] > 0 ? 0.95 : 0.55));
    ctx.moveTo(0, -h * 0.78);
    ctx.lineTo(arm[1] * h * 0.26, -h * (arm[1] > 0 ? 0.95 : 0.55));
    ctx.stroke();

    /* head */
    ctx.beginPath();
    ctx.arc(0, -h * 0.9, h * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return { h: h };
  }

  function ball(ctx, cam, wx, wy, d, radius, color) {
    var r = Math.max(3, cam.s(radius || 0.11, d));
    var px = cam.x(wx, d);
    var py = cam.y(wy, d);
    var g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.2, px, py, r);
    g.addColorStop(0, color || "#FFFFFF");
    g.addColorStop(1, color ? "rgba(0,0,0,0.5)" : "#D6D2CB");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function goal(ctx, cam, d) {
    var halfW = 3.66;
    var h = 2.44;
    var back = d + 1.5;

    /* net back panel */
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    for (var x = -halfW; x <= halfW + 0.01; x += halfW / 6) {
      line(ctx, cam, [x, 0, back], [x, h, back], "rgba(255,255,255,0.22)", 1);
      line(ctx, cam, [x, h, back], [x, h, d], "rgba(255,255,255,0.14)", 1);
    }
    for (var yy = 0; yy <= h + 0.01; yy += h / 5) {
      line(ctx, cam, [-halfW, yy, back], [halfW, yy, back], "rgba(255,255,255,0.2)", 1);
      line(ctx, cam, [-halfW, yy, d], [-halfW, yy, back], "rgba(255,255,255,0.12)", 1);
      line(ctx, cam, [halfW, yy, d], [halfW, yy, back], "rgba(255,255,255,0.12)", 1);
    }
    /* side net sweeps */
    for (var i = 0; i <= 6; i += 1) {
      var t = i / 6;
      line(ctx, cam, [-halfW, h * t, d], [-halfW, h * t, back], "rgba(255,255,255,0.12)", 1);
      line(ctx, cam, [halfW, h * t, d], [halfW, h * t, back], "rgba(255,255,255,0.12)", 1);
    }
    ctx.restore();

    /* frame */
    var post = Math.max(3, cam.s(0.12, d));
    line(ctx, cam, [-halfW, 0, d], [-halfW, h, d], "#FFFFFF", post);
    line(ctx, cam, [halfW, 0, d], [halfW, h, d], "#FFFFFF", post);
    line(ctx, cam, [-halfW, h, d], [halfW, h, d], "#FFFFFF", post);
  }

  function rim(ctx, cam, d) {
    var halfW = 0.9;
    var boardBottom = 2.9;
    var boardTop = 3.95;

    /* backboard */
    poly(ctx, [
      [cam.x(-halfW, d + 0.4), cam.y(boardTop, d + 0.4)],
      [cam.x(halfW, d + 0.4), cam.y(boardTop, d + 0.4)],
      [cam.x(halfW, d + 0.4), cam.y(boardBottom, d + 0.4)],
      [cam.x(-halfW, d + 0.4), cam.y(boardBottom, d + 0.4)]
    ], "rgba(255,255,255,0.9)");

    ctx.save();
    ctx.strokeStyle = "#C0392B";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      cam.x(-0.3, d + 0.35), cam.y(3.5, d + 0.35),
      cam.x(0.3, d + 0.35) - cam.x(-0.3, d + 0.35),
      cam.y(3.05, d + 0.35) - cam.y(3.5, d + 0.35)
    );
    ctx.restore();

    /* rim */
    ctx.save();
    ctx.strokeStyle = "#E8622F";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cam.x(0, d), cam.y(3.05, d), cam.s(0.23, d), cam.s(0.09, d), 0, 0, Math.PI * 2);
    ctx.stroke();

    /* net */
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.5;
    for (var i = 0; i < 8; i += 1) {
      var a = (i / 8) * Math.PI * 2;
      var x1 = Math.cos(a) * 0.23;
      var y1 = 3.05 + Math.sin(a) * 0.09;
      ctx.beginPath();
      ctx.moveTo(cam.x(x1, d), cam.y(y1, d));
      ctx.lineTo(cam.x(x1 * 0.45, d), cam.y(2.72, d));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(cam.x(0, d), cam.y(2.72, d), cam.s(0.11, d), cam.s(0.045, d), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function stumps(ctx, cam, d, s) {
    var gap = 0.11 * (s || 1);
    var h = 0.71 * (s || 1);
    for (var i = -1; i <= 1; i += 1) {
      line(ctx, cam, [i * gap, 0, d], [i * gap, h, d], "#F4EBD8", Math.max(2, cam.s(0.035, d)));
    }
    line(ctx, cam, [-gap, h, d], [gap, h, d], "#F4EBD8", Math.max(1, cam.s(0.02, d)));
  }

  /* ------------------------------------------------------------- scenes */

  var api = {};

  api.penalty = function (ctx, st) {
    var cam = makeCam(1.85);
    stadium(ctx);
    ground(ctx, cam, 3, 13, 20, 20);

    /* penalty box + spot */
    ctx.save();
    line(ctx, cam, [-9.16, 0, 10.9], [9.16, 0, 10.9], "rgba(255,255,255,0.5)", 2);
    line(ctx, cam, [-9.16, 0, 5.5], [-9.16, 0, 10.9], "rgba(255,255,255,0.35)", 2);
    line(ctx, cam, [9.16, 0, 5.5], [9.16, 0, 10.9], "rgba(255,255,255,0.35)", 2);
    line(ctx, cam, [-9.16, 0, 5.5], [9.16, 0, 5.5], "rgba(255,255,255,0.35)", 2);
    ctx.restore();

    goal(ctx, cam, 10.9);

    var zones = [-2.4, 0, 2.4];
    var diveX = st.diveZone == null ? 0 : zones[st.diveZone];
    var targetX = st.targetZone == null ? 0 : zones[st.targetZone];
    var t = st.mode === "shot" ? Math.min(1, Math.max(0, st.t)) : 0;

    var keeperX = diveX * t;
    var keeperLean = diveX === 0 ? 0 : (diveX > 0 ? 0.35 : -0.35) * t;
    shadow(ctx, cam, keeperX, 10.6, 0.5);
    figure(ctx, cam, {
      x: keeperX,
      d: 10.6,
      height: 1.86,
      color: "#F9D34C",
      lean: keeperLean,
      arms: st.mode === "shot" && t > 0.35 ? [diveX === 0 ? 1 : 1, diveX === 0 ? 1 : 1] : [1, 1]
    });

    /* ball */
    var bx = 0;
    var by = 0.11;
    var bd = 8;
    if (st.mode === "shot") {
      bx = targetX * t;
      bd = 8 + 2.9 * t;
      by = 0.11 + Math.sin(Math.PI * Math.min(1, t * 0.9)) * 0.5 + (1.15 - 0.11) * t * t;
      if (st.saved && t > 0.75) {
        bx = keeperX + (bx - keeperX) * (1 - t) * 4;
        bd = 10.2;
        by = 1.1;
      }
    }
    shadow(ctx, cam, bx, bd, 0.16);
    ball(ctx, cam, bx, by, bd, 0.11);

    /* striker from behind */
    figure(ctx, cam, { x: -0.55, d: 7.6, height: 1.82, color: "rgba(255,255,255,0.35)", arms: [-1, 1] });

    if (st.mode !== "shot" && st.aim) {
      var ax = cam.x(zones[st.aim.zone] || 0, 10.9);
      var ay = cam.y(1.15, 10.9);
      ctx.save();
      ctx.strokeStyle = "#FF7A9C";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ax, ay, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax - 26, ay);
      ctx.lineTo(ax + 26, ay);
      ctx.moveTo(ax, ay - 26);
      ctx.lineTo(ax, ay + 26);
      ctx.stroke();
      ctx.restore();
    }

    if (st.mode === "shot" && t > 0.92) {
      ctx.save();
      ctx.font = "bold 40px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = st.saved ? "#FF7A9C" : "#9BE37A";
      ctx.fillText(st.saved ? "SAVE!" : "GOAL!", W / 2, 96);
      ctx.restore();
    }
  };

  api.hoop = function (ctx, st) {
    var cam = makeCam(1.7, 0.82, 0.5);
    stadium(ctx, "#1B1206", "#2A1B0A");
    ground(ctx, cam, 3, 12.5, 22, 22, "#C98A4B", "#B4763B");

    line(ctx, cam, [-6.7, 0, 6.2], [6.7, 0, 6.2], "rgba(255,255,255,0.45)", 3);
    line(ctx, cam, [-1.2, 0, 6.2], [-1.2, 0, 10.6], "rgba(255,255,255,0.3)", 2);
    line(ctx, cam, [1.2, 0, 6.2], [1.2, 0, 10.6], "rgba(255,255,255,0.3)", 2);

    /* pole */
    line(ctx, cam, [0, 0, 11.6], [0, 3.6, 11.6], "#7A7F87", 6);
    rim(ctx, cam, 10.8);

    var score = st.points || 0;
    var t = st.mode === "shot" ? Math.min(1, Math.max(0, st.t)) : 0;
    var aim = typeof st.aim === "number" ? st.aim : 50;
    var off = ((aim - 50) / 50) * 0.55;

    var bx = 0;
    var by = 1.95;
    var bd = 6.6;
    if (st.mode === "shot") {
      bx = off * t;
      bd = 6.6 + (10.8 - 6.6) * t;
      by = 1.95 + (3.05 - 1.95) * t + Math.sin(Math.PI * t) * 1.15;
      if (score > 0 && t > 0.82) {
        by = 3.05 - (t - 0.82) * 5.6;
        if (by < 2.6) by = 2.6;
      }
      if (score === 0 && t > 0.82) {
        bx = off > 0 ? 0.3 : -0.3;
        by = 3.15;
      }
    }

    shadow(ctx, cam, bx, bd, 0.16);
    ball(ctx, cam, bx, by, bd, 0.12, "#E8933C");

    figure(ctx, cam, { x: 0, d: 6.1, height: 1.86, color: "rgba(255,255,255,0.32)", arms: [-1, -1] });

    if (st.mode === "shot" && t > 0.9 && score > 0) {
      ctx.save();
      ctx.font = "bold 36px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#9BE37A";
      ctx.fillText("+" + score, W / 2, 104);
      ctx.restore();
    }
  };

  api.cricket = function (ctx, st) {
    var cam = makeCam(2.1, 0.88, 0.5);
    stadium(ctx, "#06251C", "#0C3A2A");
    ground(ctx, cam, 2, 14, 24, 24, "#1C6B45", "#17583A");

    /* pitch strip */
    poly(ctx, [
      [cam.x(-1.5, 4), cam.y(0, 4)],
      [cam.x(1.5, 4), cam.y(0, 4)],
      [cam.x(1.5, 13.4), cam.y(0, 13.4)],
      [cam.x(-1.5, 13.4), cam.y(0, 13.4)]
    ], "#C7B184");

    /* creases */
    line(ctx, cam, [-1.3, 0, 12.2], [1.3, 0, 12.2], "rgba(255,255,255,0.7)", 3);
    line(ctx, cam, [-1.3, 0, 4.8], [1.3, 0, 4.8], "rgba(255,255,255,0.5)", 2);

    var out = !!st.out;
    var runs = st.runs || 0;
    var t = st.mode === "shot" ? Math.min(1, Math.max(0, st.t)) : 0;

    stumps(ctx, cam, 13.4);
    stumps(ctx, cam, 4.6);

    /* batter */
    figure(ctx, cam, {
      x: 1.15,
      d: 12.9,
      height: 1.8,
      color: "#F7E3C6",
      arms: st.mode === "shot" && t > 0.2 ? [1, -1] : [1, 1]
    });

    /* bowler (peeshe se, chhota) */
    figure(ctx, cam, { x: 0.4, d: 5.2, height: 1.8, color: "rgba(255,255,255,0.35)", arms: [1, 1] });

    /* ball */
    var bx = 0;
    var by = 0.12;
    var bd = 5.4;
    if (st.mode === "shot") {
      if (out) {
        bx = 0;
        bd = 13.2;
        by = 0.6;
      } else if (runs >= 4) {
        bx = -7 * t;
        bd = 13.2 - 3 * t;
        by = 0.4 + Math.sin(Math.PI * t) * 2.2;
      } else {
        bx = 3.2 * t;
        bd = 12.6;
        by = 0.3 + Math.sin(Math.PI * t) * 0.9;
      }
    } else {
      bx = 0;
      bd = 5.4;
    }
    shadow(ctx, cam, bx, bd, 0.12);
    ball(ctx, cam, bx, by, bd, 0.1, "#C0392B");

    if (st.mode === "shot" && t > 0.9) {
      ctx.save();
      ctx.font = "bold 36px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = out ? "#FF7A9C" : (runs >= 4 ? "#9BE37A" : "#F9D34C");
      ctx.fillText(out ? "OUT!" : (runs === 0 ? "DOT BALL" : runs + " RUN" + (runs > 1 ? "S" : "")), W / 2, 96);
      ctx.restore();
    }
  };

  /* ------------------------------------------------------- 3D board */

  api.board = function (ctx, st) {
    var cam = makeCam(3.1, 0.95, 0.5);
    var cols = st.type === "ttt" ? 3 : 7;
    var rows = st.type === "ttt" ? 3 : 6;
    var X0 = -3.1;
    var X1 = 3.1;
    var D0 = 4.3;
    var D1 = 8.9;
    var cw = (X1 - X0) / cols;
    var ch = (D1 - D0) / rows;
    var hits = [];

    stadium(ctx, "#091A28", "#0E2637");
    ground(ctx, cam, 3, 11, 22, 22, "#132A3C", "#0F2231");

    poly(ctx, [
      [cam.x(X0, D0), cam.y(0, D0)],
      [cam.x(X1, D0), cam.y(0, D0)],
      [cam.x(X1, D1), cam.y(0, D1)],
      [cam.x(X0, D1), cam.y(0, D1)]
    ], "#1B2C3E");

    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var cx = X0 + (c + 0.5) * cw;
        var cd = D0 + (r + 0.5) * ch;
        var hw = cw * 0.43;
        var hd = ch * 0.43;
        poly(ctx, [
          [cam.x(cx - hw, cd - hd), cam.y(0, cd - hd)],
          [cam.x(cx + hw, cd - hd), cam.y(0, cd - hd)],
          [cam.x(cx + hw, cd + hd), cam.y(0, cd + hd)],
          [cam.x(cx - hw, cd + hd), cam.y(0, cd + hd)]
        ], "#152333");

        var idx = r * cols + c;
        var v = st.cells && st.cells[idx] != null ? st.cells[idx] : -1;
        var px = cam.x(cx, cd);
        var py = cam.y(0, cd);
        var rad = Math.max(4, cam.s(cw * 0.36, cd));

        if (st.type === "ttt") {
          if (v >= 0) {
            ctx.save();
            ctx.font = "bold " + Math.round(rad * 2) + "px Georgia, serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = v === 0 ? "#FF7A9C" : "#F9D34C";
            ctx.fillText(v === 0 ? "X" : "O", px, py - rad * 0.3);
            ctx.restore();
          }
        } else {
          ctx.beginPath();
          ctx.ellipse(px, py, rad, rad * 0.42, 0, 0, Math.PI * 2);
          ctx.fillStyle = v === 0 ? "#E76A8B" : v === 1 ? "#F5B942" : "#0C1725";
          ctx.fill();
          if (v >= 0) {
            ctx.beginPath();
            ctx.ellipse(px - rad * 0.25, py - rad * 0.12, rad * 0.3, rad * 0.12, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.fill();
          }
        }

        hits.push({
          idx: idx,
          col: c,
          x: px,
          y: py,
          size: Math.max(22, rad * 2.4)
        });
      }
    }

    return hits;
  };

  /* --------------------------------------------------- stage backdrop */

  function cardBack(ctx, cam, wx, d, t) {
    var w = 0.62;
    var h = 0.9;
    var lift = 0.06 * Math.sin(t * 1.4);
    var x0 = cam.x(wx - w, d);
    var x1 = cam.x(wx + w, d);
    var yTop = cam.y(h + lift, d);
    var yBot = cam.y(0, d);
    ctx.save();
    ctx.fillStyle = "#FDF3E7";
    ctx.strokeStyle = "rgba(231,106,139,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, yBot);
    ctx.lineTo(x0 + (x1 - x0) * 0.08, yTop);
    ctx.lineTo(x1 - (x1 - x0) * 0.08, yTop);
    ctx.lineTo(x1, yBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(231,106,139,0.85)";
    ctx.font = "bold " + Math.max(10, Math.round((yBot - yTop) * 0.4)) + "px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("♥", (x0 + x1) / 2, yTop + (yBot - yTop) * 0.58);
    ctx.restore();
  }

  api.stage = function (ctx, st) {
    var t = st.t || 0;
    var cam = makeCam(2.3, 0.8, 0.46);

    if (st.kind === "arena") {
      stadium(ctx, "#20100E", "#2A1512");
      ground(ctx, cam, 3, 12, 20, 20, "#3A1D18", "#2E1713");

      ctx.beginPath();
      ctx.ellipse(cam.x(0, 7), cam.y(0, 7), cam.s(3.4, 7), cam.s(3.4, 7) * 0.32, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,180,90,0.85)";
      ctx.lineWidth = 6;
      ctx.stroke();

      for (var i = 0; i < 6; i += 1) {
        var a = (i / 6) * Math.PI * 2 + t * 0.3;
        var px = Math.cos(a) * 3.6;
        var pd = 7 + Math.sin(a) * 1.6;
        line(ctx, cam, [px, 0, pd], [px, 1.1, pd], "#F9D34C", 4);
        var glow = ctx.createRadialGradient(cam.x(px, pd), cam.y(1.2, pd), 1, cam.x(px, pd), cam.y(1.2, pd), 40);
        glow.addColorStop(0, "rgba(255,210,120,0.5)");
        glow.addColorStop(1, "rgba(255,210,120,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(cam.x(px, pd) - 40, cam.y(1.2, pd) - 40, 80, 80);
      }
    } else {
      stadium(ctx, "#141022", "#1E1630");
      ground(ctx, cam, 3, 12, 20, 20, "#241B33", "#1C1428");

      ctx.beginPath();
      ctx.ellipse(cam.x(0, 7.5), cam.y(0, 7.5), cam.s(3.2, 7.5), cam.s(3.2, 7.5) * 0.34, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#3A2A22";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,214,150,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      cardBack(ctx, cam, -1.5, 7.1, t);
      cardBack(ctx, cam, 1.6, 7.9, t + 1.4);

      var gx = cam.x(0, 7.2);
      var gy = cam.y(0.9, 7.2);
      var glow2 = ctx.createRadialGradient(gx, gy, 2, gx, gy, 130);
      glow2.addColorStop(0, "rgba(255,196,110,0.45)");
      glow2.addColorStop(1, "rgba(255,196,110,0)");
      ctx.fillStyle = glow2;
      ctx.fillRect(gx - 130, gy - 130, 260, 260);
    }

    for (var s = 0; s < 14; s += 1) {
      var sd = 4 + ((s * 1.7 + t * 0.6) % 8);
      var sx = Math.sin(s * 2.1 + t * 0.7) * 4;
      ctx.beginPath();
      ctx.arc(cam.x(sx, sd), cam.y(0.5 + (s % 3) * 0.5, sd), Math.max(1, cam.s(0.06, sd)), 0, Math.PI * 2);
      ctx.fillStyle = st.kind === "arena" ? "rgba(255,180,120,0.55)" : "rgba(255,214,150,0.55)";
      ctx.fill();
    }
  };

  global.Jodi3D = api;
})(window);

