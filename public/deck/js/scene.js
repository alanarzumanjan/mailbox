/* EmptyLess 3D scene — three.js r128 (global THREE), works from file:// with no network.
   One city and one hero postbox. Slides choose a camera "view"; the view sets a few flags.
   Extras: camera drift, fade between the box and the city, glow pass (dark theme),
   signal rings on full boxes, and a point cloud that assembles into the postbox.
   Rounded-box helper adapted from eamcmx/tsi-robotics-2026. */
(function () {
'use strict';
var S = window.SCENE = {};
var STATIC = /[?&]static/.test(location.search);
var NOFX = /[?&]nofx/.test(location.search);

/* ---------- themes (must match css/deck.css) ---------- */
var THEMES = {
  light: { name: 'light', bg: 0xffffff, ground: 0xf0f3f6, road: 0xe1e7ed, bld: 0xffffff, bldTop: 0xf6f8fa,
           box: 0x172033, boxTrim: 0x2a3654, van: 0xffffff, muted: 0xaab4c2, unknown: 0x9aa5b4,
           hemi: [0xffffff, 0xcfd8e3, 0.62], sun: 0.72, rim: [0xbfe9dc, 0.22], kick: [0xffd6b0, 0.12], fog: [70, 190],
           led: 0.55, cloud: ACC_HEX(), cloudBlend: 'normal', post: false },
  dark:  { name: 'dark', bg: 0x172033, ground: 0x1a2539, road: 0x111a2a, bld: 0x26344f, bldTop: 0x31415e,
           box: 0xe9eef4, boxTrim: 0xc5cfdb, van: 0xdfe6ee, muted: 0x52617c, unknown: 0x7d8aa3,
           hemi: [0xcdd8ea, 0x0e1522, 0.7], sun: 0.8, rim: [0x7fb8ff, 0.3], kick: [0xff9a5c, 0.18], fog: [55, 165],
           led: 1.6, cloud: 0x34e0a8, cloudBlend: 'add', post: true }
};
function ACC_HEX() { return 0x0b9b70; }
function GIANT_A() { return T.name === 'dark' ? 0.32 : 0.55; }
var ACC = 0x0b9b70, FULL = 0xe5484d;

/* ---------- renderer, lights ---------- */
var canvas = document.getElementById('gl');
var W = innerWidth, H = innerHeight, PR = Math.min(devicePixelRatio || 1, 2);
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: STATIC });
renderer.setPixelRatio(PR);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 400);
var hemi = new THREE.HemisphereLight(0xffffff, 0xdddddd, 1); scene.add(hemi);
var sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(-30, 50, 25); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
var sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 140;
sun.shadow.bias = -0.0006; sun.shadow.radius = 3; scene.add(sun);
var rim = new THREE.DirectionalLight(0xffffff, 0.2); rim.position.set(30, 14, -32); scene.add(rim);     // cool back light
var kick = new THREE.DirectionalLight(0xffffff, 0.1); kick.position.set(-26, 6, 30); scene.add(kick);   // warm fill

/* ---------- helpers ---------- */
var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function std(c, r, m, o) { var p = { color: c, roughness: r == null ? 0.6 : r, metalness: m || 0 }; if (o) for (var k in o) p[k] = o[k]; return new THREE.MeshStandardMaterial(p); }
function mesh(g, m, cast, recv) { var x = new THREE.Mesh(g, m); x.castShadow = cast !== false; x.receiveShadow = recv !== false; return x; }
function box(w, h, d, m) { return mesh(new THREE.BoxGeometry(w, h, d), m); }
function rrShape(w, h, r) { var s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function rbox(w, h, d, r, m) { var b = Math.min(r * 0.5, d * 0.2), g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(0.001, r - b)), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 8 }); g.translate(0, 0, -(d - 2 * b) / 2); return mesh(g, m); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function ease(dt, rate) { return 1 - Math.exp(-dt * rate); }

/* theme-driven materials (colors swapped in setTheme) */
var M = {
  ground: std(0, 1), road: std(0, 0.95), bld: std(0, 0.85), bldTop: std(0, 0.9),
  box: std(0, 0.38, 0.25), trim: std(0, 0.35, 0.4), van: std(0, 0.45, 0.1),
  acc: std(ACC, 0.4, 0, { emissive: ACC, emissiveIntensity: 0.15 }),
  dark: std(0x0d1322, 0.6), silver: std(0x9aa7b8, 0.3, 0.8), pcb: std(0x0f6b4f, 0.55), chip: std(0x111827, 0.4),
  paper: std(0xfbfbf8, 0.9), tof: std(0x3b3f8f, 0.5), lining: std(0xe9eef3, 0.8)
};

/* ---------- city ---------- */
var STEP = 8, N = 3;                       // streets at -24..24
var ground = mesh(new THREE.PlaneGeometry(400, 400), M.ground, false, true);
ground.rotation.x = -Math.PI / 2; scene.add(ground);
for (var k = -N; k <= N; k++) {
  var rx = mesh(new THREE.PlaneGeometry(STEP * 2 * N + 14, 3), M.road, false, true); rx.rotation.x = -Math.PI / 2; rx.position.set(0, 0.01, k * STEP); scene.add(rx);
  var rz = mesh(new THREE.PlaneGeometry(3, STEP * 2 * N + 14), M.road, false, true); rz.rotation.x = -Math.PI / 2; rz.position.set(k * STEP, 0.012, 0); scene.add(rz);
}
var HERO = new THREE.Vector3(1.75, 0, 1.75);   // hero box on the corner of block (4,4)
for (var bx = -N; bx < N; bx++) for (var bz = -N; bz < N; bz++) {
  var cx = bx * STEP + STEP / 2, cz = bz * STEP + STEP / 2, n = 1 + Math.floor(rnd() * 3);
  for (var i = 0; i < n; i++) {
    var w = 1.6 + rnd() * 2.2, d = 1.6 + rnd() * 2.2, h = 1.4 + rnd() * rnd() * 7;
    var px = cx + (rnd() - 0.5) * (5 - w), pz = cz + (rnd() - 0.5) * (5 - d);
    if (bx === 0 && bz === 0) { px = cx + 0.9; pz = cz + 0.9; w = 2.6; d = 2.6; h = 3.2; if (i) continue; }  // keep the hero corner open
    var b = box(w, h, d, M.bld); b.position.set(px, h / 2, pz); scene.add(b);
    var t = box(w * 0.98, 0.06, d * 0.98, M.bldTop); t.position.set(px, h + 0.03, pz); t.castShadow = false; scene.add(t);
  }
}

