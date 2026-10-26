(function(ns) {
  var DEBRIS_COLORS = ["#6a7080", "#9aa0b0", "#ff6a00", "#3a4050", "#c0c8d8", "#ff2d55"];

  // sega31o: rectangular debris/shards (not cute sparkles) — used by car explode + chew
  function spawnDebrisShards(state, x, y, sizeMul) {
    if (!state.particles) state.particles = [];
    var mul = (sizeMul != null && sizeMul > 0) ? sizeMul : 1;
    var count = Math.max(4, Math.round(10 * mul));
    var i, angle, speed;
    for (i = 0; i < count; i++) {
      angle = Math.random() * Math.PI * 2;
      speed = (90 + Math.random() * 260) * (0.55 + mul * 0.55);
      state.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.35 + Math.random() * 0.5,
        maxLife: 0.9,
        size: (3 + Math.random() * 9) * mul,
        color: DEBRIS_COLORS[i % DEBRIS_COLORS.length],
        spin: (Math.random() - 0.5) * 18,
        debris: true,
        w: (2.5 + Math.random() * 8) * mul,
        h: (1.5 + Math.random() * 5) * mul
      });
    }
  }

  var CUTE_COLORS = ["#ff66cc", "#ffe066", "#ff2d55", "#ffffff", "#7dffef"];
  var FIERY_COLORS = ["#ffffff", "#ffe066", "#ffb000", "#ff6a00", "#ff2d00", "#ff8a3d", "#fff3a0"];
  var CUTE_COLOR_SET = { "#ff66cc": 1, "#ff2d55": 1, "#7dffef": 1, "#ff66CC": 1, "#FF2D55": 1, "#7DFFEF": 1 };

  function spawnExplosion(state, x, y, kind, sizeMul) {
    if (!state.particles) {
      state.particles = [];
    }
    // HARD: cute pink/cyan palette ONLY when heart collect sets _heartCollectFx.
    // car / brain / sega / damage / boss / explosion / zap paths NEVER emit cute dots.
    var useCute = !!(state && state._heartCollectFx);
    if (!useCute) {
      if (kind === "pickup" || kind === "heart" || !kind) {
        kind = (state && state._carCollisionFx) ? "car" : "damage";
      }
      if (state && state._carCollisionFx && (kind === "pickup" || kind === "heart")) kind = "car";
      if (state && (state._zapHit || state.shockFlash > 0) && (kind === "pickup" || kind === "heart")) kind = "damage";
    } else {
      // heart collect path — keep/force pickup kind for cute burst
      kind = "pickup";
    }
    // Force fiery for every non-heart path (even unknown kinds)
    var fiery = !useCute;
    var isBoss = kind === "boss";
    var isCar = kind === "car";
    var count = useCute ? 18 : (isBoss ? 28 : kind === "brain" ? 42 : 34);
    var mul = (sizeMul != null && sizeMul > 0) ? sizeMul : 1;
    var cfg = state && state.config ? state.config : {};
    // player↔car collision: carCollisionExplosionSizeMult (+30%); else sega global +35%
    if (state && state._carCollisionFx) {
      var carMul = cfg.carCollisionExplosionSizeMult != null ? cfg.carCollisionExplosionSizeMult : 1.30;
      mul *= carMul;
    } else if (kind === "sega" && cfg.segaExplosionSizeMult != null) {
      mul *= cfg.segaExplosionSizeMult;
    }
    var i;
    var angle;
    var speed;
    // cute ONLY on heart; everyone else After Burner orange/yellow/white-hot
    var colors = useCute ? CUTE_COLORS : FIERY_COLORS;
    for (i = 0; i < count; i++) {
      angle = Math.random() * Math.PI * 2;
      speed = (80 + Math.random() * (fiery ? 320 : 220)) * (0.55 + mul * 0.55);
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.35 + Math.random() * (isBoss ? 0.7 : 0.55),
        maxLife: isBoss ? 0.95 : 0.75,
        size: (3 + Math.random() * (fiery ? 9 : 6)) * mul,
        color: colors[i % colors.length],
        spin: (Math.random() - 0.5) * 10,
        ember: fiery && Math.random() < 0.45,
        cute: useCute
      });
    }

    // sega22: car collision debris chunks (keep Sega explosion below)
    if (isCar && !(state && state._carCollisionFx && !(state.config && state.config.damageDebrisOn === true))) {
      spawnDebrisShards(state, x, y, mul);
    }

    // After Burner explosion sprite burst
    if (fiery && SPRITES.EXPLOSION) {
      state.particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: -20,
        life: isBoss ? 0.7 : 0.55,
        maxLife: isBoss ? 0.7 : 0.55,
        size: (kind === "brain" ? 92 : isBoss ? 120 : 110) * mul,
        color: "#ffffff",
        spriteBlast: true,
        sprite: SPRITES.EXPLOSION,
        growth: (kind === "brain" ? 160 : isBoss ? 280 : 200) * mul
      });
    }

    // sega31q: heart collect — skip expanding white ring (reads as screen flash); keep local dots
    var suppressFlash = !!(state && (state._suppressHeartScreenFlash || state._heartCollectFx) &&
      !(state.config && state.config.noScreenFlashOnHeartCollect === false));
    if (!(kind === "pickup" && suppressFlash)) {
      state.particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        life: 0.32 + (isBoss ? 0.15 : 0),
        maxLife: 0.32 + (isBoss ? 0.15 : 0),
        size: 14 * mul,
        color: fiery ? "#ffe066" : "#ffffff",
        ring: true,
        ringGrowth: (fiery ? 260 : 180) * mul
      });
    }

    if (fiery && !suppressFlash) {
      state.explosionFlash = Math.max(state.explosionFlash || 0, isBoss ? 1.2 : 1);
    }
  }

  // sega59: CAR HIT FLAKE - the hit car stays; it sheds a burst of square pixel flakes (bossDomeDebris style) coloured from
  // its own on-screen sprite pixels (sampled from the last frame inside car.screenRect), gravity + 90-degree tumbling, ~0.5 s.
  function spawnCarFlakes59(state, car) {
    var c = state.config || {};
    if (c.carHitFlakeOn === false || !state.ctx) return;
    var W = state.width, H = state.height;
    var r = (car && car.screenRect && car.screenRect.w > 4) ? car.screenRect
      : { x: W / 2 + (car && car.offset ? car.offset * W * 0.22 : 0) - 50, y: H * 0.72 - 60, w: 100, h: 60 };
    var cols = [];
    try {
      var cv = state.ctx.canvas, kx = cv.width / Math.max(1, W), ky = cv.height / Math.max(1, H);
      var sx = Math.max(0, Math.floor((r.x + r.w * 0.15) * kx)), sy = Math.max(0, Math.floor((r.y + r.h * 0.15) * ky));
      var sw = Math.max(1, Math.min(cv.width - sx, Math.floor(r.w * 0.7 * kx))), sh = Math.max(1, Math.min(cv.height - sy, Math.floor(r.h * 0.7 * ky)));
      var d = state.ctx.getImageData(sx, sy, sw, sh).data, i, n = d.length / 4, step = Math.max(1, Math.floor(n / 400));
      for (i = 0; i < n; i += step) {
        var R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
        if (R + G + B > 75) cols.push("rgb(" + R + "," + G + "," + B + ")");
      }
    } catch (eS) {}
    if (!cols.length) cols = ["#c0c0c0", "#8a8a8a", "#5a5a5a"];
    var N = Math.max(0, Math.round(c.carHitFlakeCount != null ? +c.carHitFlakeCount : 40));
    var spd = c.carHitFlakeSpeed != null ? +c.carHitFlakeSpeed : 1.0;
    spawnRectFlakes59(state, r, N, spd, cols, c.carHitFlakeSec != null ? +c.carHitFlakeSec : 0.5);
  }
  // sega59: shared square-pixel flake burst (car hit + boss decay); cols = sampled sprite colours
  function sampleRectCols59(state, r) {
    var cols = [], W = state.width, H = state.height;
    try {
      var cv = state.ctx.canvas, kx = cv.width / Math.max(1, W), ky = cv.height / Math.max(1, H);
      var sx = Math.max(0, Math.floor((r.x + r.w * 0.15) * kx)), sy = Math.max(0, Math.floor((r.y + r.h * 0.15) * ky));
      var sw = Math.max(1, Math.min(cv.width - sx, Math.floor(r.w * 0.7 * kx))), sh = Math.max(1, Math.min(cv.height - sy, Math.floor(r.h * 0.7 * ky)));
      var d = state.ctx.getImageData(sx, sy, sw, sh).data, i, n = d.length / 4, step = Math.max(1, Math.floor(n / 400));
      for (i = 0; i < n; i += step) { var R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2]; if (R + G + B > 75) cols.push("rgb(" + R + "," + G + "," + B + ")"); }
    } catch (eS) {}
    return cols.length ? cols : ["#c0c0c0", "#8a8a8a", "#5a5a5a"];
  }
  function spawnRectFlakes59(state, r, N, spd, cols, life) {
    var W = state.width;
    var cell = Math.max(2, Math.round(W / 160)), list = state._carFlakes59 || (state._carFlakes59 = []), k;
    for (k = 0; k < N; k++) {
      var ang = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.5, v = (160 + Math.random() * 320) * spd * (W / 640);
      list.push({ x: r.x + r.w * (0.15 + Math.random() * 0.7), y: r.y + r.h * (0.2 + Math.random() * 0.6),
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, t0: state.elapsed || 0, sz: cell * (Math.random() < 0.3 ? 2 : 1),
        col: cols[Math.floor(Math.random() * cols.length)], spin: 3 + Math.random() * 9, sh: Math.floor(Math.random() * 3), life: life });
    }
    if (list.length > 400) list.splice(0, list.length - 400);
  }
  var FLK59 = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [0, 1]]];
  function renderCarFlakes59(state) {
    var list = state._carFlakes59;
    if (!list || !list.length) return;
    var c = state.config || {}, ctx = state.ctx, now = state.elapsed || 0;
    var dur0 = Math.max(0.1, c.carHitFlakeSec != null ? +c.carHitFlakeSec : 0.5), G = 900 * (state.width / 640), i, j;
    ctx.save();
    for (i = list.length - 1; i >= 0; i--) {
      var f = list[i], t = now - f.t0, dur = f.life || dur0;
      if (t < 0 || t > dur) { list.splice(i, 1); continue; }
      var x = f.x + f.vx * t, y = f.y + f.vy * t + 0.5 * G * t * t, rot = Math.floor(t * f.spin) % 4, sh = FLK59[f.sh];
      ctx.globalAlpha = Math.min(1, (dur - t) / (dur * 0.35));
      for (j = 0; j < sh.length; j++) {
        var ux = sh[j][0], uy = sh[j][1], q, tx;
        for (q = 0; q < rot; q++) { tx = ux; ux = -uy; uy = tx; }
        var X = Math.round(x / f.sz) * f.sz + ux * f.sz, Y = Math.round(y / f.sz) * f.sz + uy * f.sz;
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(X + f.sz * 0.5, Y + f.sz * 0.5, f.sz, f.sz);   // dark edge
        ctx.fillStyle = f.col; ctx.fillRect(X, Y, f.sz, f.sz);
      }
    }
    ctx.restore();
  }

  function spawnCollisionExplosion(state, car) {
    var width = state.width;
    var height = state.height;
    var x = width / 2 + (car && car.offset ? car.offset * width * 0.22 : 0);
    var y = height * 0.72;
    var cfg0 = state.config || {};
    spawnCarFlakes59(state, car); // sega59
    var pxMul59 = 1;
    if (cfg0.carHitPlayerExplosionOn !== false && state._playerDrawDestX != null) { // sega59: explosion at HER (brain-kill sega burst)
      x = state._playerDrawDestX;
      y = (state._playerDrawDestY != null ? state._playerDrawDestY : height * 0.78) - (state._playerDrawH || height * 0.14) * 0.45;
      pxMul59 = cfg0.carHitPlayerExplosionScale != null ? +cfg0.carHitPlayerExplosionScale : 0.7;
    }
    // player↔car: Sega explosion (+ carCollisionExplosionSizeMult); NEVER pickup/cute
    var cfg = state && state.config ? state.config : {};
    var kind = cfg.enemyCollisionFxKind || cfg.carCollisionFxKind || null;
    if (!kind && cfg.carHitByPlayerUsesSegaExplosion !== false) kind = "sega";
    if (!kind) kind = "sega";
    if (kind === "pickup" || kind === "heart" || !kind) kind = "sega";
    var fieryOk = kind === "car" || kind === "sega" || kind === "damage" || kind === "explosion" || kind === "brain" || kind === "boss";
    if (!fieryOk) kind = "sega";
    var sizeMul = cfg.carCollisionExplosionSizeMult != null ? cfg.carCollisionExplosionSizeMult : 1.30;
    // size applied again inside spawnExplosion via _carCollisionFx — pass 1 here to avoid double
    state._carCollisionFx = true;
    try {
      spawnExplosion(state, x, y, kind, pxMul59);
      // debris shards even if kind is sega/damage
      if (kind !== "car" && cfg.damageDebrisOn === true) { // sega55: damageDebrisOn (default false = no shards on car hits)
        spawnDebrisShards(state, x, y, sizeMul);
      }
    } finally {
      state._carCollisionFx = false;
    }
    state.explosionFlash = Math.max(state.explosionFlash || 0, 1);
    // damage flash channel (applyDamage also sets this; keep visible even if dmg scaled to 0)
    state.damageFlash = Math.max(state.damageFlash || 0, 1);
  }

  function update(state, dt) {
    var n;
    var p;
    if (!state.particles) {
      state.particles = [];
      return;
    }
    if (state.explosionFlash > 0) {
      state.explosionFlash = Math.max(0, state.explosionFlash - dt * 3.2);
    }
    for (n = state.particles.length - 1; n >= 0; n--) {
      p = state.particles[n];
      p.life -= dt;
      if (p.arcBolt) {
        // jitter midpoints while alive
        p.mx += (Math.random() - 0.5) * 80 * dt;
        p.my += (Math.random() - 0.5) * 60 * dt;
      } else if (p.ring) {
        p.size += p.ringGrowth * dt;
      } else if (p.spriteBlast) {
        p.size += p.growth * dt;
        p.y += p.vy * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.ember ? 90 : (p.debris ? 220 : 180)) * dt;
        p.vx *= 0.97;
        if (p.spin) { p.rot = (p.rot || 0) + p.spin * dt; }
      }
      if (p.life <= 0) {
        state.particles.splice(n, 1);
      }
    }
  }

  function render(state) {
    var ctx = state.ctx;
    var n;
    var p;
    var alpha;
    var sp;
    renderCarFlakes59(state); // sega59
    if (!state.particles || !state.particles.length) {
      if (state.explosionFlash > 0) {
        ctx.fillStyle = "rgba(255, 140, 40, " + (state.explosionFlash * 0.4).toFixed(3) + ")";
        ctx.fillRect(0, 0, state.width, state.height);
      }
      return;
    }
    ctx.save();
    for (n = 0; n < state.particles.length; n++) {
      p = state.particles[n];
      alpha = Math.max(0, p.life / (p.maxLife || 0.6));
      if (p.spriteBlast && state.sprites && p.sprite) {
        sp = p.sprite;
        ctx.globalAlpha = alpha * 0.95;
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(
          state.sprites,
          sp.x, sp.y, sp.w, sp.h,
          p.x - p.size / 2, p.y - p.size / 2, p.size, p.size
        );
        ctx.globalCompositeOperation = "source-over";
      } else if (p.ring) {
        // powerup / blast rings — keep circles
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.arcBolt) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color || "#7dffef";
        ctx.lineWidth = p.size || 2.5;
        ctx.shadowColor = "#ffe066";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.mx, p.my);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.mx, p.my);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
      } else if (p.debris) {
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-(p.w || p.size) / 2, -(p.h || p.size) / 2, p.w || p.size, p.h || p.size);
        ctx.restore();
      } else {
        ctx.globalAlpha = alpha;
        if (p.ember) {
          ctx.globalCompositeOperation = "lighter";
        }
        // force-remap stray pink/cyan dots on enemy/explosion paths
        var fillCol = p.color;
        if (!p.cute && fillCol && CUTE_COLOR_SET[fillCol]) {
          fillCol = FIERY_COLORS[(n || 0) % FIERY_COLORS.length];
        }
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.restore();
    if (state.explosionFlash > 0) {
      ctx.fillStyle = "rgba(255, 140, 40, " + (state.explosionFlash * 0.4).toFixed(3) + ")";
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.fillStyle = "rgba(255, 255, 200, " + (state.explosionFlash * 0.15).toFixed(3) + ")";
      ctx.fillRect(0, 0, state.width, state.height);
    }
  }

  function spawnElectricArc(state, x1, y1, x2, y2) {
    if (!state.particles) {
      state.particles = [];
    }
    var i;
    var mx;
    var my;
    for (i = 0; i < 3; i++) {
      mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 48;
      my = (y1 + y2) / 2 + (Math.random() - 0.5) * 36;
      state.particles.push({
        x: x2,
        y: y2,
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        mx: mx,
        my: my,
        vx: 0,
        vy: 0,
        life: 0.18 + Math.random() * 0.16,
        maxLife: 0.34,
        size: 2 + i,
        color: i === 0 ? "#ffe066" : (i === 1 ? "#7dffef" : "#ffffff"),
        arcBolt: true
      });
    }
    // small spark burst at impact
    for (i = 0; i < 8; i++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = 60 + Math.random() * 140;
      state.particles.push({
        x: x2,
        y: y2,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        size: 2 + Math.random() * 3,
        color: "#7dffef",
        ember: true
      });
    }
  }

  ns.Fx = {
    spawnExplosion: spawnExplosion,
    spawnRectFlakes59: spawnRectFlakes59, sampleRectCols59: sampleRectCols59, // sega59
    spawnDebrisShards: spawnDebrisShards,
    spawnCollisionExplosion: spawnCollisionExplosion,
    spawnElectricArc: spawnElectricArc,
    update: update,
    render: render
  };
})(window.ApexRacer = window.ApexRacer || {});
