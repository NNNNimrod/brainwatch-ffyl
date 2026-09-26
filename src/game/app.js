(function(ns) {
  function createKeyBindings(state) {
    var bindings = [];
    var map = ns.KEYMAP;

    bindings.push({
      keys: map.left,
      mode: "up",
      action: function() {
        ns.Gameplay.setLane(state, 0);
      }
    });

    bindings.push({
      keys: map.right,
      mode: "up",
      action: function() {
        ns.Gameplay.setLane(state, 1);
      }
    });

    bindings.push({
      keys: map.pause,
      mode: "up",
      action: function() {
        ns.Gameplay.togglePause(state);
      }
    });

    bindings.push({
      keys: map.restart,
      mode: "up",
      action: function() {
        ns.Gameplay.restartRun(state);
      }
    });

    bindings.push({
      keys: map.start,
      mode: "up",
      action: function() {
        if (state.phase === "paused") {
          ns.Gameplay.togglePause(state);
          return;
        }
        if (state.phase === "gameover") {
          if (ns.Gameplay.returnToMenu) {
            ns.Gameplay.returnToMenu(state);
          }
          return;
        }
        if (state.phase === "menu") {
          ns.Gameplay.startRun(state);
        }
      }
    });

    return bindings;
  }

  function bootstrap() {
    var canvas = Dom.get("canvas");
    var state = ns.State.createState(canvas);
    try { window.__ffylState = state; } catch (eEarly) {}
    // sega43: fast single-strip Austin plates (chorus1 violet / verse1 dusk) ride the CRITICAL set
    var bootCfg = state.config || ns.CONFIG || {};
    var fastCritKeys = (bootCfg.austinBgFastStrips !== false && bootCfg.austinBgUseAustinNewPlates !== false)
      ? (bootCfg.austinBgFastStripCritical || ["dusk", "violet"]).slice() : [];
    var fastCritNames = fastCritKeys.map(function(k) { return "bg-austin-new/fast/background-" + k + ".jpg"; });

    ns.Track.resetRoad(state);
    ns.Traffic.resetTraffic(state);
    if (ns.Brains && ns.Brains.reset) {
      ns.Brains.reset(state);
    }
    if (ns.CyberFlies && ns.CyberFlies.reset) {
      ns.CyberFlies.reset(state);
    }
    if (ns.Sections && ns.Sections.reset) {
      ns.Sections.reset(state);
    }
    ns.UI.create(state);

    // sega25: arm short menu loop immediately (muted autoplay; unmute on gesture)
    if (ns.Gameplay && ns.Gameplay.armTitleMenuMusic) {
      ns.Gameplay.armTitleMenuMusic(state);
    }

    window.addEventListener("blur", function() {
      if (state.phase === "running" && !(ns.Gameplay.finaleFreezesDriving && ns.Gameplay.finaleFreezesDriving(state))) {
        ns.Gameplay.togglePause(state);
      }
      ns.State.clearInputFlags(state);
    });

    // sega44: pre-Start CRITICAL set = only the first ~15s of play:
    //   sprites atlas (player / brains / cars), purple heart, roadside + party props (tiny),
    //   verse1 dusk strip JPEG. Title logo is an <img> in the page. Music streams (attached at ready).
    // Everything else loads AFTER ready via LazyAssets in song-time order, a few at a time.
    //   sprites-core.png = the SAME atlas (same size/coords, identical pixels) with only the player
    //   poses, brain, explosion, heart/corpse and traffic cars kept (241KB vs 1.6MB); the full atlas
    //   (roadside billboards/trees/boulders) is lazy prio 2 and swaps in the moment it lands.
    var criticalNames = [(bootCfg.criticalSpritesCore === false ? "sprites" : "sprites-core"), "heart.pre-sega17"].concat(fastCritNames)
      .concat(SPRITES.ROADSIDE_IMAGE_NAMES || [])
      .concat((ns.Sega31 && ns.Sega31.partySpriteList ? ns.Sega31.partySpriteList() : []));
    var IDX_SPRITES = 0, IDX_HEART = 1, IDX_STRIPS = 2;
    var IDX_ROADSIDE = IDX_STRIPS + fastCritNames.length;
    var nowMs = (window.performance && performance.now) ? performance.now() : 0;
    var deadlineMs = bootCfg.criticalDeadlineMs != null ? bootCfg.criticalDeadlineMs : 7500;
    var criticalTimeoutMs = Math.max(1500, deadlineMs - nowMs); // measured from page navigation start
    state._loadFrac = 0;
    state._loadT0 = nowMs;
    state._loadDeadline = nowMs + criticalTimeoutMs;
    state._loadPct = 0;
    var loadUiTimer = setInterval(function() {
      if (state.assetsReady) { clearInterval(loadUiTimer); return; }
      var tNow = (window.performance && performance.now) ? performance.now() : 0;
      var timeFrac = Math.max(0, Math.min(1, (tNow - state._loadT0) / Math.max(1, state._loadDeadline - state._loadT0)));
      var pct = Math.floor(100 * Math.max(state._loadFrac || 0, timeFrac));
      state._loadPct = Math.max(state._loadPct || 0, Math.min(99, pct));
      state._loadTick = (state._loadTick || 0) + 1;
      if (ns.UI && ns.UI.onLoadProgress) { try { ns.UI.onLoadProgress(state); } catch (eLp) {} }
    }, 200);

    function bindCriticalImages(images) {
      // full atlas wins once it is in; else the core atlas (truthy even while loading)
      state.sprites = (state._spritesFull && state._spritesFull.width > 0) ? state._spritesFull : images[IDX_SPRITES];
      // sega30: purple heart.pre-sega17.png on SPRITES.LIFE (never atlas / red heart-sega17)
      var heart = images[IDX_HEART];
      if (heart && SPRITES.LIFE) {
        SPRITES.LIFE.img = heart;
        SPRITES.LIFE.x = 0;
        SPRITES.LIFE.y = 0;
        SPRITES.LIFE.w = heart.width || 128;
        SPRITES.LIFE.h = heart.height || 128;
      }
      // sega43: critical fast strips
      var k;
      for (k = 0; k < fastCritKeys.length; k++) {
        var im = images[IDX_STRIPS + k];
        if (im && im.width > 0) {
          im._austinStrip = true;
          im._austinKey = fastCritKeys[k];
          state.austinStrips[fastCritKeys[k]] = im;
          state._austinNewPlatesReady[fastCritKeys[k]] = "fast-critical";
        }
      }
      // sega24: bind roadside city/rubble PNGs onto SPRITES.*.img
      var byPath = {};
      var names = SPRITES.ROADSIDE_IMAGE_NAMES || [];
      var ri;
      for (ri = 0; ri < names.length; ri++) {
        byPath[names[ri]] = images[IDX_ROADSIDE + ri];
      }
      var extraStart = IDX_ROADSIDE + names.length;
      var party = (ns.Sega31 && ns.Sega31.partySpriteList) ? ns.Sega31.partySpriteList() : [];
      for (ri = 0; ri < party.length; ri++) {
        byPath[party[ri]] = images[extraStart + ri];
        byPath["images/" + party[ri]] = images[extraStart + ri];
        byPath[party[ri] + ".png"] = images[extraStart + ri];
        byPath["images/" + party[ri] + ".png"] = images[extraStart + ri];
      }
      if (typeof bindRoadsideImages === "function") {
        bindRoadsideImages(byPath);
      }
      // sega44: only loaded party sprites (their w/h are read once at spawn)
      state.partyImages = {};
      for (ri = 0; ri < party.length; ri++) {
        var pim = byPath[party[ri]];
        if (pim && pim.width > 0) state.partyImages[party[ri]] = pim;
      }
    }

    // sega44: deferred plate/art objects exist up front (truthy, width 0 until loaded) so every
    // state slot is valid from frame 1; renderer falls back to sky gradient / nearest loaded strip.
    function deferredImg(prio, path, onload) {
      return LazyAssets.add(prio, path, null, {
        onload: onload,
        stallMs: 20000
      });
    }

    Game.run({
      canvas: canvas,
      update: function(dt) { ns.Gameplay.update(state, dt); },
      render: function() {
        ns.Renderer.render(state);
        ns.UI.render(state);
      },
      step: state.step,
      stats: ns.State.createNoopStats(),
      images: criticalNames,
      criticalTimeoutMs: criticalTimeoutMs,
      criticalConcurrency: 4,
      keys: createKeyBindings(state),
      progress: function(frac) { state._loadFrac = frac; },
      complete: function(images) {
        // sega44: all critical settled (maybe after the safety unlock) — rebind real sizes, then lazy
        if (state._criticalTimedOut) {
          try { bindCriticalImages(images); } catch (eRb) { console.warn(eRb); }
        }
        state._criticalComplete = true;
        LazyAssets.start();
      },
      ready: function(images, timedOut) {
        state._criticalTimedOut = !!timedOut;
        state.austinStrips = {};
        state._austinNewPlatesReady = state._austinNewPlatesReady || {};
        state.backgroundPlates = {};
        state.backgroundPlatesPostnuke = { dusk: null, ember: null, night: null, violet: null, storm: null, acid: null };
        state.endingImages = {};
        bindCriticalImages(images);
        var cfg = state.config || (ns.CONFIG) || {};

        // ---- LAZY queue, ordered by song time (prio ≈ seconds into the song) ----
        // full sprite atlas first (roadside props from the atlas; core already has player/brains/cars)
        if (criticalNames[IDX_SPRITES] !== "sprites") {
          state._spritesFull = deferredImg(2, "images/sprites.png", function(img) {
            if (img.width > 0) state.sprites = img;
          });
        }
        // cybercab packs (tiny; traffic)
        (function loadCybercabsLazy() {
          var cols = ["goldfinch","red","silver","blue","white","black"];
          var cars = ["car01","car02","car03","car04"];
          var names = [];
          var i, j;
          for (i = 0; i < cars.length; i++) for (j = 0; j < cols.length; j++) names.push("cybercab-prebake/" + cars[i] + "-" + cols[j]);
          for (i = 0; i < cars.length; i++) for (j = 0; j < cols.length; j++) names.push("cybercab-pixel/" + cars[i] + "-" + cols[j]);
          Game.loadImages(names, function(cabImgs) {
            var cabPath = {};
            var k, rel, full;
            for (k = 0; k < names.length; k++) {
              if (!(cabImgs[k] && cabImgs[k].width > 0)) continue; // failed → atlas cars
              rel = names[k];
              full = "images/" + rel;
              cabPath[rel] = cabImgs[k];
              cabPath[full] = cabImgs[k];
              cabPath[rel + ".png"] = cabImgs[k];
              cabPath[full + ".png"] = cabImgs[k];
            }
            if (ns.Sega31 && ns.Sega31.bindCybercabPrebakes) {
              ns.Sega31.bindCybercabPrebakes(cabPath);
            }
            state._cybercabReady = true;
          }, { lazyPrio: 5 });
        })();

        // sega43 fast single-strip Austin plates: rotation order ember(40) violet(59) storm(90) acid(111) night
        (function queueStrips() {
          if (cfg.austinBgFastStrips === false || cfg.austinBgUseAustinNewPlates === false) return;
          var order = [["dusk", 1], ["ember", 40], ["violet", 59], ["storm", 90], ["acid", 111], ["night", 140]];
          order.forEach(function(p) {
            var key = p[0];
            if (state.austinStrips[key] || fastCritKeys.indexOf(key) >= 0) return;
            deferredImg(p[1], "images/bg-austin-new/fast/background-" + key + ".jpg", function(img) {
              if (!(img.width > 0)) return;
              img._austinStrip = true;
              img._austinKey = key;
              state.austinStrips[key] = img;
              state._austinNewPlatesReady[key] = "fast";
            });
          });
        })();

        // tunnel entrance + interior frames (sega31x binds them; preload here in order)
        if (ns.Sega31x && ns.Sega31x.preloadTunnelImages) {
          try { ns.Sega31x.preloadTunnelImages(state, 85); } catch (eTu) {}
        }

        // small post-nuke plates (postapoc / winter)
        [["postapoc-dayglow", "background-postapoc-dayglow"], ["nuclear-winter", "background-nuclear-winter"]].forEach(function(p) {
          deferredImg(150, "images/" + p[1] + ".png", function(img) { state.backgroundPlates[p[0]] = img; });
        });

        // sega43: Sega nuke art (sky + mushroom)
        if (cfg.nukeSegaEnabled !== false) {
          state._nukeSegaImgs = state._nukeSegaImgs || {};
          [["sky", cfg.nukeSegaSky || "images/fx/nuke-sega-sky.png"],
           ["mush", cfg.nukeSegaMushroom || "images/fx/nuke-sega-mushroom.png"]].forEach(function(p) {
            deferredImg(155, p[1], function(img) { if (img.width > 0) state._nukeSegaImgs[p[0]] = img; });
          });
        }

        // post-nuke dusk animation frames (renderer ensureFxSequence slots "postnuke0..N")
        (function queuePostnukeAnim() {
          var nAnim = cfg.postNukeAnimFrames != null ? cfg.postNukeAnimFrames : 4;
          if (!(nAnim > 1)) return;
          state._fxImgs = state._fxImgs || {};
          state._postNukeAnimPaths = [];
          var pi;
          for (pi = 1; pi <= nAnim; pi++) {
            var path = "images/bg-layered/anim/dusk-postnuke-f" + pi + ".png";
            state._postNukeAnimPaths.push(path);
            (function(key) {
              if (state._fxImgs[key]) return;
              var slot = deferredImg(157, path, null);
              slot._failed = false;
              state._fxImgs[key] = slot;
            })("postnuke" + (pi - 1));
          }
        })();

        // sega41: post-nuke plates (~10MB) — dusk first
        ["dusk", "ember", "night", "violet", "storm", "acid"].forEach(function(key, ix) {
          deferredImg(ix === 0 ? 159 : 185, "images/bg-layered/background-" + key + "-postnuke.png", function(img) {
            if (state.backgroundPlatesPostnuke && img.width > 0) state.backgroundPlatesPostnuke[key] = img;
          });
        });

        // older nuke plate (fallback only when Sega nuke art is missing)
        state.nukeBg = deferredImg(170, "images/nuke-bg.png", null);

        // finale storyboard art
        ["power", "scream", "fight"].forEach(function(key) {
          state.endingImages[key] = deferredImg(190, "images/ending/" + key + ".png", null);
        });

        // older atlas plates — fallback only (real Austin strips win); last
        state.background = deferredImg(200, "images/background.png", function(img) { state.backgroundPlates.dusk = img; });
        state.backgroundNight = deferredImg(201, "images/background-night.png", function(img) { state.backgroundPlates.night = img; });
        [["ember", 202], ["storm", 203], ["violet", 204], ["acid", 205], ["filmic", 210], ["racer", 211]].forEach(function(p) {
          deferredImg(p[1], "images/background-" + p[0] + ".png", function(img) { state.backgroundPlates[p[0]] = img; });
        });

        // sega41 (sega43: opt-in only) — heavy 3.6MB PNG sheets
        if (cfg.austinBgUseAustinNewPlates !== false && cfg.austinBgLoadFullPngSheets === true) {
          ["dusk", "night", "ember", "storm", "violet", "acid"].forEach(function(key) {
            deferredImg(220, "images/bg-austin-new/background-" + key + ".png", function(img) {
              if (!(img.width > 0)) return;
              img._austinNewSheet = true;
              img._austinKey = key;
              if (!state.austinStrips[key] || !state.austinStrips[key]._austinStrip) state.austinStrips[key] = img;
              state._austinNewPlatesReady[key] = state._austinNewPlatesReady[key] || "png";
            });
          });
        }
        if (!timedOut) LazyAssets.start(); // else starts when the critical set completes
        else setTimeout(function() { LazyAssets.start(); }, 20000); // never wait forever on a stuck file

        // sega42: mark assets ready + flush pending Start (blank-screen race fix)
        state.assetsReady = true;
        state._assetsReadyAt = (window.performance && performance.now) ? performance.now() : 0;
        try { clearInterval(loadUiTimer); } catch (eCl) {}
        try { window.__ffylState = state; } catch (eSt) {}
        if (ns.UI && typeof ns.UI.onAssetsReady === "function") {
          try { ns.UI.onAssetsReady(state); } catch (eReady) { console.warn(eReady); }
        } else if (state._pendingStart && state.tokenInserted) {
          state._pendingStart = false;
          try { ns.Gameplay.startRun(state); } catch (ePS) {}
        }
      }
    });

    // sega44: music buffering chip while a run waits on the stream (song clock = audio clock → in sync)
    setInterval(function() {
      var chip = document.getElementById("musicBuffering");
      var m = document.getElementById("music");
      if (!chip || !m) return;
      var live = state.phase === "running" || state.phase === "countdown";
      var buffering = live && !m.ended && m.readyState < 3 && (state.runElapsedSinceStart || 0) > 0.4;
      if (buffering) {
        state._bufDots = ((state._bufDots || 0) + 1) % 4;
        chip.textContent = "BUFFERING MUSIC" + ".".repeat(state._bufDots);
        chip.classList.remove("hidden");
      } else if (!chip.classList.contains("hidden")) {
        chip.classList.add("hidden");
      }
    }, 250);
  }

  bootstrap();
})(window.ApexRacer = window.ApexRacer || {});
