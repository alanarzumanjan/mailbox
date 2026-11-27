/* EmptyLess deck — extra 3D sets on top of js/scene.js (uses SCENE.core and SCENE.hook).
   traffic  : the van stuck in city traffic (Hook)
   map      : Latvia with 547 postboxes, 164 freestanding, 83 removed (Problem & risk)
   network  : waste, textile and battery points joining the postboxes in one network (Vision)
   pilotBg  : quiet city background behind the Riga schematic (Pilot) */
(function () {
'use strict';
var S = window.SCENE, C = S.core, THREE = C.THREE, scene = C.scene;
var ACC = C.ACC, FULL = C.FULL, STEP = C.STEP, STATIC = C.STATIC;
function std(c, r, m, o) { return C.std(c, r, m, o); }
function basic(c, o) { var p = { color: c }; if (o) for (var k in o) p[k] = o[k]; return new THREE.MeshBasicMaterial(p); }
var lerp = C.lerp, clamp = C.clamp;
var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function gauss() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/* ================= TRAFFIC (Hook) ================= */
var traffic = new THREE.Group(); traffic.visible = false; scene.add(traffic);
var LANE_E = -8.7, LANE_W = -7.3, VAN_X = 4;
var brakeMat = std(0xff3b30, 0.4, 0, { emissive: 0xff2a1f, emissiveIntensity: 1.2 });
var brakeOff = std(0x5a1a1a, 0.6);
var headMat = std(0xffffff, 0.3, 0, { emissive: 0xfff3d6, emissiveIntensity: 0.8 });
var carCols = [0xdfe4ea, 0x9aa5b4, 0x2f3b52, 0xb33a3a, 0x6b7a8f, 0xf4f4f2, 0x3a4a66, 0xb8c2cc, 0x4b6584];
function car(col) {
  var g = new THREE.Group(), body = std(col, 0.35, 0.3), glass = std(0x1b2433, 0.2, 0.4);
  var b = C.rbox(1.35, 0.42, 0.66, 0.12, body); b.position.y = 0.36; g.add(b);
  var cab = C.rbox(0.72, 0.34, 0.58, 0.12, glass); cab.position.set(-0.05, 0.7, 0); g.add(cab);
  [[-0.42, 0.3], [-0.42, -0.3], [0.42, 0.3], [0.42, -0.3]].forEach(function (p) { var w = C.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 14), C.M.dark); w.rotation.x = Math.PI / 2; w.position.set(p[0], 0.15, p[1]); g.add(w); });
  var bl = [], hl = [];
  [0.2, -0.2].forEach(function (z) {
    var r = C.box(0.03, 0.07, 0.12, brakeMat); r.position.set(-0.68, 0.44, z); r.castShadow = false; g.add(r); bl.push(r);
    var h = C.box(0.03, 0.06, 0.12, headMat); h.position.set(0.68, 0.42, z); h.castShadow = false; g.add(h); hl.push(h);
  });
  g.userData = { brakes: bl };
  return g;
}
var queue = [], oncoming = [];
[-4, -3, -2, -1, 1, 2, 3, 4, 5].forEach(function (k, i) {
  var c = car(carCols[i % carCols.length]); c.position.set(VAN_X + k * 2.35 + (rnd() - 0.5) * 0.3, 0, LANE_E); c.userData.x0 = c.position.x; traffic.add(c); queue.push(c);
});
for (var oi = 0; oi < 5; oi++) { var oc = car(carCols[(oi * 3 + 2) % carCols.length]); oc.rotation.y = Math.PI; oc.position.set(-24 + oi * 11, 0, LANE_W); traffic.add(oc); oncoming.push(oc); }
// exhaust: the van burns fuel to collect air
var puffMat = basic(0xb9c2cd, { transparent: true, opacity: 0.4, depthWrite: false });
var puffs = []; for (var pi = 0; pi < 12; pi++) { var pf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), puffMat.clone()); pf.visible = false; scene.add(pf); puffs.push(pf); }
var creep = 0;
function updateTraffic(dt, t) {
  var on = !!C.view().traffic;
  traffic.visible = on;
  puffs.forEach(function (p) { p.visible = on; });
  if (!on) { creep = 0; return; }
  // stop-and-go: everyone crawls forward for a moment every few seconds
  var go = Math.max(0, Math.sin(t * 0.9)) > 0.93;
  if (!STATIC && go) creep = Math.min(1.8, creep + dt * 0.6);
  queue.forEach(function (c) { c.position.x = c.userData.x0 + creep; c.userData.brakes.forEach(function (b) { b.material = go ? brakeOff : brakeMat; }); });
  oncoming.forEach(function (c) { if (!STATIC) c.position.x -= dt * 4.2; if (c.position.x < -30) c.position.x += 55; });
  var van = C.van; van.visible = true; van.position.set(VAN_X + creep, 0, LANE_E); van.rotation.y = 0;
  puffs.forEach(function (p, i) {
    var life = ((t * 0.65 + i / puffs.length) % 1);
    p.position.set(van.position.x - 1.05 - life * 0.9, 0.3 + life * 0.75, LANE_E + 0.22 + Math.sin(i * 1.7 + t) * 0.08);
    p.scale.setScalar(0.5 + life * 2.2); p.material.opacity = (1 - life) * 0.45;
  });
}
S.addViews({
  traffic: { grp: 'city', pos: [-4.5, 7.2, -10.4], tgt: [8.5, 0.4, -8.2], ox: 0.2, shade: 0, shadeL: 1, route: 'none', status: 'unknown', quiet: 1, traffic: 1 }
});