/* ---------- postbox model ---------- */
function postbox(hero) {
  var g = new THREE.Group(), parts = {};
  var pole = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 16), M.trim); pole.position.y = 0.275; g.add(pole);
  var BW = 0.9, BH = 1.0, BD = 0.62, y0 = 0.55, cy = y0 + BH / 2;
  if (!hero) {
    var body = rbox(BW, BH, BD, 0.08, M.box); body.position.y = cy; g.add(body);
  } else {
    // hero is built from panels so the front can fade away (cutaway)
    var th = 0.05;
    [[BW, BH, th, 0, cy, -BD / 2 + th / 2], [th, BH, BD, -BW / 2 + th / 2, cy, 0], [th, BH, BD, BW / 2 - th / 2, cy, 0], [BW, th, BD, 0, y0 + th / 2, 0]]
      .forEach(function (p) { var m = box(p[0], p[1], p[2], M.box); m.position.set(p[3], p[4], p[5]); g.add(m); });
    parts.frontMat = M.box.clone(); parts.frontMat.transparent = true;
    var front = rbox(BW, BH, 0.06, 0.04, parts.frontMat); front.position.set(0, cy, BD / 2 - 0.03); g.add(front); parts.front = front;
    // insides: scale plate on a load cell, ESP32 on the back wall, battery, ToF under the roof
    var cell = box(0.42, 0.05, 0.07, M.silver); cell.position.set(0, y0 + 0.08, 0); g.add(cell);
    var plate = box(0.74, 0.025, 0.48, M.trim); plate.position.set(0, y0 + 0.12, 0); g.add(plate); parts.plateY = y0 + 0.135;
    var pcb = box(0.26, 0.17, 0.018, M.pcb); pcb.position.set(0.17, cy + 0.2, -BD / 2 + 0.065); g.add(pcb);
    var chip = box(0.1, 0.08, 0.02, M.chip); chip.position.set(0.17, cy + 0.21, -BD / 2 + 0.08); g.add(chip);
    var bat = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16), M.acc); bat.rotation.z = Math.PI / 2; bat.position.set(-0.2, cy + 0.2, -BD / 2 + 0.09); g.add(bat);
    var tof = box(0.09, 0.015, 0.09, M.tof); tof.position.set(0, y0 + BH - 0.06, 0.02); g.add(tof);
    parts.freeH = (y0 + BH - 0.06 - 0.0075) - parts.plateY;   // what the distance sensor sees when empty
    parts.module = [cell, plate, pcb, chip, bat, tof];
    parts.at = { cell: cell.position.clone(), pcb: pcb.position.clone(), bat: bat.position.clone(), tof: tof.position.clone() };
    parts.obj = { cell: cell, pcb: pcb, bat: bat, tof: tof };
    // exploded view (Engineering): every part flies out towards the viewer, then snaps back
    parts.explode = [[cell, [0.05, -0.18, 0.75]], [plate, [0, -0.06, 0.55]], [pcb, [0.42, 0.12, 0.7]], [chip, [0.42, 0.12, 0.7]], [bat, [-0.46, 0.08, 0.62]], [tof, [0, 0.36, 0.6]]]
      .map(function (e) { return { m: e[0], base: e[0].position.clone(), off: new THREE.Vector3(e[1][0], e[1][1], e[1][2]) }; });
    [[BW - 0.12, BH - 0.12, 0.01, 0, cy, -BD / 2 + 0.055], [0.01, BH - 0.12, BD - 0.1, -BW / 2 + 0.055, cy, 0], [0.01, BH - 0.12, BD - 0.1, BW / 2 - 0.055, cy, 0], [BW - 0.12, 0.01, BD - 0.1, 0, y0 + 0.055, 0]]
      .forEach(function (p) { var m = box(p[0], p[1], p[2], M.lining); m.position.set(p[3], p[4], p[5]); g.add(m); });
  }
  var roof = rbox(BW + 0.1, 0.09, BD + 0.1, 0.04, M.trim); roof.position.y = y0 + BH + 0.04; g.add(roof);
  var slot = box(0.5, 0.045, 0.02, M.dark); slot.position.set(0, cy + 0.3, BD / 2 + (hero ? 0.005 : 0.01)); slot.castShadow = false; g.add(slot);
  var stripe = box(BW * 0.999, 0.07, 0.02, M.acc); stripe.position.set(0, cy - 0.32, BD / 2 + (hero ? 0.004 : 0.008)); stripe.castShadow = false; g.add(stripe);
  parts.skin = [slot, stripe];
  var ledMat = new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0x777777, emissiveIntensity: 0.55, roughness: 0.3 });
  var led = mesh(new THREE.SphereGeometry(0.045, 16, 12), ledMat, false, false); led.position.set(0.33, cy + 0.3, BD / 2 + 0.02); g.add(led);
  parts.led = ledMat; parts.slotY = cy + 0.3; parts.BD = BD;
  // fill bar floating above the box
  var barMat = new THREE.MeshStandardMaterial({ color: ACC, emissive: ACC, emissiveIntensity: 0.35, roughness: 0.5, transparent: true, opacity: 0.95 });
  var barG = new THREE.CylinderGeometry(0.16, 0.16, 1, 20); barG.translate(0, 0.5, 0);
  var bar = mesh(barG, barMat, false, false); bar.position.y = y0 + BH + 0.35; bar.scale.y = 0.001; bar.userData.noCloud = true; g.add(bar);
  parts.bar = bar; parts.barMat = barMat;
  g.userData = parts;
  return g;
}

/* intersections that get a postbox; side = which corner of the crossing */
var SPOTS = [[0, 0, 1, 1], [-2, -2, 1, -1], [-1, -2, -1, 1], [1, -2, 1, 1], [2, -1, -1, -1], [-3, -1, 1, 1], [-1, -1, 1, -1], [0, -3, -1, 1],
             [2, 1, 1, -1], [-2, 0, -1, -1], [1, 2, -1, 1], [-1, 1, 1, 1], [3, 0, -1, 1], [-2, 2, 1, -1], [0, 2, 1, 1], [2, 3, -1, -1], [-3, 3, 1, -1], [3, -3, -1, 1]];
var FILL = [0.12, 0.96, 0.18, 0.84, 0.08, 0.3, 0.9, 0.15, 0.22, 0.78, 0.05, 0.4, 0.88, 0.14, 0.26, 0.1, 0.82, 0.2];
var boxes = [], hero;
var ringG = new THREE.RingGeometry(0.82, 1, 48);
SPOTS.forEach(function (s, i) {
  var isHero = i === 0, g = postbox(isHero);
  var x = s[0] * STEP + s[2] * 1.75, z = s[1] * STEP + s[3] * 1.75;
  g.position.set(x, 0, z);
  g.rotation.y = s[3] > 0 ? Math.PI : 0;                      // face the street
  scene.add(g);
  // signal ring: a full box "calls" the dispatcher
  var rm = new THREE.MeshBasicMaterial({ color: FULL, transparent: true, opacity: 0, depthWrite: false });
  var ring = new THREE.Mesh(ringG, rm); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.05, z); scene.add(ring);
  var item = { g: g, p: g.userData, node: [s[0], s[1]], fill: FILL[i], full: FILL[i] >= 0.75, hero: isHero, pos: new THREE.Vector3(x, 0, z), ring: ring, ringMat: rm };
  boxes.push(item); if (isHero) hero = item;
});

