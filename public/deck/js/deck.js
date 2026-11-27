/* Deck controller: slides and click-steps, counters, videos, notes with timer, theme, placeholders. */
(function () {
'use strict';
var root = document.documentElement;
var STATIC = /[?&]static/.test(location.search);
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var slides = $$('.slide');
var segs = document.getElementById('segs'), num = document.getElementById('num'), sec = document.getElementById('sec');
var notes = document.getElementById('notes'), help = document.getElementById('help');
var cur = -1, step = 0, t0 = null;

if (STATIC) { var st = document.createElement('style'); st.textContent = '*,*::before,*::after{transition:none!important}#help{display:none}'; document.head.appendChild(st); }

/* headlines come in word by word (each word slides up out of a mask) */
function wrapWords(el) {
  var n = 0;
  (function walk(node) {
    [].slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 3) {
        var parts = c.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
        parts.forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          var w = document.createElement('span'); w.className = 'wm';
          var i = document.createElement('span'); i.className = 'wi'; i.style.setProperty('--w', n++); i.textContent = t;
          w.appendChild(i); frag.appendChild(w);
        });
        node.replaceChild(frag, c);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    });
  })(el);
}
$$('.slide h1, .slide h2').forEach(wrapWords);

/* team photos: <div class="ava" data-photo="assets/team/name.jpg"> — the initial stays if the file is missing */
$$('.ava[data-photo]').forEach(function (a) { var im = new Image(); im.onload = function () { a.style.backgroundImage = 'url("' + a.dataset.photo + '")'; a.classList.add('ph'); }; im.src = a.dataset.photo; });

/* the cursor hides itself when the mouse rests (for screen recording) */
var curT = null;
addEventListener('mousemove', function () { root.classList.remove('nocursor'); clearTimeout(curT); curT = setTimeout(function () { root.classList.add('nocursor'); }, 1800); });

slides.forEach(function (s) {
  var i = document.createElement('i'); if (s.classList.contains('tone-risk')) i.className = 'risk'; i.appendChild(document.createElement('b')); segs.appendChild(i);
  $$('[data-st]', s).forEach(function (e) { e.classList.add('st'); });
});

function fit() { root.style.setProperty('--s', Math.min(innerWidth / 1920, innerHeight / 1080)); }
addEventListener('resize', fit); fit();

/* number of clicks inside a slide */
function nsteps(s) {
  if (s._n == null) {
    var m = 0;
    $$('[data-st]', s).forEach(function (e) { m = Math.max(m, +e.dataset.st); });
    $$('[data-win]', s).forEach(function (e) { m = Math.max(m, +e.dataset.win); });
    if (s.dataset.views) m = Math.max(m, s.dataset.views.split(',').length - 1);
    s._n = m;
  }
  return s._n;
}

