//=========================================================================
// minimalist DOM helpers
//=========================================================================

var Dom = {

  get:  function(id)                     { return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id); },
  set:  function(id, html)               { Dom.get(id).innerHTML = html;                        },
  on:   function(ele, type, fn, capture) { Dom.get(ele).addEventListener(type, fn, capture);    },
  un:   function(ele, type, fn, capture) { Dom.get(ele).removeEventListener(type, fn, capture); },
  show: function(ele, type)              { Dom.get(ele).style.display = (type || 'block');      },
  blur: function(ev)                     { ev.target.blur();                                    },

  addClassName:    function(ele, name)     { Dom.toggleClassName(ele, name, true);  },
  removeClassName: function(ele, name)     { Dom.toggleClassName(ele, name, false); },
  toggleClassName: function(ele, name, on) {
    ele = Dom.get(ele);
    var classes = ele.className.split(' ');
    var n = classes.indexOf(name);
    on = (typeof on == 'undefined') ? (n < 0) : on;
    if (on && (n < 0))
      classes.push(name);
    else if (!on && (n >= 0))
      classes.splice(n, 1);
    ele.className = classes.join(' ');
  },

  storage: window.localStorage || {}

}

//=========================================================================
// general purpose helpers (mostly math)
//=========================================================================

var Util = {

  timestamp:        function()                  { return new Date().getTime();                                    },
  toInt:            function(obj, def)          { if (obj !== null) { var x = parseInt(obj, 10); if (!isNaN(x)) return x; } return Util.toInt(def, 0); },
  toFloat:          function(obj, def)          { if (obj !== null) { var x = parseFloat(obj);   if (!isNaN(x)) return x; } return Util.toFloat(def, 0.0); },
  limit:            function(value, min, max)   { return Math.max(min, Math.min(value, max));                     },
  randomInt:        function(min, max)          { return Math.round(Util.interpolate(min, max, Math.random()));   },
  randomChoice:     function(options)           { return options[Util.randomInt(0, options.length-1)];            },
  percentRemaining: function(n, total)          { return (n%total)/total;                                         },
  accelerate:       function(v, accel, dt)      { return v + (accel * dt);                                        },
  interpolate:      function(a,b,percent)       { return a + (b-a)*percent                                        },
  easeIn:           function(a,b,percent)       { return a + (b-a)*Math.pow(percent,2);                           },
  easeOut:          function(a,b,percent)       { return a + (b-a)*(1-Math.pow(1-percent,2));                     },
  easeInOut:        function(a,b,percent)       { return a + (b-a)*((-Math.cos(percent*Math.PI)/2) + 0.5);        },
  exponentialFog:   function(distance, density) { return 1 / (Math.pow(Math.E, (distance * distance * density))); },

  increase:  function(start, increment, max) { // with looping
    var result = start + increment;
    while (result >= max)
      result -= max;
    while (result < 0)
      result += max;
    return result;
  },

  project: function(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x     = (p.world.x || 0) - cameraX;
    p.camera.y     = (p.world.y || 0) - cameraY;
    p.camera.z     = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth/p.camera.z;
    p.screen.x     = Math.round((width/2)  + (p.screen.scale * p.camera.x  * width/2));
    p.screen.y     = Math.round((height/2) - (p.screen.scale * p.camera.y  * height/2));
    p.screen.w     = Math.round(             (p.screen.scale * roadWidth   * width/2));
  },

  overlap: function(x1, w1, x2, w2, percent) {
    var half = (percent || 1)/2;
    var min1 = x1 - (w1*half);
    var max1 = x1 + (w1*half);
    var min2 = x2 - (w2*half);
    var max2 = x2 + (w2*half);
    return ! ((max1 < min2) || (min1 > max2));
  }

}

//=========================================================================
// POLYFILL for requestAnimationFrame
//=========================================================================

if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimationFrame = window.webkitRequestAnimationFrame || 
                                 window.mozRequestAnimationFrame    || 
                                 window.oRequestAnimationFrame      || 
                                 window.msRequestAnimationFrame     || 
                                 function(callback, element) {
                                   window.setTimeout(callback, 1000 / 60);
                                 }
}

//=========================================================================
// sega44: resilient asset loading
//  - every URL is RELATIVE (follows whatever hostname the page is on now)
//  - onerror / stall (no bytes for 15s) → retry with cache-bust query
//  - never blocks the game; drawImage never throws on unloaded/broken art
//=========================================================================

var ASSET_V = "sega54";

(function sega44DrawImageGuard() {
  try {
    var P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (!P || P._sega44Guard) return;
    var orig = P.drawImage;
    P.drawImage = function(img) {
      if (!img) return;
      // not-yet-loaded / failed <img>: draw nothing (caller's fallback shows) — never throw
      if (img.tagName === "IMG" && !(img.complete && img.naturalWidth > 0)) return;
      try { return orig.apply(this, arguments); } catch (e) {}
    };
    P._sega44Guard = true;
  } catch (eG) {}
})();

