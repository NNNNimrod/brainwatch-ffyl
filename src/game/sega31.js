(function(ns) {
  var CYBERCAB_COLORS = [
    { id: "goldfinch", hex: "#FFD84A" },
    { id: "red", hex: "#E23B2E" },
    { id: "silver", hex: "#C8CDD3" },
    { id: "blue", hex: "#3B7DDD" },
    { id: "white", hex: "#F2F4F7" },
    { id: "black", hex: "#2A2D33" }
  ];
  var CAR_NAMES = ["CAR01", "CAR02", "CAR03", "CAR04"];

  function cfg(state) { return (state && state.config) || {}; }

  function trainerOn(state, id) {
    var t = state.trainer || {};
    if (id === "carCollisions") return t.carCollisions !== false;
    if (id === "invincible") return !!t.invincible;
    if (id.indexOf("show") === 0) return t[id] !== false;
    return !!t[id];
  }

  function ensureTrainer(state) {
    if (state.trainer) return state.trainer;
    state.trainer = {
      invincible: false,
      carCollisions: true,
      showRoadside: true,
      showTraffic: true,
      showBrains: true,
      showFx: true,
      showLyrics: true,
      showMeters: true,
      showPsych: true,
      showBgPlates: true,
      showZaps: true,
      showPickups: true
    };
    return state.trainer;
  }

  function formatTs(n, elapsed) {
    var t = Math.max(0, elapsed || 0);
    var m = Math.floor(t / 60);
    var ss = Math.floor(t % 60);
    var cs = Math.floor((t - Math.floor(t)) * 100);
    var sss = (ss < 10 ? "0" : "") + ss;
    var css = (cs < 10 ? "0" : "") + cs;
    return "TS: " + n + " @ " + m + ":" + sss + ":" + css;
  }

  function loadTsLog() {
    try {
      var raw = localStorage.getItem("ffyl_pause_timestamps_v1");
      if (raw) return JSON.parse(raw) || [];
    } catch (e) {}
    return [];
  }

  function saveTsLog(arr) {
    try { localStorage.setItem("ffyl_pause_timestamps_v1", JSON.stringify(arr)); } catch (e) {}
  }

  function sendTimestamp(state) {
    var list = loadTsLog();
    var n = list.length + 1;
    var elapsed = state.runElapsedSinceStart != null ? state.runElapsedSinceStart : (state.elapsed || 0);
    var entry = {
      n: n,
      t: elapsed,
      label: formatTs(n, elapsed),
      at: new Date().toISOString(),
      songT: state.musicTime || 0
    };
    list.push(entry);
    saveTsLog(list);
    state.pauseTsCount = n;
    state.pauseTsLastLabel = entry.label;
    // Persist to HQ file via editor server
    try {
      fetch("/api/pause-timestamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: entry, all: list })
      }).catch(function() {});
    } catch (eF) {}
    state.hqToastText = (cfg(state).pauseTsSentToast) || "Timestamp sent to HQ";
    state.hqToastTimer = (cfg(state).pauseTsSentToastSec != null) ? cfg(state).pauseTsSentToastSec : 1.2;
    return entry;
  }

  function elevCap(state) {
    var c = cfg(state);
    if (c.elevMaxTier != null) return Math.max(1, c.elevMaxTier | 0);
    if (c.nixTier3 || c.elevTier3Enabled === false) return 2;
    return 3;
  }

  function elevGroundScreenY(c) {
    return c.elevTier1ScreenY != null ? c.elevTier1ScreenY : 0.99;
  }

  function elevCeilingScreenY(c) {
    if (c.elevCeilingScreenY != null) return c.elevCeilingScreenY;
    if (c.elevCeiling != null) return c.elevCeiling;
    // 25% lower than old tier2 toward ground: ground − 0.75×(ground−oldTier2)
    var g = elevGroundScreenY(c);
    var oldT2 = c.elevTier2ScreenY != null ? c.elevTier2ScreenY : 0.62;
    return g - 0.75 * (g - oldT2);
  }

  function elevContinuousOn(c) {
    return c.elevContinuousAltitude !== false;
  }

  function elevScreenYForTier(c, tier) {
    var t1y = elevGroundScreenY(c);
    if (tier <= 1) return t1y;
    if (elevContinuousOn(c)) return elevCeilingScreenY(c);
    var t2y = c.elevTier2ScreenY != null ? c.elevTier2ScreenY : 0.62;
    if (tier === 2) return t2y;
    return 0.48;
  }

  function elevScaleForTier(c, tier) {
    var t2 = c.elevTier2ScaleMult != null ? c.elevTier2ScaleMult : 1.15;
    var t3 = c.elevTier3ScaleMult != null ? c.elevTier3ScaleMult : 1.15;
    var scale = 1;
    if (tier >= 2) scale *= t2;
    if (tier >= 3) scale *= t3;
    return scale;
  }

  function elevProgressFromScreenY(c, screenY) {
    var g = elevGroundScreenY(c);
    var ceil = elevCeilingScreenY(c);
    var span = g - ceil;
    if (span <= 1e-6) return 0;
    var y = screenY != null ? screenY : g;
    return Math.max(0, Math.min(1, (g - y) / span));
  }

  function elevScaleForProgress(c, progress) {
    var t2 = c.elevTier2ScaleMult != null ? c.elevTier2ScaleMult : 1.15;
    var p = Math.max(0, Math.min(1, progress || 0));
    return 1 + (t2 - 1) * p;
  }

  function elevCamMulForProgress(progress) {
    var p = Math.max(0, Math.min(1, progress || 0));
    return 1 + (1.18 - 1) * p;
  }

  function elevCamMulForTier(tier) {
    if (tier <= 1) return 1;
    if (tier === 2) return 1.18;
    return 1.35;
  }

  function carClearScreenY(c) {
    if (c.carClearAltitude != null) return c.carClearAltitude;
    if (c.carClearScreenY != null) return c.carClearScreenY;
    return 0.879;
  }

  function syncElevTierFromAltitude(state) {
    var c = cfg(state);
    if (!elevContinuousOn(c)) return;
    var y = state.elevTargetScreenY != null ? state.elevTargetScreenY
      : (state.playerElevScreenY != null ? state.playerElevScreenY : elevGroundScreenY(c));
    var g = elevGroundScreenY(c);
    // Logical tier: aloft if meaningfully above ground (for HUD / leftovers)
    state.elevTier = (y < g - 0.01) ? 2 : 1;
  }

  function applyContinuousElevTargets(state, screenY) {
    var c = cfg(state);
    var g = elevGroundScreenY(c);
    var ceil = elevCeilingScreenY(c);
    var y = Math.max(ceil, Math.min(g, screenY));
    var progress = elevProgressFromScreenY(c, y);
    var base = state.baseCameraHeight || (state.config && state.config.cameraHeight) || 1000;
    state.elevTargetScreenY = y;
    state.elevTargetScale = elevScaleForProgress(c, progress);
    state.elevTargetCameraHeight = base * elevCamMulForProgress(progress);
    syncElevTierFromAltitude(state);
  }

  function startTier2Aloft(state) {
    var c = cfg(state);
    if (elevContinuousOn(c)) return; // sega31n: no aloft countdown
    if (c.elevTier2AloftRules === false) return;
    var dur = c.elevTier2DurationSec != null ? c.elevTier2DurationSec
      : (c.elevTier3DurationSec != null ? c.elevTier3DurationSec : 5.0);
    state.tier2AloftTimer = dur;
    state.tier2AloftMax = dur;
    state.tier2HeartOfferTimer = c.elevTier2HeartsOfferedEverySec != null
      ? c.elevTier2HeartsOfferedEverySec
      : (c.elevTier3HeartsOfferedEverySec != null ? c.elevTier3HeartsOfferedEverySec : 5);
  }

  function freezeElevForWin(state) {
    var c = cfg(state);
    if (c.winFreezeElevTier === false && c.winPreserveElevY === false && c.winNoGroundSnap === false) {
      return;
    }
    ensureElev(state);
    state.winElevFrozen = true;
    state.winFrozenElevTier = state.elevTier || 1;
    state.winFrozenElevScreenY = state.playerElevScreenY != null
      ? state.playerElevScreenY
      : (state.elevTargetScreenY != null ? state.elevTargetScreenY : elevScreenYForTier(c, state.elevTier || 1));
    state.winFrozenElevScale = state.playerElevScale != null
      ? state.playerElevScale
      : (state.elevTargetScale != null ? state.elevTargetScale : elevScaleForTier(c, state.elevTier || 1));
    state.winFrozenCameraHeight = state.cameraHeight != null
      ? state.cameraHeight
      : state.elevTargetCameraHeight;
    // Lock targets + current so sink/aloft cannot drift during winCruise
    state.elevTargetScreenY = state.winFrozenElevScreenY;
    state.elevTargetScale = state.winFrozenElevScale;
    if (state.winFrozenCameraHeight != null) state.elevTargetCameraHeight = state.winFrozenCameraHeight;
    state.playerElevScreenY = state.winFrozenElevScreenY;
    state.playerElevScale = state.winFrozenElevScale;
    if (state.winFrozenCameraHeight != null) state.cameraHeight = state.winFrozenCameraHeight;
    state.elevFloatHoldTimer = 0;
    state.tier2AloftTimer = 0;
  }

  function setElevTier(state, tier, opts) {
    opts = opts || {};
    tier = Math.max(1, Math.min(elevCap(state), tier | 0));
    ensureElev(state);
    var c = cfg(state);
    // During YOU WIN freeze, ignore trainer/timeout tier drops
    if ((state.finaleMode === "winCruise" || state.winElevFrozen) &&
        (c.winSkipElevTimeout !== false || c.winNoGroundSnap !== false) &&
        !opts.forceWinOverride) {
      return;
    }
    var prev = state.elevTier || 1;
    state.elevTier = tier;
    state.heartsTowardNextTier = 0;
    var scale = elevScaleForTier(c, tier);
    var screenY = elevScreenYForTier(c, tier);
    var base = state.baseCameraHeight || (state.config && state.config.cameraHeight) || 1000;
    var camH = base * elevCamMulForTier(tier);
    if (elevContinuousOn(c)) {
      // Trainer: goTier1→ground, goTier2→ceiling; scale/cam from altitude progress
      applyContinuousElevTargets(state, screenY);
      scale = state.elevTargetScale;
      screenY = state.elevTargetScreenY;
      camH = state.elevTargetCameraHeight;
    } else {
      state.elevTargetScale = scale;
      state.elevTargetScreenY = screenY;
      state.elevTargetCameraHeight = camH;
    }
    // smooth lerp unless snap (paused apply / first init)
    var smooth = c.elevSmoothLerp !== false && !opts.snap;
    if (!smooth || state.playerElevScreenY == null || state.playerElevScale == null) {
      state.playerElevScale = scale;
      state.playerElevScreenY = screenY;
      state.cameraHeight = camH;
    }
    state.eventText = elevContinuousOn(c)
      ? (tier === 1 ? "GROUND" : "CEILING")
      : ("TIER " + tier + (tier === 1 ? " — GROUND" : (tier === 2 ? " — FLY" : " — MID")));
    state.eventTimer = 1.4;
    if (!elevContinuousOn(c) && tier === 2 && c.elevTier2AloftRules !== false) {
      startTier2Aloft(state);
    } else if (tier <= 1) {
      state.tier2AloftTimer = 0;
      state.tier2HeartOfferTimer = 0;
      if (elevContinuousOn(c)) state.elevFloatHoldTimer = 0;
    }
    // First-person burst only from natural heart climb, not trainer jumps
    // sega31l: nix tier3 — never enter 1st-person burst
    if (!opts.fromTrainer && tier >= 3 && elevCap(state) >= 3 && cfg(state).elevFirstPersonBurst !== false && cfg(state).nixTier3 !== true && cfg(state).elevTier3Enabled !== false && !state._fpBurstDoneForTier3) {
      startFirstPersonBurst(state);
    }
    if (opts.fromTrainer) {
      state.firstPersonBurst = false;
      state.firstPersonTimer = 0;
    }
  }

  function displayMph(state) {
    var c = cfg(state);
    if (!state.maxSpeed) return 0;
    var ledBase = c.ledMaxSpeed != null ? c.ledMaxSpeed : (333 * 140 / 169);
    var led = (state.speed / state.maxSpeed) * ledBase;
    var scale = c.ledDisplayScale != null ? c.ledDisplayScale : (169 / 140);
    return led * scale;
  }

  function startFirstPersonBurst(state) {
    var c = cfg(state);
    // sega31l: hard nix tier3 / 1st-person
    if (c.nixTier3 || c.elevTier3Enabled === false || elevCap(state) < 3) {
      return;
    }
    state.firstPersonBurst = true;
    state.firstPersonPhase = "expand";
    state.firstPersonScale = 1;
    state.firstPersonTargetScale = c.elevFirstPersonScaleMult != null ? c.elevFirstPersonScaleMult : 10;
    var dur = c.elevTier3DurationSec != null ? c.elevTier3DurationSec
      : (c.elevFirstPersonZapSec != null ? c.elevFirstPersonZapSec : 5.0);
    state.firstPersonTimer = dur;
    state.firstPersonFlyMax = dur;
    state._fpBurstDoneForTier3 = true;
    state.tier3HeartOfferTimer = c.elevTier3HeartsOfferedEverySec != null ? c.elevTier3HeartsOfferedEverySec : 5;
    state.eventText = "TIER 3 — FLY";
    state.eventTimer = 1.6;
  }

  function onHeartCollected(state) {
    if (!cfg(state).playerElevationEnabled) return;
    if (!cfg(state).playerElevationViaHearts) return;
    ensureElev(state);
    var c = cfg(state);
    state.heartsTowardNextTier = (state.heartsTowardNextTier || 0) + 1;
    state.heartsTotal = (state.heartsTotal || 0) + 1;

    // sega31n: continuous altitude — each heart boosts toward ceiling (fractions of playfield H)
    if (elevContinuousOn(c)) {
      if (state.finaleMode === "winCruise" || state.winElevFrozen) return;
      var g = elevGroundScreenY(c);
      var ceil = elevCeilingScreenY(c);
      var cur = state.elevTargetScreenY != null ? state.elevTargetScreenY
        : (state.playerElevScreenY != null ? state.playerElevScreenY : g);
      var boost = c.elevHeartBoostOfPlayfieldH != null ? c.elevHeartBoostOfPlayfieldH
        : (c.elevHeartBoostScreenY != null ? c.elevHeartBoostScreenY : 0.08333);
      var holdSec = c.elevFloatHoldSec != null ? c.elevFloatHoldSec
        : (c.elevCeilingHeartFloatHoldSec != null ? c.elevCeilingHeartFloatHoldSec : 1.0);
      var atCeiling = cur <= ceil + 0.002;
      if (atCeiling) {
        // Extra hearts at ceiling: +float hold, no further rise
        state.elevFloatHoldTimer = (state.elevFloatHoldTimer || 0) + holdSec;
        applyContinuousElevTargets(state, ceil);
        state.eventText = "+" + holdSec.toFixed(0) + "s FLOAT";
        state.eventTimer = 1.0;
      } else {
        var next = Math.max(ceil, cur - boost);
        applyContinuousElevTargets(state, next);
        if (next <= ceil + 0.002) {
          state.eventText = "CEILING";
        } else {
          state.eventText = "THRUST";
        }
        state.eventTimer = 1.0;
      }
      return;
    }

    var need = c.elevHeartsPerTier != null ? c.elevHeartsPerTier : 3;
    // sega31m: Tier2 aloft — each heart extends fly timer (+5s)
    if (c.elevTier2AloftRules !== false && state.elevTier === 2 && (state.tier2AloftTimer || 0) > 0) {
      var add2 = c.elevTier2CollectHeartAddsSec != null ? c.elevTier2CollectHeartAddsSec
        : (c.elevTier3CollectHeartAddsSec != null ? c.elevTier3CollectHeartAddsSec : 5);
      state.tier2AloftTimer = (state.tier2AloftTimer || 0) + add2;
      state.tier2AloftMax = Math.max(state.tier2AloftMax || 0, state.tier2AloftTimer);
      state.eventText = "+5s FLY";
      state.eventTimer = 1.0;
    }
    // Tier3: each heart extends fly timer (disabled when nixTier3)
    if (!c.nixTier3 && c.elevTier3Enabled !== false && (state.elevTier >= 3 || state.firstPersonBurst) && state.firstPersonBurst) {
      var add = c.elevTier3CollectHeartAddsSec != null ? c.elevTier3CollectHeartAddsSec : 5;
      if (state.firstPersonPhase === "fly" || state.firstPersonPhase === "expand") {
        state.firstPersonTimer = (state.firstPersonTimer || 0) + add;
        state.firstPersonFlyMax = Math.max(state.firstPersonFlyMax || 0, state.firstPersonTimer);
        state.eventText = "+5s FLY";
        state.eventTimer = 1.0;
      }
    }
    var maxT = elevCap(state);
    if (state.elevTier < maxT && state.heartsTowardNextTier >= need) {
      setElevTier(state, state.elevTier + 1);
      state.eventText = "TIER " + state.elevTier + (state.elevTier === 2 ? " — FLY" : " — MID");
      state.eventTimer = 1.8;
    } else if (state.elevTier >= maxT && state.heartsTowardNextTier >= need) {
      // sega31l: further hearts stay on max tier (no climb to tier3 / 1st-person)
      state.heartsTowardNextTier = 0;
    }
  }

  function ensureElev(state) {
    if (!state.elevTier) state.elevTier = 1;
    if (state.heartsTowardNextTier == null) state.heartsTowardNextTier = 0;
    if (state.baseCameraHeight == null && state.config) {
      state.baseCameraHeight = state.config.cameraHeight;
    }
    if (state.elevFloatHoldTimer == null) state.elevFloatHoldTimer = 0;
  }

  function offerTier3Hearts(state) {
    var c = cfg(state);
    // no heart offers during YOU WIN / winCruise takeoff
    if (c.noHeartsOnWinCruise !== false || c.noHeartsOnWinTakeoff !== false) {
      if (state.finaleMode === "winCruise" || state.finaleWon || state.winBanner || state.winPhase) return;
    }
    // sega31p: no sky-heart offers during MAD MAX
    if (c.madMaxNoHearts !== false && c.noHeartsDuringMadMax !== false) {
      if (state.madMaxMode) return;
      var mm = c.madMax || {};
      var startT = mm.start != null ? mm.start : 120.5;
      var endT = mm.end != null ? mm.end : 156.0;
      var t = state.songClock;
      if (t != null && t >= startT && t < endT) return;
    }
    // sega37: no sky-heart offers in tunnel
    if (c.tunnelHeartsEnabled !== true) {
      if (state.inTunnel) return;
      var tp = state._tunnelPhase;
      if (tp === 'blackIn' || tp === 'inside' || tp === 'shrinkOut' || tp === 'blackOut') return;
    }
    var n = c.elevTier2HeartsPerOffer != null ? c.elevTier2HeartsPerOffer
      : (c.elevTier3HeartsPerOffer != null ? c.elevTier3HeartsPerOffer : 3);
    var i;
    if (ns.Sections && ns.Sections.spawnSkyHeart) {
      // sega31z: heartsRandomLeftRight / heartsRandomLaneOnSkyOffer → independent random L/R
      var randomLane = (c.heartsRandomLeftRight !== false) || (c.heartsRandomLaneOnSkyOffer !== false);
      for (i = 0; i < n; i++) {
        if (randomLane) {
          ns.Sections.spawnSkyHeart(state, {}); // spawnPickup randomizes when no forceLane
        } else {
          ns.Sections.spawnSkyHeart(state, { forceLane: i % 2 });
        }
      }
      return;
    }
    // Fallback: poke pickup timer so sections will spawn soon
    state.pickupSpawnTimer = 0.05;
    state._tier3HeartBurst = n;
  }

  function updateElevation(state, dt) {
    if (!cfg(state).playerElevationEnabled) return;
    ensureElev(state);
    var c = cfg(state);
    var scale = elevScaleForTier(c, state.elevTier || 1);

    // sega31n: YOU WIN freeze — skip sink / aloft / goTier1; keep frozen altitude
    var winFrozen = (state.finaleMode === "winCruise" || state.winElevFrozen) &&
      (c.winFreezeElevTier !== false || c.winPreserveElevY !== false || c.winNoGroundSnap !== false || c.winSkipElevTimeout !== false);
    if (winFrozen) {
      if (state.winFrozenElevScreenY != null) {
        state.elevTargetScreenY = state.winFrozenElevScreenY;
        state.playerElevScreenY = state.winFrozenElevScreenY;
      }
      if (state.winFrozenElevScale != null) {
        state.elevTargetScale = state.winFrozenElevScale;
        state.playerElevScale = state.winFrozenElevScale;
      }
      if (state.winFrozenCameraHeight != null) {
        state.elevTargetCameraHeight = state.winFrozenCameraHeight;
        state.cameraHeight = state.winFrozenCameraHeight;
      }
      if (state.winFrozenElevTier != null) state.elevTier = state.winFrozenElevTier;
      return;
    }

    // sega34: force tier2 / ceiling while inside tunnel
    if (state.inTunnel && c.tunnelForceElevTier2 !== false) {
      state.elevTier = 2;
      state._tunnelForceElev2 = true;
      if (elevContinuousOn(c)) {
        var ceilT = elevCeilingScreenY(c);
        applyContinuousElevTargets(state, ceilT);
        state.elevFloatHoldTimer = Math.max(state.elevFloatHoldTimer || 0, 1.0);
      } else {
        state.tier2AloftTimer = Math.max(state.tier2AloftTimer || 0, 1.0);
        if ((state.elevTier || 1) !== 2) {
          setElevTier(state, 2, { fromTrainer: true });
        }
      }
    }

    // sega31n continuous altitude: sink + float hold (no aloft countdown)
    if (elevContinuousOn(c) && !state.firstPersonBurst) {
      var g = elevGroundScreenY(c);
      var ceil = elevCeilingScreenY(c);
      if (state.elevTargetScreenY == null) {
        state.elevTargetScreenY = state.playerElevScreenY != null ? state.playerElevScreenY : g;
      }
      // Clamp target into [ceiling, ground]
      state.elevTargetScreenY = Math.max(ceil, Math.min(g, state.elevTargetScreenY));
      // sega34: while tunnel-forced, pin to ceiling and refresh hold (skip sink)
      if (state.inTunnel && c.tunnelForceElevTier2 !== false) {
        state.elevTargetScreenY = ceil;
        applyContinuousElevTargets(state, ceil);
        state.elevFloatHoldTimer = Math.max(state.elevFloatHoldTimer || 0, 1.0);
      }
      if ((state.elevFloatHoldTimer || 0) > 0) {
        state.elevFloatHoldTimer = Math.max(0, (state.elevFloatHoldTimer || 0) - dt);
        // Hold at current altitude (do not sink); keep at/under ceiling
        if (state.elevTargetScreenY < ceil) state.elevTargetScreenY = ceil;
      } else if (state.elevTargetScreenY < g - 1e-4) {
        var sink = c.elevSinkRateOfPlayfieldHPerSec != null ? c.elevSinkRateOfPlayfieldHPerSec
          : (c.elevSinkRateScreenYPerSec != null ? c.elevSinkRateScreenYPerSec : 0.01389);
        // Toward ground = larger screenY
        state.elevTargetScreenY = Math.min(g, state.elevTargetScreenY + sink * dt);
      }
      applyContinuousElevTargets(state, state.elevTargetScreenY);
    } else if (!elevContinuousOn(c) && c.elevTier2AloftRules !== false && state.elevTier === 2 && !state.firstPersonBurst) {
      // Legacy sega31m Tier2 aloft countdown
      if (state.inTunnel && c.tunnelForceElevTier2 !== false) {
        state.tier2AloftTimer = Math.max(state.tier2AloftTimer || 0, 1.0);
      } else {
      if (state.tier2AloftTimer == null) {
        startTier2Aloft(state);
      }
      state.tier2AloftTimer = (state.tier2AloftTimer || 0) - dt;
      state.tier2HeartOfferTimer = (state.tier2HeartOfferTimer != null ? state.tier2HeartOfferTimer : 5) - dt;
      if (state.tier2HeartOfferTimer <= 0) {
        state.tier2HeartOfferTimer = c.elevTier2HeartsOfferedEverySec != null
          ? c.elevTier2HeartsOfferedEverySec
          : (c.elevTier3HeartsOfferedEverySec != null ? c.elevTier3HeartsOfferedEverySec : 5);
        offerTier3Hearts(state);
      }
      if (state.tier2AloftTimer <= 0) {
        state.tier2AloftTimer = 0;
        setElevTier(state, 1, { fromTrainer: true });
        state.eventText = "TIER 1 — TIME UP";
        state.eventTimer = 1.2;
      }
      } // end non-tunnel aloft
    } else if (!elevContinuousOn(c) && c.elevTier2AloftRules === false) {
      // Legacy Tier2 hold: remain while displayed speed >= 100; drop if below
      var holdMin = c.elevTier2RemainWhileSpeedGe != null ? c.elevTier2RemainWhileSpeedGe
        : (c.elevTier2HoldMinDisplaySpeed != null ? c.elevTier2HoldMinDisplaySpeed : 100);
      if (state.elevTier === 2 && !state.firstPersonBurst) {
        var mph = displayMph(state);
        if (mph < holdMin) {
          setElevTier(state, 1, { fromTrainer: true });
          state.eventText = "TIER 1 — SLOW";
          state.eventTimer = 1.2;
        }
      }
    }

    if (state.firstPersonBurst) {
      var target = state.firstPersonTargetScale || 10;
      var expandMult = c.elevTier3ExpandRateMult != null ? c.elevTier3ExpandRateMult : 0.10;
      var returnSlow = c.elevTier3ReturnToTier2SlowMult != null ? c.elevTier3ReturnToTier2SlowMult
        : (c.elevFirstPersonReturnSlowMult != null ? c.elevFirstPersonReturnSlowMult : 1.5);
      var phase = state.firstPersonPhase || "fly";

      if (phase === "expand") {
        var expandRate = 8 * expandMult;
        state.firstPersonScale = Math.min(target, (state.firstPersonScale || 1) + expandRate * dt * target);
        if (state.firstPersonScale >= target - 0.05) {
          state.firstPersonScale = target;
          state.firstPersonPhase = "fly";
        }
      } else if (phase === "fly") {
        state.firstPersonScale = target;
        state.firstPersonTimer -= dt;
        state.tier3HeartOfferTimer = (state.tier3HeartOfferTimer != null ? state.tier3HeartOfferTimer : 5) - dt;
        if (state.tier3HeartOfferTimer <= 0) {
          state.tier3HeartOfferTimer = c.elevTier3HeartsOfferedEverySec != null ? c.elevTier3HeartsOfferedEverySec : 5;
          offerTier3Hearts(state);
        }
        if (state.firstPersonTimer <= 0) {
          state.firstPersonPhase = "return";
          state.firstPersonTimer = 0;
        }
      } else if (phase === "return") {
        var shrinkRate = (8 * expandMult) / Math.max(0.5, returnSlow);
        state.firstPersonScale = Math.max(1, (state.firstPersonScale || target) - shrinkRate * dt * target);
        if (state.firstPersonScale <= 1.05) {
          state.firstPersonBurst = false;
          state.firstPersonPhase = null;
          state.firstPersonScale = 1;
          state.firstPersonTimer = 0;
          var ret = c.elevFirstPersonReturnToTier != null ? c.elevFirstPersonReturnToTier : 2;
          setElevTier(state, ret, { fromTrainer: true });
          state._fpBurstDoneForTier3 = false;
          state.eventText = "TIER " + ret;
          state.eventTimer = 1.2;
        }
      }
      scale *= (state.firstPersonScale || 1);
      state.elevTargetScale = scale;
      state.elevTargetScreenY = 0.5;
      var baseFp = state.baseCameraHeight || (state.config && state.config.cameraHeight) || 1000;
      state.elevTargetCameraHeight = baseFp * 0.55;
    } else if (!elevContinuousOn(c)) {
      // Keep targets in sync with current tier (trainer/hearts already set them)
      if (state.elevTargetScale == null) state.elevTargetScale = elevScaleForTier(c, state.elevTier || 1);
      if (state.elevTargetScreenY == null) state.elevTargetScreenY = elevScreenYForTier(c, state.elevTier || 1);
      if (state.elevTargetCameraHeight == null) {
        var base0 = state.baseCameraHeight || (state.config && state.config.cameraHeight) || 1000;
        state.elevTargetCameraHeight = base0 * elevCamMulForTier(state.elevTier || 1);
      }
    }

    // Smooth lerp toward targets (continuous or discrete)
    var rate = c.elevSmoothLerpRate != null ? c.elevSmoothLerpRate : 5.5;
    var k = (c.elevSmoothLerp === false) ? 1 : Math.min(1, Math.max(0, dt * rate));
    var tgtScale = state.elevTargetScale != null ? state.elevTargetScale : scale;
    var tgtY = state.elevTargetScreenY != null ? state.elevTargetScreenY : elevScreenYForTier(c, state.elevTier || 1);
    var tgtCam = state.elevTargetCameraHeight;
    if (state.playerElevScale == null) state.playerElevScale = tgtScale;
    else state.playerElevScale = state.playerElevScale + (tgtScale - state.playerElevScale) * k;
    if (state.playerElevScreenY == null) state.playerElevScreenY = tgtY;
    else state.playerElevScreenY = state.playerElevScreenY + (tgtY - state.playerElevScreenY) * k;
    if (tgtCam != null) {
      if (state.cameraHeight == null) state.cameraHeight = tgtCam;
      else state.cameraHeight = state.cameraHeight + (tgtCam - state.cameraHeight) * k;
    }
  }

  function canShootCars(state) {
    var c = cfg(state);
    // sega31l: elevShootCars / playerCanShootCars (minTier 1) — not gated on tier3
    if (c.playerCanShootCars === false || c.elevShootCars === false) return false;
    if (c.playerCanShootCars == null && c.elevShootCars == null) {
      if (c.elevTier3ShootCars === false && c.tier3CanShootCars === false) return false;
    }
    var minT = c.playerShootCarsMinTier != null ? c.playerShootCarsMinTier : 1;
    return (state.elevTier || 1) >= minT || !!state.firstPersonBurst;
  }

  function tier3TimerLabel(state) {
    if (state.firstPersonBurst) {
      if (state.firstPersonPhase === "return") return "RETURNING";
      if (state.firstPersonPhase === "expand") return "CHARGING";
      var t = Math.max(0, state.firstPersonTimer || 0);
      return t.toFixed(1) + "s";
    }
    // sega31n continuous: optional float-hold readout; no aloft countdown
    if (elevContinuousOn(cfg(state))) {
      if ((state.elevFloatHoldTimer || 0) > 0.05) {
        return "FLOAT " + Math.max(0, state.elevFloatHoldTimer).toFixed(1) + "s";
      }
      return null;
    }
    // Legacy: Tier2 aloft countdown
    if (cfg(state).elevTier2TimerDisplay !== false && state.elevTier === 2 && (state.tier2AloftTimer || 0) > 0) {
      return Math.max(0, state.tier2AloftTimer).toFixed(1) + "s";
    }
    return null;
  }

  function fliesOverCars(state) {
    var c = cfg(state);
    if (elevContinuousOn(c)) {
      var clearY = carClearScreenY(c);
      // Hit test uses FEET elev (playerElevScreenY), not sprite head — she can LOOK clear while feet y > clearY
      var y = state.playerElevScreenY != null ? state.playerElevScreenY
        : (state.elevTargetScreenY != null ? state.elevTargetScreenY : elevGroundScreenY(c));
      // Smaller screenY = higher altitude; sega31q carClear ~0.93 clears sooner than 0.879
      return y <= clearY || !!state.firstPersonBurst;
    }
    var from = c.elevFlyOverCarsFromTier != null ? c.elevFlyOverCarsFromTier : 2;
    return (state.elevTier || 1) >= from || !!state.firstPersonBurst;
  }

  function immuneToZaps(state) {
    if (state.firstPersonBurst && cfg(state).elevFirstPersonImmuneToZaps !== false) return true;
    if (trainerOn(state, "invincible")) return true;
    return false;
  }

  function canZapBrainsFirstPerson(state) {
    return !!(state.firstPersonBurst && cfg(state).elevFirstPersonCanZapBrains !== false);
  }

  function applyTitleLogoSize(state) {
    var el = Dom.get("titleLogo");
    if (!el) return;
    var c = cfg(state);
    var px = c.titleLogoMaxPx != null ? c.titleLogoMaxPx : 244;
    var vw = c.titleLogoMaxVw != null ? c.titleLogoMaxVw : 80;
    var vh = c.titleLogoMaxVh != null ? c.titleLogoMaxVh : 31;
    el.style.width = "min(" + vw + "vw, " + px + "px)";
    el.style.maxHeight = vh + "vh";
  }

  function styleMadMaxFlash(el, state) {
    if (!el) return;
    var glow = (cfg(state).madMaxBannerGlow) || "green";
    el.classList.remove("glow-green", "glow-red");
    if (glow === "green") {
      el.classList.add("glow-green");
    } else {
      el.classList.add("glow-red");
    }
    if (cfg(state).madMaxBannerCentered !== false) {
      el.style.justifyItems = "center";
      el.style.textAlign = "center";
      el.style.left = "0";
      el.style.right = "0";
    }
  }

  function updateNukeEra(state, t) {
    var nb = cfg(state).nuclearBlast || {};
    var flashStart = nb.flashStart != null ? nb.flashStart : 155.0;
    var nukeStart = nb.start != null ? nb.start : 156.5;
    var nukeEnd = nb.end != null ? nb.end : 159.6;
    var winterStart = nb.winterStart != null ? nb.winterStart : 164.5;

    if (state.phase !== "running" && state.phase !== "countdown") {
      state.nukeFlash = 0;
      state.nukePostFlashBw = 0;
      return;
    }

    // Post-flash bright B&W → full color (nukePostFlashBwToColorSec, default 1.0)
    var bwSec = nb.nukePostFlashBwToColorSec != null ? nb.nukePostFlashBwToColorSec
      : (cfg(state).nukePostFlashBwToColorSec != null ? cfg(state).nukePostFlashBwToColorSec : 1.0);
    if (!(bwSec > 0)) bwSec = 1.0;

    // sega31g: full-screen whiteout before nuke; force nuke plate under white for reveal
    if (t >= flashStart && t < nukeStart) {
      var fu = (t - flashStart) / Math.max(0.05, nukeStart - flashStart);
      state.nukeFlash = fu < 0.2 ? (fu / 0.2) : (fu < 0.85 ? 1 : Math.max(0, 1 - (fu - 0.85) / 0.15));
      state.nukePlateUnderFlash = true;
      // sega31v: swap to postnuke Austin under whiteout so reveal shows ruined skyline
      if (nb.usePostnukeAustinPlates !== false && cfg(state).postNukeUseAustinPlates !== false &&
          state.backgroundPlatesPostnuke) {
        state.postNukeAustin = true;
        state.forceBgStyle = null;
      }
      // Under whiteout: hold full bright B&W so reveal after flash is grayscale
      state.nukePostFlashBw = 1;
    } else if (t >= nukeStart && t < nukeEnd) {
      state.nukeFlash = 0;
      state.nukePlateUnderFlash = true; // keep plate through blast pulse
      if (nb.usePostnukeAustinPlates !== false && cfg(state).postNukeUseAustinPlates !== false &&
          state.backgroundPlatesPostnuke) {
        state.postNukeAustin = true;
        state.forceBgStyle = null;
      }
      // Fade bright B&W → original full-color over nukePostFlashBwToColorSec
      var bwElapsed = t - nukeStart;
      state.nukePostFlashBw = bwElapsed < bwSec ? Math.max(0, 1 - bwElapsed / bwSec) : 0;
    } else if (t >= nukeEnd) {
      state.nukeFlash = 0;
      state.nukePlateUnderFlash = false;
      var bwElapsed2 = t - nukeStart;
      state.nukePostFlashBw = (bwElapsed2 < bwSec) ? Math.max(0, 1 - bwElapsed2 / bwSec) : 0;
    } else {
      state.nukeFlash = 0;
      state.nukePlateUnderFlash = false;
      state.nukePostFlashBw = 0;
      state.postNukeAustin = false;
    }

    // Postapoc / postnuke Austin after nuke ends
    // sega31j: nuclearWinterDisabled / skip winter grayscale — stay color dayglow
    // sega31v: prefer matching background-*-postnuke.png when loaded
    var winterOff = !!(nb.nuclearWinterDisabled || nb.skipWinterGrayscale ||
      cfg(state).nuclearWinterDisabled || cfg(state).nukeNoNuclearWinterBw ||
      cfg(state).nukeSkipWinterGrayscale || nb.winterGrayscaleAll === false);
    var usePostnuke = !!(nb.usePostnukeAustinPlates !== false &&
      (cfg(state).postNukeUseAustinPlates !== false) &&
      state.backgroundPlatesPostnuke);
    if (t >= nukeEnd && (t < winterStart || winterOff)) {
      state.postNukeAustin = !!usePostnuke;
      // Keep forceBgStyle for postapoc fallback when postnuke plates unavailable
      state.forceBgStyle = usePostnuke ? null : (nb.afterBg || "postapoc-dayglow");
      state.nuclearWinter = false;
      state.winterGrayscale = false;
      if (winterOff && t >= winterStart) {
        // keep color; optional rubble roadside only if not fully disabled winter props
        if (!nb.nuclearWinterDisabled && !cfg(state).nuclearWinterDisabled) {
          state.winterRoadside = nb.winterRoadside || "rubble";
        }
      }
    } else if (t >= winterStart) {
      state.postNukeAustin = false;
      state.forceBgStyle = nb.winterBg || "nuclear-winter";
      state.nuclearWinter = true;
      state.winterGrayscale = nb.winterGrayscaleAll !== false;
      state.winterRoadside = nb.winterRoadside || "rubble";
    }
  }

  function updateBossZapStorm(state, dt, t) {
    var ff = cfg(state).finaleFight || {};
    var deadline = ff.deadline != null ? ff.deadline : 215.96;
    var before = cfg(state).bossZapStormBeforeStoryboardSec != null ? cfg(state).bossZapStormBeforeStoryboardSec : 3;
    var startStorm = deadline - before; // ~212.96
    var interval = cfg(state).bossZapStormIntervalSec != null ? cfg(state).bossZapStormIntervalSec : 2.0;

    if (state.finaleMode !== "fight" || state.finaleWon || state.finaleLost || state.bossDefeatBeat) {
      state.bossZapStorm = false;
      return;
    }
    if (t < startStorm || t >= deadline) {
      state.bossZapStorm = false;
      return;
    }
    // Need boss + player alive
    var bossAlive = false;
    if (state.brains) {
      for (var i = 0; i < state.brains.length; i++) {
        var b = state.brains[i];
        if (b && b.isBoss && b.alive) { bossAlive = true; break; }
      }
    }
    if (!bossAlive || state.health <= 0) {
      state.bossZapStorm = false;
      return;
    }
    state.bossZapStorm = true;
    state.bossZapStormTimer = (state.bossZapStormTimer || 0) - dt;
    if (state.bossZapStormTimer <= 0) {
      state.bossZapStormTimer = interval;
      // Unavoidable zap
      if (ns.Brains && ns.Brains.fireUnavoidableZap) {
        ns.Brains.fireUnavoidableZap(state);
      } else if (ns.Gameplay && ns.Gameplay.applyDamage) {
        // fallback: direct zap damage + explosion FX
        if (!immuneToZaps(state)) {
          var dmg = (cfg(state).brains && cfg(state).brains.zapDamage) || 30;
          // call through gameplay damage if exposed later
        }
      }
      if (cfg(state).bossZapStormSegaExplode !== false && ns.Fx && ns.Fx.spawnExplosion) {
        ns.Fx.spawnExplosion(state, state.width * (0.3 + Math.random() * 0.4), state.height * (0.35 + Math.random() * 0.3), "sega");
      }
      if (ns.Sfx) { try { ns.Sfx.hurt(); } catch (e) {} }
      // Apply unavoidable damage unless immune
      if (!immuneToZaps(state) && !trainerOn(state, "invincible")) {
        if (ns.Gameplay && ns.Gameplay.forceZapHit) {
          ns.Gameplay.forceZapHit(state);
        } else {
          state._pendingUnavoidableZap = true;
        }
      }
    }
  }

  function bindCybercabFolder(imagesByPath, folder, targetMap) {
    var i, j, key, path, img;
    for (i = 0; i < CAR_NAMES.length; i++) {
      for (j = 0; j < CYBERCAB_COLORS.length; j++) {
        key = CAR_NAMES[i] + ":" + CYBERCAB_COLORS[j].id;
        path = folder + "/" + CAR_NAMES[i].toLowerCase() + "-" + CYBERCAB_COLORS[j].id;
        img = imagesByPath[path] || imagesByPath[path + ".png"] || imagesByPath["images/" + path] || imagesByPath["images/" + path + ".png"];
        if (img && (img.naturalWidth > 0 || img.width > 0)) { // sega44: failed load → atlas fallback
          targetMap[key] = {
            img: img,
            x: 0, y: 0,
            w: img.width || img.naturalWidth || 80,
            h: img.height || img.naturalHeight || 56
          };
        }
      }
    }
  }

  function bindCybercabPrebakes(imagesByPath) {
    // Soft modern prebakes (kept loaded but soft path OFF for ship when cybercabSoftPrebakeDisabledForShip)
    ns._cybercabPrebake = ns._cybercabPrebake || {};
    bindCybercabFolder(imagesByPath, "cybercab-prebake", ns._cybercabPrebake);
    // sega31r B: NN + limited-palette reprocessed prebakes
    ns._cybercabPixel = ns._cybercabPixel || {};
    bindCybercabFolder(imagesByPath, "cybercab-pixel", ns._cybercabPixel);
    // C hand-pixel (optional; pending art — mix falls back to B)
    ns._cybercabHandpixel = ns._cybercabHandpixel || {};
    bindCybercabFolder(imagesByPath, "cybercab-handpixel", ns._cybercabHandpixel);
  }

  function cybercabMapHasEntries(map) {
    var k;
    if (!map) return false;
    for (k in map) { if (Object.prototype.hasOwnProperty.call(map, k)) return true; }
    return false;
  }

  function pickCybercabVariant(cfg) {
    // Returns "B" or "C". Ship B alone until handpixel assets exist / pending cleared.
    var mix = (cfg && cfg.cybercabTrafficMix) || "B+C";
    var pending = !cfg || cfg.cybercabHandPixelPending !== false;
    var canBAlone = !cfg || cfg.cybercabCanShipBAlone !== false;
    var hasC = cybercabMapHasEntries(ns._cybercabHandpixel);
    if (!hasC || pending) {
      return "B"; // C pending — B alone
    }
    if (mix === "B" || mix === "pixel") return "B";
    if (mix === "C" || mix === "handpixel") return "C";
    // B+C mix
    var ratioB = cfg && cfg.cybercabMixRatioB != null ? cfg.cybercabMixRatioB : 0.5;
    var ratioC = cfg && cfg.cybercabMixRatioC != null ? cfg.cybercabMixRatioC : 0.5;
    var sum = ratioB + ratioC;
    if (!(sum > 0)) return "B";
    return (Math.random() * sum < ratioB) ? "B" : "C";
  }

  function pickCybercabSprite(baseSprite, state) {
    var cfg = state && state.config ? state.config : (ns.CONFIG || {});
    var softOff = !cfg || cfg.cybercabSoftPrebakeDisabledForShip !== false;
    var mode = (cfg && cfg.cybercabColorMode) || "pixel";
    var color = CYBERCAB_COLORS[Math.floor(Math.random() * CYBERCAB_COLORS.length)];
    var carName = null;
    if (baseSprite === SPRITES.CAR01) carName = "CAR01";
    else if (baseSprite === SPRITES.CAR02) carName = "CAR02";
    else if (baseSprite === SPRITES.CAR03) carName = "CAR03";
    else if (baseSprite === SPRITES.CAR04) carName = "CAR04";
    else carName = CAR_NAMES[Math.floor(Math.random() * CAR_NAMES.length)];
    var key = carName + ":" + color.id;
    var baked = null;
    var style = "B";
    // Soft modern path only if explicitly enabled and mode=prebake
    if (!softOff && mode === "prebake" && ns._cybercabPrebake && ns._cybercabPrebake[key]) {
      baked = ns._cybercabPrebake[key];
      style = "soft";
    } else {
      style = pickCybercabVariant(cfg);
      if (style === "C" && ns._cybercabHandpixel && ns._cybercabHandpixel[key]) {
        baked = ns._cybercabHandpixel[key];
      } else if (ns._cybercabPixel && ns._cybercabPixel[key]) {
        baked = ns._cybercabPixel[key];
        style = "B";
      } else if (ns._cybercabPrebake && ns._cybercabPrebake[key]) {
        // last resort soft (should not ship)
        baked = ns._cybercabPrebake[key];
        style = "soft";
      }
    }
    if (!baked) return baseSprite;
    return {
      img: baked.img,
      x: 0, y: 0, w: baked.w, h: baked.h,
      colorId: color.id,
      prebaked: true,
      cybercabStyle: style, // "B" | "C" | "soft"
      pixelArt: style === "B" || style === "C"
    };
  }

  function partySpriteList() {
    // paths relative to images/ without .png — common.js appends both
    return [
      "roadside/party/Townfolk-Adult-F-001",
      "roadside/party/Townfolk-Adult-M-001",
      "roadside/party/Townfolk-Adult-F-003",
      "roadside/party/Townfolk-Adult-M-003",
      "roadside/party/Dancer-F-01",
      "roadside/party/Bard-M-01",
      "roadside/party/Clown_01",
      "roadside/party/4dir-PNG-Side-PNG_Sequences-Idle-0_Citizen_Idle_000",
      "roadside/party/Aristocrate-F-01",
      "roadside/party/Mask-M-01"
    ];
  }

  ns.Sega31 = {
    CYBERCAB_COLORS: CYBERCAB_COLORS,
    ensureTrainer: ensureTrainer,
    trainerOn: trainerOn,
    formatTs: formatTs,
    sendTimestamp: sendTimestamp,
    loadTsLog: loadTsLog,
    setElevTier: setElevTier,
    freezeElevForWin: freezeElevForWin,
    onHeartCollected: onHeartCollected,
    updateElevation: updateElevation,
    fliesOverCars: fliesOverCars,
    immuneToZaps: immuneToZaps,
    canZapBrainsFirstPerson: canZapBrainsFirstPerson,
    canShootCars: canShootCars,
    elevCap: elevCap,
    displayMph: displayMph,
    tier3TimerLabel: tier3TimerLabel,
    applyTitleLogoSize: applyTitleLogoSize,
    styleMadMaxFlash: styleMadMaxFlash,
    updateNukeEra: updateNukeEra,
    updateBossZapStorm: updateBossZapStorm,
    bindCybercabPrebakes: bindCybercabPrebakes,
    pickCybercabSprite: pickCybercabSprite,
    partySpriteList: partySpriteList,
    ensureElev: ensureElev
  };
})(window.ApexRacer = window.ApexRacer || {});
