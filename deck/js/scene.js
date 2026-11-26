/* MailGrid 3D scene — three.js r128 (global THREE), works from file:// with no network.
   One city, one hero postbox; slides only choose a camera "view" and a few flags. */
(function () {
'use strict';
var S = window.SCENE = {};
var STATIC = /[?&]static/.test(location.search);

/* ---------- themes (must match css/deck.css) ---------- */
var THEMES = {
  light: { bg: 0xffffff, ground: 0xf0f3f6, road: 0xe1e7ed, line: 0xffffff, bld: 0xffffff, bldTop: 0xf6f8fa,
           box: 0x172033, boxTrim: 0x2a3654, van: 0xffffff, muted: 0xaab4c2, unknown: 0x9aa5b4,
           hemi: [0xffffff, 0xcfd8e3, 0.62], sun: 0.72, fog: [70, 190], ledOff: 0x55627a },
  dark:  { bg: 0x172033, ground: 0x1b263c, road: 0x131b2c, line: 0x2b3852, bld: 0x2a3856, bldTop: 0x33435f,
           box: 0xe9eef4, boxTrim: 0xc5cfdb, van: 0xdfe6ee, muted: 0x5a6985, unknown: 0x7d8aa3,
           hemi: [0xcdd8ea, 0x101726, 0.9], sun: 0.85, fog: [60, 170], ledOff: 0x8a96aa }
};
var ACC = 0x0b9b70, FULL = 0xe5484d;

/* ---------- renderer ---------- */
var canvas = document.getElementById('gl');
var W = innerWidth, H = innerHeight;
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: STATIC });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
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
sun.shadow.bias = -0.0006; scene.add(sun);
var rim = new THREE.DirectionalLight(0xffffff, 0.12); rim.position.set(30, 12, -30); scene.add(rim);

/* ---------- helpers ---------- */
var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function std(c, r, m, o) { var p = { color: c, roughness: r == null ? 0.6 : r, metalness: m || 0 }; if (o) for (var k in o) p[k] = o[k]; return new THREE.MeshStandardMaterial(p); }
function mesh(g, m, cast, recv) { var x = new THREE.Mesh(g, m); x.castShadow = cast !== false; x.receiveShadow = recv !== false; return x; }
function box(w, h, d, m) { return mesh(new THREE.BoxGeometry(w, h, d), m); }
function rrShape(w, h, r) { var s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function rbox(w, h, d, r, m) { var b = Math.min(r * 0.5, d * 0.2), g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(0.001, r - b)), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 8 }); g.translate(0, 0, -(d - 2 * b) / 2); return mesh(g, m); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

/* theme-driven materials (colors swapped in setTheme) */
var M = {
  ground: std(0, 1), road: std(0, 0.95), lane: std(0, 0.9), bld: std(0, 0.85), bldTop: std(0, 0.9),
  box: std(0, 0.38, 0.25), trim: std(0, 0.35, 0.4), van: std(0, 0.45, 0.1),
  acc: std(ACC, 0.4, 0, { emissive: ACC, emissiveIntensity: 0.15 }),
  dark: std(0x0d1322, 0.6), silver: std(0x9aa7b8, 0.3, 0.8), pcb: std(0x0f6b4f, 0.55), chip: std(0x111827, 0.4),
  paper: std(0xfbfbf8, 0.9), tof: std(0x3b3f8f, 0.5), glass: std(0x9fb3c8, 0.2, 0, { transparent: true, opacity: 0.18, depthWrite: false })
};