/* ================= MAP OF LATVIA (Problem & risk) ================= */
var X0 = 400, K = 14, LON0 = 24.6, LAT0 = 56.95, CL = Math.cos(57 * Math.PI / 180);
function px(lon) { return (lon - LON0) * CL * K; }
function pz(lat) { return -(lat - LAT0) * K; }
// border, clockwise from the Lithuanian border at the sea (approximate, for a stylised map)
var LV = [[21.05, 56.07], [21.0, 56.25], [20.98, 56.52], [21.07, 56.75], [21.2, 56.9], [21.38, 57.1], [21.55, 57.38], [21.75, 57.55], [22.15, 57.67], [22.6, 57.76],
  [22.7, 57.6], [22.95, 57.4], [23.15, 57.25], [23.25, 57.08], [23.5, 56.98], [23.85, 56.98], [24.05, 57.05], [24.3, 57.15], [24.4, 57.3], [24.38, 57.5], [24.36, 57.75], [24.35, 57.87],
  [24.8, 57.98], [25.2, 58.07], [25.7, 57.92], [26.05, 57.78], [26.5, 57.58], [27.0, 57.55], [27.35, 57.55], [27.7, 57.35], [27.85, 57.0], [27.75, 56.85], [28.05, 56.7], [28.2, 56.45], [28.0, 56.15],
  [27.65, 55.95], [27.2, 55.85], [26.6, 55.68], [26.0, 55.95], [25.6, 56.15], [25.1, 56.2], [24.6, 56.3], [24.15, 56.27], [23.75, 56.37], [23.2, 56.35], [22.6, 56.38], [22.1, 56.42], [21.65, 56.3], [21.25, 56.15]];
function inside(lon, lat) {
  var c = false;
  for (var i = 0, j = LV.length - 1; i < LV.length; j = i++) {
    var xi = LV[i][0], yi = LV[i][1], xj = LV[j][0], yj = LV[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}
var map = new THREE.Group(); map.position.x = X0; map.visible = false; scene.add(map);
var seaMat = std(0xe6eef5, 1), landMat = std(0xffffff, 0.9), edgeMat = new THREE.LineBasicMaterial({ color: ACC });
var sea = C.mesh(new THREE.PlaneGeometry(300, 220), seaMat, false, true); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.05; map.add(sea);
var shape = new THREE.Shape(); LV.forEach(function (p, i) { var x = px(p[0]), y = (p[1] - LAT0) * K; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); });
var landG = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }); landG.rotateX(-Math.PI / 2);
var land = C.mesh(landG, landMat, false, true); map.add(land);
var edgePts = LV.map(function (p) { return new THREE.Vector3(px(p[0]), 0.62, pz(p[1])); }); edgePts.push(edgePts[0].clone());
map.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePts), edgeMat));

