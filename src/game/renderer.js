(function(ns) {
  function remapPsychStyle(state, style) {
    var c = state.config || {};
    if (c.psychSegaStyle === false) return style;
    var map = {
      neonBlood: c.psychRemapNeonBlood || 'outrunCheck',
      acidRain: c.psychRemapAcidRain || 'afterBurnerClouds',
      diamondVoid: c.psychRemapDiamondVoid || 'harrierCheck',
      laneFreak: c.psychRemapLaneFreak || 'hangOnRush',
      chromeStrobe: c.psychRemapChromeStrobe || 'outrunSun',
      voidPulse: c.psychRemapVoidPulse || 'outrunSun'
    };
    return map[style] || style;
  }

  function drawSegaPsychStyle(ctx, width, height, phase, style, intensity) {
    var i, x, y, row, col, cell, cx, cy, r;
    var palette = true; // psychSegaPalette
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(1, intensity * 1.15);
    if (style === 'outrunCheck') {
      // OutRun checker floor + magenta/cyan sky bands
      ctx.fillStyle = '#1a0033';
      ctx.fillRect(0, 0, width, height);
      var horizon = height * 0.42;
      for (i = 0; i < 14; i++) {
        ctx.fillStyle = (i % 2) ? '#ff00aa' : '#00e5ff';
        ctx.globalAlpha = 0.35 * intensity;
        ctx.fillRect(0, i * (horizon / 14), width, horizon / 14 + 1);
      }
      ctx.globalAlpha = Math.min(1, intensity);
      // perspective checker
      for (row = 0; row < 16; row++) {
        var z = row / 16;
        var y0 = horizon + Math.pow(z, 1.6) * (height - horizon);
        var y1 = horizon + Math.pow((row + 1) / 16, 1.6) * (height - horizon);
        var cols = 8 + Math.floor(z * 10);
        var shift = Math.floor(phase * 40 + row * 3) % 2;
        for (col = 0; col < cols; col++) {
          ctx.fillStyle = ((col + shift) % 2) ? '#ff2ec4' : '#1a0a20';
          ctx.fillRect((col / cols) * width, y0, width / cols + 1, Math.max(1, y1 - y0));
        }
      }
    } else if (style === 'outrunSun') {
      ctx.fillStyle = '#0a0018';
      ctx.fillRect(0, 0, width, height);
      // striped sun
      cx = width * 0.5; cy = height * 0.38; r = Math.min(width, height) * 0.22;
      for (i = 0; i < 12; i++) {
        ctx.fillStyle = (i % 2) ? '#ff44cc' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(cx, cy, r - i * (r / 12), 0, Math.PI * 2);
        ctx.fill();
      }
      // horizon bands
      for (i = 0; i < 10; i++) {
        ctx.fillStyle = (i % 2) ? 'rgba(255,0,200,0.35)' : 'rgba(0,255,230,0.25)';
        y = height * 0.5 + i * 10 + (phase * 30) % 20;
        ctx.fillRect(0, y, width, 6);
      }
    } else if (style === 'afterBurnerClouds') {
      ctx.fillStyle = '#041428';
      ctx.fillRect(0, 0, width, height);
      // altitude bands
      for (i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(40,80,160,0.35)' : 'rgba(10,30,70,0.5)';
        ctx.fillRect(0, (i / 8) * height, width, height / 8 + 1);
      }
      // hard-edge cloud puffs scrolling
      for (i = 0; i < 18; i++) {
        x = ((i * 97) + phase * 90) % (width + 80) - 40;
        y = ((i * 53) + Math.sin(phase + i) * 20) % (height * 0.7);
        ctx.fillStyle = (i % 3) ? '#d0e8ff' : '#ffffff';
        ctx.fillRect(x, y, 36 + (i % 5) * 8, 14 + (i % 3) * 6);
        ctx.fillRect(x + 10, y - 8, 24, 10);
      }
    } else if (style === 'harrierCheck') {
      ctx.fillStyle = '#100018';
      ctx.fillRect(0, 0, width, height);
      // checker tunnel into vanishing point
      cx = width * 0.5; cy = height * 0.48;
      for (i = 16; i >= 1; i--) {
        var s = i / 16;
        var w = width * s * 0.95;
        var h = height * s * 0.85;
        ctx.strokeStyle = (i % 2) ? '#ff66cc' : '#44ffaa';
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
        // floating platform silhouettes
        if (i % 3 === 0) {
          ctx.fillStyle = '#2a1040';
          ctx.fillRect(cx - w * 0.35, cy + h * 0.15, w * 0.25, h * 0.06);
          ctx.fillRect(cx + w * 0.1, cy - h * 0.2, w * 0.22, h * 0.05);
        }
      }
    } else if (style === 'hangOnRush') {
      ctx.fillStyle = '#120006';
      ctx.fillRect(0, 0, width, height);
      // roadside stripe rush
      for (i = 0; i < 24; i++) {
        y = ((i / 24) * height + phase * 180) % height;
        ctx.fillStyle = (i % 2) ? '#ff2030' : '#ffffff';
        ctx.fillRect(0, y, width * 0.12, height / 30);
        ctx.fillRect(width * 0.88, y, width * 0.12, height / 30);
      }
      // center dash rush
      for (i = 0; i < 16; i++) {
        y = ((i / 16) * height + phase * 220) % height;
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(width * 0.47, y, width * 0.06, height / 40);
      }
    } else {
      ctx.restore();
      return false;
    }
    // optional coarse dither overlay for Sega palette feel
    ctx.globalAlpha = 0.12 * intensity;
    ctx.fillStyle = '#000';
    for (i = 0; i < 60; i++) {
      x = (i * 47 + Math.floor(phase * 10)) % width;
      y = (i * 31) % height;
      if ((x + y) % 2 === 0) ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
    return true;
  }

  function drawPsychBackground(state) {
    var ctx = state.ctx;
    var width = state.width;
    var height = state.height;
    var phase = state.psychPhase || 0;
    var intensity = 1 - (state.worldFade == null ? 1 : state.worldFade);
    var style = remapPsychStyle(state, state.psychStyle || "neonBlood");
    var i, x, y, r, g, band;
    if (intensity <= 0.01) { return; }

    // sega31z: Sega arcade psych pack
    if (drawSegaPsychStyle(ctx, width, height, phase, style, intensity)) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1, intensity * 1.15);

    if (style === "diamondVoid") {
      ctx.fillStyle = "#020816";
      ctx.fillRect(0, 0, width, height);
      for (i = 0; i < 6; i++) {
        x = width * (0.5 + 0.35 * Math.sin(phase * 0.4 + i * 1.1));
        y = height * (0.35 + 0.2 * Math.cos(phase * 0.55 + i));
        r = 70 + i * 45;
        g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(255, 220, 90, 0.5)");
        g.addColorStop(0.4, "rgba(80, 180, 255, 0.22)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 230, 120, 0.22)";
      ctx.lineWidth = 3;
      for (i = 0; i < 12; i++) {
        x = (i / 12) * width + (phase * 40) % (width / 12);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 30 * Math.sin(phase + i), height);
        ctx.stroke();
      }
      ctx.translate(width / 2, height * 0.42);
      ctx.rotate(phase * 0.2);
      for (i = 0; i < 5; i++) {
        r = 50 + i * 55 + 12 * Math.sin(phase * 2 + i);
        ctx.strokeStyle = i % 2 ? "rgba(255,210,80,0.28)" : "rgba(120,220,255,0.2)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.7, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.7, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.rotate(0.45);
      }
    } else if (style === "laneFreak") {
      ctx.fillStyle = "#120006";
      ctx.fillRect(0, 0, width, height);
      if (Math.sin(phase * 8) > 0.35) {
        ctx.globalAlpha = Math.min(1, intensity * 0.85);
        ctx.fillStyle = "rgba(255, 20, 60, 0.18)";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = Math.min(1, intensity * 1.15);
      for (i = 0; i < 9; i++) {
        y = ((i / 9) * height + phase * 120) % height;
        ctx.fillStyle = i % 2 ? "rgba(255, 40, 80, 0.12)" : "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(0, y, width, height / 18);
      }
      ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < 5; i++) {
        x = width * (0.2 + 0.15 * i) + 40 * Math.sin(phase * 3 + i);
        g = ctx.createLinearGradient(x, 0, x, height);
        g.addColorStop(0, "rgba(255,80,120,0)");
        g.addColorStop(0.5, "rgba(255,30,90,0.45)");
        g.addColorStop(1, "rgba(255,80,120,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 18, 0, 36, height);
      }
      ctx.translate(width / 2, height * 0.55);
      ctx.rotate(-phase * 1.1);
      for (i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = i % 2 ? "rgba(255, 200, 40, 0.14)" : "rgba(255, 0, 80, 0.16)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 220 + 40 * Math.sin(phase * 4 + i), -0.2, 0.2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (style === "acidRain") {
      ctx.fillStyle = "#041208";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < 40; i++) {
        x = ((i * 97) + phase * 180) % width;
        y = ((i * 53) + phase * 260) % height;
        ctx.strokeStyle = i % 2 ? "rgba(180,255,40,0.35)" : "rgba(40,255,160,0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 28);
        ctx.stroke();
      }
      for (i = 0; i < 5; i++) {
        y = ((i / 5) * height + phase * 90) % height;
        g = ctx.createLinearGradient(0, y, width, y + 40);
        g.addColorStop(0, "rgba(80,255,60,0)");
        g.addColorStop(0.5, "rgba(120,255,40,0.18)");
        g.addColorStop(1, "rgba(80,255,60,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, width, 36);
      }
    } else if (style === "chromeStrobe") {
      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, width, height);
      band = (Math.sin(phase * 14) > 0.55);
      if (band) {
        ctx.fillStyle = "rgba(220,230,255,0.2)";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < 8; i++) {
        x = width * (i / 8) + 20 * Math.sin(phase * 5 + i);
        g = ctx.createLinearGradient(x, 0, x + 24, height);
        g.addColorStop(0, "rgba(200,220,255,0)");
        g.addColorStop(0.5, "rgba(180,200,255,0.4)");
        g.addColorStop(1, "rgba(200,220,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 20, height);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      for (i = 0; i < 6; i++) {
        y = height * (0.2 + i * 0.12) + 10 * Math.sin(phase * 3 + i);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y + 8 * Math.sin(phase + i));
        ctx.stroke();
      }
    } else if (style === "voidPulse") {
      ctx.fillStyle = "#000008";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      r = 80 + 120 * (0.5 + 0.5 * Math.sin(phase * 2.2));
      g = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, r * 2.2);
      g.addColorStop(0, "rgba(160,80,255,0.55)");
      g.addColorStop(0.45, "rgba(40,0,80,0.3)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.45, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      for (i = 0; i < 4; i++) {
        ctx.strokeStyle = "rgba(200,120,255," + (0.2 + 0.1 * i) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.45, r * (0.4 + i * 0.35), 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#050010";
      ctx.fillRect(0, 0, width, height);
      for (i = 0; i < 7; i++) {
        x = width * (0.5 + 0.42 * Math.sin(phase * (0.7 + i * 0.13) + i));
        y = height * (0.45 + 0.38 * Math.cos(phase * (0.55 + i * 0.11) + i * 1.7));
        r = 90 + i * 38 + 30 * Math.sin(phase * 1.4 + i);
        g = ctx.createRadialGradient(x, y, 0, x, y, r);
        if (i % 3 === 0) {
          g.addColorStop(0, "rgba(255, 40, 200, 0.55)");
          g.addColorStop(0.55, "rgba(120, 0, 180, 0.22)");
          g.addColorStop(1, "rgba(0,0,0,0)");
        } else if (i % 3 === 1) {
          g.addColorStop(0, "rgba(40, 255, 240, 0.5)");
          g.addColorStop(0.5, "rgba(40, 80, 255, 0.2)");
          g.addColorStop(1, "rgba(0,0,0,0)");
        } else {
          g.addColorStop(0, "rgba(190, 60, 255, 0.48)");
          g.addColorStop(0.55, "rgba(255, 20, 120, 0.18)");
          g.addColorStop(1, "rgba(0,0,0,0)");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(width / 2, height * 0.48);
      ctx.rotate(phase * 0.35);
      for (i = 0; i < 10; i++) {
        ctx.rotate(0.55);
        ctx.strokeStyle = i % 2 ? "rgba(255,0,200,0.12)" : "rgba(0,255,230,0.1)";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 40 + i * 36 + 10 * Math.sin(phase * 2 + i), 0, Math.PI * 1.4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }


  function ensureFxImage(state, key, src) {
    if (!state._fxImgs) state._fxImgs = {};
    var slot = state._fxImgs[key];
    if (slot && slot._failed) return null;
    if (slot && slot.complete && slot.naturalWidth > 0) return slot;
    if (!slot && src) {
      // sega44: resilient relative load (retry + cache-bust) — never blocks; null until loaded
      slot = new Image();
      slot._failed = false;
      state._fxImgs[key] = slot;
      AssetLoader.image(slot, src, { onerror: function() { slot._failed = true; } });
    }
    return (slot && slot.complete && slot.naturalWidth > 0) ? slot : null;
  }

  function ensureFxSequence(state, keyPrefix, paths) {
    var out = [];
    var i, img;
    for (i = 0; i < paths.length; i++) {
      img = ensureFxImage(state, keyPrefix + i, paths[i]);
      if (img) out.push(img);
    }
    return out;
  }

  // sega44/45: never hand back an unloaded image; top plate of the sega45 pin-map mix, else the
  // nearest loaded real Austin strip, else null → sky gradient + road (never blank, never throws).
  function activeBackground(state) {
    var mix = computeBgMix(state);
    return mix.length ? mix[mix.length - 1].img : null;
  }

  // ---------------------------------------------------------------------------------------------
  // sega45 background pin map + blends (all pre-nuke plates CLEAN — fiery plates only after the nuke)
  //   dusk-clean (start/verse1/holding) → violet (chorus1 59, 1.5 s blend) → black (tunnel mouth)
  //   → green-clean (white-out 106.82) → violet (diamond2 120.5, 1.5 s blend)
  //   → nuke 156.5: dusk(fires) ⇄ acid(fires) slow cross-fade (hold/fade), + background-only shake.
  // ---------------------------------------------------------------------------------------------
  var PRE_NUKE_KEYS = ["dusk-clean", "violet", "green-clean"];
  var FIRE_KEYS = ["dusk", "acid", "ember"];

  function smoothstep01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function stripImg(state, key) {
    var s = state.austinStrips || {};
    var im = s[key];
    return (im && im.width > 0) ? im : null;
  }

  function nearestLoadedStrip(state, key, postNuke) {
    var order = [key].concat(postNuke ? FIRE_KEYS.concat(PRE_NUKE_KEYS) : PRE_NUKE_KEYS);
    var i, im;
    for (i = 0; i < order.length; i++) {
      if (!postNuke && FIRE_KEYS.indexOf(order[i]) >= 0) continue; // never fiery before the nuke
      im = stripImg(state, order[i]);
      if (im) return { img: im, key: order[i] };
    }
    return null;
  }

  function nukeStartSec(state) {
    var nb = (state.config && state.config.nuclearBlast) || {};
    return nb.start != null ? nb.start : 156.5;
  }

  // sega51: erratic post-nuke plate cycle — random hold / random fade, some fades replaced by hard snaps,
  // occasional 1-3 frame flickers to the other plate during a hold. Returns B-plate alpha 0..1.
  function erraticNukeCycleK(state, c, t) {
    function rnd(a, b) { return a + Math.random() * Math.max(0, b - a); }
    var hMin = c.nukeCycleHoldMin != null ? c.nukeCycleHoldMin : 0.8, hMax = c.nukeCycleHoldMax != null ? c.nukeCycleHoldMax : 2.5;
    var fMin = c.nukeCycleFadeMin != null ? c.nukeCycleFadeMin : 0.3, fMax = c.nukeCycleFadeMax != null ? c.nukeCycleFadeMax : 1.2;
    var snapP = c.nukeCycleSnapChance != null ? c.nukeCycleSnapChance : 0.3;
    var flickP = c.nukeCycleFlickerChance != null ? c.nukeCycleFlickerChance : 0.35;
    var s = state._nkCyc;
    if (!s || t < s.t0 - 0.05 || t - s.t0 > 30) s = state._nkCyc = { side: 0, mode: "hold", t0: t, dur: rnd(hMin, hMax), flickAt: -1, flickEnd: -1 };
    var guard = 0;
    while (t - s.t0 >= s.dur && guard++ < 50) {
      var tEnd = s.t0 + s.dur;
      if (s.mode === "hold") {
        if (Math.random() < snapP) { s.side = 1 - s.side; s.mode = "hold"; s.dur = rnd(hMin, hMax); } // hard snap
        else { s.mode = "fade"; s.dur = rnd(fMin, fMax); }
      } else { s.side = 1 - s.side; s.mode = "hold"; s.dur = rnd(hMin, hMax); }
      s.t0 = tEnd;
      s.flickAt = -1;
      if (s.mode === "hold" && Math.random() < flickP) { s.flickAt = s.t0 + rnd(0.15, Math.max(0.2, s.dur - 0.2)); s.flickEnd = s.flickAt + rnd(0.04, 0.12); }
    }
    var k;
    if (s.mode === "fade") { var u = Math.max(0, Math.min(1, (t - s.t0) / Math.max(0.05, s.dur))); u = smoothstep01(u); k = s.side ? 1 - u : u; }
    else { k = s.side; if (s.flickAt > 0 && t >= s.flickAt && t < s.flickEnd) k = 1 - k; }
    return k;
  }

  // Returns [{img, a, key}] bottom → top.
  function computeBgMix(state) {
    var c = state.config || {};
    var t = state.songClock != null ? state.songClock : 0;
    if (state.postNukeFire) {
      var keys = c.postNukeFirePlates || ["dusk", "acid"];
      var A = stripImg(state, keys[0]);
      var B = stripImg(state, keys[1] || keys[0]);
      if (!A && !B) {
        var fb = nearestLoadedStrip(state, keys[0], true);
        return fb ? [{ img: fb.img, a: 1, key: fb.key }] : [];
      }
      if (!A) return [{ img: B, a: 1, key: keys[1] }];
      if (!B || B === A) return [{ img: A, a: 1, key: keys[0] }];
      if (c.nukeCycleErratic !== false) {
        var ke = erraticNukeCycleK(state, c, t);
        return [{ img: A, a: 1, key: keys[0] }, { img: B, a: ke, key: keys[1] }];
      }
      var hold = Math.max(0, c.postNukeFireHoldSec != null ? c.postNukeFireHoldSec : 4);
      var fade = Math.max(0.05, c.postNukeFireFadeSec != null ? c.postNukeFireFadeSec : 2);
      var cyc = 2 * (hold + fade);
      var u = ((t - nukeStartSec(state)) % cyc + cyc) % cyc;
      var k;
      if (u < hold) k = 0;
      else if (u < hold + fade) k = (u - hold) / fade;
      else if (u < 2 * hold + fade) k = 1;
      else k = 1 - (u - 2 * hold - fade) / fade;
      k = smoothstep01(k);
      return [{ img: A, a: 1, key: keys[0] }, { img: B, a: k, key: keys[1] }];
    }
    var key = state.austinBgPlate || (c.austinBgFastStripCritical || ["dusk-clean"])[0];
    if (PRE_NUKE_KEYS.indexOf(key) < 0) key = "dusk-clean"; // fiery / legacy never pre-nuke
    var pick = nearestLoadedStrip(state, key, false);
    if (!pick) return [];
    var m = state._bgMixState || (state._bgMixState = { img: null, prev: null, t0: 0 });
    var blendSec = c.austinBgBlendSec != null ? c.austinBgBlendSec : 1.5;
    var snap = !m.img || state.phase !== "running" ||
      (state._tunnelCityAlpha != null && state._tunnelCityAlpha <= 0.001) || !(blendSec > 0);
    if (pick.img !== m.img) {
      m.prev = snap ? null : m.img;
      m.t0 = t;
      m.img = pick.img;
      m.key = pick.key;
    }
    if (m.prev) {
      var bk = (t - m.t0) / blendSec;
      if (bk >= 1 || bk < 0) m.prev = null;
      else return [{ img: m.prev, a: 1, key: "prev" }, { img: m.img, a: smoothstep01(bk), key: m.key }];
    }
    return [{ img: m.img, a: 1, key: m.key }];
  }

  // sega51: bigger, jitterier post-nuke shake: constant per-frame jitter, frequent bursts, spikes, violent bursts.
  function erraticNukeShake(state, c, t) {
    function rnd(a, b) { return a + Math.random() * Math.max(0, b - a); }
    function pair(v, d) { return Array.isArray(v) ? [v[0], v[1] != null ? v[1] : v[0]] : (v != null ? [v, v] : d); }
    var jit = c.nukeShakeJitterPx != null ? c.nukeShakeJitterPx : 2;
    var amp = pair(c.nukeShakeAmpPx, [4, 10]);
    var spk = pair(c.nukeShakeSpikePx, [12, 18]);
    var spkP = c.nukeShakeSpikeChance != null ? c.nukeShakeSpikeChance : 0.25;
    var violP = c.nukeShakeViolentChance != null ? c.nukeShakeViolentChance : 0.2;
    var gap = pair(c.nukeShakeBurstGapSec, [0.4, 1.6]);
    var bur = pair(c.nukeShakeBurstSec, [0.25, 0.6]);
    var pad = Math.max(amp[1] * 1.6, spk[1]) + 1;
    var sh = state._bgShake2 || (state._bgShake2 = { next: t + 0.2, until: -1, violent: false });
    if (t < sh.until - 30 || t > sh.next + 30) { sh.next = t + 0.2; sh.until = -1; }
    if (t >= sh.next) {
      sh.violent = Math.random() < violP;
      sh.until = t + rnd(bur[0], bur[1]) * (sh.violent ? 1.6 : 1);
      sh.next = sh.until + rnd(gap[0], gap[1]);
    }
    var x = 0, y = 0;
    var r1 = function() { return (Math.random() * 2 - 1) * jit; };
    x = r1(); y = r1(); // per-frame jitter, always on
    if (t < sh.until) {
      if (!(sh.holdLeft > 0) || sh.bx == null) {
        sh.holdLeft = 1 + Math.floor(Math.random() * (sh.violent ? 2 : 3));
        var roll = function() {
          var sp = Math.random() < spkP, a = sp ? spk[0] : amp[0], b = sp ? spk[1] : amp[1];
          var v = rnd(a, b) * (sh.violent && !sp ? 1.6 : 1);
          return (Math.random() < 0.5 ? -1 : 1) * Math.min(pad - 1, v);
        };
        sh.bx = roll(); sh.by = roll() * 0.8;
      }
      sh.holdLeft--;
      x += sh.bx; y += sh.by;
    } else { sh.bx = null; }
    return { x: Math.round(x), y: Math.round(y), pad: pad };
  }

  // Background-only shake after the nuke: short random bursts of 1-3 px jitter.
  function postNukeBgShake(state) {
    var c = state.config || {};
    if (!state.postNukeFire || c.postNukeBgShakeEnabled === false) return null;
    var t = state.songClock != null ? state.songClock : 0;
    var sh = state._bgShake || (state._bgShake = { next: t + 0.5, until: -1 });
    if (t < sh.until - 30 || t > sh.next + 30) { sh.next = t + 0.5; sh.until = -1; } // seek guard
    if (t >= sh.next) {
      var burst = c.postNukeBgShakeBurstSec != null ? c.postNukeBgShakeBurstSec : 0.35;
      var gMin = c.postNukeBgShakeGapMinSec != null ? c.postNukeBgShakeGapMinSec : 1.2;
      var gMax = c.postNukeBgShakeGapMaxSec != null ? c.postNukeBgShakeGapMaxSec : 3.5;
      sh.until = t + burst * (0.6 + Math.random() * 0.8);
      sh.next = sh.until + gMin + Math.random() * Math.max(0, gMax - gMin);
    }
    if (c.nukeShakeErratic !== false) return erraticNukeShake(state, c, t);
    var lo = c.postNukeBgShakeMinPx != null ? c.postNukeBgShakeMinPx : 2;
    var hi = c.postNukeBgShakeMaxPx != null ? c.postNukeBgShakeMaxPx : 5;
    var sp = c.postNukeBgShakeSpikePx || [6, 8];
    var spHi = Array.isArray(sp) ? (sp[1] != null ? sp[1] : sp[0]) : sp;
    var pad = Math.max(hi, spHi || 0) + 1;
    if (t >= sh.until) return { x: 0, y: 0, pad: pad };
    // sega48: erratic — each offset held a random 1..N frames; x/y independent; occasional sharp spike
    if (!(sh.holdLeft > 0) || sh.x == null) {
      var holdMax = Math.max(1, c.postNukeBgShakeHoldFramesMax != null ? c.postNukeBgShakeHoldFramesMax : 4);
      sh.holdLeft = 1 + Math.floor(Math.random() * holdMax);
      var roll = function() {
        var spike = Math.random() < (c.postNukeBgShakeSpikeChance != null ? c.postNukeBgShakeSpikeChance : 0.1);
        var a = spike ? (Array.isArray(sp) ? sp[0] : sp) : lo, b = spike ? spHi : hi;
        return (Math.random() < 0.5 ? -1 : 1) * Math.round(a + Math.random() * Math.max(0, b - a));
      };
      sh.x = roll(); sh.y = roll();
    }
    sh.holdLeft--;
    return { x: sh.x, y: sh.y, pad: pad };
  }

  // sega48: steering/curve parallax (px, eased) + distance-driven zoom, shared by every Austin plate,
  // the lightning skyline mask and the starfield
  function updateBgParallaxZoom(state) {
    var c = state.config || {};
    var t = state.songClock != null ? state.songClock : 0;
    var last = state._bgPzT;
    var dt = (last == null || t < last || t - last > 0.5) ? 0 : (t - last);
    state._bgPzT = t;
    var curve = 0;
    try {
      var seg = ns.Track.findSegment(state, state.position + state.playerZ);
      curve = seg && seg.curve ? seg.curve : 0;
    } catch (eC) {}
    var laneTo = (ns.State && ns.State.laneOffset) ? ns.State.laneOffset(state, state.lane || 0) : (state.playerX || 0);
    var steer = Math.max(-1, Math.min(1, (laneTo - (state.playerX || 0)) * 1.5));
    var target, ease, mx;
    if (c.bgScrollEnabled !== false) {
      // sega51: visible sideways city scroll — opposite to the curve, and opposite to her lateral position
      // (sustained while she is in a lane, not only during the lane-change flick). Canvas px (640 wide).
      var cPx = c.bgScrollCurvePx != null ? c.bgScrollCurvePx : 20;
      var sPx = c.bgScrollSteerPx != null ? c.bgScrollSteerPx : 12;
      var cNorm = Math.max(0.5, c.bgScrollCurveNorm != null ? c.bgScrollCurveNorm : 4);
      var offs = c.laneOffsets || [-0.55, 0.55];
      var laneSpan = Math.max(0.1, Math.abs(offs[offs.length - 1] || 0.55));
      var lat = Math.max(-1, Math.min(1, (state.playerX || 0) / laneSpan));
      mx = c.bgScrollMaxPx != null ? c.bgScrollMaxPx : 24;
      target = Math.max(-mx, Math.min(mx, -cPx * Math.max(-1, Math.min(1, curve / cNorm)) - sPx * lat));
      ease = Math.max(0.02, c.bgScrollEase != null ? c.bgScrollEase : 0.6);
    } else {
      var str = c.bgParallaxStrength != null ? c.bgParallaxStrength : 6;
      mx = c.bgParallaxMax != null ? c.bgParallaxMax : 4;
      target = Math.max(-mx, Math.min(mx, -str * (curve / 4 + steer)));
      ease = Math.max(0.02, c.bgParallaxEase != null ? c.bgParallaxEase : 0.4);
    }
    if (state.phase !== "running" || state.inTunnel) target = 0;
    var cur = state._bgParallaxX || 0;
    cur += (target - cur) * (dt > 0 ? Math.min(1, dt / ease) : 0);
    state._bgParallaxX = cur;
    // zoom: accumulates only while the road actually moves (pauses on freeze / boss stop)
    if (state.phase === "menu" || t < 0.3) { state._bgZoomDist = 0; state._bgZoomPos = state.position; }
    var p0 = state._bgZoomPos, p1 = state.position || 0;
    if (p0 != null && state.phase === "running") {
      var d = p1 - p0;
      if (d < -state.trackLength / 2) d += state.trackLength;
      if (d > 0 && d < state.trackLength / 2) state._bgZoomDist = (state._bgZoomDist || 0) + d;
    }
    state._bgZoomPos = p1;
    var z0 = c.bgZoomStart != null ? c.bgZoomStart : 1, z1 = c.bgZoomEnd != null ? c.bgZoomEnd : 1.2;
    var u = (c.bgZoomByDistance === false) ? (t / 215)
      : ((state._bgZoomDist || 0) / Math.max(1, c.bgZoomFullDistance || 450000));
    state._bgZoom = z0 + (z1 - z0) * Math.max(0, Math.min(1, u));
  }

  function skylineTopsFor(state, key) {
    var m = (state.config && state.config.skylineMask) || {};
    if (key === "dusk" || key === "ember") return m.dusk || null;
    if (key === "acid") return m.acid || null;
    return m.clean || null;
  }

  // Draw the mixed Austin plates into the band; then the sky storm inside the skyline sky mask.
  function drawAustinBgMix(state, ctx, width, height, cfgBg, scrollOff) {
    var mix = computeBgMix(state);
    var shake = postNukeBgShake(state);
    var rect = null;
    var i, r;
    ctx.save();
    // sega48: one transform = zoom (anchored at the skyline base / horizon) x overscan, + parallax + shake
    var cfgPz = state.config || {};
    // sega51: overscan covers the larger scroll so the edges never show a gap
    var pmx = (cfgPz.bgScrollEnabled !== false) ? (cfgPz.bgScrollMaxPx != null ? cfgPz.bgScrollMaxPx : 24)
      : (cfgPz.bgParallaxMax != null ? cfgPz.bgParallaxMax : 4);
    // sega51: pad = max(scroll, shake) and the combined offset is clamped to it (never a gap, no double crop)
    var pad = Math.max(Math.abs(pmx), shake ? shake.pad : 0) + 1;
    var anchorY = height * ((cfgBg.austinBgSingleYFrac != null ? cfgBg.austinBgSingleYFrac : 0) + (cfgBg.austinBgSingleHFrac != null ? cfgBg.austinBgSingleHFrac : 0.55));
    var zsc = (state._bgZoom || 1) * (1 + (2 * pad) / Math.max(1, width)) * (1 + pad / Math.max(1, anchorY));
    var offX = Math.max(-(pad - 1), Math.min(pad - 1, (state._bgParallaxX || 0) + (shake ? shake.x : 0)));
    var offY = Math.max(-(pad - 1), Math.min(pad - 1, shake ? shake.y : 0));
    ctx.translate(width / 2 + offX, anchorY + offY);
    ctx.scale(zsc, zsc);
    ctx.translate(-width / 2, -anchorY);
    var baseA = ctx.globalAlpha;
    for (i = 0; i < mix.length; i++) {
      if (!(mix[i].a > 0.003)) continue;
      ctx.globalAlpha = baseA * Math.min(1, mix[i].a);
      r = drawBgSingleLayer(ctx, mix[i].img, width, height, cfgBg, scrollOff);
      if (r) rect = r;
    }
    ctx.globalAlpha = baseA;
    // sky storm (party-crash 28.02 / final boss) — only above the skyline silhouette
    if (rect && state._skyStormMode && ns.Sega31x && ns.Sega31x.drawSkyStorm) {
      var tops = null, j, tj;
      for (i = 0; i < mix.length; i++) {
        if (!(mix[i].a > 0.01)) continue;
        tj = skylineTopsFor(state, mix[i].key === "prev" ? "dusk-clean" : mix[i].key);
        if (!tj) continue;
        if (!tops) tops = tj.slice();
        else for (j = 0; j < tops.length && j < tj.length; j++) tops[j] = Math.min(tops[j], tj[j]);
      }
      ctx.save();
      // sega48: skyline clip cached as a Path2D per (plates, rect) instead of rebuilt every frame
      var clipKey = mix.map(function(m) { return m.a > 0.01 ? m.key : ""; }).join("|") + "@" + Math.round(rect.x) + "," + Math.round(rect.y) + "," + Math.round(rect.w) + "," + Math.round(rect.h);
      var cc = state._skyClipCache;
      if (typeof Path2D !== "undefined" && cc && cc.key === clipKey) { ctx.clip(cc.path); }
      else if (typeof Path2D !== "undefined" && tops && tops.length) {
        var pth = new Path2D(), nn = tops.length, jj;
        pth.moveTo(rect.x, rect.y - 4); pth.lineTo(rect.x + rect.w, rect.y - 4);
        for (jj = nn - 1; jj >= 0; jj--) { var y3 = rect.y + tops[jj] * rect.h; pth.lineTo(rect.x + ((jj + 1) / nn) * rect.w, y3); pth.lineTo(rect.x + (jj / nn) * rect.w, y3); }
        pth.closePath();
        state._skyClipCache = { key: clipKey, path: pth };
        ctx.clip(pth);
      } else {
      ctx.beginPath();
      if (tops && tops.length) {
        var n = tops.length;
        ctx.moveTo(rect.x, rect.y - 4);
        ctx.lineTo(rect.x + rect.w, rect.y - 4);
        for (j = n - 1; j >= 0; j--) {
          var yy = rect.y + tops[j] * rect.h;
          ctx.lineTo(rect.x + ((j + 1) / n) * rect.w, yy);
          ctx.lineTo(rect.x + (j / n) * rect.w, yy);
        }
        ctx.closePath();
      } else {
        ctx.rect(rect.x, rect.y, rect.w, rect.h * 0.25);
      }
      ctx.clip();
      }
      ns.Sega31x.drawSkyStorm(state, ctx, rect);
      ctx.restore();
    }
    ctx.restore();
    state._bgMixDebug = mix.map(function(m) { return m.key + ":" + (Math.round(m.a * 100) / 100); }).join(",");
    return rect;
  }

  function drawBgGrade(state) {
    var style = state.bgStyle || (state.nightAustin ? "night" : "dusk");
    var ctx = state.ctx;
    var width = state.width;
    var height = state.height;
    var grade = null;
    if (style === "ember") {
      grade = "rgba(255, 90, 20, 0.14)";
    } else if (style === "violet") {
      grade = "rgba(120, 40, 200, 0.16)";
    } else if (style === "storm") {
      grade = "rgba(20, 80, 140, 0.18)";
    }
    if (!grade) {
      return;
    }
    ctx.save();
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, width, height * 0.55);
    ctx.restore();
  }

  
  function drawBgLayer(ctx, background, width, height, layer, rotation, offset, yFrac, hFrac) {
    rotation = rotation || 0;
    offset = offset || 0;
    var imageW = layer.w / 2;
    var imageH = layer.h;
    var sourceX = layer.x + Math.floor(layer.w * rotation);
    var sourceY = layer.y;
    var sourceW = Math.min(imageW, layer.x + layer.w - sourceX);
    var sourceH = imageH;
    var destX = 0;
    var destY = Math.floor(height * yFrac) + offset;
    var destW = Math.floor(width * (sourceW / imageW));
    var destH = Math.floor(height * hFrac);
    ctx.drawImage(background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);
    if (sourceW < imageW) {
      var remW = imageW - sourceW;
      var remDestW = width - destW;
      ctx.drawImage(background, layer.x, sourceY, remW, sourceH, Math.max(0, destW - 2), destY, remDestW + 2, destH);
    }
  }

  // sega31w/x: one Austin strip cover/contain/stretch; sega31x horizontal scroll like treeOffset
  function prescaledPlate(img, sx, sy, sw, sh, dw, dh) {
    try {
      if (typeof document === "undefined" || !(img && (img.complete !== false) && img.width > 0)) return null;
      var tw = Math.max(1, Math.ceil(dw * 1.25)), th = Math.max(1, Math.ceil(dh * 1.25)); // headroom for zoom <= 1.25
      if (tw >= sw && th >= sh) return null; // no gain when upscaling
      var key = sx + "," + sy + "," + sw + "," + sh + "@" + tw + "x" + th;
      var c = img._bgPre;
      if (c && c._key === key) return c;
      img._bgPreBuilds = (img._bgPreBuilds || 0) + 1;
      if (img._bgPreBuilds > 6) return null; // size keeps changing: don't thrash, draw direct
      c = document.createElement("canvas");
      c.width = tw; c.height = th;
      var g = c.getContext("2d");
      g.imageSmoothingEnabled = true;
      try { g.imageSmoothingQuality = "high"; } catch (eQ) {}
      g.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
      c._key = key;
      img._bgPre = c;
      return c;
    } catch (e) { return null; }
  }

  function drawBgSingleLayer(ctx, background, width, height, cfg, scrollOffset) {
    if (!background || !(background.width > 0)) return;
    var yFrac = cfg.austinBgSingleYFrac != null ? cfg.austinBgSingleYFrac : 0;
    var hFrac = cfg.austinBgSingleHFrac != null ? cfg.austinBgSingleHFrac : 0.55;
    var scaleMult = cfg.austinBgSingleScale != null ? cfg.austinBgSingleScale : 1.0;
    var mode = (cfg.austinBgSingleScaleMode || "cover").toLowerCase();
    // sega43: NEVER draw a whole 1290x1470 sheet: atlas AND austin-new PNGs are 3 stacked
    // 1280x480 strips (drawing "full" = horizontal stripe bands + black gutters). Draw ONE picture:
    //  - fast strip JPEG (_austinStrip): whole image
    //  - austin-new PNG sheet: first skyline copy
    //  - atlas / postnuke sheet: TREES (skyline) strip (austinBgAtlasSource), parallax OK
    var srcKey;
    var srcX = 0;
    var srcY = 0;
    var srcW = background.width;
    var srcH = background.height;
    var layer = null;
    if (background._austinStrip) {
      srcKey = "full";
    } else if (background._austinNewSheet) {
      srcKey = "full";
      srcX = 5; srcY = 5; srcW = Math.min(1280, background.width - 5); srcH = Math.min(480, background.height - 5);
    } else if (background.height > 1000 && typeof BACKGROUND !== "undefined" && BACKGROUND && BACKGROUND.TREES) {
      srcKey = String(cfg.austinBgAtlasSource || "trees").toLowerCase();
    } else {
      srcKey = "full";
    }
    if (srcKey !== "full") {
      layer = BACKGROUND && BACKGROUND.TREES ? BACKGROUND.TREES : null;
      if (srcKey === "sky" && BACKGROUND && BACKGROUND.SKY) layer = BACKGROUND.SKY;
      else if (srcKey === "hills" && BACKGROUND && BACKGROUND.HILLS) layer = BACKGROUND.HILLS;
      else if (BACKGROUND && BACKGROUND.TREES) layer = BACKGROUND.TREES;
      if (layer) {
        srcX = layer.x;
        srcY = layer.y;
        srcW = layer.w;
        srcH = layer.h;
      }
    }
    var bandY = height * yFrac;
    var bandH = Math.max(1, height * hFrac);
    var bandW = width;
    var dw;
    var dh;
    var dx;
    var dy;
    if (mode === "stretch") {
      dw = bandW * scaleMult;
      dh = bandH * scaleMult;
      dx = (bandW - dw) / 2;
      dy = bandY + (bandH - dh) / 2;
    } else {
      var sx = bandW / srcW;
      var sy = bandH / srcH;
      var s = (mode === "contain") ? Math.min(sx, sy) : Math.max(sx, sy);
      s *= scaleMult;
      dw = srcW * s;
      dh = srcH * s;
      dx = (bandW - dw) / 2;
      dy = bandY + (bandH - dh) / 2;
    }
    // sega31x: slow city scroll — tile horizontally when scroll enabled
    // sega41: full austin-new plates are NOT seamless — NEVER wrap/tile (hard vertical seam).
    // Atlas TREES strip still parallax-scrolls; full PNG draws once cover-cropped in band.
    var scrollOn = cfg.austinBgScrollEnabled !== false;
    var fullPlate = (srcKey === "full" || !layer);
    if (fullPlate && (cfg.austinBgUseAustinNewPlates || cfg.austinBgFullPlateNoScroll !== false)) {
      scrollOn = false;
    }
    var rot = scrollOn ? ((scrollOffset || 0) % 1) : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, bandY, bandW, bandH);
    ctx.clip();
    try {
      if (scrollOn && layer && srcW > 0) {
        // Parallax-style source shift within atlas strip (same approach as drawBgLayer)
        var imageW = layer.w / 2;
        var sourceX = layer.x + Math.floor(layer.w * rot);
        var sourceW = Math.min(imageW, layer.x + layer.w - sourceX);
        var destW = Math.floor(width * (sourceW / imageW));
        var destH = Math.floor(bandH);
        var destY = Math.floor(bandY);
        ctx.drawImage(background, sourceX, layer.y, sourceW, layer.h, 0, destY, destW, destH);
        if (sourceW < imageW) {
          var remW = imageW - sourceW;
          var remDestW = width - destW;
          ctx.drawImage(background, layer.x, layer.y, remW, layer.h, Math.max(0, destW - 2), destY, remDestW + 2, destH);
        }
      } else {
        // Full plate or scroll-off: single draw, no wrap seam
        // sega49: bgPrescalePlates — resample the big plate to band size ONCE (cached canvas per
        // plate+size) so the per-frame draw under the zoom/parallax transform reads a small source.
        var pre = (cfg.bgPrescalePlates !== false) ? prescaledPlate(background, srcX, srcY, srcW, srcH, dw, dh) : null;
        if (pre) ctx.drawImage(pre, 0, 0, pre.width, pre.height, dx, dy, dw, dh);
        else ctx.drawImage(background, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
      }
    } catch (eBg) {}
    ctx.restore();
    return { x: dx, y: dy, w: dw, h: dh };
  }

  function drawSectionTitleBanner(state, ctx, width, height) {
    var text = state.sectionTitleText;
    if (!text) return;
    var cfg = state.config || {};
    if (cfg.sectionTitleEnabled === false) return;
    var age = state.sectionTitleAge || 0;
    var dur = state.sectionTitleDuration != null ? state.sectionTitleDuration : (cfg.sectionTitleDurationSec != null ? cfg.sectionTitleDurationSec : 3);
    var fade = state.sectionTitleFade != null ? state.sectionTitleFade : (cfg.sectionTitleFadeSec != null ? cfg.sectionTitleFadeSec : 0.5);
    if (age >= dur + fade) return;
    var alpha = 1;
    if (fade > 0 && age > dur) {
      alpha = Math.max(0, 1 - (age - dur) / fade);
    }
    if (alpha <= 0.01) return;
    var yFrac = cfg.sectionTitleYFrac != null ? cfg.sectionTitleYFrac : 0.22;
    var scale = cfg.sectionTitleScale != null ? cfg.sectionTitleScale : 1.0;
    var fontPx = cfg.sectionTitleFontSizePx != null ? cfg.sectionTitleFontSizePx : 56;
    fontPx = Math.max(12, Math.floor(fontPx * scale));
    var fill = cfg.sectionTitleFill || "#ff66cc";
    var stroke = cfg.sectionTitleStroke || "#00f0ff";
    var glow = cfg.sectionTitleGlow || "#ff2ec4";
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 " + fontPx + "px Impact, Haettenschweiler, Arial Black, Trebuchet MS, sans-serif";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.shadowColor = glow;
    ctx.shadowBlur = Math.max(12, Math.floor(fontPx * 0.45));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(3, Math.floor(fontPx * 0.1));
    var x = width / 2;
    var y = height * yFrac;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawSaxBackground(state, ctx, width, height) {
    var vid = Dom.get("karaokeVideo");
    if (!vid || vid.readyState < 2) {
      ctx.fillStyle = "#050308";
      ctx.fillRect(0, 0, width, height);
      return false;
    }
    // Flat full-bleed — no parallax; cover the stage behind road/sprites
    var vw = vid.videoWidth || 16;
    var vh = vid.videoHeight || 9;
    var scale = Math.max(width / vw, height / vh);
    var dw = vw * scale;
    var dh = vh * scale;
    var dx = (width - dw) / 2;
    var dy = (height - dh) / 2;
    try {
      ctx.drawImage(vid, dx, dy, dw, dh);
      return true;
    } catch (e) {
      ctx.fillStyle = "#050308";
      ctx.fillRect(0, 0, width, height);
      return false;
    }
  }

  function drawFinaleBanner(state, ctx, width, height) {
    var msg = state.winBanner || state.loseBanner;
    if (!msg) {
      return;
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 " + Math.floor(width * 0.085) + "px Trebuchet MS, sans-serif";
    ctx.fillStyle = state.winBanner ? "#7dffef" : "#ff4d8d";
    ctx.shadowColor = state.winBanner ? "#ff2d55" : "#ffe066";
    ctx.shadowBlur = 22;
    ctx.fillText(msg, width / 2, height * 0.22);
    ctx.restore();
  }

  // sega27: bold red ALL CAPS HUD while player explodes on boss lose (before lose storyboard)
  function drawFailHumanityBanner(state, ctx, width, height) {
    var msg = state.failHumanityBanner;
    if (!msg || !state.bossDefeatBeat) {
      return;
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var fs = Math.floor(width * 0.078);
    ctx.font = "900 " + fs + "px Impact, Haettenschweiler, Arial Black, sans-serif";
    ctx.fillStyle = "#ff1a1a";
    ctx.strokeStyle = "#3a0000";
    ctx.lineWidth = Math.max(3, Math.floor(fs * 0.08));
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 28;
    var y = height * 0.28;
    ctx.strokeText(msg, width / 2, y);
    ctx.fillText(msg, width / 2, y);
    ctx.restore();
  }


  // sega24: procedural roadside props removed (bitmaps only)



  // ---- sega43: Sega Super Scaler nuke (sky plate + expanding mushroom, shimmer, pulsing core) ----
  function nukeWindow(state) {
    var nb = (state.config && state.config.nuclearBlast) || {};
    var start = nb.start != null ? nb.start : 156.5;
    var end = nb.end != null ? nb.end : 159.6;
    var t = state.songClock != null ? state.songClock : 0;
    return { start: start, end: end, len: Math.max(0.05, end - start), t: t, T: t - start, inWin: (t >= start && t < end) };
  }

  function nukeSegaOn(state) {
    var c = state.config || {};
    return c.nukeSegaEnabled !== false;
  }

  function nukeGlowSprite(state) {
    if (state._nukeGlowCanvas) return state._nukeGlowCanvas;
    var n = 24;
    var cv = document.createElement("canvas");
    cv.width = n; cv.height = n;
    var g = cv.getContext("2d");
    var x, y, d, a, q;
    for (y = 0; y < n; y++) {
      for (x = 0; x < n; x++) {
        d = Math.sqrt(Math.pow((x + 0.5 - n / 2) / (n / 2), 2) + Math.pow((y + 0.5 - n / 2) / (n / 2), 2) * 1.8);
        if (d >= 1) continue;
        q = Math.round((1 - d) * 4) / 4; // 4-step banding = pixel-art glow
        a = q * q;
        g.fillStyle = "rgba(255," + Math.round(200 + 55 * q) + "," + Math.round(90 + 150 * q) + "," + a.toFixed(3) + ")";
        g.fillRect(x, y, 1, 1);
      }
    }
    state._nukeGlowCanvas = cv;
    return cv;
  }

  // Returns true when the Sega nuke owned the frame's nuke layer (old plate/frames skipped)
  function drawNukeSega(state, ctx, width, height) {
    if (!nukeSegaOn(state)) return false;
    var imgs = state._nukeSegaImgs || {};
    var sky = imgs.sky;
    var mush = imgs.mush;
    var c = state.config || {};
    var W = nukeWindow(state);
    if (!sky) {
      // sega45: nuke-bg.png ditched — without the Sega sky, fall back to the procedural blast
      return false;
    }
    var M = c.nukeSegaMaster || [1280, 720];
    var hor = c.nukeSegaHorizonY != null ? c.nukeSegaHorizonY : 499;
    var horizonY = state._roadHorizonY != null ? state._roadHorizonY : height * 0.52;
    var s = Math.max(horizonY / hor, width / M[0]);
    var ox = (width - M[0] * s) / 2;
    var oy = horizonY - hor * s;
    var a = 1;
    var fadeOut = c.nukeSegaFadeOutSec != null ? c.nukeSegaFadeOutSec : 0.35;
    if (W.inWin && fadeOut > 0 && !(state.nukeFlash > 0)) {
      a = Math.max(0, Math.min(1, (W.end - W.t) / fadeOut));
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = a;
    ctx.drawImage(sky, Math.round(ox), Math.round(oy), Math.round(M[0] * s), Math.round(M[1] * s));
    if (mush && W.inWin) {
      var crop = c.nukeSegaCrop || [291, 48, 700, 451];
      var baseX = c.nukeSegaBaseX != null ? c.nukeSegaBaseX : 640;
      var capC = c.nukeSegaCapCenter || [635, 211];
      var capBottom = c.nukeSegaCapBottomY != null ? c.nukeSegaCapBottomY : 325;
      var from = c.nukeSegaScaleFrom != null ? c.nukeSegaScaleFrom : 0.15;
      var to = c.nukeSegaScaleTo != null ? c.nukeSegaScaleTo : 1.0;
      var expand = c.nukeSegaExpandSec != null ? c.nukeSegaExpandSec : W.len;
      var u = Math.max(0, Math.min(1, W.T / Math.max(0.05, expand)));
      var e = 1 - Math.pow(1 - u, 3); // ease-out cubic
      var k = from + (to - from) * e;
      // sega51: nukeScaleGrow — blast 0.15 -> nukeScaleStart over nukeScaleBlastSec, then keep swelling to
      // nukeScaleEnd over the rest of the window (eased), anchored at its base on the horizon.
      if (c.nukeScaleGrow !== false) {
        var kS = c.nukeScaleStart != null ? c.nukeScaleStart : to;
        var kE = c.nukeScaleEnd != null ? c.nukeScaleEnd : 1.8;
        var blast = Math.max(0.05, Math.min(W.len * 0.8, c.nukeScaleBlastSec != null ? c.nukeScaleBlastSec : 0.8));
        if (W.T < blast) {
          var ub = W.T / blast;
          k = from + (kS - from) * (1 - Math.pow(1 - ub, 3));
        } else {
          var ug = Math.max(0, Math.min(1, (W.T - blast) / Math.max(0.05, W.len - blast)));
          var ez = c.nukeScaleEase || "easeInOut";
          var eg = ez === "linear" ? ug : (ez === "easeOut" ? 1 - Math.pow(1 - ug, 2) : ug * ug * (3 - 2 * ug));
          k = kS + (kE - kS) * eg;
        }
      }
      var ms = s * k;
      var ax = ox + baseX * s; // anchor: mushroom base on horizon (no drift)
      var ay = horizonY;
      var shimmer = c.nukeSegaShimmerPx != null ? c.nukeSegaShimmerPx : 2.0;
      var T = W.T;
      var slice = 3; // master px per row slice
      var sy, sh, dy0, dy1, amp, wob, rowAmp;
      for (sy = 0; sy < crop[3]; sy += slice) {
        sh = Math.min(slice, crop[3] - sy);
        var my = crop[1] + sy; // master y
        rowAmp = (my < capBottom) ? 1 : 0.35; // cap boils, stem barely
        amp = shimmer * ms * rowAmp;
        wob = Math.round(amp * Math.sin(T * 11.0 + my * 0.21) * (0.65 + 0.35 * Math.sin(T * 3.3 + my * 0.047)));
        dy0 = Math.round(ay + (my - hor) * ms);
        dy1 = Math.round(ay + (my + sh - hor) * ms);
        if (dy1 <= dy0) continue;
        ctx.drawImage(mush, 0, sy, crop[2], sh,
          Math.round(ax + (crop[0] - baseX) * ms) + wob, dy0,
          Math.round(crop[2] * ms), dy1 - dy0);
      }
      // pulsing additive core glow at cap center
      var hz = c.nukeSegaGlowHz != null ? c.nukeSegaGlowHz : 2.2;
      var pulse = 0.5 + 0.5 * Math.sin(T * Math.PI * 2 * hz);
      var gA = Math.min(1, 0.35 + 0.4 * pulse + Math.max(0, 0.6 - T) * 0.8);
      var gr = 150 * ms * (0.9 + 0.2 * pulse);
      var gx = ax + (capC[0] - baseX) * ms;
      var gy = ay + (capC[1] - hor) * ms;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a * gA;
      ctx.drawImage(nukeGlowSprite(state), Math.round(gx - gr), Math.round(gy - gr * 0.62), Math.round(gr * 2), Math.round(gr * 1.24));
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
    return true;
  }

  function nukeSegaShake(state) {
    if (!nukeSegaOn(state) || !(state._nukeSegaImgs && state._nukeSegaImgs.sky)) return null;
    var W = nukeWindow(state);
    if (!W.inWin || state.phase !== "running") return null;
    var c = state.config || {};
    var maxPx = c.nukeSegaShakePx != null ? c.nukeSegaShakePx : 16;
    var u = W.T / W.len;
    var amp = maxPx * Math.pow(1 - u, 2);
    if (amp < 0.5) return null;
    return {
      x: Math.round(amp * Math.sin(W.T * 97.3) * (0.6 + 0.4 * Math.sin(W.T * 13.1))),
      y: Math.round(amp * 0.7 * Math.cos(W.T * 83.7))
    };
  }

  // yellow → white → fade at detonation (after the existing pre-blast whiteout)
  function renderNukeDetFlash(state) {
    if (!nukeSegaOn(state)) return;
    var W = nukeWindow(state);
    var c = state.config || {};
    var dur = c.nukeSegaDetFlashSec != null ? c.nukeSegaDetFlashSec : 0.55;
    if (!W.inWin || W.T < 0 || W.T >= dur || state.phase !== "running") return;
    var T = W.T;
    var yEnd = 0.08, wEnd = 0.2;
    var mix = T < yEnd ? 0 : Math.min(1, (T - yEnd) / (wEnd - yEnd)); // 0 = yellow, 1 = white
    var alpha = T < wEnd ? 1 : Math.max(0, 1 - (T - wEnd) / Math.max(0.05, dur - wEnd));
    var ctx = state.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgb(255,255," + Math.round(40 + 215 * mix) + ")";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }



  function drawNuclearBlast(state, ctx, width, height) {
    var a = state.nuclearBlast || 0;
    var t = state.nuclearBlastT || 0;
    var cx = width * 0.5;
    var cy = height * 0.36;
    var flash;
    var stemH;
    var stemW;
    var stemTop;
    var stemBot;
    var capRx;
    var capRy;
    var coreR;
    var ring;
    var i;
    var cfgN = (state.config && state.config.nuclearBlast) ? state.config.nuclearBlast : {};
    // 250% size vs TODAY: nuclearBlastScale / nuclearBlastSizeMult (default 2.5 in config)
    var s = cfgN.nuclearBlastScale != null ? cfgN.nuclearBlastScale
      : (cfgN.nuclearBlastSizeMult != null ? cfgN.nuclearBlastSizeMult
      : (state.config && state.config.nuclearBlastScale != null ? state.config.nuclearBlastScale
      : (state.config && state.config.nuclearBlastSizeMult != null ? state.config.nuclearBlastSizeMult : 1)));
    if (!(s > 0)) s = 1;
    if (a <= 0.01) {
      return;
    }
    ctx.save();
    // When plate is loaded, keep canvas nuke as light supplement only
    var mul = 1;
    // Sky wash (full-bleed tint — not size-scaled)
    flash = Math.min(1, a * 1.2) * mul;
    ctx.globalAlpha = flash * 0.5;
    ctx.fillStyle = "#fff6d0";
    ctx.fillRect(0, 0, width, height * 0.62);
    ctx.globalAlpha = flash * 0.32;
    var g = ctx.createRadialGradient(cx, cy, 8 * s, cx, cy, width * 0.58 * s);
    g.addColorStop(0, "rgba(255,255,230,0.95)");
    g.addColorStop(0.22, "rgba(255,200,60,0.65)");
    g.addColorStop(0.55, "rgba(255,80,20,0.28)");
    g.addColorStop(1, "rgba(40,0,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Classic MUSHROOM CLOUD (NOT heart): tall stem + wide flat umbrella + bright CIRCLE core.
    // Prior stacked ellipses read as a yellow heart — avoid cleft / dual-lobe silhouette.
    stemBot = height * 0.74;
    stemTop = cy + height * 0.02 * s;
    stemH = Math.max(8, (stemBot - stemTop) * (0.75 + a * 0.25));
    stemW = width * (0.028 + a * 0.012) * s;

    // Stem column (slight taper — wider at bottom / joins under cap)
    ctx.globalAlpha = 0.82 * a * mul;
    g = ctx.createLinearGradient(cx, stemTop, cx, stemTop + stemH);
    g.addColorStop(0, "#ffe9a0");
    g.addColorStop(0.45, "#ffb040");
    g.addColorStop(1, "rgba(255,90,20,0.35)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - stemW * 0.55, stemTop);
    ctx.lineTo(cx + stemW * 0.55, stemTop);
    ctx.lineTo(cx + stemW * 0.95, stemTop + stemH);
    ctx.lineTo(cx - stemW * 0.95, stemTop + stemH);
    ctx.closePath();
    ctx.fill();
    // Hot core of stem
    ctx.globalAlpha = 0.7 * a * mul;
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(cx - stemW * 0.22, stemTop, stemW * 0.44, stemH * 0.92);

    // Umbrella CAP — single wide FLAT ellipse (rx >> ry). No second upper lobe.
    capRx = width * (0.16 + a * 0.20) * s;
    capRy = capRx * 0.36; // deliberately flat mushroom head
    ctx.globalAlpha = 0.9 * a * mul;
    g = ctx.createRadialGradient(cx, cy - capRy * 0.1, 2 * s, cx, cy, capRx);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.25, "#ffe066");
    g.addColorStop(0.62, "#ff7a00");
    g.addColorStop(1, "rgba(60,0,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, capRx, capRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Undercap skirt — thin horizontal band under rim (mushroom underside, not heart cleft)
    ctx.globalAlpha = 0.55 * a * mul;
    ctx.fillStyle = "rgba(255,140,40,0.75)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + capRy * 0.55, capRx * 0.92, capRy * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright SUN / CIRCLE core — unambiguous round fireball
    coreR = Math.max(6, capRx * 0.22);
    ctx.globalAlpha = 0.95 * a * mul;
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.35);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, "#fff4a8");
    g.addColorStop(0.75, "#ffcc33");
    g.addColorStop(1, "rgba(255,120,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // Shock rings at BASE (ground burst) — not around the cap
    for (i = 0; i < 3; i++) {
      ring = (t * 0.55 + i * 0.35) % 1.4;
      ctx.globalAlpha = Math.max(0, (0.45 - ring * 0.3) * a) * mul;
      ctx.strokeStyle = i === 0 ? "#ffffff" : "#ffd080";
      ctx.lineWidth = Math.max(1, (3 - i) * s);
      ctx.beginPath();
      ctx.ellipse(cx, stemBot, width * (0.08 + ring * 0.42) * s, width * (0.03 + ring * 0.12) * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ground glow × nuclearBlastScale
    ctx.globalAlpha = 0.42 * a * mul;
    g = ctx.createRadialGradient(cx, stemBot, 4 * s, cx, stemBot, width * 0.42 * s);
    g.addColorStop(0, "rgba(255,200,80,0.85)");
    g.addColorStop(1, "rgba(255,40,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, height * 0.55, width, height * 0.35);
    ctx.restore();
  }

  // sega45 C: 0..1 camera-to-road-centre weight (same envelope as the tunnel straightening)
  function cameraCenterK(state) {
    var c = state.config || {};
    if (c.tunnelRoadCenter === false) return 0;
    if (state.inTunnel) return 0;
    var k = state._tunnelStraightK;
    // full centring pushes her lane off-screen (lane centre ~ screen edge at her row), so centre partially
    var amt = c.tunnelRoadCenterAmount != null ? c.tunnelRoadCenterAmount : 0.6;
    var target = (k > 0) ? Math.min(1, k) * Math.max(0, Math.min(1, amt)) : 0;
    // sega48: cap her on-screen offset from centre (via the camera weight, so she stays ON her lane)
    var capF = c.tunnelApproachMaxOffsetFrac != null ? c.tunnelApproachMaxOffsetFrac : 0.12;
    var rw = state._roadRowWAtPlayer, px = Math.abs(state.playerX || 0);
    if (capF >= 0 && rw > 1 && px > 0.01) target = Math.min(target, (capF * state.width) / (px * rw));
    // sega48: ease toward the target over approachCenterEase seconds (no snap in or out)
    var ease = Math.max(0.05, c.approachCenterEase != null ? c.approachCenterEase : 1.0);
    var t = state.songClock || 0, lastT = state._camKT;
    var cur = state._camKSm != null ? state._camKSm : target;
    var dt = (lastT == null || t < lastT || t - lastT > 0.5) ? 1 : (t - lastT);
    var step = dt / ease;
    cur = cur + Math.max(-step, Math.min(step, target - cur));
    state._camKSm = cur; state._camKT = t;
    return cur;
  }

  // sega45 C: road centre x + half width at screen row y (from this frame's projected near rows)
  function roadRowAt(state, y) {
    var r = state._roadRows;
    if (!r || r.length < 6) return null;
    var i;
    for (i = 0; i + 5 < r.length; i += 3) {
      var y1 = r[i], y2 = r[i + 3];
      if ((y <= y1 && y >= y2) || (y >= y1 && y <= y2)) {
        var f = (y1 === y2) ? 0 : (y - y1) / (y2 - y1);
        return { x: r[i + 1] + (r[i + 4] - r[i + 1]) * f, w: r[i + 2] + (r[i + 5] - r[i + 2]) * f };
      }
    }
    // below the nearest row: extrapolate from the first two rows
    var fy = (r[3] === r[0]) ? 0 : (y - r[0]) / (r[3] - r[0]);
    return { x: r[1] + (r[4] - r[1]) * fy, w: r[2] + (r[5] - r[2]) * fy };
  }

  // sega45 D: lean frame toward the target lane only while the X tween is under way; straight on arrival
  function tunnelLaneLean(state) {
    var c = state.config || {};
    var eps = c.tunnelLeanEpsilon != null ? c.tunnelLeanEpsilon : 0.03;
    var target = (ns.State && ns.State.laneOffset) ? ns.State.laneOffset(state, state.lane || 0)
      : ((c.laneOffsets || [-0.55, 0.55])[state.lane | 0]);
    var diff = target - (state.playerX || 0);
    if (Math.abs(diff) <= eps) return 0;
    return diff < 0 ? -1 : 1;
  }

  // sega45 D: tunnel interior lane X follows the tweened playerX (was: snapped to the target lane)
  function tunnelTweenLaneX(state) {
    var offs = (state.config && state.config.laneOffsets) || [-0.55, 0.55];
    var o0 = offs[0], o1 = offs[offs.length - 1];
    var x0, x1;
    if (ns.Brains && ns.Brains.laneScreenX) {
      x0 = ns.Brains.laneScreenX(state, 0);
      x1 = ns.Brains.laneScreenX(state, offs.length - 1);
    } else {
      x0 = state.width / 2 + o0 * state.width * 0.22;
      x1 = state.width / 2 + o1 * state.width * 0.22;
    }
    var f = (o1 !== o0) ? ((state.playerX || 0) - o0) / (o1 - o0) : 0;
    f = Math.max(0, Math.min(1, f));
    return x0 + (x1 - x0) * f;
  }

function renderWorld(state) {
    if (!state.sprites || !state.segments.length) {
      return;
    }
    try { updateBgParallaxZoom(state); } catch (ePz) {} // sega48

    // Losing / Protect karaoke: hide road — UI draws lyrics + storyboard
    if (state.finaleMode === "karaoke") {
      var ctxK = state.ctx;
      ctxK.clearRect(0, 0, state.width, state.height);
      ctxK.fillStyle = "#050308";
      ctxK.fillRect(0, 0, state.width, state.height);
      return;
    }

    var width = state.width;
    var height = state.height;
    var ctx = state.ctx;
    // sega22: real vivid sax video only during "It's time to fight, yeah!" window (~205+)
    var saxBg = !!state.saxBgActive;
    // sega31x: tunnel owns full-screen fractal — skip Austin/sax plate
    if (state.inTunnel) {
      saxBg = false;
    }

    var baseSegment = ns.Track.findSegment(state, state.position);
    var basePercent = Util.percentRemaining(state.position, state.segmentLength);
    var playerSegment = ns.Track.findSegment(state, state.position + state.playerZ);
    var playerPercent = Util.percentRemaining(state.position + state.playerZ, state.segmentLength);
    var playerY = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    var maxy = height;
    var x = 0;
    var dx = -(baseSegment.curve * basePercent);
    var n;
    var i;
    var segment;
    var car;
    var sprite;
    var spriteScale;
    var spriteX;
    var spriteY;
    var drawPlayerNow;
    var bgPlate = activeBackground(state);

    // Outside psych: force full Austin visibility
    if (!state.psychMode) {
      state.worldFade = 1;
    }
    var worldAlpha = state.worldFade == null ? 1 : state.worldFade;

    ctx.clearRect(0, 0, width, height);

    // sega32: roadAlwaysInFrontOfBg / roadNoBgFlashThrough — clip all Austin/psych/postnuke BG
    // to above horizon so BG never paints through road pixels (stable occlusion, no flash).
    var cfgZ = state.config || {};
    var roadOverBg = (cfgZ.roadAlwaysInFrontOfBg !== false) || (cfgZ.roadOverBgZOrder !== false) || (cfgZ.roadNoBgFlashThrough !== false);
    var bgHorizonY = height * (cfgZ.bgHorizonClipYFrac != null ? cfgZ.bgHorizonClipYFrac
      : (cfgZ.bgHorizonSealYFrac != null ? cfgZ.bgHorizonSealYFrac : 0.52));
    state._roadHorizonY = bgHorizonY; // refined after road project pass

    var bgClipped = false;
    if (roadOverBg && !state.inTunnel) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, Math.max(1, Math.floor(bgHorizonY) + 1));
      ctx.clip();
      bgClipped = true;
    }

    // ONLY draw psychedelic overlay when psychMode is true (not merely worldFade < 0.99)
    if (state.psychMode && !saxBg) {
      drawPsychBackground(state);
    }

    ctx.save();
    ctx.globalAlpha = worldAlpha;

    if (state.inTunnel) {
      var drewInterior = false;
      if (ns.Sega31x && ns.Sega31x.drawTunnelInterior) {
        drewInterior = !!ns.Sega31x.drawTunnelInterior(state, ctx, width, height);
      }
      if (!drewInterior && ns.Sega31x && ns.Sega31x.drawTunnelFractal) {
        ns.Sega31x.drawTunnelFractal(state, ctx, width, height);
      }
    } else if (saxBg) {
      // Vivid sax video as flat BG plate — game play continues on top
      drawSaxBackground(state, ctx, width, height);
    } else {
      // Base sky gradient (dusk vs night)
      var skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
      if (state.nightAustin) {
        skyGrad.addColorStop(0, "#050818");
        skyGrad.addColorStop(0.55, "#1a2040");
        skyGrad.addColorStop(1, "#0a0a14");
      } else {
        skyGrad.addColorStop(0, "#2a1040");
        skyGrad.addColorStop(0.55, "#c45a28");
        skyGrad.addColorStop(1, "#1a0a12");
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Always draw BACKGROUND.SKY (far Austin) when not fully psych-void;
      // outside psych worldAlpha is forced to 1 so Austin always shows.
      if (worldAlpha > 0.02) {
        // Layered parallax OR sega31w single-layer Austin plate
        var cfgBg = state.config || {};
        if (cfgBg.austinBgSingleLayer) {
          var scrollOff = (cfgBg.austinBgScrollEnabled !== false)
            ? (state.austinBgScrollOffset != null ? state.austinBgScrollOffset : state.treeOffset)
            : 0;
          if (cfgBg.austinBgUseAustinNewPlates !== false && state.austinStrips) {
            drawAustinBgMix(state, ctx, width, height, cfgBg, scrollOff); // sega45 pin map + blends
          } else {
            drawBgSingleLayer(ctx, bgPlate, width, height, cfgBg, scrollOff);
          }
          if (ns.Sega31x && ns.Sega31x.drawFreshPostNukeOverlay) {
            var yFracPn = cfgBg.austinBgSingleYFrac != null ? cfgBg.austinBgSingleYFrac : 0;
            var hFracPn = cfgBg.austinBgSingleHFrac != null ? cfgBg.austinBgSingleHFrac : 0.55;
            ns.Sega31x.drawFreshPostNukeOverlay(state, ctx, width, height, height * yFracPn, height * hFracPn);
          }
        } else {
          // Layered parallax: sky (far) / landscape (mid) / city (near)
          // sega31v: seal horizon black-gap — extend/overlap layers to meet road; config-tunable
          if (bgPlate) {
          var skyY = cfgBg.bgSkyYFrac != null ? cfgBg.bgSkyYFrac : 0.0;
          var skyH = cfgBg.bgSkyHFrac != null ? cfgBg.bgSkyHFrac : 0.72;
          var hilY = cfgBg.bgHillsYFrac != null ? cfgBg.bgHillsYFrac : 0.12;
          var hilH = cfgBg.bgHillsHFrac != null ? cfgBg.bgHillsHFrac : 0.58;
          var treY = cfgBg.bgTreesYFrac != null ? cfgBg.bgTreesYFrac : 0.10;
          var treH = cfgBg.bgTreesHFrac != null ? cfgBg.bgTreesHFrac : 0.62;
          drawBgLayer(ctx, bgPlate, width, height, BACKGROUND.SKY, state.skyOffset, state.resolution * state.skySpeed * playerY, skyY, skyH);
          drawBgLayer(ctx, bgPlate, width, height, BACKGROUND.HILLS, state.hillOffset, state.resolution * state.hillSpeed * playerY, hilY, hilH);
          drawBgLayer(ctx, bgPlate, width, height, BACKGROUND.TREES, state.treeOffset, state.resolution * state.treeSpeed * playerY, treY, treH);
          }
        }
        // Fill band behind road horizon so no black void between sky/city plate and road tip
        // sega32: when roadNoBgFlashThrough, keep seal at/above horizon only (no under-road paint)
        if (cfgBg.bgHorizonSeal !== false) {
          var sealY = height * (cfgBg.bgHorizonSealYFrac != null ? cfgBg.bgHorizonSealYFrac : 0.45);
          var sealH = height * (cfgBg.bgHorizonSealHFrac != null ? cfgBg.bgHorizonSealHFrac : 0.28);
          if (roadOverBg || cfgBg.roadNoBgFlashThrough !== false) {
            var sealBottom = Math.min(sealY + sealH, bgHorizonY + 2);
            sealH = Math.max(0, sealBottom - sealY);
          }
          if (sealH > 0) {
            ctx.save();
            ctx.fillStyle = cfgBg.bgHorizonSealColor || (state.nightAustin ? "#121428" : "#2a1830");
            ctx.fillRect(0, sealY, width, sealH);
            ctx.restore();
          }
        }
      }
    }

    // sega45: city plate fades to black as the tunnel mouth appears (no city behind the mouth)
    if (!state.inTunnel && state._tunnelCityAlpha != null && state._tunnelCityAlpha < 0.999) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, 1 - state._tunnelCityAlpha));
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, Math.max(1, Math.floor(bgHorizonY) + 2));
      ctx.restore();
    }
    if (!state.inTunnel && state._starfieldA > 0 && ns.Sega31x && ns.Sega31x.drawStarfield) {
      ns.Sega31x.drawStarfield(state, ctx, width, Math.max(1, Math.floor(bgHorizonY)), state._starfieldA); // sega48
    }

    // sega32: end BG-above-horizon clip before nuke/road (full-screen flash must not be clipped).
    // Clip save wraps the worldAlpha save — pop both, then re-open worldAlpha for road/sprites.
    if (bgClipped) {
      ctx.restore(); // worldAlpha (nested inside clip)
      ctx.restore(); // clip
      ctx.save();
      ctx.globalAlpha = worldAlpha;
      bgClipped = false;
    }

    // sega33: opaque roadside/ground fill under horizon so clip/clearRect never leaves
    // psych dither / garbage / flicker under the road (roadNoBgFlashThrough = solid under).
    if ((roadOverBg || cfgZ.roadNoBgFlashThrough !== false) && !state.inTunnel) {
      var underY = Math.max(0, Math.floor((state._roadHorizonY != null ? state._roadHorizonY : bgHorizonY)));
      var underCol = cfgZ.roadUnderHorizonFillColor
        || (state.nightAustin ? '#140e28' : '#1a1232');
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = underCol;
      ctx.fillRect(0, underY, width, Math.max(0, height - underY));
      ctx.restore();
      // re-apply worldAlpha for subsequent road/sprites
      ctx.globalAlpha = worldAlpha;
    }

    // sega22/sega31g: nuke plate under flash whiteout; soft canvas blast on blast window
    if (state.nuclearBlast > 0 || state.nukeFlash > 0 || state.nukePlateUnderFlash) {
      // sega43: Sega nuke owns the layer (no 6-frame one-shot / procedural mushroom)
      if (!drawNukeSega(state, ctx, width, height)) {
        // sega45: nuke-bg.png plate + 6-frame mushroom ditched — procedural blast only if Sega art missing
        if (state.nuclearBlast > 0) {
          drawNuclearBlast(state, ctx, width, height);
        }
      }
    }

    // sega31x: tunnel fractal replaces road; party weather / starry over BG
    // (tunnel mouth deferred to post-road when tunnelEntranceInFrontOfRoad)
    var skipRoadSega31x = false;
    if (ns.Sega31x && ns.Sega31x.renderOverlayPreRoad) {
      skipRoadSega31x = !!ns.Sega31x.renderOverlayPreRoad(state, ctx, width, height);
    }
    var roadAlphaSega31x = 1;
    if (ns.Sega31x && ns.Sega31x.roadBgAlpha) {
      roadAlphaSega31x = ns.Sega31x.roadBgAlpha(state);
    }
    if (roadAlphaSega31x < 0.999) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, roadAlphaSega31x);
    }

    // sega45 C: ROOT CAUSE of the "bend" before the tunnel — tunnelStraightK zeroes seg.curve (the
    // road IS geometrically straight) but the camera stays at playerX*roadWidth (her lane, ±0.55), so
    // the straight road is projected off-axis and reads as a diagonal/right bend toward the horizon.
    // Fix: ease the camera to the road centre with the same straightK (81.5 → exit), so the road is
    // dead straight, flat AND centred; she is drawn at her real projected lane X (drawPlayerDeferred).
    var camCenterK = cameraCenterK(state);
    var camX = state.playerX * state.roadWidth * (1 - camCenterK);
    state._camCenterK = camCenterK;
    var roadRows = state._roadRows || (state._roadRows = []);
    roadRows.length = 0;
    for (n = 0; n < state.drawDistance; n++) {
      if (skipRoadSega31x || (ns.Sega31x && ns.Sega31x.shouldSkipRoad && ns.Sega31x.shouldSkipRoad(state))) {
        break;
      }
      segment = state.segments[(baseSegment.index + n) % state.segments.length];
      segment.looped = segment.index < baseSegment.index;
      segment.fog = Util.exponentialFog(n / state.drawDistance, state.fogDensity);
      segment.clip = maxy;

      Util.project(
        segment.p1,
        camX - x,
        playerY + state.cameraHeight,
        state.position - (segment.looped ? state.trackLength : 0),
        state.cameraDepth,
        width,
        height,
        state.roadWidth
      );

      Util.project(
        segment.p2,
        camX - x - dx,
        playerY + state.cameraHeight,
        state.position - (segment.looped ? state.trackLength : 0),
        state.cameraDepth,
        width,
        height,
        state.roadWidth
      );

      x = x + dx;
      dx = dx + segment.curve;
      // sega45: near road rows (screen y → centre x / half width) for her projected lane X
      if (n < 80 && segment.p1.camera.z > state.cameraDepth) {
        roadRows.push(segment.p1.screen.y, segment.p1.screen.x, segment.p1.screen.w);
      }

      if (
        (segment.p1.camera.z <= state.cameraDepth) ||
        (segment.p2.screen.y >= segment.p1.screen.y) ||
        (segment.p2.screen.y >= maxy)
      ) {
        continue;
      }

      // sega31d: slightly more pixelly road (quantize edges)
      var qx = (state.config && state.config.roadMorePixelly !== false) ? 2 : 1;
      var qy = (state.config && state.config.roadMorePixelly !== false) ? 3 : 2;
      var qw = (state.config && state.config.roadMorePixelly !== false) ? 3 : 2;
      Render.segment(
        ctx,
        width,
        state.lanes,
        Math.round(segment.p1.screen.x / qx) * qx,
        Math.round(segment.p1.screen.y / qy) * qy,
        Math.round(segment.p1.screen.w / qw) * qw,
        Math.round(segment.p2.screen.x / qx) * qx,
        Math.round(segment.p2.screen.y / qy) * qy,
        Math.round(segment.p2.screen.w / qw) * qw,
        segment.fog,
        segment.color
      );

      maxy = segment.p1.screen.y;
    }

    if (roadAlphaSega31x < 0.999) {
      ctx.restore();
    }

    // sega32: live road horizon from projected segments (mouth lock + clip)
    if (maxy < height && maxy > 0) {
      state._roadHorizonY = maxy;
    }

    // sega35: mouth / black fade after road — also when road skipped (interior / roadWait)
    if (ns.Sega31x && ns.Sega31x.renderOverlayPostRoad) {
      ns.Sega31x.renderOverlayPostRoad(state, ctx, width, height);
    }

    drawPlayerNow = null;

    // sega35: player MUST stay visible in tunnel / freeze / exit (skipRoad used to omit drawPlayerNow)
    if (skipRoadSega31x || state.inTunnel || state._tunnelHideRoad || state.tunnelApproaching || state.tunnelExiting) {
      var elevY = (state.playerElevScreenY != null) ? (height * state.playerElevScreenY) : (height * 0.78);
      drawPlayerNow = {
        steerLean: tunnelLaneLean(state),
        destY: elevY,
        updown: 0,
        tunnelForced: true
      };
    }

    for (n = (state.drawDistance - 1); n > 0; n--) {
      if (skipRoadSega31x) break;
      segment = state.segments[(baseSegment.index + n) % state.segments.length];

      for (i = 0; i < segment.cars.length; i++) {
        car = segment.cars[i];
        if (ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showTraffic")) {
          continue;
        }
        // sega29: never draw pickups/hearts through the car path
        if (car.kind === "life" || car.isPickup || car.notCar) {
          continue;
        }
        sprite = car.sprite;
        if (!sprite || (SPRITES.LIFE && sprite === SPRITES.LIFE)) {
          continue;
        }
        spriteScale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
        spriteX = Util.interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) + (spriteScale * car.offset * state.roadWidth * width / 2);
        spriteY = Util.interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent);
        // Visual size only — do not multiply into lateral offset (keeps lane center)
        spriteScale *= (state.config.spriteScaleCars != null ? state.config.spriteScaleCars : 1.75);
        var carWMult = (state.config.carsWidthMult != null) ? state.config.carsWidthMult : 1;
        var carHMult = (state.config.carsHeightMult != null) ? state.config.carsHeightMult : 1;

        // sega29: player-style bounce on road cars (spriteNeonCar already has vibY)
        if (state.config && state.config.motionVibrateCarsBrains !== false) {
          var speedPctCar = state.maxSpeed ? (state.speed / state.maxSpeed) : 0.4;
          var bounceCar = (1.5 * Math.random() * Math.max(0.15, speedPctCar) * state.resolution) * Util.randomChoice([-1, 1]);
          spriteY += bounceCar;
        }

        // sega22: bank/rotate with road curve so cars look like steering
        var bank = Math.atan(segment.curve * 0.085) || 0;
        // sega31d: screen rect for tap-shoot cars (tier3)
        // sega31s: +20% W / +15% H
        var approxW = Math.max(28, (sprite.w || 80) * spriteScale * state.roadWidth * width * 0.00035 * carWMult);
        var approxH = Math.max(20, (sprite.h || 56) * spriteScale * state.roadWidth * width * 0.00035 * carHMult);
        car.screenRect = {
          x: spriteX - approxW / 2,
          y: spriteY - approxH,
          w: approxW,
          h: approxH
        };
        if (Render.spriteNeonCar) {
          Render.spriteNeonCar(
            ctx, width, height, state.resolution, state.roadWidth, state.sprites,
            sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip, bank
          );
        } else {
          ctx.save();
          if (bank) {
            ctx.translate(spriteX, spriteY);
            ctx.rotate(bank);
            ctx.translate(-spriteX, -spriteY);
          }
          // sega31s: apply W/H mult via non-uniform scale about feet/center
          if (carWMult !== 1 || carHMult !== 1) {
            ctx.translate(spriteX, spriteY);
            ctx.scale(carWMult, carHMult);
            ctx.translate(-spriteX, -spriteY);
          }
          Render.sprite(
            ctx, width, height, state.resolution, state.roadWidth, state.sprites,
            sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip
          );
          ctx.restore();
        }
      }

      // sega34: hide roadside during tunnel approach clear / interior
      if (state._tunnelHideRoadside) {
        /* skip roadside sprites */
      } else for (i = 0; i < segment.sprites.length; i++) {
        sprite = segment.sprites[i];
        // sega24: section-tagged props only draw for matching sectionId
        if (sprite.sectionId && state.sectionId && sprite.sectionId !== state.sectionId) {
          continue;
        }
        spriteScale = segment.p1.screen.scale;
        // sega30/31d: roadside buildings/landmarks × roadsideBuildingScale
        var rsKey = (sprite.source && sprite.source.roadside) ? sprite.source.roadside : "";
        var isBldg = (typeof rsKey === "string" && rsKey.indexOf("bldg_") === 0);
        if (isBldg) {
          var bScale = (state.config && state.config.roadsideBuildingScale != null)
            ? state.config.roadsideBuildingScale : 4.33;
          spriteScale *= bScale;
        }
        var rsOff = sprite.offset;
        // sega31d: pull buildings much closer; other props only if also enlarged
        if (state.config && state.config.roadsidePullTowardRoad) {
          var buildingsOnly = state.config.roadsidePullTowardRoadBuildingsOnly !== false;
          var doPull = isBldg || !buildingsOnly;
          if (doPull) {
            var pull = isBldg && state.config.roadsideBuildingOffsetTowardRoad != null
              ? state.config.roadsideBuildingOffsetTowardRoad
              : (state.config.roadsideOffsetTowardRoad != null ? state.config.roadsideOffsetTowardRoad : 0);
            if (pull) {
              if (rsOff < 0) rsOff = rsOff + pull * Math.min(1, Math.abs(rsOff));
              else rsOff = rsOff - pull * Math.min(1, Math.abs(rsOff));
            }
          }
        }
        spriteX = segment.p1.screen.x + (spriteScale * rsOff * state.roadWidth * width / 2);
        spriteY = segment.p1.screen.y;
        if (ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showRoadside")) {
          continue;
        }
        // sega24: no hue-rotate on roadside (perf) — draw bitmaps / atlas sprites plain
        Render.sprite(
          ctx, width, height, state.resolution, state.roadWidth, state.sprites,
          sprite.source, spriteScale, spriteX, spriteY,
          (rsOff < 0 ? -1 : 0), -1, segment.clip
        );
      }

      if (segment === playerSegment) {
        drawPlayerNow = {
          steerLean: state.lane === 0 ? -1 : 1,
          destY: (height / 2) - (state.cameraDepth / state.playerZ * Util.interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) * height / 2),
          updown: playerSegment.p2.world.y - playerSegment.p1.world.y
        };
      }
    }

    ctx.restore();

    // sega31k: defer player draw until after brains (z-order: player in front)
    state._pendingPlayerDraw = (drawPlayerNow && state.finaleMode !== "paused") ? drawPlayerNow : null;

    // Huge PAUSED overlay during finale pause beat
    if (state.finaleMode === "paused") {
      ctx.save();
      ctx.fillStyle = "rgba(5, 2, 8, 0.55)";
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 " + Math.floor(width * 0.18) + "px Trebuchet MS, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ff2d55";
      ctx.shadowBlur = 28;
      ctx.fillText("PAUSE", width / 2, height * 0.48);
      ctx.restore();
    }

    // sega31w: section title banners (above player / mid HUD)
    drawSectionTitleBanner(state, ctx, width, height);

    // Win cruise / hard-lose banner (fight win path)
    if (state.finaleMode === "winCruise" || state.winBanner || state.loseBanner) {
      drawFinaleBanner(state, ctx, width, height);
    }
  }

  function renderEffects(state) {
    if (state.finaleMode === "karaoke") {
      return;
    }
    var ctx = state.ctx;
    var width = state.width;
    var height = state.height;
    var worldAlpha = state.worldFade == null ? 1 : state.worldFade;

    ctx.save();
    ctx.globalAlpha = worldAlpha;

    var grad = ctx.createRadialGradient(width / 2, height * 0.55, height * 0.15, width / 2, height * 0.5, height * 0.85);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(5,0,4,0.22)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    if (state.damageFlash > 0) {
      // Red border flash on hit (not full-screen wash)
      var a = state.damageFlash;
      var bw = Math.max(10, Math.floor(width * 0.035));
      ctx.save();
      ctx.strokeStyle = "rgba(255, 40, 70, " + (0.35 + a * 0.65).toFixed(3) + ")";
      ctx.lineWidth = bw;
      ctx.shadowColor = "rgba(255, 0, 60, " + (a * 0.9).toFixed(3) + ")";
      ctx.shadowBlur = 18;
      ctx.strokeRect(bw / 2, bw / 2, width - bw, height - bw);
      ctx.restore();
    }

    if (state.nearMissFlash > 0) {
      ctx.fillStyle = "rgba(255, 120, 160, " + (state.nearMissFlash * 0.18).toFixed(3) + ")";
      ctx.fillRect(0, 0, width, height);
    }

    if (state.shockFlash > 0) {
      var sf = state.shockFlash;
      var zsm = (state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1;
      // sega25: soft hit flash only — bolt is drawn from the zapping brain (no full-screen veins)
      // sega31s: flash intensity × zapHitShakeMult (0.70)
      ctx.fillStyle = "rgba(180, 255, 255, " + (sf * 0.18 * zsm).toFixed(3) + ")";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, " + (sf * 0.08 * zsm).toFixed(3) + ")";
      ctx.fillRect(0, 0, width, height);
    }

    if (state.health <= 25) {
      ctx.strokeStyle = "rgba(255, 45, 85, 0.55)";
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, width, height);
    }

    if (state.health <= 0) {
      ctx.fillStyle = "rgba(40, 0, 10, 0.08)";
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawRoadProps(state) {
    if (state.finaleMode === "karaoke") {
      return;
    }
    if (!state.sprites || !state.segments.length) {
      return;
    }
    var width = state.width;
    var height = state.height;
    var ctx = state.ctx;
    var baseSegment = ns.Track.findSegment(state, state.position);
    var lists = [];
    var n;
    var item;
    var segment;
    var spriteScale;
    var spriteX;
    var spriteY;
    var rel;
    var worldAlpha = state.worldFade == null ? 1 : state.worldFade;

    if (worldAlpha <= 0.02) {
      return;
    }

    function pushList(arr) {
      if (!arr) return;
      for (n = 0; n < arr.length; n++) {
        item = arr[n];
        if (item.taken) continue;
        segment = ns.Track.findSegment(state, item.z);
        rel = segment.index - baseSegment.index;
        if (rel < 0) rel += state.segments.length;
        if (rel <= 0 || rel >= state.drawDistance) continue;
        lists.push({ item: item, segment: segment, rel: rel });
      }
    }
    pushList(state.corpses);
    pushList(state.pickups);
    lists.sort(function(a, b) { return b.rel - a.rel; });

    ctx.save();
    ctx.globalAlpha = worldAlpha;
    for (n = 0; n < lists.length; n++) {
      item = lists[n].item;
      segment = lists[n].segment;
      spriteScale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, item.percent || 0);
      spriteX = Util.interpolate(segment.p1.screen.x, segment.p2.screen.x, item.percent || 0) + (spriteScale * item.offset * state.roadWidth * width / 2);
      spriteY = Util.interpolate(segment.p1.screen.y, segment.p2.screen.y, item.percent || 0);
      // sega29 fixHeartSpawnAsCar: always force LIFE sprite for heart pickups
      var isLife = item.kind === "life" || item.isPickup || (item.sprite && SPRITES.LIFE && (
        item.sprite === SPRITES.LIFE ||
        (item.sprite.x === SPRITES.LIFE.x && item.sprite.y === SPRITES.LIFE.y)
      ));
      if (isLife) {
        if (ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showPickups")) { continue; }
        if (!SPRITES.LIFE) { continue; }
        item.sprite = SPRITES.LIFE;
        item.kind = "life";
        // sega31d screen-space hearts drawn later in drawScreenHearts
        if (item.screenSpace) { continue; }
        spriteScale *= (state.config.spriteScalePickups != null ? state.config.spriteScalePickups : 2.8);
        if (item.skyDrop) {
          var sk = item.skyScale != null ? item.skyScale : 3.75;
          spriteScale *= sk;
          spriteY -= (state.height * 0.42) * Math.max(0, Math.min(1, item.skyY != null ? -item.skyY : 0.35));
        }
        // sega31f: soft purple vibe behind; LIFE sprite readable on top
        ctx.save();
        ctx.globalAlpha = worldAlpha * 0.28;
        var glowR = Math.max(8, spriteScale * state.roadWidth * width * 0.028);
        var grd = ctx.createRadialGradient(spriteX, spriteY - glowR * 0.25, 1, spriteX, spriteY - glowR * 0.25, glowR);
        grd.addColorStop(0, "rgba(230, 120, 255, 0.45)");
        grd.addColorStop(0.45, "rgba(180, 40, 255, 0.18)");
        grd.addColorStop(1, "rgba(120, 0, 255, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(spriteX, spriteY - glowR * 0.25, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = worldAlpha;
        // sega31i: draw original purple heart.pre-sega17 (LIFE.img) unfiltered
        Render.sprite(
          ctx, width, height, state.resolution, state.roadWidth, state.sprites,
          SPRITES.LIFE, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip
        );
        ctx.restore();
        continue;
      }
      // Never draw car sprites from the pickup/corpse list
      if (item.sprite && SPRITES.CARS && SPRITES.CARS.indexOf(item.sprite) >= 0) {
        continue;
      }
      Render.sprite(
        ctx, width, height, state.resolution, state.roadWidth, state.sprites,
        item.sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip
      );
    }
    ctx.restore();
  }

  function renderNukeFlash(state) {
    var a = state.nukeFlash || 0;
    if (a <= 0) return;
    var ctx = state.ctx;
    ctx.save();
    // sega31g: full-bleed opaque whiteout — hide road/sprites/world; nuke plate already under
    var cover = a >= 0.15 ? 1 : (a / 0.15);
    ctx.globalAlpha = Math.min(1, cover);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }

  function renderInvasion(state) {
    if (!state.invasionFlash || state.invasionFlash <= 0) {
      return;
    }
    var ctx = state.ctx;
    var t = state.invasionFlash;
    var pulse = (Math.sin(t * 28) > 0);
    var a = Math.min(1, t) * (pulse ? 0.55 : 0.22);
    ctx.fillStyle = pulse
      ? "rgba(255, 255, 255, " + a.toFixed(3) + ")"
      : "rgba(220, 20, 40, " + (a * 1.1).toFixed(3) + ")";
    ctx.fillRect(0, 0, state.width, state.height);
  }


  function drawScreenHearts(state) {
    if (!state.pickups || !SPRITES.LIFE) return;
    if (ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showPickups")) return;
    var ctx = state.ctx;
    var n, item, scale, w, h, x, y, glowR, grd;
    var base = state.config.spriteScalePickups != null ? state.config.spriteScalePickups : 3.15;
    for (n = 0; n < state.pickups.length; n++) {
      item = state.pickups[n];
      if (!item || item.taken || !item.screenSpace) continue;
      scale = base * (item.skyScale != null ? item.skyScale : 1);
      w = (SPRITES.LIFE.w || 40) * 0.55 * scale;
      h = (SPRITES.LIFE.h || 40) * 0.55 * scale;
      x = item.screenX != null ? item.screenX : state.width / 2;
      y = item.screenY != null ? item.screenY : 20;
      var missA = (item.missFading && item.missFade != null) ? Math.max(0, item.missFade) : 1;
      // sega31f: weaker glow so heart bitmap reads at spriteScalePickups 3.15
      ctx.save();
      ctx.globalAlpha = 0.18 * missA;
      glowR = Math.max(8, w * 0.38);
      grd = ctx.createRadialGradient(x, y, 1, x, y, glowR);
      grd.addColorStop(0, "rgba(230, 120, 255, 0.4)");
      grd.addColorStop(0.5, "rgba(180, 40, 255, 0.16)");
      grd.addColorStop(1, "rgba(120, 0, 255, 0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = missA;
      // sega31i: original purple heart sheet (SPRITES.LIFE.img), not atlas crop
      var heartSheet = SPRITES.LIFE.img || state.sprites;
      if (heartSheet) {
        ctx.drawImage(
          heartSheet,
          SPRITES.LIFE.x || 0, SPRITES.LIFE.y || 0,
          SPRITES.LIFE.w || heartSheet.width || 128,
          SPRITES.LIFE.h || heartSheet.height || 128,
          x - w / 2, y - h / 2, w, h
        );
      }
      ctx.restore();
    }
  }

  function drawTier3Timer(state) {
    var label = (ns.Sega31 && ns.Sega31.tier3TimerLabel) ? ns.Sega31.tier3TimerLabel(state) : null;
    if (!label) return;
    if (state.firstPersonBurst) {
      if (state.config && state.config.elevTier3TimerDisplay === false) return;
    } else if (state.elevTier === 2) {
      if (state.config && state.config.elevTier2TimerDisplay === false) return;
    } else {
      return;
    }
    var ctx = state.ctx;
    ctx.save();
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(state.width / 2 - 70, 18, 140, 40);
    ctx.fillStyle = "#7dffef";
    ctx.strokeStyle = "#ff66cc";
    ctx.lineWidth = 2;
    ctx.strokeText(label, state.width / 2, 46);
    ctx.fillText(label, state.width / 2, 46);
    ctx.restore();
  }



  function drawPlayerHitRedDiff(state, ctx, width, height, px, destY, steerAmt, pScale, drawZ) {
    var c = state.config || {};
    if (c.playerHitUseRedDiff === false) return;
    // Honor noScreenFlashOnHeartCollect — never show on heart; damage/zap only
    if (state._heartCollectFx) return;
    // Drive overlay from timer / active flashes only (not sticky _zapHit)
    var dur = c.playerHitRedDiffDurationSec != null ? c.playerHitRedDiffDurationSec : 0.35;
    var brainOnly = c.playerHitRedDiffOnBrainOnly !== false;
    // Start timer once when zap/damage flash begins
    if ((state._playerHitRedDiffT || 0) <= 0) {
      var trigger = false;
      if (brainOnly) {
        trigger = !!(state._zapHit || (state.shockFlash > 0.55));
      } else {
        trigger = !!(state.damageFlash > 0.55 || state.shockFlash > 0.55 || state._zapHit);
      }
      if (trigger || state._playerHitRedDiff) {
        state._playerHitRedDiffT = dur;
        if (steerAmt < -0.15) state._playerHitRedDiffPose = 'left';
        else if (steerAmt > 0.15) state._playerHitRedDiffPose = 'right';
        else state._playerHitRedDiffPose = 'straight';
        state._playerHitRedDiff = false;
        state._zapHit = false; // consume sticky flag
      }
    }
    if ((state._playerHitRedDiffT || 0) <= 0) return;
    var show = true;
    var pose = state._playerHitRedDiffPose || 'straight';
    var src = pose === 'left' ? (c.playerHitRedDiffLeft || 'images/player-hit/diff-left.png')
      : (pose === 'right' ? (c.playerHitRedDiffRight || 'images/player-hit/diff-right.png')
      : (c.playerHitRedDiffStraight || 'images/player-hit/diff-straight.png'));
    var img = ensureFxImage(state, 'redDiff_' + pose, src);
    if (!img) return;
    var alpha = 1;
    if ((state._playerHitRedDiffT || 0) > 0) {
      alpha = Math.min(1, state._playerHitRedDiffT / Math.max(0.05, dur * 0.35));
    } else if (state.damageFlash > 0) {
      alpha = Math.min(1, state.damageFlash);
    } else if (state.shockFlash > 0) {
      alpha = Math.min(1, state.shockFlash);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha * 0.95;
    // Approximate player sprite footprint
    var sprH = height * 0.16;
    try {
      if (typeof SPRITES !== 'undefined' && SPRITES.PLAYER_STRAIGHT) {
        var sc = SPRITES.SCALE || 0.00214;
        sprH = SPRITES.PLAYER_STRAIGHT.h * (state.cameraDepth / Math.max(1, drawZ || state.playerZ || 1)) * (pScale || 1) * (width / 2) * sc * state.roadWidth;
      }
    } catch (e) {}
    var sprW = sprH * 0.85;
    ctx.drawImage(img, px - sprW / 2, destY - sprH, sprW, sprH);
    ctx.restore();
  }

  function drawPlayerDeferred(state) {
    var drawPlayerNow = state._pendingPlayerDraw;
    state._pendingPlayerDraw = null;
    if (!drawPlayerNow || state.finaleMode === "paused") return;
    var ctx = state.ctx;
    var width = state.width;
    var height = state.height;
    ctx.save();
    if (state.shockFlash > 0) {
      var flicker = (Math.sin((state.psychPhase || 0) * 55) > 0) || (state.shockFlash > 0.55);
      if (flicker) {
        ctx.filter = "brightness(2.4) saturate(0.3) hue-rotate(160deg)";
      } else {
        ctx.filter = "brightness(1.7) contrast(1.3)";
      }
      ctx.shadowColor = "#7dffef";
      ctx.shadowBlur = 18;
    }
    var drawZ = state.playerZ;
    var destY = drawPlayerNow.destY;
    var pScale = (state.config.spriteScalePlayer != null ? state.config.spriteScalePlayer : 1.5);
    if (state.playerElevScale) pScale *= state.playerElevScale;
    // sega35: tunnel shrink-in/out — scale toward mouth/VP; NEVER hide player (min scale enforced)
    var tunnelScale = 1;
    if (ns.Sega31x && ns.Sega31x.tunnelPlayerDrawScale) {
      tunnelScale = ns.Sega31x.tunnelPlayerDrawScale(state);
    } else if (state._tunnelPlayerScale != null) {
      tunnelScale = state._tunnelPlayerScale;
    }
    if (tunnelScale < 0.08 && state._tunnelExitConverge == null) tunnelScale = 0.08;
    pScale *= tunnelScale;
    if (state._tunnelPlayerOffY) {
      destY = destY + height * state._tunnelPlayerOffY;
    }
    // sega37: outside tunnel OutRun keeps player centered (road/camera shifts with playerX).
    // sega45: interior / hidden road → tweened lane X (smooth, no snap). Approach with the camera
    // centred → her real projected lane X on the (centred) road, which also tweens with playerX.
    var playerDrawXBase = width / 2;
    var interiorLaneX = (state.config && state.config.tunnelPlayerLaneScreenX !== false) &&
      (state.inTunnel || state._tunnelHideRoad ||
       state._tunnelPhase === 'blackIn' || state._tunnelPhase === 'blackHold' || state._tunnelPhase === 'inside' ||
       state._tunnelPhase === 'shrinkOut' || state._tunnelPhase === 'whiteUp' ||
       state._tunnelPhase === 'blackOut' || state._tunnelPhase === 'roadWait');
    if (interiorLaneX) {
      playerDrawXBase = tunnelTweenLaneX(state);
    } else if (!(state._camCenterK > 0)) {
      var gRowY0 = height * ((state.config && state.config.playerShadowScreenY != null) ? state.config.playerShadowScreenY : 0.94);
      var row0 = roadRowAt(state, gRowY0); if (row0) state._roadRowWAtPlayer = row0.w;
    }
    if (interiorLaneX) {
    } else if (state._camCenterK > 0) {
      // her real lane position on the centred road, at her ground row (shadow Y)
      var gRowY = height * ((state.config && state.config.playerShadowScreenY != null) ? state.config.playerShadowScreenY : 0.94);
      var row = roadRowAt(state, gRowY);
      if (row) {
        state._roadRowWAtPlayer = row.w;
        playerDrawXBase = row.x + (state.playerX || 0) * row.w;
        var mxf = (state.config && state.config.tunnelApproachPlayerMinXFrac != null) ? state.config.tunnelApproachPlayerMinXFrac : 0.15;
        playerDrawXBase = Math.max(width * mxf, Math.min(width * (1 - mxf), playerDrawXBase));
      }
    }
    if (state._tunnelPlayerOffX) {
      playerDrawXBase = playerDrawXBase + width * state._tunnelPlayerOffX;
    }
    // sega48: exit shrink converges on the vanishing point (offset from VP scales with her size)
    var exitConv = state._tunnelExitConverge;
    if (exitConv != null) {
      var cfgE = state.config || {};
      var vx = width * (cfgE.tunnelExitTargetX != null ? cfgE.tunnelExitTargetX : 0.5);
      var vy = height * (cfgE.tunnelExitTargetY != null ? cfgE.tunnelExitTargetY : 0.48);
      playerDrawXBase = vx + (playerDrawXBase - vx) * exitConv;
      destY = vy + (destY - vy) * exitConv;
    } else
    // Aim slightly toward mouth center while shrinking
    if ((state._tunnelPlayerShrink > 0.001 || state._tunnelExitShrink > 0.001) && state._tunnelMouthRect) {
      var mr = state._tunnelMouthRect;
      var uAim = Math.max(state._tunnelPlayerShrink || 0, state._tunnelExitShrink || 0);
      playerDrawXBase = playerDrawXBase + (mr.cx - playerDrawXBase) * uAim * 0.35;
      destY = destY + (mr.cy - destY) * uAim * 0.55;
    }
    // sega31n: apply elev Y during winCruise BEFORE centerY/horizon blend (no ground snap)
    // sega35: skip re-blend while tunnel shrink aims toward mouth (would fight OffY)
    var tunnelShrinking = (state._tunnelPlayerShrink > 0.001) || (state._tunnelExitShrink > 0.001) || (exitConv != null);
    if (state.playerElevScreenY != null && !tunnelShrinking) {
      var elevTargetY = height * state.playerElevScreenY;
      destY = destY + (elevTargetY - destY) * 0.85;
    }
    var midY = height * 0.5;
    if (state.finaleMode === "winCruise") {
      var blend = Util.limit(state.winCenterBlend || 0, 0, 1);
      destY = destY + (midY - destY) * blend;
      drawZ = state.playerZ + Math.max(0, state.winRideAhead || 0);
      var finalTop = (state.config && state.config.winFinalTopPx != null)
        ? state.config.winFinalTopPx : 10;
      var horizonY = finalTop;
      var zRatio = state.playerZ / Math.max(state.playerZ + 1, drawZ);
      destY = horizonY + (destY - horizonY) * zRatio;
      if (state.winPlayerAlpha != null) {
        ctx.globalAlpha = Util.limit(state.winPlayerAlpha, 0, 1);
      }
    }
    state._playerDrawDestY = destY;
    state._playerDrawDestX = playerDrawXBase;
    // sega31o: drawn player sprite H for head-aim offset (feet at destY, offsetY=-1)
    try {
      var sprH = (typeof SPRITES !== "undefined" && SPRITES.PLAYER_STRAIGHT) ? SPRITES.PLAYER_STRAIGHT.h : 110;
      var sc = (typeof SPRITES !== "undefined" && SPRITES.SCALE) ? SPRITES.SCALE : 0.00214;
      state._playerDrawH = sprH * (state.cameraDepth / Math.max(1, drawZ)) * pScale * (width / 2) * sc * state.roadWidth;
    } catch (eH) {
      state._playerDrawH = height * 0.14;
    }
    if (!(state.finaleMode === "winCruise" && (state.winPlayerAlpha || 1) <= 0.01)) {
      var playerUpdown = drawPlayerNow.updown;
      var cfgP = state.config || {};
      if (cfgP.uphillPosesDistinctFromFlat === false || cfgP.nixUphillPlayerFrame || cfgP.playerUphillFrameDisabled) {
        playerUpdown = 0;
      }
      // sega31k: zap hit — rapid flip between PLAYER_LEFT / PLAYER_RIGHT
      // sega31s: zap shake −30% (zapHitShakeMult 0.70) — slower flip + smaller X jitter
      var steerAmt = state.speed * drawPlayerNow.steerLean * 0.35;
      // sega45 D: tunnel path — lean only during the lane move (road may be frozen → speed-independent)
      if (drawPlayerNow.tunnelForced) steerAmt = drawPlayerNow.steerLean;
      var zapShakeMult = (cfgP.zapHitShakeMult != null) ? cfgP.zapHitShakeMult : 1;
      if ((cfgP.zapHitShakeLeftRight !== false) && state.shockFlash > 0) {
        var tick = (typeof performance !== "undefined" ? performance.now() : Date.now());
        var flipMs = 35 / Math.max(0.05, zapShakeMult); // ×0.70 → slower flips (−30% rate)
        steerAmt = ((Math.floor(tick / flipMs) % 2) === 0) ? -1 : 1;
      }
      var playerDrawX = (typeof playerDrawXBase === 'number') ? playerDrawXBase : (width / 2);
      // sega31q+ editor: ground shadow — fixed low screen Y (not elev) in normal play,
      // tracks player X; darker than road rgb(50,40,69); screen-relative for phones.
      // Elevation scale: full at elevGround, → playerShadowMinScale (0) at elevCeiling
      // when playerShadowShrinkAmount=1.0. winCruise: optional Y follows player draw Y.
      if (cfgP.playerGroundShadow !== false &&
          !(ns.Sega31x && ns.Sega31x.winShadowSuppressed && ns.Sega31x.winShadowSuppressed(state))) {
        var shY = height * (cfgP.playerShadowScreenY != null ? cfgP.playerShadowScreenY : 0.94);
        if (cfgP.playerShadowFollowsPlayerYOnWinCruise !== false && state.finaleMode === "winCruise") {
          shY = destY; // track sky takeoff / YOU WIN draw Y
        }
        var shRx = width * (cfgP.playerShadowWOfWidth != null ? cfgP.playerShadowWOfWidth : 0.16);
        var shRy = width * (cfgP.playerShadowHOfWidth != null ? cfgP.playerShadowHOfWidth : 0.028);
        var shA = cfgP.playerShadowAlpha != null ? cfgP.playerShadowAlpha : 0.78;
        var shElevScale = 1;
        if (cfgP.playerShadowScalesWithElev !== false) {
          var shGroundY = cfgP.elevTier1ScreenY != null ? cfgP.elevTier1ScreenY : 0.99;
          var shTopY = cfgP.elevCeilingScreenY != null ? cfgP.elevCeilingScreenY
            : (cfgP.elevCeiling != null ? cfgP.elevCeiling : 0.7125);
          var shCurY = state.playerElevScreenY != null ? state.playerElevScreenY : shGroundY;
          var shSpan = shGroundY - shTopY;
          var elevProg = shSpan > 1e-6
            ? Math.max(0, Math.min(1, (shGroundY - shCurY) / shSpan))
            : 0;
          var shMin = cfgP.playerShadowMinScale != null ? cfgP.playerShadowMinScale : 0;
          // shrinkAmt 1.0 → full fade at ceiling; was 0.25 → min ~0.75
          var shrinkAmt = cfgP.playerShadowShrinkAmount != null
            ? cfgP.playerShadowShrinkAmount
            : (1 - shMin);
          shElevScale = 1 - elevProg * shrinkAmt;
          if (shMin > 0) shElevScale = Math.max(shMin, shElevScale);
          if (cfgP.playerShadowFullAtGround !== false && elevProg <= 0) shElevScale = 1;
        }
        if (shElevScale > 0.001) {
          shRx *= shElevScale;
          shRy *= shElevScale;
          ctx.save();
          ctx.filter = "none";
          ctx.shadowBlur = 0;
          ctx.globalAlpha = Util.limit(shA, 0, 1) * (state.winPlayerAlpha != null ? Util.limit(state.winPlayerAlpha, 0, 1) : 1);
          ctx.fillStyle = cfgP.playerShadowColor || "rgb(18, 12, 28)";
          ctx.translate(playerDrawX, shY);
          ctx.scale(Math.max(0.001, shRx), Math.max(0.001, shRy));
          ctx.beginPath();
          ctx.arc(0, 0, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      Render.player(
        ctx, width, height, state.resolution, state.roadWidth, state.sprites,
        state.speed / state.maxSpeed,
        (state.cameraDepth / drawZ) * pScale,
        playerDrawX, destY,
        steerAmt, playerUpdown
      );
      // sega31z: player-hit red-diff overlay (brain zap/damage) matching steer pose
      drawPlayerHitRedDiff(state, ctx, width, height, playerDrawX, destY, steerAmt, pScale, drawZ);
    }
    ctx.restore();
    if (state.shockFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.shockFlash * 0.55);
      ctx.fillStyle = "#aefcff";
      ctx.fillRect(width * 0.26, destY - 80, width * 0.48, 110);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = state.shockFlash * 0.45;
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#7dffef";
      ctx.shadowBlur = 20;
      var px0 = width / 2;
      var pj;
      for (pj = 0; pj < 3; pj++) {
        ctx.beginPath();
        ctx.moveTo(px0 + (pj - 1) * 18, destY - 90);
        ctx.lineTo(px0 + (Math.random() - 0.5) * 40, destY - 30);
        ctx.lineTo(px0 + (pj - 1) * 22, destY + 20);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ns.Renderer = {
    render: function(state) {
      // sega43: nuke detonation screen shake (decays over blast window)
      var shake = nukeSegaShake(state);
      if (shake) {
        state.ctx.save();
        state.ctx.fillStyle = "#000";
        state.ctx.fillRect(0, 0, state.width, state.height);
        state.ctx.translate(shake.x, shake.y);
      }
      renderWorld(state);
      if (state.finaleMode !== "karaoke") {
        drawRoadProps(state);
        drawScreenHearts(state);
        if (ns.Brains && ns.Brains.render && !(ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showBrains"))) {
          ns.Brains.render(state);
        }
        // sega31k: player always in front of brains
        drawPlayerDeferred(state);
        if (ns.Fx && ns.Fx.render && !(ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showFx"))) {
          ns.Fx.render(state);
        }
        renderEffects(state);
        if (shake) { state.ctx.restore(); shake = null; }
        renderNukeFlash(state);
        renderNukeDetFlash(state);
        renderInvasion(state);
        drawTier3Timer(state);
        // sega28: fail banner in front of brains/sprites (end of frame)
        drawFailHumanityBanner(state, state.ctx, state.width, state.height);
      } else {
        // Still show fail banner if somehow set during karaoke
        drawFailHumanityBanner(state, state.ctx, state.width, state.height);
      }
      if (shake) { state.ctx.restore(); }
      // sega43: pure-black tunnel hold (after full entry, before interior) — over EVERYTHING
      var hold = state._tunnelPhase === "blackHold";
      if (hold) {
        state.ctx.save();
        state.ctx.setTransform(1, 0, 0, 1, 0, 0);
        state.ctx.globalAlpha = 1;
        state.ctx.fillStyle = "#000";
        state.ctx.fillRect(0, 0, state.width, state.height);
        state.ctx.restore();
      }
      // sega45: tunnel exit WHITE-OUT (over everything, incl. player)
      if (state._tunnelWhite > 0.001) {
        state.ctx.save();
        state.ctx.setTransform(1, 0, 0, 1, 0, 0);
        state.ctx.globalAlpha = Math.min(1, state._tunnelWhite);
        state.ctx.fillStyle = "#fff";
        state.ctx.fillRect(0, 0, state.width, state.height);
        state.ctx.restore();
      }
      if (state._lyricsHiddenForHold !== hold) {
        state._lyricsHiddenForHold = hold;
        try {
          var lyrEl = document.getElementById("lyrics");
          if (lyrEl) lyrEl.style.visibility = hold ? "hidden" : "";
        } catch (eLy) {}
      }
    }
  };
})(window.ApexRacer = window.ApexRacer || {});
