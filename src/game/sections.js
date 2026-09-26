(function(ns) {
  // Scripted song sections driven by audio.currentTime
  // Brains persist across sections unless clearBrains is set.
  // Dropdown catalogs (editor + runtime)
  var PSYCH_STYLES = ["", "neonBlood", "diamondVoid", "laneFreak", "acidRain", "chromeStrobe", "voidPulse"];
  var BG_STYLES = ["dusk", "night", "ember", "violet", "storm", "acid", "filmic", "racer"];
  var SECTIONS = [
    {
      id: "tutorial", start: 0, end: 8,
      traffic: false, brains: false, corpses: false, pickups: true,
      psych: false, psychStyle: "", bgStyle: "dusk", night: false,
      instruction: "howto",
      scriptedTutorial: true
    },
    {
      id: "verse1", start: 8, end: 40,
      traffic: true, brains: false, corpses: false, pickups: true,
      psych: false, psychStyle: "", bgStyle: "ember", night: false
    },
    {
      id: "holding", start: 40, end: 59,
      traffic: false, brains: true, corpses: false, pickups: true,
      psych: false, psychStyle: "", bgStyle: "filmic", night: false, brainsOnly: true,
      instruction: "brains", brainRamp: true,
      clearTraffic: true
    },
    {
      id: "chorus1", start: 59, end: 90,
      traffic: true, brains: true, corpses: false, pickups: true,
      psych: true, psychStyle: "neonBlood", bgStyle: "acid", night: false
    },
    {
      id: "bridge", start: 90, end: 96,
      traffic: false, brains: false, corpses: false, pickups: true,
      psych: false, psychStyle: "", bgStyle: "racer", night: false,
      clearBrains: true, clearTraffic: true, pauseZaps: true
    },
    {
      id: "verse2", start: 96, end: 111,
      traffic: false, brains: false, corpses: false, pickups: true,
      psych: false, psychStyle: "", bgStyle: "night", night: true,
      clearTraffic: true
    },
    {
      id: "applause", start: 111, end: 120.5,
      traffic: false, brains: true, corpses: false, pickups: true,
      psych: true, psychStyle: "acidRain", bgStyle: "storm", night: true,
      spawnBrainsBurst: 7
    },
    {
      id: "diamond2", start: 120.5, end: 155,
      traffic: true, brains: true, corpses: false, pickups: true,
      psych: true, psychStyle: "diamondVoid", bgStyle: "violet", night: true
    },
    {
      id: "chorus2", start: 155, end: 190,
      traffic: true, brains: true, corpses: false, pickups: true,
      psych: true, psychStyle: "laneFreak", bgStyle: "ember", night: true,
      laneSwap: true
    },
    {
      id: "finale", start: 190, end: 999,
      traffic: false, brains: false, corpses: false, pickups: false,
      psych: false, psychStyle: "", bgStyle: "dusk", night: true,
      finale: true, clearTraffic: true
    }
  ];

  // LOSING storyboard — only if player fails the finale fight before "You've got the power!"
  var STORYBOARD = [
    { t: 215.96, key: "power" },
    { t: 217.9, key: "scream" },
    { t: 219.76, key: "fight" }  // last card; RUN COMPLETE at 223.76 (4s later) on lose path
  ];

  // Sax reel: during fight it plays as flat full-bleed BACKGROUND under road/sprites (not karaoke takeover)
  var SAX_VIDEO = { start: 120.5, end: 155, src: "videos/sax-before-power.mp4?v=sega30", background: true }; // sega31x: 2nd hold / Mad Max

  var FINALE_FIGHT_START = 185.22; // sega31: bossStartEarlierSec 8
  var FINALE_FIGHT_DEADLINE = 215.96; // "You've got the power!"
  var FINALE_SONG_END = 243;         // win cruise lands near real audio end
  var FINALE_LOSE_END = 223.76;      // lose storyboard → RUN COMPLETE
  var MAD_MAX_START = 120.5;         // diamond2 / 2nd holding-on
  var MAD_MAX_END = 156.0;           // sega31m: clear before nuke flash 155 / blast 156.5

  function songTime(state) {
    // Single song-start clock: audio.currentTime (mirrored on state.songClock)
    if (state && state.songClock != null && !isNaN(state.songClock)) {
      return state.songClock;
    }
    var music = Dom.get("music");
    if (music && !isNaN(music.currentTime)) {
      return music.currentTime;
    }
    return state.elapsed || 0;
  }

  function sectionAt(t) {
    var n;
    for (n = 0; n < SECTIONS.length; n++) {
      if (t >= SECTIONS[n].start && t < SECTIONS[n].end) {
        return SECTIONS[n];
      }
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  function clearTraffic(state) {
    var n;
    if (!state.segments) {
      return;
    }
    // sega31o: never pop-despawn — coast/decel so player passes, unless hardReset
    var coastOn = !(state.config && state.config.cybercabCoastOff === false);
    if (coastOn && state.cars && state.cars.length && !state._hardClearTraffic) {
      for (n = 0; n < state.cars.length; n++) {
        if (state.cars[n]) {
          state.cars[n].coasting = true;
          state.cars[n].coastT = 0;
        }
      }
      return;
    }
    for (n = 0; n < state.segments.length; n++) {
      state.segments[n].cars = [];
    }
    state.cars = [];
  }

  function clearBrains(state) {
    // sega31o: shrink into distance instead of instant vanish
    var shrinkOn = !(state.config && state.config.brainExitShrink === false);
    if (shrinkOn && state.brains && state.brains.length && !state._hardClearBrains) {
      var n, b;
      for (n = 0; n < state.brains.length; n++) {
        b = state.brains[n];
        if (!b) continue;
        if (b.bossDying) continue; // let boss death anim finish
        b.exitShrink = true;
        b.exitShrinkT = 0;
        b.exitShrinkDur = (state.config && state.config.brainExitShrinkSec != null)
          ? state.config.brainExitShrinkSec : 0.85;
        b.alive = true; // keep drawing while shrinking
        b.vx = (b.vx || 0) * 0.3;
      }
      state.shots = [];
      state.lightningBolts = [];
      state.scorchMarks = [];
      state.shockFlash = 0;
      state.brainSpawnTimer = 0;
      return;
    }
    state.brains = [];
    state.shots = [];
    state.lightningBolts = [];
    state.scorchMarks = [];
    state.shockFlash = 0;
    state.brainSpawnTimer = 0;
  }

  function spawnAheadCar(state, lane, segmentsAhead, sprite) {
    if (!state.trackLength || !state.segments || !state.segments.length) {
      return null;
    }
    var offsets = state.config.laneOffsets;
    var z = Util.increase(state.position + state.playerZ, state.segmentLength * segmentsAhead, state.trackLength);
    var car = {
      offset: offsets[lane] + (Math.random() - 0.5) * 0.04,
      z: z,
      sprite: sprite || Util.randomChoice(SPRITES.CARS),
      speed: state.maxSpeed * (0.22 + Math.random() * 0.12),
      percent: 0,
      lastRelativeZ: null,
      lane: lane,
      tutorial: true
    };
    var segment = ns.Track.findSegment(state, car.z);
    segment.cars.push(car);
    state.cars.push(car);
    return car;
  }

  function spawnTutorialCars(state) {
    var sprites = SPRITES.CARS;
    // Exactly 3 cybercab/car enemies staggered ahead for practice
    spawnAheadCar(state, 1, 28, sprites[0]);
    spawnAheadCar(state, 0, 48, sprites[1] || sprites[0]);
    spawnAheadCar(state, 1, 70, sprites[2] || sprites[0]);
    state._tutorialCarsSpawned = true;
    state._tutorialCarCount = 3;
  }


  // sega33: absolute lane X = modest screen-fraction offset (NOT roadWidth projection).
  // sega32 roadWidth*nearScale flung hearts off-screen / outside catch; playerDrawX is always center.
  // sega45 I: hearts land on her HEAD. X = her drawn X + (lane distance from her tweened playerX) x
  // heartLaneGapFrac*width. Heart in her lane → exactly her drawn X (falls straight onto her head);
  // heart in the other lane sits one lane-gap over and slides onto her head as she switches lanes.
  // Lane-gated catch unchanged (same formula for her lane → dx = 0).
  function heartLaneScreenX(state, lane) {
    var c = state.config || {};
    var width = state.width || 640;
    var offsets = c.laneOffsets || [-0.55, 0.55];
    var laneIdx = (lane != null) ? (lane | 0) : 0;
    var laneOff = (offsets[laneIdx] != null) ? offsets[laneIdx] : (laneIdx === 0 ? -0.55 : 0.55);
    var span = Math.abs(offsets[offsets.length - 1] - offsets[0]) || 1.1;
    var playerX = (state.playerX != null) ? state.playerX : 0;
    var gap = (c.heartLaneGapFrac != null ? c.heartLaneGapFrac : 0.36) * width;
    var drawX = (state._playerDrawDestX != null) ? state._playerDrawDestX : width / 2;
    return drawX + ((laneOff - playerX) / span) * gap;
  }

  function songNow(state) {
    var t = state.songClock;
    if (t == null && state.audio && state.audio.currentTime != null) t = state.audio.currentTime;
    return t == null ? 0 : t;
  }

  // sega45 F: no hearts from (freeze - tunnelNoHeartsLeadSec) = 81.5 through the tunnel end (white-out).
  // Spawns stop tunnelHeartTravelSec earlier so none are still falling at 81.5.
  function tunnelNoHeartsWindow(state) {
    var c = state.config || {};
    if (c.tunnelApproachEnabled === false || !(ns.Sega31x && ns.Sega31x.tunnelTimes)) return null;
    var tt = ns.Sega31x.tunnelTimes(state);
    var lead = c.tunnelNoHeartsLeadSec != null ? c.tunnelNoHeartsLeadSec : 3.0;
    var travel = c.tunnelHeartTravelSec != null ? c.tunnelHeartTravelSec : 2.2;
    var end = tt.whiteEnd != null ? tt.whiteEnd : tt.restore;
    return { spawnStop: tt.freeze - lead - travel, clearAt: tt.freeze - lead, end: end };
  }

  function heartsBlockedByBossFight(state, opts) {
    opts = opts || {};
    if (opts.allowBossFight || opts.tutorialBurst || opts.forceSpawn) return false;
    var c = state.config || {};
    if (c.clearHeartsOnBossFight === false || c.bossFightNoHearts === false) return false;
    if (state.finaleFight || state.finaleMode === "fight") return true;
    return false;
  }

  function heartsBlockedByMadMax(state, opts) {
    opts = opts || {};
    // Tutorial burst / explicit allow bypass (tutorial is outside Mad Max window anyway)
    if (opts.allowMadMax || opts.tutorialBurst || opts.forceSpawn) return false;
    // postBossHearts bypass removed — noHeartsOnWinCruise supersedes sega31s generous hearts
    var c = state.config || {};
    if (c.madMaxNoHearts === false || c.noHeartsDuringMadMax === false) return false;
    if (c.madMaxNoHearts || c.noHeartsDuringMadMax || c.madMaxNoHearts == null) {
      if (state.madMaxMode) return true;
      var mm = c.madMax || {};
      var startT = mm.start != null ? mm.start : 120.5;
      var endT = mm.end != null ? mm.end : 156.0;
      var t = state.songClock;
      if (t == null && state.audio && state.audio.currentTime != null) t = state.audio.currentTime;
      if (t != null && t >= startT && t < endT) return true;
    }
    return false;
  }

  function heartsBlockedByTunnel(state, opts) {
    opts = opts || {};
    if (opts.allowTunnel || opts.tutorialBurst) return false;
    var c = state.config || {};
    // sega37: no hearts while inTunnel / enter→exit phases unless tunnelHeartsEnabled=true
    if (c.tunnelHeartsEnabled === true) return false;
    var win = tunnelNoHeartsWindow(state);
    if (win) {
      var tn = songNow(state);
      if (tn >= win.spawnStop && tn < win.end) return true;
    }
    if (state.inTunnel) return true;
    var phase = state._tunnelPhase;
    if (phase === 'blackIn' || phase === 'inside' || phase === 'shrinkOut' || phase === 'blackOut') return true;
    return false;
  }

    function heartsBlockedByWinCruise(state, opts) {
    opts = opts || {};
    if (opts.allowWinCruise || opts.tutorialBurst) return false;
    var c = state.config || {};
    // sega31x: winHeartDropPerSec path supersedes noHeartsOnWinCruise for win collect phase
    if (c.winHeartDropPerSec != null && c.winHeartDropPerSec > 0) {
      if (state.finaleMode === "winCruise" || state.finaleWon) {
        var ascending = state.winPhase === "centerY" || state.winPhase === "horizon" || state.winPhase === "done";
        if (c.winHeartDropUntilAscent !== false && ascending) return true;
        return false; // allow hearts until ascent
      }
    }
    // SUPERSEDES sega31s postBossGenerousHearts during YOU WIN / takeoff
    if (c.noHeartsOnWinCruise === false && c.noHeartsOnWinTakeoff === false) return false;
    if (c.noHeartsOnWinCruise !== false || c.noHeartsOnWinTakeoff !== false || c.postBossGenerousHearts === false) {
      if (state.finaleMode === "winCruise" || state.finaleWon || state.winBanner) return true;
      if (state.winPhase) return true;
    }
    return false;
  }

  function clearFallingHearts(state) {
    state.pickups = [];
    state._tier3HeartBurst = 0;
    state.postBossHearts = false;
    state.sectionPickups = false;
  }

  function spawnPickup(state, opts) {
    opts = opts || {};
    // queued: no new hearts during Protect / boss fight (existing cleared at beginFinaleFight)
    if (heartsBlockedByBossFight(state, opts)) {
      return;
    }
    // no hearts during YOU WIN / winCruise / end takeoff (supersedes sega31s postBoss hearts)
    if (heartsBlockedByWinCruise(state, opts)) {
      return;
    }
    // sega31p: no new hearts during MAD MAX (existing falling hearts OK)
    if (heartsBlockedByMadMax(state, opts)) {
      return;
    }
    // sega37: no new hearts in tunnel unless tunnelHeartsEnabled
    if (heartsBlockedByTunnel(state, opts)) {
      return;
    }
    // sega45 H: first hearts at firstHeartsAtSec (8 s)
    var firstHearts = (state.config && state.config.firstHeartsAtSec != null) ? state.config.firstHeartsAtSec : 8;
    if (!opts.allowWinCruise && songNow(state) < firstHearts) {
      return;
    }
    if (!SPRITES.LIFE) {
      return; // never fall through to car sprites
    }
    // sega41: never spawn centered over player — absolute random L/R (or explicit forceLane)
    var lane;
    if (opts.forceLane != null) {
      lane = opts.forceLane;
    } else {
      lane = (Math.random() < 0.5 ? 0 : 1);
    }
    // Guard: if someone passed forceLane === player with "center" intent, still keep L/R
    if (opts.forceCenter === true) {
      lane = (Math.random() < 0.5 ? 0 : 1);
    }
    var lifeSprite = SPRITES.LIFE;
    var c = state.config || {};
    var sky = c.heartDropFromSky !== false;
    var topSpawn = c.heartSpawnAtTopOfScreen !== false || c.heartSpawnForegroundAbovePlayer !== false;
    var startScale = c.heartDropSpawnScaleMult != null ? c.heartDropSpawnScaleMult : 3.75;
    var spawnY = c.heartSpawnScreenY != null ? c.heartSpawnScreenY : 0.02;
    // sega31d: hearts spawn at TOP of screen (foreground), fall with gravity — not road horizon
    var item = {
      z: state.position || 0,
      offset: (state.config.laneOffsets && state.config.laneOffsets[lane] != null) ? state.config.laneOffsets[lane] : (lane === 0 ? -0.55 : 0.55),
      lane: lane,
      sprite: lifeSprite,
      percent: 0,
      kind: "life",
      taken: false,
      isPickup: true,
      notCar: true,
      skyDrop: sky,
      screenSpace: !!topSpawn,
      skyScale: startScale,
      skyLinger: c.heartDropLingerSec != null ? c.heartDropLingerSec : 1,
      skyAge: 0,
      skyY: spawnY,
      // sega31j: X from laneOffsets vs player — shifts with road on lane change
      screenX: heartLaneScreenX(state, lane),
      screenY: state.height * spawnY,
      vy: c.heartDropInitialVy != null ? c.heartDropInitialVy : 0,
      gravity: c.heartDropGravityAccel != null ? c.heartDropGravityAccel : 1800
    };
    state.pickups.push(item);
    var cap = state._tier3HeartBurst ? 14 : 8;
    if (state._tier3HeartBurst) state._tier3HeartBurst -= 1;
    if (state.pickups.length > cap) {
      state.pickups.shift();
    }
    return item;
  }

  function spawnSkyHeart(state, opts) {
    return spawnPickup(state, opts || {});
  }

  function spawnCorpse(state) {
    if (!state.trackLength || !SPRITES.CORPSE) {
      return;
    }
    var lane = Math.random() < 0.5 ? 0 : 1;
    var ahead = state.position + state.segmentLength * (40 + Math.random() * 80);
    var z = ahead % state.trackLength;
    state.corpses.push({
      z: z,
      offset: state.config.laneOffsets[lane] + (Math.random() - 0.5) * 0.15,
      lane: lane,
      sprite: SPRITES.CORPSE,
      percent: 0,
      harmless: true
    });
    if (state.corpses.length > 40) {
      state.corpses.shift();
    }
  }

  function collectLife(state, item) {
    var combat = (state.config && state.config.combat) ? state.config.combat : {};
    var step = combat.weaponPowerPerPickup != null ? combat.weaponPowerPerPickup : 8;
    var cap = combat.weaponPowerMax != null ? combat.weaponPowerMax : 100;
    state.weaponPower = Math.min(cap, (state.weaponPower || 0) + step);
    state.powerups = (state.powerups || 0) + 1;
    state.health = Math.min(state.config.maxHealth, state.health + 28);
    state.eventText = "POWER +" + step + " (" + state.weaponPower + ")";
    state.eventTimer = state.config.eventFeedDuration;
    // sega31q: NEVER screen-flash on heart (damageFlash/shockFlash/explosionFlash = damage only)
    if (!(state.config && state.config.noScreenFlashOnHeartCollect === false)) {
      // do not raise any full-screen flash channels on collect
      state._suppressHeartScreenFlash = true;
    }
    // sega31d: cute pickup burst ONLY on heart collect (local particles; no screen wash)
    if (ns.Fx && ns.Fx.spawnExplosion) {
      var fxX = (item && item.screenX != null) ? item.screenX : state.width / 2;
      var fxY = (item && item.screenY != null) ? item.screenY : state.height * 0.7;
      // sega40: re-home catch FX to player HEAD (not lane X on vehicle side)
      if (state.config && state.config.heartCatchFxAtPlayerHead) {
        var _w = state.width || 640;
        var _h = state.height || 720;
        var feetY = (state._playerDrawDestY != null)
          ? state._playerDrawDestY
          : ((state.playerElevScreenY != null ? state.playerElevScreenY : 0.78) * _h);
        var drawH = state._playerDrawH || (_h * 0.14);
        var headOf = (state.config.heartCatchHeadOfPlayerDrawH != null)
          ? state.config.heartCatchHeadOfPlayerDrawH : 0.90;
        var offX = state.config.heartCatchOffsetXFrac != null ? state.config.heartCatchOffsetXFrac : 0;
        var offY = state.config.heartCatchOffsetYFrac != null ? state.config.heartCatchOffsetYFrac : 0;
        fxX = (state._playerDrawDestX != null ? state._playerDrawDestX : _w / 2) + offX * _w;
        fxY = (feetY - headOf * drawH) + offY * _h;
      }
      state._heartCollectFx = true;
      ns.Fx.spawnExplosion(state, fxX, fxY, "pickup");
      state._heartCollectFx = false;
      state._suppressHeartScreenFlash = false;
    } else {
      state._suppressHeartScreenFlash = false;
    }
    if (ns.Sfx) {
      ns.Sfx.life();
    }
    if (ns.Sega31 && ns.Sega31.onHeartCollected) {
      ns.Sega31.onHeartCollected(state);
    }
  }

  function updateCorpsesAndPickups(state, dt) {
    var n;
    var item;
    var playerW;
    var spriteW;
    var playerWorldZ;
    var dz;
    var track;

    if (state.sectionCorpses && !state.bodiesSmashed) {
      state.corpseSpawnTimer -= dt;
      if (state.corpseSpawnTimer <= 0) {
        spawnCorpse(state);
        state.corpseSpawnTimer = 1.4 + Math.random() * 1.8;
      }
    }

    if (state.sectionPickups) {
      state.pickupSpawnTimer -= dt;
      if (state.pickupSpawnTimer <= 0) {
        // sega31p: skip spawn while MAD MAX (timer still advances so we don't burst after)
        if (!heartsBlockedByMadMax(state)) {
          spawnPickup(state);
        }
        var interval = 9 + Math.random() * 8;
        // sega31k: heartSpawnRateMult (5× → interval ÷5)
        var rateMult = (state.config && state.config.heartSpawnRateMult != null)
          ? state.config.heartSpawnRateMult : 1;
        // sega31s: even more generous after boss
        if (state.postBossHearts && state.config && state.config.postBossHeartSpawnRateMult != null) {
          rateMult *= state.config.postBossHeartSpawnRateMult;
        }
        if (rateMult > 0) interval = interval / rateMult;
        // sega31o: lane-swap section hearts × laneSwapHeartMult ON TOP of global ×5
        if (state.trafficLaneSwap) {
          var lsMult = (state.config && state.config.laneSwapHeartMult != null)
            ? state.config.laneSwapHeartMult : 2.5;
          interval = interval / Math.max(0.5, lsMult);
        }
        // sega29: pre-boss window hearts × preBossHeartMult (stacks with laneSwap)
        if (state.preBossWindow) {
          var hMult = (state.config && state.config.preBossHeartMult != null)
            ? state.config.preBossHeartMult : 2.0;
          interval = interval / Math.max(0.5, hMult);
        }
        state.pickupSpawnTimer = interval;
      }
    }

    for (n = 0; n < state.corpses.length; n++) {
      item = state.corpses[n];
      item.percent = Util.percentRemaining(item.z, state.segmentLength);
    }

    // sega45 F: from 81.5 through the tunnel end, any leftover heart fades out silently
    var noHw = tunnelNoHeartsWindow(state);
    if (noHw && !(state.config && state.config.tunnelHeartsEnabled === true)) {
      var tnw = songNow(state);
      if (tnw >= noHw.clearAt && tnw < noHw.end) {
        for (n = 0; n < state.pickups.length; n++) {
          if (!state.pickups[n].missFading) { state.pickups[n].missFading = true; state.pickups[n].missFade = 1; }
        }
      }
    }
    var playerScale = state.config.spriteScalePlayer != null ? state.config.spriteScalePlayer : 1.5;
    var pickupScale = state.config.spriteScalePickups != null ? state.config.spriteScalePickups : 2.8;
    playerW = SPRITES.PLAYER_STRAIGHT.w * SPRITES.SCALE * playerScale;
    playerWorldZ = Util.increase(state.position, state.playerZ, state.trackLength);
    track = state.trackLength;

    for (n = state.pickups.length - 1; n >= 0; n--) {
      item = state.pickups[n];
      if (item.taken) {
        state.pickups.splice(n, 1);
        continue;
      }
      // sega31d/j: screen-space hearts — lane-locked; X follows road; Y gravity fall
      if (item.screenSpace || item.skyDrop) {
        item.skyAge = (item.skyAge || 0) + dt;
        var linger = item.skyLinger != null ? item.skyLinger : 1;
        var startS = (state.config.heartDropSpawnScaleMult != null) ? state.config.heartDropSpawnScaleMult : 3.75;
        var playerScreenY = (state.playerElevScreenY != null ? state.playerElevScreenY : 0.78) * state.height;
        // keep world offset locked to spawn lane; screen X tracks road vs playerX
        var offsets = (state.config && state.config.laneOffsets) || [-0.55, 0.55];
        if (item.lane != null && offsets[item.lane] != null) {
          item.offset = offsets[item.lane];
        }
        item.screenX = heartLaneScreenX(state, item.lane);
        var spawnYFrac = (state.config.heartSpawnScreenY != null) ? state.config.heartSpawnScreenY : -0.08;
        var spawnYPx = state.height * spawnYFrac;
        var endS = (state.config.heartDropEndScaleMult != null) ? state.config.heartDropEndScaleMult : 0.25;
        if (item.skyAge < linger) {
          item.vy = 0;
          item.skyScale = startS;
          item.screenY = spawnYPx;
        } else {
          // accelerate downward like gravity
          var g = item.gravity != null ? item.gravity : 1800;
          item.vy = (item.vy || 0) + g * dt;
          item.screenY = (item.screenY != null ? item.screenY : spawnYPx) + item.vy * dt;
          // sega31k: shrink toward heartDropEndScaleMult (0.25) while falling
          var fallDist = Math.max(1, playerScreenY - spawnYPx);
          var fallT = Math.min(1, Math.max(0, (item.screenY - spawnYPx) / fallDist));
          item.skyScale = startS + (endS - startS) * fallT;
        }
        // Already ground-missing: silent fade only (no spawnExplosion / cute / fiery)
        var cMiss = state.config || {};
        if (item.missFading) {
          var fadeSec = cMiss.heartMissFadeSec != null ? cMiss.heartMissFadeSec : 0.35;
          if (cMiss.heartMissFade === false) fadeSec = 0;
          item.missFade = (item.missFade != null ? item.missFade : 1) - (fadeSec > 0 ? dt / fadeSec : 1);
          if (item.missFade <= 0 || item.screenY > state.height + 80) {
            state.pickups.splice(n, 1);
          }
          continue;
        }
        // despawn if past bottom — silent, no FX
        if (item.screenY > state.height + 80) {
          state.pickups.splice(n, 1);
          continue;
        }
        // lane-gated: must share player lane to collect/powerup
        var laneGated = !(state.config && (state.config.heartDropLaneGated === false || state.config.heartLaneGatedCatch === false));
        var canCollect = true;
        if (laneGated && item.lane != null && item.lane !== state.lane) {
          canCollect = false;
        }
        if (item.skyAge < linger * 0.5) canCollect = false;
        // sega41: catch origin = PLAYER LANE screen X (same formula as hearts).
        // Same lane → dx≈0 (must be under that L/R heart). Wrong lane → dx≈0.36W → miss.
        var heartR = 42 * (item.skyScale || 1) * (pickupScale / 3.15);
        var playerLane = state.lane != null ? state.lane : 0;
        var px = heartLaneScreenX(state, playerLane);
        var py = playerScreenY;
        var dx = (item.screenX != null ? item.screenX : px) - px;
        var dy = (item.screenY || 0) - py;
        var catchR = heartR + 56;
        var laneMatch = (!laneGated) || (item.lane == null) || (item.lane === state.lane);
        // Tight X: same-lane only. No 1.8× widen that let center-catch reach both lanes.
        var catchXMul = 1.15;
        var overlapping = laneMatch && (
          (dx * dx + dy * dy < catchR * catchR) ||
          (Math.abs(dy) < catchR && Math.abs(dx) < catchR * catchXMul)
        );
        if (canCollect && laneMatch && overlapping) {
          item.taken = true;
          collectLife(state, item); // keep cute pickup FX on successful catch only
          state.pickups.splice(n, 1);
          continue;
        }
        // Ground miss AFTER collect check: past ground / past player catch → fade, no FX
        var silentMiss = cMiss.heartGroundMissSilent !== false && cMiss.heartMissNoExplosion !== false;
        var groundFrac = cMiss.elevTier1ScreenY != null ? cMiss.elevTier1ScreenY : 0.99;
        var groundYPx = state.height * groundFrac;
        var missLine = Math.max(groundYPx, playerScreenY) + Math.max(40, catchR * 0.85);
        if (silentMiss && item.screenY > missLine) {
          item.missFading = true;
          item.missFade = 1;
          // no spawnExplosion / no cute burst / no fiery on miss
        }
        continue;
      }
      item.percent = Util.percentRemaining(item.z, state.segmentLength);
      dz = item.z - playerWorldZ;
      if (dz > track / 2) dz -= track;
      if (dz < -track / 2) dz += track;
      if (dz < -state.segmentLength * 2) {
        state.pickups.splice(n, 1);
        continue;
      }
      if (Math.abs(dz) < state.segmentLength * 1.5) {
        if (state.config && state.config.heartDropLaneGated !== false && item.lane != null && item.lane !== state.lane) {
          continue;
        }
        spriteW = item.sprite.w * SPRITES.SCALE * pickupScale * (item.skyScale || 1);
        if (Util.overlap(state.playerX, playerW, item.offset, spriteW, 0.55)) {
          item.taken = true;
          collectLife(state, item);
          state.pickups.splice(n, 1);
        }
      }
    }
  }

  function tutorialCarsCleared(state) {
    var n;
    var car;
    var playerWorldZ;
    var relative;
    var remaining = 0;
    if (!state._tutorialCarsSpawned) {
      return false;
    }
    playerWorldZ = Util.increase(state.position, state.playerZ, state.trackLength);
    for (n = 0; n < state.cars.length; n++) {
      car = state.cars[n];
      if (!car.tutorial) {
        continue;
      }
      relative = car.z - playerWorldZ;
      if (relative > state.trackLength / 2) relative -= state.trackLength;
      if (relative < -state.trackLength / 2) relative += state.trackLength;
      // still ahead or near
      if (relative > -state.segmentLength * 2) {
        remaining++;
      }
    }
    return remaining === 0;
  }

  function updateTutorial(state, dt, t) {
    // sega45 H: first cars at firstCarsAtSec (5 s), first hearts at firstHeartsAtSec (8 s)
    var firstCars = (state.config && state.config.firstCarsAtSec != null) ? state.config.firstCarsAtSec : 5;
    var firstHearts = (state.config && state.config.firstHeartsAtSec != null) ? state.config.firstHeartsAtSec : 8;
    if (!state._tutorialCarsSpawned && t >= firstCars) {
      spawnTutorialCars(state);
    }
    // sega27: verse1 starts at t=8; keep tutorial free of density traffic until then
    if (t >= Math.max(8, firstCars)) {
      state.sectionTraffic = true;
    }
    if (!state._tutorialPickupsSpawned) {
      var ready = (tutorialCarsCleared(state) || t >= 8) && t >= firstHearts;
      if (ready && state._tutorialCarsSpawned) {
        state._tutorialPickupsSpawned = true;
        state.sectionPickups = true;
        spawnPickup(state);
        spawnPickup(state);
        spawnPickup(state);
        state.pickupSpawnTimer = 6;
        state.eventText = "";
        state.eventTimer = 2.0;
      }
    }
  }

  function updateBrainPacing(state, sec, t) {
    // Finale fight pack is fixed (no respawns)
    if (state.finaleMode === "fight" || state.finaleFight) {
      state.brainMaxActive = 0;
      state.brainSpawnInterval = 99;
      return;
    }
    if (!sec.brains) {
      // sega31x: late verse1 first-brain window — allow 1 active, no continuous respawn
      var fbOn = !!(state.config && state.config.firstBrainEnabled !== false);
      var fbAt = (state.config && state.config.firstBrainAtSec != null) ? state.config.firstBrainAtSec : 27.0;
      if (fbOn && sec.id === "verse1" && t >= fbAt) {
        state.brainMaxActive = Math.max(1, state.brains ? state.brains.length : 0);
        state.brainSpawnInterval = 99; // Sega31x spawns the single medium once
        return;
      }
      // Do NOT wipe brains — only stop new spawns (unless clearBrains already ran)
      state.brainMaxActive = state.brains ? state.brains.length : 0;
      state.brainSpawnInterval = 99;
      return;
    }

    if (sec.brainRamp) {
      // holding on: start 1, then 2, then 3…
      var elapsed = Math.max(0, t - sec.start);
      var ramp = 1 + Math.floor(elapsed / 6);
      state.brainMaxActive = Math.min(4, ramp);
      state.brainSpawnInterval = 5.5;
      return;
    }

    if (sec.spawnBrainsBurst) {
      // Applause: hold at burst count; no gradual extras beyond burst
      state.brainMaxActive = Math.max(sec.spawnBrainsBurst, state.brains ? state.brains.length : 0);
      state.brainSpawnInterval = 99;
      return;
    }

    // chorus / diamond: allow a few active; persist unkilled
    state.brainMaxActive = Math.max(3, state.brains ? state.brains.length : 0);
    state.brainSpawnInterval = 6.5;
  }

  function applySection(state, sec, t) {
    var entered = state.sectionId !== sec.id;
    var inFight = state.finaleMode === "fight" || state.finaleFight;
    var inWin = state.finaleMode === "winCruise" || state.finaleWon;
    state.sectionId = sec.id;
    // winCruise may keep post-boss cars; hearts gated by noHeartsOnWinCruise
    if (inWin && state.postBossCars) {
      state.sectionTraffic = true;
    } else {
      state.sectionTraffic = inFight || inWin ? false : !!sec.traffic;
    }
    // sega40: 1st hold-on (holding) — enable traffic × holdingCarsTrafficMult when flagged
    if (!inFight && !inWin && sec.id === "holding" && state.config && state.config.holdingCarsEnabled) {
      state.sectionTraffic = true;
    }
    // Fight needs brain updates (zaps/shots) even though section catalog says brains:false
    // sega31x: late verse1 firstBrain window also keeps brains enabled
    var firstBrainOn = !!(state.config && state.config.firstBrainEnabled !== false);
    var firstAt = (state.config && state.config.firstBrainAtSec != null) ? state.config.firstBrainAtSec : 27.0;
    var lateVerse1Brains = firstBrainOn && sec.id === "verse1" && t >= firstAt;
    state.sectionBrains = inFight ? true : (!!sec.brains || lateVerse1Brains);
    state.sectionCorpses = !!sec.corpses;
    if (inWin && state.postBossHearts && !heartsBlockedByWinCruise(state)) {
      state.sectionPickups = true;
    } else {
      state.sectionPickups = inFight || inWin ? false : !!sec.pickups;
    }
    state.sectionBrainsOnly = !!sec.brainsOnly;
    state.psychMode = !!sec.psych;
    state.psychStyle = sec.psychStyle || (sec.psych ? "neonBlood" : null);
    state.bgStyle = sec.bgStyle || (sec.night ? "night" : "dusk");
    // Austin from start: rotate plate on section change (never filmic/racer non-Austin)
    // sega40: per-section pins (austinBgPlateBySection / verse1|chorus1AustinBgPlate) beat rotation
    (function applyAustinBgPlate() {
      var cfg = state.config || {};
      if (cfg.austinBgFromStart === false) return;
      var plates = cfg.austinBgPlates || ["dusk", "ember", "night", "violet", "storm", "acid"];
      if (!plates.length) return;
      var plate = state.austinBgPlate || plates[0] || "dusk";
      if (plates.indexOf(plate) < 0) plate = plates[0];
      var pinMap = cfg.austinBgPlateBySection || {};
      var pinned = pinMap[sec.id];
      if (!pinned && sec.id === "chorus1" && cfg.chorus1AustinBgPlate) pinned = cfg.chorus1AustinBgPlate;
      if (!pinned && sec.id === "verse1" && cfg.verse1AustinBgPlate) pinned = cfg.verse1AustinBgPlate;
      if (pinned && plates.indexOf(pinned) >= 0) {
        plate = pinned;
        // sega43: pinned real plate beats psych void (chorus1 psych faded Austin to 0 → stripes)
        if (cfg.austinBgPinSuppressesPsych !== false) {
          state.psychMode = false;
          state.psychStyle = null;
          state.worldFade = 1;
        }
      } else if (cfg.austinBgRotatePerSection && entered) {
        // Cycle dusk→ember→night→violet→storm→acid on each new part (applySection enter).
        var idx = plates.indexOf(plate);
        if (idx < 0) idx = 0;
        idx = (idx + 1) % plates.length;
        plate = plates[idx];
        state.austinSectionCount = (state.austinSectionCount || 0) + 1;
      }
      state.bgStyle = plate;
      state.austinBgPlate = plate;
    })();
    // Plate night flag follows bgStyle (night family) or legacy night / time gate
    if (state.bgStyle) {
      state.nightAustin = (state.bgStyle === "night" || state.bgStyle === "violet" || state.bgStyle === "storm" || state.bgStyle === "acid");
    } else if (typeof t === "number") {
      state.nightAustin = t >= 94.5;
    } else {
      state.nightAustin = !!sec.night;
    }
    state.trafficLaneSwap = !!sec.laneSwap;
    state.pauseZaps = !!sec.pauseZaps;
    state.instructionMode = sec.instruction || null;

    // sega29: 15s before finaleFight.start — force lane-swap cybercabs + hearts ×preBossHeartMult
    (function applyPreBossWindow() {
      var ff = fightCfg(state);
      var fightStart = ff.start != null ? ff.start : FINALE_FIGHT_START;
      var preSec = (state.config && state.config.preBossLaneSwapSec != null)
        ? state.config.preBossLaneSwapSec : 15;
      var inPre = (
        typeof t === "number" &&
        !state.finaleFight &&
        state.finaleMode !== "fight" &&
        !state.finaleWon &&
        !state.finaleLost &&
        t >= (fightStart - preSec) &&
        t < fightStart
      );
      state.preBossWindow = !!inPre;
      if (inPre) {
        state.trafficLaneSwap = true;
        state.sectionTraffic = true;
        state.sectionPickups = true;
      }
    })();

    if (!state.psychMode) {
      state.worldFade = 1;
    }

    if (entered) {
      state._clearedForSection = sec.id;

      // sega31w: synthwave section title banners on verse/chorus enter only
      (function startSectionTitleBanner() {
        var cfg = state.config || {};
        if (cfg.sectionTitleEnabled === false) return;
        var id = sec.id;
        if (id !== "verse1" && id !== "chorus1" && id !== "verse2" && id !== "chorus2") return;
        var labels = cfg.sectionTitleLabels || {};
        var label = labels[id];
        if (!label) {
          if (id === "verse1") label = cfg.sectionTitleLabelVerse1 || "FIRST VERSE";
          else if (id === "chorus1") label = cfg.sectionTitleLabelChorus1 || "CHORUS";
          else if (id === "verse2") label = cfg.sectionTitleLabelVerse2 || "SECOND VERSE";
          else if (id === "chorus2") label = cfg.sectionTitleLabelChorus2 || "CHORUS";
        }
        if (!label) return;
        var dur = cfg.sectionTitleDurationSec != null ? cfg.sectionTitleDurationSec : 3.0;
        var fade = cfg.sectionTitleFadeSec != null ? cfg.sectionTitleFadeSec : 0.5;
        state.sectionTitleText = String(label);
        state.sectionTitleAge = 0;
        state.sectionTitleDuration = dur;
        state.sectionTitleFade = fade;
      })();

      if (sec.clearTraffic && !state.preBossWindow) {
        // sega40: keep cars when holdingCarsEnabled on holding section
        if (!(sec.id === "holding" && state.config && state.config.holdingCarsEnabled)) {
          clearTraffic(state);
        }
      }
      if (sec.clearBrains) {
        clearBrains(state);
      }

      if (sec.spawnBrainsBurst && !state._burstForSection) {
        state._burstForSection = sec.id;
        var need = sec.spawnBrainsBurst - (state.brains ? state.brains.length : 0);
        var i;
        if (need > 0 && ns.Brains && ns.Brains.spawnBrain) {
          for (i = 0; i < need; i++) {
            ns.Brains.spawnBrain(state, { fastGrow: true, burst: true });
          }
        }
        state.eventText = "";
        state.eventTimer = 2.4;
      }

      if (sec.instruction === "brains") {
        state.eventText = "";
        state.eventTimer = 3.2;
      }

      if (sec.finale && !state.finaleMode && !state.finaleWon && !state.finaleLost &&
          state.phase !== "gameover" && !state.songEnded) {
        // sega19: no blackout/karaoke — stay visible until boss at Protect
        state.instructionMode = null;
        state.eventText = "";
        state.eventTimer = 0;
        // sega29: keep cybercabs during pre-boss window (~178–193)
        if (!state.preBossWindow) {
          clearTraffic(state);
          state.sectionTraffic = false;
        }
      }
    }

    updateBrainPacing(state, sec, t);
  }

  function fightCfg(state) {
    return (state.config && state.config.finaleFight) ? state.config.finaleFight : {
      start: FINALE_FIGHT_START,
      deadline: FINALE_FIGHT_DEADLINE,
      songEnd: FINALE_SONG_END,
      loseStoryboardEnd: FINALE_LOSE_END
    };
  }

  function beginFinaleFight(state, t) {
    state.finaleMode = "fight";
    state.finaleFight = true;
    state.finaleWon = false;
    state.finaleLost = false;
    state.finaleStoryboard = null;
    state.instructionMode = null;
    state.pauseZaps = false;
    state.sectionTraffic = false;
    state.sectionPickups = false;
    state.bossApproach = true;
    state.bossPhase = "approach";
    state.bossZapCount = 0;
    state.bossMediumsSpawned = false;
    state.bossTiniesSpawned = false;
    state.mediumZapElapsed = 0;
    // queued: clear all sky hearts / pickups when Protect / boss fight starts
    if (!(state.config && state.config.clearHeartsOnBossFight === false)) {
      state.pickups = [];
      state._tier3HeartBurst = 0;
    }
    clearTraffic(state);
    if (ns.Brains && ns.Brains.spawnFinaleBoss) {
      ns.Brains.spawnFinaleBoss(state);
    } else if (ns.Brains && ns.Brains.spawnFinaleFightPack) {
      ns.Brains.spawnFinaleFightPack(state);
    }
    state.eventText = "BOSS INCOMING";
    state.eventTimer = 2.4;
    state.saxBgActive = false;
  }

  function beginFinaleLoseStoryboard(state, t) {
    // Failed to clear brains before power lyric — existing art cards are the LOSING path
    state.finaleMode = "karaoke";
    state.finaleFight = false;
    state.finaleLost = true;
    state.finaleWon = false;
    state.saxBgActive = false;
    clearBrains(state);
    clearTraffic(state);
    state.sectionBrains = false;
    state.brainMaxActive = 0;
  }

  function beginFinaleWinCruise(state, t) {
    state.finaleMode = "winCruise";
    state.finaleFight = false;
    state.finaleWon = true;
    state.finaleLost = false;
    state.finaleStoryboard = null;
    state.saxBgActive = false;
    state.winBanner = "WELL DONE. YOU WIN!";
    // sega31x: winNoCars + winHeartDrop supersede postBossCars / noHeartsOnWinCruise
    var cWin = state.config || {};
    state.sectionBrains = false;
    var winHeartsOn = (cWin.winHeartDropPerSec != null && cWin.winHeartDropPerSec > 0);
    var allowWinHearts = winHeartsOn || (cWin.noHeartsOnWinCruise === false && cWin.noHeartsOnWinTakeoff === false &&
      cWin.postBossGenerousHearts !== false);
    state.sectionPickups = !!allowWinHearts;
    var noCars = cWin.winNoCars !== false;
    state.sectionTraffic = noCars ? false : (cWin.postBossCarsFromHorizon !== false);
    state.postBossHearts = !!allowWinHearts;
    state.postBossCars = noCars ? false : (cWin.postBossCarsFromHorizon !== false);
    state._spawnCarsFromHorizon = !!state.postBossCars;
    state._winHeartAcc = 0;
    state._winDropRoadBgT = 0;
    state._winDropRoadBgActive = false;
    state.winRoadBgAlpha = 1;
    state._winStarryReveal = 0;
    if (!state.postBossCars) {
      state.sectionTraffic = false;
      clearTraffic(state);
    } else {
      // fresh wave from horizon (don't keep fight-empty road)
      clearTraffic(state);
    }
    // Leave particles from boss blast; clear remaining brains if any
    state.brains = [];
    state.shots = [];
    state.lightningBolts = [];
    state.brainMaxActive = 0;
    // Clear any falling hearts at YOU WIN / sky takeoff (no more spawns)
    if (!allowWinHearts) {
      clearFallingHearts(state);
    } else if (state.postBossHearts) {
      var burst = cWin.postBossHeartBurstCount != null ? cWin.postBossHeartBurstCount : 14;
      state._tier3HeartBurst = Math.max(state._tier3HeartBurst || 0, burst);
      var bi;
      for (bi = 0; bi < burst; bi++) {
        spawnPickup(state, { forceSpawn: true, allowBossFight: true, allowMadMax: true, allowWinCruise: true });
      }
      state.pickupSpawnTimer = 0.15;
    }
    // sega31n: freeze current altitude — no ground snap / sink during winCruise
    if (ns.Sega31 && ns.Sega31.freezeElevForWin) {
      ns.Sega31.freezeElevForWin(state);
    } else {
      state.winElevFrozen = true;
      state.winFrozenElevScreenY = state.playerElevScreenY;
      state.winFrozenElevScale = state.playerElevScale;
      state.winFrozenElevTier = state.elevTier;
      state.winFrozenCameraHeight = state.cameraHeight;
    }
    state.winCruiseStartT = t;
    var ff = fightCfg(state);
    // Fallback only — RUN COMPLETE is gated by winPhase sequence (sega24)
    state.winCruiseEndT = ff.songEnd != null ? ff.songEnd : FINALE_SONG_END;
    state.winRideAhead = 0;
    state.winRideProgress = 0;
    // sega24 win sequence: accel→666 → center Y → horizon shrink/fade → RUN COMPLETE
    state.winPhase = "accel666";
    state.winCenterBlend = 0;
    state.winPlayerAlpha = 1;
    state.winSequenceDone = false;
    // Unlock display-666 climb for the victory ride
    state.madMaxMode = true;
    state.madMaxUnlocked666 = false;
    state.madMaxClimbPause = 0;
    state.madMaxLedCap = (state.config && state.config.ledMaxSpeed) ? state.config.ledMaxSpeed : 210;
    state.speed = Math.max(state.speed || 0, state.maxSpeed * 0.35);
  }

  function madMaxCfg(state) {
    return (state.config && state.config.madMax) ? state.config.madMax : {
      start: MAD_MAX_START,
      end: MAD_MAX_END
    };
  }

  function endMadMax(state, reason) {
    if (!state.madMaxMode) {
      return;
    }
    state.nuclearBlast = 0;
    state.nuclearBlastT = 0;
    state.madMaxMode = false;
    state.madMaxClimbPause = 0;
    var normal = (state.config && state.config.ledMaxSpeed) ? state.config.ledMaxSpeed : 210;
    state.madMaxLedCap = normal;
    // Cap returns to display 333; overspeed decelerates under normal bands (no hard snap)
    if (reason === "window") {
      state.eventText = "MAD MAX OVER";
      state.eventTimer = 1.6;
    }
  }

  function updateMadMax(state, dt, t) {
    var mm = madMaxCfg(state);
    var startT = mm.start != null ? mm.start : MAD_MAX_START;
    var endT = mm.end != null ? mm.end : MAD_MAX_END;
    if (state.phase !== "running" && state.phase !== "countdown") {
      return;
    }
    // sega24: keep Mad Max climb during winCruise so victory ride can hit display 666
    if (state.finaleMode === "winCruise") {
      return;
    }
    if (state.finaleFight || state.finaleMode === "fight" || state.finaleWon || state.finaleLost) {
      if (state.madMaxMode) {
        endMadMax(state, "finale");
      }
      return;
    }
    if (!state.madMaxMode && t >= startT && t < endT) {
      state.madMaxMode = true;
      state.madMaxUnlocked666 = false;
      state.madMaxClimbPause = 0;
      state.madMaxLedCap = (state.config && state.config.ledMaxSpeed) ? state.config.ledMaxSpeed : 210;
      state.eventText = mm.banner || "MAD MAX MODE ENGAGED";
      state.eventTimer = 2.6;
      // sega28: MAD MAX flash uses DEATH-style death-flash DOM
      state.madMaxFlashTimer = 1.6;
      state.madMaxFlashText = "MAD MAX";
    }
    if (state.madMaxMode && t >= endT) {
      endMadMax(state, "window");
    }
  }


  
  function updateIntroPartyGoers(state, t) {
    if (!(state.config && state.config.introPartyGoers)) return;
    var win = state.config.introPartyGoersWindowSec != null ? state.config.introPartyGoersWindowSec : 25;
    if (t > win) return;
    if (!state.partyImages) return;
    if (state._partySpawned) return;
    state._partySpawned = true;
    // Place a few party sprites into early roadside segments
    var keys = Object.keys(state.partyImages);
    if (!keys.length || !state.segments) return;
    var count = state.config.introPartyGoersSparse ? 6 : 14;
    var i, seg, side, key, img;
    for (i = 0; i < count; i++) {
      seg = state.segments[(20 + i * 17) % state.segments.length];
      if (!seg || !seg.sprites) continue;
      key = keys[i % keys.length];
      img = state.partyImages[key];
      if (!img) continue;
      side = (i % 2 === 0) ? -1 : 1;
      seg.sprites.push({
        source: { img: img, x: 0, y: 0, w: img.width || 48, h: img.height || 64, roadside: "party", scaleMul: 0.85 },
        offset: side * (1.35 + (i % 3) * 0.15),
        sectionId: null // show across early sections
      });
    }
  }

  function updateNuclearBlast(state, t) {
    var nb = (state.config && state.config.nuclearBlast) ? state.config.nuclearBlast : { start: 156.5, end: 159.6 };
    var startT = nb.start != null ? nb.start : 156.5;
    var endT = nb.end != null ? nb.end : 159.6;
    if (state.phase !== "running" && state.phase !== "countdown") {
      state.nuclearBlast = 0;
      return;
    }
    if (t >= startT && t < endT) {
      // 0→1→0 pulse across the blast window
      var u = (t - startT) / Math.max(0.05, endT - startT);
      state.nuclearBlast = u < 0.2 ? (u / 0.2) : (u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.45));
      state.nuclearBlastT = t - startT;
    } else {
      state.nuclearBlast = 0;
      state.nuclearBlastT = 0;
    }
    if (ns.Sega31 && ns.Sega31.updateNukeEra) {
      ns.Sega31.updateNukeEra(state, t);
    }
  }

  function updateFinale(state, dt, t) {
    var ff = fightCfg(state);
    var fightStart = ff.start != null ? ff.start : FINALE_FIGHT_START;
    var deadline = ff.deadline != null ? ff.deadline : FINALE_FIGHT_DEADLINE;
    var n;
    var key = null;
    var sax;

    // sega21: pre-brake a few seconds before Protect so stop is visible
    if (!state.finaleBrainsSpawned && !state.finaleWon && !state.finaleLost &&
        state.phase !== "gameover" && !state.songEnded &&
        t >= fightStart - 2.8 && t < fightStart) {
      state.bossApproach = true;
    }

    // sega19: begin boss at Protect — no paused/karaoke blackout beforehand
    if (!state.finaleBrainsSpawned && !state.finaleWon && !state.finaleLost &&
        state.phase !== "gameover" && !state.songEnded &&
        t >= fightStart) {
      if (!(state.finaleMode === "karaoke" && state.finaleLost)) {
        beginFinaleFight(state, t);
      }
    }

    if (!state.finaleMode) {
      return;
    }

    if (state.finaleMode === "paused") {
      state.finalePauseTimer = 0;
      state.finaleMode = null;
      return;
    }

    if (state.finaleMode === "fight") {
      if (state.bossDefeatBeat) {
        state.speed = 0;
        state.bossApproach = true;
        state.saxBgActive = false;
        return;
      }
      sax = SAX_VIDEO;
      if (state.config) {
        if (state.config.saxBgStartSec != null) sax.start = state.config.saxBgStartSec;
        if (state.config.saxBgEndSec != null) sax.end = state.config.saxBgEndSec;
      }
      // sega31x: sax moved to 2nd hold; fight window usually outside — leave inactive unless overlap
      state.saxBgActive = !!(sax && t >= sax.start && t < sax.end);
      state.sectionTraffic = false;
      if (state.cars && state.cars.length) {
        clearTraffic(state);
      }
      // sega30: crawl at bossLevelSpeed (~display 25), not hard zero
      state.bossApproach = true;
      if (ns.Gameplay && ns.Gameplay.bossCrawlInternalSpeed) {
        state.speed = ns.Gameplay.bossCrawlInternalSpeed(state);
      } else {
        var bls = (state.config && state.config.bossLevelSpeed != null)
          ? state.config.bossLevelSpeed : 25;
        var scale = (state.config && state.config.ledDisplayScale) ? state.config.ledDisplayScale : (169 / 140);
        var base = (state.config && state.config.ledMaxSpeed) ? state.config.ledMaxSpeed : (333 * 140 / 169);
        state.speed = state.maxSpeed * ((bls / scale) / Math.max(1e-6, base));
      }
      state.activeMaxSpeed = state.speed;

      if (ns.Brains && ns.Brains.finaleBrainsCleared && ns.Brains.finaleBrainsCleared(state)) {
        beginFinaleWinCruise(state, t);
        return;
      }

      // sega30: don't fail on deadline while boss death expand/explosions play
      var bossDying = false;
      if (state.brains) {
        for (var bi = 0; bi < state.brains.length; bi++) {
          if (state.brains[bi].bossDying) { bossDying = true; break; }
        }
      }
      if (ns.Sega31 && ns.Sega31.updateBossZapStorm) {
        ns.Sega31.updateBossZapStorm(state, dt, t);
      }
      if (t >= deadline && !bossDying) {
        // sega26: defeat beat (no seek) then lose storyboards on real song clock
        if (ns.Gameplay && ns.Gameplay.startBossDefeatBeat) {
          ns.Gameplay.startBossDefeatBeat(state, "deadline");
        } else {
          beginFinaleLoseStoryboard(state, t);
        }
      }
      return;
    }

    if (state.finaleMode === "winCruise") {
      state.saxBgActive = false;
      state.finaleStoryboard = null;
      // sega31x: winNoCars clears / blocks horizon cars on win path
      if (state.config && state.config.winNoCars !== false) {
        state.postBossCars = false;
        state._spawnCarsFromHorizon = false;
        state.sectionTraffic = false;
        if (state.cars && state.cars.length) clearTraffic(state);
      } else if (state.postBossCars) {
        state.sectionTraffic = true;
        state._spawnCarsFromHorizon = true;
      } else if (state.cars && state.cars.length) {
        clearTraffic(state);
      }
      if (heartsBlockedByWinCruise(state) || !state.postBossHearts) {
        if (state.pickups && state.pickups.length) clearFallingHearts(state);
        else {
          state.sectionPickups = false;
          state.postBossHearts = false;
        }
      } else {
        state.sectionPickups = true;
      }
      return;
    }

    // Losing storyboard only (no Protect karaoke blank)
    if (state.finaleMode === "karaoke") {
      if (state.finaleLost) {
        for (n = 0; n < STORYBOARD.length; n++) {
          if (t >= STORYBOARD[n].t) {
            key = STORYBOARD[n].key;
          }
        }
        state.finaleStoryboard = key;
      } else {
        state.finaleStoryboard = null;
      }
    }
  }

  function reset(state) {
    state.sectionId = "tutorial";
    state.sectionTraffic = false;
    state.sectionBrains = false;
    state.sectionCorpses = false;
    state.sectionPickups = false;
    state.sectionBrainsOnly = false;
    state.invasionTriggered = false;
    state.invasionFlash = 0;
    state._clearedForSection = null;
    state._burstForSection = null;
    state._tutorialCarsSpawned = false;
    state._tutorialPickupsSpawned = false;
    state._tutorialCarCount = 0;
    state.corpses = [];
    state.pickups = [];
    state.corpseSpawnTimer = 0;
    state.pickupSpawnTimer = 2.5;
    state.postBossHearts = false;
    state.postBossCars = false;
    state._spawnCarsFromHorizon = false;
    state.psychMode = false;
    state.psychStyle = null;
    state.bgStyle = "dusk";
    state.nightAustin = false;
    state.austinBgPlate = "dusk";
    state.austinSongLyricCount = 0;
    state.austinLastLyricIndex = -1;
    state.austinSectionCount = 0;
    state.worldFade = 1;
    state.trafficLaneSwap = false;
    state.pauseZaps = false;
    state.instructionMode = "howto";
    state.finaleMode = null;
    state.finalePauseTimer = 0;
    state.finaleStoryboard = null;
    state.finaleFight = false;
    state.finaleWon = false;
    state.finaleLost = false;
    state.bossDefeatBeat = false;
    state.bossDefeatTimer = 0;
    state.bossDefeatElapsed = 0;
    state.finaleBrainsSpawned = false;
    state.finaleBossId = null;
    state.saxBgActive = false;
    state.bossApproach = false;
    state.bossPhase = null;
    state.bossZapCount = 0;
    state.bossMediumsSpawned = false;
    state.bossTiniesSpawned = false;
    state.mediumZapElapsed = 0;
    state.globalZapLock = null;
    state.preBossWindow = false;
    state._lastMediumPositions = [];
    state.madMaxMode = false;
    state.madMaxUnlocked666 = false;
    state.madMaxClimbPause = 0;
    state.madMaxLedCap = 0;
    state.weaponPower = 0;
    state.winBanner = null;
    state.winCruiseStartT = 0;
    state.winCruiseEndT = 0;
    state.winRideAhead = 0;
    state.winRideProgress = 0;
    state.winPhase = null;
    state.winCenterBlend = 0;
    state.winPlayerAlpha = 1;
    state.winSequenceDone = false;
    state.loseBanner = null;
    state.failHumanityBanner = null;
    if (ns.Scenery && ns.Scenery.reset) {
      ns.Scenery.reset(state);
    }
    if (ns.Sega31x && ns.Sega31x.resetFlags) {
      ns.Sega31x.resetFlags(state);
    }
  }

  function update(state, dt) {
    var t = songTime(state);
    var sec = sectionAt(t);
    applySection(state, sec, t);

    // sega45 H: tutorial heart burst lands at firstHeartsAtSec (8 s) = the verse1 boundary, so keep
    // the tutorial pickup step alive a few seconds past the tutorial section
    if (sec.scriptedTutorial || (!state._tutorialPickupsSpawned && t < 14)) {
      updateTutorial(state, dt, t);
    }

    if (state.invasionFlash > 0) {
      state.invasionFlash = Math.max(0, state.invasionFlash - dt);
    }

    // During finale pause/karaoke skip pickups; winCruise hearts off unless explicitly allowed
    if (!state.finaleMode || (state.finaleMode === "winCruise" && state.postBossHearts && !heartsBlockedByWinCruise(state))) {
      updateCorpsesAndPickups(state, dt);
    } else if (state.finaleMode === "winCruise" && state.pickups && state.pickups.length) {
      // takeoff: clear any leftovers without FX
      clearFallingHearts(state);
    }

    if (ns.Scenery && ns.Scenery.update) {
      ns.Scenery.update(state, dt);
    }

    updateMadMax(state, dt, t);
    updateIntroPartyGoers(state, t);
    updateNuclearBlast(state, t);
    updateFinale(state, dt, t);
    if (ns.Sega31x && ns.Sega31x.update) {
      ns.Sega31x.update(state, dt);
    }
  }

  ns.Sections = {
    SECTIONS: SECTIONS,
    STORYBOARD: STORYBOARD,
    SAX_VIDEO: SAX_VIDEO,
    FINALE_FIGHT_START: FINALE_FIGHT_START,
    FINALE_FIGHT_DEADLINE: FINALE_FIGHT_DEADLINE,
    FINALE_SONG_END: FINALE_SONG_END,
    FINALE_LOSE_END: FINALE_LOSE_END,
    MAD_MAX_START: MAD_MAX_START,
    MAD_MAX_END: MAD_MAX_END,
    PSYCH_STYLES: PSYCH_STYLES,
    BG_STYLES: BG_STYLES,
    songTime: songTime,
    sectionAt: sectionAt,
    reset: reset,
    update: update,
    collectLife: collectLife,
    spawnPickup: spawnPickup,
    spawnSkyHeart: spawnSkyHeart,
    madMaxCfg: madMaxCfg,
    endMadMax: endMadMax,
    clearTraffic: clearTraffic,
    clearBrains: clearBrains,
    spawnPickup: spawnPickup,
    spawnAheadCar: spawnAheadCar,
    beginFinaleFight: beginFinaleFight,
    beginFinaleLoseStoryboard: beginFinaleLoseStoryboard,
    beginFinaleWinCruise: beginFinaleWinCruise,
    clearFallingHearts: clearFallingHearts
  };
})(window.ApexRacer = window.ApexRacer || {});