// 547 postboxes: most around towns (by size), the rest spread across the country. Illustrative only.
var TOWNS = [[24.11, 56.95, 45, 0.07], [26.53, 55.88, 6, 0.03], [21.01, 56.51, 5, 0.03], [23.72, 56.65, 4, 0.03], [23.77, 56.97, 3, 0.05], [21.57, 57.39, 2.5, 0.025], [27.33, 56.51, 2, 0.025],
  [25.43, 57.54, 2, 0.025], [24.6, 56.82, 2, 0.025], [25.86, 56.5, 1.6, 0.02], [24.35, 56.86, 1.4, 0.02], [23.15, 56.97, 1.2, 0.02], [25.27, 57.31, 1.2, 0.02], [21.97, 56.97, 1, 0.02], [24.85, 57.15, 1, 0.02],
  [22.59, 57.24, 0.9, 0.02], [24.19, 56.41, 0.9, 0.02], [23.28, 56.62, 0.8, 0.02], [26.22, 56.85, 0.8, 0.02], [26.75, 57.18, 0.7, 0.02], [27.05, 57.42, 0.7, 0.02], [27.72, 56.55, 0.6, 0.02],
  [27.17, 55.9, 0.6, 0.02], [24.71, 57.51, 0.6, 0.02], [22.49, 56.66, 0.8, 0.02], [25.25, 56.6, 0.6, 0.02], [27.27, 57.13, 0.6, 0.02], [26.72, 56.29, 0.5, 0.02], [25.9, 57.42, 0.5, 0.02]];