var AssetLoader = {
  stallMs: 15000,
  retries: 3,
  stats: { ok: 0, failed: 0, retried: 0, failedUrls: [] },

  // relative path + cache version; strips any stale absolute host
  url: function(path) {
    path = String(path || "");
    path = path.replace(/^[a-z]+:\/\/[^\/]+\//i, "").replace(/^\/+/, "");
    if (/[?&]v=/.test(path)) return path;
    return path + (path.indexOf("?") >= 0 ? "&" : "?") + "v=" + ASSET_V;
  },

  bust: function(url, attempt) {
    if (!attempt) return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "r=" + attempt + "." + Date.now().toString(36);
  },

  canFetch: function() {
    return !!(window.fetch && window.AbortController && window.URL && URL.createObjectURL &&
      window.Blob && location.protocol !== "file:");
  },

  // Load path into img (created if null). opts: onload(img), onerror(img, why), onprogress(loaded, total),
  // retries, stallMs. Returns img immediately (width 0 until loaded).
  image: function(img, path, opts) {
    opts = opts || {};
    img = img || new Image();
    var url = AssetLoader.url(path);
    var maxR = opts.retries != null ? opts.retries : AssetLoader.retries;
    var stallMs = opts.stallMs || AssetLoader.stallMs;
    var attempt = 0;
    var settled = false;
    var useFetch = AssetLoader.canFetch() && opts.fetch !== false;
    var rec = { loaded: 0, total: 0 };
    img._assetUrl = url;
    img._loadState = "loading";
    img._loadRec = rec;

    function progress(l, t) {
      rec.loaded = l;
      if (t) rec.total = t;
      if (opts.onprogress) { try { opts.onprogress(l, t); } catch (e) {} }
    }
    function succeed() {
      if (settled) return;
      settled = true;
      img._loadState = "ok";
      if (rec.total) rec.loaded = rec.total;
      AssetLoader.stats.ok++;
      if (opts.onload) { try { opts.onload(img); } catch (e) { try { console.warn(e); } catch (e2) {} } }
    }
    function giveUp(why) {
      if (settled) return;
      settled = true;
      img._loadState = "failed";
      AssetLoader.stats.failed++;
      AssetLoader.stats.failedUrls.push(url + " (" + why + ")");
      try { console.warn("[sega44 asset] gave up", url, why); } catch (e) {}
      if (opts.onerror) { try { opts.onerror(img, why); } catch (e) {} }
    }
    function retry(why) {
      if (settled) return;
      if (attempt >= maxR) { giveUp(why); return; }
      attempt++;
      AssetLoader.stats.retried++;
      setTimeout(go, why === "stall" ? 50 : Math.min(3000, 400 * attempt));
    }
    function viaTag(u) {
      var timer = null;
      var done = false;
      function end() { done = true; if (timer) clearTimeout(timer); img.onload = null; img.onerror = null; }
      img.onload = function() { if (done) return; end(); if (img.naturalWidth > 0) succeed(); else retry("empty"); };
      img.onerror = function() { if (done) return; end(); retry("error"); };
      timer = setTimeout(function() { if (done) return; end(); retry("stall"); }, Math.max(stallMs, opts.tagStallMs || 30000));
      img.src = u;
    }
    function viaFetch(u) {
      var ctrl = new AbortController();
      var last = Date.now();
      var why = null;
      var wd = setInterval(function() {
        if (Date.now() - last > stallMs) {
          why = "stall";
          clearInterval(wd);
          try { ctrl.abort(); } catch (e) {}
        }
      }, 1000);
      fetch(u, { signal: ctrl.signal, credentials: "same-origin" }).then(function(res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        last = Date.now();
        var total = +(res.headers.get("Content-Length") || 0) || 0;
        var type = res.headers.get("Content-Type") || "";
        if (/text\/html/i.test(type)) throw new Error("html"); // tunnel error page
        progress(0, total);
        if (!res.body || !res.body.getReader) return res.blob();
        var reader = res.body.getReader();
        var chunks = [];
        var got = 0;
        function pump() {
          return reader.read().then(function(r) {
            if (r.done) return new Blob(chunks, type ? { type: type } : {});
            chunks.push(r.value);
            got += r.value.length;
            last = Date.now();
            progress(got, total);
            return pump();
          });
        }
        return pump();
      }).then(function(blob) {
        clearInterval(wd);
        if (!blob || !blob.size) throw new Error("empty");
        var bu = URL.createObjectURL(blob);
        img.onload = function() {
          img.onload = null; img.onerror = null;
          setTimeout(function() { try { URL.revokeObjectURL(bu); } catch (e) {} }, 1000);
          if (img.naturalWidth > 0) succeed(); else retry("empty");
        };
        img.onerror = function() {
          img.onload = null; img.onerror = null;
          try { URL.revokeObjectURL(bu); } catch (e) {}
          retry("decode");
        };
        img.src = bu;
      }).catch(function() {
        clearInterval(wd);
        retry(why || "error");
      });
    }
    function go() {
      if (settled) return;
      var u = AssetLoader.bust(url, attempt);
      if (useFetch) viaFetch(u); else viaTag(u);
    }
    go();
    return img;
  }
};

// Post-Start / post-ready background queue, ordered by song time (prio), a few at a time.
// Leaves bandwidth for the streaming music: 1 at a time while < 20s of music is buffered ahead.
var LazyAssets = {
  queue: [],
  active: 0,
  started: false,
  seq: 0,
  _timer: null,
  add: function(prio, path, img, opts) {
    img = img || new Image();
    img._loadState = img._loadState || "queued";
    img._assetUrl = img._assetUrl || AssetLoader.url(path);
    LazyAssets.queue.push({ prio: prio, seq: LazyAssets.seq++, path: path, img: img, opts: opts || {} });
    LazyAssets.queue.sort(function(a, b) { return (a.prio - b.prio) || (a.seq - b.seq); });
    if (LazyAssets.started) LazyAssets.pump();
    return img;
  },
  musicAheadSec: function() {
    var m = document.getElementById("music");
    if (!m || !m.getAttribute("src")) return 999;
    try {
      var d = m.duration;
      var t = m.currentTime || 0;
      var i, end = 0;
      for (i = 0; i < m.buffered.length; i++) {
        if (m.buffered.start(i) <= t + 0.5 && m.buffered.end(i) > end) end = m.buffered.end(i);
      }
      if (d && isFinite(d) && end >= d - 0.5) return 999;
      return Math.max(0, end - t);
    } catch (e) { return 999; }
  },
  maxActive: function() {
    return LazyAssets.musicAheadSec() < 20 ? 1 : 2;
  },
  start: function() {
    if (LazyAssets.started) return;
    LazyAssets.started = true;
    LazyAssets.pump();
    LazyAssets._timer = setInterval(function() {
      if (!LazyAssets.queue.length && !LazyAssets.active) { clearInterval(LazyAssets._timer); LazyAssets._timer = null; return; }
      LazyAssets.pump();
    }, 1000);
  },
  pump: function() {
    if (!LazyAssets.started) return;
    if (!LazyAssets._timer && LazyAssets.queue.length) {
      LazyAssets._timer = setInterval(function() {
        if (!LazyAssets.queue.length && !LazyAssets.active) { clearInterval(LazyAssets._timer); LazyAssets._timer = null; return; }
        LazyAssets.pump();
      }, 1000);
    }
    var max = LazyAssets.maxActive();
    while (LazyAssets.active < max && LazyAssets.queue.length) {
      (function(job) {
        LazyAssets.active++;
        var fin = function(cb) {
          return function(img, why) {
            LazyAssets.active = Math.max(0, LazyAssets.active - 1);
            if (cb) { try { cb(img, why); } catch (e) { try { console.warn(e); } catch (e2) {} } }
            setTimeout(LazyAssets.pump, 0);
          };
        };
        AssetLoader.image(job.img, job.path, {
          stallMs: job.opts.stallMs,
          retries: job.opts.retries,
          onload: fin(job.opts.onload),
          onerror: fin(job.opts.onerror)
        });
      })(LazyAssets.queue.shift());
    }
  }
};

// Music: <audio> streams (no wait for the whole file). src is attached once the critical art is
// in (or the safety timeout fires) so the 9.7MB mp3 does not starve the Start-critical images.
// Resilient: error / 15s no-progress while it should be playing → reload with cache-bust, keep position.
var MusicLoader = {
  attached: false,
  reloads: 0,
  attach: function() {
    var m = document.getElementById("music");
    if (!m || MusicLoader.attached) return;
    MusicLoader.attached = true;
    var base = AssetLoader.url(m.getAttribute("data-src") || "audio.mp3");
    MusicLoader.base = base;
    try { m.preload = "auto"; } catch (e) {}
    if (!m.getAttribute("src")) {
      m.src = base;
      try { m.load(); } catch (e) {}
    }
    var lastEnd = -1;
    var lastT = -1;
    var stuckSince = 0;
    function bufEnd() {
      var e = 0, i;
      try { for (i = 0; i < m.buffered.length; i++) e = Math.max(e, m.buffered.end(i)); } catch (e2) {}
      return e;
    }
    function reload(why) {
      if (MusicLoader.reloads >= 6) return;
      MusicLoader.reloads++;
      var t = m.currentTime || 0;
      var st0 = null;
      try { st0 = window.__ffylState; } catch (eS0) {}
      var wasPlaying = !m.paused || !!(st0 && (st0.phase === "running" || st0.phase === "countdown"));
      try { console.warn("[sega44 music] reload", why, "t=" + t.toFixed(2)); } catch (e) {}
      m.src = AssetLoader.bust(base, MusicLoader.reloads);
      try { m.load(); } catch (e) {}
      if (t > 0.5) {
        var seekOnce = function() {
          m.removeEventListener("loadedmetadata", seekOnce);
          try { m.currentTime = t; } catch (e) {}
        };
        m.addEventListener("loadedmetadata", seekOnce);
      }
      if (wasPlaying) { try { var p = m.play(); if (p && p.catch) p.catch(function() {}); } catch (e) {} }
      stuckSince = 0;
    }
    m.addEventListener("error", function() {
      setTimeout(function() { reload("error"); }, Math.min(4000, 500 * (MusicLoader.reloads + 1)));
    });
    setInterval(function() {
      if (m.ended) { stuckSince = 0; return; }
      var e = bufEnd();
      var t = m.currentTime || 0;
      var st = null;
      try { st = window.__ffylState; } catch (eS) {}
      var wants = !m.paused || !!(st && (st.phase === "running" || st.phase === "countdown"));
      var full = m.duration && isFinite(m.duration) && e >= m.duration - 0.5;
      if (wants && !full && m.readyState < 3 && e === lastEnd && t === lastT) {
        if (!stuckSince) stuckSince = Date.now();
        if (Date.now() - stuckSince > 15000) reload("stall");
      } else {
        stuckSince = 0;
      }
      lastEnd = e;
      lastT = t;
    }, 1000);
  }
};

//=========================================================================
// GAME LOOP helpers
//=========================================================================

var Game = {  // a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop

  run: function(options) {

    // sega44: critical set only + hard safety deadline (Start unlocks even if art is still arriving)
    Game.loadImages(options.images, function(images, timedOut) {

      try { MusicLoader.attach(); } catch (eMu) {}
      // sega47: a throw in ready() must never kill the frame loop / leave Start locked
      try { options.ready(images, timedOut); } catch (eReady) { try { console.error('[sega47] ready() threw', eReady); } catch (e2) {} }

      Game.setKeyListener(options.keys);

      var canvas = options.canvas,    // canvas render target is provided by caller
          update = options.update,    // method to update game logic is provided by caller
          render = options.render,    // method to render the game is provided by caller
          step   = options.step,      // fixed frame step (1/fps) is specified by caller
          stats  = options.stats,     // stats instance is provided by caller
          now    = null,
          last   = Util.timestamp(),
          dt     = 0,
          gdt    = 0;

      function frame() {
        now = Util.timestamp();
        dt  = Math.min(1, (now - last) / 1000); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
        gdt = gdt + dt;
        while (gdt > step) {
          gdt = gdt - step;
          update(step);
        }
        render();
        stats.update();
        last = now;
        requestAnimationFrame(frame, canvas);
      }
      frame(); // lets get this party started
      Game.playMusic();
    }, {
      timeoutMs: options.criticalTimeoutMs,
      concurrency: options.criticalConcurrency || 4,
      onProgress: options.progress,
      onComplete: options.complete
    });
  },

  //---------------------------------------------------------------------------

  // sega44: resilient (retry + cache-bust + stall watchdog), ordered, limited concurrency.
  // callback(images, timedOut) fires once: when all settle OR at opts.timeoutMs (whichever first).
  // Images are the SAME element objects either way — late ones fill in when they arrive.
  // opts.lazyPrio → queue on LazyAssets (post-ready background loading) instead.
  loadImages: function(names, callback, opts) {
    opts = opts || {};
    var result = [];
    var jobs = [];
    var total = names.length;
    var settledCount = 0;
    var fired = false;
    var active = 0;
    var timer = null;
    var conc = opts.concurrency || 6;
    var n, name;
    for (n = 0; n < names.length; n++) {
      name = names[n];
      result[n] = document.createElement('img');
      // sega43: allow explicit extension (fast .jpg Austin strips)
      jobs.push({ img: result[n], path: "images/" + name + (/\.(png|jpe?g|webp|gif)$/i.test(name) ? "" : ".png") });
    }
    function report() {
      if (!opts.onProgress) return;
      var l = 0, t = 0, i, rec, w, stt;
      for (i = 0; i < result.length; i++) {
        rec = result[i]._loadRec;
        stt = result[i]._loadState;
        w = (rec && rec.total) ? rec.total : 40000;
        t += w;
        if (stt === "ok" || stt === "failed") l += w;
        else if (rec) l += Math.min(w, rec.loaded || 0);
      }
      try { opts.onProgress(t ? l / t : 1, settledCount, total); } catch (e) {}
    }
    function fire(timedOut) {
      if (fired) return;
      fired = true;
      if (timer) { clearTimeout(timer); timer = null; }
      callback(result, !!timedOut);
    }
    function done() {
      active = Math.max(0, active - 1);
      settledCount++;
      report();
      if (settledCount >= total) {
        fire(false);
        if (opts.onComplete) { try { opts.onComplete(result); } catch (e) { try { console.warn(e); } catch (e2) {} } }
      } else {
        pump();
      }
    }
    function pump() {
      while (active < conc && jobs.length) {
        var job = jobs.shift();
        active++;
        if (opts.lazyPrio != null) {
          LazyAssets.add(opts.lazyPrio, job.path, job.img, { onload: done, onerror: done });
        } else {
          AssetLoader.image(job.img, job.path, { onprogress: report, onload: done, onerror: done, stallMs: opts.stallMs });
        }
      }
    }
    if (!total) {
      fire(false);
      if (opts.onComplete) opts.onComplete(result);
      return result;
    }
    if (opts.lazyPrio != null) conc = total; // LazyAssets does its own throttling
    if (opts.timeoutMs > 0) timer = setTimeout(function() { fire(true); }, opts.timeoutMs);
    pump();
    return result;
  },

  //---------------------------------------------------------------------------

  setKeyListener: function(keys) {
    var onkey = function(keyCode, mode) {
      var n, k;
      for(n = 0 ; n < keys.length ; n++) {
        k = keys[n];
        k.mode = k.mode || 'up';
        if ((k.key == keyCode) || (k.keys && (k.keys.indexOf(keyCode) >= 0))) {
          if (k.mode == mode) {
            k.action.call();
          }
        }
      }
    };
    Dom.on(document, 'keydown', function(ev) { onkey(ev.keyCode, 'down'); } );
    Dom.on(document, 'keyup',   function(ev) { onkey(ev.keyCode, 'up');   } );
  },

  //---------------------------------------------------------------------------

  stats: function(parentId, id) { // construct mr.doobs FPS counter - along with friendly good/bad/ok message box

    var result = new Stats();
    result.domElement.id = id || 'stats';
    Dom.get(parentId).appendChild(result.domElement);

    var msg = document.createElement('div');
    msg.style.cssText = "border: 2px solid gray; padding: 5px; margin-top: 5px; text-align: left; font-size: 1.15em; text-align: right;";
    msg.innerHTML = "Your canvas performance is ";
    Dom.get(parentId).appendChild(msg);

    var value = document.createElement('span');
    value.innerHTML = "...";
    msg.appendChild(value);

    setInterval(function() {
      var fps   = result.current();
      var ok    = (fps > 50) ? 'good'  : (fps < 30) ? 'bad' : 'ok';
      var color = (fps > 50) ? 'green' : (fps < 30) ? 'red' : 'gray';
      value.innerHTML       = ok;
      value.style.color     = color;
      msg.style.borderColor = color;
    }, 5000);
    return result;
  },

  //---------------------------------------------------------------------------

  playMusic: function() {
    // sega25: title loop via armTitleMenuMusic (muted autoplay → unmute on gesture)
    var music = Dom.get('music');
    if (!music) return;
    music.loop = false;
    // Dual mute: music + SFX (localStorage prefs)
    var musicMuted = (Dom.storage.muted === "true") || (localStorage.getItem("brainwatch_ffyl_music_muted") === "true");
    // sega41: NEVER remute if a run already started (START before assets-ready used to kill song)
    var stEarly = null;
    try { stEarly = window.__ffylState; } catch (eSt) {}
    var runLive = stEarly && (stEarly.phase === "running" || stEarly.phase === "countdown" || stEarly.phase === "paused");
    if (runLive) {
      // leave whatever startAudio set; only honor explicit user mute
      if (musicMuted) {
        music.muted = true;
        music.volume = 0;
      }
    } else if (musicMuted) {
      music.muted = true;
      music.volume = 0;
    } else {
      // Leave muted=true if already set for autoplay; Gameplay gesture unlocks audible
      if (!music.muted) {
        music.muted = true;
        music.volume = 0;
      }
    }
    var musicBtn = Dom.get('muteMusic') || Dom.get('mute');
    if (musicBtn) {
      Dom.toggleClassName(musicBtn.id || 'muteMusic', 'on', musicMuted);
      Dom.on(musicBtn.id || 'muteMusic', 'click', function() {
        musicMuted = !music.muted;
        music.muted = musicMuted;
        music.volume = musicMuted ? 0 : 1;
        Dom.storage.muted = musicMuted ? "true" : "false";
        try { localStorage.setItem("brainwatch_ffyl_music_muted", musicMuted ? "true" : "false"); } catch (e) {}
        Dom.toggleClassName(musicBtn.id || 'muteMusic', 'on', musicMuted);
      });
    }
    if (window.ApexRacer && ApexRacer.Sfx) {
      var sfxMuted = ApexRacer.Sfx.init();
      var sfxBtn = Dom.get('muteSfx');
      if (sfxBtn) {
        Dom.toggleClassName('muteSfx', 'on', sfxMuted);
        Dom.on('muteSfx', 'click', function() {
          sfxMuted = ApexRacer.Sfx.setMuted(!ApexRacer.Sfx.isMuted());
          Dom.toggleClassName('muteSfx', 'on', sfxMuted);
        });
      }
    }
    // Kick title menu loop once assets/ready path reaches playMusic
    try {
      if (window.ApexRacer && ApexRacer.Gameplay) {
        var st = window.__ffylState;
        if (st && st.phase === "menu") {
          if (ApexRacer.Gameplay.armTitleMenuMusic) {
            ApexRacer.Gameplay.armTitleMenuMusic(st);
          } else if (ApexRacer.Gameplay.ensureMenuMusic) {
            ApexRacer.Gameplay.ensureMenuMusic(st);
          }
        }
      }
    } catch (eMenu) {}
  }

}

//=========================================================================
// canvas rendering helpers
//=========================================================================

var Render = {

  polygon: function(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  },

  //---------------------------------------------------------------------------

  segment: function(ctx, width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {

    var r1 = Render.rumbleWidth(w1, lanes),
        r2 = Render.rumbleWidth(w2, lanes),
        l1 = Render.laneMarkerWidth(w1, lanes),
        l2 = Render.laneMarkerWidth(w2, lanes),
        lanew1, lanew2, lanex1, lanex2, lane;
    
    ctx.fillStyle = color.grass;
    ctx.fillRect(0, y2, width, y1 - y2);
    
    Render.polygon(ctx, x1-w1-r1, y1, x1-w1, y1, x2-w2, y2, x2-w2-r2, y2, color.rumble);
    Render.polygon(ctx, x1+w1+r1, y1, x1+w1, y1, x2+w2, y2, x2+w2+r2, y2, color.rumble);
    Render.polygon(ctx, x1-w1,    y1, x1+w1, y1, x2+w2, y2, x2-w2,    y2, color.road);
    
    if (color.lane) {
      lanew1 = w1*2/lanes;
      lanew2 = w2*2/lanes;
      lanex1 = x1 - w1 + lanew1;
      lanex2 = x2 - w2 + lanew2;
      for(lane = 1 ; lane < lanes ; lanex1 += lanew1, lanex2 += lanew2, lane++)
        Render.polygon(ctx, lanex1 - l1/2, y1, lanex1 + l1/2, y1, lanex2 + l2/2, y2, lanex2 - l2/2, y2, color.lane);
    }
    
    Render.fog(ctx, 0, y1, width, y2-y1, fog);
  },

  //---------------------------------------------------------------------------

  background: function(ctx, background, width, height, layer, rotation, offset) {

    rotation = rotation || 0;
    offset   = offset   || 0;

    var imageW = layer.w/2;
    var imageH = layer.h;

    var sourceX = layer.x + Math.floor(layer.w * rotation);
    var sourceY = layer.y;
    var sourceW = Math.min(imageW, layer.x+layer.w-sourceX);
    var sourceH = imageH;
    
    var destX = 0;
    var destY = offset;
    var destW = Math.floor(width * (sourceW/imageW));
    // Compress BG layers vertically ~33% (draw at 67% height, keep bottom-aligned toward horizon)
    var destH = Math.floor(height * (2 / 3));
    destY = destY + Math.floor((height - destH) * 0.35);

    // Soft parallax wrap: overlap join by 2px and clamp sub-rects so seams don't flash
    ctx.drawImage(background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);
    if (sourceW < imageW) {
      var remW = imageW - sourceW;
      var remDestW = width - destW;
      // draw remaining tile with 2px overlap to hide wrap discontinuity
      ctx.drawImage(background, layer.x, sourceY, remW, sourceH, Math.max(0, destW - 2), destY, remDestW + 2, destH);
    }
  },

  //---------------------------------------------------------------------------

  sprite: function(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, offsetX, offsetY, clipY) {

                    //  scale for projection AND relative to roadWidth (for tweakUI)
    var mul = (sprite.scaleMul != null) ? sprite.scaleMul : 1;
    var destW  = (sprite.w * scale * width/2) * (SPRITES.SCALE * roadWidth) * mul;
    var destH  = (sprite.h * scale * width/2) * (SPRITES.SCALE * roadWidth) * mul;
    var sheet  = sprite.img || sprites;

    destX = destX + (destW * (offsetX || 0));
    destY = destY + (destH * (offsetY || 0));

    var clipH = clipY ? Math.max(0, destY+destH-clipY) : 0;
    if (clipH < destH)
      ctx.drawImage(sheet, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h*clipH/destH), destX, destY, destW, destH - clipH);

  },

  // Neon outline/glow for traffic — sega22 banks with road + slight motion pulse
  // sega31r: B/C pixel cybercabs → imageSmoothingEnabled=false; soft glow off for pixel
  spriteNeonCar: function(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, offsetX, offsetY, clipY, bankAngle) {
    var pulse = 1 + Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.045 + (destX || 0) * 0.01) * 0.018;
    scale = scale * pulse;
    var destW  = (sprite.w * scale * width/2) * (SPRITES.SCALE * roadWidth);
    var destH  = (sprite.h * scale * width/2) * (SPRITES.SCALE * roadWidth);
    // sega31s: cars +20% W / +15% H (visual; scale already has spriteScaleCars)
    try {
      var cfgCar = (window.ApexRacer && ApexRacer.CONFIG) ? ApexRacer.CONFIG : null;
      if (cfgCar) {
        if (cfgCar.carsWidthMult != null) destW *= cfgCar.carsWidthMult;
        if (cfgCar.carsHeightMult != null) destH *= cfgCar.carsHeightMult;
      }
    } catch (eCarWH) {}
    var dx = destX + (destW * (offsetX || 0));
    var dy = destY + (destH * (offsetY || 0));
    var clipH = clipY ? Math.max(0, dy+destH-clipY) : 0;
    if (clipH >= destH) return;
    var drawH = destH - clipH;
    var srcH = sprite.h - (sprite.h*clipH/destH);
    var ang = bankAngle || 0;
    var vibY = Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.09 + destX) * Math.min(1.6, destH * 0.012);
    var isPixel = !!(sprite && (sprite.pixelArt || sprite.cybercabStyle === "B" || sprite.cybercabStyle === "C"));
    var glowOff = isPixel;
    try {
      if (window.ApexRacer && ApexRacer.CONFIG && ApexRacer.CONFIG.cybercabNeonGlowOffForPixel === false) glowOff = false;
    } catch (eG) {}
    ctx.save();
    if (ang) {
      ctx.translate(dx + destW / 2, dy + drawH);
      ctx.rotate(ang);
      ctx.translate(-(dx + destW / 2), -(dy + drawH));
    }
    // NN for B/C — hard edges when scaled on phone/desktop
    ctx.imageSmoothingEnabled = !isPixel ? true : false;
    if ('imageSmoothingQuality' in ctx && !isPixel) ctx.imageSmoothingQuality = 'low';
    if (!glowOff) {
      ctx.shadowColor = 'rgba(255, 120, 40, 0.95)';
      ctx.shadowBlur = Math.max(6, Math.min(22, destW * 0.18));
    } else {
      ctx.shadowBlur = 0;
    }
    // sega31j/r: prebaked / pixel cybercabs use sprite.img (not atlas)
    var sheet = sprite.img || sprites;
    ctx.drawImage(sheet, sprite.x, sprite.y, sprite.w, srcH, dx, dy + vibY, destW, drawH);
    if (!glowOff) {
      // bright pass (soft only)
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.shadowBlur = 0;
      ctx.drawImage(sheet, sprite.x, sprite.y, sprite.w, srcH, dx, dy + vibY, destW, drawH);
    }
    ctx.restore();
  },

  //---------------------------------------------------------------------------

  player: function(ctx, width, height, resolution, roadWidth, sprites, speedPercent, scale, destX, destY, steer, updown) {

    // sega31l: hover wobble ×1.20 always (not speed-gated to zero)
    var wobbleMult = 1.20;
    try {
      if (window.ApexRacer && ApexRacer.CONFIG && ApexRacer.CONFIG.playerHoverWobbleMult != null) {
        wobbleMult = ApexRacer.CONFIG.playerHoverWobbleMult;
      }
    } catch (eW) {}
    var bounce = (1.5 * wobbleMult * Math.random() * Math.max(0.2, speedPercent) * resolution) * Util.randomChoice([-1,1]);
    var sprite;
    // sega31g: original 3 static frames only unless caller explicitly passes uphill updown
    // (renderer forces updown=0 when uphillPosesDistinctFromFlat is false)
    if (steer < 0)
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_LEFT : SPRITES.PLAYER_LEFT;
    else if (steer > 0)
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_RIGHT : SPRITES.PLAYER_RIGHT;
    else
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_STRAIGHT : SPRITES.PLAYER_STRAIGHT;

    Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY + bounce, -0.5, -1);
  },

  //---------------------------------------------------------------------------

  fog: function(ctx, x, y, width, height, fog) {
    if (fog < 1) {
      ctx.globalAlpha = (1-fog)
      ctx.fillStyle = COLORS.FOG;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1;
    }
  },

  rumbleWidth:     function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(6,  2*lanes); },
  laneMarkerWidth: function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(32, 8*lanes); }

}

