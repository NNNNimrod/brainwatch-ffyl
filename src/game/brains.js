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
      sizeScale: ff.bossScale != null ? ff.bossScale : 2,
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
    return boss;
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

  function damageBrain(state, brain, amount) {
    if (!brain || !brain.alive || brain.bossDying) {
      return;
    }
    brain.hitFlash = 1;
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
            damageBrain(state, brain, dmg);
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
          damageBrain(state, brain, dmg);
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
    if (state.bossPhase === "bossZaps" && !brain.isBoss) {
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


  // sega43: one-at-a-time launcher for tunnel tinies (appear → hover → wind-up → straight launch)
  function tinyRushCoordinator(state, dt) {
    var c = state.config || {};
    if (!state.brains) return;
    var gapSec = c.tinyBrainLaunchGapSec != null ? c.tinyBrainLaunchGapSec : 1.0;
    var active = state._tinyRushActive;
    if (active && (!active.alive || active.exitShrink || state.brains.indexOf(active) < 0)) {
      state._tinyRushActive = null;
      state._tinyRushGap = gapSec;
      active = null;
    }
    if (state._tinyRushGap > 0) state._tinyRushGap = Math.max(0, state._tinyRushGap - dt);
    if (active || state._tinyRushGap > 0) return;
    var i, b, pick = null;
    for (i = 0; i < state.brains.length; i++) {
      b = state.brains[i];
      if (b && b.alive && b.tunnelCenterRush && b.rushPhase === 'hover') {
        if (!pick || (b.rushAge || 0) > (pick.rushAge || 0)) pick = b;
      }
    }
    if (pick) {
      pick.rushPhase = 'windup';
      pick.rushT = 0;
      state._tinyRushActive = pick;
    }
  }

  function updateTinyRushFair(state, brain, dt) {
    var c = state.config || {};
    var h = state.height || 720;
    var w = state.width || 640;
    brain.vx = 0; brain.telegraph = 0; brain.kamikaze = false;
    brain.zapTimer = 99999; brain.postGrowDelay = 99999; brain.noFight = true;
    var appearSec = Math.max(0.05, c.tinyBrainAppearSec != null ? c.tinyBrainAppearSec : 1.0);
    var windSec = Math.max(0.05, c.tinyBrainWindupSec != null ? c.tinyBrainWindupSec : 0.35);
    var speed = Math.max(0.1, c.tinyBrainLaunchSpeed != null ? c.tinyBrainLaunchSpeed : 1.6);
    var hoverScale = c.tinyBrainHoverScale != null ? c.tinyBrainHoverScale : 0.42;
    var cx = w * 0.5;
    var cy = (state._roadHorizonY != null) ? state._roadHorizonY : h * 0.42;
    cy = Math.max(h * 0.22, Math.min(h * 0.5, cy));
    var slotOff = [0, -0.17, 0.17, -0.3, 0.3];
    var hx = cx + (slotOff[brain.hoverSlot | 0] || 0) * w;
    var hy = cy - h * 0.03 + ((brain.hoverSlot | 0) % 2 ? h * 0.02 : 0);
    brain.rushAge = (brain.rushAge || 0) + dt;
    brain.rushT = (brain.rushT || 0) + dt;
    brain.bobPhase = (brain.bobPhase || 0) + dt * 3.2;
    brain.throb = (brain.throb || 0) + dt * 5.5;
    var bob = Math.sin(brain.bobPhase) * h * 0.012;
    var scale = hoverScale;
    var shakeX = 0;
    brain.windup = 0;
    if (brain.rushPhase === 'appear') {
      var ua = Math.min(1, brain.rushT / appearSec);
      var ea = 1 - Math.pow(1 - ua, 2);
      brain.fadeAlpha = ea;
      scale = hoverScale * (0.15 + 0.85 * ea);
      brain.x = hx; brain.baseY = hy; brain.y = hy + bob * ea;
      if (ua >= 1) { brain.rushPhase = 'hover'; brain.rushT = 0; }
    } else if (brain.rushPhase === 'hover') {
      brain.fadeAlpha = 1;
      brain.x = hx; brain.baseY = hy; brain.y = hy + bob;
    } else if (brain.rushPhase === 'windup') {
      var uw = Math.min(1, brain.rushT / windSec);
      brain.fadeAlpha = 1;
      brain.windup = 0.5 + 0.5 * Math.sin(brain.rushT * 40); // red flash pulse
      shakeX = Math.round((Math.random() - 0.5) * 6);
      scale = hoverScale * (1 + 0.18 * Math.sin(uw * Math.PI));
      brain.x = hx + shakeX; brain.baseY = hy; brain.y = hy + bob;
      if (uw >= 1) {
        // lock the target to the player's lane AT LAUNCH — switching lanes dodges it
        var lane = state.lane != null ? (state.lane | 0) : 0;
        brain.attackLane = lane; brain.lane = lane;
        brain._lx0 = hx; brain._ly0 = hy + bob;
        brain._lx1 = laneScreenX(state, lane);
        brain._ly1 = playerElevAimY(state);
        brain.rushPhase = 'launch'; brain.rushT = 0; brain._launchU = 0;
      }
    } else if (brain.rushPhase === 'launch') {
      brain.fadeAlpha = 1;
      brain._launchU = Math.min(1.05, (brain._launchU || 0) + dt * speed);
      var ul = Math.min(1, brain._launchU);
      var el = ul * ul; // accelerate toward camera, straight line
      brain.x = brain._lx0 + (brain._lx1 - brain._lx0) * el;
      brain.baseY = brain._ly0 + (brain._ly1 - brain._ly0) * el;
      brain.y = brain.baseY;
      scale = hoverScale + (1 - hoverScale) * el;
      if (!brain._tunnelHitDone && ul >= 0.95) {
        brain._tunnelHitDone = true;
        if ((state.lane | 0) === (brain.attackLane | 0)) {
          var dmg = c.tunnelCenterRushDamage;
          if (dmg == null) {
            dmg = (c.damage && c.damage.brainZap != null) ? c.damage.brainZap : ((c.brains && c.brains.zapDamage) || 30);
          }
          if (ns.Gameplay && ns.Gameplay.applyDamageExternal) ns.Gameplay.applyDamageExternal(state, dmg);
          else if (state.health != null) state.health = Math.max(0, state.health - dmg);
          state._zapHit = true;
          brain.hitFlash = 1;
          state.eventText = "BRAIN HIT!";
          state.eventTimer = 0.75;
          brain.alive = false;
          brain.hp = 0;
          if (ns.Fx && ns.Fx.spawnExplosion) ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.55);
        } else {
          state.eventText = "DODGED";
          state.eventTimer = 0.5;
          brain.exitShrink = true;
          brain.exitShrinkT = 0;
          brain.exitShrinkDur = 0.45;
        }
      }
    }
    var throbScale = 1 + 0.08 * Math.sin(brain.throb);
    var size = (brain.radius || 16) * 2.4 * throbScale * scale;
    brain.drawScale = scale * throbScale;
    brain.approach = scale;
    // shootable in appear + hover + windup + launch (screenRect always live)
    brain.screenRect = { x: brain.x - size / 2, y: brain.y - size / 2, w: size, h: size };
    if (brain.hitFlash > 0) brain.hitFlash = Math.max(0, brain.hitFlash - dt * 4);
  }

  // sega39: tunnel center-rush tinies — from vanishing-point center, home toward player lane (no fire)
  function updateTunnelCenterRush(state, brain, dt) {
    if (brain.rushPhase) { updateTinyRushFair(state, brain, dt); return; } // sega43
    var c = state.config || {};
    var h = state.height || 720;
    var w = state.width || 640;

    brain.vx = 0;
    brain.telegraph = 0;
    brain.kamikaze = false;
    brain.zapTimer = 99999;
    brain.postGrowDelay = 99999;
    brain.noFight = true;

    var pLane = state.lane != null ? state.lane : 0;
    var trackRate = c.tunnelCenterRushTrackRate != null ? c.tunnelCenterRushTrackRate : 3.2;
    var wantX = laneScreenX(state, pLane);
    var wantY = playerElevAimY(state);
    if (brain._aimX == null) brain._aimX = wantX;
    if (brain._aimY == null) brain._aimY = wantY;
    brain._aimX += (wantX - brain._aimX) * Math.min(1, dt * trackRate);
    brain._aimY += (wantY - brain._aimY) * Math.min(1, dt * trackRate);
    brain.attackLane = pLane;
    brain.lane = pLane;

    var rushSpeed = brain.rushSpeed != null ? brain.rushSpeed
      : (c.tunnelCenterRushApproachSpeed != null ? c.tunnelCenterRushApproachSpeed : 0.72);
    if (brain.approach == null) brain.approach = 0.04;
    brain.approach = Math.min(1.2, brain.approach + dt * rushSpeed);

    var u = Math.min(1, Math.max(0, brain.approach));
    var ease = u * u * (3 - 2 * u);
    var sx = brain.spawnCx != null ? brain.spawnCx : w * 0.5;
    var sy = brain.spawnCy != null ? brain.spawnCy : ((state._roadHorizonY != null) ? state._roadHorizonY : h * 0.42);
    brain.x = sx + (brain._aimX - sx) * ease;
    brain.baseY = sy + (brain._aimY - sy) * ease;
    brain.bobPhase = (brain.bobPhase || 0) + dt * 4.5;
    var bob = Math.sin(brain.bobPhase) * (brain.bobAmp != null ? brain.bobAmp : h * 0.008) * (1 - ease * 0.45);
    brain.y = brain.baseY + bob;

    var approachScale = 0.08 + 0.92 * ease;
    brain.throb = (brain.throb || 0) + dt * 5.5;
    var throbScale = 1 + 0.10 * Math.sin(brain.throb);
    var size = (brain.radius || 16) * 2.4 * throbScale * approachScale;
    brain.drawScale = approachScale * throbScale;
    brain.screenRect = {
      x: brain.x - size / 2,
      y: brain.y - size / 2,
      w: size,
      h: size
    };
    if (brain.hitFlash > 0) brain.hitFlash = Math.max(0, brain.hitFlash - dt * 4);

    if (!brain._tunnelHitDone && brain.approach >= 0.88) {
      brain._tunnelHitDone = true;
      var playerX = laneScreenX(state, state.lane != null ? state.lane : 0);
      var otherLane = ((state.lane | 0) === 0) ? 1 : 0;
      var otherX = laneScreenX(state, otherLane);
      var closerToPlayer = Math.abs(brain.x - playerX) <= Math.abs(brain.x - otherX) + 10;
      var sameLane = ((state.lane | 0) === (brain.attackLane | 0));
      if (sameLane || closerToPlayer) {
        var dmg = c.tunnelCenterRushDamage;
        if (dmg == null) {
          dmg = (c.damage && c.damage.brainZap != null)
            ? c.damage.brainZap
            : ((c.brains && c.brains.zapDamage) || 30);
        }
        if (ns.Gameplay && ns.Gameplay.applyDamageExternal) {
          ns.Gameplay.applyDamageExternal(state, dmg);
        } else if (state.health != null) {
          state.health = Math.max(0, state.health - dmg);
        }
        state._zapHit = true;
        brain.hitFlash = 1;
        state.eventText = "BRAIN HIT!";
        state.eventTimer = 0.75;
        brain.alive = false;
        brain.hp = 0;
        if (ns.Fx && ns.Fx.spawnExplosion) {
          ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.55);
        }
      } else {
        state.eventText = "DODGED";
        state.eventTimer = 0.5;
        brain.exitShrink = true;
        brain.exitShrinkT = 0;
        brain.exitShrinkDur = 0.45;
      }
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
    tinyRushCoordinator(state, dt); // sega43
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
      // sega39: center-rush tinies (no fire; shoot/dodge)
      if (brain.tunnelCenterRush) {
        updateTunnelCenterRush(state, brain, dt);
        continue;
      }
      // sega34: tunnel passive dodge — bob only, locked lane, no strafe
      if (brain.tunnelDodge) {
        var dodgeHz = brain.bobHz != null ? brain.bobHz : 0.7;
        brain.bobPhase = (brain.bobPhase || 0) + dt * dodgeHz * Math.PI * 2;
        brain.vx = 0;
        brain.telegraph = 0;
        brain.kamikaze = false;
        brain.zapTimer = 99999;
        brain.postGrowDelay = 99999;
        var dLane = brain.lane != null ? brain.lane : (brain.attackLane != null ? brain.attackLane : 0);
        brain.lane = dLane;
        brain.attackLane = dLane;
        brain.x = laneScreenX(state, dLane);
      } else {
        brain.bobPhase += dt * 2.4;
      }
      // sega31m: ALL brains throb faster+harder as HP↓ (visual pulse, not throw rate)
      var throbRate = 3.2;
      var hpPctT = brain.maxHp > 0 ? Math.max(0, Math.min(1, brain.hp / brain.maxHp)) : 1;
      var low = 1 - hpPctT;
      if (brain.tunnelDodge) {
        throbRate = 2.4; // gentle idle throb
        low = 0;
      } else if (state.config && state.config.brainThrobWithLowHp !== false) {
        var rateFull = state.config.brainThrobRateFull != null ? state.config.brainThrobRateFull : 2.2;
        var rateLow = state.config.brainThrobRateLow != null ? state.config.brainThrobRateLow : 18;
        throbRate = rateFull + low * (rateLow - rateFull);
      } else if (brain.isBoss && state.config && state.config.bossThrobWithLowHp !== false) {
        throbRate = 2.0 + low * 16;
      }
      brain._throbHpLow = low;
      brain.throb = (brain.throb || 0) + dt * throbRate;
      if (!brain.tunnelDodge) {
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

      // sega34: tunnel dodge — same-lane contact when fully approached = hit; else pass & despawn
      if (brain.tunnelDodge && !brain._tunnelHitDone && brain.approach >= 0.92) {
        var sameLane = (state.lane|0) === (brain.lane|0);
        brain._tunnelHitDone = true;
        if (sameLane) {
          var dmg = (state.config && state.config.damage && state.config.damage.brainZap != null)
            ? state.config.damage.brainZap
            : ((state.config && state.config.brains && state.config.brains.zapDamage) || 30);
          if (ns.Gameplay && ns.Gameplay.applyDamageExternal) {
            ns.Gameplay.applyDamageExternal(state, dmg);
          } else if (state.health != null) {
            state.health = Math.max(0, state.health - dmg);
          }
          state._zapHit = true;
          brain.hitFlash = 1;
          state.eventText = "TUNNEL HIT!";
          state.eventTimer = 0.8;
          // Pop after contact
          brain.alive = false;
          brain.hp = 0;
          if (ns.Fx && ns.Fx.spawnExplosion) {
            ns.Fx.spawnExplosion(state, brain.x, brain.y, "sega", 0.7);
          }
        } else {
          // Dodged — shrink away into distance
          brain.exitShrink = true;
          brain.exitShrinkT = 0;
          brain.exitShrinkDur = 0.55;
        }
      }

      if (
        brain.tunnelDodge ||
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
          brain.telegraph = cfg.telegraphSeconds;
          state.globalZapLock = brain;
        }
      }
    }

    updateShots(state, dt);
    updateLightning(state, dt);
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
    var sprite = SPRITES.BRAIN;
    var sprites = state.sprites;
    var dw;
    var dh;
    var barW;
    var hpPct;

    ctx.save();
    var fadeA = brain.fadeAlpha != null ? Math.max(0, Math.min(1, brain.fadeAlpha)) : 1; // sega43
    ctx.globalAlpha = fadeA;

    ctx.beginPath();
    ctx.arc(x, y, r * 1.45 * throbScale, 0, Math.PI * 2);
    ctx.fillStyle = (brain.windup > 0)
      ? "rgba(255, 30, 30, " + (0.25 + 0.5 * brain.windup).toFixed(2) + ")"
      : (brain.telegraph > 0
      ? "rgba(255, 80, 120, 0.28)"
      : "rgba(180, 40, 255, 0.16)");
    ctx.fill();

    if (sprites && sprite) {
      dw = r * 2.6 * throbScale;
      dh = r * 2.6 * throbScale;
      ctx.translate(x, y);
      if (flash > 0) {
        ctx.globalAlpha = 0.55 + flash * 0.45;
        ctx.filter = "brightness(1.8) saturate(1.4)";
      }
      if (brain.windup > 0.5) {
        ctx.filter = "sepia(1) saturate(6) hue-rotate(-50deg) brightness(1.3)"; // sega43 red tell
      }
      if (fadeA < 1) ctx.globalAlpha = fadeA * (flash > 0 ? 0.55 + flash * 0.45 : 1);
      ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, -dw / 2, -dh / 2, dw, dh);
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
      var teleMax = (state.config && state.config.brains && state.config.brains.telegraphSeconds != null)
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
    var midX = (bolt.x1 + bolt.x2) / 2 + (Math.random() - 0.5) * jag;
    var midY = (bolt.y1 + bolt.y2) / 2 + (Math.random() - 0.5) * (bolt.dramatic ? 36 : 20);
    var mid2X = (bolt.x1 + bolt.x2) / 2 + (Math.random() - 0.5) * (jag + 10);
    var mid2Y = (bolt.y1 * 0.35 + bolt.y2 * 0.65) + (Math.random() - 0.5) * (bolt.dramatic ? 40 : 25);
    var thick = bolt.thick || bolt.dramatic;

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
