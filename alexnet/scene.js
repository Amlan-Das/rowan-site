/* The 3D world behind alexnet.html (Three.js, loaded from a CDN).

   One fixed canvas. The camera flies between scenes as you scroll:
     0 hero      the whole network, built from slabs
     1-2, 4      a kernel box sweeping over the elephant photo, painting a feature map on the first slab
     3, 9        a stadium of cores: one worker against 512
     5, 6, 7     the network again, with a pulse going forward (inference) and backward (learning)
     8           the sixty handwritten digits as a cloud of points
   Everything is built from real numbers: the layer sizes from AX.LAYERS, the feature map from the same
   convolution as the demos, the cloud from the digit model's scores. */
(function () {
  "use strict";
  const AX = window.AX, T = window.THREE, canvas = document.getElementById("axGL");
  if (!AX || !T || !canvas) { document.documentElement.classList.add("ax-nogl"); return; }
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); } catch (e) { document.documentElement.classList.add("ax-nogl"); return; }
  const reduce = AX.reduceMotion;
  const OLIVE = 0x0a0a0a, CREAM = 0xffffff, ORANGE = 0xffd60a, CORK = 0x3a3a3a, BROWN = 0xffffff;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(OLIVE, 1);
  const scene = new T.Scene(); scene.fog = new T.Fog(OLIVE, 110, 300);
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 260);
  scene.add(new T.HemisphereLight(0xffffff, 0x222222, 1.05));
  const sun = new T.DirectionalLight(0xffffff, 0.8); sun.position.set(14, 22, 16); scene.add(sun);
  const warm = new T.PointLight(ORANGE, 0.5, 60); scene.add(warm);

  // ---------- helpers ----------
  const label = (text, size = 1, color = "#ffffff") => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 128; const x = c.getContext("2d");
    let px = 54; x.font = "500 " + px + "px 'Geist Mono', Menlo, monospace";
    const t = text.toUpperCase(); while (x.measureText(t).width > 980 && px > 20) { px -= 2; x.font = "500 " + px + "px 'Geist Mono', Menlo, monospace"; }
    x.fillStyle = color; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, 512, 66);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    s.scale.set(16 * size, 2 * size, 1); return s;
  };
  const edges = (mesh, color = BROWN, opacity = 0.85) => { const l = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({ color, transparent: true, opacity })); mesh.add(l); return l; };
  const cork = (opacity = 0.94) => new T.MeshStandardMaterial({ color: CORK, roughness: 0.85, metalness: 0, transparent: true, opacity });

  // ======================================================================
  // The network: one slab per layer
  // ======================================================================
  const net = new T.Group(); scene.add(net);
  const XS = { input: -22, conv1: -16, conv2: -10.5, conv3: -5.5, conv4: -1, conv5: 3.5, fc6: 8.5, fc7: 11.5, fc8: 14.5 };
  const slabs = {};
  AX.LAYERS.forEach((L) => {
    if (L.kind === "input") return;
    const thick = L.kind === "conv" ? 0.5 + Math.sqrt(L.K) * 0.14 : 0.6, hh = L.kind === "conv" ? (L.id === "conv1" ? 9 : L.id === "conv2" ? 6.6 : 4.4) : (L.id === "fc8" ? 3.4 : 7);
    const geo = new T.BoxGeometry(thick, hh, L.kind === "conv" ? hh : 0.6);
    let mat = cork(); if (L.kind === "fc") mat = new T.MeshStandardMaterial({ color: 0x262626, roughness: 0.9, transparent: true, opacity: 0.95 });
    const mesh = new T.Mesh(geo, L.id === "conv1" ? [mat, null, mat, mat, mat, mat] : mat);
    mesh.position.set(XS[L.id], 0, 0); mesh.userData = { thick, hh, base: mat.color.clone() };
    edges(mesh); net.add(mesh); slabs[L.id] = mesh;
    const name = label(L.name, 0.62); name.position.set(XS[L.id], -hh / 2 - 1.3, 0); net.add(name);
  });
  // thin sheets inside each convolution slab, so they read as stacks of maps
  AX.LAYERS.filter((L) => L.kind === "conv").forEach((L) => {
    const m = slabs[L.id], n = Math.min(10, Math.round(Math.sqrt(L.K) / 1.6));
    for (let i = 1; i < n; i++) { const f = new T.Mesh(new T.PlaneGeometry(m.userData.hh * 0.98, m.userData.hh * 0.98), new T.MeshBasicMaterial({ color: BROWN, transparent: true, opacity: 0.16, side: T.DoubleSide })); f.rotation.y = Math.PI / 2; f.position.x = XS[L.id] - m.userData.thick / 2 + (i / n) * m.userData.thick; net.add(f); }
  });
  // thin connection lines between neighbouring layers
  const links = new T.Group(); net.add(links);
  const ids = AX.LAYERS.map((L) => L.id);
  for (let i = 0; i < ids.length - 1; i++) {
    const a = ids[i], b = ids[i + 1], ha = (slabs[a] ? slabs[a].userData.hh : 9) / 2, hb = slabs[b].userData.hh / 2;
    const pts = [[-ha, -hb], [ha, hb], [-ha, hb], [ha, -hb]].map(([ya, yb]) => [new T.Vector3(XS[a] + (slabs[a] ? slabs[a].userData.thick / 2 : 0), ya, 0), new T.Vector3(XS[b] - slabs[b].userData.thick / 2, yb, 0)]).flat();
    links.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: CREAM, transparent: true, opacity: 0.2 })));
  }
  // the input photograph
  const photo = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ color: 0x777777, side: T.DoubleSide }));
  photo.rotation.y = -Math.PI / 2; photo.position.set(XS.input, 0, 0); net.add(photo);
  const frame = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(9.2, 9.2)), new T.LineBasicMaterial({ color: CREAM })); frame.rotation.y = -Math.PI / 2; frame.position.copy(photo.position); net.add(frame);
  const inLab = label("Input photo", 0.62); inLab.position.set(XS.input, -5.8, 0); net.add(inLab);

  // the kernel box and its beam to the first slab
  const kbox = new T.Group(); scene.add(kbox);
  [[0xff4d4d, -0.16], [0x4dd06a, 0], [0x4d8bff, 0.16]].forEach(([c, dx]) => { const p = new T.Mesh(new T.BoxGeometry(0.06, 0.95, 0.95), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.78 })); p.position.x = dx; kbox.add(p); });
  const kEdge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.46, 1.0, 1.0)), new T.LineBasicMaterial({ color: ORANGE })); kbox.add(kEdge);
  const beamGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), beam = new T.Line(beamGeo, new T.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.85 })); scene.add(beam);
  const cell = new T.Mesh(new T.SphereGeometry(0.2, 12, 12), new T.MeshBasicMaterial({ color: ORANGE })); scene.add(cell);
  const kLab = label("Kernel window", 0.5, "#ffd60a"); scene.add(kLab);
  [kbox, beam, cell, kLab].forEach((o) => { o.visible = false; });

  // feature map painted on the first slab as the box sweeps
  const MAPN = 55, mapCv = document.createElement("canvas"); mapCv.width = mapCv.height = MAPN;
  const mapCtx = mapCv.getContext("2d"), mapTex = new T.CanvasTexture(mapCv); mapTex.magFilter = T.NearestFilter; mapTex.minFilter = T.NearestFilter;
  mapCtx.fillStyle = "#e4e0d3"; mapCtx.fillRect(0, 0, MAPN, MAPN);
  slabs.conv1.material[1] = new T.MeshBasicMaterial({ map: mapTex });
  let mapPix = null, photoLoaded = false;
  const zoo = AX.makeZoo();
  AX.loadImage("alexnet/img/elephant-river.jpg").then((img) => {
    photo.material.dispose(); photo.material = new T.MeshBasicMaterial({ map: new T.TextureLoader().load("alexnet/img/elephant-river.jpg"), side: T.DoubleSide });
    const rgb = AX.photoRGB(img, 227), picks = [3, 15, 27, 39], out = new Float32Array(MAPN * MAPN);
    picks.forEach((ki) => { const k = zoo[ki].k; for (let y = 0; y < MAPN; y++) for (let x = 0; x < MAPN; x++) { let s = 0; const y0 = y * 4, x0 = x * 4; for (let u = 0; u < 11; u++) { const row = ((y0 + u) * 227 + x0) * 3, k0 = u * 33; for (let i = 0; i < 33; i++) s += k[k0 + i] * (rgb[row + i] - 0.5); } out[y * MAPN + x] = Math.max(out[y * MAPN + x], Math.abs(s)); } });
    const a = Float32Array.from(out).sort(), mx = Math.max(1e-6, a[Math.floor(a.length * 0.99)]);
    mapPix = Array.from(out, (v) => { const t = Math.pow(Math.min(1, v / mx), 0.65); return [Math.round(44 + t * (255 - 44)), Math.round(56 + t * (154 - 56)), Math.round(32 + t * (77 - 32))]; });
    photoLoaded = true;
  });

  // ======================================================================
  // The stadium of cores
  // ======================================================================
  const cores = new T.Group(); cores.position.set(0, -26, 0); scene.add(cores);
  const G = 26, CELL = 0.5, cubeGeo = new T.BoxGeometry(0.38, 0.38, 0.38), meshes = [];
  [-9, 9].forEach((cx) => {
    const m = new T.InstancedMesh(cubeGeo, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), G * G); m.position.x = cx; cores.add(m); meshes.push(m);
    const dummy = new T.Object3D(), col = new T.Color(0x2c2c2c);
    for (let i = 0; i < G * G; i++) { dummy.position.set((i % G - G / 2) * CELL, 0, (Math.floor(i / G) - G / 2) * CELL); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col); }
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  });
  const l1 = label("1 worker", 0.8); l1.position.set(-9, 1.2, 8.8); cores.add(l1);
  const l2 = label("512 workers", 0.8, "#ffd60a"); l2.position.set(9, 1.2, 8.8); cores.add(l2);
  const l3 = label("676 sums, 3 x 3 stencil", 0.9); l3.position.set(0, 4.6, -8); cores.add(l3);
  const dumC = new T.Object3D(), cDim = new T.Color(0x2c2c2c), cOn = new T.Color(CREAM), cNew = new T.Color(ORANGE);
  const setCell = (m, i, state) => { dumC.position.set((i % G - G / 2) * CELL, state ? 0.35 : 0, (Math.floor(i / G) - G / 2) * CELL); dumC.scale.set(1, state ? 2.1 : 1, 1); dumC.updateMatrix(); m.setMatrixAt(i, dumC.matrix); m.setColorAt(i, state === 2 ? cNew : state === 1 ? cOn : cDim); };

  // ======================================================================
  // The cloud of digits (the digit model's ten scores, squashed to three numbers)
  // ======================================================================
  const cloud = new T.Group(); cloud.position.set(0, 0, -80); scene.add(cloud);
  Promise.all([AX.samples, AX.templates]).then(([s, t]) => {
    const X = s.imgs.map((im) => { const sc = new Array(10).fill(0); for (let c = 0; c < 10; c++) { let v = 0; for (let p = 0; p < 784; p++) if (im[p] > 0.5) v += t.W[c * 784 + p]; sc[c] = v; } return sc; });
    const n = X.length, d = 10, mean = Array.from({ length: d }, (_, j) => X.reduce((a, r) => a + r[j], 0) / n), C = X.map((r) => r.map((v, j) => v - mean[j]));
    const cov = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => C.reduce((s2, r) => s2 + r[a] * r[b], 0) / n)), comps = [];
    for (let k = 0; k < 3; k++) { let v = Array.from({ length: d }, (_, i) => Math.sin(i * 1.7 + k + 1)); for (let it = 0; it < 120; it++) { const w = cov.map((row) => row.reduce((s2, x, j) => s2 + x * v[j], 0)), nm = Math.hypot(...w) || 1; v = w.map((x) => x / nm); } const lam = cov.map((row) => row.reduce((s2, x, j) => s2 + x * v[j], 0)).reduce((s2, x, j) => s2 + x * v[j], 0); comps.push(v); for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) cov[a][b] -= lam * v[a] * v[b]; }
    const P = C.map((r) => comps.map((v) => r.reduce((s2, x, j) => s2 + x * v[j], 0))), sd = [0, 1, 2].map((k) => Math.sqrt(P.reduce((a, r) => a + r[k] * r[k], 0) / n) || 1);
    const dots = new T.InstancedMesh(new T.SphereGeometry(0.55, 16, 16), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), n), dm = new T.Object3D();
    P.forEach((r, i) => { dm.position.set(r[0] / sd[0] * 6, r[1] / sd[1] * 5, r[2] / sd[2] * 6); dm.updateMatrix(); dots.setMatrixAt(i, dm.matrix); dots.setColorAt(i, new T.Color().setHSL(s.labels[i] / 10, 0.75, 0.6)); });
    dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true; cloud.add(dots);
    const ring = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(17, 14, 17)), new T.LineBasicMaterial({ color: CREAM, transparent: true, opacity: 0.3 })); cloud.add(ring);
    const lb = label("60 digits, 3 numbers each", 1); lb.position.set(0, -10, 0); cloud.add(lb);
  });

  // ======================================================================
  // Camera: one keyframe per scene
  // ======================================================================
  const KEYS = [
    [[2, 9, 54], [-3.7, 0, 0]],      // 0 hero
    [[-36, 4, 17], [-21, 0, 0]],     // 1 match
    [[-32, 5, 16], [-17.5, 0, 0]],   // 2 scan
    [[0, -6, 48], [0, -26, 0]],      // 3 line up
    [[-30, 2.5, 9], [-21.3, 0, 0]],  // 4 tensors
    [[-4, 10, 40], [-4, 0, 0]],      // 5 layers
    [[10, 7, 27], [1, 0, 0]],        // 6 learning
    [[-2, 16, 36], [-3, 0, 0]],      // 7 paper
    [[7, 6, -45], [0, 0, -80]],      // 8 embeddings
    [[-14, -8, 38], [0, -26, 0]],    // 9 why 2012
    [[0, 12, 58], [-3, 0, 0]]        // 10 close
  ];
  // ---------- chapter counter ----------
  let voLast = -1;
  const cnt = document.getElementById("axCount"); let cntK = -1;
  const updateOrb = (p) => {
    if (!cnt) return;
    const k = Math.max(0, Math.min(10, Math.round(p)));
    cnt.classList.toggle("on", p > 0.6 && p < 9.7);
    if (k !== cntK) { cntK = k; const n = Math.max(1, Math.min(9, k)); cnt.querySelector(".ax-cn").textContent = ("0" + n).slice(-2); cnt.querySelector("a").setAttribute("href", k >= 9 ? "#close" : "#s" + (k + 1)); }
  };
  const NAMES = ["AlexNet", "Match", "Scan", "Line up", "Tensors", "Layers", "Learning", "The paper", "Embeddings", "Why 2012", "Summary"];
  const anchors = () => [document.querySelector(".ax-hero")].concat([...Array(9).keys()].map((i) => document.querySelector("#s" + (i + 1) + " .ax-stage")), [document.querySelector(".ax-close")]).filter(Boolean);
  let anch = [], cur = KEYS[0][0].slice(), look = KEYS[0][1].slice(), mouse = [0, 0], progress = 0, last = performance.now();
  const smooth = (a, b, x) => { const t = AX.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const measure = () => { anch = anchors().map((el) => { const r = el.getBoundingClientRect(); return r.top + scrollY + r.height * 0.5; }); };
  const where = () => { const y = scrollY + innerHeight * 0.5; if (!anch.length) return 0; if (y <= anch[0]) return 0; for (let i = 0; i < anch.length - 1; i++) if (y < anch[i + 1]) return i + (y - anch[i]) / (anch[i + 1] - anch[i]); return anch.length - 1; };
  const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;  camera.fov = w < 700 ? 52 : 40; camera.updateProjectionMatrix(); measure(); };
  addEventListener("resize", resize); addEventListener("load", () => setTimeout(measure, 300)); setTimeout(measure, 1200); setTimeout(measure, 3500);
  addEventListener("pointermove", (e) => { mouse = [e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5]; }, { passive: true });
  resize();

  // ---------- the animation ----------
  let sweepIdx = 0, wrote = 0, coreClock = 0;
  const tmp = new T.Vector3();
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    const p = where(), i = Math.min(KEYS.length - 2, Math.floor(p)), f = smooth(0.35, 0.9, p - i);
    const A = KEYS[i], B = KEYS[i + 1], tp = [0, 1, 2].map((k) => A[0][k] + (B[0][k] - A[0][k]) * f), tl = [0, 1, 2].map((k) => A[1][k] + (B[1][k] - A[1][k]) * f);
    const hero = 1 - smooth(0, 0.6, p);
    tp[0] += Math.sin(t * 0.18) * 5 * hero + mouse[0] * 3; tp[1] += -mouse[1] * 2 + Math.sin(t * 0.13) * 1.2 * hero; tl[1] += 0.0;
    const k = reduce ? 1 : 1 - Math.pow(0.0009, dt);
    for (let a = 0; a < 3; a++) { cur[a] += (tp[a] - cur[a]) * k; look[a] += (tl[a] - look[a]) * k; }
    // orbit: the camera circles whatever it is looking at, a little further with every step
    const zf = 1 + 0.5 * smooth(0, 0.8, p), th = reduce ? p * 0.5 : p * 0.5 + Math.sin(t * 0.25) * 0.12, dx = cur[0] - look[0], dz = cur[2] - look[2], cs = Math.cos(th), sn = Math.sin(th);
    camera.position.set(look[0] + (dx * cs + dz * sn) * zf, look[1] + (cur[1] - look[1]) * zf, look[2] + (-dx * sn + dz * cs) * zf); camera.lookAt(look[0], look[1], look[2]);
    const vo = Math.round(innerHeight * 0.13 * (1 - smooth(0, 0.8, p))); if (vo !== voLast) { voLast = vo; if (vo) camera.setViewOffset(innerWidth, innerHeight, 0, vo, innerWidth, innerHeight); else camera.clearViewOffset(); camera.updateProjectionMatrix(); }
    updateOrb(p, th, t);
    warm.position.set(cur[0] * 0.5 + 6, cur[1] + 4, cur[2] * 0.5 + 4);

    // kernel sweep over the photo, painting the first slab's map
    if (false && photoLoaded && mapPix) {
      sweepIdx = reduce ? MAPN * MAPN * 0.6 : (sweepIdx + dt * 55 * 4.5) % (MAPN * MAPN + 220);
      const idx = Math.min(MAPN * MAPN - 1, Math.floor(sweepIdx)), col = idx % MAPN, row = Math.floor(idx / MAPN);
      if (idx < wrote) { mapCtx.fillStyle = "#e4e0d3"; mapCtx.fillRect(0, 0, MAPN, MAPN); wrote = 0; }
      if (idx > wrote) { for (let q = wrote; q < idx; q++) { const c = mapPix[q]; mapCtx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; mapCtx.fillRect(q % MAPN, Math.floor(q / MAPN), 1, 1); } wrote = idx; mapTex.needsUpdate = true; }
      const y = 4.5 - (row + 0.5) / MAPN * 9, z = -4.5 + (col + 0.5) / MAPN * 9, slabFace = XS.conv1 - slabs.conv1.userData.thick / 2 - 0.02;
      kbox.position.set(XS.input - 0.32, y, z); beam.geometry.setFromPoints([new T.Vector3(XS.input - 0.32, y, z), new T.Vector3(slabFace, y, z)]); cell.position.set(slabFace - 0.05, y, z); kLab.position.set(XS.input - 1.8, y + 1.3, z);
    }
    // the pulse: forward in the middle scenes, backward when learning
    const learning = p > 5.6 && p < 6.9, pulseX = learning ? 16 - ((t * 7) % 40) : -22 + ((t * 7) % 40);
    Object.keys(slabs).forEach((id) => { const m = slabs[id], near = Math.max(0, 1 - Math.abs(m.position.x - pulseX) / 5), mats = Array.isArray(m.material) ? m.material.filter(Boolean) : [m.material]; mats.forEach((mm) => { if (mm.emissive) { mm.emissive.setHex(ORANGE); mm.emissiveIntensity = near * (learning ? 0.4 : 0.18); } }); });
    // cores: one worker against many, on a repeating 7.5 second cycle
    if (Math.abs(p - 3) < 1.4 || Math.abs(p - 9) < 1.4 || reduce) {
      coreClock = (coreClock + dt) % 7.5; const tc = reduce ? 5 : coreClock, solo = meshes[0], gang = meshes[1], sd = Math.min(G * G, Math.floor(tc * 180));
      for (let q = 0; q < G * G; q++) {
        setCell(solo, q, q >= sd ? 0 : q > sd - 4 && sd < G * G ? 2 : 1);
        setCell(gang, q, q < 512 ? (tc < 0.5 ? 0 : tc < 0.9 ? 2 : 1) : (tc < 1.4 ? 0 : tc < 1.8 ? 2 : 1));
      }
      solo.instanceMatrix.needsUpdate = gang.instanceMatrix.needsUpdate = true; solo.instanceColor.needsUpdate = gang.instanceColor.needsUpdate = true;
    }
    cloud.visible = Math.abs(p - 8) < 1.3; cores.visible = Math.abs(p - 3) < 1.5 || Math.abs(p - 9) < 1.5 || reduce; net.visible = !(Math.abs(p - 3) < 0.9 || Math.abs(p - 9) < 0.9);
    // the cloud turns slowly
    cloud.rotation.y = t * 0.12;
    renderer.render(scene, camera); progress = p; void progress; void tmp;
  }
  let raf = 0;
  const loop = (now) => { raf = requestAnimationFrame(loop); if (document.hidden) { last = now; return; } step(now); };
  if (reduce) { step(performance.now()); addEventListener("scroll", () => step(performance.now()), { passive: true }); } else raf = requestAnimationFrame(loop);
  document.documentElement.classList.add("ax-gl");
  window.AX_SCENE = { camera, scene, step };
})();
