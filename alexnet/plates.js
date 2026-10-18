/* Line-art plates: one animated figure per step, drawn in SVG and started when scrolled into view. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var f = function (n) { return Math.round(n * 10) / 10; };
  var rect = function (x, y, w, h, c, extra) { return '<rect class="' + (c || '') + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" ' + (extra || '') + '/>'; };
  var line = function (x1, y1, x2, y2, c) { return '<line class="' + (c || 'd') + '" pathLength="1" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"/>'; };
  var text = function (x, y, t, c, anchor) { return '<text class="t ' + (c || '') + '" x="' + f(x) + '" y="' + f(y) + '" text-anchor="' + (anchor || 'start') + '">' + t + '</text>'; };
  var anim = function (attr, dur, vals, keys, extra) { return '<animate attributeName="' + attr + '" begin="indefinite" dur="' + dur + 's" repeatCount="indefinite" values="' + vals + '" keyTimes="' + keys + '" ' + (extra || '') + '/>'; };
  var rng = function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

  var P = [];

  // 1. match: patch x stencil = score
  P.push({ cap: 'A patch, a stencil, and one number: how well they agree.', svg: function () {
    var patch = [0, 1, 0, 1, 1, 1, 0, 1, 0], st = [-1, 1, -1, 1, 1, 1, -1, 1, -1], o = '', i;
    for (i = 0; i < 9; i++) { var x = 70 + (i % 3) * 38, y = 52 + Math.floor(i / 3) * 38;
      o += rect(x, y, 38, 38, 'd cell' + (patch[i] ? ' ink' : ''));
      var sx = 330 + (i % 3) * 38; o += rect(sx, y, 38, 38, 'd cell' + (st[i] > 0 ? ' or' : ''));
      o += '<circle class="pulse" cx="' + (x + 19) + '" cy="' + (y + 19) + '" r="4" style="animation-delay:' + (i * 0.22) + 's"/>'; }
    o += text(257, 125, '&times;', 'big', 'middle');
    o += text(488, 125, '=', 'big');
    o += rect(540, 100, 180, 14, 'd box') + '<rect class="gauge" x="540" y="100" width="180" height="14">' + anim('width', 6, '0;160;160;0', '0;.35;.9;1') + '</rect>';
    o += text(540, 90, 'SCORE', 'm') + text(720, 90, '+0.9', 'm or', 'end');
    o += text(70, 40, 'PATCH', 'm') + text(330, 40, 'STENCIL', 'm') + text(70, 190, 'dark pixels line up with what the stencil asks for', 'm dim');
    return o; } });

  // 2. scan: window slides, map fills
  P.push({ cap: 'Slide one stencil over every position; each score becomes one pixel of a new picture.', svg: function () {
    var W = 10, H = 6, C = 24, X0 = 50, Y0 = 30, OW = 8, OH = 4, OC = 24, OX = 440, OY = 50, o = '', img = [], i, x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var dark = x >= 4 && x <= 6 && y >= 1 && y <= 4; img.push(dark ? 1 : 0); o += rect(X0 + x * C, Y0 + y * C, C, C, 'd cell' + (dark ? ' ink' : '')); }
    var pos = [], sc = []; for (y = 0; y < OH; y++) for (x = 0; x < OW; x++) { var s = 0; for (var u = 0; u < 3; u++) s += img[(y + u) * W + x + 2] - img[(y + u) * W + x]; pos.push((X0 + x * C) + ',' + (Y0 + y * C)); sc.push(Math.min(1, Math.abs(s) / 3)); }
    var n = pos.length;
    for (i = 0; i < n; i++) { x = i % OW; y = Math.floor(i / OW); var t = (i + 1) / (n + 1);
      o += rect(OX + x * OC, OY + y * OC, OC, OC, 'd cell');
      o += '<rect class="or" x="' + (OX + x * OC) + '" y="' + (OY + y * OC) + '" width="' + OC + '" height="' + OC + '" opacity="' + f(sc[i] * .9) + '">' + anim('opacity', 12, '0;0;' + f(sc[i] * .9) + ';' + f(sc[i] * .9) + ';0', '0;' + f(t * .85) + ';' + f(t * .85 + .01) + ';.97;1') + '</rect>'; }
    o += '<g class="win"><rect class="or thick" x="0" y="0" width="' + 3 * C + '" height="' + 3 * C + '"/>' +
      '<animateTransform attributeName="transform" type="translate" begin="indefinite" dur="12s" repeatCount="indefinite" calcMode="discrete" values="' + pos.join(';') + '"/></g>';
    o += text(X0, 20, 'PICTURE', 'm') + text(OX, 40, 'WHERE IT FOUND AN EDGE', 'm') + text(X0, 215, 'one stencil, every position, one new picture', 'm dim');
    o += line(X0 + W * C + 12, 100, OX - 14, 100, 'd or') + text(X0 + W * C + 30, 92, '&rarr;', 'big');
    return o; } });

  // 3. line up: patches become rows of a table
  P.push({ cap: 'Cut every patch out, flatten it into a row, stack the rows: one table, one multiplication.', svg: function () {
    var o = '', i, j, X0 = 50, Y0 = 30;
    for (i = 0; i < 24; i++) o += rect(X0 + (i % 6) * 24, Y0 + Math.floor(i / 6) * 24, 24, 24, 'd cell' + ([8, 9, 14, 15].indexOf(i) > -1 ? ' ink' : ''));
    o += '<rect class="or thick" x="' + X0 + '" y="' + Y0 + '" width="72" height="72"><animate attributeName="x" begin="indefinite" dur="8s" repeatCount="indefinite" calcMode="discrete" values="50;74;98;122;50;74;98;122" keyTimes="0;.125;.25;.375;.5;.625;.75;.875"/><animate attributeName="y" begin="indefinite" dur="8s" repeatCount="indefinite" calcMode="discrete" values="30;30;30;30;54;54;54;54" keyTimes="0;.125;.25;.375;.5;.625;.75;.875"/></rect>';
    for (i = 0; i < 8; i++) { var y = 46 + i * 20, g = '<g>' + anim('opacity', 8, '0;1;1;0', '0;' + f(i / 9 + .02) + ';.92;1');
      for (j = 0; j < 9; j++) g += rect(330 + j * 14, y, 14, 14, 'cell' + ((i + j) % 4 === 0 ? ' ink' : '')) ; g += '</g>'; o += g; }
    o += rect(330, 46, 126, 154, 'd box');
    o += text(480, 130, '&times;', 'big'); for (j = 0; j < 9; j++) o += rect(530, 46 + j * 17, 14, 14, 'cell' + (j % 3 === 2 ? ' or' : ''));
    o += text(576, 130, '=', 'big'); for (i = 0; i < 8; i++) o += rect(620, 46 + i * 20, 8 + ((i * 37) % 60), 14, 'or', 'opacity=".75"');
    o += text(X0, 20, 'PICTURE', 'm') + text(330, 36, 'ONE ROW PER PATCH', 'm') + text(530, 36, 'STENCIL', 'm') + text(620, 36, 'SCORES', 'm') + text(X0, 224, 'a graphics card multiplies the whole table at once', 'm dim');
    return o; } });

  // 4. tensors: three colour channels
  P.push({ cap: 'A colour photo is three stacked grids. A stencil for it is three stacked grids too.', svg: function () {
    var o = '<g transform="translate(0 34)">', k, i, cols = ['#d83a1f', '#2f7a4d', '#2b5fb4'], names = ['RED', 'GREEN', 'BLUE'];
    for (k = 2; k >= 0; k--) { var ox = 120 + k * 36, oy = 120 - k * 34, g = '<g class="float" style="animation-delay:' + (k * .5) + 's">';
      g += '<polygon class="d sheet" points="' + ox + ',' + oy + ' ' + (ox + 200) + ',' + oy + ' ' + (ox + 240) + ',' + (oy - 60) + ' ' + (ox + 40) + ',' + (oy - 60) + '" style="fill:' + cols[k] + '22;stroke:' + cols[k] + '"/>';
      for (i = 1; i < 5; i++) g += '<line class="grid" x1="' + (ox + i * 40) + '" y1="' + oy + '" x2="' + (ox + i * 40 + 40) + '" y2="' + (oy - 60) + '" style="stroke:' + cols[k] + '"/>';
      g += text(ox + 250, oy - 24, names[k], 'm', 'start') + '</g>'; o += g; }
    o += line(100, 126, 100, 28, 'd') + text(86, 80, 'H', 'm', 'end') + line(120, 176, 330, 176, 'd') + text(225, 196, 'W', 'm', 'middle');
    o += text(560, 190, 'H &times; W &times; 3', 'm or');
    o += '<g transform="translate(560 40)">' + rect(0, 0, 66, 66, 'd box') + rect(10, -10, 66, 66, 'd box') + rect(20, -20, 66, 66, 'd box or') + text(100, 20, '11 &times; 11 &times; 3', 'm') + text(100, 38, '= 363 numbers', 'm dim') + '</g></g>';
    return o; } });

  // 5. layers
  P.push({ cap: 'Each layer feeds the next: wider and shallower becomes narrower and deeper, then a short list of scores.', svg: function () {
    var o = '', L = [[44, 150, 'IMAGE', 6], [100, 140, 'CONV 1', 30], [160, 108, 'CONV 2', 36], [222, 78, 'CONV 3', 42], [276, 78, 'CONV 4', 42], [330, 78, 'CONV 5', 36], [410, 120, 'FC 6', 10], [470, 120, 'FC 7', 10], [530, 40, 'FC 8', 10]], i;
    // positions scaled to 800 wide
    var xs = [40, 130, 230, 330, 420, 510, 610, 680, 750];
    for (i = 0; i < L.length; i++) { var h = L[i][1], w = L[i][3], x = xs[i], y = 110 - h / 2;
      o += rect(x, y, w, h, 'd box' + (i === 0 ? ' ph' : ''));
      if (i > 0 && i < 6) for (var s = 1; s < 4; s++) o += line(x + w * s / 4, y + 4, x + w * s / 4, y + h - 4, 'grid');
      if (i < L.length - 1) o += '<line class="grid link" x1="' + (x + w) + '" y1="' + (110 - h * .5) + '" x2="' + xs[i + 1] + '" y2="' + (110 - L[i + 1][1] * .5) + '"/><line class="grid link" x1="' + (x + w) + '" y1="' + (110 + h * .5) + '" x2="' + xs[i + 1] + '" y2="' + (110 + L[i + 1][1] * .5) + '"/>';
      o += text(x + w / 2, 200, L[i][2], 'm s', 'middle'); }
    o += '<circle r="5" class="orf" cy="110"><animate attributeName="cx" begin="indefinite" dur="5s" repeatCount="indefinite" values="40;750" keyTimes="0;1"/></circle>';
    o += text(40, 24, '60 MILLION WEIGHTS &middot; 650,000 NEURONS', 'm dim');
    return o; } });

  // 6. learning: ball rolls down the error bowl
  P.push({ cap: 'Learning is rolling downhill: nudge each weight against the slope of the error.', svg: function () {
    var o = '';
    o += '<path class="d" pathLength="1" d="M60 30 Q400 390 740 30" />';
    o += text(400, 228, 'WEIGHT', 'm dim', 'middle') + text(48, 40, 'ERROR', 'm dim', 'end');
    o += '<circle r="8" class="orf"><animateMotion begin="indefinite" dur="5s" repeatCount="indefinite" path="M92 78 Q250 205 400 205" keyPoints="0;1;1" keyTimes="0;.7;1" calcMode="linear"/></circle>';
    o += '<g><line class="or slope" x1="52" y1="52" x2="132" y2="112"><animate attributeName="opacity" begin="indefinite" dur="5s" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;.12;.3;1"/></line></g>';
    o += text(150, 100, 'slope', 'm or') + text(470, 100, 'w &larr; w &minus; &epsilon; &middot; slope', 'm');
    o += '<circle cx="400" cy="205" r="12" class="or ring"/>' + text(400, 175, 'best weights', 'm', 'middle');
    return o; } });

  // 7. the paper
  P.push({ cap: 'A short list of choices, read in order of how much each one mattered.', svg: function () {
    var o = '', i;
    o += rect(300, 14, 200, 196, 'd box');
    for (i = 0; i < 12; i++) o += rect(318, 52 + i * 12, 164 - ((i * 53) % 40), 4, 'txl');
    o += rect(318, 26, 120, 8, 'ink', 'opacity=".85"');
    o += '<rect class="hl" x="312" y="48" width="176" height="14"><animate attributeName="y" begin="indefinite" dur="6s" repeatCount="indefinite" values="48;48;100;150;150" keyTimes="0;.1;.5;.9;1"/></rect>';
    var T = ['ReLU instead of tanh', 'training on two GPUs', 'local normalisation', 'overlapping pooling', 'dropout', 'data augmentation'];
    for (i = 0; i < T.length; i++) { o += line(520, 44 + i * 30, 548, 44 + i * 30, 'd or') + text(556, 48 + i * 30, T[i], 'm'); }
    o += text(40, 100, 'NeurIPS', 'm dim') + text(40, 120, '2012', 'big');
    o += text(40, 150, 'Krizhevsky,', 'm dim') + text(40, 166, 'Sutskever,', 'm dim') + text(40, 182, 'Hinton', 'm dim');
    return o; } });

  // 8. embedding space
  P.push({ cap: 'Each image becomes a point; similar images land near each other. Distance now means something.', svg: function () {
    var r = rng(7), o = '', i, c = [[200, 120, 38], [420, 70, 34], [330, 170, 30], [590, 150, 40]], q = [560, 140], near = [];
    for (var k = 0; k < c.length; k++) for (i = 0; i < 16; i++) { var a = r() * 6.28, d = Math.sqrt(r()) * c[k][2], x = c[k][0] + Math.cos(a) * d, y = c[k][1] + Math.sin(a) * d * .8;
      o += '<circle class="pt' + (k === 3 ? ' or' : '') + '" cx="' + f(x) + '" cy="' + f(y) + '" r="3.4" style="animation-delay:' + f(r() * 3) + 's"/>'; if (k === 3) near.push([x, y, Math.hypot(x - q[0], y - q[1])]); }
    near.sort(function (a, b) { return a[2] - b[2]; });
    for (i = 0; i < 4; i++) o += '<line class="or nn" x1="' + q[0] + '" y1="' + q[1] + '" x2="' + f(near[i][0]) + '" y2="' + f(near[i][1]) + '" style="animation-delay:' + (i * .3) + 's"/>';
    o += '<circle class="ring" cx="' + q[0] + '" cy="' + q[1] + '" r="46"/><circle class="orf" cx="' + q[0] + '" cy="' + q[1] + '" r="6"/>';
    o += text(780, 44, 'QUERY: AN ELEPHANT', 'm or', 'end') + text(780, 60, 'nearest points are elephants too', 'm dim', 'end');
    o += text(c[0][0], c[0][1] + 66, 'cars', 'm dim', 'middle') + text(c[1][0], c[1][1] - 46, 'dogs', 'm dim', 'middle') + text(c[2][0], c[2][1] + 40, 'flowers', 'm dim', 'middle');
    o += text(40, 24, '4096 numbers per image, squashed to a 2-D sketch', 'm dim');
    return o; } });

  // 9. timeline
  P.push({ cap: 'The recipe was old. The hardware and the data finally caught up with it.', svg: function () {
    var ev = [[1989, 'Conv. nets read ZIP codes'], [2007, 'CUDA lets GPUs run any maths'], [2009, 'ImageNet dataset released'], [2010, 'GTX 580 graphics card'], [2012, 'AlexNet wins']], o = '', x0 = 90, x1 = 710;
    var X = function (y) { return x0 + ev.map(function (e) { return e[0]; }).indexOf(y) * (x1 - x0) / 4; };
    o += line(x0, 110, x1, 110, 'd');
    o += text(x0, 226, 'not to scale', 'm dim');
    ev.forEach(function (e, i) { var x = X(e[0]), up = i % 2 === 0, last = i === ev.length - 1;
      o += '<circle class="pop' + (last ? ' orf' : '') + '" cx="' + f(x) + '" cy="110" r="' + (last ? 7 : 5) + '" style="animation-delay:' + (.4 + i * .35) + 's"/>';
      o += line(x, up ? 100 : 120, x, up ? 62 : 158, 'd' + (last ? ' or' : ''));
      o += text(x, up ? 50 : 176, e[0], 'm' + (last ? ' or' : ''), i === 0 ? 'start' : i === ev.length - 1 ? 'end' : 'middle');
      o += text(x, up ? 36 : 192, e[1], 'm dim', i === 0 ? 'start' : i === ev.length - 1 ? 'end' : 'middle'); });
    return o; } });

  var secs = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'], reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, plates = [];
  secs.forEach(function (id, i) {
    var sheet = document.querySelector('#' + id + ' .ax-sheet'), prose = sheet && sheet.querySelector('.ax-prose'); if (!prose) return;
    var fig = document.createElement('figure'); fig.className = 'ax-plate';
    fig.innerHTML = '<svg class="pl" viewBox="0 0 800 230" role="img" aria-label="' + P[i].cap.replace(/"/g, '') + '">' + P[i].svg() + '</svg><figcaption><b>PLATE ' + (i + 1) + '</b> ' + P[i].cap + '</figcaption>';
    prose.parentNode.insertBefore(fig, prose.nextSibling); plates.push(fig);
  });
  var start = function (fig) { fig.classList.add('in'); if (!reduce) fig.querySelectorAll('animate,animateTransform,animateMotion').forEach(function (a) { try { a.beginElement(); } catch (e) {} }); };
  if (!('IntersectionObserver' in window)) { plates.forEach(start); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { start(e.target); io.unobserve(e.target); } }); }, { threshold: 0.35 });
  plates.forEach(function (p) { io.observe(p); });
  // step 4: one real photo split into its red, green and blue grids
  document.querySelectorAll('.ax-rgb').forEach(function (box) {
    var im = new Image(); im.onload = function () {
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (m) {
        var c = document.createElement('canvas'), w = 180, h = Math.round(w * im.height / im.width); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); var d = x.getImageData(0, 0, w, h), a = d.data;
        for (var i = 0; i < a.length; i += 4) { a[i] *= m[0]; a[i + 1] *= m[1]; a[i + 2] *= m[2]; }
        x.putImageData(d, 0, 0); box.appendChild(c); }); };
    im.src = box.getAttribute('data-src'); });
  // step 4B: a small sample of generated first-layer-style stencils
  document.querySelectorAll('.ax-kzoo').forEach(function (box) {
    if (!window.AX || !AX.makeZoo) return; var z = AX.makeZoo(), pick = [0, 3, 6, 9, 13, 16, 20, 24, 28, 33, 38, 45, 52, 60, 70, 82];
    box.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px';
    pick.forEach(function (i) { if (!z[i]) return; var c = document.createElement('canvas'); c.width = c.height = 11; c.style.cssText = 'width:100%;height:auto;image-rendering:pixelated;display:block';
      AX.putRGB(c, AX.kernelRGB(z[i].k), 11, 11); box.appendChild(c); }); });
  // step 3A: start the race once when it scrolls into view so the grids are not blank
  var rg = document.getElementById('axRace');
  if (rg && 'IntersectionObserver' in window && !reduce) { var io2 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { var b = rg.querySelector('button.ax-btn'); if (b) b.click(); io2.disconnect(); } }, { threshold: 0.6 }); io2.observe(rg); }
})();