//=============================================================================
// RACING GAME CONSTANTS
//=============================================================================

var KEY = {
  LEFT:  37,
  UP:    38,
  RIGHT: 39,
  DOWN:  40,
  A:     65,
  D:     68,
  S:     83,
  W:     87
};

var COLORS = {
  SKY:  '#2a0610',
  TREE: '#08040a',
  FOG:  '#120828',
  // sega31r+ editor: road fill rgb(50,40,69)=#322845 (was LIGHT #16122a / DARK #100e1c)
  // sega31x: roadside grass less pure-black (seal side voids vs sky)
  LIGHT:  { road: '#322845', grass: '#1a1232', rumble: '#6a3dff', lane: '#7dffef'  },
  DARK:   { road: '#322845', grass: '#140e28', rumble: '#2a1a70'                   },
  START:  { road: '#f5e6ea', grass: '#f5e6ea', rumble: '#f5e6ea'                   },
  FINISH: { road: '#050308', grass: '#050308', rumble: '#050308'                   }
};

var BACKGROUND = {
  HILLS: { x:   5, y:   5, w: 1280, h: 480 },
  SKY:   { x:   5, y: 495, w: 1280, h: 480 },
  TREES: { x:   5, y: 985, w: 1280, h: 480 }
};

var SPRITES = {
  PALM_TREE:              { x:    5, y:    5, w:  215, h:  540 },
  BILLBOARD08:            { x:  230, y:    5, w:  385, h:  265 },
  TREE1:                  { x:  625, y:    5, w:  360, h:  360 },
  DEAD_TREE1:             { x:    5, y:  555, w:  135, h:  332 },
  BILLBOARD09:            { x:  150, y:  555, w:  328, h:  282 },
  BOULDER3:               { x:  230, y:  280, w:  320, h:  220 },
  COLUMN:                 { x:  995, y:    5, w:  200, h:  315 },
  BILLBOARD01:            { x:  625, y:  375, w:  300, h:  170 },
  BILLBOARD06:            { x:  488, y:  555, w:  298, h:  190 },
  BILLBOARD05:            { x:    5, y:  897, w:  298, h:  190 },
  BILLBOARD07:            { x:  313, y:  897, w:  298, h:  190 },
  BOULDER2:               { x:  621, y:  897, w:  298, h:  140 },
  TREE2:                  { x: 1205, y:    5, w:  282, h:  295 },
  BILLBOARD04:            { x: 1205, y:  310, w:  268, h:  170 },
  DEAD_TREE2:             { x: 1205, y:  490, w:  150, h:  260 },
  BOULDER1:               { x: 1205, y:  760, w:  168, h:  248 },
  BUSH1:                  { x:    5, y: 1097, w:  240, h:  155 },
  CACTUS:                 { x:  929, y:  897, w:  235, h:  118 },
  BUSH2:                  { x:  255, y: 1097, w:  232, h:  152 },
  BILLBOARD03:            { x:    5, y: 1262, w:  230, h:  220 },
  BILLBOARD02:            { x:  245, y: 1262, w:  215, h:  220 },
  STUMP:                  { x:  995, y:  330, w:  195, h:  140 },
  SEMI:                   { x: 1365, y:  490, w:  122, h:  144 },
  TRUCK:                  { x: 1365, y:  644, w:  100, h:   78 },
  CAR03:                  { x: 1383, y:  760, w:   88, h:   55 },
  CAR02:                  { x: 1383, y:  825, w:   80, h:   59 },
  CAR04:                  { x: 1383, y:  894, w:   80, h:   57 },
  CAR01:                  { x: 1205, y: 1018, w:   80, h:   56 },
  PLAYER_UPHILL_LEFT: { x:  660, y: 1490, w: 140, h: 110 },
  PLAYER_UPHILL_STRAIGHT: { x:  500, y: 1490, w: 140, h: 110 },
  PLAYER_UPHILL_RIGHT: { x:  820, y: 1490, w: 140, h: 110 },
  PLAYER_LEFT: { x:  180, y: 1490, w: 140, h: 110 },
  PLAYER_STRAIGHT: { x:   20, y: 1490, w: 140, h: 110 },
  PLAYER_RIGHT: { x:  340, y: 1490, w: 140, h: 110 },
  BRAIN:                   { x:  980, y: 1490, w:  150, h:  150 },
  EXPLOSION:               { x: 1140, y: 1490, w:  160, h:  160 },
  LIFE:                    { x:  980, y: 1650, w:   64, h:   64 },
  CORPSE:                  { x: 1060, y: 1650, w:   96, h:   48 }
};

