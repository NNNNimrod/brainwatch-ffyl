// sega54: pixel-grid font snapping for the DOM UI. Every element with its own text gets its font-size snapped:
//  Press Start 2P (8-px grid) -> multiple of 8 px (min 8) from the original size x TITLE_K x uiFontScale,
//  VT323 / other body pixel font -> whole px, even, (min 14) from the original size x BODY_K x uiFontScale.
// Original sizes (the game.css clamp()/vw values) are re-read on resize, so it stays responsive (iPhone 13 / Pixel 7).
(function() {
  var WAS_PS = ".meter-label, .brand-song, .pause-btn, .ts-btn, .hq-toast, .pause-ts-display, .music-buffering";
  var BTN = ".primary-btn, .secondary-btn, .overlay button, .card button, #insertTokenButton, #highScoresButton, #instructionsButton, #overlayButton, #initialsSave";
  var LYR = "#lyrics, #lyrics *, .lyric-line, .karaoke-line, #karaokeCurrent, #karaokeNext, #finaleKaraoke, #finaleKaraoke *, [class*=\"lyric\"], [class*=\"karaoke\"]";
  var TITLE_K = 0.62, BODY_K = 1.3, LYRIC_K = 1.6, BTN_K = 0.9, BTN_MIN = 16;   // Press Start 2P is ~1.8x wider than Trebuchet; VT323 has a small x-height
  function cfg() { var s = window.__ffylState; return (s && s.config) || {}; }
  function applyVars() {
    var c = cfg(), r = document.documentElement.style;
    if (c.uiFontTitle) r.setProperty("--ui-font-title", c.uiFontTitle);
    if (c.uiFontBody) r.setProperty("--ui-font-body", c.uiFontBody);
    if (c.uiFontLyrics) r.setProperty("--ui-font-lyrics", c.uiFontLyrics);
  }
  function hasOwnText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    return el.tagName === "BUTTON" || el.tagName === "INPUT";
  }
  var busy = false;
  function snapAll(onlyNew) {
    if (busy) return; busy = true;
    try {
      applyVars();
      var c = cfg(), sc = c.uiFontScale != null ? +c.uiFontScale : 1;
      var els = document.body ? document.body.getElementsByTagName("*") : [], i, el, cs, fam, px, want;
      for (i = 0; i < els.length; i++) {
        el = els[i];
        if (/^(SCRIPT|STYLE|CANVAS|VIDEO|AUDIO|IMG|svg|path)$/.test(el.tagName) || !hasOwnText(el)) continue;
        if (el.dataset.pxSnap) { if (onlyNew === true) continue; el.style.removeProperty("font-size"); }        // re-read the stylesheet size (responsive)
        cs = getComputedStyle(el); fam = cs.fontFamily || ""; px = parseFloat(cs.fontSize) || 16;
        // elements game.css already set in Press Start 2P keep their size (no x0.62), just snapped
        var k1 = el.matches && el.matches(WAS_PS) ? 1 : TITLE_K;
        if (el.id === "photoCredit" || (el.parentNode && el.parentNode.id === "photoCredit")) { el.style.setProperty("font-size", "14px", "important"); el.dataset.pxSnap = "1"; continue; } // CC BY credit line
        var isBtn = el.matches && el.matches(BTN);
        if (/Press Start/i.test(fam)) want = isBtn ? Math.max(BTN_MIN, Math.round(px * BTN_K * sc / 8) * 8)
          : Math.max(8, Math.round(px * k1 * sc / 8) * 8);
        else want = Math.max(isBtn ? BTN_MIN : 14, Math.round(px * ((el.matches && el.matches(LYR)) ? LYRIC_K : BODY_K) * sc / 2) * 2);
        el.style.setProperty("font-size", want + "px", "important"); el.dataset.pxSnap = "1";
      }
    } catch (e) {}
    busy = false;
  }
  var tmr = 0, tmrAll = false;
  function later(all) { if (all) tmrAll = true; if (tmr) return;
    tmr = setTimeout(function() { var a = tmrAll; tmr = 0; tmrAll = false; snapAll(!a); }, 120); }
  window.FFYLPixelFonts = { snap: snapAll };
  function boot() {
    snapAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function() { snapAll(); });
    window.addEventListener("resize", function() { later(true); });
    window.addEventListener("orientationchange", function() { later(true); });
    if (window.MutationObserver) new MutationObserver(function(ms) {
      // cheap: only NEW / not-yet-snapped text elements (HUD numbers re-set their text every frame)
      for (var k = 0; k < ms.length; k++) { var t = ms[k].target, an = ms[k].addedNodes, q;
        if (t && t.nodeType === 1 && !t.dataset.pxSnap && hasOwnText(t)) { later(false); return; }
        for (q = 0; an && q < an.length; q++) if (an[q].nodeType === 1) { later(false); return; } }
    }).observe(document.body, { childList: true, subtree: true });
    setTimeout(function() { snapAll(); }, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
