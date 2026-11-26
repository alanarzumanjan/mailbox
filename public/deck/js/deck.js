/* Deck controller: slides, keys, scaling, theme, notes, placeholders. */
(function () {
'use strict';
var root = document.documentElement;
var slides = [].slice.call(document.querySelectorAll('.slide'));
var segs = document.getElementById('segs'), num = document.getElementById('num'), sec = document.getElementById('sec');
var notes = document.getElementById('notes'), help = document.getElementById('help');
var idx = 0;

slides.forEach(function () { var i = document.createElement('i'); i.appendChild(document.createElement('b')); segs.appendChild(i); });

function fit() { root.style.setProperty('--s', Math.min(innerWidth / 1920, innerHeight / 1080)); }
addEventListener('resize', fit); fit();

function go(n) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  slides.forEach(function (s, i) { s.classList.toggle('on', i === n); });
  [].forEach.call(segs.children, function (b, i) { b.classList.toggle('done', i <= n); });
  var s = slides[n];
  num.textContent = String(n + 1).padStart(2, '0') + ' / ' + slides.length;
  sec.textContent = s.dataset.sec || '';
  var nt = s.querySelector('aside.notes'); notes.textContent = nt ? (n + 1) + '. ' + nt.textContent.trim() : '';
  if (window.SCENE) SCENE.view(s.dataset.view);
  var v = document.getElementById('demoVid');
  if (v && v.src) { if (s.contains(v)) { try { v.currentTime = 0; v.play(); } catch (e) {} } else v.pause(); }
  idx = n;
  if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + (n + 1));
}

window.DECK = { go: function (n) { go(n); }, theme: function (t) { setTheme(t); } };
function setTheme(t) { root.setAttribute('data-theme', t); if (window.SCENE) SCENE.theme(t); }

function fullscreen() { if (!document.fullscreenElement) root.requestFullscreen && root.requestFullscreen(); else document.exitFullscreen(); }

addEventListener('keydown', function (e) {
  var k = e.key;
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'ArrowDown') { e.preventDefault(); go(idx + 1); }
  else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') { e.preventDefault(); go(idx - 1); }
  else if (k === 'Home') go(0);
  else if (k === 'End') go(slides.length - 1);
  else if (k === 'f' || k === 'F') fullscreen();
  else if (k === 't' || k === 'T') setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  else if (k === 'n' || k === 'N') root.classList.toggle('shownotes');
  else if (k === 'e' || k === 'E') root.classList.toggle('edit');
  else if (k === 'h' || k === 'H') help.style.opacity = help.style.opacity === '0' ? '1' : '0';
  else if (/^[1-9]$/.test(k)) go(+k - 1);
  else if (k === '0') go(9);
});
addEventListener('click', function (e) { if (e.target.closest('a,button,video')) return; go(idx + (e.clientX < innerWidth * 0.25 ? -1 : 1)); });

/* demo video: put a screen recording at assets/demo.mp4 and it appears on the Demo slide */
var vid = document.getElementById('demoVid');
if (vid && !/[?&]static/.test(location.search)) {
  vid.addEventListener('loadeddata', function () { document.getElementById('vslot').classList.add('has'); });
  vid.src = 'assets/demo.mp4';
}

if (/[?&]edit/.test(location.search)) root.classList.add('edit');
setTimeout(function () { help.style.opacity = '0'; }, 6000);
var h = parseInt((location.hash || '').slice(1), 10);
go(isNaN(h) ? 0 : h - 1);
})();