/* ---------- city ---------- */
var STEP = 8, N = 3;                       // streets at -24..24
var ground = mesh(new THREE.PlaneGeometry(400, 400), M.ground, false, true);
ground.rotation.x = -Math.PI / 2; scene.add(ground);
var city = new THREE.Group(); scene.add(city);
for (var k = -N; k <= N; k++) {
  var rx = mesh(new THREE.PlaneGeometry(STEP * 2 * N + 14, 3), M.road, false, true); rx.rotation.x = -Math.PI / 2; rx.position.set(0, 0.01, k * STEP); city.add(rx);
  var rz = mesh(new THREE.PlaneGeometry(3, STEP * 2 * N + 14), M.road, false, true); rz.rotation.x = -Math.PI / 2; rz.position.set(k * STEP, 0.012, 0); city.add(rz);
}
var HERO = new THREE.Vector3(1.75, 0, 1.75);   // hero box on the corner of block (4,4)
for (var bx = -N; bx < N; bx++) for (var bz = -N; bz < N; bz++) {
  var cx = bx * STEP + STEP / 2, cz = bz * STEP + STEP / 2, n = 1 + Math.floor(rnd() * 3);
  for (var i = 0; i < n; i++) {
    var w = 1.6 + rnd() * 2.2, d = 1.6 + rnd() * 2.2, h = 1.4 + rnd() * rnd() * 7;
    var px = cx + (rnd() - 0.5) * (5 - w), pz = cz + (rnd() - 0.5) * (5 - d);
    if (bx === 0 && bz === 0) { px = cx + 0.9; pz = cz + 0.9; w = 2.6; d = 2.6; h = 3.2; if (i) continue; }  // keep the hero corner open
    var b = box(w, h, d, M.bld); b.position.set(px, h / 2, pz); city.add(b);
    var t = box(w * 0.98, 0.06, d * 0.98, M.bldTop); t.position.set(px, h + 0.03, pz); t.castShadow = false; city.add(t);
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
    // insides: scale plate on a load cell, ESP32 on the back wall, ToF under the roof
    var cell = box(0.42, 0.05, 0.07, M.silver); cell.position.set(0, y0 + 0.08, 0); g.add(cell);
    var plate = box(0.74, 0.025, 0.48, M.trim); plate.position.set(0, y0 + 0.12, 0); g.add(plate); parts.plateY = y0 + 0.135;
    var pcb = box(0.26, 0.17, 0.018, M.pcb); pcb.position.set(0.17, cy + 0.2, -BD / 2 + 0.065); g.add(pcb);
    var chip = box(0.1, 0.08, 0.02, M.chip); chip.position.set(0.17, cy + 0.21, -BD / 2 + 0.08); g.add(chip);
    var bat = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16), M.acc); bat.rotation.z = Math.PI / 2; bat.position.set(-0.2, cy + 0.2, -BD / 2 + 0.09); g.add(bat);
    var tof = box(0.09, 0.015, 0.09, M.tof); tof.position.set(0, y0 + BH - 0.06, 0.02); g.add(tof);
    parts.inner = [cell, plate, pcb, chip, bat, tof];
    // light lining so the insides read against the dark shell
    var lin = std(0xe9eef3, 0.8);
    [[BW - 0.12, BH - 0.12, 0.01, 0, cy, -BD / 2 + 0.055], [0.01, BH - 0.12, BD - 0.1, -BW / 2 + 0.055, cy, 0], [0.01, BH - 0.12, BD - 0.1, BW / 2 - 0.055, cy, 0], [BW - 0.12, 0.01, BD - 0.1, 0, y0 + 0.055, 0]]
      .forEach(function (p) { var m = box(p[0], p[1], p[2], lin); m.position.set(p[3], p[4], p[5]); g.add(m); });
  }
  var roof = rbox(BW + 0.1, 0.09, BD + 0.1, 0.04, M.trim); roof.position.y = y0 + BH + 0.04; g.add(roof);
  var slot = box(0.5, 0.045, 0.02, M.dark); slot.position.set(0, cy + 0.3, BD / 2 + (hero ? 0.005 : 0.01)); slot.castShadow = false; g.add(slot);
  var stripe = box(BW * 0.999, 0.07, 0.02, M.acc); stripe.position.set(0, cy - 0.32, BD / 2 + (hero ? 0.004 : 0.008)); stripe.castShadow = false; g.add(stripe);
  var ledMat = new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0x777777, emissiveIntensity: 0.55, roughness: 0.3 });
  var led = mesh(new THREE.SphereGeometry(0.045, 16, 12), ledMat, false, false); led.position.set(0.33, cy + 0.3, BD / 2 + 0.02); g.add(led);
  parts.skin = [slot, stripe];
  parts.led = ledMat; parts.slotY = cy + 0.3; parts.BD = BD;
  // fill bar floating above the box
  var barMat = new THREE.MeshStandardMaterial({ color: ACC, emissive: ACC, emissiveIntensity: 0.35, roughness: 0.5, transparent: true, opacity: 0.95 });
  var barG = new THREE.CylinderGeometry(0.16, 0.16, 1, 20); barG.translate(0, 0.5, 0);
  var bar = mesh(barG, barMat, false, false); bar.position.y = y0 + BH + 0.35; bar.scale.y = 0.001; g.add(bar);
  parts.bar = bar; parts.barMat = barMat;
  g.userData = parts;
  return g;
}

