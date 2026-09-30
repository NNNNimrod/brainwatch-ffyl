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
  var PRE_NUKE_KEYS = ["dusk-clean", "violet", "green-clean", "night-synth"]; // sega54: + photo night-synthwave (verse 1)
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

  // sega54: boss-stage Capitol green flicker. Irregular pops: gap in [GapMin, GapMax] s, on for [OnMin, OnMax] s,
  // with random 1-frame stutter-outs while on (StutterChance) — green pops in briefly, fiery stays the base.
  var CAPITOL_POSTNUKE_MASK = [0.64, 0.627, 0.627, 0.64, 0.64, 0.681, 0.633, 0.637, 0.521, 0.521, 0.56, 0.56, 0.615, 0.615, 0.802, 0.615, 0.617, 0.56, 0.56, 0.521, 0.521, 0.637, 0.633, 0.681, 0.64, 0.64, 0.627, 0.656, 0.637, 0.633, 0.61, 0.608, 0.608, 0.562, 0.581, 0.54, 0.56, 0.721, 0.721, 0.721, 0.721, 0.721, 0.604, 0.598, 0.598, 0.585, 0.596, 0.585, 0.581, 0.594, 0.558, 0.577, 0.562, 0.556, 0.537, 0.533, 0.506, 0.492, 0.383, 0.308, 0.256, 0.233, 0.206, 0.087, 0.065, 0.065, 0.206, 0.235, 0.254, 0.31, 0.379, 0.4, 0.469, 0.477, 0.504, 0.517, 0.521, 0.51, 0.523, 0.54, 0.537, 0.542, 0.556, 0.565, 0.571, 0.569, 0.567, 0.577, 0.581, 0.588, 0.594, 0.598, 0.602, 0.721, 0.721, 0.721, 0.602, 0.604, 0.721, 0.606, 0.613, 0.613, 0.621, 0.583, 0.217, 0.571, 0.6, 0.606, 0.115, 0.629, 0.66, 0.66, 0.629, 0.115, 0.606, 0.6, 0.571, 0.217, 0.583, 0.621, 0.613, 0.613, 0.606, 0.721, 0.604, 0.602, 0.721, 0.721];
  // sega54: lightning/skyline mask of the OPEN (burst) dome — no lantern/statue, jagged shards (gen_capitol.py v4)
  var CAPITOL_POSTNUKE_OPEN_MASK = [0.64, 0.627, 0.627, 0.64, 0.64, 0.681, 0.633, 0.637, 0.521, 0.521, 0.56, 0.56, 0.615, 0.615, 0.802, 0.615, 0.617, 0.56, 0.56, 0.521, 0.521, 0.637, 0.633, 0.681, 0.64, 0.64, 0.627, 0.656, 0.637, 0.633, 0.61, 0.608, 0.608, 0.562, 0.581, 0.54, 0.56, 0.721, 0.721, 0.721, 0.721, 0.721, 0.604, 0.598, 0.598, 0.585, 0.596, 0.585, 0.581, 0.594, 0.558, 0.577, 0.562, 0.556, 0.537, 0.533, 0.506, 0.492, 0.215, 0.227, 0.244, 0.252, 0.233, 0.244, 0.237, 0.227, 0.235, 0.235, 0.208, 0.202, 0.379, 0.4, 0.469, 0.477, 0.504, 0.517, 0.521, 0.51, 0.523, 0.54, 0.537, 0.542, 0.556, 0.565, 0.571, 0.569, 0.567, 0.577, 0.581, 0.588, 0.594, 0.598, 0.602, 0.721, 0.721, 0.721, 0.602, 0.604, 0.721, 0.606, 0.613, 0.613, 0.621, 0.583, 0.217, 0.571, 0.6, 0.606, 0.115, 0.629, 0.66, 0.66, 0.629, 0.115, 0.606, 0.6, 0.571, 0.217, 0.583, 0.621, 0.613, 0.613, 0.606, 0.721, 0.604, 0.602, 0.721, 0.721];
  function capitolGreenK54(state, c, t) {
    function rnd(a, b) { return a + Math.random() * Math.max(0, b - a); }
    var gMin = c.bossBgCapitolGreenGapMinSec != null ? c.bossBgCapitolGreenGapMinSec : 0.35;
    var gMax = c.bossBgCapitolGreenGapMaxSec != null ? c.bossBgCapitolGreenGapMaxSec : 2.2;
    var oMin = c.bossBgCapitolGreenOnMinSec != null ? c.bossBgCapitolGreenOnMinSec : 0.05;
    var oMax = c.bossBgCapitolGreenOnMaxSec != null ? c.bossBgCapitolGreenOnMaxSec : 0.4;
    var popP = c.bossBgCapitolGreenPopChance != null ? c.bossBgCapitolGreenPopChance : 0.8;
    var stut = c.bossBgCapitolGreenStutterChance != null ? c.bossBgCapitolGreenStutterChance : 0.25;
    var alpha = c.bossBgCapitolGreenAlpha != null ? c.bossBgCapitolGreenAlpha : 1.0;
    var g = state._capG;
    if (!g || t < g.t0 - 0.05 || t - g.t0 > 30) g = state._capG = { on: false, t0: t, until: t + rnd(gMin, gMax) };
    var guard = 0;
    while (t >= g.until && guard++ < 50) {
      g.t0 = g.until;
      if (g.on) { g.on = false; g.until = g.t0 + rnd(gMin, gMax); }
      else if (Math.random() < popP) { g.on = true; g.until = g.t0 + rnd(oMin, oMax); }
      else { g.until = g.t0 + rnd(gMin, gMax); }                      // skipped pop -> irregular rhythm
    }
    if (!g.on) return 0;
    if (Math.random() < stut) return 0;                                // stutter-out frame
    return Math.max(0, Math.min(1, alpha));
  }
  // sega54: dome-reveal timing (the Capitol dome is the alien's skull: cracks -> burst -> brain rises out as the boss)
  function domeReveal54(state) {
    var c = state.config || {};
    var on = c.bossDomeRevealOn !== false && c.bossBgCapitolOn !== false;
    var cs = c.bossDomeCrackStartSec != null ? c.bossDomeCrackStartSec : 185.22;
    var cd = Math.max(0.1, c.bossDomeCrackDurSec != null ? c.bossDomeCrackDurSec : 1.6);
    var burst = cs + cd;
    var rs = c.bossRiseFromDomeSec != null ? c.bossRiseFromDomeSec : burst + 0.15;
    var rd = Math.max(0.2, c.bossRiseDurSec != null ? c.bossRiseDurSec : 2.5);
    var pg = c.bossDomePreGlowStartSec != null ? c.bossDomePreGlowStartSec : 184.6;
    return { on: on, crackStart: cs, crackDur: cd, burst: burst, riseStart: rs, riseDur: rd,
      preGlowOn: c.bossDomePreGlowOn !== false, preGlow: pg };
  }
  // sega54: fire colour-cycling + crack overlays, built once from the 320x120 masks (R = phase/order, G = level)
  var FIRE_CYCLE_PALS = {
    fire: { hot: ["#fff0a0", "#ffd060", "#ffb040", "#ff8a2a", "#ffb040", "#ffd060", "#fff6c0", "#ffe080"],
            edge: ["#c2261a", "#ff5a1a", "#ff8a2a", "#ffb040", "#ff6a1a", "#d4461a", "#8a1a10", "#e03a14"] },
    toxic: { hot: ["#f0ffb0", "#d8ff60", "#b0ff40", "#7aff3a", "#b0ff40", "#d8ff60", "#f6ffd0", "#e0ff80"],
            edge: ["#1a8a1a", "#3ac21a", "#6aff2a", "#b0ff40", "#5ae02a", "#2aa01a", "#0e5a10", "#46d41a"] },
    plasma: { hot: ["#ffe0ff", "#ff9ef0", "#ff4fd0", "#d04dff", "#ff4fd0", "#ff9ef0", "#fff0ff", "#ffc0f8"],
            edge: ["#5a1a8a", "#8a2ad0", "#b04dff", "#ff4fd0", "#a03ae0", "#6a1aa0", "#3a0a5a", "#c040f0"] }
  };
  function maskPixels54(img) {
    if (!img || !(img.width > 0) || typeof document === "undefined") return null;
    if (img._px54) return img._px54;
    try {
      var cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
      var cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
      img._px54 = { w: img.width, h: img.height, d: cx.getImageData(0, 0, img.width, img.height).data };
    } catch (e) { img._px54 = null; }
    return img._px54;
  }
  function hexRgb54(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function fireCycleFrame54(state, palName, step) {
    var m = maskPixels54((state._capitolFx || {}).fire);
    if (!m) return null;
    var cache = state._fireCyc54 || (state._fireCyc54 = {});
    var key = palName + ":" + step;
    if (cache[key]) return cache[key];
    var pal = FIRE_CYCLE_PALS[palName] || FIRE_CYCLE_PALS.fire, N = pal.hot.length;
    var hot = pal.hot.map(hexRgb54), edge = pal.edge.map(hexRgb54);
    var cv = document.createElement("canvas"); cv.width = m.w; cv.height = m.h;
    var cx = cv.getContext("2d"), id = cx.createImageData(m.w, m.h), o = id.data, i;
    for (i = 0; i < m.w * m.h; i++) {
      var ph = m.d[i * 4], lv = m.d[i * 4 + 1];
      if (!ph) continue;
      var col = (lv >= 3 ? hot : edge)[((ph - 1) + step) % N];
      o[i * 4] = col[0]; o[i * 4 + 1] = col[1]; o[i * 4 + 2] = col[2]; o[i * 4 + 3] = 255;
    }
    cx.putImageData(id, 0, 0);
    cache[key] = cv;
    return cv;
  }
  function crackFrame54(state, green, k) {   // k = 1..8 (progress eighths)
    var m = maskPixels54((state._capitolFx || {}).crack);
    if (!m) return null;
    var cache = state._crackCyc54 || (state._crackCyc54 = {});
    var key = (green ? "g" : "f") + k;
    if (cache[key]) return cache[key];
    var core = hexRgb54(green ? "#f0ffb0" : "#fff0a0"), rim = hexRgb54(green ? "#6aff2a" : "#ff8a2a");
    var lim = Math.round(255 * k / 8), maxO = 0, i;
    for (i = 0; i < m.w * m.h; i++) if (m.d[i * 4] > maxO) maxO = m.d[i * 4];
    lim = Math.round(maxO * k / 8);
    var cv = document.createElement("canvas"); cv.width = m.w; cv.height = m.h;
    var cx = cv.getContext("2d"), id = cx.createImageData(m.w, m.h), o = id.data;
    for (i = 0; i < m.w * m.h; i++) {
      var ov = m.d[i * 4];
      if (!ov || ov > lim) continue;
      var col = (lim - ov < maxO * 0.12) ? core : rim;   // freshest crack tips burn white-hot
      o[i * 4] = col[0]; o[i * 4 + 1] = col[1]; o[i * 4 + 2] = col[2]; o[i * 4 + 3] = 255;
    }
    cx.putImageData(id, 0, 0);
    cache[key] = cv;
    return cv;
  }
  function blockyEllipse54(ctx, cx, cy, rx, ry, step) {
    step = Math.max(1, step);
    for (var y = -ry; y <= ry; y += step) {
      var w = rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)));
      w = Math.floor(w / step) * step;
      if (w > 0) ctx.fillRect(Math.round((cx - w) / step) * step, Math.round((cy + y) / step) * step, 2 * w, step);
    }
  }
  // draws the per-layer Capitol fx (fire cycle, crack progress, burst flash + falling chunks) in the layer's space
  // sega54: retro 8-bit pixel fonts for all canvas text (uiFontTitle / uiFontBody / uiFontScale cells);
  // Press Start 2P sizes snapped to its 8-px grid (x0.62: it is ~1.8x wider than the old Impact/Trebuchet)
  function pixFont54(state, px, kind) {
    var c = (state && state.config) || {}, sc = c.uiFontScale != null ? +c.uiFontScale : 1;
    if (kind === "body") return Math.max(14, Math.round(px * 1.3 * sc / 2) * 2) + "px " + (c.uiFontBody || '"VT323", "Courier New", monospace');
    return Math.max(8, Math.round(px * 0.62 * sc / 8) * 8) + "px " + (c.uiFontTitle || '"Press Start 2P", "Courier New", monospace');
  }
  function drawCapitolFx54(state, ctx, key, r, img54) {
    if (!r || key.indexOf("capitol-") !== 0) return;
    var c = state.config || {};
    var t = state.songClock != null ? state.songClock : 0;
    var green = key.indexOf("capitol-green") === 0;
    var prevSm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    if (c.bossFireCycleOn !== false) {
      var pn = c.bossFireCyclePalette || "auto";
      if (pn === "auto") pn = green ? "toxic" : "fire";
      var sp = c.bossFireCycleSpeed != null ? c.bossFireCycleSpeed : 10;
      var fr = fireCycleFrame54(state, pn, Math.floor(t * sp) % 8);
      if (fr) ctx.drawImage(fr, r.x, r.y, r.w, r.h);
    }
    var dv = domeReveal54(state);
    var ppx = r.w / 1280;                                   // plate px -> layer px
    var dX = r.x + 640 * ppx, dY = r.y + (c.bossDomeCavityY != null ? c.bossDomeCavityY : 138) * ppx;
    // sega54: pre-burst — the dome (skull) VIBRATES and the brain's purple glow FLASHES out through/around it
    var vibOn = dv.on && dv.preGlowOn && t >= dv.preGlow && t < dv.burst;
    var vx = 0, vy = 0, ramp = 0;
    if (vibOn) {   // sega54: one vibration offset per layer per frame, shared by the dome crop, glow AND the cracks
      ramp = Math.min(1, (t - dv.preGlow) / Math.max(0.1, dv.burst - dv.preGlow));
      var vpx = (c.bossDomeVibratePx != null ? c.bossDomeVibratePx : 3) * (0.4 + 0.6 * ramp);
      var vhz = c.bossDomeVibrateHz != null ? c.bossDomeVibrateHz : 22;
      vx = Math.round(Math.sin(t * vhz * 6.283) * vpx + (Math.random() * 2 - 1) * vpx * 0.5);
      vy = Math.round(Math.cos(t * vhz * 4.9) * vpx * 0.5);
    }
    if (vibOn && img54) {
      // redraw the dome crop of the plate, offset (plate px 560..720 x 20..250)
      try { ctx.drawImage(img54, 560, 20, 160, 230, r.x + (560 + vx) * ppx, r.y + (20 + vy) * ppx, 160 * ppx, 230 * ppx); } catch (eV) {}
      var fhz = c.bossDomePreGlowFlashHz != null ? c.bossDomePreGlowFlashHz : 129 / 60 * 2;
      var fl = Math.pow(Math.max(0, Math.sin(t * fhz * Math.PI)), 8);    // sharp flashes
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha *= Math.min(1, (0.25 + 0.75 * ramp) * (0.2 + 0.8 * fl));
      ctx.fillStyle = green ? "#6aff3a" : "#b04dff";
      blockyEllipse54(ctx, dX + vx * ppx, dY - 40 * ppx, (70 + 30 * fl) * ppx, (72 + 24 * fl) * ppx, 4 * ppx);
      ctx.fillStyle = green ? "#d8ff90" : "#ff6fe8";
      blockyEllipse54(ctx, dX + vx * ppx, dY - 38 * ppx, 40 * ppx, 50 * ppx, 4 * ppx);
      ctx.restore();
    }
    if (dv.on && t >= dv.crackStart && t < dv.burst) {
      var k = Math.max(1, Math.min(8, Math.ceil(((t - dv.crackStart) / dv.crackDur) * 8)));
      var ck = crackFrame54(state, green, k);
      // glow swells behind the cracks, then the cracks themselves
      var gA = 0.15 + 0.5 * ((t - dv.crackStart) / dv.crackDur);
      ctx.save();
      ctx.globalAlpha *= gA * (0.8 + 0.2 * Math.sin(t * 40));
      ctx.fillStyle = green ? "#7aff3a" : "#ff8a2a";
      blockyEllipse54(ctx, dX + vx * ppx, dY + (vy - 14) * ppx, 50 * ppx, 40 * ppx, 4 * ppx);
      ctx.restore();
      if (ck) ctx.drawImage(ck, r.x + vx * ppx, r.y + vy * ppx, r.w, r.h);   // cracks shake with the dome
    }
    if (dv.on && !green && t >= dv.burst && t < dv.burst + 2.2) {
      var bt = t - dv.burst;
      // burst flash (pink/white, blocky)
      if (bt < 0.5) {
        ctx.save();
        ctx.globalAlpha *= (1 - bt / 0.5);
        ctx.fillStyle = "#ffd0f4"; var fw = (60 + bt * 200) * ppx;
        blockyEllipse54(ctx, dX, dY - fw * 0.2, fw, fw * 0.7, 4 * ppx);
        ctx.fillStyle = "#ffffff"; blockyEllipse54(ctx, dX, dY - fw * 0.2, fw * 0.45, fw * 0.32, 4 * ppx);
        ctx.restore();
      }
      // falling chunks of dome (deterministic): pieces fly up/out, then fall, snapped to the 4-px Sega grid
      var n = Math.max(0, c.bossDomeChunkCount != null ? c.bossDomeChunkCount : 18), i2;
      var cols = ["#d8b890", "#9a7a5a", "#e6cfb4", "#3a1a10", "#ffb040"];
      for (i2 = 0; i2 < n; i2++) {
        var h1 = Math.sin(i2 * 12.9898) * 43758.5453; h1 -= Math.floor(h1);
        var h2 = Math.sin(i2 * 78.233) * 12345.678; h2 -= Math.floor(h2);
        var vx = (h1 * 2 - 1) * 170, vy = -(120 + h2 * 220), g = 520;
        var px = 640 + (h1 * 2 - 1) * 30 + vx * bt, py = 128 + vy * bt + 0.5 * g * bt * bt;
        if (py > 400) continue;
        var sz = 4 * (1 + Math.floor(h2 * 3));
        ctx.fillStyle = cols[i2 % cols.length];
        ctx.fillRect(r.x + Math.round(px / 4) * 4 * ppx, r.y + Math.round(py / 4) * 4 * ppx, sz * ppx, sz * ppx);
      }
    }
    ctx.imageSmoothingEnabled = prevSm;
  }

  // sega54: erratic jolt for the green Capitol layer (fiery base stays steady): new random offset every JumpEverySec,
  // +/- JumpPxX/Y (canvas px), scale 1 +/- ScaleJitter around the horizon anchor.
  function capitolJolt54(state, key) {
    if (key !== "capitol-green") return null;
    var c = state.config || {};
    var t = state.songClock != null ? state.songClock : 0;
    var ev = Math.max(0.016, c.bossBgCapitolJumpEverySec != null ? c.bossBgCapitolJumpEverySec : 0.05);
    var j = state._capJ;
    if (!j || t >= j.next || t < j.next - ev * 4) {
      var px = c.bossBgCapitolJumpPxX != null ? c.bossBgCapitolJumpPxX : 18;
      var py = c.bossBgCapitolJumpPxY != null ? c.bossBgCapitolJumpPxY : 10;
      var sj = c.bossBgCapitolScaleJitter != null ? c.bossBgCapitolScaleJitter : 0.04;
      j = state._capJ = { next: t + ev * (0.5 + Math.random()), x: (Math.random() * 2 - 1) * px, y: (Math.random() * 2 - 1) * py,
        s: 1 + (Math.random() * 2 - 1) * sj };
    }
    return j;
  }

  // Returns [{img, a, key}] bottom → top.
  function computeBgMix(state) {
    var c = state.config || {};
    var t = state.songClock != null ? state.songClock : 0;
    if (state.postNukeFire) {
      // sega54: BOSS STAGE Capitol — fiery plate steady as the base, radioactive-green twin flickers in (and jolts)
      state._capitolBossActive = false; state._capitolOpen54 = false;
      if (c.bossBgCapitolOn !== false) {
        var cpS = c.bossBgCapitolStartSec != null ? c.bossBgCapitolStartSec : 184.0; // sega54: intact dome seen first
        var cpE = c.bossBgCapitolEndSec != null ? c.bossBgCapitolEndSec : 999;
        var cpF = stripImg(state, "capitol-fire");
        if (cpF && t >= cpS && t < cpE) {
          state._capitolBossActive = true;
          var cpG = stripImg(state, "capitol-green");
          // sega54: dome reveal — after the burst the dome stays broken open (fiery + green open twins)
          var dRv = domeReveal54(state);
          if (dRv.on && t >= dRv.burst) {
            var cpFo = stripImg(state, "capitol-fire-open"), cpGo = stripImg(state, "capitol-green-open");
            if (cpFo) { cpF = cpFo; state._capitolOpen54 = true; }
            if (cpGo) cpG = cpGo;
            else if (cpFo) cpG = null;   // never pop the INTACT green twin over the open dome
          }
          var gk = cpG ? capitolGreenK54(state, c, t) : 0;
          return gk > 0 ? [{ img: cpF, a: 1, key: "capitol-fire" }, { img: cpG, a: gk, key: "capitol-green" }]
            : [{ img: cpF, a: 1, key: "capitol-fire" }];
        }
      }
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
    // sega52: song-timed pre-nuke timeline (running only): long dusk-clean -> violet crossfade (40.2-58.58),
    // violet held to the chorus, violet -> night greenbelt (59-64), greenbelt pinned until inside the tunnel.
    // Early returns reset _bgMixState so the normal section logic snaps (no stale 1.5 s blend) afterwards.
    if (state.phase === "running") {
      var tl = null;
      var hcOn = c.bgHoldingCrossfadeOn === true;
      var hcS = c.bgHoldingCrossfadeStart != null ? c.bgHoldingCrossfadeStart : 40.2;
      var hcE = c.bgHoldingCrossfadeEnd != null ? c.bgHoldingCrossfadeEnd : 58.58;
      var gbOn = c.greenbeltPlateOn === true && !!stripImg(state, "greenbelt");
      var gbS = c.greenbeltFadeStart != null ? c.greenbeltFadeStart : 59.0;
      var gbD = Math.max(0.05, c.greenbeltFadeSec != null ? c.greenbeltFadeSec : 5.0);
      var gbUntil = c.greenbeltPinUntilSec != null ? c.greenbeltPinUntilSec : 92.0;
      var vFrom = stripImg(state, c.bgHoldingCrossfadeFrom || "dusk-clean");
      var vTo = stripImg(state, c.bgHoldingCrossfadeTo || "violet");
      // sega54 build: PHOTO set — verse 1 = night-synthwave plate until photoNightUntilSec (40.2), cross-fading into the
      // orange plate over the last photoNightFadeSec; then the orange -> violet holding cross-fade below.
      var phN = c.photoPlatesOn !== false ? stripImg(state, "night-synth") : null;
      var phU = c.photoNightUntilSec != null ? c.photoNightUntilSec : 40.2;
      if (phN && t < phU) {
        var phF = Math.max(0, c.photoNightFadeSec != null ? c.photoNightFadeSec : 2.0);
        var phK = phF > 0 ? smoothstep01((t - (phU - phF)) / phF) : 0;
        tl = (vFrom && phK > 0) ? [{ img: phN, a: 1, key: "night-synth" }, { img: vFrom, a: phK, key: c.bgHoldingCrossfadeFrom || "dusk-clean" }]
          : [{ img: phN, a: 1, key: "night-synth" }];
      } else if (hcOn && t >= hcS && t < hcE && vFrom) {
        var hk = (t - hcS) / Math.max(0.05, hcE - hcS);
        hk = c.bgHoldingCrossfadeEase === "linear" ? Math.max(0, Math.min(1, hk)) : smoothstep01(hk);
        tl = vTo ? [{ img: vFrom, a: 1, key: c.bgHoldingCrossfadeFrom || "dusk-clean" }, { img: vTo, a: hk, key: c.bgHoldingCrossfadeTo || "violet" }]
          : [{ img: vFrom, a: 1, key: c.bgHoldingCrossfadeFrom || "dusk-clean" }];
      } else if (hcOn && vTo && t >= hcE && t < gbS) {
        tl = [{ img: vTo, a: 1, key: c.bgHoldingCrossfadeTo || "violet" }];
      } else if (gbOn && t >= gbS && t < gbUntil) {
        var gImg = stripImg(state, "greenbelt");
        var vImg = stripImg(state, "violet") || vTo;
        var gk = smoothstep01((t - gbS) / gbD);
        tl = (vImg && gk < 1) ? [{ img: vImg, a: 1, key: "violet" }, { img: gImg, a: gk, key: "greenbelt" }]
          : [{ img: gImg, a: 1, key: "greenbelt" }];
      }
      // sega54: post-tunnel Austin plate (free-licence skyline photo, Sega-pixelated) replaces green-clean from the
      // white-out (snap, hidden by the white) until postTunnelDawnEndSec, then crossfades into violet.
      if (!tl && c.postTunnelDawnOn !== false) {
        var dwImg = stripImg(state, "austin-free");
        var dwS = c.postTunnelDawnStartSec != null ? c.postTunnelDawnStartSec : 106.82;
        var dwE = c.postTunnelDawnEndSec != null ? c.postTunnelDawnEndSec : 120.5;
        var dwF = Math.max(0, c.postTunnelDawnFadeSec != null ? c.postTunnelDawnFadeSec : 1.5);
        // sega55: diamond2PlateOn -> 120.5-diamond2PlateEndSec uses the synthwave skyline plate instead of violet
        var d2Img = c.diamond2PlateOn !== false ? stripImg(state, "austin-free-synth") : null;
        var d2E = c.diamond2PlateEndSec != null ? c.diamond2PlateEndSec : 155;
        if (dwImg && t >= dwS && t < dwE + dwF) {
          var dwTo = d2Img || stripImg(state, "violet"), dwToK = d2Img ? "austin-free-synth" : "violet";
          if (t < dwE || !dwTo || !(dwF > 0)) tl = [{ img: dwImg, a: 1, key: "austin-free" }];
          else tl = [{ img: dwImg, a: 1, key: "austin-free" }, { img: dwTo, a: smoothstep01((t - dwE) / dwF), key: dwToK }];
        } else if (d2Img && t >= dwE + dwF && t < d2E) {
          tl = [{ img: d2Img, a: 1, key: "austin-free-synth" }];
        }
      }
      if (tl) { if (state._bgMixState) state._bgMixState.img = null; return tl; }
    }
    var key = state.austinBgPlate || (c.austinBgFastStripCritical || ["dusk-clean"])[0];
    if (c.photoPlatesOn !== false && (state.phase === "menu" || state.phase === "countdown") && stripImg(state, "night-synth")) key = "night-synth"; // sega54
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
    if (state._capitolBossActive && c.bossBgCapitolSteadyBase !== false) return null; // sega54: fiery Capitol stays steady
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

  // sega54: skyline mask for the post-tunnel Austin plate (free-licence photo, Sega-pixelated) (128 cols, fraction of plate height where the skyline starts)
  var AUSTIN_FREE_SKYLINE_MASK = [0.283, 0.283, 0.283, 0.283, 0.292, 0.475, 0.475, 0.475, 0.467, 0.475, 0.475, 0.475, 0.475, 0.483, 0.492, 0.492, 0.492, 0.708, 0.708, 0.433, 0.433, 0.425, 0.417, 0.408, 0.442, 0.458, 0.658, 0.658, 0.683, 0.7, 0.708, 0.717, 0.775, 0.775, 0.767, 0.733, 0.717, 0.733, 0.775, 0.692, 0.475, 0.117, 0.058, 0.05, 0.05, 0.042, 0.042, 0.05, 0.058, 0.067, 0.125, 0.225, 0.275, 0.275, 0.283, 0.417, 0.45, 0.65, 0.658, 0.483, 0.458, 0.442, 0.433, 0.417, 0.417, 0.417, 0.408, 0.383, 0.383, 0.492, 0.492, 0.492, 0.492, 0.492, 0.5, 0.5, 0.508, 0.5, 0.5, 0.492, 0.475, 0.475, 0.483, 0.492, 0.483, 0.433, 0.342, 0.292, 0.275, 0.267, 0.25, 0.242, 0.242, 0.308, 0.442, 0.45, 0.5, 0.483, 0.483, 0.5, 0.492, 0.492, 0.617, 0.617, 0.55, 0.45, 0.45, 0.442, 0.45, 0.475, 0.6, 0.608, 0.608, 0.608, 0.625, 0.675, 0.675, 0.675, 0.675, 0.65, 0.65, 0.65, 0.675, 0.7, 0.683, 0.675, 0.683, 0.683];
  // sega54: horizontal pan of a cover-cropped plate (0 = left edge, 0.5 = centred, 1 = right edge); px shift in band space
  function platePanPx54(state, key, img, width, height, cfgBg) {
    if ((key !== "austin-free" && key !== "austin-free-synth") || !img || !(img.width > 0)) return 0;
    var c = state.config || {};
    var ax = c.postTunnelDawnPanX != null ? c.postTunnelDawnPanX : 0.5;
    if (ax === 0.5) return 0;
    var hF = cfgBg.austinBgSingleHFrac != null ? cfgBg.austinBgSingleHFrac : 0.55;
    var sc = Math.max(width / img.width, Math.max(1, height * hF) / img.height) * (cfgBg.austinBgSingleScale != null ? cfgBg.austinBgSingleScale : 1);
    var slack = Math.max(0, img.width * sc - width);
    return (0.5 - Math.max(0, Math.min(1, ax))) * slack;
  }

  function skylineTopsFor(state, key) {
    var m = (state.config && state.config.skylineMask) || {};
    // sega54 build: PHOTO plate set -> its own skyline masks (same keys)
    var mp = (state.config && state.config.photoPlatesOn !== false && state.config.skylineMaskPhoto) || null;
    if (mp) {
      if (key === "night-synth") return mp["night-synth"] || null;
      if (key === "dusk-clean" || key === "violet") return mp.clean || null;
      if (key === "dusk" || key === "acid") return mp[key] || null;
      if (key === "greenbelt" && (state.config.greenbeltPlateMode || "classic") !== "classic") return mp.greenbelt || null; // sega55
    }
    if (key === "dusk" || key === "ember") return m.dusk || null;
    if (key === "acid") return m.acid || null;
    if (key === "greenbelt") return m.greenbelt || m.clean || null; // sega52
    if (key.indexOf("capitol-") === 0) return state._capitolOpen54 ? (m.capitolPostnukeOpen || CAPITOL_POSTNUKE_OPEN_MASK)
      : (m.capitolPostnuke || CAPITOL_POSTNUKE_MASK); // sega54: open mask once the dome has burst
    if (key === "austin-free" || key === "austin-free-synth") return m.austinFreeSkyline || AUSTIN_FREE_SKYLINE_MASK; // sega54 (default until config bake)
    return m.clean || null;
  }

  // sega54: slow per-plate zoom factor (1 = none)
  function plateZoom54(state, key) {
    var c = state.config || {};
    // sega54: boss Capitol plates cancel the global distance zoom (dome + brain spawn stay fully in the band)
    if (key && key.indexOf("capitol-") === 0 && c.bossBgCapitolUnzoom !== false) return 1 / Math.max(0.5, state._bgZoom || 1);
    if (state.postNukeFire || state.phase !== "running") return 1;
    var t = state.songClock != null ? state.songClock : 0;
    function ramp(s0, e0, to) {
      var u = Math.max(0, Math.min(1, (t - s0) / Math.max(0.05, e0 - s0)));
      return 1 + (to - 1) * (u * u * (3 - 2 * u));
    }
    var pinUntil = c.greenbeltPinUntilSec != null ? c.greenbeltPinUntilSec : 92.0;
    if ((key === "dusk-clean" || key === "violet" || key === "prev") && c.bgVioletZoomOn !== false && t < pinUntil) {
      return ramp(c.bgVioletZoomStartSec != null ? c.bgVioletZoomStartSec : 40.2,
        c.bgVioletZoomEndSec != null ? c.bgVioletZoomEndSec : 59.0, c.bgVioletZoomTo != null ? c.bgVioletZoomTo : 1.15);
    }
    if (key === "greenbelt" && c.greenbeltZoomOn !== false) {
      return ramp(c.greenbeltZoomStartSec != null ? c.greenbeltZoomStartSec : 59.0,
        c.greenbeltZoomEndSec != null ? c.greenbeltZoomEndSec : 81.5, c.greenbeltZoomTo != null ? c.greenbeltZoomTo : 1.30);
    }
    return 1;
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
    // sega52: startBgFadeInSec — Austin plate fades in from black over the first N s of the run (smoothstep)
    var sfSec = cfgPz.startBgFadeInSec != null ? cfgPz.startBgFadeInSec : 0;
    if (sfSec > 0 && state.phase === "running" && !state.postNukeFire) {
      var sfT = state.songClock != null ? state.songClock : 0;
      if (sfT < sfSec) {
        var sfU = Math.max(0, sfT / sfSec), sfK = sfU * sfU * (3 - 2 * sfU);
        ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width, height); ctx.restore(); // fade from black, not the sky gradient
        baseA *= sfK;
      }
    }
    state._startBgFadeK = baseA;
    // sega54: per-plate slow zoom (horizon-anchored like the skyline zoom): dusk-clean/violet 1 -> bgVioletZoomTo over
    // bgVioletZoomStartSec..EndSec (held until the tunnel), greenbelt 1 -> greenbeltZoomTo over greenbeltZoomStartSec..EndSec.
    var zTop = 1, zTopA = -1;
    for (i = 0; i < mix.length; i++) {
      if (!(mix[i].a > 0.003)) continue;
      ctx.globalAlpha = baseA * Math.min(1, mix[i].a);
      var pz = plateZoom54(state, mix[i].key);
      if (mix[i].a > zTopA) { zTopA = mix[i].a; zTop = pz; }
      var pnx = platePanPx54(state, mix[i].key, mix[i].img, width, height, cfgBg);
      var jolt = capitolJolt54(state, mix[i].key);
      if (jolt) { pz *= jolt.s; }
      var jx = jolt ? jolt.x : 0, jy = jolt ? jolt.y : 0;
      if (pz !== 1 || jolt) { ctx.save(); ctx.translate(width / 2 + jx, anchorY + jy); ctx.scale(pz, pz); ctx.translate(-width / 2, -anchorY); }
      r = (mix[i].key.indexOf("capitol-") !== 0) ? drawLayeredPlate55(state, ctx, mix[i].key, mix[i].img, width, height, cfgBg, scrollOff, pnx, pz, offX, anchorY) : null; // sega55 bgLayersOn
      if (!r) r = drawBgSingleLayer(ctx, mix[i].img, width, height, cfgBg, scrollOff, pnx);
      if (r && mix[i].key.indexOf("capitol-") === 0) {
        drawCapitolFx54(state, ctx, mix[i].key, r, mix[i].img);
        if (mix[i].key.indexOf("capitol-fire") === 0) {   // dome cavity in screen px (for the boss rise hand-off)
          var dcY = (cfgPz.bossDomeCavityY != null ? cfgPz.bossDomeCavityY : 138);
          var lx = width / 2 + (r.x + r.w * 0.5 - width / 2) * pz, ly = anchorY + (r.y + r.h * (dcY / 480) - anchorY) * pz;
          state._capitolDomeXY = { x: width / 2 + offX + (lx - width / 2) * zsc, y: anchorY + offY + (ly - anchorY) * zsc,
            ppx: (r.w / 1280) * zsc * pz };
        }
      }
      if (pz !== 1 || jolt) ctx.restore();
      if (jolt) r = null; // the lightning clip rect follows the steady fiery base, not the jolting green
      if (r) rect = r;
    }
    ctx.globalAlpha = baseA;
    state._plateZoom54 = zTop;
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
      // sega54: the lightning mask follows the (dominant) plate's zoom
      if (zTop !== 1) { ctx.translate(width / 2, anchorY); ctx.scale(zTop, zTop); ctx.translate(-width / 2, -anchorY); }
      // sega48: skyline clip cached as a Path2D per (plates, rect) instead of rebuilt every frame
      var clipKey = mix.map(function(m) { return m.a > 0.01 ? m.key : ""; }).join("|") + (state._capitolOpen54 ? "#open" : "") + "@" + Math.round(rect.x) + "," + Math.round(rect.y) + "," + Math.round(rect.w) + "," + Math.round(rect.h);
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

  // ===== sega55: LAYERED BACKGROUND (bgLayersOn) — cut each smooth photo plate at runtime into sky / far skyline / near
  // (+ lights & silhouette helpers) using the existing 128-col skyline masks + a per-plate near line; no new image assets.
  function L55cfg(c, k, d) { return c[k] != null ? c[k] : d; }
  function L55keys(c) { return c.bgLayersKeys || ["night-synth", "dusk-clean", "violet", "greenbelt", "austin-free", "austin-free-synth", "dusk", "acid"]; }
  function L55canvas(w, h) { var cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; }
  function L55build(state, key, img) {
    var c = state.config || {};
    var W = img.width, H = img.height;
    var tops = skylineTopsFor(state, key);
    if (!tops || !tops.length || !(W > 0)) return null;
    var nf = (c.bgLayerNearFracByKey || {})[key];
    if (nf == null) nf = 0.82;
    var nearY = Math.round(H * nf), n = tops.length, i, x0, x1, ty;
    var sm = /-smooth\.(jpe?g|png)(\?|$)/i.test(img.src || img.currentSrc || "");
    // SKY: plate with the building region replaced by the sky just above the silhouette (stretched down, then blurred)
    var sky = L55canvas(W, H), sx = sky.getContext("2d");
    sx.drawImage(img, 0, 0);
    for (i = 0; i < n; i++) {
      x0 = Math.floor(i * W / n); x1 = Math.ceil((i + 1) * W / n);
      ty = Math.max(3, Math.floor(tops[i] * H) - 5);
      sx.drawImage(img, x0, ty - 3, x1 - x0, 3, x0, ty - 3, x1 - x0, H - ty + 3);
    }
    var bl = L55canvas(Math.max(8, W >> 6), Math.max(4, H >> 4)), bx = bl.getContext("2d");
    bx.drawImage(sky, 0, 0, bl.width, bl.height);
    sx.save(); sx.beginPath(); sx.moveTo(0, H);
    for (i = 0; i < n; i++) { sx.lineTo(i * W / n, Math.max(0, tops[i] * H - 8)); sx.lineTo((i + 1) * W / n, Math.max(0, tops[i] * H - 8)); }
    sx.lineTo(W, H); sx.closePath(); sx.clip(); sx.imageSmoothingEnabled = true;
    sx.drawImage(bl, 0, 0, bl.width, bl.height, 0, 0, W, H); sx.restore();
    // FAR: silhouette polygon (skyline tops .. near line)
    var far = L55canvas(W, H), fx = far.getContext("2d");
    fx.save(); fx.beginPath(); fx.moveTo(0, nearY + 2);
    for (i = 0; i < n; i++) { fx.lineTo(i * W / n, tops[i] * H - 1); fx.lineTo((i + 1) * W / n, tops[i] * H - 1); }
    fx.lineTo(W, nearY + 2); fx.closePath(); fx.clip(); fx.drawImage(img, 0, 0); fx.restore();
    // NEAR: rows below the near line, soft top edge
    var near = L55canvas(W, H), nx = near.getContext("2d");
    nx.drawImage(img, 0, 0);
    nx.globalCompositeOperation = "destination-in";
    var g = nx.createLinearGradient(0, nearY - 6, 0, nearY + 4); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
    nx.fillStyle = g; nx.fillRect(0, 0, W, H); nx.globalCompositeOperation = "source-over";
    // LIGHTS (half res, white with alpha): bright windows (or fires on post-nuke plates); SIL: black silhouette of FAR
    var hw = W >> 1, hh = H >> 1, lights = L55canvas(hw, hh), lx = lights.getContext("2d"), fire = (key === "dusk" || key === "acid");
    lx.drawImage(far, 0, 0, hw, hh);
    try {
      var id = lx.getImageData(0, 0, hw, hh), d = id.data, p, r, gg, b, a, y, k;
      for (p = 0; p < d.length; p += 4) {
        a = d[p + 3]; if (!a) continue;
        r = d[p] / 255; gg = d[p + 1] / 255; b = d[p + 2] / 255; y = 0.3 * r + 0.59 * gg + 0.11 * b;
        k = fire ? ((r > 0.55 && r > gg * 1.25 && b < 0.55) ? Math.min(1, (r - 0.55) / 0.3) : 0) : Math.max(0, Math.min(1, (y - 0.68) / 0.2));
        d[p] = d[p + 1] = d[p + 2] = 255; d[p + 3] = Math.round(a * k);
      }
      lx.putImageData(id, 0, 0);
    } catch (eL) { lights = null; }
    var sil = L55canvas(hw, hh), slx = sil.getContext("2d");
    slx.drawImage(far, 0, 0, hw, hh); slx.globalCompositeOperation = "source-in"; slx.fillStyle = "#000"; slx.fillRect(0, 0, hw, hh);
    var tint = L55canvas(hw, hh);
    [sky, far, near, lights, sil].forEach(function(cv) { if (cv) cv._smooth54 = sm; });
    return { sky: sky, far: far, near: near, lights: lights, sil: sil, tint: tint, tops: tops, nearF: nf, W: W, H: H, img: img, fire: fire };
  }
  function L55get(state, key, img) {
    var c = state.config || {};
    var cache = state._bgL55 || (state._bgL55 = { m: {}, order: [], builtT: -1 });
    var e = cache.m[key];
    if (e && e.img === img) return e;
    // at most one build per frame (spread the one-off cost)
    var now = (state.elapsed || 0);
    if (cache.builtT === now) return null;
    cache.builtT = now;
    try { e = L55build(state, key, img); } catch (eB) { e = null; }
    if (!e) { cache.m[key] = { img: img, bad: true }; return null; }
    cache.m[key] = e; cache.order = cache.order.filter(function(k) { return k !== key; }); cache.order.push(key);
    var mx = L55cfg(c, "bgLayersCacheMax", 4);
    while (cache.order.length > mx) { delete cache.m[cache.order.shift()]; }
    return e;
  }
  function L55hitShake(state, c) {
    if (c.carHitShakeOn === false || state._carHitShakeAt == null) return null;
    var D = Math.max(0.05, L55cfg(c, "carHitShakeSec", 0.3)), T = (state.elapsed || 0) - state._carHitShakeAt;
    if (!(T >= 0 && T < D)) return null;
    var A = L55cfg(c, "carHitShakePx", 8) * L55cfg(c, "bgLayerFxHitShakeNearMult", 1.5) * Math.pow(1 - T / D, 2);
    return { x: A * Math.sin(T * 71.3 + 1), y: A * 0.6 * Math.cos(T * 63.1) };
  }
  // returns rect like drawBgSingleLayer, or null (caller draws the flat plate)
  function drawLayeredPlate55(state, ctx, key, img, width, height, cfgBg, scrollOff, pnx, pz, offX, anchorY) {
    var c = state.config || {};
    if (c.bgLayersOn === false || L55keys(c).indexOf(key) < 0 || !img || !(img.width > 0)) return null;
    var L = L55get(state, key, img);
    if (!L || L.bad) return null;
    var t = state.songClock != null ? state.songClock : 0;
    var P = (state._bgParallaxX || 0) * L55cfg(c, "bgParallaxGain", 2.0);
    var bandY = height * (cfgBg.austinBgSingleYFrac != null ? cfgBg.austinBgSingleYFrac : 0);
    var bandH = Math.max(1, height * (cfgBg.austinBgSingleHFrac != null ? cfgBg.austinBgSingleHFrac : 0.55));
    var zOf = function(m) { return pz > 0 ? (1 + (pz - 1) * m) / pz : 1; };
    var pmax = Math.abs(L55cfg(c, "bgScrollMaxPx", 24)) * L55cfg(c, "bgParallaxGain", 2.0);
    function xf(k, zm, ex, ey) {
      var ov = 1 + (2 * (pmax * k + Math.abs(ex || 0) + 2)) / Math.max(1, width);
      ctx.translate(width / 2 - offX + P * k + (ex || 0), anchorY + (ey || 0)); ctx.scale(zm * ov, zm * ov); ctx.translate(-width / 2, -anchorY);
    }
    function lay(cv, k, zm, ex, ey) { ctx.save(); xf(k, zm, ex, ey); var r = drawBgSingleLayer(ctx, cv, width, height, cfgBg, scrollOff, pnx); ctx.restore(); return r; }
    var kS = L55cfg(c, "bgParallaxSky", 0.05), kF = L55cfg(c, "bgParallaxFar", 0.25), kN = L55cfg(c, "bgParallaxNear", 0.6);
    var zS = zOf(L55cfg(c, "bgZoomSkyMult", 0.6)), zF = zOf(L55cfg(c, "bgZoomFarMult", 1.0)), zN = zOf(L55cfg(c, "bgZoomNearMult", 1.6));
    var drift = L55cfg(c, "bgSkyDriftPx", 10) * Math.sin(t * 2 * Math.PI / Math.max(1, L55cfg(c, "bgSkyDriftPeriodSec", 40)));
    // ---- SKY + sky-only FX
    var r = lay(L.sky, kS, zS, drift, 0);
    if (!r) return null;
    ctx.save(); xf(kS, zS, drift, 0);
    ctx.beginPath(); ctx.rect(0, bandY, width, bandH); ctx.clip();
    var minTop = 1; for (var q = 0; q < L.tops.length; q++) minTop = Math.min(minTop, L.tops[q]);
    var tintMap = c.bgSkyTintBySection || {};
    var tint = state.sectionId ? tintMap[state.sectionId] : null;
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(r.x, r.y, r.w, r.h * L.nearF); }
    if (c.bgSkySunriseOn !== false && key === "austin-free") {
      var s0 = L55cfg(c, "postTunnelDawnStartSec", 106.82), s1 = L55cfg(c, "postTunnelDawnEndSec", 120.5);
      var su = Math.max(0, Math.min(1, (t - s0) / Math.max(1, s1 - s0)));
      var hy = r.y + r.h * L.nearF, gy = ctx.createLinearGradient(0, hy, 0, hy - r.h * (0.25 + 0.6 * su));
      gy.addColorStop(0, "rgba(" + (c.bgSkySunriseRgb || "255,150,60") + "," + (L55cfg(c, "bgSkySunriseMaxAlpha", 0.45) * su) + ")");
      gy.addColorStop(1, "rgba(" + (c.bgSkySunriseRgb || "255,150,60") + ",0)");
      ctx.fillStyle = gy; ctx.fillRect(r.x, r.y, r.w, r.h * L.nearF);
    }
    if (c.bgSkyStarsOn !== false && (c.bgSkyStarsKeys || ["night-synth", "violet", "greenbelt", "austin-free-synth"]).indexOf(key) >= 0) {
      var ns_ = L55cfg(c, "bgSkyStarsCount", 60), si, seed = 1234;
      var sga = ctx.globalAlpha;
      for (si = 0; si < ns_; si++) {
        seed = (seed * 16807) % 2147483647; var ux = seed / 2147483647;
        seed = (seed * 16807) % 2147483647; var uy = seed / 2147483647;
        seed = (seed * 16807) % 2147483647; var ph = seed / 2147483647 * 6.28;
        var al = 0.25 + 0.75 * Math.abs(Math.sin(t * (1.3 + ph * 0.4) + ph));
        ctx.globalAlpha = sga * al;
        ctx.fillStyle = si % 5 === 0 ? "#9ff6ff" : (si % 7 === 0 ? "#ff9ee8" : "#ffffff");
        var sz = (si % 9 === 0) ? 2 : 1;
        ctx.fillRect(r.x + ux * r.w, r.y + uy * r.h * minTop * 0.92, sz, sz);
      }
      ctx.globalAlpha = sga;
    }
    var flashK = 0;
    if (c.bgSkyNukeFlashOn !== false && L.fire) {
      var ne = nukeWindow(state).end, fS = Math.max(0.1, L55cfg(c, "bgSkyNukeFlashSec", 2.5));
      if (t >= ne && t < ne + fS) flashK = 1 - (t - ne) / fS;
      if (flashK > 0) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,245,220," + (0.85 * flashK) + ")"; ctx.fillRect(r.x, r.y, r.w, r.h * L.nearF); ctx.globalCompositeOperation = "source-over"; }
    }
    ctx.restore();
    // ---- FAR (reveals: post-nuke tower collapse / Greenbelt trees part)
    ctx.save(); xf(kF, zF, 0, 0); ctx.beginPath(); ctx.rect(0, bandY, width, bandH); ctx.clip();
    var sxW = r.w / L.W, syH = r.h / L.H, nearPx = r.y + r.h * L.nearF;
    var colOn = c.bgRevealCollapseOn !== false && L.fire;
    var cs0 = L55cfg(c, "bgRevealCollapseStartSec", 162), cg = L55cfg(c, "bgRevealCollapseGapSec", 1.2), cd = Math.max(0.1, L55cfg(c, "bgRevealCollapseDurSec", 2.0));
    var partOn = c.bgRevealTreesPartOn !== false && key === "greenbelt";
    var p0 = L55cfg(c, "bgRevealTreesPartStartSec", 78.5), p1 = L55cfg(c, "bgRevealTreesPartEndSec", 81.5);
    var pu = partOn ? Math.max(0, Math.min(1, (t - p0) / Math.max(0.1, p1 - p0))) : 0; pu = pu * pu * (3 - 2 * pu);
    if (colOn && t >= cs0) {
      var NS = 16, j, order = [3, 9, 6, 12, 1, 14, 7, 4, 10, 0, 13, 5, 11, 2, 8, 15], tall = L55cfg(c, "bgRevealCollapseTallFrac", 0.55), to = L55cfg(c, "bgRevealCollapseToFrac", 0.72), rank = 0;
      var rk = {}; for (j = 0; j < NS; j++) {
        var c0 = Math.floor(order[j] * L.tops.length / NS), c1 = Math.floor((order[j] + 1) * L.tops.length / NS), mt = 1;
        for (var cc = c0; cc < c1; cc++) mt = Math.min(mt, L.tops[cc]);
        rk[order[j]] = mt < tall ? { i: rank++, mt: mt } : { i: -1, mt: mt };
      }
      for (j = 0; j < NS; j++) {
        var info = rk[j], sw = L.W / NS, sx0 = j * sw, sink = 0;
        if (info.i >= 0) { var u = Math.max(0, Math.min(1, (t - cs0 - info.i * cg) / cd)); u = u * u; sink = Math.max(0, (to - info.mt)) * L.H * u; }
        ctx.save(); ctx.beginPath(); ctx.rect(r.x + sx0 * sxW - 0.5, r.y, sw * sxW + 1, nearPx - r.y); ctx.clip();
        ctx.drawImage(L.far, sx0, 0, sw, L.H, r.x + sx0 * sxW, r.y + sink * syH, sw * sxW, r.h);
        ctx.restore();
      }
    } else if (pu > 0) {
      var sh = pu * L55cfg(c, "bgRevealTreesPartFrac", 0.35) * r.w;
      ctx.drawImage(L.far, 0, 0, L.W / 2, L.H, r.x - sh, r.y, r.w / 2, r.h);
      ctx.drawImage(L.far, L.W / 2, 0, L.W / 2, L.H, r.x + r.w / 2 + sh, r.y, r.w / 2, r.h);
    } else {
      ctx.drawImage(L.far, 0, 0, L.W, L.H, r.x, r.y, r.w, r.h);
    }
    // per-layer FX on FAR: colour-cycled window lights / flickering fires (not while collapsing / parting)
    if (L.lights && !(colOn && t >= cs0) && !(pu > 0)) {
      var la = 0, col = null;
      if (L.fire && c.bgLayerFxFireFlickerOn !== false) {
        la = L55cfg(c, "bgLayerFxFireAlpha", 0.55) * (0.45 + 0.35 * Math.sin(t * 23.0) * Math.sin(t * 7.3 + 1.1) + 0.2 * Math.sin(t * 41.0));
        col = "rgb(255,150,40)";
      } else if (!L.fire && c.bgLayerFxLightsOn !== false) {
        var hue = Math.round(((t / Math.max(0.5, L55cfg(c, "bgLayerFxLightsCycleSec", 6))) % 1) * 360);
        la = L55cfg(c, "bgLayerFxLightsAlpha", 0.45); col = "hsl(" + hue + ",100%,62%)";
      }
      if (la > 0.01 && col) {
        var tc = L.tint.getContext("2d");
        tc.globalCompositeOperation = "copy"; tc.drawImage(L.lights, 0, 0);
        tc.globalCompositeOperation = "source-in"; tc.fillStyle = col; tc.fillRect(0, 0, L.tint.width, L.tint.height);
        tc.globalCompositeOperation = "source-over";
        var ga = ctx.globalAlpha; ctx.globalAlpha = ga * Math.min(1, la); ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(L.tint, 0, 0, L.tint.width, L.tint.height, r.x, r.y, r.w, r.h);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = ga;
      }
    }
    if (flashK > 0 && L.sil) { var ga2 = ctx.globalAlpha; ctx.globalAlpha = ga2 * 0.8 * flashK; ctx.drawImage(L.sil, 0, 0, L.sil.width, L.sil.height, r.x, r.y, r.w, r.h); ctx.globalAlpha = ga2; }
    ctx.restore();
    // ---- NEAR (+ foreground-only hit shake)
    var hs = L55hitShake(state, c);
    lay(L.near, kN, zN, hs ? hs.x : 0, hs ? hs.y : 0);
    return r;
  }

  function drawBgSingleLayer(ctx, background, width, height, cfg, scrollOffset, panPx) {
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
    if (panPx) dx += panPx; // sega54: per-plate horizontal crop (clip stays on the band)
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
    // sega55: untouched full-res photo plates (*-smooth.jpg, photoPlatesSmooth) draw with high-quality smoothing
    if (background._smooth54 == null) background._smooth54 = /-smooth\.(jpe?g|png)(\?|$)/i.test(background.src || background.currentSrc || "");
    if (background._smooth54) { ctx.imageSmoothingEnabled = true; try { ctx.imageSmoothingQuality = "high"; } catch (eSQ) {} }
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
    ctx.font = pixFont54(state, fontPx, "title");
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
    ctx.font = pixFont54(state, Math.floor(width * 0.085), "title");
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
    ctx.font = pixFont54(state, fs, "title");
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
    // sega54: win star background (behind everything) + the horizon drop (Austin plate + ground band translated down)
    var winStarK54 = state._winStarK || 0;
    var winDropPx54 = Math.round((state._winHorizonDrop || 0) * height);
    if (winStarK54 > 0.001 && !state.inTunnel) {
      ctx.save();
      ctx.fillStyle = "#02010a";
      ctx.fillRect(0, 0, width, height);
      if (ns.Sega31x && ns.Sega31x.drawStarfield) ns.Sega31x.drawStarfield(state, ctx, width, height, 1);
      ctx.restore();
    }
    var dropOn54 = false;
    if (winDropPx54) { ctx.translate(0, winDropPx54); dropOn54 = true; }

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
      if (dropOn54) { ctx.translate(0, -winDropPx54); dropOn54 = false; } // sega54
      ctx.save();
      ctx.globalAlpha = worldAlpha;
      bgClipped = false;
    }

    if (dropOn54) { ctx.translate(0, -winDropPx54); dropOn54 = false; } // sega54 (no bg clip path)
    // sega33: opaque roadside/ground fill under horizon so clip/clearRect never leaves
    // psych dither / garbage / flicker under the road (roadNoBgFlashThrough = solid under).
    if ((roadOverBg || cfgZ.roadNoBgFlashThrough !== false) && !state.inTunnel) {
      var underY = Math.max(0, Math.floor((state._roadHorizonY != null ? state._roadHorizonY : bgHorizonY)));
      var underCol = cfgZ.roadUnderHorizonFillColor
        || (state.nightAustin ? '#140e28' : '#1a1232');
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = underCol;
      if (winDropPx54) ctx.translate(0, winDropPx54); // sega54: ground band sinks with the horizon
      if (winStarK54 > 0.001) ctx.globalAlpha = Math.max(0, 1 - winStarK54); // sega54: ground band fades with the road
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
    // sega53: curve lean measurement window (player segment -> curveLeanLookSegs ahead)
    var clLook = Math.max(2, (state.config && state.config.curveLeanLookSegs) || 120);
    var clRefN = ((playerSegment.index - baseSegment.index) % state.segments.length + state.segments.length) % state.segments.length;
    var clX0 = null, clY0 = null, clX1 = null, clY1 = null;
    // sega54: noRoadsideAfterBoss - no roadside sprites from the final boss start (noRoadsideFromSec) to the end of the song
    var cfgRs54 = state.config || {};
    var rsFrom54 = cfgRs54.noRoadsideFromSec != null ? cfgRs54.noRoadsideFromSec
      : ((cfgRs54.finaleFight && cfgRs54.finaleFight.start != null) ? cfgRs54.finaleFight.start : 185.22);
    var rsOffAfterBoss = cfgRs54.noRoadsideAfterBoss !== false && state.phase !== "menu" &&
      (state.songClock != null ? state.songClock : 0) >= rsFrom54;
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

      // sega53: curve lean - screen-space bend caused by curvature only (x = accumulated curve offset, camera units)
      if (n === clRefN || n === clRefN + clLook) {
        var clSx = (segment.p1.screen.scale || 0) * x * width / 2;
        if (n === clRefN) { clX0 = clSx; clY0 = segment.p1.screen.y; }
        else { clX1 = clSx; clY1 = segment.p1.screen.y; }
      }
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
        // sega52: carScaleY — every car drawn 12% taller (width unchanged), anchored at the wheels
        var carSY = (state.config.carScaleY != null) ? state.config.carScaleY : 1;
        var approxH = Math.max(20, (sprite.h || 56) * spriteScale * state.roadWidth * width * 0.00035 * carHMult * carSY);
        car.screenRect = {
          x: spriteX - approxW / 2,
          y: spriteY - approxH,
          w: approxW,
          h: approxH
        };
        if (Render.spriteNeonCar) {
          if (carSY !== 1) { ctx.save(); ctx.translate(spriteX, spriteY); ctx.scale(1, carSY); ctx.translate(-spriteX, -spriteY); }
          Render.spriteNeonCar(
            ctx, width, height, state.resolution, state.roadWidth, state.sprites,
            sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip, bank
          );
          if (carSY !== 1) ctx.restore();
        } else {
          ctx.save();
          if (bank) {
            ctx.translate(spriteX, spriteY);
            ctx.rotate(bank);
            ctx.translate(-spriteX, -spriteY);
          }
          // sega31s: apply W/H mult via non-uniform scale about feet/center
          if (carWMult !== 1 || carHMult !== 1 || carSY !== 1) {
            ctx.translate(spriteX, spriteY);
            ctx.scale(carWMult, carHMult * carSY);
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
      if (state._tunnelHideRoadside || rsOffAfterBoss) {
        /* skip roadside sprites (sega54: also from the final boss start to the end) */
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

    // sega53: road bend angle in degrees (+ = bends right). atan(curve-only lateral screen shift / screen rows) over the window.
    state._curveAngleDeg = (clX0 != null && clX1 != null && clY0 - clY1 > 1)
      ? Math.atan2(clX1 - clX0, clY0 - clY1) * 180 / Math.PI : 0;
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
      ctx.font = pixFont54(state, Math.floor(width * 0.18), "title");
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
    ctx.font = pixFont54(state, 28, "title");
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
    // sega55: invulnerability blink for the whole invuln window (hit 0.85 s, respawn 3 s)
    if (state.config.invulnBlinkOn !== false && state.invulnTimer > 0 && state.phase === "running" && !(state.deathFlashTimer > 0)) {
      var ibHz = state.config.invulnBlinkHz != null ? state.config.invulnBlinkHz : 12;
      if (Math.floor(state.invulnTimer * ibHz * 2) % 2 === 1) ctx.globalAlpha *= (state.config.invulnBlinkAlpha != null ? state.config.invulnBlinkAlpha : 0.35);
    }
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
      // sega52: tunnelEnterFromCurrentAlt — start the mouth shrink-in from where she was actually drawn
      // (her altitude) and ease into the same end point; old path snapped ~220 px down to the road first.
      var cfgTe = state.config || {};
      if (cfgTe.tunnelEnterFromCurrentAlt !== false && state._tunnelPlayerShrink > 0.001 && !(state._tunnelExitShrink > 0.001)) {
        if (state._tunnelEnterY0 == null) state._tunnelEnterY0 = state._playerDrawDestY != null ? state._playerDrawDestY : destY;
        var uTe = Math.min(1, state._tunnelPlayerShrink), eTe = uTe * uTe * (3 - 2 * uTe);
        // hold her altitude until the mouth path rises above her, then follow it (never dips toward the road)
        destY = state._tunnelEnterY0 + Math.min(0, destY - state._tunnelEnterY0) * eTe;
      }
    }
    if (!(state._tunnelPlayerShrink > 0.001)) state._tunnelEnterY0 = null;
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
      // sega52: bossLaneLeanNormal — the boss level runs at speed 0 / crawl, which zeroed steerAmt and froze her on the
      // STRAIGHT frame. Use the same lane-side LEFT/RIGHT poses as normal play whenever the road speed is (near) zero.
      if (cfgP.bossLaneLeanNormal !== false && !drawPlayerNow.tunnelForced && Math.abs(steerAmt) < 1 &&
          (state.finaleFight || state.finaleMode === "fight" || state.bossApproach)) steerAmt = drawPlayerNow.steerLean;
      // sega53: curveLean - on a bend steeper than curveLeanThresholdDeg she leans into the road's direction (pose + small tilt),
      // eased over curveLeanEaseSec with hysteresis. A lane switch in progress keeps the lane-switch lean (curve lean eases out).
      var clTilt = 0;
      if (cfgP.curveLeanOn !== false) {
        var clNow = (typeof performance !== "undefined" ? performance.now() : Date.now());
        var clDt = state._clLastT ? Math.min(0.1, Math.max(0, (clNow - state._clLastT) / 1000)) : 0;
        state._clLastT = clNow;
        var clThr = cfgP.curveLeanThresholdDeg != null ? cfgP.curveLeanThresholdDeg : 25;
        var clHys = cfgP.curveLeanHysteresisDeg != null ? cfgP.curveLeanHysteresisDeg : 3;
        var clAng = state._curveAngleDeg || 0;
        var laneTgtX = (ns.State && ns.State.laneOffset) ? ns.State.laneOffset(state, state.lane || 0) : state.playerX;
        var switching = Math.abs((state.playerX || 0) - laneTgtX) > (cfgP.curveLeanLaneEps != null ? cfgP.curveLeanLaneEps : 0.03);
        var clAllowed = state.phase === "running" && !drawPlayerNow.tunnelForced && !state.inTunnel && !(state._tunnelPhase && state._tunnelPhase !== "done") &&
          !state.finaleFight && state.finaleMode !== "fight" && state.finaleMode !== "winCruise" && !state.bossApproach &&
          state.speed > 1 && !switching;
        var clSide = state._curveLeanSide || 0;
        if (!clAllowed) clSide = 0;
        else if (Math.abs(clAng) >= clThr) clSide = clAng > 0 ? 1 : -1;
        else if (Math.abs(clAng) < clThr - clHys) clSide = 0;
        state._curveLeanSide = clSide;
        var clEase = Math.max(0.01, cfgP.curveLeanEaseSec != null ? cfgP.curveLeanEaseSec : 0.25);
        var clK = state._curveLeanK || 0;
        var clStep = clDt / clEase;
        clK = clK < clSide ? Math.min(clSide, clK + clStep) : Math.max(clSide, clK - clStep);
        state._curveLeanK = clK;
        if (!switching && Math.abs(clK) >= 0.5) steerAmt = clK > 0 ? 1 : -1;
        var clAmt = cfgP.curveLeanAmount != null ? cfgP.curveLeanAmount : 1;
        clTilt = clK * clAmt * (cfgP.curveLeanTiltDeg != null ? cfgP.curveLeanTiltDeg : 6) * Math.PI / 180;
      }
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
          // sega52: shadowAltShrink (overrides playerShadowShrinkAmount when set) + shadowAltFade
          if (cfgP.shadowAltShrink != null) shrinkAmt = cfgP.shadowAltShrink;
          if (cfgP.shadowAltFade != null) shA *= Math.max(0, 1 - elevProg * cfgP.shadowAltFade);
          shElevScale = 1 - elevProg * shrinkAmt;
          if (shMin > 0) shElevScale = Math.max(shMin, shElevScale);
          if (cfgP.playerShadowFullAtGround !== false && elevProg <= 0) shElevScale = 1;
        }
        // sega52: shadowFollowDepth — when she moves into depth (tunnel shrink-in / exit shrink), the shadow
        // moves up with her and scales by the same factor, keeping the same (scaled) gap under her feet.
        if (cfgP.shadowFollowDepth !== false && tunnelScale < 0.999 && state.finaleMode !== "winCruise") {
          var elevYd = height * (state.playerElevScreenY != null ? state.playerElevScreenY : 0.99);
          shY = destY + (shY - elevYd) * tunnelScale;
          shElevScale *= tunnelScale;
        }
        var shHideT = cfgP.shadowHideInTunnel !== false && (state.inTunnel || state._tunnelHideRoad ||
          state._tunnelPhase === "blackIn" || state._tunnelPhase === "blackHold" || state._tunnelPhase === "blackOut");
        if (shElevScale > 0.001 && !shHideT) {
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
      if (clTilt) { ctx.save(); ctx.translate(playerDrawX, destY); ctx.rotate(clTilt); ctx.translate(-playerDrawX, -destY); }
      Render.player(
        ctx, width, height, state.resolution, state.roadWidth, state.sprites,
        state.speed / state.maxSpeed,
        (state.cameraDepth / drawZ) * pScale,
        playerDrawX, destY,
        steerAmt, playerUpdown
      );
      // sega31z: player-hit red-diff overlay (brain zap/damage) matching steer pose
      drawPlayerHitRedDiff(state, ctx, width, height, playerDrawX, destY, steerAmt, pScale, drawZ);
      if (clTilt) ctx.restore();
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
    domeReveal54: domeReveal54, // sega54: boss rise hand-off (brains.js)
    render: function(state) {
      // sega43: nuke detonation screen shake (decays over blast window)
      var shake = nukeSegaShake(state);
      // sega55: car-hit screen shake — carHitShakePx decaying (1-u)^2 over carHitShakeSec
      var chC = state.config || {};
      if (chC.carHitShakeOn !== false && state._carHitShakeAt != null && state.phase === "running") {
        var chD = Math.max(0.05, chC.carHitShakeSec != null ? chC.carHitShakeSec : 0.3);
        var chT = (state.elapsed || 0) - state._carHitShakeAt;
        if (chT >= 0 && chT < chD) {
          var chA = (chC.carHitShakePx != null ? chC.carHitShakePx : 8) * Math.pow(1 - chT / chD, 2);
          var chS = { x: Math.round(chA * Math.sin(chT * 91.7)), y: Math.round(chA * 0.7 * Math.cos(chT * 77.3)) };
          shake = shake ? { x: shake.x + chS.x, y: shake.y + chS.y } : chS;
        } else if (chT >= chD) state._carHitShakeAt = null;
      }
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