SPRITES.SCALE = 0.3 * (1/SPRITES.PLAYER_STRAIGHT.w) // the reference sprite width should be 1/3rd the (half-)roadWidth

SPRITES.BILLBOARDS = [SPRITES.BILLBOARD01, SPRITES.BILLBOARD02, SPRITES.BILLBOARD03, SPRITES.BILLBOARD04, SPRITES.BILLBOARD05, SPRITES.BILLBOARD06, SPRITES.BILLBOARD07, SPRITES.BILLBOARD08, SPRITES.BILLBOARD09];
SPRITES.PLANTS     = [SPRITES.TREE1, SPRITES.TREE2, SPRITES.DEAD_TREE1, SPRITES.DEAD_TREE2, SPRITES.PALM_TREE, SPRITES.BUSH1, SPRITES.BUSH2, SPRITES.CACTUS, SPRITES.STUMP, SPRITES.BOULDER1, SPRITES.BOULDER2, SPRITES.BOULDER3];
SPRITES.CARS       = [SPRITES.CAR01, SPRITES.CAR02, SPRITES.CAR03, SPRITES.CAR04, SPRITES.SEMI, SPRITES.TRUCK];

//=============================================================================
// sega24: roadside city / rubble bitmap props (separate PNGs under images/roadside/)
//=============================================================================
SPRITES.RS_LAMP      = { x: 0, y: 0, w: 96,  h: 212, roadside: "lamp", scaleMul: 1.15 };
SPRITES.RS_HYDRANT   = { x: 0, y: 0, w: 48,  h: 68,  roadside: "hydrant", scaleMul: 1.6 };
SPRITES.RS_TRASH     = { x: 0, y: 0, w: 80,  h: 80,  roadside: "trash", scaleMul: 1.45 };
SPRITES.RS_CONE      = { x: 0, y: 0, w: 60,  h: 80,  roadside: "cone", scaleMul: 1.5 };
SPRITES.RS_TREE      = { x: 0, y: 0, w: 116, h: 160, roadside: "tree", scaleMul: 1.25 };
SPRITES.RS_BARRIER   = { x: 0, y: 0, w: 152, h: 76,  roadside: "barrier", scaleMul: 1.35 };
SPRITES.RS_SIGN      = { x: 0, y: 0, w: 52,  h: 228, roadside: "sign", scaleMul: 1.1 };
SPRITES.RS_CHEST     = { x: 0, y: 0, w: 80,  h: 64,  roadside: "chest", scaleMul: 1.4 };
SPRITES.RS_BAG       = { x: 0, y: 0, w: 80,  h: 68,  roadside: "bag", scaleMul: 1.4 };
SPRITES.RS_RAILING   = { x: 0, y: 0, w: 224, h: 60,  roadside: "railing", scaleMul: 1.2 };
SPRITES.RS_LADDER    = { x: 0, y: 0, w: 64,  h: 224, roadside: "ladder", scaleMul: 1.1 };
SPRITES.RS_WALL_BIG  = { x: 0, y: 0, w: 224, h: 224, roadside: "wall_big", scaleMul: 1.05 };
SPRITES.RS_WALL_SMALL= { x: 0, y: 0, w: 128, h: 128, roadside: "wall_small", scaleMul: 1.2 };
SPRITES.RS_CRATE_G   = { x: 0, y: 0, w: 64,  h: 64,  roadside: "crate_gray", scaleMul: 1.7 };
SPRITES.RS_CRATE_B   = { x: 0, y: 0, w: 64,  h: 64,  roadside: "crate_brown", scaleMul: 1.7 };
SPRITES.RS_CRATE_D   = { x: 0, y: 0, w: 64,  h: 64,  roadside: "crate_dark", scaleMul: 1.7 };
SPRITES.RS_BLDG_A    = { x: 0, y: 0, w: 60,  h: 212, roadside: "bldg_a", scaleMul: 1.55 };
SPRITES.RS_BLDG_B    = { x: 0, y: 0, w: 52,  h: 188, roadside: "bldg_b", scaleMul: 1.55 };
SPRITES.RS_BLDG_C    = { x: 0, y: 0, w: 64,  h: 240, roadside: "bldg_c", scaleMul: 1.55 };
SPRITES.RS_BLDG_D    = { x: 0, y: 0, w: 64,  h: 260, roadside: "bldg_d", scaleMul: 1.55 };
SPRITES.RS_BLDG_E    = { x: 0, y: 0, w: 60,  h: 200, roadside: "bldg_e", scaleMul: 1.55 };
SPRITES.RS_BLDG_F    = { x: 0, y: 0, w: 64,  h: 220, roadside: "bldg_f", scaleMul: 1.55 };
SPRITES.RS_BLDG_G    = { x: 0, y: 0, w: 60,  h: 276, roadside: "bldg_g", scaleMul: 1.55 };
SPRITES.RS_BLDG_H    = { x: 0, y: 0, w: 56,  h: 176, roadside: "bldg_h", scaleMul: 1.55 };
SPRITES.RS_BLDG_J    = { x: 0, y: 0, w: 56,  h: 200, roadside: "bldg_j", scaleMul: 1.55 };
SPRITES.RS_BLDG_K    = { x: 0, y: 0, w: 72,  h: 172, roadside: "bldg_k", scaleMul: 1.55 };
SPRITES.RS_BLDG_L    = { x: 0, y: 0, w: 56,  h: 220, roadside: "bldg_l", scaleMul: 1.55 };
SPRITES.RS_BLDG_M    = { x: 0, y: 0, w: 72,  h: 164, roadside: "bldg_m", scaleMul: 1.55 };
SPRITES.RS_BLDG_N    = { x: 0, y: 0, w: 88,  h: 260, roadside: "bldg_n", scaleMul: 1.5 };
SPRITES.RS_RUIN_2    = { x: 0, y: 0, w: 96,  h: 128, roadside: "ruin_2", scaleMul: 1.35 };
SPRITES.RS_RUIN_3    = { x: 0, y: 0, w: 56,  h: 128, roadside: "ruin_3", scaleMul: 1.45 };
SPRITES.RS_RUBBLE_A  = { x: 0, y: 0, w: 120, h: 76,  roadside: "rubble_cloud_a", scaleMul: 1.5 };
SPRITES.RS_RUBBLE_B  = { x: 0, y: 0, w: 68,  h: 76,  roadside: "rubble_cloud_b", scaleMul: 1.5 };
SPRITES.RS_RUBBLE_C  = { x: 0, y: 0, w: 60,  h: 52,  roadside: "rubble_cloud_c", scaleMul: 1.5 };
SPRITES.RS_GOP_SIGN  = { x: 0, y: 0, w: 84,  h: 159, roadside: "gop_sign", scaleMul: 1.25 };
SPRITES.RS_GOP_SIGN2 = { x: 0, y: 0, w: 84,  h: 156, roadside: "gop_sign2", scaleMul: 1.25 };
// sega54: on-road dead bodies (roadbodies54.js; flatKey = squashed variant after the splat)
SPRITES.RS_BODY_A      = { x: 0, y: 0, w: 160, h: 72, roadside: "body_a", scaleMul: 1.25, flatKey: "RS_BODY_A_FLAT" };
SPRITES.RS_BODY_B      = { x: 0, y: 0, w: 160, h: 72, roadside: "body_b", scaleMul: 1.25, flatKey: "RS_BODY_B_FLAT" };
SPRITES.RS_BODY_C      = { x: 0, y: 0, w: 160, h: 72, roadside: "body_c", scaleMul: 1.25, flatKey: "RS_BODY_C_FLAT" };
SPRITES.RS_BODY_A_FLAT = { x: 0, y: 0, w: 160, h: 72, roadside: "body_a_flat", scaleMul: 1.25 };
SPRITES.RS_BODY_B_FLAT = { x: 0, y: 0, w: 160, h: 72, roadside: "body_b_flat", scaleMul: 1.25 };
SPRITES.RS_BODY_C_FLAT = { x: 0, y: 0, w: 160, h: 72, roadside: "body_c_flat", scaleMul: 1.25 };
// sega54: Greenbelt night roadside pool (chorus1 59-81.5, roadbodies54.js)
SPRITES.RS_GB_ASHE_CEDAR   = { x: 0, y: 0, w: 104, h: 184, roadside: "gb_ashe_cedar", scaleMul: 1.35 };
SPRITES.RS_GB_LIVE_OAK     = { x: 0, y: 0, w: 160, h: 160, roadside: "gb_live_oak_night", scaleMul: 1.35 };
SPRITES.RS_GB_BOULDER      = { x: 0, y: 0, w: 120, h: 80,  roadside: "gb_limestone_boulder", scaleMul: 1.35 };
SPRITES.RS_GB_PRICKLY_PEAR = { x: 0, y: 0, w: 96,  h: 104, roadside: "gb_prickly_pear", scaleMul: 1.35 };
SPRITES.RS_GB_CREEK_ROCKS  = { x: 0, y: 0, w: 144, h: 56,  roadside: "gb_creek_rocks", scaleMul: 1.35 };
SPRITES.RS_GB_AGAVE        = { x: 0, y: 0, w: 104, h: 80,  roadside: "gb_agave", scaleMul: 1.35 };