/* ---------- routes along streets (Manhattan between crossings) ---------- */
var DEPOT = [-3, -3];
function order(nodes) {                         // nearest-neighbour from the depot
  var left = nodes.slice(), cur = DEPOT, out = [];
  while (left.length) {
    var bi = 0, bd = 1e9;
    left.forEach(function (n, i) { var d = Math.abs(n[0] - cur[0]) + Math.abs(n[1] - cur[1]); if (d < bd) { bd = d; bi = i; } });
    cur = left.splice(bi, 1)[0]; out.push(cur);
  }
  return [DEPOT].concat(out, [DEPOT]);
}
function routePath(nodes, yy) {
  var pts = [], ns = order(nodes);
  function P(a) { return new THREE.Vector3(a[0] * STEP, yy, a[1] * STEP); }
  for (var i = 0; i < ns.length; i++) {
    var a = ns[i]; pts.push(P(a));
    if (i < ns.length - 1) { var b = ns[i + 1]; if (a[0] !== b[0] && a[1] !== b[1]) pts.push(P([b[0], a[1]])); }
  }
  var path = new THREE.CurvePath(), clean = [pts[0]];
  pts.forEach(function (p) { if (p.distanceTo(clean[clean.length - 1]) > 0.01) clean.push(p); });
  for (var j = 0; j < clean.length - 1; j++) path.add(new THREE.LineCurve3(clean[j], clean[j + 1]));
  return path;
}
function tube(path, mat, r) {
  var g = new THREE.TubeGeometry(path, 900, r, 6, false), m = mesh(g, mat, false, false);
  m.userData = { total: g.index.count, k: 0 }; g.setDrawRange(0, 0); scene.add(m); return m;
}
function uniq(arr) { var seen = {}; return arr.filter(function (n) { var k = n.join(); if (seen[k]) return false; seen[k] = 1; return true; }); }
var pathAll = routePath(uniq(boxes.map(function (b) { return b.node; })), 0.06);
var pathFull = routePath(uniq(boxes.filter(function (b) { return b.full; }).map(function (b) { return b.node; })), 0.09);
var matAll = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.9 });
var matFull = new THREE.MeshBasicMaterial({ color: ACC });
var tubeAll = tube(pathAll, matAll, 0.16), tubeFull = tube(pathFull, matFull, 0.24);
// live demo: the same 10 postboxes, 3 of them full (boxes 1, 3, 6). Conventional 30 blocks vs 12 = −60%
var DEMO = [0, 1, 2, 3, 4, 5, 6, 7, 8, 13];
boxes.forEach(function (b, i) { b.demo = DEMO.indexOf(i) >= 0; });
var pathConv = routePath(uniq(boxes.filter(function (b) { return b.demo; }).map(function (b) { return b.node; })), 0.06);
var pathOpt = routePath(uniq(boxes.filter(function (b) { return b.demo && b.full; }).map(function (b) { return b.node; })), 0.09);
var matConv = new THREE.MeshBasicMaterial({ color: 0x6b7a90 });
var tubeConv = tube(pathConv, matConv, 0.42), tubeOpt = tube(pathOpt, matFull, 0.5);
var depot = box(3.2, 1.4, 2.4, M.bld); depot.position.set(DEPOT[0] * STEP - 3, 0.7, DEPOT[1] * STEP - 3); scene.add(depot);
var droof = box(3.25, 0.12, 2.45, M.acc); droof.position.set(DEPOT[0] * STEP - 3, 1.46, DEPOT[1] * STEP - 3); scene.add(droof);

/* pilot zone (slide 9) */
var pilotMat = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0, depthWrite: false });
var pilot = mesh(new THREE.CircleGeometry(15, 64), pilotMat, false, false); pilot.rotation.x = -Math.PI / 2; pilot.position.set(-6, 0.03, -6); scene.add(pilot);
var ringPMat = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0 });
var ringP = mesh(new THREE.RingGeometry(14.7, 15.1, 96), ringPMat, false, false); ringP.rotation.x = -Math.PI / 2; ringP.position.set(-6, 0.04, -6); scene.add(ringP);
function inPilot(b) { return b.pos.distanceTo(pilot.position) < 15; }

/* ---------- van ---------- */
var van = new THREE.Group();
var vb = rbox(1.5, 0.85, 0.8, 0.12, M.van); vb.position.set(-0.1, 0.62, 0); van.add(vb);
var vc = rbox(0.55, 0.6, 0.78, 0.12, M.van); vc.position.set(0.85, 0.5, 0); van.add(vc);
var ws = box(0.04, 0.32, 0.66, M.dark); ws.position.set(1.12, 0.62, 0); van.add(ws);
var vs = box(1.52, 0.1, 0.82, M.acc); vs.position.set(-0.1, 0.45, 0); van.add(vs);
var vanHead = std(0xffffff, 0.3, 0, { emissive: 0xfff3d6, emissiveIntensity: 1 });
[0.26, -0.26].forEach(function (z) { var h = box(0.03, 0.08, 0.14, vanHead); h.position.set(1.13, 0.4, z); h.castShadow = false; van.add(h); });
var vanBrake = std(0xff3b30, 0.4, 0, { emissive: 0xff2a1f, emissiveIntensity: 1.2 });
[0.3, -0.3].forEach(function (z) { var h = box(0.03, 0.1, 0.1, vanBrake); h.position.set(-0.86, 0.6, z); h.castShadow = false; van.add(h); });
[[-0.55, 0.35], [-0.55, -0.35], [0.75, 0.35], [0.75, -0.35]].forEach(function (p) { var wh = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 16), M.dark); wh.rotation.x = Math.PI / 2; wh.position.set(p[0], 0.18, p[1]); van.add(wh); });
van.scale.setScalar(1.15); scene.add(van);
var vanU = 0;

/* ---------- letters for the hero box ---------- */
/* small letters: envelopes of different sizes and colours, each with a stamp.
   Fill % = height of the pile against the free height inside (what the distance sensor sees),
   and the letters are sized so that the last one reaches the sensor: all letters = 100%. */
var CAP = 40, STACK_MAX = hero.p.freeH, FULL_FILL = 0.8, BASE = [0], letters = [], LT = [], WEIGHTS = [], LPOS = [];
var envMats = [0xfbfbf8, 0xf3ead8, 0xe4eef8, 0xd9c2a0, 0xfdf3f0, 0xeaf6ef].map(function (c) { return std(c, 0.9); });
var stampMats = [std(ACC, 0.6), std(FULL, 0.6), std(0x3b6fd8, 0.6), std(0xf2b233, 0.6)];
(function () {
  var r = function () { return rnd(); }, raw = [], sum = 0;
  for (var i = 0; i < CAP; i++) { var t = 0.7 + r() * 0.6; raw.push(t); sum += t; }
  for (var j = 0; j < CAP; j++) {
    var th = raw[j] / sum * STACK_MAX, w = 0.34 + r() * 0.14, d = 0.2 + r() * 0.1;
    var L = new THREE.Group();
    var env = box(w, th, d, envMats[j % envMats.length]); L.add(env);
    var st = box(0.05, 0.004, 0.06, stampMats[j % stampMats.length]); st.position.set(w / 2 - 0.045, th / 2 + 0.002, -d / 2 + 0.05); st.castShadow = false; L.add(st);
    L.visible = false; L.traverse(function (o) { o.userData.noCloud = true; }); L.userData.noCloud = true;
    hero.g.add(L); letters.push(L); LT.push(th); WEIGHTS.push(14 + Math.round(r() * 22));
    LPOS.push({ x: (r() - 0.5) * 0.14, z: (r() - 0.5) * 0.1, yaw: (r() - 0.5) * 0.9, tilt: (r() - 0.5) * 0.06 });
    BASE.push(BASE[j] + th);
  }
})();
var heroState = { n: 0, t: 0, phase: 'fill', grams: 0, born: [], clock: 0 };
var DROP_EVERY = 0.24, DROP_TIME = 0.6;

