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

  global.Jodi3D = api;
})(window);