SPRITES.CITY_STREET = [
  SPRITES.RS_LAMP, SPRITES.RS_HYDRANT, SPRITES.RS_TRASH, SPRITES.RS_CONE,
  SPRITES.RS_TREE, SPRITES.RS_BARRIER, SPRITES.RS_SIGN, SPRITES.RS_CHEST,
  SPRITES.RS_BAG, SPRITES.RS_RAILING, SPRITES.RS_GOP_SIGN, SPRITES.RS_GOP_SIGN2
];
SPRITES.CITY_BUILDINGS = [
  SPRITES.RS_BLDG_A, SPRITES.RS_BLDG_B, SPRITES.RS_BLDG_C, SPRITES.RS_BLDG_D,
  SPRITES.RS_BLDG_E, SPRITES.RS_BLDG_F, SPRITES.RS_BLDG_G, SPRITES.RS_BLDG_H,
  SPRITES.RS_BLDG_J, SPRITES.RS_BLDG_K, SPRITES.RS_BLDG_L,
  SPRITES.RS_BLDG_M, SPRITES.RS_BLDG_N
];
SPRITES.CITY_INDUSTRIAL = [
  SPRITES.RS_CRATE_G, SPRITES.RS_CRATE_B, SPRITES.RS_CRATE_D,
  SPRITES.RS_BARRIER, SPRITES.RS_WALL_BIG, SPRITES.RS_LADDER, SPRITES.RS_BAG, SPRITES.RS_CONE
];
// chorus1 rubble — OutRun boulders/stumps + ruin/brick bitmaps (NOT procedural)
SPRITES.RUBBLE = [
  SPRITES.BOULDER1, SPRITES.BOULDER2, SPRITES.BOULDER3, SPRITES.STUMP,
  SPRITES.RS_WALL_BIG, SPRITES.RS_WALL_SMALL, SPRITES.RS_RUIN_2, SPRITES.RS_RUIN_3,
  SPRITES.RS_RUBBLE_A, SPRITES.RS_RUBBLE_B, SPRITES.RS_RUBBLE_C
];