/* ---------- point cloud: the postbox made of light ---------- */
var CLOUD_N = 16000;
function sampleSurface(root, n, only) {
  root.updateMatrixWorld(true);
  var inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), tri = [], tot = 0, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  root.traverse(function (m) {
    if (!m.isMesh || m.userData.noCloud) return;
    if (only && only.indexOf(m) < 0) return;
    var mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), g = m.geometry, pos = g.attributes.position, ix = g.index, cnt = ix ? ix.count : pos.count;
    for (var i = 0; i + 2 < cnt; i += 3) {
      a.fromBufferAttribute(pos, ix ? ix.getX(i) : i).applyMatrix4(mw);
      b.fromBufferAttribute(pos, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(mw);
      c.fromBufferAttribute(pos, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(mw);
      var ar = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5; if (ar < 1e-9) continue;
      tot += ar; tri.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, tot);
    }
  });
  var nt = tri.length / 10, out = new Float32Array(n * 3);
  for (var k = 0; k < n; k++) {
    var r = Math.random() * tot, lo = 0, hi = nt - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (tri[mid * 10 + 9] < r) lo = mid + 1; else hi = mid; }
    var o = lo * 10, s1 = Math.sqrt(Math.random()), s2 = Math.random(), wa = 1 - s1, wb = s1 * (1 - s2), wc = s1 * s2;
    out[k * 3] = tri[o] * wa + tri[o + 3] * wb + tri[o + 6] * wc;
    out[k * 3 + 1] = tri[o + 1] * wa + tri[o + 4] * wb + tri[o + 7] * wc;
    out[k * 3 + 2] = tri[o + 2] * wa + tri[o + 5] * wb + tri[o + 8] * wc;
  }
  return out;
}
function makeCloud(tgt, rMin, rMax, cy) {
  var n = tgt.length / 3, geo = new THREE.BufferGeometry(), start = new Float32Array(n * 3), delay = new Float32Array(n), sd = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin), q = Math.sqrt(1 - u * u);
    start[i * 3] = Math.cos(th) * q * r; start[i * 3 + 1] = cy + u * r * 0.7; start[i * 3 + 2] = Math.sin(th) * q * r;
    delay[i] = Math.pow(Math.random(), 0.8); sd[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(tgt, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  var mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uK: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 }, uSize: { value: 2.2 }, uPix: { value: PR }, uColor: { value: new THREE.Color(ACC) } },
    vertexShader: 'attribute vec3 aStart;attribute float aDelay;attribute float aSeed;uniform float uK,uTime,uSize,uPix;varying float vK;' +
      'void main(){float k=clamp(uK*1.6-aDelay*0.6,0.0,1.0);k=k*k*(3.0-2.0*k);vK=k;' +
      'vec3 j=vec3(sin(uTime*1.3+aSeed*31.0),cos(uTime*1.1+aSeed*17.0),sin(uTime*0.9+aSeed*23.0));' +
      'vec3 p=mix(aStart,position,k)+j*(0.18*(1.0-k)+0.006);' +
      'vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=uSize*uPix*(6.0/-mv.z)*(0.8+0.4*aSeed);}',
    fragmentShader: 'uniform vec3 uColor;uniform float uAlpha;varying float vK;' +
      'void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.0,d);gl_FragColor=vec4(uColor*(0.85+0.6*vK),a*uAlpha*(0.45+0.55*vK));}'
  });
  var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; scene.add(pts);
  return pts;
}
var cloud = makeCloud(sampleSurface(hero.g, CLOUD_N), 2.2, 5.4, 2.3), cloudMat = cloud.material;
// the sensor module alone: it "installs" itself into the box (Solution slide)
var modCloud = makeCloud(sampleSurface(hero.g, 9000, hero.p.module), 0.7, 1.9, 1.3), modMat = modCloud.material;
var cloudMode = 'off';   // off | assemble (box) | install (module) | giant

/* ---------- HTML labels ---------- */
var labelsEl = document.getElementById('labels'), labels = [];
function label(html, cls, getPos) {
  var o = document.createElement('div'); o.className = 'lab';
  var i = document.createElement('div'); i.className = 'tagl ' + (cls || ''); i.innerHTML = html; o.appendChild(i);
  labelsEl.appendChild(o); var l = { el: o, inner: i, pos: getPos, on: false }; labels.push(l); return l;
}
var heroLab = label('', 'big', function () { return hero.g.localToWorld(new THREE.Vector3(0.62, 1.55, 0)); }); heroLab.el.classList.add('side'); heroLab.free = true;
boxes.forEach(function (b) { b.lab = label('', '', function () { return b.pos.clone().add(new THREE.Vector3(0, 3.6, 0)); }); });

/* ---------- views: camera + flags per slide ---------- */
var HX = HERO.x, HZ = HERO.z;
var VIEWS = {
  hero:       { grp: 'box', pos: [HX + 2.2, 2.2, HZ - 5.2], tgt: [HX, 1.05, HZ], ox: 0.2, shade: 0, shadeL: 1, cut: 0, letters: 0, route: 'none', status: 'live', cloud: 'assemble' },
  cutaway:    { grp: 'box', pos: [HX + 1.7, 2.0, HZ - 4.3], tgt: [HX, 1.1, HZ], ox: 0.12, shade: 0, shadeL: 1, cut: 1, letters: 1, route: 'none', status: 'live', heroLab: 1, ring: 1 },
  cutawayVid: { grp: 'box', pos: [HX + 1.7, 2.0, HZ - 4.3], tgt: [HX, 1.1, HZ], ox: 0.12, shade: 0.5, shadeL: 1, cut: 1, letters: 1, route: 'none', status: 'live', ring: 1 },
  heroDim:    { grp: 'box', pos: [HX - 3.2, 2.6, HZ - 5.6], tgt: [HX, 1.0, HZ], ox: 0.1, shade: 0.72, shadeL: 0.7, cut: 0, letters: 1, route: 'none', status: 'live', orbit: 1 },
  cutawayDim: { grp: 'box', pos: [HX - 3.4, 2.6, HZ - 6.2], tgt: [HX, 1.0, HZ], ox: 0.08, shade: 0.62, shadeL: 0.6, cut: 1, letters: 1, route: 'none', status: 'live', orbit: 1 },
  cityAll:    { grp: 'city', pos: [8, 48, 52], tgt: [2, 0, -2], ox: 0.0, shade: 0.55, shadeL: 0.6, route: 'all', status: 'unknown', bars: 0, vanOn: 1 },
  cityStatus: { grp: 'city', pos: [24, 50, 48], tgt: [4, 0, -2], ox: 0.3, shade: 0, shadeL: 1, route: 'none', status: 'known', bars: 1, labs: 'full', rings: 1 },
  cityFull:   { grp: 'city', pos: [22, 52, 50], tgt: [4, 0, -2], ox: 0.3, shade: 0, shadeL: 1, route: 'full', status: 'known', bars: 1, vanOn: 1, labs: 'full', rings: 1 },
  cityHigh:   { beams: 1, grp: 'city', pos: [0, 62, 44], tgt: [0, 0, 0], ox: 0, shade: 0.62, shadeL: 0.5, route: 'full', status: 'known', bars: 1, vanOn: 1, rings: 1 },
  cityPilot:  { grp: 'city', pos: [12, 36, 34], tgt: [-6, 0, -6], ox: 0.24, shade: 0, shadeL: 1, route: 'full', status: 'known', bars: 1, vanOn: 1, pilot: 1, labs: 'pilot', rings: 1 },
  cityFar:    { grp: 'city', pos: [34, 70, 70], tgt: [-2, 4, -4], ox: 0.24, shade: 0, shadeL: 1, route: 'full', status: 'known', bars: 1, vanOn: 1, pulse: 1, orbit: 1, cloud: 'giant', rings: 1 }
};
VIEWS.install = { heroLab: 1, ring: 1, grp: 'box', pos: [HX + 1.7, 2.0, HZ - 4.3], tgt: [HX, 1.1, HZ], ox: 0.2, shade: 0, shadeL: 1, cut: 1, letters: 1, route: 'none', status: 'live', cloud: 'install' };
VIEWS.module = { grp: 'box', pos: [HX + 1.95, 1.9, HZ - 4.3], tgt: [HX, 1.05, HZ], ox: 0.2, shade: 0, shadeL: 1, cut: 1, letters: 0, route: 'none', status: 'live', modLabs: 1 };
VIEWS.split = { fog: [220, 420], grp: 'city', pos: [-4, 112, 34], tgt: [-4, 0, -21], ox: 0, shade: 0, shadeL: 0, shadeT: 1, split: 1, route: 'demo', status: 'demo', vanOn: 1 };
VIEWS.splitDim = { fog: [220, 420], grp: 'city', pos: [-4, 112, 34], tgt: [-4, 0, -21], ox: 0, shade: 0.55, shadeL: 0, shadeT: 1, split: 1, route: 'demo', status: 'demo', vanOn: 1 };
VIEWS.moduleX = {}; for (var mk in VIEWS.module) VIEWS.moduleX[mk] = VIEWS.module[mk]; VIEWS.moduleX.explode = 1; VIEWS.moduleX.pos = [HX + 2.9, 2.35, HZ - 6.0];
var hooks = { frame: [], enter: [], theme: [], side: [] };
S.hook = function (kind, fn) { hooks[kind].push(fn); if (kind === 'theme') fn(T); };
S.addViews = function (o) { for (var k in o) VIEWS[k] = o[k]; };
var cur = { pos: new THREE.Vector3(8, 40, 46), tgt: new THREE.Vector3(), ox: 0, cut: 0, bars: 0, pilot: 0 };
var view = VIEWS.hero, viewName = '', viewT = 0, orbitA = 0;
var fadeEl = document.getElementById('fade'), fadeTimer = null;