/* intersections that get a postbox; side = which corner of the crossing */
var SPOTS = [[0, 0, 1, 1], [-2, -2, 1, -1], [-1, -2, -1, 1], [1, -2, 1, 1], [2, -1, -1, -1], [-3, -1, 1, 1], [-1, -1, 1, -1], [0, -3, -1, 1],
             [2, 1, 1, -1], [-2, 0, -1, -1], [1, 2, -1, 1], [-1, 1, 1, 1], [3, 0, -1, 1], [-2, 2, 1, -1], [0, 2, 1, 1], [2, 3, -1, -1], [-3, 3, 1, -1], [3, -3, -1, 1]];
var FILL = [0.12, 0.96, 0.18, 0.84, 0.08, 0.3, 0.9, 0.15, 0.22, 0.78, 0.05, 0.4, 0.88, 0.14, 0.26, 0.1, 0.82, 0.2];
var boxes = [], hero;
SPOTS.forEach(function (s, i) {
  var isHero = i === 0, g = postbox(isHero);
  var x = s[0] * STEP + s[2] * 1.75, z = s[1] * STEP + s[3] * 1.75;
  g.position.set(x, 0, z);
  g.rotation.y = s[3] > 0 ? Math.PI : 0;                      // face the street
  scene.add(g);
  var item = { g: g, p: g.userData, node: [s[0], s[1]], fill: FILL[i], full: FILL[i] >= 0.75, hero: isHero, pos: new THREE.Vector3(x, 0, z) };
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
  var segs = 900, g = new THREE.TubeGeometry(path, segs, r, 6, false), m = mesh(g, mat, false, false);
  m.userData = { total: g.index.count, k: 0, target: 0 }; g.setDrawRange(0, 0); scene.add(m); return m;
}
var uniq = function (arr) { var seen = {}; return arr.filter(function (n) { var k = n.join(); if (seen[k]) return false; seen[k] = 1; return true; }); };
var pathAll = routePath(uniq(boxes.map(function (b) { return b.node; })), 0.06);
var pathFull = routePath(uniq(boxes.filter(function (b) { return b.full; }).map(function (b) { return b.node; })), 0.09);
var matAll = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.9 });
var matFull = new THREE.MeshBasicMaterial({ color: ACC });
var tubeAll = tube(pathAll, matAll, 0.16), tubeFull = tube(pathFull, matFull, 0.24);
var depot = box(3.2, 1.4, 2.4, M.bld); var droof = box(3.25, 0.12, 2.45, M.acc); droof.position.set(DEPOT[0] * STEP - 3, 1.46, DEPOT[1] * STEP - 3); scene.add(droof); depot.position.set(DEPOT[0] * STEP - 3, 0.7, DEPOT[1] * STEP - 3); scene.add(depot);

/* pilot zone (slide 9) */
var pilotMat = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0, depthWrite: false });
var pilot = mesh(new THREE.CircleGeometry(15, 64), pilotMat, false, false); pilot.rotation.x = -Math.PI / 2; pilot.position.set(-6, 0.03, -6); scene.add(pilot);
var ringMat = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0 });
var ring = mesh(new THREE.RingGeometry(14.7, 15.1, 96), ringMat, false, false); ring.rotation.x = -Math.PI / 2; ring.position.set(-6, 0.04, -6); scene.add(ring);
function inPilot(b) { return b.pos.distanceTo(pilot.position) < 15; }

/* ---------- van ---------- */
var van = new THREE.Group();
var vb = rbox(1.5, 0.85, 0.8, 0.12, M.van); vb.position.set(-0.1, 0.62, 0); van.add(vb);
var vc = rbox(0.55, 0.6, 0.78, 0.12, M.van); vc.position.set(0.85, 0.5, 0); van.add(vc);
var ws = box(0.04, 0.32, 0.66, M.dark); ws.position.set(1.12, 0.62, 0); van.add(ws);
var vs = box(1.52, 0.1, 0.82, M.acc); vs.position.set(-0.1, 0.45, 0); van.add(vs);
[[-0.55, 0.35], [-0.55, -0.35], [0.75, 0.35], [0.75, -0.35]].forEach(function (p) { var wh = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 16), M.dark); wh.rotation.x = Math.PI / 2; wh.position.set(p[0], 0.18, p[1]); van.add(wh); });
van.scale.setScalar(1.15); scene.add(van);
var vanU = 0;