var NDOT = 547, NFREE = 164, NREM = 83, dots = [];
var tw = TOWNS.reduce(function (a, t) { return a + t[2]; }, 0);
while (dots.length < NDOT) {
  var lon, lat;
  if (dots.length < 340) { var r = rnd() * tw, t = TOWNS[0]; for (var ti = 0; ti < TOWNS.length; ti++) { r -= TOWNS[ti][2]; if (r <= 0) { t = TOWNS[ti]; break; } } lon = t[0] + gauss() * t[3] * 1.8; lat = t[1] + gauss() * t[3]; }
  else { lon = 20.9 + rnd() * 7.4; lat = 55.65 + rnd() * 2.45; }
  if (!inside(lon, lat)) continue;
  dots.push({ x: px(lon), z: pz(lat), free: false, removed: false, d: Math.hypot(lon - 24.11, (lat - 56.95) * 1.8) });
}
var order = dots.map(function (d, i) { return i; }).sort(function () { return rnd() - 0.5; });
order.slice(0, NFREE).forEach(function (i) { dots[i].free = true; });
order.slice(NFREE, NFREE + NREM).forEach(function (i, k) { dots[i].removed = true; dots[i].rk = k / NREM; });
var dotG = new THREE.SphereGeometry(0.22, 10, 8), dotM = basic(0xffffff);
var inst = new THREE.InstancedMesh(dotG, dotM, NDOT); inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); map.add(inst);
var colA = new THREE.Color(), mtx = new THREE.Matrix4(), qI = new THREE.Quaternion(), vP = new THREE.Vector3(), vS = new THREE.Vector3();
// a courier van crawling through Riga
var mapVan = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), basic(0x6b7a90)); map.add(mapVan);
var mapVanHalo = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 32), basic(0x6b7a90, { transparent: true, opacity: 0.5, depthWrite: false })); mapVanHalo.rotation.x = -Math.PI / 2; map.add(mapVanHalo);
var townLabs = [['Riga', 24.11, 56.95], ['Daugavpils', 26.53, 55.88], ['Liepāja', 21.01, 56.51], ['Ventspils', 21.57, 57.39], ['Rēzekne', 27.33, 56.51], ['Valmiera', 25.43, 57.54]].map(function (d) {
  var l = C.label('<span>' + d[0] + '</span>', 'town', function () { return new THREE.Vector3(X0 + px(d[1]), 0.8, pz(d[2])); }); l.el.classList.add('pin'); return l;
});
var remRings = [], ringG2 = new THREE.RingGeometry(0.55, 0.8, 40);
dots.forEach(function (d) { if (!d.removed) return; var m = new THREE.Mesh(ringG2, basic(FULL, { transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(d.x, 0.68, d.z); m.visible = false; map.add(m); remRings.push({ m: m, ph: rnd() }); });
var mapT = 0;
function updateMap(dt, t) {
  var v = C.view(), on = !!v.map;
  map.visible = on;
  if (!on) { mapT = 0; townLabs.forEach(function (l) { C.setLabel(l, false); }); return; }
  mapT += dt; var T = C.theme(), mt = STATIC ? 99 : mapT;
  for (var i = 0; i < NDOT; i++) {
    var d = dots[i], s = clamp((mt * 1.4 - d.d * 0.35) * 2, 0, 1), c;
    s = s * s * (3 - 2 * s);
    c = T.dotFree; var sz = 0.85;   // every postbox the same: black (white in the dark theme)
    if (v.map === 'risk' && d.removed) {
      // removed boxes: a short pulse, then they vanish one after another
      var rt = STATIC ? 9 : C.viewT(), at = 0.6 + d.rk * 1.6;
      var pop = clamp((rt - at + 0.35) / 0.35, 0, 1), gone = clamp((rt - at) / 0.45, 0, 1);
      sz = (1 + Math.sin(pop * Math.PI) * 0.9) * (1 - gone);
    }
    colA.setHex(c); inst.setColorAt(i, colA);
    vP.set(d.x, 0.75 + (1 - s) * 14, d.z); vS.setScalar(Math.max(0.0001, Math.min(1, s * 1.5) * sz)); mtx.compose(vP, qI, vS); inst.setMatrixAt(i, mtx);
  }
  remRings.forEach(function (r) {
    r.m.visible = false;
    if (!r.m.visible) return;
    var k = STATIC ? 0.4 : (t * 0.55 + r.ph) % 1;
    r.m.scale.setScalar(0.6 + k * 3.4); r.m.material.opacity = (1 - k) * 0.85;
  });
  inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  var a = t * 0.35, rx = px(24.11) + Math.cos(a) * 1.6, rz = pz(56.95) + Math.sin(a * 1.3) * 1.0;
  mapVan.position.set(rx, 0.9, rz); mapVanHalo.position.set(rx, 0.66, rz); mapVanHalo.scale.setScalar(1 + (t * 0.8 % 1) * 1.5); mapVanHalo.material.opacity = 0.5 * (1 - t * 0.8 % 1);
  townLabs.forEach(function (l, i) { C.setLabel(l, mt > 0.8 + i * 0.12); });
}
var MV = { fog: [160, 360], grp: 'map', pos: [X0 + 2, 82, 58], tgt: [X0 + 2, 0, 3], ox: 0.24, shade: 0, shadeL: 1, route: 'none', status: 'unknown', quiet: 1 };
function mv(o) { var r = {}; for (var k in MV) r[k] = MV[k]; for (var j in o) r[j] = o[j]; return r; }
S.addViews({ map: mv({ map: 'all' }), mapFree: mv({ map: 'free' }), mapRisk: mv({ map: 'risk' }) });

/* ================= NETWORK (Vision) ================= */
var net = new THREE.Group(); net.visible = false; scene.add(net);
var used = {}; C.boxes.forEach(function (b) { used[b.node.join()] = 1; });
var TYPES = [
  { name: 'wc', make: function () { var g = new THREE.Group(), m = std(0x2f6b4f, 0.6), lid = std(0x24543e, 0.5); var b = C.rbox(1.0, 0.85, 0.75, 0.08, m); b.position.y = 0.45; g.add(b); var l = C.rbox(1.06, 0.1, 0.8, 0.04, lid); l.position.y = 0.92; g.add(l); return g; } },
  { name: 'tx', make: function () { var g = new THREE.Group(), m = std(0x6fa0d8, 0.5); var b = C.rbox(0.75, 1.55, 0.75, 0.08, m); b.position.y = 0.78; g.add(b); var s = C.box(0.4, 0.06, 0.02, C.M.dark); s.position.set(0, 1.2, 0.39); g.add(s); return g; } },
  { name: 'bt', make: function () { var g = new THREE.Group(), m = std(0xf2b233, 0.5), top = std(ACC, 0.5); var b = C.rbox(0.5, 0.75, 0.45, 0.06, m); b.position.y = 0.38; g.add(b); var t = C.box(0.52, 0.08, 0.47, top); t.position.y = 0.78; g.add(t); return g; } }
];
var assets = [], hub = new THREE.Vector3(-1, 13, -3);
var cands = []; for (var i = -3; i <= 3; i++) for (var j = -3; j <= 3; j++) if (!used[i + ',' + j]) cands.push([i, j]);
cands.sort(function () { return rnd() - 0.5; }).slice(0, 18).forEach(function (n, k) {
  var ty = TYPES[k % 3], g = ty.make(), sx = rnd() < 0.5 ? -1 : 1, sz = rnd() < 0.5 ? -1 : 1;
  g.position.set(n[0] * STEP + sx * 1.9, 0, n[1] * STEP + sz * 1.9); g.rotation.y = rnd() * Math.PI;
  g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(0.001); net.add(g);
  assets.push({ g: g, top: g.position.clone().add(new THREE.Vector3(0, ty.name === 'tx' ? 1.7 : 1.1, 0)), delay: k * 0.07 });
});
var hubM = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), basic(ACC)); hubM.position.copy(hub); net.add(hubM);
var hubRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 64), basic(ACC, { transparent: true, opacity: 0.7 })); hubRing.position.copy(hub); hubRing.rotation.x = Math.PI / 2; net.add(hubRing);
var arcMat = basic(ACC, { transparent: true, opacity: 0.55 }), pulseMat = basic(0xffffff);
var arcs = [];
function arc(from, delay) {
  var mid = from.clone().lerp(hub, 0.5); mid.y += 5;
  var curve = new THREE.QuadraticBezierCurve3(from, mid, hub), g = new THREE.TubeGeometry(curve, 32, 0.045, 5, false), m = new THREE.Mesh(g, arcMat);
  g.setDrawRange(0, 0); net.add(m);
  var p = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), pulseMat); p.visible = false; net.add(p);
  arcs.push({ m: m, total: g.index.count, curve: curve, pulse: p, delay: delay, ph: rnd() });
}
assets.forEach(function (a) { arc(a.top, 0.6 + a.delay); });
C.boxes.forEach(function (b, k) { arc(b.pos.clone().add(new THREE.Vector3(0, 1.75, 0)), 0.3 + k * 0.04); });
var netT = 0;
function updateNet(dt, t) {
  var on = !!C.view().net;
  net.visible = on;
  if (!on) { netT = 0; return; }
  netT += dt; var nt = STATIC ? 99 : netT;
  assets.forEach(function (a) { var s = clamp((nt - a.delay) * 2.5, 0, 1); s = 1 - Math.pow(1 - s, 3); a.g.scale.setScalar(Math.max(0.001, s * 1.1)); });
  arcs.forEach(function (a) {
    var k = clamp((nt - a.delay) / 1.2, 0, 1);
    a.m.geometry.setDrawRange(0, Math.floor(a.total * k / 3) * 3);
    a.pulse.visible = k >= 1;
    if (a.pulse.visible) a.pulse.position.copy(a.curve.getPoint((t * 0.35 + a.ph) % 1));
  });
  hubRing.rotation.z = t * 0.6; hubRing.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
}
S.addViews({
  network: { beams: 1, grp: 'city', pos: [30, 58, 62], tgt: [-2, 4, -4], ox: 0.26, shade: 0, shadeL: 1, route: 'full', status: 'known', bars: 1, vanOn: 1, rings: 1, orbit: 1, net: 1 },
  partsBg: { grp: 'city', pos: [0, 62, 44], tgt: [0, 0, 0], ox: 0, shade: 0.86, shadeL: 0.3, route: 'full', status: 'known', bars: 1, vanOn: 1, rings: 1 },
  endBg: { grp: 'city', pos: [34, 70, 70], tgt: [-2, 4, -4], ox: 0, shade: 0.88, shadeL: 0.4, route: 'full', status: 'known', bars: 1, vanOn: 1, rings: 1, orbit: 1, net: 1 },
  pilotBg: { beams: 1, grp: 'city', pos: [0, 62, 44], tgt: [0, 0, 0], ox: 0, shade: 0.8, shadeL: 0.6, route: 'full', status: 'known', bars: 1, vanOn: 1, rings: 1 }
});