function snapCamera() { cur.pos.fromArray(view.pos); cur.tgt.fromArray(view.tgt); cur.ox = view.ox || 0; }
function enterView(name) {
  var v = VIEWS[name] || VIEWS.hero, prev = view;
  if (v.route === 'all' && prev.route !== 'all') { tubeAll.userData.k = 0; vanU = 0; }
  if (v.route === 'full' && prev.route !== 'full') { tubeFull.userData.k = 0; vanU = 0; }
  if (v.cloud !== prev.cloud || !viewName) startCloud(v.cloud);
  view = v; viewName = name; viewT = 0; orbitA = 0;
  if (v.route === 'demo' && prev.route !== 'demo') { tubeConv.userData.k = 0; tubeOpt.userData.k = 0; vanU = 0; }
  hooks.enter.forEach(function (f) { f(v, name, prev); });
  document.documentElement.style.setProperty('--shadeT', v.shadeT || 0);
  document.documentElement.style.setProperty('--shade', v.shade || 0);
  document.documentElement.style.setProperty('--shadeL', v.shadeL == null ? 1 : v.shadeL);
}
S.view = function (name) {
  if (name === viewName) return;
  var v = VIEWS[name] || VIEWS.hero;
  if (STATIC) { enterView(name); snapAll(); return; }
  // jumping between the box close-up and the city: dip to the background instead of flying through houses
  if (viewName && v.grp !== view.grp) {
    clearTimeout(fadeTimer); fadeEl.classList.add('on');
    fadeTimer = setTimeout(function () { enterView(name); snapCamera(); fadeEl.classList.remove('on'); }, 320);
    return;
  }
  var first = !viewName; enterView(name); if (first) snapCamera();
};
function snapAll() {
  snapCamera(); cur.cut = view.cut || 0; cur.bars = view.bars || 0; cur.pilot = view.pilot || 0; viewT = 10;
  tubeAll.userData.k = 1; tubeFull.userData.k = 1; tubeConv.userData.k = 1; tubeOpt.userData.k = 1; vanU = 0.37;
  if (view.letters) { heroState.n = /[?&]fill=full/.test(location.search) ? CAP : 34; heroState.phase = 'fill'; heroState.t = 0; heroState.born = []; }
  if (cloudMode === 'assemble') { cloudMat.uniforms.uK.value = 1; cloudMat.uniforms.uAlpha.value = 0; cloud.visible = false; hero.g.visible = true; cloudMode = 'off'; }
  if (cloudMode === 'giant') { cloudMat.uniforms.uK.value = 1; cloudMat.uniforms.uAlpha.value = GIANT_A(); }
  if (cloudMode === 'install') { modMat.uniforms.uK.value = 1; modMat.uniforms.uAlpha.value = 0; modCloud.visible = false; hero.p.module.forEach(function (m) { m.visible = true; }); cloudMode = 'off'; }
}

function startCloud(mode) {
  cloudMode = mode || 'off';
  hero.g.visible = true;
  hero.p.module.forEach(function (m) { m.visible = true; });
  cloud.visible = cloudMode === 'assemble' || cloudMode === 'giant';
  modCloud.visible = cloudMode === 'install';
  cloudMat.uniforms.uK.value = 0; modMat.uniforms.uK.value = 0;
  if (cloudMode === 'install') {
    hero.g.updateMatrixWorld(true);
    modCloud.position.copy(hero.g.position); modCloud.rotation.copy(hero.g.rotation);
    modMat.uniforms.uSize.value = 1.6; modMat.uniforms.uAlpha.value = 1;
    hero.p.module.forEach(function (m) { m.visible = false; });
  }
  if (cloudMode === 'assemble') {
    hero.g.updateMatrixWorld(true);
    cloud.position.copy(hero.g.position); cloud.rotation.copy(hero.g.rotation); cloud.scale.setScalar(1);
    cloudMat.uniforms.uSize.value = 2.4; cloudMat.uniforms.uAlpha.value = 1; hero.g.visible = false;
  } else if (cloudMode === 'giant') {
    cloud.position.set(0, 8, -6); cloud.rotation.set(0, 0.6, 0); cloud.scale.setScalar(13);
    cloudMat.uniforms.uSize.value = 34; cloudMat.uniforms.uAlpha.value = GIANT_A();
  }
}

/* ---------- theme ---------- */
var T = THEMES.light;
S.theme = function (name) {
  T = THEMES[name] || THEMES.light;
  scene.background = new THREE.Color(T.bg);
  scene.fog = new THREE.Fog(T.bg, T.fog[0], T.fog[1]);
  M.ground.color.setHex(T.ground); M.road.color.setHex(T.road); M.bld.color.setHex(T.bld); M.bldTop.color.setHex(T.bldTop);
  M.box.color.setHex(T.box); M.trim.color.setHex(T.boxTrim); M.van.color.setHex(T.van);
  if (hero.p.frontMat) hero.p.frontMat.color.setHex(T.box);
  matAll.color.setHex(T.muted); matConv.color.setHex(T.name === 'dark' ? 0x8a97ad : 0x6b7a90);
  hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2]; sun.intensity = T.sun;
  rim.color.setHex(T.rim[0]); rim.intensity = T.rim[1]; kick.color.setHex(T.kick[0]); kick.intensity = T.kick[1];
  hooks.theme.forEach(function (f) { f(T); });
  boxes.forEach(function (b) { b.p.led.emissiveIntensity = T.led; b.p.barMat.emissiveIntensity = T.name === 'dark' ? 0.7 : 0.35; });
  M.acc.emissiveIntensity = T.name === 'dark' ? 0.45 : 0.15;
  matFull.color.setHex(T.name === 'dark' ? 0x19c08e : ACC);
  cloudMat.uniforms.uColor.value.setHex(T.cloud); modMat.uniforms.uColor.value.setHex(T.cloud);
  modMat.blending = T.cloudBlend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending; modMat.needsUpdate = true;
  cloudMat.blending = T.cloudBlend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending; cloudMat.needsUpdate = true;
};

