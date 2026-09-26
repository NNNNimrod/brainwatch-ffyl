(function(ns) {
  // sega38/39 — cyber-flies (DISABLED in config sega39; replaced by center-rush tinies): tunnel-only robotic insect drones.
  // Phases: swirl (erratic far orbit) → approach (slow nearer) → glow 1s telegraph → dive-bomb lane → hit/miss.

  var FRAME_COUNT = 6;
  var FRAME_PREFIX_DEFAULT = 'images/fx/cyber-fly/f';
  var FRAME_EXT_DEFAULT = '.png';

  function cfg(state) {
    return (state && state.config) || ns.CONFIG || {};
  }

  function laneScreenX(state, lane) {
    if (ns.Brains && ns.Brains.laneScreenX) return ns.Brains.laneScreenX(state, lane);
    var offsets = (state.config && state.config.laneOffsets) || [-0.55, 0.55];
    var idx = Math.max(0, Math.min(offsets.length - 1, lane | 0));
    return state.width / 2 + offsets[idx] * state.width * 0.22;
  }

  function ensureArrays(state) {
    if (!state.cyberFlies) state.cyberFlies = [];
  }

  function loadFrames(state) {
    if (state._cyberFlyImgsReady) return;
    state._cyberFlyImgsReady = true;
    state._cyberFlyImgs = [];
    var c = cfg(state);
    var n = c.cyberFlyAnimFrames != null ? c.cyberFlyAnimFrames : FRAME_COUNT;
    var prefix = c.cyberFlyFramePrefix || FRAME_PREFIX_DEFAULT;
    var ext = c.cyberFlyFrameExt || FRAME_EXT_DEFAULT;
    var frames = c.cyberFlyFrames;
    var i;
    function loadOne(src, idx) {
      // sega44: resilient relative load (retry + cache-bust); slot stays empty until loaded
      AssetLoader.image(null, src, {
        onload: function(img) { state._cyberFlyImgs[idx] = img; },
        onerror: function() { /* keep slot empty; procedural fallback */ }
      });
    }
    if (frames && frames.length) {
      for (i = 0; i < frames.length; i++) {
        loadOne(frames[i], i);
      }
    } else {
      for (i = 0; i < n; i++) {
        var num = (i + 1) < 10 ? ('0' + (i + 1)) : String(i + 1);
        loadOne(prefix + num + ext, i);
      }
    }
  }

  function reset(state) {
    state.cyberFlies = [];
    state._cyberFlyAcc = 0;
    state._cyberFlyImgsReady = false;
    state._cyberFlyImgs = [];
    loadFrames(state);
  }

  function mediumDamage(state) {
    var c = cfg(state);
    if (c.cyberFlyDamage != null) return c.cyberFlyDamage;
    if (c.damage && c.damage.brainZap != null) return c.damage.brainZap;
    if (c.brains && c.brains.zapDamage != null) return c.brains.zapDamage;
    return 30;
  }

  function spawn(state, opts) {
    ensureArrays(state);
    loadFrames(state);
    var c = cfg(state);
    var w = state.width || 640;
    var h = state.height || 720;
    var lane = (opts && opts.lane != null)
      ? opts.lane
      : (Math.random() < 0.5 ? 0 : 1);
    // Far swirl center near vanishing / upper mid playfield
    var horizonY = (state._roadHorizonY != null) ? state._roadHorizonY : (h * 0.42);
    var cx = w * 0.5 + (Math.random() - 0.5) * w * 0.18;
    var cy = Math.max(36, horizonY + h * 0.02 + (Math.random() - 0.5) * h * 0.06);
    var fly = {
      alive: true,
      phase: 'swirl', // swirl | approach | glow | dive | done
      lane: lane,
      attackLane: lane,
      // orbit params
      orbitCx: cx,
      orbitCy: cy,
      orbitR: h * (0.06 + Math.random() * 0.05),
      orbitAng: Math.random() * Math.PI * 2,
      orbitAngSpeed: (0.55 + Math.random() * 0.85) * (Math.random() < 0.5 ? -1 : 1),
      orbitRJitter: 0,
      swirlT: 0,
      swirlDur: (c.cyberFlySwirlSec != null ? c.cyberFlySwirlSec : 1.8) * (0.75 + Math.random() * 0.5),
      // approach
      approach: 0.04 + Math.random() * 0.03,
      approachSpeed: c.cyberFlyApproachSpeed != null ? c.cyberFlyApproachSpeed : 0.22,
      approachNear: c.cyberFlyApproachNear != null ? c.cyberFlyApproachNear : 0.72,
      // glow telegraph
      glowT: 0,
      glowDur: c.cyberFlyGlowSec != null ? c.cyberFlyGlowSec : 1.0,
      // dive
      diveT: 0,
      diveDur: c.cyberFlyDiveSec != null ? c.cyberFlyDiveSec : 0.55,
      diveSpeed: c.cyberFlyDiveSpeed != null ? c.cyberFlyDiveSpeed : 9.5,
      diveHitDone: false,
      // draw
      x: cx,
      y: cy,
      baseY: cy,
      drawScale: 0.12,
      radius: (c.cyberFlyRadius != null ? c.cyberFlyRadius : 28),
      animT: Math.random() * 10,
      animFps: c.cyberFlyAnimFps != null ? c.cyberFlyAnimFps : 10,
      frame: 0,
      bobPhase: Math.random() * Math.PI * 2,
      hitFlash: 0,
      screenRect: { x: 0, y: 0, w: 0, h: 0 }
    };
    // Erratic secondary wobble freqs
    fly.wobbleA = 1.7 + Math.random() * 2.4;
    fly.wobbleB = 2.9 + Math.random() * 3.1;
    fly.wobblePhaseA = Math.random() * Math.PI * 2;
    fly.wobblePhaseB = Math.random() * Math.PI * 2;
    state.cyberFlies.push(fly);
    return fly;
  }

  function beginGlow(fly, state) {
    fly.phase = 'glow';
    fly.glowT = 0;
    // Lock dive lane to player's current lane at telegraph start (dodgeable)
    fly.attackLane = state.lane != null ? state.lane : fly.lane;
    fly.lane = fly.attackLane;
    state.eventText = "CYBER-FLY!";
    state.eventTimer = 0.7;
  }

  function beginDive(fly, state) {
    fly.phase = 'dive';
    fly.diveT = 0;
    fly.diveHitDone = false;
    fly.diveStartX = fly.x;
    fly.diveStartY = fly.y;
    fly.diveStartApproach = fly.approach;
  }

  function resolveHitOrMiss(state, fly) {
    if (fly.diveHitDone) return;
    fly.diveHitDone = true;
    var sameLane = (state.lane | 0) === (fly.attackLane | 0);
    if (sameLane) {
      var dmg = mediumDamage(state);
      if (ns.Gameplay && ns.Gameplay.applyDamageExternal) {
        ns.Gameplay.applyDamageExternal(state, dmg);
      } else if (state.health != null) {
        state.health = Math.max(0, state.health - dmg);
      }
      state._zapHit = true;
      fly.hitFlash = 1;
      state.eventText = "FLY HIT!";
      state.eventTimer = 0.8;
      if (ns.Fx && ns.Fx.spawnExplosion) {
        ns.Fx.spawnExplosion(state, fly.x, fly.y, "sega", 0.75);
      }
      fly.alive = false;
      fly.phase = 'done';
    } else {
      state.eventText = "DODGED";
      state.eventTimer = 0.55;
      // Miss — streak past and despawn
      fly.phase = 'miss';
      fly.missT = 0;
      fly.missVy = (state.height || 720) * 0.9;
    }
  }

  function updateOne(state, fly, dt) {
    if (!fly || !fly.alive) return;
    var c = cfg(state);
    var w = state.width || 640;
    var h = state.height || 720;
    var size;

    fly.animT = (fly.animT || 0) + dt;
    fly.frame = Math.floor(fly.animT * (fly.animFps || 10)) % FRAME_COUNT;
    fly.bobPhase = (fly.bobPhase || 0) + dt * 3.1;
    if (fly.hitFlash > 0) fly.hitFlash = Math.max(0, fly.hitFlash - dt * 4);

    if (fly.phase === 'swirl') {
      fly.swirlT = (fly.swirlT || 0) + dt;
      fly.orbitAng += fly.orbitAngSpeed * dt;
      // Erratic radius / center drift
      fly.orbitRJitter = Math.sin(fly.swirlT * fly.wobbleA + fly.wobblePhaseA) * fly.orbitR * 0.35
        + Math.sin(fly.swirlT * fly.wobbleB + fly.wobblePhaseB) * fly.orbitR * 0.22;
      fly.orbitCx += Math.sin(fly.swirlT * 0.9 + fly.wobblePhaseA) * dt * w * 0.02;
      fly.orbitCy += Math.cos(fly.swirlT * 1.1 + fly.wobblePhaseB) * dt * h * 0.012;
      // Clamp orbit center to upper playfield
      fly.orbitCx = Math.max(w * 0.22, Math.min(w * 0.78, fly.orbitCx));
      fly.orbitCy = Math.max(h * 0.18, Math.min(h * 0.55, fly.orbitCy));
      var rr = Math.max(8, fly.orbitR + fly.orbitRJitter);
      fly.x = fly.orbitCx + Math.cos(fly.orbitAng) * rr;
      fly.y = fly.orbitCy + Math.sin(fly.orbitAng) * rr * 0.55;
      // Very slowly come nearer while swirling
      var swirlApproach = c.cyberFlySwirlApproachSpeed != null ? c.cyberFlySwirlApproachSpeed : 0.045;
      fly.approach = Math.min(fly.approachNear * 0.55, fly.approach + dt * swirlApproach);
      fly.drawScale = 0.10 + fly.approach * 0.55;
      if (fly.swirlT >= fly.swirlDur) {
        fly.phase = 'approach';
      }
    } else if (fly.phase === 'approach') {
      // Keep mild erratic drift while scaling up / moving toward mid playfield
      fly.orbitAng += fly.orbitAngSpeed * dt * 0.65;
      fly.wobblePhaseA += dt * fly.wobbleA;
      fly.wobblePhaseB += dt * fly.wobbleB;
      var ax = w * 0.5 + Math.sin(fly.wobblePhaseA) * w * 0.12;
      var ay = h * 0.42 + Math.cos(fly.wobblePhaseB) * h * 0.06;
      // Drift slowly toward attack-lane column as we near
      var laneX = laneScreenX(state, fly.attackLane != null ? fly.attackLane : 0);
      var mix = Math.min(1, fly.approach * 1.1);
      ax = ax * (1 - mix * 0.55) + laneX * (mix * 0.55);
      fly.x += (ax - fly.x) * Math.min(1, dt * 2.2);
      fly.y += (ay - fly.y) * Math.min(1, dt * 1.8);
      fly.x += Math.sin(fly.wobblePhaseA * 1.3) * dt * 28;
      fly.y += Math.cos(fly.wobblePhaseB * 1.1) * dt * 18;
      fly.approach = Math.min(1, fly.approach + dt * (fly.approachSpeed || 0.22));
      fly.drawScale = 0.12 + fly.approach * 0.88;
      if (fly.approach >= (fly.approachNear || 0.72)) {
        beginGlow(fly, state);
      }
    } else if (fly.phase === 'glow') {
      fly.glowT = (fly.glowT || 0) + dt;
      // Hold near player band, gentle hover, locked telegraph lane
      var gLane = fly.attackLane != null ? fly.attackLane : 0;
      var gx = laneScreenX(state, gLane);
      var gy = h * 0.48 + Math.sin(fly.bobPhase) * h * 0.015;
      fly.x += (gx - fly.x) * Math.min(1, dt * 3.5);
      fly.y += (gy - fly.y) * Math.min(1, dt * 3.0);
      fly.approach = Math.min(1, Math.max(fly.approach, 0.85));
      fly.drawScale = 0.85 + 0.12 * Math.sin(fly.glowT * 14);
      if (fly.glowT >= (fly.glowDur != null ? fly.glowDur : 1.0)) {
        beginDive(fly, state);
      }
    } else if (fly.phase === 'dive') {
      fly.diveT = (fly.diveT || 0) + dt;
      var dur = Math.max(0.12, fly.diveDur || 0.55);
      var t = Math.min(1, fly.diveT / dur);
      var ease = t * t * (3 - 2 * t); // smoothstep
      var dLane = fly.attackLane != null ? fly.attackLane : 0;
      var targetX = laneScreenX(state, dLane);
      // Aim near player elev band (tier 2 in tunnel)
      var targetY = h * 0.72;
      if (state._playerDrawDestY != null) targetY = state._playerDrawDestY;
      else if (ns.Brains && typeof ns.Brains.laneScreenX === 'function') {
        // Prefer known player draw Y if stored
        if (state._playerDrawDestY == null && state.playerY != null) targetY = state.playerY;
      }
      var spd = fly.diveSpeed != null ? fly.diveSpeed : 9.5;
      fly.x += (targetX - fly.x) * Math.min(1, dt * spd);
      fly.y += (targetY - fly.y) * Math.min(1, dt * (spd * 1.15));
      fly.approach = Math.min(1.15, (fly.diveStartApproach || 0.85) + ease * 0.35);
      fly.drawScale = 0.95 + ease * 0.35;
      if (t >= 0.92) {
        resolveHitOrMiss(state, fly);
      }
    } else if (fly.phase === 'miss') {
      fly.missT = (fly.missT || 0) + dt;
      fly.y += dt * (fly.missVy || h);
      fly.x += (Math.random() - 0.5) * 40 * dt;
      fly.drawScale = Math.max(0.05, (fly.drawScale || 1) * (1 - dt * 2.8));
      if (fly.missT > 0.55 || fly.y > h + 40) {
        fly.alive = false;
        fly.phase = 'done';
      }
    }

    size = (fly.radius || 28) * 2.2 * Math.max(0.08, fly.drawScale || 0.2);
    fly.screenRect = { x: fly.x - size / 2, y: fly.y - size / 2, w: size, h: size };
  }

  function update(state, dt) {
    ensureArrays(state);
    loadFrames(state);
    var i, fly;
    for (i = 0; i < state.cyberFlies.length; i++) {
      fly = state.cyberFlies[i];
      if (fly && fly.alive) updateOne(state, fly, dt);
    }
    // Prune dead
    if (state.cyberFlies.length) {
      state.cyberFlies = state.cyberFlies.filter(function(f) { return f && f.alive; });
    }
  }

  function drawProcedural(ctx, fly, size) {
    var x = fly.x, y = fly.y;
    var s = size / 64;
    ctx.save();
    ctx.translate(x, y);
    // body
    ctx.fillStyle = '#586476';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2ec4';
    ctx.fillRect(-6 * s, -1 * s, 12 * s, 2 * s);
    // wings
    ctx.strokeStyle = '#3cdce6';
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath();
    ctx.moveTo(-6 * s, -2 * s);
    ctx.lineTo(-22 * s, -10 * s);
    ctx.moveTo(6 * s, -2 * s);
    ctx.lineTo(22 * s, -10 * s);
    ctx.stroke();
    // eye
    ctx.fillStyle = '#b4ffff';
    ctx.fillRect(-3 * s, -8 * s, 2 * s, 2 * s);
    ctx.fillRect(1 * s, -8 * s, 2 * s, 2 * s);
    ctx.restore();
  }

  function drawOne(ctx, state, fly) {
    if (!fly || !fly.alive) return;
    var size = (fly.radius || 28) * 2.2 * Math.max(0.08, fly.drawScale || 0.2);
    var imgs = state._cyberFlyImgs || [];
    var img = imgs[fly.frame % Math.max(1, imgs.length)];
    var glowPhase = fly.phase === 'glow';
    var divePhase = fly.phase === 'dive';

    ctx.save();
    // Telegraph / dive additive glow
    if (glowPhase || divePhase) {
      var pulse = glowPhase
        ? (0.35 + 0.45 * Math.abs(Math.sin((fly.glowT || 0) * 10)))
        : 0.55;
      var grd = ctx.createRadialGradient(fly.x, fly.y, 2, fly.x, fly.y, size * 0.85);
      grd.addColorStop(0, divePhase ? 'rgba(255,230,80,0.55)' : 'rgba(125,255,239,' + (0.35 + pulse * 0.4) + ')');
      grd.addColorStop(0.45, 'rgba(255,46,196,' + (0.22 + pulse * 0.25) + ')');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, size * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    if (fly.hitFlash > 0) {
      ctx.globalAlpha = 0.55 + fly.hitFlash * 0.45;
      ctx.filter = 'brightness(1.8) saturate(1.5)';
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, fly.x - size / 2, fly.y - size / 2, size, size);
    } else {
      drawProcedural(ctx, fly, size);
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // Extra ring during glow
    if (glowPhase) {
      var gProg = Math.min(1, (fly.glowT || 0) / Math.max(0.05, fly.glowDur || 1));
      ctx.strokeStyle = 'rgba(255,230,80,' + (0.35 + 0.5 * Math.sin(gProg * Math.PI)) + ')';
      ctx.lineWidth = 2 + gProg * 2;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, size * (0.55 + 0.15 * Math.sin((fly.glowT || 0) * 12)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render(state) {
    ensureArrays(state);
    var ctx = state.ctx;
    if (!ctx) return;
    var i;
    // Draw far (small) first
    var list = state.cyberFlies.slice().sort(function(a, b) {
      return (a.drawScale || 0) - (b.drawScale || 0);
    });
    for (i = 0; i < list.length; i++) {
      drawOne(ctx, state, list[i]);
    }
  }

  function clearAll(state) {
    if (state.cyberFlies) state.cyberFlies = [];
    state._cyberFlyAcc = 0;
  }

  function tickSpawn(state, dt) {
    var c = cfg(state);
    if (c.cyberFlyEnabled === false) return;
    var every = c.cyberFlySpawnEverySec != null ? c.cyberFlySpawnEverySec : 1.4;
    if (!(every > 0)) return;
    state._cyberFlyAcc = (state._cyberFlyAcc || 0) + dt;
    var maxActive = c.cyberFlyMaxActive != null ? c.cyberFlyMaxActive : 3;
    ensureArrays(state);
    while (state._cyberFlyAcc >= every) {
      state._cyberFlyAcc -= every;
      var alive = 0, i;
      for (i = 0; i < state.cyberFlies.length; i++) {
        if (state.cyberFlies[i] && state.cyberFlies[i].alive) alive++;
      }
      if (alive < maxActive) spawn(state);
    }
  }

  ns.CyberFlies = {
    reset: reset,
    update: update,
    render: render,
    spawn: spawn,
    clearAll: clearAll,
    tickSpawn: tickSpawn,
    loadFrames: loadFrames
  };
})(window.ApexRacer = window.ApexRacer || {});