/* counters: 0 → value when their step appears */
function fmt(v, dec) { return dec ? v.toFixed(dec) : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function count(el) {
  var to = +el.dataset.to, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
  if (STATIC) { el.textContent = pre + fmt(to, dec) + suf; return; }
  var t1 = performance.now(), dur = 1300;
  (function tick() {
    var k = Math.min(1, (performance.now() - t1) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = pre + fmt(to * e, dec) + suf;
    if (k < 1) requestAnimationFrame(tick);
  })();
}

function setVideo(v, play) {
  if (!v.src && v.dataset.src) v.src = v.dataset.src;
  if (play) { try { v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  else v.pause();
}

function applyStep(k, entering) {
  var s = slides[cur]; step = k;
  $$('[data-st]', s).forEach(function (e) {
    var was = e.classList.contains('on'), on = +e.dataset.st <= k;
    e.classList.toggle('on', on);
    if (on && !was) {
      $$('[data-to]', e).concat(e.matches('[data-to]') ? [e] : []).forEach(count);
      $$('video', e).forEach(function (v) { setVideo(v, true); });
    }
    if (!on && was) $$('video', e).forEach(function (v) { setVideo(v, false); });
  });
  $$('[data-win]', s).forEach(function (e) { e.classList.toggle('win', +e.dataset.win <= k); });
  if (entering) $$('[data-to]', s).forEach(function (el) { if (!el.closest('[data-st]')) count(el); });
  var vs = s.dataset.views;
  if (window.SCENE) SCENE.view(vs ? vs.split(',')[Math.min(k, vs.split(',').length - 1)].trim() : s.dataset.view);
  pushNotes();
}

function show(n, k) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (n !== cur && cur >= 0) $$('video', slides[cur]).forEach(function (v) { setVideo(v, false); });
  cur = n;
  slides.forEach(function (s, i) { s.classList.toggle('on', i === n); });
  [].forEach.call(segs.children, function (b, i) { b.classList.toggle('done', i <= n); });
  var s = slides[n];
  num.textContent = String(n + 1).padStart(2, '0') + ' / ' + slides.length;
  sec.textContent = s.dataset.sec || '';
  $$('[data-st]', s).forEach(function (e) { e.classList.remove('on'); });
  applyStep(STATIC ? nsteps(s) : Math.max(0, Math.min(k || 0, nsteps(s))), true);
  if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + (n + 1));
}
function next() { if (t0 === null) t0 = Date.now(); if (step < nsteps(slides[cur])) applyStep(step + 1); else if (cur < slides.length - 1) show(cur + 1, 0); }
function prev() { if (step > 0) applyStep(step - 1); else if (cur > 0) show(cur - 1, nsteps(slides[cur - 1])); }

/* notes: voiceover text, planned time, running clock */
function clock() { if (t0 === null) return '0:00'; var t = Math.floor((Date.now() - t0) / 1000); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
function pushNotes() {
  if (!root.classList.contains('shownotes') || cur < 0) return;
  var s = slides[cur], nt = s.querySelector('aside.notes'), n = nsteps(s);
  var txt = nt ? nt.innerHTML.replace(/\[click\]/g, '<i class="clk">▸ click</i>') : '';
  notes.innerHTML = '<div class="nh"><b>' + (cur + 1) + '. ' + (s.dataset.sec || '') + '</b><span>step ' + step + ' / ' + n + '</span><span>planned ' + (s.dataset.t || '—') + '</span><span>clock ' + clock() + '</span></div><div>' + txt + '</div>';
}
setInterval(pushNotes, 1000);

window.DECK = { go: function (n, k) { show(n, k); }, next: next, prev: prev, theme: function (t) { setTheme(t); }, state: function () { return { slide: cur + 1, step: step, steps: nsteps(slides[cur]) }; } };
function setTheme(t) { root.setAttribute('data-theme', t); if (window.SCENE) SCENE.theme(t); }
function fullscreen() { if (!document.fullscreenElement) { if (root.requestFullscreen) root.requestFullscreen().catch(function () {}); } else document.exitFullscreen(); }

addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var k = e.key;
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'ArrowDown' || k === 'Enter') { e.preventDefault(); next(); }
  else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp' || k === 'Backspace') { e.preventDefault(); prev(); }
  else if (k === 'Home') show(0);
  else if (k === 'End') show(slides.length - 1);
  else if (k === 'f' || k === 'F') fullscreen();
  else if (k === 't' || k === 'T') setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  else if (k === 'n' || k === 'N') { root.classList.toggle('shownotes'); pushNotes(); }
  else if (k === 'e' || k === 'E') root.classList.toggle('edit');
  else if (k === 'h' || k === 'H') root.classList.toggle('nohelp');
  else if (k === 'r' || k === 'R') { t0 = Date.now(); pushNotes(); }
  else if (/^[1-9]$/.test(k)) show(+k - 1);
  else if (k === '0') show(9);
});
addEventListener('click', function (e) { if (e.target.closest('a,button,#notes')) return; if (e.clientX < innerWidth * 0.2) prev(); else next(); });

if (/[?&]edit/.test(location.search)) root.classList.add('edit');
setTimeout(function () { help.style.opacity = '0'; }, 6000);
var h = parseInt((location.hash || '').slice(1), 10);
show(isNaN(h) ? 0 : h - 1, 0);
})();