// sega24: exactly ONE prop type per song section (sparse). No multi-mix, no procedural, no hue-rotate.
SPRITES.SECTION_ROADSIDE = {
  tutorial: [SPRITES.RS_LAMP],       // lamp posts
  verse1:   [SPRITES.RS_TRASH],      // sega27 editor: trash
  holding:  [SPRITES.RS_SIGN],       // street signs
  chorus1:  [SPRITES.BOULDER1],      // rubble level — single boulder
  bridge:   [SPRITES.RS_BLDG_A],     // buildings
  verse2:   [SPRITES.RS_TRASH],      // trash cans
  applause: [SPRITES.RS_TREE],       // trees
  diamond2: [SPRITES.RS_CRATE_G],    // crates
  chorus2:  [],                     // sega45: bldg_i ditched — no roadside buildings in chorus2
  finale:   [SPRITES.RS_BLDG_N]      // landmark building
};
// Human-readable labels for script editor "roadside" column
SPRITES.SECTION_ROADSIDE_LABEL = {
  tutorial: "lamp",
  verse1:   "trash",
  holding:  "sign",
  chorus1:  "boulder",
  bridge:   "building",
  verse2:   "trash",
  applause: "tree",
  diamond2: "crate",
  chorus2:  "none",
  finale:   "landmark"
};