/* ---------- glow pass (dark theme): bright parts bleed light, then vignette + grain ---------- */
var post = null;
function makePost() {
  try {
    var gl2 = renderer.capabilities.isWebGL2;
    var half = gl2 && (renderer.extensions.get('EXT_color_buffer_float') || renderer.extensions.get('EXT_color_buffer_half_float'));
    var type = half ? THREE.HalfFloatType : THREE.UnsignedByteType;
    function rt(ms) {
      var o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: type, depthBuffer: !!ms, stencilBuffer: false };
      if (ms && gl2 && THREE.WebGLMultisampleRenderTarget) { var r = new THREE.WebGLMultisampleRenderTarget(1, 1, o); r.samples = 4; return r; }
      return new THREE.WebGLRenderTarget(1, 1, o);
    }
    var P = { main: rt(true), a: rt(), b: rt(), c: rt(), d: rt() };
    var VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
    function mat(fs, u) { u.tA = { value: null }; u.px = { value: new THREE.Vector2() }; return new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: 'varying vec2 vUv;uniform sampler2D tA;uniform vec2 px;' + fs, depthTest: false, depthWrite: false }); }
    P.bright = mat('uniform float th;void main(){vec3 c=texture2D(tA,vUv).rgb;if(!(c.r>=0.0&&c.g>=0.0&&c.b>=0.0&&c.r<1e4&&c.g<1e4&&c.b<1e4))c=vec3(0.0);c=min(c,vec3(6.0));float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(th,th+0.35,l),1.0);}', { th: { value: 0.78 } });
    P.blur = mat('uniform vec2 dir;void main(){vec2 o=dir*px;vec3 s=texture2D(tA,vUv).rgb*0.227;' +
      's+=(texture2D(tA,vUv+o*1.38).rgb+texture2D(tA,vUv-o*1.38).rgb)*0.316;s+=(texture2D(tA,vUv+o*3.23).rgb+texture2D(tA,vUv-o*3.23).rgb)*0.07;gl_FragColor=vec4(s,1.0);}', { dir: { value: new THREE.Vector2(1, 0) } });
    P.copy = mat('void main(){gl_FragColor=texture2D(tA,vUv);}', {});
    P.comp = mat('uniform sampler2D tB,tC;uniform float s1,s2,vig,grain,t;' +
      'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}' +
      'void main(){vec3 c=texture2D(tA,vUv).rgb;if(!(c.r>=0.0&&c.g>=0.0&&c.b>=0.0&&c.r<1e4))c=vec3(0.0);c+=texture2D(tB,vUv).rgb*s1+texture2D(tC,vUv).rgb*s2;' +
      'float v=smoothstep(1.05,0.25,length((vUv-0.5)*vec2(1.25,1.0)));c*=mix(1.0,v,vig);' +
      'c+=(h(vUv*1000.0+t)-0.5)*grain;gl_FragColor=vec4(c,1.0);}',
      { tB: { value: null }, tC: { value: null }, s1: { value: 0.85 }, s2: { value: 0.9 }, vig: { value: 0.38 }, grain: { value: 0.022 }, t: { value: 0 } });
    P.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    P.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), P.copy); P.scene = new THREE.Scene(); P.scene.add(P.quad);
    P.size = function () {
      var w = Math.max(1, Math.floor(W * PR)), h = Math.max(1, Math.floor(H * PR));
      P.main.setSize(w, h); P.a.setSize(w >> 1, h >> 1); P.b.setSize(w >> 1, h >> 1); P.c.setSize(w >> 2, h >> 2); P.d.setSize(w >> 2, h >> 2);
    };
    P.pass = function (m, src, dst) { P.quad.material = m; m.uniforms.tA.value = src.texture; m.uniforms.px.value.set(1 / src.width, 1 / src.height); renderer.setRenderTarget(dst); renderer.render(P.scene, P.cam); };
    P.render = function (time) {
      drawWorld(P.main);
      P.pass(P.bright, P.main, P.a);
      P.blur.uniforms.dir.value.set(1, 0); P.pass(P.blur, P.a, P.b); P.blur.uniforms.dir.value.set(0, 1); P.pass(P.blur, P.b, P.a);
      P.pass(P.copy, P.a, P.c);
      P.blur.uniforms.dir.value.set(1, 0); P.pass(P.blur, P.c, P.d); P.blur.uniforms.dir.value.set(0, 1); P.pass(P.blur, P.d, P.c);
      P.blur.uniforms.dir.value.set(2, 0); P.pass(P.blur, P.c, P.d); P.blur.uniforms.dir.value.set(0, 2); P.pass(P.blur, P.d, P.c);
      P.comp.uniforms.tB.value = P.a.texture; P.comp.uniforms.tC.value = P.c.texture; P.comp.uniforms.t.value = time % 100;
      P.pass(P.comp, P.main, null);
    };
    P.size();
    return P;
  } catch (e) { console.warn('post off', e); return null; }
}
if (!NOFX) post = makePost();

/* ---------- per-frame ---------- */
var clock = new THREE.Clock(), tmp = new THREE.Vector3(), tmpT = new THREE.Vector3(), elapsed = 0;

function updateHero(dt) {
  var s = heroState, active = !!view.letters && cloudMode !== 'install';
  if (!active) { s.n = 0; s.phase = 'fill'; s.t = 0; s.born = []; }
  s.clock += dt;
  if (active && !STATIC) {
    s.t += dt;
    if (s.phase === 'fill' && s.t > DROP_EVERY) { s.t = 0; s.born[s.n] = s.clock; s.n++; if (s.n >= CAP) s.phase = 'hold'; }
    else if (s.phase === 'hold' && s.t > 3.0) { s.phase = 'collect'; s.t = 0; }
    else if (s.phase === 'collect' && s.t > 1.2) { s.phase = 'fill'; s.t = 0; s.n = 0; s.born = []; }
  }
  var grams = 0, landed = 0, fz = hero.p.BD / 2 + 0.3;
  letters.forEach(function (L, i) {
    var shown = i < s.n && s.phase !== 'collect';
    L.visible = shown;
    if (!shown) return;
    var q = LPOS[i], restY = hero.p.plateY + BASE[i] + LT[i] / 2;
    var age = (STATIC || s.born[i] == null) ? 1 : clamp((s.clock - s.born[i]) / DROP_TIME, 0, 1);
    if (age >= 1) { landed = i + 1; grams += WEIGHTS[i]; }
    if (age < 0.35) {            // slides in flat through the slot
      var a = age / 0.35; L.position.set(0, hero.p.slotY, lerp(fz, 0.06, a)); L.rotation.set(0.1, 0, 0);
    } else {                     // drops and settles on the pile, slightly turned
      var b2 = (age - 0.35) / 0.65, e = b2 * b2;
      L.position.set(lerp(0, q.x, e), lerp(hero.p.slotY - 0.02, restY, e), lerp(0.06, q.z, e));
      L.rotation.set(lerp(0.1, q.tilt, e), q.yaw * e, q.tilt * e);
    }
  });
  if (STATIC) { landed = Math.min(s.n, CAP); grams = 0; for (var gi = 0; gi < landed; gi++) grams += WEIGHTS[gi]; }
  s.grams = grams;
  // the sensor reads what has landed
  var fill = Math.min(1, BASE[landed] / STACK_MAX), full = fill >= FULL_FILL && s.phase !== 'collect';
  hero.p.led.color.setHex(full ? FULL : ACC); hero.p.led.emissive.setHex(full ? FULL : ACC);
  hero.liveFill = s.phase === 'collect' ? 0 : fill; hero.liveFull = full;
  var st = s.phase === 'collect' ? '<span class="st">Collected ✓</span>' : full ? '<span class="st">Flagged for collection</span>' : '<span class="st">Has space</span>';
  heroLab.inner.className = 'tagl big' + (full ? ' full' : '');
  heroLab.inner.innerHTML = '<span class="k">Box LV-0142 · live</span><span>' + (s.phase === 'collect' ? 0 : landed) + ' letters · ' + (s.phase === 'collect' ? 0 : grams) + ' g · ' + Math.round(hero.liveFill * 100) + '%</span>' + st;
}

