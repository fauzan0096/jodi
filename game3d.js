/* Jodi 3D — asli WebGL (three.js) wala penalty scene.
   Module file: classic app.js isse window.Jodi3DThree se use karta hai.
   Agar WebGL/three load na ho, mount() false deta hai aur app 2D scene pe chala jaata hai. */

import * as THREE from "./three.module.min.js";

(function () {
  "use strict";

  var W = 640;
  var H = 420;
  var ZONES = [-2.5, 0, 2.5];

  var renderer = null;
  var scene = null;
  var camera = null;
  var keeper = null;
  var ball = null;
  var rings = [];
  var ready = false;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function quad(p0, c, p1, t) {
    var u = 1 - t;
    return new THREE.Vector3(
      u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
      u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
      u * u * p0.z + 2 * u * t * c.z + t * t * p1.z
    );
  }

  function grassTexture() {
    var c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    var g = c.getContext("2d");
    g.fillStyle = "#1f7a45";
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#1b6b3c";
    g.fillRect(0, 0, 32, 64);
    g.fillStyle = "rgba(255,255,255,0.03)";
    for (var i = 0; i < 60; i += 1) {
      g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 10);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function addPitch() {
    var geo = new THREE.PlaneGeometry(80, 70);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshStandardMaterial({
      map: grassTexture(),
      roughness: 0.95,
      metalness: 0
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, 12);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function addLines() {
    var pts = [];
    function line(x1, z1, x2, z2) {
      pts.push(new THREE.Vector3(x1, 0.02, z1), new THREE.Vector3(x2, 0.02, z2));
    }
    line(-9.16, 0, 9.16, 0);
    line(-9.16, 0, -9.16, 5.5);
    line(9.16, 0, 9.16, 5.5);
    line(-9.16, 5.5, 9.16, 5.5);
    line(-3.66, 0, -3.66, -1.7);
    line(3.66, 0, 3.66, -1.7);
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    scene.add(new THREE.LineSegments(geo, mat));

    var spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.03, 11);
    scene.add(spot);
  }

  function addGoal() {
    var white = new THREE.MeshStandardMaterial({ color: 0xf7f7f2, roughness: 0.5, metalness: 0.1 });
    var postGeo = new THREE.CylinderGeometry(0.065, 0.065, 2.44, 14);
    var left = new THREE.Mesh(postGeo, white);
    left.position.set(-3.66, 1.22, 0);
    left.castShadow = true;
    scene.add(left);

    var right = new THREE.Mesh(postGeo, white);
    right.position.set(3.66, 1.22, 0);
    right.castShadow = true;
    scene.add(right);

    var barGeo = new THREE.CylinderGeometry(0.065, 0.065, 7.32, 14);
    barGeo.rotateZ(Math.PI / 2);
    var bar = new THREE.Mesh(barGeo, white);
    bar.position.set(0, 2.44, 0);
    bar.castShadow = true;
    scene.add(bar);

    /* net */
    var pts = [];
    var back = -1.7;
    for (var x = -3.66; x <= 3.66; x += 0.61) {
      pts.push(new THREE.Vector3(x, 0, back), new THREE.Vector3(x, 2.44, back));
      pts.push(new THREE.Vector3(x, 2.44, 0), new THREE.Vector3(x, 2.44, back));
    }
    for (var y = 0; y <= 2.44; y += 0.4) {
      pts.push(new THREE.Vector3(-3.66, y, back), new THREE.Vector3(3.66, y, back));
      pts.push(new THREE.Vector3(-3.66, y, 0), new THREE.Vector3(-3.66, y, back));
      pts.push(new THREE.Vector3(3.66, y, 0), new THREE.Vector3(3.66, y, back));
    }
    var netGeo = new THREE.BufferGeometry().setFromPoints(pts);
    var netMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 });
    scene.add(new THREE.LineSegments(netGeo, netMat));
  }

  function addKeeper() {
    keeper = new THREE.Group();
    var kit = new THREE.MeshStandardMaterial({ color: 0xf7c948, roughness: 0.7 });
    var skin = new THREE.MeshStandardMaterial({ color: 0xe0a077, roughness: 0.8 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x22202c, roughness: 0.85 });

    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.26), kit);
    torso.position.y = 1.08;
    torso.castShadow = true;
    keeper.add(torso);

    var hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.24), dark);
    hips.position.y = 0.68;
    keeper.add(hips);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), skin);
    head.position.y = 1.52;
    head.castShadow = true;
    keeper.add(head);

    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark);
    hair.position.y = 1.55;
    keeper.add(hair);

    [-1, 1].forEach(function (side) {
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.62, 0.13), kit);
      arm.position.set(side * 0.33, 1.05, 0);
      arm.rotation.z = side * -0.22;
      arm.castShadow = true;
      keeper.add(arm);

      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.16), dark);
      leg.position.set(side * 0.13, 0.34, 0);
      leg.castShadow = true;
      keeper.add(leg);
    });

    keeper.position.set(0, 0, 0.4);
    scene.add(keeper);
  }

  function addBall() {
    ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 24, 18),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 })
    );
    ball.castShadow = true;
    ball.position.set(0, 0.11, 11);
    scene.add(ball);
  }

  function addStands() {
    var stand = new THREE.Mesh(
      new THREE.BoxGeometry(26, 7, 2),
      new THREE.MeshStandardMaterial({ color: 0x0d1622, roughness: 1 })
    );
    stand.position.set(0, 3.4, -6.5);
    scene.add(stand);

    var people = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: 0x2a3a4d, roughness: 1 });
    for (var i = 0; i < 90; i += 1) {
      var dot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), mat);
      dot.position.set(
        -12 + Math.random() * 24,
        0.6 + Math.random() * 5.6,
        -5.6 - Math.random() * 1.2
      );
      people.add(dot);
    }
    scene.add(people);
  }

  function addAimRings() {
    rings = [];
    ZONES.forEach(function (x) {
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(0.34, 0.44, 28),
        new THREE.MeshBasicMaterial({
          color: 0xff8a9b,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide
        })
      );
      ring.position.set(x, 1.15, 0.06);
      scene.add(ring);
      rings.push(ring);
    });
  }

  function build(canvas) {
    if (renderer) {
      try { renderer.dispose(); } catch (e) { /* ignore */ }
      renderer = null;
    }
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true;
    if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x081726);
    scene.fog = new THREE.Fog(0x081726, 26, 60);

    camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);
    camera.position.set(0, 2.0, 15.5);
    camera.lookAt(0, 1.35, 0);

    scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x1a2a1c, 1.05));

    var sun = new THREE.DirectionalLight(0xfff1cf, 2.1);
    sun.position.set(-7, 13, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -4;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    scene.add(sun);

    var rim = new THREE.DirectionalLight(0x8fd0ff, 0.7);
    rim.position.set(8, 6, -9);
    scene.add(rim);

    addPitch();
    addLines();
    addGoal();
    addKeeper();
    addBall();
    addStands();
    addAimRings();
  }

  var sharedCanvas = null;

  var api = {
    mount: function (canvas) {
      try {
        if (!sharedCanvas) {
          sharedCanvas = document.createElement("canvas");
          sharedCanvas.className = "scene";
          sharedCanvas.width = W;
          sharedCanvas.height = H;
          sharedCanvas.style.width = "100%";
          build(sharedCanvas);
        }
        if (canvas && canvas.parentNode && canvas !== sharedCanvas) {
          canvas.parentNode.replaceChild(sharedCanvas, canvas);
          sharedCanvas.id = "scene";
        }
        if (renderer) renderer.setSize(W, H, false);
        ready = true;
        return true;
      } catch (e) {
        ready = false;
        renderer = null;
        sharedCanvas = null;
        return false;
      }
    },

    update: function (st) {
      if (!ready || !scene) return;
      var t = st.mode === "shot" ? clamp(st.t, 0, 1) : 0;
      var target = st.targetZone == null ? null : Number(st.targetZone);
      var dive = st.diveZone == null ? null : Number(st.diveZone);

      var kx = dive == null ? 0 : ZONES[dive] * Math.min(1, t / 0.55);
      if (keeper) {
        keeper.position.x = kx;
        keeper.position.y = Math.sin(Math.min(1, t) * Math.PI) * 0.2;
        keeper.rotation.z = (kx === 0 ? 0 : (kx > 0 ? -1 : 1)) * Math.min(1, t / 0.55) * 0.95;
      }

      if (ball) {
        if (st.mode === "shot") {
          var p0 = new THREE.Vector3(0, 0.11, 11);
          var p1 = new THREE.Vector3(target == null ? 0 : ZONES[target], 1.15, 0.4);
          var ctrl = new THREE.Vector3(p1.x * 0.45, 2.5, 6.2);
          var pos = quad(p0, ctrl, p1, t);
          if (st.saved && t > 0.72) {
            pos.lerp(new THREE.Vector3(kx, 1.15, 0.7), Math.min(1, (t - 0.72) / 0.28));
          }
          ball.position.copy(pos);
          ball.rotation.x += 0.25;
          ball.rotation.z += 0.18;
        } else {
          ball.position.set(0, 0.11, 11);
        }
      }

      if (camera) {
        camera.position.z = 15.5 - t * 1.3;
        camera.position.y = 2.0 - t * 0.12;
        camera.lookAt(0, 1.35, 0);
      }

      for (var i = 0; i < rings.length; i += 1) {
        rings[i].visible = st.mode !== "shot";
        rings[i].material.opacity = st.aim && st.aim.zone === i ? 0.95 : 0.28;
      }
    },

    draw: function () {
      if (!ready || !renderer || !scene || !camera) return;
      try {
        renderer.render(scene, camera);
      } catch (e) {
        ready = false;
      }
    },

    ready: function () {
      return ready;
    }
  };

  window.Jodi3DThree = api;
  window.dispatchEvent(new Event("jodi3d"));
})();