/* ---------- letters for the hero box ---------- */
var letters = [], WEIGHTS = [21, 18, 34, 19, 26, 22, 31, 20], CAP = 8, FULL_AT = 6;
for (var li = 0; li < CAP; li++) {
  var L = box(0.5, 0.016, 0.32, M.paper); L.visible = false; hero.g.add(L); letters.push(L);
}
var heroState = { n: 0, t: 0, phase: 'fill', grams: 0 };

/* ---------- HTML labels ---------- */
var labelsEl = document.getElementById('labels'), labels = [];
function label(html, cls, getPos) {
  var o = document.createElement('div'); o.className = 'lab';
  var i = document.createElement('div'); i.className = 'tagl ' + (cls || ''); i.innerHTML = html; o.appendChild(i);
  labelsEl.appendChild(o); var l = { el: o, inner: i, pos: getPos, on: false }; labels.push(l); return l;
}
var heroLab = label('', 'big', function () { return hero.g.localToWorld(new THREE.Vector3(0.62, 1.55, 0)); }); heroLab.el.classList.add('side'); heroLab.free = true;
boxes.forEach(function (b) {
  b.lab = label('', '', function () { return b.pos.clone().add(new THREE.Vector3(0, 3.6, 0)); });
});

/* ---------- views: camera + flags per slide ---------- */
var HX = HERO.x, HZ = HERO.z;
var VIEWS = {
  hero:       { pos: [HX + 2.2, 2.2, HZ - 5.2], tgt: [HX, 1.05, HZ], ox: 0.2, shade: 0, shadeL: 1, cut: 0, letters: 0, route: 'none', status: 'live', heroLab: 0 },
  cityAll:    { pos: [8, 48, 52], tgt: [2, 0, -2], ox: 0.0, shade: 0.55, shadeL: 0.6, route: 'all', status: 'unknown', bars: 0, vanOn: 1 },
  cityFull:   { pos: [22, 52, 50], tgt: [4, 0, -2], ox: 0.3, shade: 0, shadeL: 1, route: 'full', status: 'known', bars: 1, vanOn: 1, labs: 'full' },
  cutaway:    { pos: [HX + 1.7, 2.0, HZ - 4.3], tgt: [HX, 1.1, HZ], ox: 0.12, shade: 0, shadeL: 1, cut: 1, letters: 1, route: 'none', status: 'live', heroLab: 1 },
  heroDim:    { pos: [HX - 3.2, 2.6, HZ - 5.6], tgt: [HX, 1.0, HZ], ox: 0.1, shade: 0.72, shadeL: 0.7, cut: 0, letters: 1, route: 'none', status: 'live', orbit: 1 },
  cityHigh:   { pos: [0, 62, 44], tgt: [0, 0, 0], ox: 0, shade: 0.62, shadeL: 0.5, route: 'full', status: 'known', bars: 1, vanOn: 1 },
  cutawayDim: { pos: [HX - 3.4, 2.6, HZ - 6.2], tgt: [HX, 1.0, HZ], ox: 0.08, shade: 0.62, shadeL: 0.6, cut: 1, letters: 1, route: 'none', status: 'live' },
  cityPilot:  { pos: [12, 36, 34], tgt: [-6, 0, -6], ox: 0.24, shade: 0, shadeL: 1, route: 'full', status: 'known', bars: 1, vanOn: 1, pilot: 1, labs: 'pilot' },
  cityFar:    { pos: [34, 70, 70], tgt: [-2, 0, -4], ox: 0.24, shade: 0, shadeL: 1, route: 'full', status: 'known', bars: 1, vanOn: 1, pulse: 1, orbit: 1 }
};
var cur = { pos: new THREE.Vector3(8, 40, 46), tgt: new THREE.Vector3(), ox: 0, cut: 0, bars: 0, pilot: 0 };
var view = VIEWS.hero, viewName = 'hero', viewT = 0, orbitA = 0;

