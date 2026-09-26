(function(ns) {
  function setEvent(state, text) {
    state.eventText = text;
    state.eventTimer = state.config.eventFeedDuration;
  }

  function applyDamage(state, amount) {
    if (ns.Sega31 && ns.Sega31.ensureTrainer) ns.Sega31.ensureTrainer(state);
    if (ns.Sega31 && ns.Sega31.trainerOn && ns.Sega31.trainerOn(state, "invincible")) {
      return;
    }
    if (state._zapHit && ns.Sega31 && ns.Sega31.immuneToZaps && ns.Sega31.immuneToZaps(state)) {
      state._zapHit = false;
      return;
    }
    if (state.invulnTimer > 0 || state.deathFlashTimer > 0) {
      return;
    }
    amount = amount * 1.75;
    var wasAlive = state.health > 0;
    state.health = Math.max(0, state.health - amount);
    state.hits += 1;
    state.damageFlash = 1;
    // sega31z: start red-diff pose overlay on brain zap / damage
    if (state._zapHit || (state.config && state.config.playerHitRedDiffOnBrainOnly === false)) {
      var dur = (state.config && state.config.playerHitRedDiffDurationSec != null)
        ? state.config.playerHitRedDiffDurationSec : 0.35;
      state._playerHitRedDiffT = Math.max(state._playerHitRedDiffT || 0, dur);
      state._playerHitRedDiff = true;
      state._zapHit = false; // consume so overlay is timer-driven only
    }
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.invulnTimer = state.config.invulnSeconds;
    if (ns.Sfx) {
      ns.Sfx.hurt();
    }
    if (wasAlive && state.health <= 0) {
      beginDeath(state);
    }
  }

  var BOSS_DEFEAT_BEAT_SEC = 3;
  // Lose storyboard first card ("You've got the power!") — wait for real audio, never seek
  var LOSE_STORYBOARD_T = 215.96;

  function startBossDefeatBeat(state, reason) {
    if (!state || state.bossDefeatBeat) {
      return;
    }
    state.bossDefeatBeat = true;
    state.bossDefeatTimer = BOSS_DEFEAT_BEAT_SEC;
    state.bossDefeatElapsed = 0;
    state.bossDefeatReason = reason || "death";
    state.bossDefeatExplodeAcc = 0;
    state.finaleLost = true;
    state.finaleWon = false;
    state.pauseZaps = true;
    state.speed = 0;
    state.health = 0;
    state.globalZapLock = null;
    state.lightningBolts = [];
    state.shots = [];
    state.failHumanityBanner = "YOU FAILED HUMANITY";
    var n;
    if (state.brains) {
      for (n = 0; n < state.brains.length; n++) {
        state.brains[n].telegraph = 0;
        state.brains[n].defeatExpand = state.brains[n].defeatExpand || 1;
      }
    }
    setEvent(state, "YOU FAILED HUMANITY");
    // Opening burst on the player — sega27: random scale 50%–200%
    var bi;
    var px;
    var py;
    if (ns.Fx && ns.Fx.spawnExplosion) {
      for (bi = 0; bi < 8; bi++) {
        px = state.width / 2 + (Math.random() - 0.5) * state.width * 0.3;
        py = state.height * 0.78 + (Math.random() - 0.5) * state.height * 0.14;
        ns.Fx.spawnExplosion(state, px, py, "explosion", 0.5 + Math.random() * 1.5);
      }
    }
  }

  function finishBossDefeatBeat(state) {
    state.bossDefeatBeat = false;
    state.bossDefeatTimer = 0;
    state.bossDefeatElapsed = 0;
    state.bossDefeatExplodeAcc = 0;
    state.failHumanityBanner = null;
    // sega26: do NOT seek music — storyboards follow the real song clock
    var music = Dom.get("music");
    var t = state.songClock;
    if (music && !isNaN(music.currentTime)) {
      t = music.currentTime;
    }
    if (t == null || isNaN(t)) {
      t = LOSE_STORYBOARD_T;
    }
    state.songClock = t;
    if (ns.Sections && ns.Sections.beginFinaleLoseStoryboard) {
      ns.Sections.beginFinaleLoseStoryboard(state, t);
    }
  }

  function updateBossDefeatBeat(state, dt) {
    if (!state.bossDefeatBeat) {
      return false;
    }
    state.bossDefeatElapsed = (state.bossDefeatElapsed || 0) + dt;
    state.bossDefeatTimer = Math.max(0, BOSS_DEFEAT_BEAT_SEC - state.bossDefeatElapsed);
    state.speed = 0;
    state.pauseZaps = true;
    state.health = 0;
    // Expand over first 3s to 500%, then hold at 5x while waiting for storyboard time
    var progress = Math.min(1, state.bossDefeatElapsed / BOSS_DEFEAT_BEAT_SEC);
    // Expand all active brains up to 500% (boss included)
    var n;
    var brain;
    if (state.brains) {
      for (n = 0; n < state.brains.length; n++) {
        brain = state.brains[n];
        if (!brain.alive) { continue; }
        brain.defeatExpand = 1 + progress * 4;
        brain.telegraph = 0;
      }
    }
    // Sega explosions on/around the player — keep going through sustain phase
    // Slightly slower cadence after the 3s expand so it doesn't freeze awkwardly
    var explodeInterval = state.bossDefeatElapsed < BOSS_DEFEAT_BEAT_SEC ? 0.1 : 0.18;
    state.bossDefeatExplodeAcc = (state.bossDefeatExplodeAcc || 0) + dt;
    var px;
    var py;
    while (state.bossDefeatExplodeAcc >= explodeInterval) {
      state.bossDefeatExplodeAcc -= explodeInterval;
      px = state.width / 2 + (Math.random() - 0.5) * state.width * 0.28;
      py = state.height * 0.78 + (Math.random() - 0.5) * state.height * 0.12;
      if (ns.Fx && ns.Fx.spawnExplosion) {
        // sega27: boss-lose explosions random scale 50%–200%
        ns.Fx.spawnExplosion(state, px, py, "explosion", 0.5 + Math.random() * 1.5);
      }
    }
    if (ns.Fx && ns.Fx.update) {
      ns.Fx.update(state, dt);
    }
    // Keep brains animating (bob / drawScale with defeatExpand)
    if (ns.Brains && ns.Brains.update) {
      ns.Brains.update(state, dt);
    }
    if (ns.CyberFlies && ns.CyberFlies.update) {
      ns.CyberFlies.update(state, dt);
    }
    // Trigger lose storyboards only when song reaches them naturally (no audio seek)
    var songT = state.songClock;
    var music = Dom.get("music");
    if (music && !isNaN(music.currentTime)) {
      songT = music.currentTime;
    }
    if (songT != null && !isNaN(songT) && songT >= LOSE_STORYBOARD_T) {
      finishBossDefeatBeat(state);
    }
    return true;
  }

  function beginFinaleHardLose(state, reason) {
    state.finaleLost = true;
    state.finaleWon = false;
    state.finaleFight = false;
    state.saxBgActive = false;
    state.loseBanner = "YOU LOST. GAME OVER.";
    state.winBanner = null;
    state.finaleMode = null;
    state.finaleStoryboard = null;
    state.brains = [];
    state.shots = [];
    state.speed = 0;
    state.health = 0;
    state.deathFlashTimer = 0;
    // Immediate GAME OVER — do not continue into win path or lose storyboard
    state.phase = "gameover";
    state.songEnded = false;
    state.summary = {
      rawScore: Math.round(state.score),
      score: computeFinalScore(state),
      distance: state.distance,
      time: state.elapsed,
      nearMisses: state.nearMisses,
      brainKills: state.brainKills || 0,
      hits: state.hits,
      deaths: state.deaths || 0,
      avgSpeed: avgSpeedForDisplay(state),
      health: 0,
      finaleResult: "lose",
      loseReason: reason || "death"
    };
    state.score = state.summary.score;
    state.awaitingInitials = null;
    ns.State.clearInputFlags(state);
    updateRecords(state);
    setEvent(state, "YOU LOST. GAME OVER.");
    try {
      var kVid = Dom.get("karaokeVideo");
      if (kVid) { try { kVid.pause(); } catch (eK) {} }
    } catch (eK2) {}
  }

  function beginDeath(state) {
    state.deaths = (state.deaths || 0) + 1;
    state.deathFlashTimer = 1.6;
    state.speed = 0;
    state.health = 0;
    state.powerups = Math.max(0, (state.powerups || 0) - 3);
    var powerPenalty = 16;
    if (state.config && state.config.combat && state.config.combat.powerPenaltyFromDamage != null) {
      powerPenalty = state.config.combat.powerPenaltyFromDamage;
    }
    state.weaponPower = Math.max(0, (state.weaponPower || 0) - powerPenalty);
    if (ns.Sfx) {
      ns.Sfx.death();
    }
    // sega31d: cover player with explosions on DEATH
    if (!(state.config && state.config.deathCoverPlayerWithExplosions === false) && ns.Fx && ns.Fx.spawnExplosion) {
      var bi, px, py;
      var pyBase = (state.playerElevScreenY != null ? state.playerElevScreenY : 0.78) * state.height;
      for (bi = 0; bi < 10; bi++) {
        px = state.width / 2 + (Math.random() - 0.5) * state.width * 0.28;
        py = pyBase + (Math.random() - 0.5) * state.height * 0.16;
        ns.Fx.spawnExplosion(state, px, py, "sega", 0.55 + Math.random() * 1.4);
      }
    }
    // sega26: boss fight death → defeat beat (no audio seek) → lose storyboards
    if (state.finaleMode === "fight" || state.finaleFight) {
      state.deathFlashTimer = 0;
      startBossDefeatBeat(state, "death");
      return;
    }
    setEvent(state, "DEATH ×" + state.deaths + " · −" + powerPenalty + " POWER");
  }

  function updateDeath(state, dt) {
    if (!(state.deathFlashTimer > 0)) {
      return;
    }
    // Hard-lose during fight already ended the run
    if (state.phase === "gameover") {
      state.deathFlashTimer = 0;
      return;
    }
    state.deathFlashTimer -= dt;
    state.speed = 0;
    if (state.deathFlashTimer <= 0) {
      state.deathFlashTimer = 0;
      // Respawn at ~respawnDisplayMph (default 69 SPD) with full integrity + fresh accel curve
      state.health = state.config.maxHealth;
      state.speed = respawnRoadSpeed(state);
      state.accelSpawnBoost = 1; // mark spawn; elapsed decay offset below
      state.accelSpawnElapsed0 = state.elapsed;
      state.invulnTimer = Math.max(state.invulnTimer, 2.0);
      setEvent(state, "RESPAWN");
    }
  }

  function updateDifficulty(state) {
    var nextLevel = Math.min(
      state.config.maxDifficultyLevel,
      1 + Math.floor(state.elapsed / state.config.difficultyStepSeconds)
    );

    if (nextLevel > state.difficultyLevel) {
      state.difficultyLevel = nextLevel;
      state.health = Math.min(state.config.maxHealth, state.health + 6);
      /* no LEVEL commentary */
    }
  }

  function signedDistance(target, origin, trackLength) {
    var delta = target - origin;
    while (delta > trackLength / 2) {
      delta -= trackLength;
    }
    while (delta < -trackLength / 2) {
      delta += trackLength;
    }
    return delta;
  }


  // Internal LED units: speed/maxSpeed * ledMaxSpeed (normal).
  // Display = internal * (222/140), clamp to 333 (or 666 while Mad Max active).
  function ledBaseMax(state) {
    return (state.config && state.config.ledMaxSpeed) ? state.config.ledMaxSpeed : (333 * 140 / 222);
  }

  function ledMadCap(state) {
    return (state.config && state.config.ledMadMaxSpeed) ? state.config.ledMadMaxSpeed : (666 * 140 / 222);
  }

  function ledMax(state) {
    // Effective physics cap in internal units
    if (state.madMaxMode) {
      return state.madMaxLedCap != null ? state.madMaxLedCap : ledBaseMax(state);
    }
    return ledBaseMax(state);
  }

  function ledDisplayScale(state) {
    if (state.config && state.config.ledDisplayScale != null) {
      return state.config.ledDisplayScale;
    }
    return 169 / 140;
  }

  function ledDisplayMaxNow(state) {
    if (state.madMaxMode) {
      return (state.config && state.config.ledMadDisplayMax != null) ? state.config.ledMadDisplayMax : 666;
    }
    return (state.config && state.config.ledDisplayMax != null) ? state.config.ledDisplayMax : 333;
  }

  function ledSpeed(state) {
    if (!state.maxSpeed) {
      return 0;
    }
    // Always map against normal base so mad-max can exceed 1.0 * maxSpeed
    return (state.speed / state.maxSpeed) * ledBaseMax(state);
  }

  function speedCeiling(state) {
    // maxSpeed ↔ ledBaseMax; mad max may raise ceiling toward 2×
    var base = ledBaseMax(state);
    var cap = ledMax(state);
    return state.maxSpeed * (cap / Math.max(1e-6, base));
  }

  function avgSpeedForDisplay(state) {
    // sega30 fixAvgSpeedDisplay: end-screen Avg SPD uses LED display scale
    return Math.round((state.avgSpeed || 0) * ledDisplayScale(state));
  }

  /** sega30: internal road speed for boss fight crawl ≈ display bossLevelSpeed (default 25). */
  function bossCrawlInternalSpeed(state) {
    var disp = 25;
    if (state.config) {
      if (state.config.bossLevelSpeed != null) {
        disp = state.config.bossLevelSpeed;
      } else if (state.config.finaleFight && state.config.finaleFight.bossLevelSpeed != null) {
        disp = state.config.finaleFight.bossLevelSpeed;
      }
    }
    var scale = ledDisplayScale(state);
    var base = ledBaseMax(state);
    return state.maxSpeed * ((disp / scale) / Math.max(1e-6, base));
  }

  /** Road speed so HUD SPD ≈ respawnDisplayMph (default 69). Uses speedo mapping display = led × (169/140). */
  function respawnRoadSpeed(state) {
    var c = state.config || {};
    var scale = ledDisplayScale(state);
    var base = ledBaseMax(state);
    var ledInternal;
    if (c.respawnSpeed != null && isFinite(c.respawnSpeed)) {
      ledInternal = c.respawnSpeed;
    } else {
      var disp = c.respawnDisplayMph != null ? c.respawnDisplayMph : 69;
      ledInternal = disp / Math.max(1e-6, scale);
    }
    return state.maxSpeed * (ledInternal / Math.max(1e-6, base));
  }

  function madMaxAccelMult(state) {
    var mm = (state.config && state.config.madMax) ? state.config.madMax : null;
    if (!state.madMaxMode || !mm) {
      return 1;
    }
    return mm.accelMult != null ? mm.accelMult : 1;
  }

  function ledAccelRate(state, led) {
    var bands;
    var i;
    var rate;
    if (state.madMaxMode && state.config && state.config.ledMadAccelBands) {
      bands = state.config.ledMadAccelBands;
    } else {
      bands = (state.config && state.config.ledAccelBands) ? state.config.ledAccelBands : null;
    }
    if (!bands || !bands.length) {
      return 12 * madMaxAccelMult(state);
    }
    for (i = 0; i < bands.length; i++) {
      if (led < bands[i].upTo) {
        // sega28: Mad Max / 666 climb accel ×accelMult (editor madMaxAccelMult)
        return bands[i].rate * madMaxAccelMult(state);
      }
    }
    return 0;
  }

  /** Convert LED-units/sec accel into internal speed units/sec */
  function internalAccelFromLedRate(state, ledRate) {
    return ledRate * state.maxSpeed / ledBaseMax(state);
  }

  function noteMadMaxCollision(state) {
    var mm = (state.config && state.config.madMax) ? state.config.madMax : null;
    if (!state.madMaxMode || !mm) {
      return;
    }
    // Prefer: knock speed + pause climb briefly (do not exit Mad Max)
    state.madMaxClimbPause = mm.climbPauseOnHit != null ? mm.climbPauseOnHit : 2.5;
    var factor = mm.speedKnockFactor != null ? mm.speedKnockFactor : 0.72;
    state.speed = state.speed * factor;
    // sega21: actually knock overspeed down (was Math.max no-op)
    if (state.speed > state.maxSpeed) {
      state.speed = Math.max(state.maxSpeed * 0.85, state.speed * 0.92);
    }
  }

  function updateMadMaxClimb(state, dt) {
    var mm = (state.config && state.config.madMax) ? state.config.madMax : null;
    var climb;
    var madCap;
    var led;
    var catchUp;
    var base;
    if (!state.madMaxMode || !mm) {
      return;
    }
    if (state.madMaxClimbPause > 0) {
      state.madMaxClimbPause = Math.max(0, state.madMaxClimbPause - dt);
      return;
    }
    madCap = ledMadCap(state);
    climb = mm.climbPerSecond != null ? mm.climbPerSecond : 24;
    if (state.madMaxLedCap == null) {
      state.madMaxLedCap = ledBaseMax(state);
    }
    if (state.madMaxLedCap < madCap) {
      state.madMaxLedCap = Math.min(madCap, state.madMaxLedCap + climb * dt);
    }
    // sega21: keep actual speed chasing the rising LED cap (bands alone were too soft)
    led = ledSpeed(state);
    if (led < state.madMaxLedCap - 0.5) {
      catchUp = Math.min(22, (state.madMaxLedCap - led) * 1.35) * madMaxAccelMult(state);
      base = ledBaseMax(state);
      state.speed = Util.accelerate(
        state.speed,
        catchUp * state.maxSpeed / Math.max(1e-6, base),
        dt
      );
      if (ledSpeed(state) > state.madMaxLedCap) {
        state.speed = state.maxSpeed * (state.madMaxLedCap / Math.max(1e-6, base));
      }
    }
    led = ledSpeed(state);
    if (!state.madMaxUnlocked666 && led >= madCap - 0.5) {
      state.madMaxUnlocked666 = true;
      state.eventText = mm.unlockBanner || "666 POWER UNLOCKED";
      state.eventTimer = 2.8;
    }
  }

  function registerNearMiss(state) {
    state.combo = Math.min(state.combo + 1, 20);
    state.comboTimer = state.config.comboWindow;
    state.multiplier = 1 + Math.min(state.combo * 0.15, 3);
    state.nearMisses += 1;
    state.score += 10;
    state.nearMissFlash = 1;
    if (ns.Sfx) {
      ns.Sfx.nearMiss();
    }
    setEvent(state, "AVOID +10");
  }

  function spriteHitW(sprite, scaleMul) {
    if (!sprite) {
      return 0.3;
    }
    return sprite.w * SPRITES.SCALE * (scaleMul != null ? scaleMul : 1);
  }

  function updateNearMisses(state, playerX) {
    var playerWorldZ = Util.increase(state.position, state.playerZ, state.trackLength);
    var car;
    var relative;
    var lateral;
    var n;
    // Opposite-lane dodge only (~1.1 apart). Exclude same-lane (hits), keep a band for real avoids.
    var minLateral = 0.45;
    var maxLateral = 1.35;

    for (n = 0; n < state.cars.length; n++) {
      car = state.cars[n];
      relative = signedDistance(car.z, playerWorldZ, state.trackLength);
      lateral = Math.abs(car.offset - playerX);

      if (car.lastRelativeZ == null) {
        car.lastRelativeZ = relative;
        continue;
      }

      if (
        !car.avoidCounted &&
        !car.hitCounted &&
        car.lastRelativeZ > 0 &&
        relative <= 0 &&
        lateral >= minLateral &&
        lateral < maxLateral
      ) {
        car.avoidCounted = true;
        registerNearMiss(state);
      }

      car.lastRelativeZ = relative;
    }
  }

  function computeFinalScore(state) {
    var raw = state.score || 0;
    var avg = state.avgSpeed || 0;
    // Death penalty is respawn-at-respawnDisplayMph only — not in the formula
    // final = raw * average LED speed (avg of 0 keeps raw)
    if (!avg) {
      return Math.round(raw);
    }
    return Math.round(raw * avg);
  }

  function finishSong(state) {
    if (state.phase === "gameover") {
      return;
    }
    state.phase = "gameover";
    state.songEnded = true;
    // Clear karaoke / fight chrome so end-screen overlay is visible
    state.finaleMode = null;
    state.finaleStoryboard = null;
    state.saxBgActive = false;
    state.finaleFight = false;
    try {
      var kVid = Dom.get("karaokeVideo");
      if (kVid) {
        try { kVid.pause(); } catch (eK) {}
      }
    } catch (eK2) {}
    state.summary = {
      rawScore: Math.round(state.score),
      score: computeFinalScore(state),
      distance: state.distance,
      time: state.elapsed,
      nearMisses: state.nearMisses,
      brainKills: state.brainKills || 0,
      hits: state.hits,
      deaths: state.deaths || 0,
      avgSpeed: avgSpeedForDisplay(state),
      health: Math.round(state.health),
      finaleResult: state.finaleWon ? "win" : (state.finaleLost ? "lose" : null)
    };
    state.score = state.summary.score;
    state.awaitingInitials = null;
    state._eightBarLoop = false;
    state._waitingSongEndForLoop = true;
    ns.State.clearInputFlags(state);
    updateRecords(state);
    setEvent(state, state.finaleWon ? "WELL DONE. YOU WIN!" : "Song complete");
    // Keep the track playing through the real end — 8-bar loop starts only after music.ended
  }

  function checkGameOver(state) {
    // Soft-fail: never end solely on 0 HP; song end drives completion.
    if (!state.config.softFail && state.health <= 0) {
      state.phase = "gameover";
      state.summary = {
        score: Math.round(state.score),
        distance: state.distance,
        time: state.elapsed,
        nearMisses: state.nearMisses,
        hits: state.hits,
        health: 0
      };
      ns.State.clearInputFlags(state);
      updateRecords(state);
      setEvent(state, "Run ended");
    }
  }

  function updateRecords(state) {
    var records = state.records;
    records.bestScore = Math.max(records.bestScore, Math.round(state.score));
    records.bestDistance = Math.max(records.bestDistance, state.distance);
    records.bestTime = Math.max(records.bestTime, state.elapsed);

    if (state.fastLapTime > 0) {
      if (!records.bestLapTime || state.fastLapTime < records.bestLapTime) {
        records.bestLapTime = state.fastLapTime;
      }
    }

    ns.State.persistRecords(records);
  }

  function updateLapStats(state, dt, previousPosition) {
    if (state.position <= state.playerZ) {
      return;
    }

    if (state.currentLapTime && (previousPosition < state.playerZ)) {
      state.lastLapTime = state.currentLapTime;
      if (!state.fastLapTime || state.lastLapTime < state.fastLapTime) {
        state.fastLapTime = state.lastLapTime;
      }
      state.currentLapTime = 0;
      state.lap += 1;
      state.health = Math.min(state.config.maxHealth, state.health + 4);
      setEvent(state, "Lap " + (state.lap - 1));
      return;
    }

    state.currentLapTime += dt;
  }

  function updateScoring(state, dt) {
    var led = ledSpeed(state);
    state.speedSamples = (state.speedSamples || 0) + 1;
    state.speedSum = (state.speedSum || 0) + led;
    state.avgSpeed = state.speedSum / state.speedSamples;
    state.distance += state.speed * dt;
    // Live scoreboard shows event points; final = (score/deaths)*avgSpeed at song end
    state.rank = ns.State.deriveRank(state.score, state.config);
  }

  function snapLane(state, dt) {
    var target = ns.State.laneOffset(state, state.lane);
    var diff = target - state.playerX;
    var step = state.config.laneSnapSpeed * dt;
    if (Math.abs(diff) <= step) {
      state.playerX = target;
    } else {
      state.playerX += (diff > 0 ? step : -step);
    }
  }

  function updateRun(state, dt) {
    var playerSegment = ns.Track.findSegment(state, state.position + state.playerZ);
    var playerScale = state.config.spriteScalePlayer != null ? state.config.spriteScalePlayer : 1.5;
    var carScale = state.config.spriteScaleCars != null ? state.config.spriteScaleCars : 1.75;
    if (state.config.carsWidthMult != null) carScale *= state.config.carsWidthMult; // sega31s hit W
    var playerW = spriteHitW(SPRITES.PLAYER_STRAIGHT, playerScale);
    var speedPercent = state.speed / state.maxSpeed;
    var startPosition = state.position;
    var n;
    var car;
    var carW;
    var sprite;
    var spriteW;
    var cruise;
    var playerWorldZ;
    var dz;
    var crossed;

    state.elapsed += dt;
    // sega26: boss defeat beat (explosions + expand; wait for natural storyboard time)
    if (updateBossDefeatBeat(state, dt)) {
      return;
    }
    updateDeath(state, dt);
    if (state.deathFlashTimer > 0) {
      state.speed = 0;
      // Keep song sections ticking during DEATH card
      if (ns.Sega31 && ns.Sega31.updateElevation) {
      ns.Sega31.updateElevation(state, dt);
    }
    if (state.phase === "running" || state.phase === "countdown") {
      state.runElapsedSinceStart = (state.runElapsedSinceStart || 0) + dt;
    }
    if (state._pendingUnavoidableZap) {
      state._pendingUnavoidableZap = false;
      state._zapHit = true;
      applyDamage(state, (state.config.brains && state.config.brains.zapDamage) || 30);
      state.shockFlash = Math.max(state.shockFlash || 0, 0.9 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1));
    }
    if (ns.Sections && ns.Sections.update) {
        ns.Sections.update(state, dt);
      }
      return;
    }
    if (state.invulnTimer > 0) {
      state.invulnTimer = Math.max(0, state.invulnTimer - dt);
    }
    updateDifficulty(state);

    state.trafficAdjustCooldown -= dt;
    if (state.trafficAdjustCooldown <= 0) {
      if (state.sectionTraffic === false) {
        // brains-only / no-wreck windows — drain obstacles
        if (state.cars && state.cars.length) {
          ns.Sections && ns.Sections.clearTraffic && ns.Sections.clearTraffic(state);
        }
      } else {
        ns.Traffic.ensureTrafficDensity(state);
      }
      state.trafficAdjustCooldown = 1;
    }

    ns.Traffic.updateCars(state, dt, playerSegment, playerW);
    // sega35: freeze road texture/segment advance during tunnel drive-in / exit wait
    if (!(state._tunnelFreezeRoad || (ns.Sega31x && ns.Sega31x.tunnelFreezeRoad && ns.Sega31x.tunnelFreezeRoad(state)))) {
      // sega43: ease-out decel into the mouth (0 exactly at freeze) instead of an abrupt stop
      var roadMult = (ns.Sega31x && ns.Sega31x.tunnelRoadSpeedMult) ? ns.Sega31x.tunnelRoadSpeedMult(state) : 1;
      state.position = Util.increase(state.position, dt * state.speed * roadMult, state.trackLength);
    }

    // Discrete lane snaps (LEFT/RIGHT set state.lane)
    snapLane(state, dt);
    // light centrifugal so curves still feel alive without dumping out of lane
    state.playerX -= (dt * speedPercent * playerSegment.curve * state.centrifugal * 0.35);
    // re-attract toward lane after curve push
    snapLane(state, dt * 0.5);

    // sega30: boss fight crawls at ~display 25 (not hard zero)
    if (state.finaleMode === "fight" || state.finaleFight) {
      var crawl = bossCrawlInternalSpeed(state);
      state.speed = crawl;
      state.activeMaxSpeed = crawl;
      state.bossApproach = true;
    } else if (state.bossApproach) {
      // Pre-fight brake window decelerates toward crawl (not absolute stop)
      var crawlTarget = bossCrawlInternalSpeed(state);
      var stopDecel = internalAccelFromLedRate(state, 88);
      if (state.speed > crawlTarget) {
        state.speed = Math.max(crawlTarget, state.speed - stopDecel * dt);
      }
      state.activeMaxSpeed = Math.max(state.speed, crawlTarget);
    } else if (state.config.unlimitedTopSpeed) {
      updateMadMaxClimb(state, dt);
      var accelMul = state.health <= 0 ? 0.55 : 1.0;
      var led = ledSpeed(state);
      var maxLed = ledMax(state);
      var ceiling = speedCeiling(state);
      var ledRate = ledAccelRate(state, led);
      var accelEff = internalAccelFromLedRate(state, ledRate) * accelMul;
      state.activeMaxSpeed = ceiling;
      if (state.speed > ceiling + 1) {
        // Over cap (e.g. Mad Max just ended): decelerate toward normal max
        state.speed = Math.max(ceiling, state.speed - internalAccelFromLedRate(state, 22) * dt);
      } else if (led >= maxLed - 0.05) {
        state.speed = ceiling;
      } else {
        state.speed = Util.accelerate(state.speed, accelEff, dt);
        if (ledSpeed(state) > maxLed) {
          state.speed = ceiling;
        }
      }
    } else {
      cruise = state.maxSpeed * state.config.autoDriveSpeedFactor;
      if (state.health <= 0) {
        cruise *= 0.82;
      }
      state.activeMaxSpeed = cruise * 1.05;
      if (state.speed < cruise) {
        state.speed = Util.accelerate(state.speed, state.accel * 0.85, dt);
      } else {
        state.speed = Util.accelerate(state.speed, state.decel * 0.35, dt);
      }
    }

    if ((state.playerX < -1) || (state.playerX > 1)) {
      if (state.speed > state.offRoadLimit) {
        state.speed = Util.accelerate(state.speed, state.offRoadDecel, dt);
        applyDamage(state, state.config.damage.offRoadPerSecond * dt);
      }

      for (n = 0; n < playerSegment.sprites.length; n++) {
        sprite = playerSegment.sprites[n];
        if (sprite.sectionId && state.sectionId && sprite.sectionId !== state.sectionId) {
          continue;
        }
        spriteW = sprite.source.w * SPRITES.SCALE * (sprite.source.scaleMul || 1);
        if (
          Util.overlap(
            state.playerX,
            playerW,
            sprite.offset + spriteW / 2 * (sprite.offset > 0 ? 1 : -1),
            spriteW
          )
        ) {
          state.speed = state.maxSpeed / 5;
          noteMadMaxCollision(state);
          state.position = Util.increase(playerSegment.p1.world.z, -state.playerZ, state.trackLength);
          applyDamage(state, state.config.damage.roadsideCollision);
          break;
        }
      }
    }

    // Car collisions: Z-proximity + scaled hitboxes (matches ~50% larger sprites).
    // Do NOT require speed > car.speed — faster cybercabs were phasing through.
    // Sweep all cars (not only playerSegment) so 1-seg/frame motion cannot tunnel past.
    playerWorldZ = Util.increase(state.position, state.playerZ, state.trackLength);
    for (n = 0; n < state.cars.length; n++) {
      car = state.cars[n];
      dz = signedDistance(car.z, playerWorldZ, state.trackLength);
      // Allow another hit next encounter after this car is well clear
      if (car.hitCounted) {
        if (Math.abs(dz) > state.segmentLength * 10) {
          car.hitCounted = false;
        } else {
          continue;
        }
      }
      crossed = (car.lastRelativeZ != null && car.lastRelativeZ > 0 && dz <= 0);
      if (!(Math.abs(dz) < state.segmentLength * 1.6 || crossed)) {
        continue;
      }
      carW = spriteHitW(car.sprite, carScale);
      if (!Util.overlap(state.playerX, playerW, car.offset, carW, 0.72)) {
        continue;
      }
      // sega31: fly over cars when elevated; trainer can disable car collisions
      if (ns.Sega31 && ns.Sega31.fliesOverCars && ns.Sega31.fliesOverCars(state)) {
        continue;
      }
      if (ns.Sega31 && ns.Sega31.trainerOn && !ns.Sega31.trainerOn(state, "carCollisions")) {
        continue;
      }
      car.hitCounted = true;
      car.avoidCounted = true; // do not also award an avoid for this car
      if (state.config.unlimitedTopSpeed) {
        state.speed = Math.max(state.speed * 0.82, state.maxSpeed * 0.35);
      } else {
        state.speed = car.speed * (car.speed / Math.max(state.speed, 1));
      }
      noteMadMaxCollision(state);
      state.position = Util.increase(car.z, -state.playerZ, state.trackLength);
      playerWorldZ = Util.increase(state.position, state.playerZ, state.trackLength);
      // sega31q+: car collision FX — never pickup/cute; spawnCollisionExplosion forces fiery
      state._carCollisionFx = true;
      try {
        if (ns.Fx && ns.Fx.spawnCollisionExplosion) {
          ns.Fx.spawnCollisionExplosion(state, car);
        } else if (ns.Fx && ns.Fx.spawnExplosion) {
          // fallback: never kind "pickup"
          var fxKind = (state.config && (state.config.enemyCollisionFxKind || state.config.carCollisionFxKind)) || "sega";
          if (fxKind === "pickup" || !fxKind) fxKind = "sega";
          ns.Fx.spawnExplosion(state, state.width / 2, state.height * 0.72, fxKind);
          if (ns.Fx.spawnDebrisShards) ns.Fx.spawnDebrisShards(state, state.width / 2, state.height * 0.72, 1);
          state.explosionFlash = Math.max(state.explosionFlash || 0, 1);
          state.damageFlash = Math.max(state.damageFlash || 0, 1);
        }
      } finally {
        state._carCollisionFx = false;
      }
      // sega31d: car collision damage scales with DISPLAYED mph (0 @ 0, full @ 240, cap above)
      (function() {
        var base = state.config.damage.carCollision + Math.floor(state.difficultyLevel * 0.5);
        var scaleOn = !(state.config && state.config.carCollisionDamageScaleByDisplaySpeed === false);
        if (scaleOn) {
          var cap = state.config.carCollisionDamageFullAtDisplayMph != null
            ? state.config.carCollisionDamageFullAtDisplayMph : 240;
          var mph = 0;
          if (ns.Sega31 && ns.Sega31.displayMph) mph = ns.Sega31.displayMph(state);
          else mph = ledSpeed(state) * ledDisplayScale(state);
          var t = Math.max(0, Math.min(1, mph / Math.max(1, cap)));
          base = base * t;
        }
        applyDamage(state, base);
      })();
      break;
    }

    updateNearMisses(state, state.playerX);

    if (ns.Sega31 && ns.Sega31.updateElevation) {
      ns.Sega31.updateElevation(state, dt);
    }
    if (state.phase === "running" || state.phase === "countdown") {
      state.runElapsedSinceStart = (state.runElapsedSinceStart || 0) + dt;
    }
    if (state._pendingUnavoidableZap) {
      state._pendingUnavoidableZap = false;
      state._zapHit = true;
      applyDamage(state, (state.config.brains && state.config.brains.zapDamage) || 30);
      state.shockFlash = Math.max(state.shockFlash || 0, 0.9 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1));
    }
    if (ns.Sections && ns.Sections.update) {
      ns.Sections.update(state, dt);
    }
    if (ns.Brains && ns.Brains.update) {
      ns.Brains.update(state, dt);
    }
    if (ns.CyberFlies && ns.CyberFlies.update) {
      ns.CyberFlies.update(state, dt);
    }
    // Hard-lose during fight may flip phase mid-frame
    if (state.phase !== "running") {
      return;
    }
    if (ns.Fx && ns.Fx.update) {
      ns.Fx.update(state, dt);
    }

    state.playerX = Util.limit(state.playerX, -1.2, 1.2);
    if (state.finaleMode === "fight" || state.finaleFight) {
      state.speed = 0;
      state.activeMaxSpeed = 0;
    } else if (state.bossApproach) {
      // Keep brake authoritative — do not re-open ceiling mid-stop
      state.speed = Util.limit(state.speed, 0, state.maxSpeed);
    } else if (state.config.unlimitedTopSpeed) {
      state.speed = Util.limit(state.speed, 0, speedCeiling(state));
    } else {
      state.speed = Util.limit(state.speed, 0, state.activeMaxSpeed);
    }

    // Parallax: scroll with distance at clearly different speeds; curve adds a little lean
    var travel = (state.position - startPosition) / state.segmentLength;
    var curveLean = playerSegment.curve * 0.35;
    state.skyOffset = Util.increase(state.skyOffset, state.skySpeed * (travel + curveLean), 1);
    state.hillOffset = Util.increase(state.hillOffset, state.hillSpeed * (travel + curveLean), 1);
    state.treeOffset = Util.increase(state.treeOffset, state.treeSpeed * (travel + curveLean), 1);

    updateLapStats(state, dt, startPosition);
    updateScoring(state, dt);

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }

    checkGameOver(state);
    maybeEndWithSong(state);
  }

  function maybeEndWithSong(state) {
    var music = Dom.get("music");
    var t = 0;
    var ff = (state.config && state.config.finaleFight) ? state.config.finaleFight : {};
    var loseEnd = ff.loseStoryboardEnd != null ? ff.loseStoryboardEnd : 223.76;
    var winEnd = ff.songEnd != null ? ff.songEnd : 243;
    if (!music) {
      return;
    }
    t = !isNaN(music.currentTime) ? music.currentTime : 0;
    if (state.finaleWon || state.finaleMode === "winCruise") {
      // sega24: RUN COMPLETE only after win sequence finishes (not merely song clock)
      if (state.winSequenceDone || state.winPhase === "done") {
        finishSong(state);
      }
      return;
    }
    if (state.finaleLost && state.finaleMode === "karaoke") {
      // Losing storyboard path — RUN COMPLETE after last card hold
      if (t >= loseEnd) {
        finishSong(state);
      }
      return;
    }
    // Default / legacy: last storyboard hold then complete
    if (t >= loseEnd) {
      finishSong(state);
      return;
    }
    if (music.ended) {
      finishSong(state);
      return;
    }
  }

  function updateTransitions(state, dt) {
    state.eventTimer = Math.max(0, state.eventTimer - dt);
    state.damageFlash = Math.max(0, state.damageFlash - (dt * 3.5));
    if ((state._playerHitRedDiffT || 0) > 0) {
      state._playerHitRedDiffT = Math.max(0, state._playerHitRedDiffT - dt);
      if (state._playerHitRedDiffT <= 0) state._playerHitRedDiff = false;
    }
    state.nearMissFlash = Math.max(0, state.nearMissFlash - (dt * 3.8));

    if (state.phase === "countdown") {
      state.countdown -= dt;
      if (state.countdown <= 0) {
        state.phase = "running";
        state.countdown = 0;
        setEvent(state, "Fight");
      }
    }
  }


  var MENU_LOOP_END = 13.5; // cut before "got nothing to prove" (~13.7); She's may remain

  function applyMuteState(music) {
    var musicMuted = false;
    try {
      musicMuted = (Dom.storage.muted === "true") || (localStorage.getItem("brainwatch_ffyl_music_muted") === "true");
    } catch (eM) {}
    music.muted = !!musicMuted;
    music.volume = musicMuted ? 0 : 1;
  }

  function userWantsMusicMuted() {
    try {
      return (Dom.storage.muted === "true") || (localStorage.getItem("brainwatch_ffyl_music_muted") === "true");
    } catch (eM) {
      return false;
    }
  }

  function forceMenuLoopPlay(state, preferMuted) {
    var music = Dom.get("music");
    if (!music) { return; }
    try {
      state._eightBarLoop = true;
      music.loop = false;
      // sega30 fixMenuMusicAudible: once unlocked via Insert Token / gesture, never re-mute in retries
      if (state._menuAudioUnlocked && !userWantsMusicMuted()) {
        try { music.removeAttribute("muted"); } catch (eRm) {}
        music.muted = false;
        music.defaultMuted = false;
        music.volume = 1;
        state._menuUnmutePending = false;
      } else if (preferMuted || state._menuUnmutePending) {
        // sega25: muted autoplay until user gesture (Insert Token)
        if (!userWantsMusicMuted()) {
          music.muted = true;
          music.volume = 0;
          state._menuUnmutePending = true;
        } else {
          applyMuteState(music);
          state._menuUnmutePending = false;
        }
      } else if (userWantsMusicMuted()) {
        applyMuteState(music);
        state._menuUnmutePending = false;
      } else {
        applyMuteState(music);
      }
      if (music.readyState >= 1) {
        try {
          if (isNaN(music.currentTime) || music.currentTime < 0 || music.currentTime >= MENU_LOOP_END) {
            music.currentTime = 0;
          }
        } catch (eSeek) {}
      }
      state.songClock = music.currentTime || 0;
      var p = music.play();
      if (p && typeof p.then === "function") {
        p.then(function() {
          state._eightBarPlaying = true;
          state._menuPlayRetryAt = 0;
          // Keep muted until armMenuUnmuteGesture — do not unmute here
        }).catch(function() {
          state._eightBarPlaying = false;
          state._menuUnmutePending = !userWantsMusicMuted();
          state._menuPlayRetryAt = (typeof performance !== "undefined" ? performance.now() : Date.now()) + 250;
        });
      }
    } catch (e) {
      state._eightBarPlaying = false;
    }
  }

  function armMenuUnmuteGesture(state) {
    if (state._menuUnmuteArmed) { return; }
    state._menuUnmuteArmed = true;
    var unlock = function(ev) {
      var music = Dom.get("music");
      if (!music) { return; }
      // sega31k: any main-menu gesture (Instructions / INSERT TOKEN / high scores / overlay taps)
      // starts/unmutes the 8-bar loop — not token-only
      if (state.phase === "menu" || state._menuUnmutePending || (state.phase === "gameover" && state._eightBarLoop)) {
        unmuteMenuMusicAudible(state);
      }
    };
    ["pointerdown", "touchstart", "keydown", "click"].forEach(function(ev) {
      document.addEventListener(ev, unlock, { once: false, capture: true, passive: true });
    });
  }

  function startEightBarLoop(state) {
    var music = Dom.get("music");
    if (!music) { return; }
    try {
      state._eightBarLoop = true;
      music.loop = false;
      armMenuUnmuteGesture(state);
      // sega25: muted autoplay FIRST (browser policy), unmute on first gesture
      state._menuUnmutePending = !userWantsMusicMuted();
      forceMenuLoopPlay(state, true);
      // Reinforce if still paused (audio element may not be ready yet)
      setTimeout(function() {
        if (state.phase !== "menu" && !(state.phase === "gameover" && state._eightBarLoop)) {
          return;
        }
        var m = Dom.get("music");
        if (m && m.paused) {
          forceMenuLoopPlay(state, true);
        }
      }, 80);
      setTimeout(function() {
        if (state.phase !== "menu" && !(state.phase === "gameover" && state._eightBarLoop)) {
          return;
        }
        var m2 = Dom.get("music");
        if (m2 && m2.paused) {
          forceMenuLoopPlay(state, true);
        }
      }, 400);
    } catch (e) {}
  }

  function tickEightBarLoop(state) {
    var music = Dom.get("music");
    var now;
    if (!music || !state._eightBarLoop) {
      return;
    }
    try {
      if (music.paused) {
        now = (typeof performance !== "undefined" ? performance.now() : Date.now());
        // Throttle retries — do not spam play() every frame
        if (!state._menuPlayRetryAt || now >= state._menuPlayRetryAt) {
          state._menuPlayRetryAt = now + 500;
          forceMenuLoopPlay(state, !!state._menuUnmutePending || music.muted);
        }
      }
      if (!isNaN(music.currentTime) && music.currentTime >= MENU_LOOP_END) {
        music.currentTime = 0;
      }
    } catch (e) {}
  }

  function tickMenuMusic(state) {
    // Title menu: 8-bar loop immediately
    if (state.phase === "menu") {
      if (!state._eightBarLoop) {
        startEightBarLoop(state);
      }
      tickEightBarLoop(state);
      return;
    }
    // RUN COMPLETE: only loop AFTER the full song has finished
    if (state.phase === "gameover") {
      if (state._eightBarLoop) {
        tickEightBarLoop(state);
      }
    }
  }

  /** sega30: Insert Token / gesture — remove HTML muted, audible 8-bar loop. */
  function unmuteMenuMusicAudible(state) {
    var music = Dom.get("music");
    if (!music) { return; }
    if (userWantsMusicMuted()) {
      applyMuteState(music);
      return;
    }
    state._menuAudioUnlocked = true;
    state._menuUnmutePending = false;
    state._eightBarLoop = true;
    try {
      music.removeAttribute("muted");
      music.muted = false;
      music.defaultMuted = false;
      music.volume = 1;
      if (music.readyState >= 1) {
        try {
          if (isNaN(music.currentTime) || music.currentTime < 0 || music.currentTime >= MENU_LOOP_END) {
            music.currentTime = 0;
          }
        } catch (eS) {}
      }
      var p = music.play();
      if (p && p.catch) {
        p.catch(function() {
          // Still mark unlocked so retries do not re-mute
          state._menuAudioUnlocked = true;
          forceMenuLoopPlay(state, false);
        });
      }
    } catch (eU) {}
  }

  function insertToken(state) {
    state.tokenInserted = true;
    if (state.config && state.config.insertTokenStartsMusic !== false) {
      unmuteMenuMusicAudible(state);
    } else {
      state._menuAudioUnlocked = true;
      unmuteMenuMusicAudible(state);
    }
    if (ns.Sfx) {
      try { ns.Sfx.unlock(); } catch (eS) {}
      try {
        if (state.config && state.config.tokenCoinSfx !== false && ns.Sfx.tokenCoin) {
          ns.Sfx.tokenCoin();
          setTimeout(function() {
            if (ns.Sfx.tokenCredit) ns.Sfx.tokenCredit();
          }, 90);
        } else {
          ns.Sfx.ui();
        }
      } catch (eS2) {}
    }
  }

    function ensureMenuMusic(state) {
    // Only for true title menu — never rewind a finishing song
    if (state.phase !== "menu") {
      return;
    }
    armMenuUnmuteGesture(state);
    // sega21: if 8-bar loop already playing (e.g. from RUN COMPLETE), keep it
    if (state._eightBarLoop) {
      tickEightBarLoop(state);
      return;
    }
    startEightBarLoop(state);
  }

  /**
   * sega25: arm title menu 8-bar loop as early as bootstrap (before image load).
   * Strategy: muted autoplay immediately → unmute on first user gesture.
   * Does NOT require START GAME. Remaining limit: some browsers keep muted
   * until any click/tap/key; silent playback still loops under MENU_LOOP_END.
   */
  function armTitleMenuMusic(state) {
    if (!state) { return; }
    state._menuMusicArmed = true;
    armMenuUnmuteGesture(state);
    var music = Dom.get("music");
    if (music) {
      try {
        music.setAttribute("playsinline", "playsinline");
        music.setAttribute("webkit-playsinline", "true");
        music.preload = "auto";
        // Hint autoplay policy: start muted until gesture
        if (!userWantsMusicMuted()) {
          music.muted = true;
          music.defaultMuted = true;
        }
      } catch (eA) {}
      var kick = function() {
        if (state.phase === "menu" || (state.phase === "gameover" && state._eightBarLoop)) {
          ensureMenuMusic(state);
        }
      };
      ["canplay", "loadeddata", "canplaythrough", "loadedmetadata"].forEach(function(ev) {
        music.addEventListener(ev, kick);
      });
      // Immediate attempt — muted path; loop window active via _eightBarLoop
      kick();
      // Extra kicks while images still load (frame loop not running yet)
      setTimeout(kick, 50);
      setTimeout(kick, 200);
      setTimeout(kick, 600);
      setTimeout(kick, 1500);
    } else {
      ensureMenuMusic(state);
    }
  }

  function onSongFullyFinished(state) {
    // Called when audio really ends — now safe to start the 8-bar loop
    if (state.phase === "gameover" || state.phase === "menu") {
      startEightBarLoop(state);
    }
  }

  function startAudio(state) {
    var music = Dom.get("music");
    if (!music) {
      return;
    }
    try {
      music.loop = false;
      state._eightBarLoop = false;
      var musicMuted = false;
      try {
        musicMuted = (Dom.storage.muted === "true") || (localStorage.getItem("brainwatch_ffyl_music_muted") === "true");
      } catch (eM) {}
      // sega41: START gesture IS the unlock — always unmute unless user muted
      // (do not wait for _menuAudioUnlocked; do not stay muted after START)
      try {
        music.preload = "auto";
        music.setAttribute("playsinline", "playsinline");
      } catch (ePre) {}
      if (!musicMuted) {
        music.removeAttribute("muted");
        music.muted = false;
        music.defaultMuted = false;
        music.volume = 1;
        state._menuAudioUnlocked = true;
      } else {
        music.muted = true;
        music.defaultMuted = true;
        music.volume = 0;
      }
      try {
        if (!isNaN(music.currentTime) && music.currentTime > 0.05) {
          music.currentTime = 0;
        } else {
          music.currentTime = 0;
        }
      } catch (eSeek) {}
      state.songClock = 0;
      function tryPlay(reason) {
        try {
          var p = music.play();
          if (p && typeof p.catch === "function") {
            p.catch(function(err) {
              console.warn("audio play failed", reason || "", err);
            });
          }
        } catch (err2) {
          console.warn("audio play failed", reason || "", err2);
        }
      }
      tryPlay("start");
      // sega41: retry when audio finishes buffering (was starved behind huge PNG loads)
      if (!state._sega41AudioRetryArmed) {
        state._sega41AudioRetryArmed = true;
        var retry = function() {
          if (state.phase !== "running" && state.phase !== "countdown") return;
          if (music.paused) tryPlay("canplay");
        };
        music.addEventListener("canplay", retry);
        music.addEventListener("canplaythrough", retry);
        setTimeout(function() { if (music.paused && (state.phase === "running" || state.phase === "countdown")) tryPlay("t250"); }, 250);
        setTimeout(function() { if (music.paused && (state.phase === "running" || state.phase === "countdown")) tryPlay("t1000"); }, 1000);
      }
    } catch (err) {
      console.warn("audio play failed", err);
    }
  }

  function startRun(state) {
    // sega42: refuse Start until critical assets ready (prevents blank canvas after overlay dismiss)
    if (!state.assetsReady) {
      state._pendingStart = true;
      return false;
    }
    state._pendingStart = false;
    ns.State.resetRunState(state);
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
    state.particles = [];
    state.explosionFlash = 0;
    state.powerups = 0;
    state.weaponPower = 0;
    state.runElapsedSinceStart = 0;
    state.elevTier = 1;
    state.heartsTowardNextTier = 0;
    state.heartsTotal = 0;
    state.firstPersonBurst = false;
    state.playerElevScale = 1;
    state.playerElevScreenY = (state.config && state.config.elevTier1ScreenY != null)
      ? state.config.elevTier1ScreenY : 0.99;
    state.elevTargetScreenY = state.playerElevScreenY;
    state.elevTargetScale = 1;
    state.elevFloatHoldTimer = 0;
    state.tier2AloftTimer = 0;
    state.winElevFrozen = false;
    state.winFrozenElevScreenY = null;
    state.winFrozenElevScale = null;
    state.winFrozenElevTier = null;
    state.winFrozenCameraHeight = null;
    state._fpBurstDoneForTier3 = false;
    state.forceBgStyle = null;
    state.postNukeAustin = false;
    state.nuclearWinter = false;
    state.winterGrayscale = false;
    state.bossZapStorm = false;
    if (ns.Sega31 && ns.Sega31.ensureTrainer) ns.Sega31.ensureTrainer(state);
    state.madMaxMode = false;
    state.madMaxUnlocked666 = false;
    state.madMaxClimbPause = 0;
    state.madMaxLedCap = 0;
    state.madMaxFlashTimer = 0;
    state.madMaxFlashText = "";
    state.sectionTitleText = "";
    state.sectionTitleAge = 0;
    state.sectionTitleDuration = 0;
    state.sectionTitleFade = 0;
    state.bossApproach = false;
    state.winRideAhead = 0;
    state.winRideProgress = 0;
    state.winPhase = null;
    state.winCenterBlend = 0;
    state.winPlayerAlpha = 1;
    state.winSequenceDone = false;
    state._menuMusicArmed = false;
    state._eightBarLoop = false;
    state._waitingSongEndForLoop = false;
    // sega31k: skip multi-second black stall — countdown 0 → running immediately
    var cd = state.config.countdownSeconds != null ? state.config.countdownSeconds : 0;
    if (cd > 0) {
      state.phase = "countdown";
      state.countdown = cd;
    } else {
      state.phase = "running";
      state.countdown = 0;
    }
    state.rank = ns.State.deriveRank(state.score, state.config);
    state.summary = null;
    state.songEnded = false;
    state.showHighScores = false;
    startAudio(state);
    setEvent(state, "Run started");
  }

  function restartRun(state) {
    startRun(state);
  }

  function returnToMenu(state) {
    var music = Dom.get("music");
    var keepLoop = !!state._eightBarLoop;
    ns.State.clearInputFlags(state);
    state.phase = "menu";
    // sega30: require Insert Token again on title
    state.tokenInserted = false;
    state._runCompleteTokenReady = false;
    state.summary = null;
    state.songEnded = false;
    state.awaitingInitials = false;
    state.finaleMode = null;
    state.finalePauseTimer = 0;
    state.finaleStoryboard = null;
    state.finaleFight = false;
    state.finaleWon = false;
    state.finaleLost = false;
    state.finaleBrainsSpawned = false;
    state.saxBgActive = false;
    state.winBanner = null;
    state.loseBanner = null;
    state.failHumanityBanner = null;
    state._waitingSongEndForLoop = false;
    state.countdown = 0;
    state.deathFlashTimer = 0;
    state.bossDefeatBeat = false;
    state.bossDefeatTimer = 0;
    state.bossDefeatElapsed = 0;
    state.bossDefeatExplodeAcc = 0;
    state.bossDefeatReason = null;
    state.failHumanityBanner = null;
    state.eventText = "";
    state.eventTimer = 0;
    state.showHighScores = false;
    // sega21: seamless — if 8-bar loop already playing on RUN COMPLETE, do NOT restart
    if (keepLoop) {
      state._menuMusicArmed = true;
      state._eightBarLoop = true;
      tickEightBarLoop(state);
    } else {
      state._menuMusicArmed = false;
      if (music) {
        try { music.pause(); } catch (e0) {}
      }
      startEightBarLoop(state);
    }
    setEvent(state, "");
  }

  function togglePause(state) {
    var music = Dom.get("music");
    // Cinematic finale pause/karaoke is not user-pausable; fight/cruise allow pause
    if (finaleFreezesDriving(state)) {
      return;
    }
    if (state.phase === "running") {
      state.phase = "paused";
      ns.State.clearInputFlags(state);
      if (music) {
        music.pause();
      }
      setEvent(state, "Paused");
      return;
    }

    if (state.phase === "paused") {
      state.phase = "running";
      // sega31o: force-hide trainer on unpause (never orphan overlay on running game)
      try {
        var tp = document.getElementById("trainerPanel");
        if (tp) {
          tp.classList.add("hidden");
          tp.setAttribute("aria-hidden", "true");
        }
        var pb = document.getElementById("pauseButton");
        if (pb) pb.classList.remove("trainer-open-hide");
      } catch (eT) {}
      if (music) {
        music.play().catch(function() {});
      }
      setEvent(state, "Resumed");
    }
  }

  function setLane(state, lane) {
    var max = state.config.laneOffsets.length - 1;
    var next = Util.limit(lane, 0, max);
    if (next !== state.lane && ns.Sfx && (state.phase === "running" || state.phase === "countdown") && !finaleFreezesDriving(state)) {
      ns.Sfx.lane();
    }
    state.lane = next;
  }

  function nudgeLane(state, dir) {
    setLane(state, state.lane + dir);
  }

  function finaleFreezesDriving(state) {
    return state.finaleMode === "paused" || state.finaleMode === "karaoke";
  }

  function updateWinCruise(state, dt) {
    // sega24: 1) accel to display 666 → 2) move sprite to mid-screen Y →
    // 3) shrink/fade into horizon → 4) only then RUN COMPLETE
    var playerSegment;
    var speedPercent;
    var startPosition;
    var cruiseLed;
    var madCap;
    var ledRate;
    var accelEff;
    var disp;
    var scale;
    var phase = state.winPhase || "accel666";
    state.elapsed += dt;
    if (ns.Sega31 && ns.Sega31.updateElevation) {
      ns.Sega31.updateElevation(state, dt);
    }
    if (state.phase === "running" || state.phase === "countdown") {
      state.runElapsedSinceStart = (state.runElapsedSinceStart || 0) + dt;
    }
    if (state._pendingUnavoidableZap) {
      state._pendingUnavoidableZap = false;
      state._zapHit = true;
      applyDamage(state, (state.config.brains && state.config.brains.zapDamage) || 30);
      state.shockFlash = Math.max(state.shockFlash || 0, 0.9 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1));
    }
    if (ns.Sections && ns.Sections.update) {
      ns.Sections.update(state, dt);
    }
    if (state.cars && state.cars.length && ns.Sections && ns.Sections.clearTraffic) {
      ns.Sections.clearTraffic(state);
    }
    playerSegment = ns.Track.findSegment(state, state.position + state.playerZ);
    startPosition = state.position;
    snapLane(state, dt);
    if (!(state._tunnelFreezeRoad || (ns.Sega31x && ns.Sega31x.tunnelFreezeRoad && ns.Sega31x.tunnelFreezeRoad(state)))) {
      // sega43: ease-out decel into the mouth (0 exactly at freeze) instead of an abrupt stop
      var roadMult = (ns.Sega31x && ns.Sega31x.tunnelRoadSpeedMult) ? ns.Sega31x.tunnelRoadSpeedMult(state) : 1;
      state.position = Util.increase(state.position, dt * state.speed * roadMult, state.trackLength);
    }

    // Keep Mad-Max-style climb active so LED can reach display 666
    if (!state.madMaxMode) {
      state.madMaxMode = true;
      if (state.madMaxLedCap == null || state.madMaxLedCap < ledBaseMax(state)) {
        state.madMaxLedCap = ledBaseMax(state);
      }
    }
    updateMadMaxClimb(state, dt);

    cruiseLed = ledSpeed(state);
    madCap = ledMadCap(state);
    ledRate = ledAccelRate(state, cruiseLed);
    accelEff = internalAccelFromLedRate(state, Math.max(ledRate, 14));
    state.activeMaxSpeed = state.maxSpeed * (madCap / Math.max(1e-6, ledBaseMax(state)));
    state.speed = Util.accelerate(state.speed, accelEff, dt);
    // Cap internal speed to mad LED ceiling
    if (ledSpeed(state) > madCap) {
      state.speed = state.maxSpeed * (madCap / Math.max(1e-6, ledBaseMax(state)));
    }
    scale = (state.config && state.config.ledDisplayScale) ? state.config.ledDisplayScale : (169 / 140);
    disp = cruiseLed * scale;

    if (phase === "accel666") {
      state.winCenterBlend = 0;
      state.winPlayerAlpha = 1;
      state.winRideAhead = 0;
      if (disp >= 665.5 || cruiseLed >= madCap - 0.5) {
        state.madMaxUnlocked666 = true;
        state.winPhase = "centerY";
        phase = "centerY";
        state.eventText = "666";
        state.eventTimer = 1.2;
      }
    }

    if (phase === "centerY") {
      // sega30: winAscentSlowMult (3.5) — centerY rise slower
      var ascentSlow = (state.config && state.config.winAscentSlowMult != null)
        ? state.config.winAscentSlowMult : 3.5;
      state.winCenterBlend = Math.min(1, (state.winCenterBlend || 0) + dt * 0.85 / Math.max(0.01, ascentSlow));
      state.winPlayerAlpha = 1;
      state.winRideAhead = 0;
      // Hold near 666 while rising to mid-screen
      if (ledSpeed(state) < madCap - 1) {
        state.speed = Util.accelerate(state.speed, accelEff * 1.2, dt);
      }
      if (state.winCenterBlend >= 0.98) {
        state.winCenterBlend = 1;
        state.winPhase = "horizon";
        phase = "horizon";
      }
    }

    if (phase === "horizon") {
      state.winCenterBlend = 1;
      if (state.winRideAhead == null) { state.winRideAhead = 0; }
      // sega30: win vanish × winVanishSlowMult (3.5)
      var vanishSlow = (state.config && state.config.winVanishSlowMult != null)
        ? state.config.winVanishSlowMult : 3.5;
      state.winRideAhead += dt * Math.max(state.speed, state.maxSpeed * 0.9) * 1.15 / Math.max(0.01, vanishSlow);
      // Fade as distance grows
      var fadeT = Util.limit(state.winRideAhead / (state.segmentLength * 140), 0, 1);
      state.winPlayerAlpha = Math.max(0, 1 - Util.easeIn(0, 1, fadeT));
      state.winRideProgress = fadeT;
      if (fadeT >= 0.98 || state.winPlayerAlpha <= 0.02) {
        state.winPlayerAlpha = 0;
        state.winPhase = "done";
        state.winSequenceDone = true;
        phase = "done";
      }
    }

    if (phase === "done") {
      state.winSequenceDone = true;
      state.winPlayerAlpha = 0;
    }

    speedPercent = state.speed / Math.max(1e-6, state.maxSpeed);
    state.playerX -= (dt * speedPercent * playerSegment.curve * state.centrifugal * 0.2);
    snapLane(state, dt * 0.5);
    state.playerX = Util.limit(state.playerX, -1.2, 1.2);
    var travel = (state.position - startPosition) / state.segmentLength;
    var curveLean = playerSegment.curve * 0.35;
    state.skyOffset = Util.increase(state.skyOffset, state.skySpeed * (travel + curveLean), 1);
    state.hillOffset = Util.increase(state.hillOffset, state.hillSpeed * (travel + curveLean), 1);
    state.treeOffset = Util.increase(state.treeOffset, state.treeSpeed * (travel + curveLean), 1);
    if (ns.Fx && ns.Fx.update) {
      ns.Fx.update(state, dt);
    }
    updateScoring(state, dt);
    maybeEndWithSong(state);
  }

  function updateFinaleTick(state, dt) {
    // Music keeps playing; freeze driving but advance section/finale/lyrics timers
    state.elapsed += dt;
    if (ns.Sega31 && ns.Sega31.updateElevation) {
      ns.Sega31.updateElevation(state, dt);
    }
    if (state.phase === "running" || state.phase === "countdown") {
      state.runElapsedSinceStart = (state.runElapsedSinceStart || 0) + dt;
    }
    if (state._pendingUnavoidableZap) {
      state._pendingUnavoidableZap = false;
      state._zapHit = true;
      applyDamage(state, (state.config.brains && state.config.brains.zapDamage) || 30);
      state.shockFlash = Math.max(state.shockFlash || 0, 0.9 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1));
    }
    if (ns.Sections && ns.Sections.update) {
      ns.Sections.update(state, dt);
    }
    if (ns.Fx && ns.Fx.update) {
      ns.Fx.update(state, dt);
    }
    maybeEndWithSong(state);
  }

  function syncSongClock(state) {
    var music = Dom.get("music");
    if (music && !isNaN(music.currentTime)) {
      state.songClock = music.currentTime;
      // sega41: if song stalled after START, keep kicking play() so tunnel/mouth clocks advance
      if ((state.phase === "running" || state.phase === "countdown") && music.paused && !music.ended) {
        var userMuted = false;
        try {
          userMuted = (Dom.storage.muted === "true") || (localStorage.getItem("brainwatch_ffyl_music_muted") === "true");
        } catch (eUm) {}
        if (!userMuted) {
          try { music.play().catch(function() {}); } catch (eKp) {}
        }
      }
    } else if (state.songClock == null) {
      state.songClock = 0;
    }
  }

  function updateMadMaxFlash(state, dt) {
    if (state.madMaxFlashTimer > 0) {
      state.madMaxFlashTimer -= dt;
      if (state.madMaxFlashTimer <= 0) {
        state.madMaxFlashTimer = 0;
        state.madMaxFlashText = "";
      }
    }
  }

  function updateSectionTitleBanner(state, dt) {
    if (!state.sectionTitleText) return;
    state.sectionTitleAge = (state.sectionTitleAge || 0) + dt;
    var dur = state.sectionTitleDuration != null ? state.sectionTitleDuration : 3;
    var fade = state.sectionTitleFade != null ? state.sectionTitleFade : 0.5;
    if (state.sectionTitleAge >= dur + fade) {
      state.sectionTitleText = "";
      state.sectionTitleAge = 0;
    }
  }

  function update(state, dt) {
    syncSongClock(state);
    updateMadMaxFlash(state, dt);
    updateSectionTitleBanner(state, dt);
    updateTransitions(state, dt);
    if (state.phase === "menu" || state.phase === "gameover") {
      tickMenuMusic(state);
      // After RUN COMPLETE, wait until audio finishes before looping bars 1–8
      if (state.phase === "gameover" && state._waitingSongEndForLoop) {
        var m = Dom.get("music");
        if (m && (m.ended || (!isNaN(m.currentTime) && m.duration && isFinite(m.duration) && m.currentTime >= m.duration - 0.05))) {
          state._waitingSongEndForLoop = false;
          onSongFullyFinished(state);
        }
      }
    }
    if (state.phase === "running") {
      if (state.finaleMode === "winCruise") {
        updateWinCruise(state, dt);
      } else if (finaleFreezesDriving(state)) {
        updateFinaleTick(state, dt);
      } else {
        // Includes finaleMode === "fight" — player still drives / taps brains
        updateRun(state, dt);
      }
    } else if (ns.Fx && ns.Fx.update) {
      ns.Fx.update(state, dt);
    }
  }

  ns.Gameplay = {
    update: update,
    startRun: startRun,
    restartRun: restartRun,
    returnToMenu: returnToMenu,
    bossCrawlInternalSpeed: bossCrawlInternalSpeed,
    respawnRoadSpeed: respawnRoadSpeed,
    unmuteMenuMusicAudible: unmuteMenuMusicAudible,
    insertToken: insertToken,
    avgSpeedForDisplay: avgSpeedForDisplay,
    forceZapHit: function(state) {
      state._zapHit = true;
      var dmg = (state.config && state.config.brains && state.config.brains.zapDamage) || 30;
      applyDamage(state, dmg);
      state.shockFlash = Math.max(state.shockFlash || 0, 0.85 * ((state.config && state.config.zapHitShakeMult != null) ? state.config.zapHitShakeMult : 1));
    },
    togglePause: togglePause,
    setLane: setLane,
    nudgeLane: nudgeLane,
    finishSong: finishSong,
    applyDamageExternal: applyDamage,
    computeFinalScore: computeFinalScore,
    ensureMenuMusic: ensureMenuMusic,
    armTitleMenuMusic: armTitleMenuMusic,
    tickMenuMusic: tickMenuMusic,
    onSongFullyFinished: onSongFullyFinished,
    finaleFreezesDriving: finaleFreezesDriving,
    beginFinaleHardLose: beginFinaleHardLose,
    startBossDefeatBeat: startBossDefeatBeat,
    MENU_LOOP_END: MENU_LOOP_END
  };
})(window.ApexRacer = window.ApexRacer || {});