SPRITES.ROADSIDE_IMAGE_NAMES = [
  "roadside/lamp", "roadside/hydrant", "roadside/trash", "roadside/cone", "roadside/tree",
  "roadside/barrier", "roadside/sign", "roadside/chest", "roadside/bag", "roadside/railing",
  "roadside/ladder", "roadside/wall_big", "roadside/wall_small",
  "roadside/crate_gray", "roadside/crate_brown", "roadside/crate_dark",
  "roadside/bldg_a", "roadside/bldg_b", "roadside/bldg_c", "roadside/bldg_d",
  "roadside/bldg_e", "roadside/bldg_f", "roadside/bldg_g", "roadside/bldg_h",
  "roadside/bldg_j", "roadside/bldg_k", "roadside/bldg_l",
  "roadside/bldg_m", "roadside/bldg_n",
  "roadside/ruin_2", "roadside/ruin_3",
  "roadside/rubble_cloud_a", "roadside/rubble_cloud_b", "roadside/rubble_cloud_c",
  "roadside/gop_sign", "roadside/gop_sign2",
  // sega54: on-road bodies (+ flattened) and Greenbelt night roadside pool (roadbodies54.js)
  "roadside/body_a", "roadside/body_b", "roadside/body_c",
  "roadside/body_a_flat", "roadside/body_b_flat", "roadside/body_c_flat",
  "roadside/gb_ashe_cedar", "roadside/gb_live_oak_night", "roadside/gb_limestone_boulder",
  "roadside/gb_prickly_pear", "roadside/gb_creek_rocks", "roadside/gb_agave"
];

function bindRoadsideImages(imagesByPath) {
  var key, spr, path;
  for (key in SPRITES) {
    if (!SPRITES.hasOwnProperty(key)) continue;
    spr = SPRITES[key];
    if (!spr || !spr.roadside) continue;
    path = "roadside/" + spr.roadside;
    if (imagesByPath[path]) {
      spr.img = imagesByPath[path];
      if (spr.img.naturalWidth) {
        spr.w = spr.img.naturalWidth;
        spr.h = spr.img.naturalHeight;
      }
    }
  }
}