function updateCloud(dt) {
  var u = cloudMat.uniforms; u.uTime.value = elapsed; modMat.uniforms.uTime.value = elapsed;
  if (cloudMode === 'install') {
    var m = modMat.uniforms;
    if (!STATIC) m.uK.value = Math.min(1, m.uK.value + dt / 2.4);
    if (m.uK.value >= 1) {
      hero.p.module.forEach(function (o) { o.visible = true; });
      m.uAlpha.value = Math.max(0, m.uAlpha.value - dt / 0.7);
      if (m.uAlpha.value <= 0) { modCloud.visible = false; cloudMode = 'off'; }
    }
  }
  if (cloudMode === 'assemble') {
    if (!STATIC) u.uK.value = Math.min(1, u.uK.value + dt / 2.6);
    if (u.uK.value >= 1) {                  // assembled: the real box takes over, the light fades
      hero.g.visible = true;
      u.uAlpha.value = Math.max(0, u.uAlpha.value - dt / 0.8);
      if (u.uAlpha.value <= 0) { cloud.visible = false; cloudMode = 'off'; }
    }
  } else if (cloudMode === 'giant') {
    if (!STATIC) { u.uK.value = Math.min(1, u.uK.value + dt / 3.2); cloud.rotation.y += dt * 0.12; }
    cloud.position.y = 8 + Math.sin(elapsed * 0.6) * 0.4;
  }
}

function setLabel(l, on) {
  l.on = on; l.el.classList.toggle('on', on);
  if (!on) return;
  tmp.copy(l.pos()).project(camera);
  if (tmp.z > 1 || (!l.free && tmp.x < 0.1)) { l.el.classList.remove('on'); return; }  // keep the text column clear
  l.el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * W).toFixed(1) + 'px,' + ((1 - tmp.y) / 2 * H).toFixed(1) + 'px)';
}

/* split screen (live demo): left = conventional route, right = EmptyLess route */
var demoU = { conv: 0, opt: 0 };
function placeVan(path, u) {
  var vp = path.getPointAt(u), vn = path.getPointAt(Math.min(1, u + 0.002));
  van.position.set(vp.x, 0, vp.z);
  if (vn.distanceTo(vp) > 1e-4) van.rotation.y = Math.atan2(-(vn.z - vp.z), vn.x - vp.x);
}
function prepareSide(side) {
  var right = side === 2;
  tubeConv.visible = !right; tubeOpt.visible = right;
  van.visible = true; placeVan(right ? pathOpt : pathConv, right ? demoU.opt : demoU.conv);
  boxes.forEach(function (b, i) {
    if (!b.demo) return;
    var c = right ? (b.full ? FULL : ACC) : T.unknown;
    b.p.led.color.setHex(c); b.p.led.emissive.setHex(c);
    var on = right && b.full, ph = (elapsed * 0.45 + i * 0.37) % 1;
    b.ring.visible = on;
    if (on) { b.ring.scale.setScalar(1.2 + ph * 4.5); b.ringMat.opacity = (1 - ph) * (T.name === 'dark' ? 0.9 : 0.6); }
  });
  hooks.side.forEach(function (f) { f(side); });
}
var splitLabs = boxes.map(function (b) {
  var o = document.createElement('div'); o.className = 'lab';
  var i = document.createElement('div'); o.appendChild(i); labelsEl.appendChild(o);
  return { el: o, inner: i };
});
var tmpS = new THREE.Vector3();
function placeSplitLab(l, b, side, hw) {
  tmpS.copy(b.pos).add(new THREE.Vector3(0, 6.5, 0)).project(camera);
  l.el.style.transform = 'translate(' + ((tmpS.x + 1) / 2 * hw + (side === 2 ? hw : 0)).toFixed(1) + 'px,' + ((1 - tmpS.y) / 2 * H).toFixed(1) + 'px)';
}
function splitLabels(side, hw) {
  boxes.forEach(function (b, i) {
    var pair = side === 1 ? splitLabs[i] : b.lab;
    if (!view.split || !b.demo || viewT < 0.8 || view.shade > 0.3) { if (side === 1) splitLabs[i].el.classList.remove('on'); return; }
    if (side === 1) { pair.inner.className = 'tagl q'; pair.inner.innerHTML = '?'; }
    else if (b.full) { pair.inner.className = 'tagl full'; pair.inner.innerHTML = '<span class="dot full"></span>' + Math.round(b.fill * 100) + '%'; }
    else { pair.el.classList.remove('on'); return; }
    placeSplitLab(pair, b, side, hw); pair.el.classList.add('on');
  });
}
function drawWorld(target) {
  if (!view.split) { splitLabs.forEach(function (l) { l.el.classList.remove('on'); }); renderer.setRenderTarget(target); renderer.render(scene, camera); return; }
  var hw = Math.floor(W / 2);
  camera.clearViewOffset(); camera.aspect = hw / H; camera.updateProjectionMatrix();
  for (var side = 1; side <= 2; side++) {
    prepareSide(side); splitLabels(side, hw);
    var x = side === 1 ? 0 : hw;
    if (target) {
      var sx = target.width / W;
      target.viewport.set(Math.floor(x * sx), 0, Math.floor(hw * sx), target.height);
      target.scissor.copy(target.viewport); target.scissorTest = true;
      renderer.setRenderTarget(target);
    } else {
      renderer.setRenderTarget(null); renderer.setViewport(x, 0, hw, H); renderer.setScissor(x, 0, hw, H); renderer.setScissorTest(true);
    }
    renderer.render(scene, camera);
  }
  if (target) { target.viewport.set(0, 0, target.width, target.height); target.scissorTest = false; }
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
}

/* Engineering slide: name the parts of the module */
var modLabs = [['tof', 'Fill-level sensor', 'sensor', [-0.1, 0.3, 0]], ['pcb', 'Controller + wireless', 'data transmission', [0.62, 0.2, 0]], ['bat', 'Battery', 'power', [-0.62, 0.02, 0]], ['cell', 'Sensor mount', 'inside the existing box', [0.62, -0.02, 0]]].map(function (d) {
  var l = label('<span class="k">' + d[2] + '</span><span>' + d[1] + '</span>', 'part', function () { return hero.g.localToWorld(hero.p.obj[d[0]].position.clone().add(new THREE.Vector3(d[3][0], d[3][1], d[3][2]))); });
  l.free = true; l.el.classList.add('pin'); return l;
});