/* ================= ATMOSPHERE ================= */
// 1) uplink beams: a full box sends its data up as packets of light
var beamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(ACC) }, uA: { value: 0.6 } },
  vertexShader: 'varying float vY;void main(){vY=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: 'uniform float uT,uA;uniform vec3 uC;varying float vY;void main(){float y=clamp(vY,0.0,1.0);float base=pow(max(1.0-y,0.0),2.2);float pk=smoothstep(0.82,1.0,fract(y*5.0-uT*1.4));gl_FragColor=vec4(uC*(1.0+pk),clamp((base*0.55+pk*(1.0-y)*0.9)*uA,0.0,1.0));}'
});
var beamG = new THREE.CylinderGeometry(0.16, 0.16, 16, 12, 1, true); beamG.translate(0, 8, 0);
var beams = C.boxes.map(function (b) { var m = new THREE.Mesh(beamG, beamMat); m.position.copy(b.pos); m.visible = false; m.frustumCulled = false; scene.add(m); return m; });
function beamsOn(side) {
  var v = C.view();
  C.boxes.forEach(function (b, i) {
    var on = b.full && b.g.visible && ((v.beams && !v.split) || (v.split && side === 2 && b.demo));
    beams[i].visible = on; beams[i].scale.set(v.split ? 2.2 : 1, 1, v.split ? 2.2 : 1);
  });
}
S.hook('side', beamsOn);

