(function(ns) {
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // sega31l: bullet spawn Y tracks player elevation / gun muzzle (not fixed screen -50px)
  function bulletSpawnY(state) {
    var py;
    if (state._playerDrawDestY != null) {
      py = state._playerDrawDestY;
    } else if (state.playerElevScreenY != null) {
      py = state.height * state.playerElevScreenY;
    } else {
      py = state.height * 0.82;
    }
    var muzzle = -45;
    if (state.config) {
      if (state.config.bulletMuzzleYOffsetPx != null) muzzle = state.config.bulletMuzzleYOffsetPx;
      else if (!state.config.bulletOriginTracksElevation && state.config.bulletOriginYOffsetPx != null) {
        return (state.height * 0.82) + state.config.bulletOriginYOffsetPx;
      }
    }
    return py + muzzle;
  }


  function playerShotLife(state) {
    if (state.config && state.config.playerBulletFullScreenRange) return 30;
    return 1.2;
  }

  function shotDirection(px, py, tx, ty) {
    var dx = tx - px;
    var dy = ty - py;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { dirX: dx / d, dirY: dy / d };
  }

  function combatCfg(state) {
    return (state.config && state.config.combat) ? state.config.combat : {
      tinyHp: 10,
      mediumHp: 100,
      bossHp: 1000,
      baseTapDamage: 10,
      weaponPowerMax: 100,
      weaponPowerPerPickup: 8,
      powerPenaltyFromDamage: 16,
      enemyDamageTakenMult: 0.4875
    };
  }

  function tapDamage(state) {
    var c = combatCfg(state);
    var base = c.baseTapDamage != null ? c.baseTapDamage : 10;
    var dmg = base + (state.weaponPower || 0);
    // sega28/29: reduce damage TO enemies (editor enemyDamageTakenMult)
    var mult = c.enemyDamageTakenMult != null ? c.enemyDamageTakenMult : 1;
    return dmg * mult;
  }

  function nonBossBrainsAlive(state) {
    var n;
    if (!state.brains) { return false; }
    for (n = 0; n < state.brains.length; n++) {
      if (state.brains[n].alive && !state.brains[n].isBoss && !state.brains[n].bossDying) {
        return true;
      }
    }
    return false;
  }

  function beginBossTrueDeath(state, brain) {
    if (!brain || brain.bossDying) { return; }
    brain.bossDying = true;
    brain.alive = false; // no more combat, but kept until death anim finishes
    brain.hp = 0;
    brain.telegraph = 0;
    brain.bossDeathElapsed = 0;
    brain.bossDeathExplodeAcc = 0;
    brain.bossDeathPhase = "expand";
    brain.defeatExpand = 1;
    state.brainKills = (state.brainKills || 0) + 1;
    state.score += 50;
    state.eventText = "BOSS DOWN +50";
    state.eventTimer = state.config.eventFeedDuration;
    if (ns.Sfx) { ns.Sfx.brainKill(); }
    // choreography: if killed before mediums, still spawn them? — skip; adds already cleared for true death
  }

  function updateBossDying(state, brain, dt) {
    var c = state.config || {};
    var expandTo = (c.bossDeathThrobTargetScale != null) ? c.bossDeathThrobTargetScale
      : (c.bossDeathExpandTo != null ? c.bossDeathExpandTo : 10);
    var throbOn = c.bossDeathThrob !== false;
    brain.bossDeathElapsed = (brain.bossDeathElapsed || 0) + dt;
    brain.bobPhase = (brain.bobPhase || 0) + dt * 2.4;
    brain.y = brain.baseY + Math.sin(brain.bobPhase) * (brain.bobAmp || 0);

    // sega31d: throb expand:shrink 3:1 until 1000% while spraying Sega explosions
    if (throbOn && (brain.bossDeathPhase === "expand" || brain.bossDeathPhase === "throb")) {
      brain.bossDeathPhase = "throb";
      if (brain.bossThrobDir == null) brain.bossThrobDir = 1;
      if (brain.defeatExpand == null) brain.defeatExpand = 1;
      // 3:1 expand:shrink — expand 3 units time vs 1 shrink
      var expandSpeed = 1.8; // scale units / sec while expanding
      var shrinkSpeed = expandSpeed / 3; // 3:1 ratio
      if (brain.bossThrobDir > 0) {
        brain.defeatExpand += expandSpeed * dt;
        if (brain.defeatExpand >= expandTo) {
          brain.defeatExpand = expandTo;
          brain.bossThrobDir = -1;
        }
      } else {
        brain.defeatExpand -= shrinkSpeed * dt;
        var floor = Math.max(1, brain.defeatExpand * 0.85);
        // progressively higher floor so net growth trends to 1000%
        var minFloor = 1 + (Math.min(1, brain.bossDeathElapsed / 8)) * (expandTo - 1) * 0.55;
        if (brain.defeatExpand <= Math.max(minFloor, 1.2)) {
          brain.defeatExpand = Math.max(minFloor, 1.2);
          brain.bossThrobDir = 1;
        }
      }
      brain.drawScale = (brain.approach != null ? Math.max(0.08, brain.approach) : 1) *
        (1 + 0.08 * Math.sin((brain.throb || 0) + brain.bossDeathElapsed * 6)) * brain.defeatExpand;
      var sizeT = brain.radius * 2.4 * brain.drawScale;
      brain.screenRect = { x: brain.x - sizeT / 2, y: brain.y - sizeT / 2, w: sizeT, h: sizeT };

      // Random-size Sega explosions on brain while throbbing
      brain.bossDeathExplodeAcc = (brain.bossDeathExplodeAcc || 0) + dt;
      var popEvery = Math.max(0.06, 0.22 - Math.min(0.14, brain.bossDeathElapsed * 0.01));
      while (brain.bossDeathExplodeAcc >= popEvery) {
        brain.bossDeathExplodeAcc -= popEvery;
        var deathXMul = (c.bossDeathExplosionSizeMult != null) ? c.bossDeathExplosionSizeMult : 1;
        var mul = (0.25 + Math.random() * 2.2) * deathXMul;
        var ang = Math.random() * Math.PI * 2;
        var rad = brain.radius * brain.defeatExpand * (0.15 + Math.random() * 0.95);
        var ox = Math.cos(ang) * rad;
        var oy = Math.sin(ang) * rad * 0.75;
        if (ns.Fx && ns.Fx.spawnExplosion) {
          ns.Fx.spawnExplosion(state, brain.x + ox, brain.y + oy, "sega", mul);
        }
      }

      // Once we've reached ~1000% and throbbed a bit, finish with shrink pops
      if (brain.defeatExpand >= expandTo * 0.98 && brain.bossDeathElapsed > 6.5) {
        brain.bossDeathPhase = "explode";
        brain.bossDeathExplodeAcc = 0;
        brain.bossDeathExplodeWave = 0;
        brain.bossDeathElapsed = 0;
      }
      return true;
    }

    if (brain.bossDeathPhase === "expand") {
      var prog = Math.min(1, brain.bossDeathElapsed / 2.4);
      brain.defeatExpand = 1 + prog * (expandTo - 1);
      brain.drawScale = (brain.approach != null ? Math.max(0.08, brain.approach) : 1) *
        (1 + 0.12 * Math.sin(brain.throb || 0)) * brain.defeatExpand;
      var size = brain.radius * 2.4 * brain.drawScale;
      brain.screenRect = { x: brain.x - size / 2, y: brain.y - size / 2, w: size, h: size };
      if (prog >= 1) {
        brain.defeatExpand = expandTo;
        brain.bossDeathPhase = "explode";
        brain.bossDeathExplodeAcc = 0;
        brain.bossDeathExplodeWave = 0;
        brain.bossDeathElapsed = 0;
      }
      return true;
    }
    if (brain.bossDeathPhase === "explode") {
      brain.defeatExpand = expandTo;
      brain.drawScale = expandTo;
      brain.bossDeathExplodeAcc = (brain.bossDeathExplodeAcc || 0) + dt;
      var wave = brain.bossDeathExplodeWave || 0;
      var interval = 0.12 + wave * 0.04;
      var shrink = c.bossDeathExplosionsShrink !== false;
      while (brain.bossDeathExplodeAcc >= interval && wave < 12) {
        brain.bossDeathExplodeAcc -= interval;
        var deathXMul2 = (c.bossDeathExplosionSizeMult != null) ? c.bossDeathExplosionSizeMult : 1;
        var mul2 = (shrink ? Math.max(0.15, 2.4 - wave * 0.2) : (0.4 + Math.random() * 1.6)) * deathXMul2;
        var ang2 = Math.random() * Math.PI * 2;
        var rad2 = brain.radius * expandTo * (0.2 + Math.random() * 0.9);
        var ox2 = Math.cos(ang2) * rad2;
        var oy2 = Math.sin(ang2) * rad2 * 0.75;
        if (ns.Fx && ns.Fx.spawnExplosion) {
          ns.Fx.spawnExplosion(state, brain.x + ox2, brain.y + oy2, "sega", mul2);
        }
        wave += 1;
        brain.bossDeathExplodeWave = wave;
        interval = 0.12 + wave * 0.04;
      }
      if (wave >= 12 && brain.bossDeathElapsed > 0.35) {
        if (ns.Fx && ns.Fx.spawnExplosion) {
          var deathXMul3 = (c.bossDeathExplosionSizeMult != null) ? c.bossDeathExplosionSizeMult : 1;
          ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.25 * deathXMul3);
          ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.15 * deathXMul3);
        }
        brain.bossDeathPhase = "done";
        return false;
      }
      return true;
    }
    return false;
  }

  function rememberMediumPosition(state, brain) {
    if (!brain) return;
    if (!state._lastMediumPositions) state._lastMediumPositions = [];
    state._lastMediumPositions.push({
      x: brain.x,
      y: (brain.baseY != null ? brain.baseY : brain.y)
    });
    // keep last few
    if (state._lastMediumPositions.length > 8) {
      state._lastMediumPositions.shift();
    }
  }

  function resolveHp(state, opts) {
    var c = combatCfg(state);
    opts = opts || {};
    if (opts.hp != null) {
      return Math.max(1, Math.round(opts.hp));
    }
    if (opts.isBoss) {
      return c.bossHp != null ? c.bossHp : 1000;
    }
    if (opts.tiny || opts.kind === "tiny") {
      return c.tinyHp != null ? c.tinyHp : 10;
    }
    // sega31d: normal === medium
    return c.mediumHp != null ? c.mediumHp : (c.normalHp != null ? c.normalHp : 100);
  }

  // sega49: approachNoBrains — no brains of any kind from approachNoBrainsStart (78 s; sega50: decoupled
  // from starfieldFadeStart, which moved to 76 s) until the
  // tunnel interior brains start (interiorStart = tunnelEnterSec + tunnelBlackHoldSec).
  function approachNoBrainsActive(state) {
    var c = state && state.config;
    if (!c || c.approachNoBrains === false) return false;
    var nbStart = c.approachNoBrainsStart != null ? c.approachNoBrainsStart : 78.0;
    if (state.phase !== "running" || state.madMaxMode) return false;
    var t = state.songClock || 0;
    var interior = state._tunnelInteriorStart;
    if (!(interior > 0)) interior = (c.tunnelEnterSec != null ? c.tunnelEnterSec : 90.5) + Math.max(0, c.tunnelBlackHoldSec || 0);
    return t >= nbStart && t < interior;
  }

  function clearApproachBrains(state) {
    var list = state.brains || [], n, b, dur = (state.config.brainExitShrinkSec != null) ? state.config.brainExitShrinkSec : 0.85;
    for (n = 0; n < list.length; n++) {
      b = list[n];
      if (!b || !b.alive || b.exitShrink || b.bossDying || b.tunnelLane) continue;
      b.exitShrink = true; b.exitShrinkT = 0; b.exitShrinkDur = dur; b.vx = (b.vx || 0) * 0.3;
      b.telegraph = 0; b.kamikaze = false; b.zapTimer = 99999;
    }
    if (!state._approachBrainsCleared) {
      state._approachBrainsCleared = true;
      state.shots = []; state.lightningBolts = []; state.shockFlash = 0; state.brainSpawnTimer = 0;
    }
  }

  function spawnBrain(state, opts) {
    var cfg = state.config.brains;
    var w = state.width;
    var h = state.height;
    var bannerClear = Math.max(90, Math.round(h * 0.14));
    var yLo;
    var yHi;
    var sizeScale;
    var hp;
    var growDur;
    var startApproach;
    var vxMul;
    opts = opts || {};
    sizeScale = (opts.sizeScale != null) ? opts.sizeScale : 1;
    hp = resolveHp(state, opts);
    var isTiny = !!(opts.tiny || opts.kind === "tiny");
    var isMedium = !!(opts.medium || opts.kind === "medium" || opts.kind === "normal");
    if (!opts.isBoss && !isTiny && (state.config && state.config.normalBrainsAreMedium !== false)) {
      isMedium = true;
    }
    // sega31s: medium default size +25% when caller didn't pass sizeScale
    if (isMedium && !opts.isBoss && opts.sizeScale == null && state.config) {
      var medScale = state.config.mediumBrainScale;
      if (medScale == null && state.config.finaleFight) medScale = state.config.finaleFight.mediumScale;
      if (medScale != null) sizeScale = medScale;
    }
    vxMul = isTiny ? (2.6 + Math.random() * 1.4) : (opts.isBoss ? 0.65 : 1);
    if (isTiny) {
      state._tinySpawnCount = (state._tinySpawnCount || 0) + 1;
      var boost = (state.config && state.config.tinyBrainHorizontalSpeedBoostPerSpawn != null)
        ? state.config.tinyBrainHorizontalSpeedBoostPerSpawn : 0.05;
      vxMul *= (1 + boost * state._tinySpawnCount);
    }

    // sega19: originate higher; per-brain random grow duration / start scale
    if (opts.fromTop || opts.isBoss) {
      yLo = Math.round(h * (-0.02 + Math.random() * 0.04));
      yHi = Math.max(yLo + 20, Math.round(h * 0.12));
    } else {
      yLo = Math.max(40, Math.round(h * (0.05 + Math.random() * 0.10)));
      yHi = Math.max(yLo + 36, Math.round(h * (0.26 + Math.random() * 0.20)));
    }
    if (opts.y != null) {
      yLo = opts.y;
      yHi = opts.y;
    }

    if (opts.fastGrow) {
      growDur = 0.28 + Math.random() * 0.42;
    } else if (opts.isBoss || opts.fromTop) {
      growDur = (opts.approachDuration != null)
        ? opts.approachDuration
        : (2.4 + Math.random() * 1.6);
    } else {
      // vary: some creep in slowly from distance
      growDur = 0.9 + Math.random() * 2.6;
    }
    startApproach = (opts.startScale != null)
      ? opts.startScale
      : (0.015 + Math.random() * 0.06);

    var brain = {
      x: (opts.x != null) ? opts.x : (60 + Math.random() * (w - 120)),
      y: yLo + Math.random() * Math.max(1, (yHi - yLo)),
      vx: (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 28) * vxMul,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: (10 + Math.random() * 14) * (opts.isBoss ? 0.7 : sizeScale),
      baseY: 0,
      hp: hp,
      maxHp: hp,
      radius: cfg.radius * sizeScale,
      sizeScale: sizeScale,
      isBoss: !!opts.isBoss,
      tiny: isTiny,
      medium: isMedium && !isTiny && !opts.isBoss,
      finale: !!opts.finale,
      kind: opts.isBoss ? "boss" : (isTiny ? "tiny" : "medium"),
      gestationSec: (opts.gestationSec != null) ? opts.gestationSec : null,
      gestationTimer: (opts.gestationSec != null) ? opts.gestationSec : null,
      gestatesTinies: !!opts.gestatesTinies,
      zapTimer: cfg.zapInterval * (0.22 + Math.random() * 0.35) * (opts.isBoss ? 0.55 : 1),
      // sega24: +2.0s after fully grown before zaps may start (on top of approach gate)
      postGrowDelay: (cfg.postGrowZapDelay != null ? cfg.postGrowZapDelay : 2.0),
      telegraph: 0,
      hitFlash: 0,
      throb: Math.random() * Math.PI * 2,
      alive: true,
      approach: startApproach,
      approachSpeed: 1 / Math.max(0.15, growDur),
      fastGrow: !!opts.fastGrow,
      fromTop: !!(opts.fromTop || opts.isBoss),
      targetBaseY: null,
      zapCount: 0,
      spawnedTinies: false,
      screenRect: { x: 0, y: 0, w: 0, h: 0 }
    };
    brain.baseY = brain.y;
    if (opts.fromTop || opts.isBoss) {
      // Drift down into upper playfield while growing
      brain.targetBaseY = bannerClear + Math.round(h * (0.10 + Math.random() * 0.14));
    }
    if (!opts.isBoss && !opts.tunnelLane && (approachNoBrainsActive(state) || state.bossDoom)) { // sega52: + boss doom
      // sega49: swallowed during the starfield approach (never added to state.brains)
      brain.alive = false; brain.hp = 0;
      return brain;
    }
    state.brains.push(brain);
    return brain;
  }

  /** sega19 boss: alone from top — no pack spawn */
  function spawnFinaleBoss(state) {
    var ff = (state.config && state.config.finaleFight) ? state.config.finaleFight : {};
    var combat = combatCfg(state);
    clearLivingForFinale(state);
    var boss = spawnBrain(state, {
      isBoss: true,
      finale: true,
      fromTop: true,
      // sega52: bossSizeMult 1.45 — radius (draw + hit rect) 45% bigger in every phase
      sizeScale: (ff.bossScale != null ? ff.bossScale : 2) * ((state.config && state.config.bossSizeMult != null) ? state.config.bossSizeMult : 1),
      hp: ff.bossHp != null ? ff.bossHp : (combat.bossHp || 1000),
      approachDuration: ff.approachDuration != null ? ff.approachDuration : 3.2,
      startScale: 0.02,
      x: state.width * 0.5
    });
    state.finaleBossId = boss;
    state.finaleBrainsSpawned = true;
    state.brainMaxActive = 0;
    state.brainSpawnInterval = 99;
    state.sectionBrains = true;
    state.bossPhase = "approach";
    state.bossZapCount = 0;
    state.bossMediumsSpawned = false;
    state.bossTiniesSpawned = false;
    state.mediumZapElapsed = 0;
    state.globalZapLock = null;
    state._lastMediumPositions = [];
    // sega51: BOSS REWORK — 4-phase machine (rwChoreo) instead of the old approach/bossZaps/mediums flow
    state._rwActive = false;
    if (state.config && state.config.bossRework !== false && boss) {
      state._rwActive = true;
      state.bossPhase = "rwWait";
      state._rw = { phaseT: 0, nextShot: 0, lastLane: Math.random() < 0.5 ? 0 : 1, y0: 0, spawnedMediums: false, dropAcc: 0, dropLane: 0 };
      boss.rwCtl = true; boss.noFight = true; boss.noTap = true;
      boss.approach = 1; boss.postGrowDelay = 0; boss.targetBaseY = null; boss.vx = 0; boss.fadeAlpha = 0;
    }
    return boss;
  }

  // ---- sega51 BOSS REWORK -------------------------------------------------------------------------
  function rwCfg(state, k, d) { var c = state.config || {}; return c[k] != null ? c[k] : d; }
  function rwSetDraw(boss, x, y, scale, alpha, dt) {
    boss.throb = (boss.throb || 0) + dt * 3.0;
    var th = 1 + 0.08 * Math.sin(boss.throb);
    boss.x = x; boss.baseY = y; boss.y = y;
    boss.drawScale = Math.max(0.01, scale) * th;
    boss.fadeAlpha = alpha;
    var sz = (boss.radius || 60) * 2.4 * boss.drawScale;
    boss.screenRect = { x: x - sz / 2, y: y - sz / 2, w: sz, h: sz };
    return sz;
  }
  function rwHerLane(state) {
    var offs = (state.config && state.config.laneOffsets) || [-0.55, 0.55];
    var mid = (offs[0] + offs[offs.length - 1]) / 2;
    return (state.playerX != null ? state.playerX : 0) < mid ? 0 : 1;
  }
  function rwSpawnProjectile(state, x0, y0, lane, travel, scaleK, shootable, kind) {
    var b = spawnBrain(state, { tiny: true, kind: "tiny", finale: true, x: x0, y: y0, sizeScale: scaleK, startScale: 1 });
    if (!b) return null;
    b.rwProj = kind || "proj"; b.noFight = true; b.noTap = !shootable;
    b.lane = lane; b.pu = 0; b.travel = Math.max(0.2, travel);
    b.sx = x0; b.sy = y0; b.ex = laneScreenX(state, lane); b.ey = playerElevAimY(state);
    b.approach = 1; b.postGrowDelay = 0; b.vx = 0; b.telegraph = 0; b.kamikaze = false; b.zapTimer = 99999;
    b.s0 = kind === "drop" ? 0.7 : 0.3;
    return b;
  }
  function updateRwProjectile(state, b, dt) {
    var h = state.height || 720;
    b.pu += dt / b.travel;
    var cT = state.config || {};
    var persist = cT.tinyBrainPersistOffscreen !== false;
    var p = persist ? b.pu : Math.min(1.35, b.pu);
    // sega52: bossTinySpeedMatchTunnel — accelerate like the tunnel runners (slow far, fast close: p = u^2)
    var pp = (cT.bossTinySpeedMatchTunnel !== false && b.rwProj !== "drop") ? p * p : p;
    b.ex = laneScreenX(state, b.lane); // her lanes can drift slightly (elevation / approach scale)
    var x = b.sx + (b.ex - b.sx) * pp, y = b.sy + (b.ey - b.sy) * pp;
    b.throb = (b.throb || 0) + dt * 6;
    var sc = (b.s0 + (1 - b.s0) * Math.min(1, p)) * (1 + 0.06 * Math.sin(b.throb));
    b.x = x; b.baseY = y; b.y = y; b.drawScale = sc; b.fadeAlpha = 1;
    var sz = (b.radius || 16) * 2.4 * sc;
    b.screenRect = { x: x - sz / 2, y: y - sz / 2, w: sz, h: sz };
    if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt * 4);
    if (!b._rwHitDone && b.pu >= 1) {
      b._rwHitDone = true;
      if (rwHerLane(state) === (b.lane | 0)) {
        var dmg = rwCfg(state, b.rwProj === "drop" ? "bossDropDamage" : "bossProjectileDamage", 30);
        if (ns.Gameplay && ns.Gameplay.applyDamageExternal) ns.Gameplay.applyDamageExternal(state, dmg);
        else if (state.health != null) state.health = Math.max(0, state.health - dmg);
        state._zapHit = true;
        state.shockFlash = Math.max(state.shockFlash || 0, 1.0 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1));
        state.eventText = "BRAIN HIT!"; state.eventTimer = 0.75;
        b.alive = false; b.hp = 0;
        if (ns.Fx && ns.Fx.spawnExplosion) ns.Fx.spawnExplosion(state, x, y, "sega", 0.55);
        return;
      }
      state.eventText = "DODGED"; state.eventTimer = 0.5;
    }
    // sega52: tinyBrainPersistOffscreen — a miss keeps flying until it is fully past a screen edge
    var wv = state.width || 1280;
    var off = (y - sz / 2 > h) || (x + sz / 2 < 0) || (x - sz / 2 > wv) || (y + sz / 2 < 0 && b.pu > 1);
    if (persist ? (off || b.pu > 6) : (b.pu >= 1.35 || y - sz / 2 > h)) b.alive = false;
  }
  function rwShrinkOut(state, pred) {
    var i, b, dur = rwCfg(state, "bossFailsafeShrinkSec", 0.6);
    for (i = 0; i < state.brains.length; i++) {
      b = state.brains[i];
      if (b && b.alive && !b.exitShrink && pred(b)) { b.exitShrink = true; b.exitShrinkT = 0; b.exitShrinkDur = dur; b.noTap = true; b.telegraph = 0; }
    }
  }
  // sega52: boss doom — every live brain glows and converges on her; sections kills her when they arrive
  function startBossDoom(state) {
    var sec = rwCfg(state, "bossDoomAttackSec", 1.2), i, b;
    state.bossDoom = true; state._bossDoomT = 0;
    for (i = 0; i < state.brains.length; i++) {
      b = state.brains[i];
      if (!b || !b.alive || b.bossDying || b.exitShrink) continue;
      b.doomCtl = true; b.noTap = true; b.noFight = true; b.rwCtl = false;
      b.dsx = b.x != null ? b.x : (state.width || 1280) / 2; b.dsy = b.y != null ? b.y : (state.height || 720) * 0.4;
      b.ds0 = b.drawScale || 1; b.dpu = 0; b.dsec = sec;
      b.telegraphMax = sec; b.telegraph = sec;
    }
  }
  function updateDoomBrain(state, b, dt) {
    b.dpu = Math.min(1, b.dpu + dt / Math.max(0.1, b.dsec));
    var e = b.dpu * b.dpu * (3 - 2 * b.dpu);
    var tx = laneScreenX(state, rwHerLane(state)), ty = playerElevAimY(state);
    var x = b.dsx + (tx - b.dsx) * e, y = b.dsy + (ty - b.dsy) * e;
    b.throb = (b.throb || 0) + dt * 12;
    var cG = state.config || {};
    var shr = (b.isBoss && cG.bossGameOverScale != null && +cG.bossGameOverScale > 0) ? 0 : 0.35; // sega56: boss no longer shrinks at the doom (scaled up at draw)
    var sc = b.ds0 * (1 - shr * e) * (1 + 0.1 * Math.sin(b.throb));
    b.x = x; b.baseY = y; b.y = y; b.drawScale = sc; b.fadeAlpha = 1;
    b.telegraph = Math.max(0.001, b.dsec * (1 - b.dpu)); // glow ramps to full on arrival
    var sz = (b.radius || 20) * 2.4 * sc;
    b.screenRect = { x: x - sz / 2, y: y - sz / 2, w: sz, h: sz };
  }
  function rwFindBoss(state) {
    for (var i = 0; i < state.brains.length; i++) { var b = state.brains[i]; if (b && b.isBoss && b.alive && !b.bossDying) return b; }
    return null;
  }
  function rwChoreo(state, dt) {
    var boss = rwFindBoss(state);
    var R = state._rw || (state._rw = { phaseT: 0 });
    if (!boss || state.bossDefeatBeat || state.finaleWon || state.finaleLost || state.bossDoom) return;
    var w = state.width || 640, h = state.height || 720, t = state.songClock || 0;
    var ff = (state.config && state.config.finaleFight) || {};
    var horizonY = state._roadHorizonY != null ? state._roadHorizonY : h * 0.5;
    var viewY = Math.max(90, Math.round(h * 0.14)) + h * 0.14;
    var ph = state.bossPhase;
    R.phaseT += dt;
    function go(np) { state.bossPhase = np; R.phaseT = 0; }
    // failsafe: final phase no later than bossFinalLatestStartSec
    if (ph !== "rwFinal" && ph !== "rwDescendFinal" && t >= rwCfg(state, "bossFinalLatestStartSec", 205)) {
      rwShrinkOut(state, function(b) { return b.rwMedium || b.rwProj; });
      R.y0 = (boss.fadeAlpha > 0.05) ? boss.y : -(boss.radius || 60) * 2.4;
      go("rwDescendFinal"); ph = state.bossPhase;
    }
    // boss shot down to 0 HP before the final phase: stop the phase chain, clear the adds, let the normal
    // final-shot/death logic finish it where it is (it is visible in every phase it can be damaged in)
    if (boss.hp <= 0 && ph !== "rwFinal") {
      rwShrinkOut(state, function(b) { return b.rwMedium || b.rwProj; });
      boss.rwCtl = false; boss.noFight = false; boss.noTap = false; boss.approach = 1; boss.postGrowDelay = 0;
      boss.targetBaseY = null; boss.vx = 0; boss.fadeAlpha = 1;
      go("rwFinal");
      return;
    }
    var sz;
    if (ph === "rwWait") {
      rwSetDraw(boss, w / 2, horizonY, 0.01, 0, dt); boss.noTap = true;
      var landed = false;
      if (rwCfg(state, "bossLandFromCurrentY", true) !== false && ns.Sega31 && ns.Sega31.easeLandToGround &&
          (state.elevTier > 1 || state._landY0 != null)) {
        landed = ns.Sega31.easeLandToGround(state, dt); // sega52: smooth landing from her drawn altitude
        if (!landed) return;
      }
      if (landed || rwCfg(state, "bossWaitForGround", true) === false || !(state.elevTier > 1) || R.phaseT >= rwCfg(state, "bossWaitForGroundMaxSec", 3)) {
        go("rwApproach"); R.nextShot = rwCfg(state, "bossApproachProjectileFirstDelay", 1.0);
      }
      return;
    }
    if (ph === "rwApproach") {
      var dur = Math.max(0.5, rwCfg(state, "bossApproachDur", 7));
      // sega54: dome reveal — the brain is inside the Capitol dome: hidden until the burst, sits in the broken dome,
      // then rises out (bossRiseDurSec) onto the normal approach path and becomes the boss. Needs the Capitol plate drawn.
      var dRv = (ns.Renderer && ns.Renderer.domeReveal54) ? ns.Renderer.domeReveal54(state) : null;
      var dXY = state._capitolDomeXY;
      var fromDome = !!(dRv && dRv.on && dXY && state._capitolBossActive);
      var sDome = 0.2;
      if (fromDome) {
        var cavW = 88 * (dXY.ppx || 0.5) * rwCfg(state, "bossRiseStartScaleMult", 1.0);
        sDome = Math.max(0.06, Math.min(0.6, cavW / Math.max(1, (boss.radius || 60) * 2.4)));
        var revShoot = rwCfg(state, "bossShootFromRevealOn", true) !== false;
        var revEvery = Math.max(0.2, rwCfg(state, "bossRevealShootEverySec", 0.8));
        if (t < dRv.riseStart) {
          var szH = rwSetDraw(boss, dXY.x, dXY.y, sDome, t >= dRv.burst ? 1 : 0, dt);
          boss.noTap = true; R.phaseT = 0; R.domeRise = true;
          if (revShoot && t >= dRv.burst) {           // sega54: angry from the moment it is revealed
            R.revShot = (R.revShot != null ? R.revShot : 0.15) - dt;
            if (R.revShot <= 0) {
              R.revShot = revEvery; R.lastLane = 1 - (R.lastLane || 0);
              rwSpawnProjectile(state, boss.x, boss.y + szH * 0.2, R.lastLane, rwCfg(state, "bossProjectileTravelSec", 1.2),
                rwCfg(state, "bossProjectileScale", 0.42), rwCfg(state, "bossProjectileShootable", true) !== false, "proj");
            }
          }
          R.nextShot = Math.min(R.nextShot != null ? R.nextShot : revEvery, revEvery);
          return;
        }
      }
      function rwSpawnMediums54() {
        var n = Math.max(0, Math.round(rwCfg(state, "bossMediumCount", 3))), i, m, mult = rwCfg(state, "bossMediumSpeedMult", 1.5);
        for (i = 0; i < n; i++) {
          m = spawnBrain(state, { finale: true, medium: true, kind: "medium", sizeScale: ff.mediumScale != null ? ff.mediumScale : 1.25,
            hp: rwCfg(state, "bossMediumHp", 100), fastGrow: true, x: w * ((i + 1) / (n + 1)) });
          if (m && m.alive !== false) {
            m.rwMedium = true;
            m.vx = (m.vx || (Math.random() < 0.5 ? -60 : 60)) * mult;
            m.approachSpeed = (m.approachSpeed || 0.85) * mult;
            m.zapTimer = (m.zapTimer != null ? m.zapTimer : 1.5) / mult;
          }
        }
        R.y0 = boss.y; R.spawnedMediums = true;
        go("rwMediums");
      }
      // sega54: from the dome — RISE out of the skull to a hover point just above it, HOVER bossDomeHoverSec swaying
      // left/right and spitting tiny brains at her, then APPROACH (bossDomeApproachSec) to the fight line; only then the
      // normal fight (mediums, drops, final) starts.
      if (fromDome && R.domeRise) {
        var rDur = Math.max(0.2, dRv.riseDur), hov = Math.max(0, rwCfg(state, "bossDomeHoverSec", 6));
        var apS = Math.max(0.3, rwCfg(state, "bossDomeApproachSec", 2.0)), pT = R.phaseT;
        var sH = sDome * rwCfg(state, "bossDomeHoverScaleMult", 1.25);
        var szEst = (boss.radius || 60) * 2.4 * sH;
        var hy0 = Math.max(dXY.y - rwCfg(state, "bossRiseLiftPx", 70), szEst * 0.5 + 6);
        var hx, hy, hs, shootEv, kk;
        if (pT < rDur) {
          kk = pT / rDur; kk = kk * kk * (3 - 2 * kk);
          hx = dXY.x; hy = dXY.y + (hy0 - dXY.y) * kk; hs = sDome + (sH - sDome) * kk;
          shootEv = revShoot ? revEvery : 0;
        } else if (pT < rDur + hov) {
          var tau = pT - rDur, swA = rwCfg(state, "bossDomeSwayPx", 90) * Math.min(1, tau / 0.6);
          var swHz = rwCfg(state, "bossDomeSwayHz", 129 / 60 / 4);
          hx = dXY.x + swA * Math.sin(6.2832 * swHz * tau); hy = hy0 + 5 * Math.sin(6.2832 * swHz * 2 * tau); hs = sH;
          shootEv = Math.max(0, rwCfg(state, "bossDomeHoverShootEverySec", 0.7));
          R.hovEnd = null;
        } else {
          if (!R.hovEnd) R.hovEnd = { x: boss.x, y: boss.y };
          kk = Math.min(1, (pT - rDur - hov) / apS); var ke = kk * kk * (3 - 2 * kk);
          hx = R.hovEnd.x + (w / 2 - R.hovEnd.x) * ke; hy = R.hovEnd.y + (viewY - R.hovEnd.y) * ke; hs = sH + (1 - sH) * ke * ke;
          shootEv = kk < 0.9 ? rwCfg(state, "bossApproachProjectileEvery", 1.1) : 0;
        }
        sz = rwSetDraw(boss, hx, hy, hs, 1, dt);
        boss.noTap = !(rwCfg(state, "bossShootableBeforeFinal", true) !== false && hs >= 0.3);
        R.nextShot -= dt;
        if (shootEv > 0 && R.nextShot <= 0) {
          R.nextShot = Math.max(0.2, shootEv); R.lastLane = 1 - (R.lastLane || 0);
          rwSpawnProjectile(state, boss.x, boss.y + sz * 0.2, R.lastLane, rwCfg(state, "bossProjectileTravelSec", 1.2),
            rwCfg(state, "bossProjectileScale", 0.42), rwCfg(state, "bossProjectileShootable", true) !== false, "proj");
        }
        if (pT >= rDur + hov + apS) { R.domeFight = true; rwSpawnMediums54(); }
        return;
      }
      var u = Math.min(1, R.phaseT / dur);
      var s0 = rwCfg(state, "bossApproachStartScale", 0.05);
      var scA = s0 + (1 - s0) * u * u;
      var axX = w / 2, axY = horizonY + (viewY - horizonY) * (u * (2 - u)), aAl = Math.min(1, u / 0.08);
      if (fromDome && R.domeRise) {
        var rk = Math.min(1, R.phaseT / Math.max(0.2, dRv.riseDur)); rk = rk * rk * (3 - 2 * rk);
        axX = dXY.x + (axX - dXY.x) * rk;
        // rise UP out of the skull first (arc of bossRiseLiftPx), then swoop down/forward onto the fight line
        var lift = rwCfg(state, "bossRiseLiftPx", 70) * Math.sin(Math.PI * Math.min(1, rk * 1.15));
        axY = dXY.y + (viewY - dXY.y) * rk + (axY - viewY) * rk - Math.max(0, lift);
        scA = Math.max(scA, sDome); aAl = 1;
      }
      sz = rwSetDraw(boss, axX, axY, scA, aAl, dt);
      // sega51: bossShootableBeforeFinal — boss takes damage while visible (A once big enough, C), not while off-screen
      boss.noTap = !(rwCfg(state, "bossShootableBeforeFinal", true) !== false && scA >= 0.3);
      R.nextShot -= dt;
      if (R.nextShot <= 0 && u < 0.97) {
        // sega54: during the rise out of the dome it fires at the reveal rate
        R.nextShot = (fromDome && R.domeRise && R.phaseT < dRv.riseDur && rwCfg(state, "bossShootFromRevealOn", true) !== false)
          ? Math.max(0.2, rwCfg(state, "bossRevealShootEverySec", 0.8)) : rwCfg(state, "bossApproachProjectileEvery", 1.1);
        R.lastLane = 1 - R.lastLane;
        rwSpawnProjectile(state, boss.x, boss.y + sz * 0.2, R.lastLane, rwCfg(state, "bossProjectileTravelSec", 1.2),
          rwCfg(state, "bossProjectileScale", 0.42), rwCfg(state, "bossProjectileShootable", true) !== false, "proj");
      }
      if (u >= 1) {
        var n = Math.max(0, Math.round(rwCfg(state, "bossMediumCount", 3))), i, m, mult = rwCfg(state, "bossMediumSpeedMult", 1.5);
        for (i = 0; i < n; i++) {
          m = spawnBrain(state, { finale: true, medium: true, kind: "medium", sizeScale: ff.mediumScale != null ? ff.mediumScale : 1.25,
            hp: rwCfg(state, "bossMediumHp", 100), fastGrow: true, x: w * ((i + 1) / (n + 1)) });
          if (m && m.alive !== false) {
            m.rwMedium = true;
            m.vx = (m.vx || (Math.random() < 0.5 ? -60 : 60)) * mult;
            m.approachSpeed = (m.approachSpeed || 0.85) * mult;
            m.zapTimer = (m.zapTimer != null ? m.zapTimer : 1.5) / mult;
          }
        }
        R.y0 = boss.y; R.spawnedMediums = true;
        go("rwMediums");
      }
      return;
    }
    if (ph === "rwMediums") {
      var ex = Math.max(0.2, rwCfg(state, "bossExitUpSec", 1.2));
      var ue = Math.min(1, R.phaseT / ex);
      var full = (boss.radius || 60) * 2.4;
      rwSetDraw(boss, w / 2, R.y0 + (-full - R.y0) * ue * ue, 1, ue >= 1 ? 0 : 1, dt);
      boss.noTap = true;
      var aliveM = 0;
      for (var j = 0; j < state.brains.length; j++) { var bm = state.brains[j]; if (bm && bm.rwMedium && bm.alive && !bm.exitShrink) aliveM++; }
      if (R.phaseT >= rwCfg(state, "bossMediumPhaseMaxSec", 9)) { rwShrinkOut(state, function(b) { return b.rwMedium; }); aliveM = 0; }
      if (R.domeFight && ue >= 1 && t >= rwCfg(state, "bossDomeMediumEndBySec", 200.5) + (+rwCfg(state, "bossEmergeDelaySec", 0) || 0)) { rwShrinkOut(state, function(b) { return b.rwMedium; }); aliveM = 0; } // sega54
      if (aliveM === 0 && ue >= 1) { go("rwDrop"); R.dropAcc = 0; R.dropLane = rwHerLane(state); }
      return;
    }
    if (ph === "rwDrop") {
      var dd = Math.max(0.5, rwCfg(state, "bossDropDescendSec", 4));
      var ud = Math.min(1, R.phaseT / dd);
      var fullD = (boss.radius || 60) * 2.4;
      var dropY = h * 0.16;
      sz = rwSetDraw(boss, w / 2, -fullD * 0.6 + (dropY + fullD * 0.6) * (ud * (2 - ud)), 1, 1, dt);
      boss.noTap = !(rwCfg(state, "bossShootableBeforeFinal", true) !== false && boss.y > 0);
      R.dropAcc += dt;
      if (R.dropAcc >= rwCfg(state, "bossDropEvery", 0.7) && ud < 0.98 && R.phaseT > 0.4) {
        R.dropAcc = 0;
        var mode = rwCfg(state, "bossDropTargetMode", "herLane");
        var lane = mode === "alternate" ? (R.dropLane = 1 - R.dropLane) : (mode === "random" ? (Math.random() < 0.5 ? 0 : 1) : rwHerLane(state));
        rwSpawnProjectile(state, laneScreenX(state, lane), Math.max(20, boss.y + sz * 0.25), lane, rwCfg(state, "bossDropFallSec", 0.9),
          rwCfg(state, "bossDropScale", 0.42), rwCfg(state, "bossDropShootable", true) !== false, "drop");
      }
      if (ud >= 1) { R.y0 = boss.y; go("rwDescendFinal"); }
      return;
    }
    if (ph === "rwDescendFinal") {
      var fd = Math.max(0.2, rwCfg(state, "bossFinalDescendSec", 1.5));
      var uf = Math.min(1, R.phaseT / fd);
      var fy = h * rwCfg(state, "bossFinalYFrac", 0.40);
      var fx = rwCfg(state, "bossFinalFollowLane", true) !== false ? laneScreenX(state, rwHerLane(state)) : w / 2;
      var ease = uf * uf * (3 - 2 * uf);
      rwSetDraw(boss, boss.x + (fx - boss.x) * Math.min(1, dt * 3), R.y0 + (fy - R.y0) * ease, 1, 1, dt);
      boss.noTap = !(rwCfg(state, "bossShootableBeforeFinal", true) !== false && boss.y > 0);
      if (uf >= 1) {
        boss.rwCtl = false; boss.noFight = false; boss.noTap = false;
        boss.approach = 1; boss.postGrowDelay = 0; boss.targetBaseY = null; boss.vx = 0; boss.bobAmp = Math.min(boss.bobAmp || 6, 6);
        boss.zapTimer = 0.6; boss.fadeAlpha = 1;
        go("rwFinal");
      }
      return;
    }
    if (ph === "rwFinal") {
      boss.vx = 0;
      if (rwCfg(state, "bossFinalFollowLane", true) !== false) {
        var tx = laneScreenX(state, rwHerLane(state));
        boss.x += (tx - boss.x) * Math.min(1, dt * 2.5);
      }
    }
  }

  // sega51: glow-warning seconds per attacker
  function teleSecFor(state, brain, cfgB) {
    var c = state.config || {};
    if (state._rwActive && c.bossRework !== false) {
      if (brain.isBoss || brain.bossOffspring) return c.bossGlowWarnSec != null ? c.bossGlowWarnSec : 0.5;
      if (brain.rwMedium) return c.bossMediumGlowWarnSec != null ? c.bossMediumGlowWarnSec : cfgB.telegraphSeconds;
    }
    return cfgB.telegraphSeconds;
  }

  function spawnFinaleMediums(state) {
    var ff = (state.config && state.config.finaleFight) ? state.config.finaleFight : {};
    var combat = combatCfg(state);
    var hp = ff.mediumHp != null ? ff.mediumHp : (combat.normalHp || 100);
    var scale = ff.mediumScale != null ? ff.mediumScale : 1;
    var a = spawnBrain(state, {
      finale: true,
      medium: true,
      sizeScale: scale,
      hp: hp,
      fastGrow: true,
      x: state.width * 0.28
    });
    var b = spawnBrain(state, {
      finale: true,
      medium: true,
      sizeScale: scale,
      hp: hp,
      fastGrow: true,
      x: state.width * 0.72
    });
    state.bossMediumsSpawned = true;
    state.bossPhase = "mediums";
    state.mediumZapElapsed = 0;
    return [a, b];
  }

  function spawnTiniesFromMediums(state) {
    var ff = (state.config && state.config.finaleFight) ? state.config.finaleFight : {};
    var combat = combatCfg(state);
    var hp = ff.tinyHp != null ? ff.tinyHp : (combat.tinyHp || 10);
    var scale = ff.tinyScale != null ? ff.tinyScale : 0.42;
    var ensure = ff.ensureBossTinies !== false;
    var n;
    var brain;
    var i;
    var parent;
    var spawned = 0;
    var living = state.brains.slice();
    var origins = [];

    for (n = 0; n < living.length; n++) {
      parent = living[n];
      if (!parent.alive || !parent.medium || parent.spawnedTinies) {
        continue;
      }
      parent.spawnedTinies = true;
      origins.push({
        x: parent.x,
        y: (parent.baseY != null ? parent.baseY : parent.y) + 20
      });
      rememberMediumPosition(state, parent);
    }

    // sega29 ensureBossTinies: if mediums already dead, still spawn from last known / center
    if (!origins.length && ensure) {
      var saved = state._lastMediumPositions || [];
      if (saved.length) {
        for (n = 0; n < saved.length; n++) {
          origins.push({ x: saved[n].x, y: saved[n].y + 20 });
        }
      } else {
        origins.push(
          { x: state.width * 0.28, y: state.height * 0.35 },
          { x: state.width * 0.72, y: state.height * 0.35 }
        );
      }
    }

    for (n = 0; n < origins.length; n++) {
      for (i = 0; i < 2; i++) {
        brain = spawnBrain(state, {
          finale: true,
          tiny: true,
          kind: "tiny",
          sizeScale: scale,
          hp: hp,
          fastGrow: true,
          x: origins[n].x + (i === 0 ? -36 : 36),
          y: origins[n].y
        });
        brain.vx *= 1.15;
        spawned++;
      }
    }

    // Never mark tinies spawned unless we actually created some
    if (spawned > 0) {
      state.bossTiniesSpawned = true;
      state.bossPhase = "tinies";
    }
    return spawned;
  }

  /** @deprecated sega18 pack — kept as no-op alias → spawnFinaleBoss */
  function spawnFinaleFightPack(state) {
    return spawnFinaleBoss(state);
  }

  function clearLivingForFinale(state) {
    state.brains = [];
    state.shots = [];
    state.lightningBolts = [];
    state.scorchMarks = [];
    state.shockFlash = 0;
    state.brainSpawnTimer = 99;
    state.globalZapLock = null;
  }

  function finaleBrainsCleared(state) {
    var n;
    if (!state.finaleBrainsSpawned) {
      return false;
    }
    if (!state.brains || !state.brains.length) {
      return true;
    }
    for (n = 0; n < state.brains.length; n++) {
      if (state.brains[n].alive || state.brains[n].bossDying) {
        return false;
      }
    }
    return true;
  }

  function spawnBossMultiExplosion(state, brain) {
    var i;
    var ox;
    var oy;
    var ang;
    var rad;
    var sizes = [0.35, 0.55, 0.8, 1.1, 1.45, 0.5, 1.9, 0.7, 1.25, 0.95, 1.6, 0.4, 1.35, 0.65, 2.1, 0.85, 1.15, 0.5, 1.7, 1.0];
    if (!ns.Fx || !ns.Fx.spawnExplosion) {
      return;
    }
    // sega21: ring of blasts all around the boss + core
    for (i = 0; i < sizes.length; i++) {
      ang = (i / sizes.length) * Math.PI * 2 + Math.random() * 0.4;
      rad = brain.radius * (0.6 + Math.random() * 2.4);
      ox = Math.cos(ang) * rad;
      oy = Math.sin(ang) * rad * 0.75;
      ns.Fx.spawnExplosion(state, brain.x + ox, brain.y + oy, "boss", sizes[i]);
    }
    for (i = 0; i < 8; i++) {
      ox = (Math.random() - 0.5) * brain.radius * 3.4;
      oy = (Math.random() - 0.5) * brain.radius * 2.8;
      ns.Fx.spawnExplosion(state, brain.x + ox, brain.y + oy, "boss", 0.4 + Math.random() * 1.6);
    }
    ns.Fx.spawnExplosion(state, brain.x, brain.y, "boss", 2.8);
    ns.Fx.spawnExplosion(state, brain.x, brain.y - brain.radius * 0.4, "boss", 2.0);
    state.explosionFlash = Math.max(state.explosionFlash || 0, 1.65);
  }

  function resetBrains(state) {
    state.brains = [];
    state.shots = [];
    state.lightningBolts = [];
    state.scorchMarks = [];
    state.shockFlash = 0;
    state.brainSpawnTimer = state.config.brains.spawnInterval * 0.6;
    state.brainKills = 0;
    state.globalZapLock = null;
    state.bossPhase = null;
    state.bossZapCount = 0;
    state._tinySpawnCount = 0;
  }

  function ensureBrains(state, dt) {
    var cfg = state.config.brains;
    if (state.sectionBrains === false) {
      return;
    }
    if (state.finaleFight || state.finaleMode === "fight") {
      return;
    }
    // sega31x: tunnel — brains already smashed; no new spawns
    if (state.inTunnel) {
      return;
    }
    var maxActive = state.brainMaxActive != null ? state.brainMaxActive : cfg.maxActive;
    var interval = state.brainSpawnInterval != null ? state.brainSpawnInterval : cfg.spawnInterval;
    if (maxActive <= 0) {
      return;
    }
    state.brainSpawnTimer -= dt;
    if (state.brains.length < maxActive && state.brainSpawnTimer <= 0) {
      var tSong = (state.songClock != null && !isNaN(state.songClock)) ? state.songClock : (state.elapsed || 0);
      var preBridge = !(state.config && state.config.preBridgeOnlyTinyBrains === false) && tSong < 90;
      var inChorus1 = state.sectionId === "chorus1";
      if (preBridge && !inChorus1) {
        spawnBrain(state, { tiny: true, kind: "tiny", sizeScale: 0.42 });
      } else if (inChorus1) {
        // chorus1: medium gestators that birth tinies
        spawnBrain(state, {
          medium: true,
          kind: "medium",
          gestatesTinies: true,
          gestationSec: (state.config && state.config.chorus1MediumGestationSec != null)
            ? state.config.chorus1MediumGestationSec : 3.0
        });
      } else if (preBridge) {
        spawnBrain(state, { tiny: true, kind: "tiny", sizeScale: 0.42 });
      } else {
        spawnBrain(state, { medium: true, kind: "medium" });
      }
      state.brainSpawnTimer = interval * (0.75 + Math.random() * 0.5);
    }
  }

  // sega31q: block ALL fire when HP≤0 / DEATH / dying (bossDefeatBeat)
  // queued: also block when WELL DONE / YOU WIN / winCruise / winBanner
  function playerCannotShoot(state) {
    if (!state) return true;
    if (state.health != null && state.health <= 0) return true;
    if (state.deathFlashTimer > 0) return true;
    if (state.bossDefeatBeat) return true;
    if (state.finaleLost) return true;
    var c = state.config || {};
    if (c.noFireOnWinCruise !== false && c.noFireWhenWinBanner !== false) {
      if (state.finaleMode === "winCruise") return true;
      if (state.finaleWon) return true;
      if (state.winBanner) return true;
    }
    return false;
  }

  function fireShotAt(state, brain) {
    if (playerCannotShoot(state)) {
      return false;
    }
    if (!brain || !brain.alive) {
      return false;
    }
    var px = state.width / 2;
    // sega31l: shots originate at gun / current elevation Y
    var py = bulletSpawnY(state);
    var ty = brain.y + Math.sin(brain.bobPhase) * brain.bobAmp;
    var dir = shotDirection(px, py, brain.x, ty);
    state.shots.push({
      x: px,
      y: py,
      tx: brain.x,
      ty: ty,
      target: brain,
      speed: state.config.brains.shotSpeed,
      life: playerShotLife(state),
      dirX: dir.dirX,
      dirY: dir.dirY,
      trail: []
    });
    // sega24: original bullet projectile FX only (no electric arc on shots)
    if (ns.Sfx) {
      ns.Sfx.brainShot();
    }
    return true;
  }

  function tryTapShoot(state, canvasX, canvasY) {
    if (state.phase !== "running" && state.phase !== "countdown") {
      return false;
    }
    // sega31q: block tap brains / tap cars / free-aim when HP≤0 or dead/dying/DEATH
    if (playerCannotShoot(state)) {
      return false;
    }
    var n;
    var brain;
    var r;
    var best = null;
    var bestDist = Infinity;
    var dx;
    var dy;
    var dist;
    var nearest = null;
    var nearestDist = Infinity;

    for (n = 0; n < state.brains.length; n++) {
      brain = state.brains[n];
      if (!brain.alive) {
        continue;
      }
      r = brain.screenRect;
      if (brain.bossDying) { continue; }
      if (brain.noTap) { continue; } // sega51: invulnerable boss (phases A-C) / non-shootable projectiles
      dx = canvasX - (r.x + r.w / 2);
      dy = canvasY - (r.y + r.h / 2);
      dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = brain;
      }
      // sega31v: brain tap hit pad (wider than draw rect; still requires brain aim)
      var padMul = (state.config && state.config.brainTapHitPadMult != null)
        ? state.config.brainTapHitPadMult : 1.28;
      var rcx = r.x + r.w / 2;
      var rcy = r.y + r.h / 2;
      var rhw = (r.w * padMul) / 2;
      var rhh = (r.h * padMul) / 2;
      if (
        canvasX >= rcx - rhw &&
        canvasX <= rcx + rhw &&
        canvasY >= rcy - rhh &&
        canvasY <= rcy + rhh
      ) {
        if (dist < bestDist) {
          bestDist = dist;
          best = brain;
        }
      }
    }

    // Tier3: shoot cars under tap
    if (!best && ns.Sega31 && ns.Sega31.canShootCars && ns.Sega31.canShootCars(state) && state.cars) {
      var car;
      var cr;
      var bestCar = null;
      var bestCarDist = Infinity;
      for (n = 0; n < state.cars.length; n++) {
        car = state.cars[n];
        if (!car || car.exploded || car.kind === "life" || car.isPickup) continue;
        cr = car.screenRect;
        if (!cr) continue;
        if (canvasX >= cr.x && canvasX <= cr.x + cr.w && canvasY >= cr.y && canvasY <= cr.y + cr.h) {
          dx = canvasX - (cr.x + cr.w / 2);
          dy = canvasY - (cr.y + cr.h / 2);
          dist = dx * dx + dy * dy;
          if (dist < bestCarDist) {
            bestCarDist = dist;
            bestCar = car;
          }
        }
      }
      if (bestCar) {
        fireShotAtCar(state, bestCar, canvasX, canvasY);
        return true;
      }
    }

    if (best) {
      fireShotAt(state, best);
      return true;
    }
    // sega31m: REMOVE miss→nearest auto-aim — free-aim toward tap (cybercab tap already handled)
    var allowNearest = !(state.config && state.config.missAutoAimNearest === false);
    if (allowNearest && nearest && state.config && state.config.tapRequiresBrainHit === false) {
      fireShotAt(state, nearest);
      return true;
    }
    fireFreeShot(state, canvasX, canvasY);
    return true;
  }

  function fireFreeShot(state, tx, ty) {
    if (playerCannotShoot(state)) {
      return false;
    }
    var px = state.width / 2;
    // sega31l: shots originate at gun / current elevation Y
    var py = bulletSpawnY(state);
    var dir = shotDirection(px, py, tx, ty);
    state.shots.push({
      x: px,
      y: py,
      tx: tx,
      ty: ty,
      target: null,
      freeAim: true,
      speed: state.config.brains.shotSpeed,
      life: playerShotLife(state),
      dirX: dir.dirX,
      dirY: dir.dirY,
      trail: []
    });
    if (ns.Sfx) { ns.Sfx.brainShot(); }
    return true;
  }

  function fireShotAtCar(state, car, tx, ty) {
    if (playerCannotShoot(state)) {
      return false;
    }
    var px = state.width / 2;
    // sega31l: shots originate at gun / current elevation Y
    var py = bulletSpawnY(state);
    var cr = car.screenRect || { x: tx, y: ty, w: 0, h: 0 };
    var tcx = cr.x + cr.w / 2;
    var tcy = cr.y + cr.h / 2;
    var dir = shotDirection(px, py, tcx, tcy);
    state.shots.push({
      x: px,
      y: py,
      tx: tcx,
      ty: tcy,
      target: null,
      targetCar: car,
      speed: state.config.brains.shotSpeed,
      life: playerShotLife(state),
      dirX: dir.dirX,
      dirY: dir.dirY,
      trail: []
    });
    if (ns.Sfx) { ns.Sfx.brainShot(); }
    return true;
  }

  function explodeCarFromShot(state, car) {
    if (!car || car.exploded) return;
    // sega31l: carHp/cybercabHp = 1 — one bullet kills
    var maxHp = 1;
    if (state.config) {
      if (state.config.carHp != null) maxHp = state.config.carHp;
      else if (state.config.cybercabHp != null) maxHp = state.config.cybercabHp;
    }
    if (car.hp == null) car.hp = maxHp;
    car.hp -= 1;
    if (car.hp > 0) {
      car.hitFlash = 1;
      return;
    }
    car.exploded = true;
    car.hitCounted = true;
    var sx = car.screenRect ? (car.screenRect.x + car.screenRect.w / 2) : state.width / 2;
    var sy = car.screenRect ? (car.screenRect.y + car.screenRect.h / 2) : state.height * 0.55;
    if (ns.Fx && ns.Fx.spawnExplosion) {
      ns.Fx.spawnExplosion(state, sx, sy, "sega", 1.1 + Math.random() * 0.8);
    }
    // Remove from traffic list
    var i;
    if (state.cars) {
      for (i = state.cars.length - 1; i >= 0; i--) {
        if (state.cars[i] === car) { state.cars.splice(i, 1); break; }
      }
    }
    state.score = (state.score || 0) + 5;
    state.eventText = "CAR +5";
    state.eventTimer = state.config.eventFeedDuration;
  }

  function damageBrain(state, brain, amount, hx, hy) {
    if (!brain || !brain.alive || brain.bossDying) {
      return;
    }
    brain.hitFlash = 1;
    // sega56: bossHitBloodOn - the road-corpse blood splat at the wound on the boss (sticks, drips, fades)
    if (brain.isBoss && !(state.config && state.config.bossHitBloodOn === false) && ns.RoadBodies54 && ns.RoadBodies54.bossBlood) {
      try { ns.RoadBodies54.bossBlood(state, brain, hx, hy); } catch (eBl) {}
    }
    // sega30: boss survive at 0 HP until all non-boss brains are dead; then final shot kills
    if (brain.isBoss && state.config && state.config.bossSurviveAtZeroUntilAddsClear !== false) {
      var addsAlive = nonBossBrainsAlive(state);
      if (addsAlive) {
        brain.hp = Math.max(0, brain.hp - amount);
        // Clamp/survive — absorb hits at 0 while adds remain
        if (brain.hp <= 0) {
          brain.hp = 0;
          brain.bossWaitingFinalShot = true;
        }
        return;
      }
      // Only boss remains: next successful hit delivers final kill
      if (brain.hp <= 0 || brain.bossWaitingFinalShot) {
        beginBossTrueDeath(state, brain);
        return;
      }
      brain.hp -= amount;
      if (brain.hp <= 0) {
        beginBossTrueDeath(state, brain);
      }
      return;
    }
    brain.hp -= amount;
    if (brain.hp <= 0) {
      if (brain.isBoss) {
        beginBossTrueDeath(state, brain);
        if (!state.bossMediumsSpawned && (state.finaleFight || state.finaleMode === "fight")) {
          spawnFinaleMediums(state);
        }
      } else {
        brain.alive = false;
        state.brainKills = (state.brainKills || 0) + 1;
        if (brain.medium) {
          rememberMediumPosition(state, brain);
        }
        if (ns.Fx && ns.Fx.spawnExplosion) {
          ns.Fx.spawnExplosion(state, brain.x, brain.y, "brain");
        }
        state.score += 10;
        state.eventText = "BRAIN +10";
        state.eventTimer = state.config.eventFeedDuration;
        if (ns.Sfx) {
          ns.Sfx.brainKill();
        }
      }
    }
  }


  function tryHitCarAt(state, x, y) {
    if (!state.cars) return false;
    var n, car, cr, dx, dy;
    for (n = 0; n < state.cars.length; n++) {
      car = state.cars[n];
      if (!car || car.exploded || !car.screenRect) continue;
      cr = car.screenRect;
      if (x >= cr.x - 8 && x <= cr.x + cr.w + 8 && y >= cr.y - 8 && y <= cr.y + cr.h + 8) {
        explodeCarFromShot(state, car);
        return true;
      }
    }
    return false;
  }

  function updateMediumGestation(state, dt) {
    if (!state.brains) return;
    var n, brain, count, i, child, gSec;
    var tiniesPer = (state.config && state.config.chorus1MediumSpawnsTinyCount != null)
      ? state.config.chorus1MediumSpawnsTinyCount : 2;
    for (n = 0; n < state.brains.length; n++) {
      brain = state.brains[n];
      if (!brain.alive || !brain.gestatesTinies || brain.spawnedTinies) continue;
      // wait until mostly grown
      if (brain.approach != null && brain.approach < 0.85) continue;
      if (brain.gestationTimer == null) {
        gSec = brain.gestationSec != null ? brain.gestationSec
          : ((state.config && state.config.chorus1MediumGestationSec != null)
            ? state.config.chorus1MediumGestationSec : 3);
        brain.gestationTimer = gSec;
      }
      brain.gestationTimer -= dt;
      if (brain.gestationTimer > 0) continue;
      brain.spawnedTinies = true;
      for (i = 0; i < tiniesPer; i++) {
        child = spawnBrain(state, {
          tiny: true,
          kind: "tiny",
          sizeScale: 0.42,
          fastGrow: true,
          x: brain.x + (i === 0 ? -28 : 28),
          y: (brain.baseY != null ? brain.baseY : brain.y) + 18
        });
        // come OUT of the medium
        child.approach = 0.35;
        child.vx *= 1.2;
      }
    }
  }

  function updateShots(state, dt) {
    var n;
    var shot;
    var brain;
    var dx;
    var dy;
    var dist;
    var step;
    var hitR;
    var dmg = tapDamage(state);

    var homingOn = !(state.config && state.config.brainBulletHoming === false);
    for (n = state.shots.length - 1; n >= 0; n--) {
      shot = state.shots[n];
      shot.life -= dt;
      brain = shot.target;
      // sega31m: DISABLE brain bullet homing — lock aim at fire-time tx/ty
      if (homingOn && brain && brain.alive) {
        shot.tx = brain.x;
        shot.ty = brain.baseY + Math.sin(brain.bobPhase) * brain.bobAmp;
      }
      dx = shot.tx - shot.x;
      dy = shot.ty - shot.y;
      dist = Math.sqrt(dx * dx + dy * dy) || 1;
      step = shot.speed * dt;
      shot.trail.push({ x: shot.x, y: shot.y, life: 0.25 });
      if (shot.trail.length > 8) {
        shot.trail.shift();
      }
      if (shot.targetCar && shot.targetCar.exploded) {
        state.shots.splice(n, 1);
        continue;
      }
      // sega31z: EndAtTap overrides full-screen coast — never extend past fire-time tx/ty
      var cfgB = state.config || {};
      var endAtTap = (cfgB.playerBulletEndAtTap !== false) || (cfgB.playerBulletEndAtTapOnMiss !== false);
      var fullRange = !!(cfgB.playerBulletFullScreenRange) && !endAtTap;
      if (step >= dist) {
        shot.x = shot.tx;
        shot.y = shot.ty;
        var didHit = false;
        if (brain && brain.alive) {
          var bdx0 = brain.x - shot.x;
          var bdy0 = (brain.baseY + Math.sin(brain.bobPhase) * brain.bobAmp) - shot.y;
          var hitR0 = brain.radius * (homingOn ? 1.4 : 1.15);
          if (homingOn || (bdx0 * bdx0 + bdy0 * bdy0) <= hitR0 * hitR0) {
            damageBrain(state, brain, dmg, shot.x, shot.y);
            didHit = true;
          }
        } else if (shot.targetCar) {
          explodeCarFromShot(state, shot.targetCar);
          didHit = true;
        } else if (shot.freeAim && ns.Sega31 && ns.Sega31.canShootCars && ns.Sega31.canShootCars(state)) {
          if (tryHitCarAt(state, shot.x, shot.y)) didHit = true;
        }
        // sega31z FINAL: NEVER coast/extend past tap. Hit → damage+splice; miss → splice at tap.
        // playerBulletEndAtTap / EndAtTapOnMiss / StopOnCollision; FullScreenRange=false.
        // (coast extend dir*8000 removed)
        state.shots.splice(n, 1);
        continue;
      }
      shot.x += (dx / dist) * step;
      shot.y += (dy / dist) * step;
      // Proximity hit vs live brain position (works with or without homing)
      if (brain && brain.alive) {
        var bdx = brain.x - shot.x;
        var bdy = (brain.baseY + Math.sin(brain.bobPhase) * brain.bobAmp) - shot.y;
        hitR = brain.radius * 0.85;
        if ((bdx * bdx + bdy * bdy) < hitR * hitR) {
          damageBrain(state, brain, dmg, shot.x, shot.y);
          state.shots.splice(n, 1);
          continue;
        }
      } else if (shot.targetCar) {
        hitR = 18;
        if (dist < hitR) {
          explodeCarFromShot(state, shot.targetCar);
          state.shots.splice(n, 1);
          continue;
        }
      }
      // Cull at canvas edges (full-screen range) or by short TTL (legacy)
      if (fullRange) {
        var margin = 48;
        if (shot.x < -margin || shot.x > state.width + margin ||
            shot.y < -margin || shot.y > state.height + margin) {
          state.shots.splice(n, 1);
          continue;
        }
      } else if (shot.life <= 0) {
        state.shots.splice(n, 1);
      }
    }

    state.brains = state.brains.filter(function(b) {
      return b.alive || b.bossDying || b.exitShrink;
    });
  }

  function updateLightning(state, dt) {
    var n;
    for (n = state.lightningBolts.length - 1; n >= 0; n--) {
      state.lightningBolts[n].life -= dt;
      if (state.lightningBolts[n].life <= 0) {
        state.lightningBolts.splice(n, 1);
      }
    }
    if (state.scorchMarks) {
      for (n = state.scorchMarks.length - 1; n >= 0; n--) {
        state.scorchMarks[n].life -= dt;
        if (state.scorchMarks[n].life <= 0) {
          state.scorchMarks.splice(n, 1);
        }
      }
    }
    if (state.shockFlash > 0) {
      state.shockFlash = Math.max(0, state.shockFlash - dt * 2.8);
    }
  }

  function laneScreenX(state, lane) {
    var offsets = state.config.laneOffsets || [-0.55, 0.55];
    var idx = Math.max(0, Math.min(offsets.length - 1, lane | 0));
    return state.width / 2 + offsets[idx] * state.width * 0.22;
  }

  function spawnScorch(state, x, y) {
    if (!state.scorchMarks) {
      state.scorchMarks = [];
    }
    state.scorchMarks.push({
      x: x,
      y: y,
      life: 0.85,
      maxLife: 0.85,
      r: 18 + Math.random() * 10
    });
    if (state.scorchMarks.length > 12) {
      state.scorchMarks.shift();
    }
  }

  function isTinyBrain(brain) {
    return !!(brain && (brain.tiny || brain.kind === "tiny"));
  }

  function playerElevAimY(state) {
    // sega31q queued: FEET anchor (_playerDrawDestY; Render.player offsetY=-1).
    // sega31p 0.65 FAILED: bike sprite head is near CROWN (~0.85–0.95 from feet), not mid-body;
    // 0.65 ≈ chest/shoulders; comment wrongly equated 0.65 with feetY−H+0.10H (those are NOT equal).
    // CHANGE: aimY = feetY − drawH + inset×drawH (sprite TOP + small inset). Used by chew/dive/zaps.
    var baseY;
    if (state._playerDrawDestY != null) {
      baseY = state._playerDrawDestY;
    } else if (state.playerElevScreenY != null) {
      baseY = state.height * state.playerElevScreenY;
    } else {
      baseY = state.height * 0.78;
    }
    var drawH = state._playerDrawH;
    if (drawH == null || !(drawH > 0)) {
      drawH = (state.height || 720) * 0.14;
    }
    // Prefer crown-inset mode (default). Legacy feet-frac if tinyKamikazeAimCrownInset === false.
    var useCrown = !(state.config && state.config.tinyKamikazeAimCrownInset === false);
    if (useCrown) {
      var inset = 0.10;
      if (state.config && state.config.tinyKamikazeHeadInsetOfPlayerDrawH != null) {
        inset = state.config.tinyKamikazeHeadInsetOfPlayerDrawH;
      }
      return baseY - drawH + drawH * inset;
    }
    var frac = 0.90;
    if (state.config && state.config.tinyKamikazeHeadOffsetOfPlayerDrawH != null) {
      frac = state.config.tinyKamikazeHeadOffsetOfPlayerDrawH;
    }
    return baseY - drawH * frac;
  }

  // sega31l/m: tiny glow telegraph then kamikaze dive (no lightning)
  function startTinyKamikaze(state, brain) {
    brain.kamikaze = true;
    brain.kamikazeFall = false;
    brain.telegraph = 0;
    brain.kamikazeLane = (brain.attackLane != null) ? brain.attackLane : state.lane;
    brain.kamikazeT = 0;
    var dur = 0.55;
    if (state.config && state.config.tinyKamikazeDiveSec != null) dur = state.config.tinyKamikazeDiveSec;
    brain.kamikazeDur = dur;
    // sega31m: lock dive elev to player's tier at attack start
    brain.kamikazeTargetY = playerElevAimY(state);
    brain.kamikazeTargetElev = state.elevTier || 1;
    state.globalZapLock = null;
    state.eventText = "KAMIKAZE!";
    state.eventTimer = 0.9;
  }

  function updateTinyKamikaze(state, brain, dt) {
    var attackLane = (brain.kamikazeLane != null) ? brain.kamikazeLane : state.lane;
    var targetX = laneScreenX(state, attackLane);
    var roadY = state.height * 0.90;
    var size;
    var cfgC = state.config || {};

    // sega31n: chew shake — attach to player, vigorous screen-relative shake, then resolve
    if (brain.chewShake) {
      brain.chewShakeT = (brain.chewShakeT || 0) + dt;
      var chewDur = brain.chewShakeDur != null ? brain.chewShakeDur
        : (cfgC.tinyChewShakeSec != null ? cfgC.tinyChewShakeSec : 1.0);
      var ampFrac = cfgC.tinyChewShakeAmpOfPlayfieldH != null ? cfgC.tinyChewShakeAmpOfPlayfieldH : 0.01111;
      var amp = (state.height || 720) * ampFrac;
      var followX = (state.width != null ? state.width / 2 : targetX);
      // Prefer player draw / elev lane X when available
      if (state._playerDrawDestX != null) followX = state._playerDrawDestX;
      else followX = laneScreenX(state, state.lane != null ? state.lane : attackLane);
      var followY = playerElevAimY(state);
      // Vigorous chew shake (screen-relative amp)
      var shakeX = (Math.random() - 0.5) * 2 * amp * (1.2 + Math.random());
      var shakeY = (Math.random() - 0.5) * 2 * amp * (1.2 + Math.random());
      brain.x = followX + shakeX;
      brain.baseY = followY + shakeY;
      brain.y = brain.baseY;
      size = (brain.radius || 20) * 2.2 * (brain.drawScale || 1);
      brain.screenRect = { x: brain.x - size / 2, y: brain.y - size / 2, w: size, h: size };
      // sega31o: debris/shards during chew (not cute sparkles)
      if (cfgC.tinyChewShards !== false && ns.Fx && ns.Fx.spawnDebrisShards) {
        brain._chewShardAcc = (brain._chewShardAcc || 0) + dt;
        var pulse = cfgC.tinyChewShardPulseSec != null ? cfgC.tinyChewShardPulseSec : 0.08;
        while (brain._chewShardAcc >= pulse) {
          brain._chewShardAcc -= pulse;
          ns.Fx.spawnDebrisShards(state, brain.x, brain.y, 0.55 + Math.random() * 0.35);
        }
      }
      if (brain.chewShakeT >= chewDur) {
        if (ns.Fx && ns.Fx.spawnExplosion) {
          ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.8 + Math.random() * 0.4);
        }
        brain.alive = false;
        brain.kamikaze = false;
        brain.chewShake = false;
        return false;
      }
      return true;
    }

    // sega31m: after evade — visibly fall to road, harmless
    if (brain.kamikazeFall) {
      brain.kamikazeFallT = (brain.kamikazeFallT || 0) + dt;
      brain.x += (targetX - brain.x) * Math.min(1, dt * 4);
      brain.baseY = Math.min(roadY, brain.baseY + dt * (520 + brain.kamikazeFallT * 680));
      brain.y = brain.baseY;
      size = (brain.radius || 20) * 2.2 * (brain.drawScale || 1);
      brain.screenRect = { x: brain.x - size / 2, y: brain.y - size / 2, w: size, h: size };
      if (brain.baseY >= roadY - 6 || brain.kamikazeFallT > 1.4) {
        spawnScorch(state, brain.x + (Math.random() - 0.5) * 12, roadY);
        state.eventText = "MISSED";
        state.eventTimer = state.config.eventFeedDuration;
        if (ns.Fx && ns.Fx.spawnExplosion) {
          ns.Fx.spawnExplosion(state, brain.x, roadY, "sega", 0.4 + Math.random() * 0.25);
        }
        brain.alive = false;
        brain.kamikaze = false;
        brain.kamikazeFall = false;
        return false;
      }
      return true;
    }

    brain.kamikazeT = (brain.kamikazeT || 0) + dt;
    var dur = brain.kamikazeDur || 0.55;
    var t = Math.min(1, brain.kamikazeT / Math.max(0.05, dur));
    var playerY = playerElevAimY(state);
    var diveY = (brain.kamikazeTargetY != null) ? brain.kamikazeTargetY : playerY;
    // ease toward locked lane / player elev band (NOT fixed ground)
    brain.x += (targetX - brain.x) * Math.min(1, dt * 9);
    brain.baseY += (diveY - brain.baseY) * Math.min(1, dt * 11);
    brain.y = brain.baseY + Math.sin(brain.bobPhase || 0) * (brain.bobAmp || 0) * 0.2;
    size = (brain.radius || 20) * 2.2 * (brain.drawScale || 1);
    brain.screenRect = { x: brain.x - size / 2, y: brain.y - size / 2, w: size, h: size };
    if (t < 1) return true;
    // Impact: lane switch since glow = miss→fall; stay = contact hit at elev
    var evade = state.lane !== attackLane;
    if (evade) {
      if (state.config && state.config.tinyKamikazeMissFallsToGround === false) {
        spawnScorch(state, targetX + (Math.random() - 0.5) * 12, roadY);
        state.eventText = "MISSED";
        state.eventTimer = state.config.eventFeedDuration;
        if (ns.Fx && ns.Fx.spawnExplosion) {
          ns.Fx.spawnExplosion(state, targetX, roadY, "sega", 0.55 + Math.random() * 0.35);
        }
        brain.alive = false;
        brain.kamikaze = false;
        return false;
      }
      brain.kamikazeFall = true;
      brain.kamikazeFallT = 0;
      state.eventText = "MISSED";
      state.eventTimer = state.config.eventFeedDuration;
      return true;
    }
    var cfgB = state.config.brains || {};
    var dmg = (state.config.damage && state.config.damage.brainZap != null)
      ? state.config.damage.brainZap
      : (cfgB.zapDamage != null ? cfgB.zapDamage : 12);
    var immune = false;
    if (ns.Sega31 && ns.Sega31.immuneToZaps && ns.Sega31.immuneToZaps(state)) {
      state.eventText = "KAMIKAZE IMMUNE";
      immune = true;
    } else if (ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showZaps")) {
      state.eventText = "KAMIKAZE BLOCKED";
      immune = true;
    } else {
      // Damage at START of chew (or immediate if chew disabled)
      state._zapHit = true;
      state.shockFlash = 1.0 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1);
      if (ns.Gameplay && ns.Gameplay.applyDamageExternal) {
        ns.Gameplay.applyDamageExternal(state, dmg);
      }
      state.eventText = "KAMIKAZE HIT!";
    }
    state.eventTimer = state.config.eventFeedDuration;

    // sega31n: on contact — attach + chew shake 1.0s then resolve (KEEP evade→fall above)
    if (!immune && cfgC.tinyKamikazeChewOnContact !== false) {
      brain.chewShake = true;
      brain.chewShakeT = 0;
      brain.chewShakeDur = cfgC.tinyChewShakeSec != null ? cfgC.tinyChewShakeSec : 1.0;
      brain.kamikazeFall = false;
      return true;
    }

    if (ns.Fx && ns.Fx.spawnExplosion) {
      ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.8 + Math.random() * 0.4);
    }
    brain.alive = false;
    brain.kamikaze = false;
    return false;
  }

  function zapPlayer(state, brain) {
    var cfg = state.config.brains;
    var dmg = (state.config.damage && state.config.damage.brainZap != null)
      ? state.config.damage.brainZap
      : cfg.zapDamage;
    if (ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "showZaps")) {
      return;
    }
    if (ns.Sega31 && ns.Sega31.immuneToZaps && ns.Sega31.immuneToZaps(state)) {
      state.eventText = "ZAP IMMUNE";
      state.eventTimer = 0.8;
      brain.zapCount = (brain.zapCount || 0) + 1;
      state.globalZapLock = null;
      return;
    }
    state._zapHit = true;
    var by = brain.baseY + Math.sin(brain.bobPhase) * brain.bobAmp;
    var attackLane = (brain.attackLane != null) ? brain.attackLane : state.lane;
    // sega31n: bolt targets her current altitude (not fixed ground Y)
    var playerY = playerElevAimY(state);
    var roadY = state.height * 0.90;
    var evade = state.lane !== attackLane;
    var targetX;
    var targetY;

    if (evade) {
      targetX = laneScreenX(state, attackLane) + (Math.random() - 0.5) * 18;
      targetY = roadY;
      state.lightningBolts.push({
        x1: brain.x,
        y1: by,
        x2: targetX,
        y2: targetY,
        life: 0.34,
        maxLife: 0.34,
        roadHit: true
      });
      spawnScorch(state, targetX, targetY);
      state.eventText = "DODGED";
      state.eventTimer = state.config.eventFeedDuration;
    } else {
      targetX = state.width / 2 + (Math.random() - 0.5) * 40;
      targetY = playerY;
      // sega25: single bolt from zapping brain only (no multi-bolt storm / ground forks)
      state.lightningBolts.push({
        x1: brain.x,
        y1: by,
        x2: targetX,
        y2: targetY,
        life: 0.36,
        maxLife: 0.36,
        roadHit: false,
        thick: true
      });
      state.shockFlash = 1.0 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1);
      if (ns.Gameplay && ns.Gameplay.applyDamageExternal) {
        ns.Gameplay.applyDamageExternal(state, dmg);
      }
      state.eventText = "Brain zap!";
      state.eventTimer = state.config.eventFeedDuration;
    }

    brain.zapCount = (brain.zapCount || 0) + 1;
    if (brain.isBoss) {
      state.bossZapCount = (state.bossZapCount || 0) + 1;
    }
    state.globalZapLock = null;
  }

  function anyTelegraphing(state) {
    var n;
    for (n = 0; n < state.brains.length; n++) {
      if (state.brains[n].alive && state.brains[n].telegraph > 0) {
        return true;
      }
    }
    return false;
  }

  function updateBossChoreography(state, dt) {
    var ff = (state.config && state.config.finaleFight) ? state.config.finaleFight : {};
    var needZaps = ff.bossZapsBeforeMediums != null ? ff.bossZapsBeforeMediums : 3;
    var windowSec = ff.bossTinySpawnAfterMediumsSec != null
      ? ff.bossTinySpawnAfterMediumsSec
      : (ff.mediumZapWindow != null ? ff.mediumZapWindow : 5);
    if (!(state.finaleMode === "fight" || state.finaleFight)) {
      return;
    }
    if (state._rwActive) { rwChoreo(state, dt); return; } // sega51
    if (state.bossPhase === "approach") {
      // Stay in approach until boss fully emerged
      var boss = null;
      var n;
      for (n = 0; n < state.brains.length; n++) {
        if (state.brains[n].isBoss && state.brains[n].alive) {
          boss = state.brains[n];
          break;
        }
      }
      if (boss && boss.approach >= 0.98) {
        state.bossPhase = "bossZaps";
        boss.zapTimer = 0.2;
      }
      return;
    }
    if (state.bossPhase === "bossZaps") {
      if ((state.bossZapCount || 0) >= needZaps && !state.bossMediumsSpawned) {
        spawnFinaleMediums(state);
      }
      return;
    }
    if (state.bossPhase === "mediums") {
      state.mediumZapElapsed = (state.mediumZapElapsed || 0) + dt;
      if (!state.bossTiniesSpawned && state.mediumZapElapsed >= windowSec) {
        spawnTiniesFromMediums(state);
      }
    }
  }

  function brainMayZap(state, brain) {
    // sega22: no zaps until grow/approach fully complete
    if (brain.approach != null && brain.approach < 0.98) {
      return false;
    }
    // sega24: extra delay after fully grown before first zap window
    if ((brain.postGrowDelay || 0) > 0) {
      return false;
    }
    // During boss-only zaps phase, only the boss fires
    if (state.bossPhase === "approach") {
      return false;
    }
    if (state.bossPhase === "bossZaps" && !brain.isBoss && !brain.bossOffspring) {
      return false;
    }
    // sega25: global zap lock always — at most one brain telegraphs/fires at once
    if (anyTelegraphing(state) && (!(brain.telegraph > 0))) {
      return false;
    }
    if (state.globalZapLock && state.globalZapLock !== brain) {
      return false;
    }
    return true;
  }


  // sega45 E: tunnel lane runner — horizon (tunnel VP) → its LOCKED lane toward her, like a cybercab.
  // No hover / wind-up / homing. Same lane at arrival = hit; other lane = passes by. Shootable all the way.
  function updateTunnelLaneBrain(state, brain, dt) {
    var c = state.config || {};
    var h = state.height || 720;
    var w = state.width || 640;
    brain.vx = 0; brain.telegraph = 0; brain.kamikaze = false;
    brain.zapTimer = 99999; brain.postGrowDelay = 99999; brain.noFight = true;
    var speed = brain.laneSpeed != null ? brain.laneSpeed : (c.tunnelBrainSpeed != null ? c.tunnelBrainSpeed : 0.6);
    brain.laneU = (brain.laneU || 0) + dt * Math.max(0.05, speed);
    var persistT = c.tinyBrainPersistOffscreen !== false; // sega52
    var u = persistT ? brain.laneU : Math.min(1.35, brain.laneU);
    var path = state._tunnelPath;
    var vpX = w * (path && path.vpX != null ? path.vpX : 0.5);
    var vpY = h * (path && path.vpY != null ? path.vpY : 0.48);
    var lx = laneScreenX(state, brain.lane | 0);
    var ly = playerElevAimY(state);
    var p = u * u; // perspective: slow far away, fast up close
    brain.x = vpX + (lx - vpX) * p;
    brain.baseY = vpY + (ly - vpY) * p;
    brain.y = brain.baseY;
    var scale = 0.05 + 0.95 * p;
    brain.throb = (brain.throb || 0) + dt * 4;
    var throbScale = 1 + 0.06 * Math.sin(brain.throb);
    brain.drawScale = scale * throbScale;
    brain.approach = Math.min(1, scale);
    brain.fadeAlpha = Math.min(1, u / 0.12);
    var size = (brain.radius || 16) * 2.4 * brain.drawScale;
    brain.screenRect = { x: brain.x - size / 2, y: brain.y - size / 2, w: size, h: size };
    if (brain.hitFlash > 0) brain.hitFlash = Math.max(0, brain.hitFlash - dt * 4);
    if (!brain._tunnelHitDone && u >= 0.97) {
      brain._tunnelHitDone = true;
      // her lane by her (tweened) position, so a lane change that is under way counts
      var offs = c.laneOffsets || [-0.55, 0.55];
      var mid = (offs[0] + offs[offs.length - 1]) / 2;
      var herLane = (state.playerX != null ? state.playerX : 0) < mid ? 0 : 1;
      if (herLane === (brain.lane | 0) && !state.tunnelExiting) {
        var dmg = c.tunnelBrainDamage;
        if (dmg == null) dmg = (c.damage && c.damage.brainZap != null) ? c.damage.brainZap : ((c.brains && c.brains.zapDamage) || 30);
        if (ns.Gameplay && ns.Gameplay.applyDamageExternal) ns.Gameplay.applyDamageExternal(state, dmg);
        else if (state.health != null) state.health = Math.max(0, state.health - dmg);
        state._zapHit = true;
        state.eventText = "BRAIN HIT!";
        state.eventTimer = 0.75;
        brain.alive = false;
        brain.hp = 0;
        if (ns.Fx && ns.Fx.spawnExplosion) ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.6);
        return;
      }
      state.eventText = "DODGED";
      state.eventTimer = 0.5;
    }
    var offT = (brain.y - size / 2 > h) || (brain.x + size / 2 < 0) || (brain.x - size / 2 > w);
    if (persistT ? (offT || u > 4) : (u >= 1.35 || brain.y - size / 2 > h)) {
      brain.alive = false; // passed her, fully off screen — silent
    }
  }

  // sega45 J: boss offspring — small brains start bossOffspringStartSec into the fight, every
  // bossOffspringEverySec, at most bossOffspringMax alive. Stop (and pop the rest) once the boss dies,
  // so they can never block the win.
  function updateBossOffspring(state, dt) {
    var c = state.config || {};
    if (!(state.finaleMode === "fight" || state.finaleFight) || state.finaleWon || state.finaleLost) {
      state._bossFightT = 0; state._bossOffspringAcc = 0;
      return;
    }
    if (c.bossOffspringEnabled === false) return;
    if (state._rwActive && state.bossPhase !== "rwFinal") return; // sega51: offspring only in the final fight
    state._bossFightT = (state._bossFightT || 0) + dt;
    var boss = null, i, b, alive = 0;
    for (i = 0; i < state.brains.length; i++) {
      b = state.brains[i];
      if (b && b.isBoss && b.alive && !b.bossDying) boss = b;
      if (b && b.alive && b.bossOffspring) alive++;
    }
    if (!boss || state.bossDefeatBeat) {
      if (alive) {
        for (i = 0; i < state.brains.length; i++) {
          b = state.brains[i];
          if (b && b.alive && b.bossOffspring) {
            b.alive = false; b.hp = 0;
            if (ns.Fx && ns.Fx.spawnExplosion) ns.Fx.spawnExplosion(state, b.x, b.y, "sega", 0.45);
          }
        }
      }
      return;
    }
    var startSec = c.bossOffspringStartSec != null ? c.bossOffspringStartSec : 2.0;
    var every = c.bossOffspringEverySec != null ? c.bossOffspringEverySec : 3.0;
    var cap = c.bossOffspringMax != null ? c.bossOffspringMax : 3;
    if (state._bossFightT < startSec || !(every > 0)) return;
    state._bossOffspringAcc = (state._bossOffspringAcc == null ? every : state._bossOffspringAcc) + dt;
    if (state._bossOffspringAcc < every) return;
    if (alive >= cap) return; // wait for a free slot (acc keeps it ready)
    state._bossOffspringAcc = 0;
    // sega52: bossOffspringAsProjectiles — phase D tinies fire at her lanes like phase A projectiles (tunnel speed)
    if (state._rwActive && c.bossOffspringAsProjectiles !== false) {
      var lnO = Math.random() < 0.6 ? rwHerLane(state) : (Math.random() < 0.5 ? 0 : 1);
      var pk = rwSpawnProjectile(state, boss.x, boss.y + (boss.radius || 60) * 0.3, lnO,
        rwCfg(state, "bossProjectileTravelSec", 1.2), c.bossOffspringSize != null ? c.bossOffspringSize : 0.42,
        rwCfg(state, "bossProjectileShootable", true) !== false, "proj");
      if (pk) pk.bossOffspring = true;
      return;
    }
    var kid = spawnBrain(state, {
      tiny: true,
      kind: "tiny",
      finale: true,
      x: boss.x + (Math.random() - 0.5) * (boss.radius || 60),
      y: boss.y + (boss.radius || 60) * 0.3,
      sizeScale: c.bossOffspringSize != null ? c.bossOffspringSize : 0.42,
      startScale: 0.25,
      fastGrow: true
    });
    if (kid) {
      kid.bossOffspring = true;
      kid.baseY = kid.y;
      kid.targetBaseY = Math.min((state.height || 720) * 0.45, kid.y + (state.height || 720) * 0.12);
    }
  }

  function updateBrains(state, dt) {
    var cfg = state.config.brains;
    var n;
    var brain;
    var by;
    var size;
    var throbScale;
    var approachScale;

    ensureBrains(state, dt);
    if (approachNoBrainsActive(state)) clearApproachBrains(state); // sega49
    else if (state._approachBrainsCleared && (state.songClock || 0) < ((state.config.approachNoBrainsStart != null ? state.config.approachNoBrainsStart : 78) - 1)) state._approachBrainsCleared = false;
    updateBossOffspring(state, dt); // sega45
    updateMediumGestation(state, dt);
    updateBossChoreography(state, dt);

    // sega25: drop zap lock if holder died
    if (state.globalZapLock && !state.globalZapLock.alive) {
      state.globalZapLock = null;
    }

    // sega30: update boss death expand / shrinking explosions
    for (n = state.brains.length - 1; n >= 0; n--) {
      brain = state.brains[n];
      if (brain.bossDying) {
        if (!updateBossDying(state, brain, dt)) {
          state.brains.splice(n, 1);
        }
      }
    }

    for (n = 0; n < state.brains.length; n++) {
      brain = state.brains[n];
      // sega31o: perspective shrink into distance when must disappear
      if (brain.exitShrink) {
        if (brain._exitBaseScale == null) {
          brain._exitBaseScale = Math.max(0.08, brain.drawScale != null ? brain.drawScale : (brain.approach != null ? brain.approach : 1));
        }
        brain.exitShrinkT = (brain.exitShrinkT || 0) + dt;
        var edur = brain.exitShrinkDur || 0.85;
        var et = Math.min(1, brain.exitShrinkT / Math.max(0.05, edur));
        var escale = Math.max(0.02, brain._exitBaseScale * (1 - et) * (1 - et));
        brain.approach = escale;
        brain.drawScale = escale;
        // drift slightly up / toward vanishing point
        brain.baseY = (brain.baseY != null ? brain.baseY : brain.y) - dt * (40 + et * 120);
        brain.y = brain.baseY;
        var esz = (brain.radius || 20) * 2.4 * escale;
        brain.screenRect = { x: brain.x - esz / 2, y: brain.y - esz / 2, w: esz, h: esz };
        if (et >= 1) {
          brain.alive = false;
          brain.exitShrink = false;
        }
        continue;
      }
      if (!brain.alive) {
        continue;
      }
      // sega45: tunnel lane runners (replaces center-rush tinies + dodge brains)
      if (brain.tunnelLane) {
        updateTunnelLaneBrain(state, brain, dt);
        continue;
      }
      if (brain.doomCtl) { updateDoomBrain(state, brain, dt); continue; } // sega52 doom
      if (brain.rwProj) { updateRwProjectile(state, brain, dt); continue; } // sega51
      if (brain.rwCtl) { brain.telegraph = 0; continue; } // sega51: boss positioned by rwChoreo
      brain.bobPhase += dt * 2.4;
      // sega31m: ALL brains throb faster+harder as HP↓ (visual pulse, not throw rate)
      var throbRate = 3.2;
      var hpPctT = brain.maxHp > 0 ? Math.max(0, Math.min(1, brain.hp / brain.maxHp)) : 1;
      var low = 1 - hpPctT;
      if (state.config && state.config.brainThrobWithLowHp !== false) {
        var rateFull = state.config.brainThrobRateFull != null ? state.config.brainThrobRateFull : 2.2;
        var rateLow = state.config.brainThrobRateLow != null ? state.config.brainThrobRateLow : 18;
        throbRate = rateFull + low * (rateLow - rateFull);
      } else if (brain.isBoss && state.config && state.config.bossThrobWithLowHp !== false) {
        throbRate = 2.0 + low * 16;
      }
      brain._throbHpLow = low;
      brain.throb = (brain.throb || 0) + dt * throbRate;
      {
        brain.x += brain.vx * dt;
        if (brain.x < 50) {
          brain.x = 50;
          brain.vx = Math.abs(brain.vx);
        } else if (brain.x > state.width - 50) {
          brain.x = state.width - 50;
          brain.vx = -Math.abs(brain.vx);
        }
      }
      // Boss / fromTop: ease baseY down into playfield
      if (brain.targetBaseY != null && brain.baseY < brain.targetBaseY) {
        brain.baseY = Math.min(
          brain.targetBaseY,
          brain.baseY + (brain.targetBaseY - brain.baseY) * Math.min(1, dt * 1.1) + dt * 28
        );
      }
      by = brain.baseY + Math.sin(brain.bobPhase) * brain.bobAmp;
      brain.y = by;
      if (brain.approach == null) { brain.approach = 1; }
      if (brain.approach < 1) {
        brain.approach = Math.min(1, brain.approach + dt * (brain.approachSpeed || 0.85));
      }
      // sega24: tick +2s zap grace only after fully grown
      if (brain.approach >= 0.98 && (brain.postGrowDelay || 0) > 0) {
        brain.postGrowDelay = Math.max(0, brain.postGrowDelay - dt);
      }
      approachScale = brain.approach * brain.approach * (3 - 2 * brain.approach);
      approachScale = 0.08 + 0.92 * approachScale;
      var ampFull = (state.config && state.config.brainThrobAmpFull != null) ? state.config.brainThrobAmpFull : 0.10;
      var ampLow = (state.config && state.config.brainThrobAmpLow != null) ? state.config.brainThrobAmpLow : 0.34;
      var throbAmp = ampFull + (brain._throbHpLow || 0) * (ampLow - ampFull);
      if (!(state.config && state.config.brainThrobWithLowHp !== false) && !(brain.isBoss && state.config && state.config.bossThrobWithLowHp !== false)) {
        throbAmp = 0.12;
      }
      throbScale = 1 + throbAmp * Math.sin(brain.throb);
      // sega25: defeat beat can expand brains up to 500%
      var defeatMul = (brain.defeatExpand != null && brain.defeatExpand > 0) ? brain.defeatExpand : 1;
      size = brain.radius * 2.4 * throbScale * approachScale * defeatMul;
      brain.drawScale = approachScale * throbScale * defeatMul;
      brain.screenRect = {
        x: brain.x - size / 2,
        y: by - size / 2,
        w: size,
        h: size
      };
      if (brain.hitFlash > 0) {
        brain.hitFlash = Math.max(0, brain.hitFlash - dt * 4);
      }

      if (
        brain.noFight ||
        state.pauseZaps ||
        state.bossDefeatBeat ||
        state.finaleMode === "paused" ||
        state.finaleMode === "karaoke" ||
        state.finaleMode === "winCruise" ||
        (brain.approach != null && brain.approach < 0.98) ||
        (brain.postGrowDelay || 0) > 0
      ) {
        if (brain.telegraph > 0 && state.globalZapLock === brain) {
          state.globalZapLock = null;
        }
        brain.telegraph = 0;
        if (brain.kamikaze) {
          brain.kamikaze = false;
        }
      } else if (brain.kamikaze) {
        updateTinyKamikaze(state, brain, dt);
        continue;
      } else if (brain.telegraph > 0) {
        brain.telegraph -= dt;
        if (brain.telegraph <= 0) {
          brain.telegraph = 0;
          // sega31l: tinies kamikaze after glow — no lightning; medium/boss keep zap
          if (isTinyBrain(brain) && !(state.config && state.config.tinyKamikazeAfterGlow === false)) {
            startTinyKamikaze(state, brain);
          } else {
            zapPlayer(state, brain);
            brain.zapTimer = cfg.zapInterval * (0.85 + Math.random() * 0.4);
          }
        }
      } else if (brainMayZap(state, brain)) {
        brain.zapTimer -= dt;
        if (brain.zapTimer <= 0) {
          brain.attackLane = state.lane;
          brain.telegraph = brain.telegraphMax = teleSecFor(state, brain, cfg); // sega51
          state.globalZapLock = brain;
        }
      }
    }

    updateShots(state, dt);
    updateLightning(state, dt);
  }

  // sega52: boss purple halo — pre-rendered once into a small canvas, drawn with a gently pulsing alpha
  var _bossHalo = null, _bossHaloKey = "";
  function bossHaloCanvas(color) {
    if (_bossHalo && _bossHaloKey === color) return _bossHalo;
    if (typeof document === "undefined") return null;
    var cv = document.createElement("canvas"); cv.width = cv.height = 128;
    var g = cv.getContext("2d"), gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, color); gr.addColorStop(0.45, color); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    // fade the colour stops toward transparent (radial falloff)
    var g2 = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = g2; g.fillRect(0, 0, 128, 128);
    _bossHalo = cv; _bossHaloKey = color;
    return cv;
  }
  // sega56: brain vein fill. images/fx/brain-veins-56.png (PIL-made, 300x150): left = interior see-through mask of the
  // 150x150 BRAIN sprite, right = vein highlight subset. Tinted once to brainVeinColor / brainVeinHighlight (cached canvas).
  var veins56 = { img: null, cv: null, key: "", failed: false };
  function brainVeins56(state, sprite) {
    var c = state.config || {};
    if (c.brainVeinFillOn === false || veins56.failed || typeof document === "undefined") return null;
    if (!veins56.img) {
      veins56.img = new Image();
      veins56.img.onerror = function() { veins56.failed = true; };
      veins56.img.src = (c.brainVeinPath || "images/fx/brain-veins-56.png") + (typeof ASSET_V !== "undefined" ? "?v=" + ASSET_V : "");
      return null;
    }
    var im = veins56.img;
    if (!im.complete || !(im.width > 0)) return null;
    var w = sprite.w, h = sprite.h, key = (c.brainVeinColor || "#ffe600") + "|" + (c.brainVeinHighlight || "#d9b800") + "|" + w + "x" + h;
    if (veins56.cv && veins56.key === key) return veins56.cv;
    try {
      var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      var x = cv.getContext("2d"), hw = im.width / 2;
      x.drawImage(im, 0, 0, hw, im.height, 0, 0, w, h);
      x.globalCompositeOperation = "source-in"; x.fillStyle = c.brainVeinColor || "#ffe600"; x.fillRect(0, 0, w, h);
      var hc = document.createElement("canvas"); hc.width = w; hc.height = h;
      var hx = hc.getContext("2d");
      hx.drawImage(im, hw, 0, hw, im.height, 0, 0, w, h);
      hx.globalCompositeOperation = "source-in"; hx.fillStyle = c.brainVeinHighlight || "#d9b800"; hx.fillRect(0, 0, w, h);
      x.globalCompositeOperation = "source-over"; x.drawImage(hc, 0, 0);
      veins56.cv = cv; veins56.key = key;
      return cv;
    } catch (eV) { veins56.failed = true; return null; }
  }
  function drawBossHalo(ctx, state, brain, x, y, r, throbScale, fadeA) {
    var c = state.config || {};
    if (c.bossGlowOn === false) return;
    var cv = bossHaloCanvas(c.bossGlowColor || "#b04dff");
    if (!cv) return;
    var pulse = Math.max(0.3, c.bossGlowPulseSec != null ? c.bossGlowPulseSec : 2.4);
    var now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    var k = 0.75 + 0.25 * Math.sin(now * Math.PI * 2 / pulse);
    var a = (c.bossGlowAlpha != null ? c.bossGlowAlpha : 0.35) * k * fadeA;
    if (a <= 0.01) return;
    var s = r * (c.bossGlowSizeMult != null ? c.bossGlowSizeMult : 3.4) * throbScale;
    var ga = ctx.globalAlpha;
    ctx.globalAlpha = a;
    ctx.drawImage(cv, x - s / 2, y - s / 2, s, s);
    ctx.globalAlpha = ga;
  }

  function drawBrain(ctx, state, brain) {
    var x = brain.x;
    var y = brain.y;
    // sega29: same bounce/vibY feel as player / neon cars
    if (state.config && state.config.motionVibrateCarsBrains !== false) {
      var speedPct = state.maxSpeed ? (state.speed / state.maxSpeed) : 0.4;
      var res = state.resolution != null ? state.resolution : 1;
      var bounce = (1.5 * Math.random() * Math.max(0.15, speedPct) * res) * (Math.random() < 0.5 ? -1 : 1);
      var vibY = Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.09 + x) * Math.min(1.6, (brain.radius || 40) * 0.04);
      y = y + bounce + vibY;
    }
    var r = brain.radius;
    var flash = brain.hitFlash;
    var i;
    var a;
    var throbScale = (brain.drawScale != null) ? brain.drawScale : (1 + 0.12 * Math.sin(brain.throb || 0));
    // sega56 (fix): final death / game over (doom, deadline defeat, finale lost). At the first such frame the boss's
    // EFFECTIVE on-screen size (all multipliers: approach/phase scale, throb, beat squash) is captured; from then on it is
    // drawn at exactly cap x (1 -> bossGameOverScale, smoothstep over bossGameOverScaleSec) and held - no other factor applies.
    var cGo = state.config || {}, go56 = null;
    if (brain.isBoss && cGo.bossGameOverScale != null && +cGo.bossGameOverScale > 0) {
      if (!brain.bossDying && !state.finaleWon && (state.bossDoom || state.bossDefeatBeat || state.finaleLost)) {
        if (state._bossGo56At == null) { state._bossGo56At = state.elapsed || 0; state._bossGo56Cap = null; }
        var goU = Math.max(0, Math.min(1, ((state.elapsed || 0) - state._bossGo56At) / Math.max(0.05, +(cGo.bossGameOverScaleSec != null ? cGo.bossGameOverScaleSec : 1.0))));
        go56 = 1 + (+cGo.bossGameOverScale - 1) * goU * goU * (3 - 2 * goU);
        if (state._bossGo56Cap) throbScale = state._bossGo56Cap.ts * go56; // halo / glow follow the frozen size
      } else if (state._bossGo56At != null) { state._bossGo56At = null; state._bossGo56Cap = null; }
    }
    var sprite = SPRITES.BRAIN;
    var sprites = state.sprites;
    var dw;
    var dh;
    var barW;
    var hpPct;

    ctx.save();
    var fadeA = brain.fadeAlpha != null ? Math.max(0, Math.min(1, brain.fadeAlpha)) : 1; // sega43
    ctx.globalAlpha = fadeA;
    if (brain.isBoss && !brain.bossDying) drawBossHalo(ctx, state, brain, x, y, r, throbScale, fadeA); // sega52

    ctx.beginPath();
    ctx.arc(x, y, r * 1.45 * throbScale, 0, Math.PI * 2);
    ctx.fillStyle = (brain.windup > 0)
      ? "rgba(255, 30, 30, " + (0.25 + 0.5 * brain.windup).toFixed(2) + ")"
      : (brain.telegraph > 0
      ? "rgba(255, 80, 120, 0.28)"
      : "rgba(180, 40, 255, 0.16)");
    ctx.fill();

    // sega54: angry boss throb on the beat (129 BPM): sharp pulse, squash/stretch, red flush — from the dome reveal on
    var thX = 1, thY = 1, thRed = 0, cT = state.config || {};
    if (brain.isBoss && !brain.bossDying && cT.bossThrobOn !== false) {
      var dvT = (ns.Renderer && ns.Renderer.domeReveal54) ? ns.Renderer.domeReveal54(state) : null;
      var tT = state.songClock || 0;
      if (!(dvT && dvT.on && state._capitolBossActive && tT < dvT.burst)) {
        var hz = cT.bossThrobHz != null ? cT.bossThrobHz : 129 / 60;
        var ph0 = (tT - (cT.bossThrobPhaseSec != null ? cT.bossThrobPhaseSec : 0)) * hz;
        var bp = Math.pow(Math.max(0, Math.cos(2 * Math.PI * (ph0 - Math.floor(ph0)))), 6);  // sharp beat spike
        var ts = cT.bossThrobScale != null ? cT.bossThrobScale : 0.14;
        thX = 1 + ts * bp * 1.25; thY = 1 + ts * bp * 0.45 - ts * 0.35 * Math.pow(Math.sin(Math.PI * (ph0 - Math.floor(ph0))), 2) * 0.5;
        thRed = bp * (cT.bossThrobRedFlush != null ? cT.bossThrobRedFlush : 0.55);
      }
    }
    if (sprites && sprite) {
      dw = r * 2.6 * throbScale * thX;
      dh = r * 2.6 * throbScale * thY;
      if (go56 != null) { // sega56 (fix): freeze at the captured on-screen size, then scale that up
        if (!state._bossGo56Cap) state._bossGo56Cap = { w: dw, h: dh, ts: throbScale };
        dw = state._bossGo56Cap.w * go56; dh = state._bossGo56Cap.h * go56; thRed = 0;
        state._bossGo56Now = { w: dw, capW: state._bossGo56Cap.w, m: go56, x: x, y: y };
      }
      ctx.translate(x, y);
      if (flash > 0) {
        ctx.globalAlpha = 0.55 + flash * 0.45;
        ctx.filter = "brightness(1.8) saturate(1.4)";
      }
      if (brain.windup > 0.5) {
        ctx.filter = "sepia(1) saturate(6) hue-rotate(-50deg) brightness(1.3)"; // sega43 red tell
      }
      if (fadeA < 1) ctx.globalAlpha = fadeA * (flash > 0 ? 0.55 + flash * 0.45 : 1);
      var vein56 = brainVeins56(state, sprite); // sega56: opaque dark-purple veins under the see-through fold gaps
      if (vein56) ctx.drawImage(vein56, 0, 0, sprite.w, sprite.h, -dw / 2, -dh / 2, dw, dh);
      ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, -dw / 2, -dh / 2, dw, dh);
      if (thRed > 0.02) { // sega54: red flush on the beat (same red tell filter, faded by the pulse)
        ctx.filter = "sepia(1) saturate(6) hue-rotate(-50deg) brightness(1.2)";
        ctx.globalAlpha = fadeA * Math.min(1, thRed);
        ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, -dw / 2, -dh / 2, dw, dh);
      }
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      var grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
      grad.addColorStop(0, "#ffb8e8");
      grad.addColorStop(0.45, "#e040a0");
      grad.addColorStop(1, "#6a1060");
      ctx.beginPath();
      ctx.arc(x, y, r * throbScale, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // sega31m: NO health bar/pips under brains (player fillHealthBar stays)
    if (!(state.config && state.config.hideBrainHpBars !== false)) {
      if (brain.maxHp > 20) {
        barW = Math.min(110, Math.max(48, r * 2.2));
        hpPct = clamp(brain.hp / brain.maxHp, 0, 1);
        ctx.fillStyle = "rgba(20,6,12,0.7)";
        ctx.fillRect(x - barW / 2, y + r * throbScale + 6, barW, 6);
        ctx.fillStyle = brain.isBoss ? "#ffe066" : "#ff4d8d";
        ctx.fillRect(x - barW / 2, y + r * throbScale + 6, barW * hpPct, 6);
      } else {
        var pips = brain.maxHp;
        var pipW = Math.min(8, 90 / Math.max(1, pips));
        for (i = 0; i < pips; i++) {
          a = i < brain.hp;
          ctx.fillStyle = a ? "#ff4d8d" : "rgba(40,10,20,0.55)";
          ctx.fillRect(x - (pips * (pipW + 2)) / 2 + i * (pipW + 2), y + r * throbScale + 6, pipW, 4);
        }
      }
    }

    if (brain.telegraph > 0) {
      var teleMax = brain.telegraphMax ? brain.telegraphMax : (state.config && state.config.brains && state.config.brains.telegraphSeconds != null)
        ? state.config.brains.telegraphSeconds
        : ((ns.CONFIG.brains && ns.CONFIG.brains.telegraphSeconds) || 1.42);
      var tProg = 1 - (brain.telegraph / Math.max(0.05, teleMax));
      ctx.strokeStyle = "rgba(255, 230, 80, " + (0.4 + tProg * 0.55).toFixed(2) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r * (1.2 + tProg * 0.6) * throbScale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLightning(ctx, bolt) {
    var alpha = clamp(bolt.life / bolt.maxLife, 0, 1);
    var jag = bolt.dramatic ? 55 : 30;
    // sega48: jitter re-rolled every lightningReuseFrames frames (not every frame)
    var cfgL = (window.ApexRacer && ApexRacer.CONFIG) || {};
    var reuse = Math.max(1, cfgL.lightningReuseFrames || 3);
    bolt._jn = (bolt._jn || 0) + 1;
    if (!bolt._jit || bolt._jn % reuse === 0) {
      bolt._jit = [(Math.random() - 0.5) * jag, (Math.random() - 0.5) * (bolt.dramatic ? 36 : 20),
        (Math.random() - 0.5) * (jag + 10), (Math.random() - 0.5) * (bolt.dramatic ? 40 : 25)];
    }
    var midX = (bolt.x1 + bolt.x2) / 2 + bolt._jit[0];
    var midY = (bolt.y1 + bolt.y2) / 2 + bolt._jit[1];
    var mid2X = (bolt.x1 + bolt.x2) / 2 + bolt._jit[2];
    var mid2Y = (bolt.y1 * 0.35 + bolt.y2 * 0.65) + bolt._jit[3];
    var thick = bolt.thick || bolt.dramatic;
    if (cfgL.lightningNoShadowBlur !== false) {
      ctx.save();
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      var glowCol = bolt.roadHit ? "#44aaff" : "#ff66aa";
      var passes = [[glowCol, thick ? 18 : 12, 0.16], [glowCol, thick ? 11 : 8, 0.26],
        [bolt.roadHit ? "#88ddff" : "#ffe066", thick ? 7 : 4, 1], ["#ffffff", thick ? 2.4 : 1.5, 1]];
      if (bolt.dramatic && !bolt.roadHit) passes.splice(2, 0, ["#7dffef", 10, 0.55]);
      ctx.beginPath();
      ctx.moveTo(bolt.x1, bolt.y1); ctx.lineTo(midX, midY); ctx.lineTo(mid2X, mid2Y); ctx.lineTo(bolt.x2, bolt.y2);
      for (var pi = 0; pi < passes.length; pi++) {
        ctx.globalAlpha = alpha * passes[pi][2]; ctx.strokeStyle = passes[pi][0]; ctx.lineWidth = passes[pi][1]; ctx.stroke();
      }
      if (bolt.roadHit) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(40, 20, 10, " + (0.55 * alpha).toFixed(2) + ")";
        ctx.beginPath(); ctx.ellipse(bolt.x2, bolt.y2, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255, 220, 120, " + (0.45 * alpha).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(bolt.x2, bolt.y2, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = bolt.roadHit ? "#88ddff" : "#ffe066";
    ctx.lineWidth = thick ? 7 : 4;
    ctx.shadowColor = bolt.roadHit ? "#44aaff" : "#ff66aa";
    ctx.shadowBlur = thick ? 22 : 14;
    ctx.beginPath();
    ctx.moveTo(bolt.x1, bolt.y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(mid2X, mid2Y);
    ctx.lineTo(bolt.x2, bolt.y2);
    ctx.stroke();
    if (bolt.dramatic && !bolt.roadHit) {
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = "#7dffef";
      ctx.lineWidth = 10;
      ctx.shadowBlur = 28;
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = thick ? 2.4 : 1.5;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(bolt.x1, bolt.y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(mid2X, mid2Y);
    ctx.lineTo(bolt.x2, bolt.y2);
    ctx.stroke();
    if (bolt.roadHit) {
      ctx.fillStyle = "rgba(40, 20, 10, " + (0.55 * alpha).toFixed(2) + ")";
      ctx.beginPath();
      ctx.ellipse(bolt.x2, bolt.y2, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 220, 120, " + (0.45 * alpha).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(bolt.x2, bolt.y2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawScorchMarks(ctx, state) {
    var n;
    var s;
    var a;
    if (!state.scorchMarks) {
      return;
    }
    for (n = 0; n < state.scorchMarks.length; n++) {
      s = state.scorchMarks[n];
      a = clamp(s.life / s.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = "#1a0a06";
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 140, 40, 0.35)";
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 0.45, s.r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawShots(ctx, state) {
    var n;
    var shot;
    var t;
    var i;
    for (n = 0; n < state.shots.length; n++) {
      shot = state.shots[n];
      ctx.save();
      for (i = 0; i < shot.trail.length; i++) {
        t = shot.trail[i];
        ctx.fillStyle = "rgba(125, 255, 239, " + (0.15 + i * 0.08) + ")";
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#7dffef";
      ctx.shadowColor = "#ff4d8d";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function render(state) {
    var ctx = state.ctx;
    var n;
    drawScorchMarks(ctx, state);
    if (!state.brains) {
      return;
    }
    for (n = 0; n < state.brains.length; n++) {
      if (state.brains[n].alive || state.brains[n].bossDying || state.brains[n].exitShrink) {
        drawBrain(ctx, state, state.brains[n]);
      }
    }
    if (state.lightningBolts) {
      for (n = 0; n < state.lightningBolts.length; n++) {
        drawLightning(ctx, state.lightningBolts[n]);
      }
    }
    if (state.shots) {
      drawShots(ctx, state);
    }
  }

  function fireUnavoidableZap(state) {
    // Boss zap storm: no dodge — always hits player
    var fake = { x: state.width / 2, baseY: state.height * 0.22, bobPhase: 0, bobAmp: 0, attackLane: state.lane, isBoss: true };
    var evadeLane = state.lane;
    // temporarily force same lane hit by using a local zap
    var cfg = state.config.brains || {};
    var dmg = (state.config.damage && state.config.damage.brainZap != null) ? state.config.damage.brainZap : (cfg.zapDamage || 30);
    if (ns.Sega31 && ns.Sega31.immuneToZaps && ns.Sega31.immuneToZaps(state)) {
      state.eventText = "STORM IMMUNE";
      state.eventTimer = 0.7;
      return;
    }
    state.lightningBolts = state.lightningBolts || [];
    state.lightningBolts.push({
      x1: state.width * 0.5, y1: 40,
      x2: state.width * 0.5, y2: state.height * 0.78,
      life: 0.4, maxLife: 0.4, roadHit: false, thick: true
    });
    state.shockFlash = 1.0 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1);
    state._zapHit = true;
    if (ns.Gameplay && ns.Gameplay.applyDamageExternal) {
      ns.Gameplay.applyDamageExternal(state, dmg);
    }
    state.eventText = "BOSS ZAP STORM";
    state.eventTimer = 1.0;
  }

  ns.Brains = {
    approachNoBrainsActive: approachNoBrainsActive,
    startBossDoom: startBossDoom,
    fireUnavoidableZap: fireUnavoidableZap,
    reset: resetBrains,
    update: updateBrains,
    render: render,
    tryTapShoot: tryTapShoot,
    fireShotAt: fireShotAt,
    spawnBrain: spawnBrain,
    laneScreenX: laneScreenX,
    spawnFinaleBoss: spawnFinaleBoss,
    spawnFinaleFightPack: spawnFinaleFightPack,
    spawnFinaleMediums: spawnFinaleMediums,
    spawnTiniesFromMediums: spawnTiniesFromMediums,
    finaleBrainsCleared: finaleBrainsCleared,
    spawnBossMultiExplosion: spawnBossMultiExplosion,
    tapDamage: tapDamage
  };
})(window.ApexRacer = window.ApexRacer || {});