S.view = function (name) {
  var v = VIEWS[name] || VIEWS.hero;
  if (name !== viewName) {
    if (v.route === 'all' && view.route !== 'all') { tubeAll.userData.k = 0; vanU = 0; }
    if (v.route === 'full' && view.route !== 'full') { tubeFull.userData.k = 0; vanU = 0; }
  }
  view = v; viewName = name; viewT = 0; orbitA = 0;
  document.documentElement.style.setProperty('--shade', v.shade || 0);
  document.documentElement.style.setProperty('--shadeL', v.shadeL == null ? 1 : v.shadeL);
  if (STATIC) { snap(); viewT = 10; }
};
function snap() {
  cur.pos.fromArray(view.pos); cur.tgt.fromArray(view.tgt); cur.ox = view.ox || 0; cur.cut = view.cut || 0; cur.bars = view.bars || 0; cur.pilot = view.pilot || 0;
  tubeAll.userData.k = 1; tubeFull.userData.k = 1; vanU = 0.37;
  if (view.letters) { heroState.n = FULL_AT + 1; heroState.phase = 'fill'; heroState.t = 0; }
}

var T = THEMES.light;
S.theme = function (name) {
  T = THEMES[name] || THEMES.light;
  scene.background = new THREE.Color(T.bg);
  scene.fog = new THREE.Fog(T.bg, T.fog[0], T.fog[1]);
  M.ground.color.setHex(T.ground); M.road.color.setHex(T.road); M.bld.color.setHex(T.bld); M.bldTop.color.setHex(T.bldTop);
  M.box.color.setHex(T.box); M.trim.color.setHex(T.boxTrim); M.van.color.setHex(T.van);
  if (hero.p.frontMat) hero.p.frontMat.color.setHex(T.box);
  matAll.color.setHex(T.muted);
  hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2]; sun.intensity = T.sun;
};

/* ---------- per-frame ---------- */
var clock = new THREE.Clock(), tmp = new THREE.Vector3(), elapsed = 0;
function ease(dt, rate) { return 1 - Math.exp(-dt * rate); }

function updateHero(dt) {
  var s = heroState, active = !!view.letters;
  if (!active) { s.n = 0; s.phase = 'fill'; s.t = 0; }
  if (active && !STATIC) {
    s.t += dt;
    if (s.phase === 'fill' && s.t > 0.95) { s.t = 0; s.n++; if (s.n >= CAP) { s.phase = 'hold'; } }
    else if (s.phase === 'hold' && s.t > 2.6) { s.phase = 'collect'; s.t = 0; }
    else if (s.phase === 'collect' && s.t > 1.2) { s.phase = 'fill'; s.t = 0; s.n = 0; }
  }
  var grams = 0;
  letters.forEach(function (L, i) {
    var shown = i < s.n && s.phase !== 'collect';
    L.visible = shown;
    if (!shown) return;
    grams += WEIGHTS[i];
    var restY = hero.p.plateY + 0.01 + i * 0.018, age = (i === s.n - 1 && s.phase === 'fill' && !STATIC) ? clamp(s.t / 0.55, 0, 1) : 1;
    // falls in through the slot, then lies flat on the scale
    var fz = hero.p.BD / 2 + 0.25;
    if (age < 0.35) { var a = age / 0.35; L.position.set(0, hero.p.slotY + 0.02, lerp(fz, 0.1, a)); L.rotation.set(-Math.PI / 2 + 0.2, 0, 0); }
    else { var b2 = (age - 0.35) / 0.65, e = b2 * b2; L.position.set(Math.sin(i * 2.1) * 0.05, lerp(hero.p.slotY - 0.05, restY, e), lerp(0.1, Math.cos(i * 1.7) * 0.03, e)); L.rotation.set(lerp(-Math.PI / 2 + 0.2, 0, e), 0, Math.sin(i * 1.3) * 0.12 * e); }
  });
  s.grams = grams;
  var fill = Math.min(1, s.n / CAP), full = s.n >= FULL_AT && s.phase !== 'collect';
  hero.p.led.color.setHex(full ? FULL : ACC); hero.p.led.emissive.setHex(full ? FULL : ACC);
  hero.liveFill = s.phase === 'collect' ? 0 : fill; hero.liveFull = full;
  var st = s.phase === 'collect' ? '<span class="st">Collected ✓</span>' : full ? '<span class="st">Full · pickup requested</span>' : '<span class="st">Has space</span>';
  heroLab.inner.className = 'tagl big' + (full ? ' full' : '');
  heroLab.inner.innerHTML = '<span class="k">Box LV-0142 · live</span><span>' + grams + ' g · ' + Math.round(hero.liveFill * 100) + '% full</span>' + st;
}