// 2) dust in the air
var DUST = 2600, dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
for (var di = 0; di < DUST; di++) {
  var near = di < 900;
  dpos[di * 3] = near ? 1.75 + (rnd() - 0.5) * 12 : (rnd() - 0.5) * 70;
  dpos[di * 3 + 1] = near ? rnd() * 5 : rnd() * 16;
  dpos[di * 3 + 2] = near ? 1.75 + (rnd() - 0.5) * 12 : (rnd() - 0.5) * 70;
  dseed[di] = rnd();
}
var dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dustG.setAttribute('aS', new THREE.BufferAttribute(dseed, 1));
var dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0xffffff) }, uA: { value: 0.5 }, uPix: { value: Math.min(devicePixelRatio || 1, 2) } },
  vertexShader: 'attribute float aS;uniform float uT,uPix;varying float vA;void main(){vec3 p=position;p.x+=sin(uT*0.13+aS*40.0)*1.2;p.y+=mod(uT*0.08*(0.4+aS),2.0)-1.0+sin(uT*0.4+aS*9.0)*0.3;p.z+=cos(uT*0.11+aS*25.0)*1.2;' +
    'vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=uPix*(1.2+aS*2.2)*(14.0/-mv.z);vA=0.35+0.65*sin(uT*0.7+aS*30.0)*0.5+0.5;}',
  fragmentShader: 'uniform vec3 uC;uniform float uA;varying float vA;void main(){float d=length(gl_PointCoord-0.5);gl_FragColor=vec4(uC,smoothstep(0.5,0.0,d)*uA*vA);}'
});
var dust = new THREE.Points(dustG, dustMat); dust.frustumCulled = false; scene.add(dust);

// 3) glowing grid on the ground with a pulse ring travelling out from the city centre
var gridMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(ACC) }, uA: { value: 1 } },
  vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: 'uniform float uT,uA;uniform vec3 uC;varying vec2 vP;void main(){vec2 g=abs(fract(vP/2.0-0.5)-0.5)/fwidth(vP/2.0);float line=1.0-min(min(g.x,g.y),1.0);' +
    'float r=length(vP);float fade=1.0-smoothstep(25.0,110.0,r);float rp=mod(uT*14.0,140.0);float ring=exp(-abs(r-rp)*0.35)*(1.0-rp/140.0);' +
    'gl_FragColor=vec4(uC,(line*0.16*fade+ring*0.55*fade*(0.3+line))*uA);}',
  extensions: { derivatives: true }
});
var grid = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = 0.004; scene.add(grid);

/* ================= theme + frame ================= */
S.hook('theme', function (T) {
  var dark = T.name === 'dark';
  T.dotA = dark ? 0x8fa3c0 : 0x6b7a90; T.dotB = dark ? 0x52627e : 0xb7c1cf; T.dotFree = dark ? 0x8a9bb8 : 0x8794a8;   // soft slate: visible, not an accent
  seaMat.color.setHex(dark ? 0x121a2a : 0xdfe8f1); landMat.color.setHex(dark ? 0x22304a : 0xffffff);
  edgeMat.color.setHex(dark ? 0x8fa3c0 : 0x9aa6b8);
  puffs.forEach(function (p) { p.material.color.setHex(dark ? 0x8794aa : 0xb9c2cd); });
  arcMat.opacity = dark ? 0.6 : 0.45; pulseMat.color.setHex(dark ? 0xffffff : ACC);
  beamMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; beamMat.uniforms.uA.value = dark ? 0.75 : 0.5; beamMat.needsUpdate = true;
  dustMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; dustMat.uniforms.uC.value.setHex(dark ? 0xcfe9ff : 0x7a8aa3); dustMat.uniforms.uA.value = dark ? 0.55 : 0.28; dustMat.needsUpdate = true;
  gridMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; gridMat.uniforms.uC.value.setHex(dark ? 0x19c08e : 0x172033); gridMat.uniforms.uA.value = dark ? 1 : 0.35; gridMat.needsUpdate = true;
});
S.hook('frame', function (dt, v, t) {
  updateTraffic(dt, t); updateMap(dt, t); updateNet(dt, t);
  beamMat.uniforms.uT.value = t; dustMat.uniforms.uT.value = t; gridMat.uniforms.uT.value = t;
  beamsOn(0); dust.visible = !v.map; grid.visible = !v.map && !v.split;
});
})();
