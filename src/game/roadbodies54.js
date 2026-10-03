// sega54: ON-ROAD dead bodies (post-nuke "blood on the streets" 163.7 -> roadBodiesEndSec 185.22, density ramp,
// no damage, SPLAT blood particles + flattened body) and GREENBELT night roadside pool for chorus1 (59 -> 81.5).
// Self-contained: wraps ns.Gameplay.update / ns.Renderer.render (no edits inside renderer.js).
(function(ns) {
  function cfg(state, k, d) { var c = state.config || {}; return c[k] != null ? c[k] : d; }
  var BODY = ["RS_BODY_A", "RS_BODY_B", "RS_BODY_C"];
  var GB = ["RS_GB_ASHE_CEDAR", "RS_GB_LIVE_OAK", "RS_GB_BOULDER", "RS_GB_PRICKLY_PEAR", "RS_GB_CREEK_ROCKS", "RS_GB_AGAVE"];
  var COLS = ["#5a0a0e", "#8a1418", "#b01c20", "#3a0608", "#8a1418"];

  function rb(state) {
    if (!state._rb54 || state._rb54.segs !== state.segments) {
      if (state._rb54) clearBodies(state);
      state._rb54 = { segs: state.segments, bodies: [], parts: [], lap: 0, lastP: -1, lastFar: null, gb: null };
    }
    return state._rb54;
  }
  function clearBodies(state) {
    var R = state._rb54, i, b, a, j;
    if (!R) return;
    for (i = 0; i < R.bodies.length; i++) {
      b = R.bodies[i]; a = b.seg && b.seg.sprites;
      if (a) { j = a.indexOf(b.spr); if (j >= 0) a.splice(j, 1); }
    }
    R.bodies.length = 0; R.lastFar = null;
  }
  function spawnBody(state, R, uIdx) {
    var N = state.segments.length, seg = state.segments[((uIdx % N) + N) % N];
    var src = SPRITES[BODY[Math.floor(Math.random() * BODY.length)]];
    if (!seg || !src || !src.img) return;
    var w = src.w * SPRITES.SCALE * (src.scaleMul || 1);
    var c = (Math.random() * 2 - 1) * 0.72, off;
    if (c - w / 2 >= 0) off = c - w / 2; else if (c + w / 2 < 0) off = c + w / 2;
    else if (c >= 0) { c = w / 2; off = 0; } else { c = -w / 2; off = -1e-6; }
    var spr = { source: src, offset: off, roadBody54: true };
    seg.sprites.push(spr);
    R.bodies.push({ u: uIdx, seg: seg, spr: spr, c: c, w: w, flat: false });
  }
  function splat(state, R, b) {
    b.flat = true;
    var fl = SPRITES[b.spr.source.flatKey];
    if (fl && fl.img) b.spr.source = fl;
    var n = Math.max(0, Math.round(cfg(state, "roadBodySplatParticles", 34)));
    var spread = cfg(state, "roadBodySplatSpread", 1.0), life = cfg(state, "roadBodySplatLifeSec", 0.75);
    var W = state.width || 390, H = state.height || 844, u = W / 390;
    var pd = state._pendingPlayerDraw, oy = (pd && pd.destY) ? pd.destY - 10 * u : H * 0.86;
    var ox = W / 2 + (b.c - (state.playerX || 0)) * W * 0.25;
    for (var i = 0; i < n; i++) {
      var a = Math.PI + Math.random() * Math.PI, v = (140 + Math.random() * 360) * u * spread;
      R.parts.push({ x: ox + (Math.random() - 0.5) * 30 * u, y: oy, vx: Math.cos(a) * v * (Math.random() < 0.5 ? 1 : 1.4),
        vy: Math.sin(a) * v * 0.9 - 60 * u, g: 900 * u, t: 0, life: life * (0.6 + Math.random() * 0.7),
        s: Math.max(2, Math.round((2 + Math.floor(Math.random() * 4)) * u)), c: COLS[i % COLS.length],
        ground: oy + (Math.random() * 40 - 6) * u, stuck: false });
    }
    if (R.parts.length > 400) R.parts.splice(0, R.parts.length - 400);
    if (ns.Sfx && ns.Sfx.squish) { try { ns.Sfx.squish(); } catch (e) {} }
    if (cfg(state, "roadBodyNoDamage", true) === false) state.speed *= 0.85;
  }
  // sega56: bossHitBlood - same splat (roadBodySplatParticles, COLS, pixel drops) at the wound on the boss, scaled to the
  // boss's drawn size; drops spray out briefly, then STICK to the boss (follow it), drip down slowly and fade (bossHitBloodSec).
  function bossBlood(state, boss, hx, hy) {
    var R = rb(state);
    var sz = (boss.screenRect && boss.screenRect.w) || ((boss.radius || 60) * 2.4 * (boss.drawScale || 1));
    var k = Math.max(0.3, sz / 300) * cfg(state, "bossHitBloodScale", 1.0);
    var life = Math.max(0.2, cfg(state, "bossHitBloodSec", 1.6));
    var bx = boss.x || 0, by = boss.y || 0;
    if (hx == null || hy == null) { hx = bx + (Math.random() - 0.5) * sz * 0.5; hy = by + (Math.random() - 0.3) * sz * 0.4; }
    // keep the wound on the brain (inside ~40% of its size from the centre)
    var dx = hx - bx, dy = hy - by, dm = Math.sqrt(dx * dx + dy * dy), lim = sz * 0.38;
    if (dm > lim) { hx = bx + dx / dm * lim; hy = by + dy / dm * lim; }
    var n = Math.max(0, Math.round(cfg(state, "roadBodySplatParticles", 34)));
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 200) * k;
      R.parts.push({ boss56: boss, ox: hx - bx + (Math.random() - 0.5) * 8 * k, oy: hy - by + (Math.random() - 0.5) * 8 * k,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8 - 40 * k, t: 0, spray: 0.12 + Math.random() * 0.1, life: life * (0.7 + Math.random() * 0.5),
        s: Math.max(2, Math.round((2 + Math.floor(Math.random() * 4)) * k)), c: COLS[i % COLS.length], drip: (8 + Math.random() * 26) * k, x: hx, y: hy });
    }
    if (R.parts.length > 500) R.parts.splice(0, R.parts.length - 500);
  }
  function updateBodies(state, dt) {
    var R = rb(state), N = state.segments.length, L = state.segmentLength || 200;
    if (!N) return;
    var t = state.songClock || 0;
    var on = cfg(state, "roadBodiesOn", true) && state.phase === "running";
    var t0 = cfg(state, "roadBodiesStartSec", 163.7), t1 = cfg(state, "roadBodiesEndSec", 185.22);
    var p = Math.floor(((state.position || 0) + (state.playerZ || 0)) / L) % N;
    var dp = R.lastP >= 0 ? p - R.lastP : 0;
    if (dp < -N / 2) R.lap++;                                           // normal wrap
    else if (dp > 80 || dp < -80) { clearBodies(state); R.lastFar = null; } // teleport/seek: re-seed ahead
    R.lastP = p;
    var up = R.lap * N + p, i, b;
    if (!on || t < t0 || t >= t1) { if (R.bodies.length) clearBodies(state); R.lastFar = null; return; }
    var k = Math.max(0, Math.min(1, (t - t0) / Math.max(0.1, t1 - 0.2 - t0)));
    var dens = cfg(state, "roadBodiesDensityStart", 3) + (cfg(state, "roadBodiesDensityEnd", 24) - cfg(state, "roadBodiesDensityStart", 3)) * k;
    var far = up + Math.max(20, (state.drawDistance || 300) - 10);
    if (R.lastFar == null) R.lastFar = up + 12;
    for (i = R.lastFar + 1; i <= far && i < R.lastFar + 600; i++) if (Math.random() < dens / 100) spawnBody(state, R, i);
    R.lastFar = Math.max(R.lastFar, far);
    var pw = (SPRITES.PLAYER_STRAIGHT ? SPRITES.PLAYER_STRAIGHT.w : 140) * SPRITES.SCALE;
    for (i = R.bodies.length - 1; i >= 0; i--) {
      b = R.bodies[i];
      if (b.u < up - 4) {
        var a = b.seg.sprites, j = a.indexOf(b.spr); if (j >= 0) a.splice(j, 1);
        R.bodies.splice(i, 1); continue;
      }
      if (!b.flat && b.u >= up - 1 && b.u <= up + 1 && Math.abs((state.playerX || 0) - b.c) < (b.w + pw) / 2 * 0.8) splat(state, R, b);
    }
  }
  function updateParts(state, dt) {
    var R = state._rb54; if (!R || !R.parts.length) return;
    var H = state.height || 844, sp = Math.max(0.2, (state.speed || 0) / Math.max(1, state.maxSpeed || 1));
    for (var i = R.parts.length - 1; i >= 0; i--) {
      var q = R.parts[i]; q.t += dt;
      if (q.boss56) { // sega56: boss wound blood - spray, then stick to the (moving) boss and drip
        if (q.t >= q.life || !q.boss56.alive) { R.parts.splice(i, 1); continue; }
        if (q.t < q.spray) { q.ox += q.vx * dt; q.oy += q.vy * dt; q.vx *= 0.86; q.vy *= 0.86; }
        else q.oy += q.drip * dt;
        q.x = (q.boss56.x || 0) + q.ox; q.y = (q.boss56.y || 0) + q.oy; q.stuck = q.t >= q.spray;
        continue;
      }
      if (q.t >= q.life || q.y > H + 20) { R.parts.splice(i, 1); continue; }
      if (!q.stuck) {
        q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.vy > 0 && q.y >= q.ground) { q.stuck = true; q.y = q.ground; q.life = Math.max(q.life, q.t + 0.35); }
      } else { q.y += (q.y - H * 0.5) * 2.2 * sp * dt; } // stuck drop rides the road toward the camera
    }
  }
  function drawParts(state) {
    var R = state._rb54, ctx = state.ctx; if (!R || !R.parts.length || !ctx) return;
    ctx.save();
    for (var i = 0; i < R.parts.length; i++) {
      var q = R.parts[i], a = 1 - Math.max(0, q.t / q.life - 0.7) / 0.3;
      ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = q.c;
      if (q.boss56) { // sega56: wound drops keep their shape + a wet highlight pixel, drip streak below
        ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
        if (q.stuck) { ctx.fillRect(Math.round(q.x + q.s * 0.25), Math.round(q.y + q.s), Math.max(1, Math.round(q.s * 0.5)), Math.round(q.s * 0.8));
          ctx.fillStyle = "#ff5a5a"; ctx.fillRect(Math.round(q.x), Math.round(q.y), Math.max(1, Math.round(q.s * 0.4)), Math.max(1, Math.round(q.s * 0.4))); }
        continue;
      }
      var s = q.stuck ? q.s + 1 : q.s;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), s, q.stuck ? Math.max(1, Math.round(s * 0.6)) : s);
    }
    ctx.restore();
  }
  // Greenbelt: chorus1 roadside sprites -> random night-nature pool while greenbeltRoadsideStartSec..EndSec
  function updateGreenbelt(state) {
    var R = rb(state), t = state.songClock || 0, i, s;
    if (!R.gb) {
      R.gb = [];
      for (i = 0; i < state.segments.length; i++) {
        var a = state.segments[i].sprites;
        for (var j = 0; a && j < a.length; j++) if (a[j].sectionId === "chorus1") R.gb.push(a[j]);
      }
      for (i = 0; i < R.gb.length; i++) { s = R.gb[i]; s._gbOrig = s.source; s._gbNew = SPRITES[GB[i % GB.length]]; }
      for (i = R.gb.length - 1; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)), tmp = R.gb[i]._gbNew; R.gb[i]._gbNew = R.gb[r]._gbNew; R.gb[r]._gbNew = tmp; }
      // sega54 build: EXTRA greenbelt props (greenbeltRoadsideDensity per 100 segments, even spacing, alternating sides
      // with jitter) — only inserted into the road while the window is on, removed again after (tunnel clear safe).
      R.gbX = [];
      var dens = Math.max(0, cfg(state, "greenbeltRoadsideDensity", 8)), N = state.segments.length;
      if (dens > 0 && N > 80) {
        var step = Math.max(3, Math.round(100 / dens)), side = 1, k2 = 0;
        for (var n2 = 30 + step; n2 < N - 40; n2 += step) {
          side = -side; k2++;
          var off2 = side < 0 ? (-1.3 - Math.random() * 0.7) : (1.4 + Math.random() * 0.7);
          R.gbX.push({ seg: state.segments[n2], spr: { source: SPRITES[GB[k2 % GB.length]], offset: off2, sectionId: "chorus1", gbExtra54: true }, in: false });
        }
      }
    }
    var on = cfg(state, "greenbeltRoadsideOn", true) && t >= cfg(state, "greenbeltRoadsideStartSec", 59) && t < cfg(state, "greenbeltRoadsideEndSec", 81.5);
    for (i = 0; i < R.gb.length; i++) {
      s = R.gb[i];
      var want = (on && s._gbNew && s._gbNew.img) ? s._gbNew : s._gbOrig;
      if (s.source !== want) s.source = want;
    }
    for (i = 0; R.gbX && i < R.gbX.length; i++) {
      var x = R.gbX[i], arr = x.seg && x.seg.sprites, ok = on && x.spr.source && x.spr.source.img;
      if (ok && !x.in && arr && !state._tunnelHideRoadside) { arr.push(x.spr); x.in = true; }
      else if ((!ok || state._tunnelHideRoadside) && x.in) { arr = x.seg.sprites; var jx = arr ? arr.indexOf(x.spr) : -1; if (jx >= 0) arr.splice(jx, 1); x.in = false; }
    }
  }
  function install() {
    if (!ns.Gameplay || !ns.Renderer || ns.Gameplay._rb54) return !!(ns.Gameplay && ns.Gameplay._rb54);
    var gu = ns.Gameplay.update, rr = ns.Renderer.render;
    ns.Gameplay.update = function(state, dt) {
      var r = gu.apply(this, arguments);
      try { if (state && state.segments && state.segments.length) { updateGreenbelt(state); updateBodies(state, dt); updateParts(state, dt); } }
      catch (e) { if (!state._rb54err) { state._rb54err = 1; console.warn("roadbodies54", e); } }
      return r;
    };
    ns.Renderer.render = function(state) {
      var r = rr.apply(this, arguments);
      try { drawParts(state); } catch (e) {}
      return r;
    };
    ns.Gameplay._rb54 = true;
    return true;
  }
  if (!install()) { var tries = 0, iv = setInterval(function() { if (install() || ++tries > 200) clearInterval(iv); }, 25); }
  // sega54 build: splatTest kept for the API shape but INERT (no-op) in the shipped build
  ns.RoadBodies54 = { splatTest: function() { return false; }, bossBlood: bossBlood }; // sega56: + bossBlood
})(window.ApexRacer = window.ApexRacer || {});