function frame() {
  var dt = Math.min(clock.getDelta(), 0.05); elapsed += dt; viewT += dt;
  var k = STATIC ? 1 : ease(dt, 2.0);
  // camera: target view, optional slow orbit, and a gentle drift so the picture never freezes
  var p = tmp.fromArray(view.pos), tg = tmpT.fromArray(view.tgt);
  if (view.orbit && !STATIC) { orbitA += dt * 0.05; var dd = p.clone().sub(tg); dd.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(orbitA) * 0.35); p.copy(tg).add(dd); }
  if (!STATIC) { var dist = p.distanceTo(tg) * 0.012; p.x += Math.sin(elapsed * 0.31) * dist; p.y += Math.sin(elapsed * 0.23 + 1) * dist * 0.6; p.z += Math.cos(elapsed * 0.27) * dist; }
  cur.pos.lerp(p, k); cur.tgt.lerp(tg, k);
  cur.ox = lerp(cur.ox, view.ox || 0, k);
  camera.position.copy(cur.pos); camera.lookAt(cur.tgt);
  camera.setViewOffset(W, H, -cur.ox * W, 0, W, H);

  // cutaway: front panel fades, inner parts visible
  cur.cut = lerp(cur.cut, view.cut || 0, STATIC ? 1 : ease(dt, 3));
  hero.p.frontMat.opacity = 1 - cur.cut * 0.9; hero.p.frontMat.depthWrite = cur.cut < 0.5;
  hero.p.skin.forEach(function (m) { m.visible = cur.cut < 0.5; });
  updateHero(dt);
  updateCloud(dt);
  cur.explode = lerp(cur.explode || 0, view.explode || 0, STATIC ? 1 : ease(dt, 2.6));
  var ex = cur.explode * cur.explode * (3 - 2 * cur.explode);
  hero.p.explode.forEach(function (e, i) { e.m.position.copy(e.base).addScaledVector(e.off, ex); e.m.rotation.y = ex * (i % 2 ? 0.25 : -0.25); });

  // routes reveal
  [[tubeAll, view.route === 'all'], [tubeFull, view.route === 'full'], [tubeConv, view.route === 'demo'], [tubeOpt, view.route === 'demo']].forEach(function (r) {
    var m = r[0], u = m.userData;
    u.k = r[1] ? Math.min(1, u.k + dt / 2.6) : 0;
    m.visible = r[1]; m.geometry.setDrawRange(0, Math.floor(u.total * u.k / 3) * 3);
  });

  // van drives along the active route
  if (view.route === 'demo' && !STATIC) { demoU.conv = (demoU.conv + dt * 5.5 / pathConv.getLength()) % 1; demoU.opt = (demoU.opt + dt * 5.5 / pathOpt.getLength()) % 1; }
  var path = view.route === 'all' ? pathAll : view.route === 'full' ? pathFull : null;
  van.visible = !!(path && view.vanOn);
  if (van.visible) {
    if (!STATIC) vanU = (vanU + dt * 5.5 / path.getLength()) % 1;
    var vp = path.getPointAt(vanU), vn = path.getPointAt(Math.min(1, vanU + 0.002));
    van.position.set(vp.x, 0, vp.z);
    if (vn.distanceTo(vp) > 1e-4) van.rotation.y = Math.atan2(-(vn.z - vp.z), vn.x - vp.x);
  }

  // pilot zone
  cur.pilot = lerp(cur.pilot, view.pilot || 0, STATIC ? 1 : ease(dt, 3));
  pilotMat.opacity = cur.pilot * 0.1; ringPMat.opacity = cur.pilot * 0.9;

  // box status: unknown (grey) / known (green or red), fill bars, signal rings
  cur.bars = lerp(cur.bars, view.bars || 0, STATIC ? 1 : ease(dt, 2.5));
  boxes.forEach(function (b, i) {
    b.g.visible = view.split ? b.demo : (b.hero ? b.g.visible : true);
    b.g.scale.setScalar(view.split ? 2.4 : 1);
    if (view.split) { b.p.bar.visible = false; if (!b.demo) { b.ring.visible = false; b.lab.el.classList.remove('on'); } return; }
    var fill = b.hero ? hero.liveFill : b.fill, full = b.hero ? hero.liveFull : b.full;
    if (!b.hero) {
      var c = view.status === 'unknown' ? T.unknown : full ? FULL : ACC;
      b.p.led.color.setHex(c); b.p.led.emissive.setHex(c);
    }
    var pulse = view.pulse ? 0.75 + 0.25 * Math.sin(elapsed * 2 + i) : 1;
    var hide = view.pilot && !inPilot(b) ? 0.25 : 1;
    b.p.bar.scale.y = Math.max(0.001, cur.bars * (0.15 + fill * 2.2) * pulse * hide); b.p.bar.visible = cur.bars > 0.02;
    b.p.barMat.color.setHex(full ? FULL : ACC); b.p.barMat.emissive.setHex(full ? FULL : ACC);
    b.p.led.emissiveIntensity = full && view.status !== 'unknown' ? T.led * (0.55 + 0.45 * Math.sin(elapsed * 6 + i)) : T.led;
    // rings: full boxes call the dispatcher
    var ringOn = full && view.status !== 'unknown' && ((view.rings && !b.hero) || (view.ring && b.hero)) && hide === 1;
    var ph = (elapsed * 0.45 + i * 0.37) % 1, rs = b.hero ? 0.5 : 1;
    b.ring.visible = ringOn;
    if (ringOn) { b.ring.scale.setScalar((0.4 + ph * 2.6) * rs); b.ringMat.opacity = (1 - ph) * (T.name === 'dark' ? 0.9 : 0.6); }
    // labels
    var show = false;
    if (view.status === 'unknown' && !b.hero && !view.quiet) { show = i % 3 === 1; b.lab.inner.className = 'tagl'; b.lab.inner.innerHTML = '<span class="dot mute"></span>Full? Empty?'; }
    if (view.labs === 'full' && full && !b.hero) { show = true; b.lab.inner.className = 'tagl full'; b.lab.inner.innerHTML = '<span class="dot full"></span>' + Math.round(fill * 100) + '%'; }
    if (view.labs === 'pilot' && inPilot(b) && full) { show = true; b.lab.inner.className = 'tagl full'; b.lab.inner.innerHTML = '<span class="dot full"></span>' + Math.round(fill * 100) + '%'; }
    setLabel(b.lab, show && viewT > 0.9);
  });
  setLabel(heroLab, !!view.heroLab && viewT > 0.6 && hero.g.visible);
  modLabs.forEach(function (l, i) { setLabel(l, !!view.modLabs && viewT > 0.5 + i * 0.25); });

  var fg = view.fog || T.fog; scene.fog.near = fg[0]; scene.fog.far = fg[1];
  hooks.frame.forEach(function (f) { f(dt, view, elapsed); });
  if (post && T.post) post.render(elapsed); else drawWorld(null);
  requestAnimationFrame(frame);
}

S.core = { THREE: THREE, scene: scene, camera: camera, renderer: renderer, M: M, std: std, mesh: mesh, box: box, rbox: rbox, rnd: rnd, lerp: lerp, clamp: clamp, ease: ease,
  label: label, setLabel: setLabel, van: van, hero: hero, boxes: boxes, STEP: STEP, ACC: ACC, FULL: FULL, STATIC: STATIC, theme: function () { return T; }, view: function () { return view; }, viewT: function () { return viewT; } };
S.resize = function () {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  if (post) post.size();
};
addEventListener('resize', S.resize);
S.theme(document.documentElement.getAttribute('data-theme'));
requestAnimationFrame(frame);
})();