function setLabel(l, on) {
  l.on = on; l.el.classList.toggle('on', on);
  if (!on) return;
  tmp.copy(l.pos()).project(camera);
  if (tmp.z > 1 || (!l.free && tmp.x < 0.12)) { l.el.classList.remove('on'); return; }  // keep the text column clear
  l.el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * W).toFixed(1) + 'px,' + ((1 - tmp.y) / 2 * H).toFixed(1) + 'px)';
}

function frame() {
  var dt = Math.min(clock.getDelta(), 0.05); elapsed += dt; viewT += dt;
  var k = STATIC ? 1 : ease(dt, 2.0);
  // camera with optional slow orbit around the target
  var p = tmp.fromArray(view.pos);
  if (view.orbit && !STATIC) { orbitA += dt * 0.05; var o = new THREE.Vector3().fromArray(view.tgt), d = p.clone().sub(o); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(orbitA) * 0.35); p = o.add(d); }
  cur.pos.lerp(p, k); cur.tgt.lerp(new THREE.Vector3().fromArray(view.tgt), k);
  cur.ox = lerp(cur.ox, view.ox || 0, k);
  camera.position.copy(cur.pos); camera.lookAt(cur.tgt);
  camera.setViewOffset(W, H, -cur.ox * W, 0, W, H);

  // cutaway: front panel fades, inner parts visible
  cur.cut = lerp(cur.cut, view.cut || 0, STATIC ? 1 : ease(dt, 3));
  hero.p.frontMat.opacity = 1 - cur.cut * 0.9; hero.p.frontMat.depthWrite = cur.cut < 0.5;
  hero.p.skin.forEach(function (m) { m.visible = cur.cut < 0.5; });
  updateHero(dt);

  // routes reveal
  [[tubeAll, view.route === 'all'], [tubeFull, view.route === 'full']].forEach(function (r) {
    var m = r[0], u = m.userData;
    u.k = r[1] ? Math.min(1, u.k + dt / 2.6) : 0;
    m.visible = r[1]; m.geometry.setDrawRange(0, Math.floor(u.total * u.k / 3) * 3);
  });

  // van drives along the active route
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
  pilotMat.opacity = cur.pilot * 0.1; ringMat.opacity = cur.pilot * 0.9;

  // box status: unknown (grey) / known (green or red) + fill bars
  cur.bars = lerp(cur.bars, view.bars || 0, STATIC ? 1 : ease(dt, 2.5));
  boxes.forEach(function (b, i) {
    var fill = b.hero ? hero.liveFill : b.fill, full = b.hero ? hero.liveFull : b.full;
    if (!b.hero) {
      var c = view.status === 'unknown' ? T.unknown : full ? FULL : ACC;
      b.p.led.color.setHex(c); b.p.led.emissive.setHex(c);
    }
    var pulse = view.pulse ? 0.75 + 0.25 * Math.sin(elapsed * 2 + i) : 1;
    var hide = view.pilot && !inPilot(b) ? 0.25 : 1;
    b.p.bar.scale.y = Math.max(0.001, cur.bars * (0.15 + fill * 2.2) * pulse * hide); b.p.bar.visible = cur.bars > 0.02;
    b.p.barMat.color.setHex(full ? FULL : ACC); b.p.barMat.emissive.setHex(full ? FULL : ACC);
    // labels
    var show = false;
    if (view.status === 'unknown' && !b.hero) { show = i % 3 === 1; b.lab.inner.className = 'tagl'; b.lab.inner.innerHTML = '<span class="dot mute"></span>Full? Empty?'; }
    if (view.labs === 'full' && full && !b.hero) { show = true; b.lab.inner.className = 'tagl full'; b.lab.inner.innerHTML = '<span class="dot full"></span>' + Math.round(fill * 100) + '%'; }
    if (view.labs === 'pilot' && inPilot(b) && full) { show = true; b.lab.inner.className = 'tagl full'; b.lab.inner.innerHTML = '<span class="dot full"></span>' + Math.round(fill * 100) + '%'; }
    setLabel(b.lab, show && viewT > 0.9);
  });
  setLabel(heroLab, !!view.heroLab && viewT > 0.6);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

S.resize = function () {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
};
addEventListener('resize', S.resize);
S.theme(document.documentElement.getAttribute('data-theme'));
S.view('hero'); snap();
requestAnimationFrame(frame);
})();
