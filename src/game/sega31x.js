(function(ns) {
  // sega31x — first brain, party-crash weather, holding→tunnel arc,
  // chorus2 chaos, win finale pack, Austin scroll, fresh postnuke, sax @ 2nd hold.
  // sega31y: Austin BG scroll travel units fixed (position/segmentLength) + speed 0.002.

  function cfg(state) {
    return (state && state.config) || (ns.CONFIG) || {};
  }

  function songT(state) {
    if (state && state.songClock != null && !isNaN(state.songClock)) return state.songClock;
    if (ns.Sections && ns.Sections.songTime) return ns.Sections.songTime(state);
    return state.elapsed || 0;
  }

  function saxWindow(state) {
    var c = cfg(state);
    var start = c.saxBgStartSec != null ? c.saxBgStartSec : 120.5;
    var end = c.saxBgEndSec != null ? c.saxBgEndSec : 155;
    // Keep Sections.SAX_VIDEO in sync for UI/video loader
    if (ns.Sections && ns.Sections.SAX_VIDEO) {
      ns.Sections.SAX_VIDEO.start = start;
      ns.Sections.SAX_VIDEO.end = end;
    }
    return { start: start, end: end };
  }

  function resetFlags(state) {
    state._firstBrainSpawned = false;
    state._chorus1MediumSpawned = false;
    state._bloodMediumSpawned = false;
    state._bloodMediumId = null;
    state._bloodSpawnAcc = 0;
    state.inTunnel = false;
    state.tunnelApproaching = false;
    state.tunnelExiting = false;
    state.tunnelEntranceVisible = false;
    state.tunnelApproachProgress = 0;
    state.tunnelApproachScale = 0.55;
    state._tunnelBrainSmashDone = false;
    state._tunnelImgsReady = false;
    state._tunnelEntranceImg = null;
    state._tunnelEntered = false;
    state._tunnelExited = false;
    state._tunnelHeartAcc = 0;
    state._tunnelFractalPhase = 0;
    state._tunnelInteriorPhase = 0;
    state._tunnelApproachCleared = false;
    state._tunnelHideRoadside = false;
    state._tunnelDodgeAcc = 0;
    state._tunnelCenterRushAcc = 0;
    state._cyberFlyAcc = 0;
    state._tunnelPath = null;
    state._tunnelDownhillAmp = 0;
    state._tunnelForceElev2 = false;
    // sega35: drive-into fixed mouth (player always visible)
    state._tunnelFreezeRoad = false;
    state._tunnelHideRoad = false;
    state._tunnelPlayerScale = 1;
    state._tunnelPlayerShrink = 0;
    state._tunnelExitShrink = 0;
    state._tunnelBlackFade = 0;
    state._tunnelPlayerOffX = 0;
    state._tunnelPlayerOffY = 0;
    state._tunnelPhase = null; // freeze|shrinkIn|blackIn|inside|shrinkOut|blackOut|roadWait|done
    state._tunnelRoadRestoreAt = null;
    state._tunnelFullBleed = false;
    state.partyCrashWeatherActive = false;
    state._partyCrashFlash = 0;
    state._partyCrashNextBolt = 0;
    state._roadChaosIntensity = 0;
    state._holdingHillAmp = 0;
    state.austinBgScrollOffset = state.austinBgScrollOffset || 0;
    state._austinScrollLastPos = null;
    state._winHeartAcc = 0;
    state._winDropRoadBgT = 0;
    state._winDropRoadBgActive = false;
    state.winRoadBgAlpha = 1;
    state._winStarryReveal = 0;
    state._postNukeFreshApplied = false;
  }

  // --- A) First brain @ ~27s ---
  function updateFirstBrain(state, dt, t) {
    var c = cfg(state);
    if (c.firstBrainEnabled === false) return;
    var at = c.firstBrainAtSec != null ? c.firstBrainAtSec : 27.0;
    if (t < at) return;
    // Enable brains through late verse1 into holding (holding ramp still owns density)
    if (state.sectionId === "verse1" || state.sectionId === "holding" || state.sectionId === "chorus1") {
      if (state.sectionBrains === false && (state.sectionId === "verse1" || t < (c.holdingHillsStartSec != null ? c.holdingHillsStartSec : 40) + 0.5)) {
        state.sectionBrains = true;
      }
    }
    if (state._firstBrainSpawned) return;
    if (state.finaleFight || state.finaleMode === "fight") return;
    if (!ns.Brains || !ns.Brains.spawnBrain) return;
    // Spawn exactly 1 medium just before party-crash lyric
    ns.Brains.spawnBrain(state, { medium: true, kind: "medium" });
    state._firstBrainSpawned = true;
    if (state.brainMaxActive == null || state.brainMaxActive < 1) state.brainMaxActive = 1;
    state.sectionBrains = true;
  }

  // --- C2/C3) Chorus1 medium + blood medium ---
  function updateChorus1Brains(state, dt, t) {
    var c = cfg(state);
    if (!ns.Brains || !ns.Brains.spawnBrain) return;
    if (state.finaleFight || state.finaleMode === "fight" || state.inTunnel) return;

    var c1At = c.chorus1MediumAtSec != null ? c.chorus1MediumAtSec : 59;
    if (!state._chorus1MediumSpawned && t >= c1At && (c.chorus1MediumSpawnTinies !== false)) {
      ns.Brains.spawnBrain(state, {
        medium: true,
        kind: "medium",
        gestatesTinies: true,
        gestationSec: c.chorus1MediumGestationSec != null ? c.chorus1MediumGestationSec : 3.0
      });
      state._chorus1MediumSpawned = true;
      state.sectionBrains = true;
      if (state.brainMaxActive == null || state.brainMaxActive < 2) {
        state.brainMaxActive = Math.max(2, state.brainMaxActive || 0);
      }
    }

    var bloodAt = c.bloodMediumAtSec != null ? c.bloodMediumAtSec : 66.92;
    if (!state._bloodMediumSpawned && t >= bloodAt) {
      var b = ns.Brains.spawnBrain(state, {
        medium: true,
        kind: "medium",
        bloodSpawner: true,
        gestatesTinies: false
      });
      state._bloodMediumSpawned = true;
      state._bloodMediumId = b;
      state._bloodSpawnAcc = 0;
      state.sectionBrains = true;
    }

    // Blood medium keeps spawning 1 brain/sec while alive
    var rate = c.bloodMediumSpawnPerSec != null ? c.bloodMediumSpawnPerSec : 1.0;
    if (state._bloodMediumSpawned && rate > 0 && !state.inTunnel) {
      var alive = false;
      var parent = null;
      var i, brain;
      if (state.brains) {
        for (i = 0; i < state.brains.length; i++) {
          brain = state.brains[i];
          if (brain && brain.alive && brain.bloodSpawner) {
            alive = true;
            parent = brain;
            break;
          }
        }
      }
      if (alive && parent) {
        state._bloodSpawnAcc = (state._bloodSpawnAcc || 0) + dt;
        var every = 1 / Math.max(0.05, rate);
        while (state._bloodSpawnAcc >= every) {
          state._bloodSpawnAcc -= every;
          var child = ns.Brains.spawnBrain(state, {
            tiny: true,
            kind: "tiny",
            sizeScale: 0.42
          });
          if (child && parent) {
            child.x = parent.x + (Math.random() - 0.5) * 40;
            child.y = parent.y + (Math.random() - 0.5) * 30;
          }
        }
      }
    }
  }

  // --- C) Holding hills + D) Chorus2 chaos — runtime road modulation ---
  function chaosIntensity(c, t) {
    if (c.chorus2ChaosEnabled === false) return 0;
    var start = c.chorus2ChaosStartSec != null ? c.chorus2ChaosStartSec : 155;
    var ramp = c.chorus2ChaosRampUpSec != null ? c.chorus2ChaosRampUpSec : 5;
    var easeStart = c.chorus2ChaosEaseDownStartSec != null ? c.chorus2ChaosEaseDownStartSec : 175;
    var easeSec = c.chorus2ChaosEaseDownSec != null ? c.chorus2ChaosEaseDownSec : 10;
    if (t < start) return 0;
    if (t < start + ramp) return Math.max(0, Math.min(1, (t - start) / Math.max(0.01, ramp)));
    if (t < easeStart) return 1;
    if (t < easeStart + easeSec) return Math.max(0, 1 - (t - easeStart) / Math.max(0.01, easeSec));
    return 0;
  }

  function holdingHillAmp(c, t) {
    if (c.holdingHillsEnabled === false) return 0;
    var start = c.holdingHillsStartSec != null ? c.holdingHillsStartSec : 40;
    var ramp = c.holdingHillsRampSec != null ? c.holdingHillsRampSec : 19;
    var maxAmp = c.holdingHillsMaxAmp != null ? c.holdingHillsMaxAmp : 24; // sega32 toned default
    if (t < start) return 0;
    // Hold peak through chorus1 until tunnel
    var tunnelEnter = c.tunnelEnterSec != null ? c.tunnelEnterSec : 87.5;
    if (t >= tunnelEnter) return 0;
    var u = Math.max(0, Math.min(1, (t - start) / Math.max(0.01, ramp)));
    return maxAmp * u;
  }

  function tunnelTimes(state) {
    var c = cfg(state);
    var freezeStart = c.tunnelFreezeStartSec != null ? c.tunnelFreezeStartSec
      : (c.tunnelApproachStartSec != null ? c.tunnelApproachStartSec : 87.5);
    var exit = c.tunnelExitSec != null ? c.tunnelExitSec : 103.44;
    var exitShrinkDur = c.tunnelExitShrinkDurSec != null ? c.tunnelExitShrinkDurSec : 2.5;
    var exitBlackDur = c.tunnelExitBlackDurSec != null ? c.tunnelExitBlackDurSec : 0.4;
    var roadDelay = c.tunnelRoadDelaySec != null ? c.tunnelRoadDelaySec : 3.0;
    return { freeze: freezeStart, restore: exit + exitShrinkDur + exitBlackDur + roadDelay };
  }

  function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  // sega43: 0..1 straightening weight
  function tunnelStraightK(state, t) {
    var c = cfg(state);
    if (c.tunnelApproachEnabled === false) return 0;
    var lead = c.tunnelStraightLeadSec != null ? c.tunnelStraightLeadSec : 0;
    if (!(lead > 0)) return 0;
    var ease = Math.max(0.01, c.tunnelStraightEaseSec != null ? c.tunnelStraightEaseSec : 0.6);
    var tt = tunnelTimes(state);
    var start = tt.freeze - lead;
    if (t < start) return 0;
    if (t < tt.restore) return smooth01((t - start) / ease);
    return 1 - smooth01((t - tt.restore) / ease);
  }

  // sega43: road advance multiplier — ease-out decel reaching 0 exactly at the freeze point
  function tunnelRoadSpeedMult(state) {
    if (tunnelFreezeRoad(state)) return 0;
    var c = cfg(state);
    if (c.tunnelApproachEnabled === false) return 1;
    var dec = c.tunnelDecelSec != null ? c.tunnelDecelSec : 0;
    if (!(dec > 0)) return 1;
    var tt = tunnelTimes(state);
    var t = songT(state);
    if (t < tt.freeze - dec || t >= tt.freeze) return 1;
    var u = (t - (tt.freeze - dec)) / dec;
    return Math.pow(1 - u, 2); // v = v0(1-u)^2 → position eases out, v=0 at freeze
  }

  function ensureSegmentBases(state) {
    if (!state.segments || state._sega31xSegBases) return;
    var n, seg;
    for (n = 0; n < state.segments.length; n++) {
      seg = state.segments[n];
      if (!seg) continue;
      seg._baseCurve = seg.curve;
      seg._baseY1 = seg.p1.world.y;
      seg._baseY2 = seg.p2.world.y;
    }
    state._sega31xSegBases = true;
  }

  function applyRoadModulation(state, t) {
    var c = cfg(state);
    ensureSegmentBases(state);
    if (!state.segments || !state.segments.length) return;

    var hillAmp = holdingHillAmp(c, t);
    var chaos = chaosIntensity(c, t);
    state._holdingHillAmp = hillAmp;
    state._roadChaosIntensity = chaos;

    // sega32: read toned config amps (holdingHillsMaxAmp 24, chorus2Chaos* 36/18/4) — no hard 40/60
    var cHill = (c.chorus2ChaosHillAmp != null ? c.chorus2ChaosHillAmp : 36) * chaos;
    var cBump = (c.chorus2ChaosBumpAmp != null ? c.chorus2ChaosBumpAmp : 18) * chaos;
    var cCurve = (c.chorus2ChaosCurveAmp != null ? c.chorus2ChaosCurveAmp : 4) * chaos;
    var hillNorm = (c.holdingHillsMaxAmp != null ? c.holdingHillsMaxAmp : 24);
    var totalHill = hillAmp + cHill;
    var totalBump = cBump + (hillAmp > 0 ? hillAmp * 0.25 : 0);
    var totalCurve = cCurve + (hillAmp > 0 ? (hillAmp / Math.max(1, hillNorm)) * 2 : 0);

    // sega35: mouth stays fixed — no downhill pitch into camera (legacy opt-in only)
    var enter = c.tunnelEnterSec != null ? c.tunnelEnterSec : 93.5;
    var downSec = c.tunnelApproachDownhillSec != null ? c.tunnelApproachDownhillSec : 3.0;
    var downAmpCfg = c.tunnelApproachDownhillAmp != null ? c.tunnelApproachDownhillAmp : 35;
    var downhillAmp = 0;
    if (c.tunnelApproachDownhillEnabled === true && t >= enter - downSec && t < enter) {
      var dProg = Math.max(0, Math.min(1, (t - (enter - downSec)) / Math.max(0.05, downSec)));
      downhillAmp = downAmpCfg * dProg;
    }
    state._tunnelDownhillAmp = downhillAmp;

    // sega43: force road straight + flat for tunnelStraightLeadSec before the mouth (freeze),
    // eased in over tunnelStraightEaseSec; eased back out after road restore.
    var straightK = tunnelStraightK(state, t);
    state._tunnelStraightK = straightK;

    // Only rewrite a window ahead of the player (cheap + reversible)
    var baseIdx = 0;
    try {
      if (ns.Track && ns.Track.findSegment) {
        baseIdx = ns.Track.findSegment(state, state.position).index;
      }
    } catch (e0) {}
    var draw = state.drawDistance || 300;
    var i, idx, seg, len, segLen;
    len = state.segments.length;
    segLen = state.segmentLength || 200;
    // sega34: continuous elevation along track index so adjacent segs share endpoints (no road tears)
    var yAt = function(segIndex) {
      var ph = (segIndex + t * 8) * 0.085;
      return Math.sin(ph) * totalHill * segLen * 0.35
        + Math.sin(ph * 2.7) * totalBump * segLen * 0.12;
    };
    var curveAt = function(segIndex) {
      var ph = (segIndex + t * 8) * 0.085;
      return Math.sin(ph * 0.55 + t * 0.4) * totalCurve
        + Math.sin(ph * 1.3) * totalCurve * 0.35;
    };
    if (straightK > 0 && state._tunnelFlatY == null) {
      var pSeg = state.segments[baseIdx];
      state._tunnelFlatY = pSeg ? pSeg.p1.world.y : 0;
    } else if (straightK <= 0) {
      state._tunnelFlatY = null;
    }
    var flatY = state._tunnelFlatY || 0;
    var keep = 1 - straightK;
    for (i = 0; i < draw; i++) {
      idx = (baseIdx + i) % len;
      seg = state.segments[idx];
      if (!seg || seg._baseCurve == null) continue;
      seg.curve = (seg._baseCurve + curveAt(seg.index)) * keep;
      // Negative pitch toward vanishing point (far segs lower) — ROAD.HILL-style downhill
      var down1 = downhillAmp > 0 ? -(i / Math.max(1, draw)) * downhillAmp * segLen * 0.45 : 0;
      var down2 = downhillAmp > 0 ? -((i + 1) / Math.max(1, draw)) * downhillAmp * segLen * 0.45 : 0;
      var y1 = seg._baseY1 + yAt(seg.index) + down1;
      var y2 = seg._baseY2 + yAt(seg.index + 1) + down2;
      seg.p1.world.y = straightK > 0 ? (y1 * keep + flatY * straightK) : y1;
      seg.p2.world.y = straightK > 0 ? (y2 * keep + flatY * straightK) : y2;
    }
  }

  // --- C4/C5) Tunnel ---
  function ensureTunnelImages(state) {
    var c = cfg(state);
    if (state._tunnelImgsReady) return;
    state._tunnelImgsReady = true;
    state._tunnelEntranceImg = null;
    state._tunnelInteriorImgs = [];
    // sega44: resilient relative loads (retry + cache-bust), cached across runs; queued by song time
    // when preloaded from app ready (preloadTunnelImages), else loaded directly on demand.
    function loadOne(src, onOk) {
      if (!src) return;
      var ent = TUNNEL_IMG_CACHE[src];
      if (ent) {
        if (ent.img._loadState === "ok") onOk(ent.img);
        else if (ent.img._loadState !== "failed") ent.cbs.push(onOk);
        return;
      }
      ent = TUNNEL_IMG_CACHE[src] = { img: null, cbs: [onOk] };
      var opts = {
        onload: function(img) { var cbs = ent.cbs; ent.cbs = []; cbs.forEach(function(cb) { try { cb(img); } catch (e) {} }); },
        onerror: function() { ent.cbs = []; /* keep null / skip */ }
      };
      if (state._tunnelPreloadPrio != null && typeof LazyAssets !== "undefined") {
        ent.img = LazyAssets.add(state._tunnelPreloadPrio, src, null, opts);
      } else if (typeof AssetLoader !== "undefined") {
        ent.img = AssetLoader.image(null, src, opts);
      } else {
        ent.img = new Image();
        ent.img.onload = function() { ent.img._loadState = "ok"; opts.onload(ent.img); };
        ent.img.src = src + (src.indexOf('?') >= 0 ? '' : '?v=sega44');
      }
    }
    var ent = c.tunnelEntranceAsset || 'images/fx/tunnel-entrance.png';
    loadOne(ent, function(img) { state._tunnelEntranceImg = img; });
    var frames = c.tunnelInteriorFrames;
    var nFrames = c.tunnelInteriorAnimFrames != null ? c.tunnelInteriorAnimFrames : 6;
    var i, src;
    if (frames && frames.length) {
      for (i = 0; i < frames.length; i++) {
        (function(idx, s) {
          loadOne(s, function(img) {
            state._tunnelInteriorImgs[idx] = img;
          });
        })(i, frames[i]);
      }
    } else {
      var prefix = c.tunnelInteriorFramePrefix || 'images/fx/tunnel-interior-f';
      var ext = c.tunnelInteriorFrameExt || '.png';
      for (i = 1; i <= nFrames; i++) {
        src = prefix + (i < 10 ? '0' + i : '' + i) + ext;
        (function(idx, s) {
          loadOne(s, function(img) { state._tunnelInteriorImgs[idx] = img; });
        })(i - 1, src);
      }
    }
  }

  var TUNNEL_IMG_CACHE = {};
  function preloadTunnelImages(state, prio) {
    state._tunnelPreloadPrio = prio != null ? prio : 85;
    state._tunnelImgsReady = false;
    try { ensureTunnelImages(state); } finally { state._tunnelPreloadPrio = null; }
  }

  function tunnelInteriorReady(state) {
    var imgs = state._tunnelInteriorImgs || [];
    var i, n = 0;
    for (i = 0; i < imgs.length; i++) {
      if (imgs[i] && imgs[i].complete && imgs[i].naturalWidth > 8) n++;
    }
    return n >= 3; // need a few real frames; stubs are tiny but still valid if >8px
  }

  function despawnBrainsSilent(state) {
    if (!state.brains || !state.brains.length) return;
    var i, b;
    for (i = state.brains.length - 1; i >= 0; i--) {
      b = state.brains[i];
      if (!b || !b.alive) continue;
      if (b.isBoss || b.bossDying) continue;
      b.alive = false;
      b.hp = 0;
      // silent — no wall smash / explosion FX
    }
    state.brains = state.brains.filter(function(br) {
      return br && (br.alive || br.bossDying || br.isBoss);
    });
    state.shots = [];
    state.lightningBolts = [];
  }

  function clearApproachWindow(state) {
    var c = cfg(state);
    state._tunnelApproachCleared = true;
    if (c.tunnelApproachClearTraffic !== false) {
      state.sectionTraffic = false;
      state._spawnCarsFromHorizon = false;
      if (ns.Sections && ns.Sections.clearTraffic) {
        state._hardClearTraffic = true;
        ns.Sections.clearTraffic(state);
        state._hardClearTraffic = false;
      } else if (state.cars) {
        state.cars = [];
      }
    }
    if (c.tunnelApproachClearRoadside !== false) {
      state._tunnelHideRoadside = true;
      // Clear upcoming roadside sprites so nothing new scrolls into view
      try {
        if (state.segments && state.segments.length && ns.Track && ns.Track.findSegment) {
          var base = ns.Track.findSegment(state, state.position);
          var draw = state.drawDistance || 300;
          var i, idx, seg;
          for (i = 0; i < draw; i++) {
            idx = (base.index + i) % state.segments.length;
            seg = state.segments[idx];
            if (seg && seg.sprites && seg.sprites.length) seg.sprites = [];
          }
        }
      } catch (eClear) {}
    }
    if (c.tunnelApproachDespawnBrains !== false) {
      despawnBrainsSilent(state);
      state._tunnelBrainSmashDone = true;
    }
  }

  function laneScreenXLocal(state, lane) {
    if (ns.Brains && ns.Brains.laneScreenX) return ns.Brains.laneScreenX(state, lane);
    var offsets = (state.config && state.config.laneOffsets) || [-0.55, 0.55];
    var idx = Math.max(0, Math.min(offsets.length - 1, lane | 0));
    return state.width / 2 + offsets[idx] * state.width * 0.22;
  }

  function spawnTunnelDodgeBrain(state) {
    var c = cfg(state);
    if (!ns.Brains || !ns.Brains.spawnBrain) return null;
    var lane = (c.tunnelDodgeRandomLane !== false)
      ? (Math.random() < 0.5 ? 0 : 1)
      : (state.lane != null ? state.lane : 0);
    var h = state.height || 720;
    var horizonY = (state._roadHorizonY != null) ? state._roadHorizonY : (h * 0.42);
    // Spawn near vanishing/horizon band; grow toward player
    var brain = ns.Brains.spawnBrain(state, {
      medium: true,
      kind: (c.tunnelDodgeBrainKind || 'medium'),
      x: laneScreenXLocal(state, lane),
      y: Math.max(40, horizonY - 8),
      sizeScale: (state.config && state.config.mediumBrainScale != null) ? state.config.mediumBrainScale : 1.25,
      startScale: 0.03,
      fastGrow: false
    });
    if (!brain) return null;
    brain.tunnelDodge = true;
    brain.noFight = true;
    brain.vx = 0;
    brain.lane = lane;
    brain.attackLane = lane;
    brain.zapTimer = 99999;
    brain.postGrowDelay = 99999;
    brain.telegraph = 0;
    brain.kamikaze = false;
    brain.approach = 0.03;
    brain.approachSpeed = 1 / 1.65;
    brain.baseY = Math.max(40, horizonY - 8);
    brain.y = brain.baseY;
    // Drift slightly toward mid-playfield while approaching
    brain.targetBaseY = h * 0.50;
    var bobFrac = c.tunnelDodgeBobAmp != null ? c.tunnelDodgeBobAmp : 0.03;
    brain.bobAmp = h * bobFrac;
    brain.bobHz = c.tunnelDodgeBobHz != null ? c.tunnelDodgeBobHz : 0.7;
    brain.bobPhase = Math.random() * Math.PI * 2;
    brain._tunnelHitDone = false;
    return brain;
  }


  function countTunnelCenterRush(state) {
    var n = 0, i, b;
    if (!state.brains) return 0;
    for (i = 0; i < state.brains.length; i++) {
      b = state.brains[i];
      if (b && b.alive && b.tunnelCenterRush) n++;
    }
    return n;
  }

  function spawnTunnelCenterRushBrain(state) {
    var c = cfg(state);
    if (!ns.Brains || !ns.Brains.spawnBrain) return null;
    var w = state.width || 640;
    var h = state.height || 720;
    var cx = w * 0.5;
    var horizonY = (state._roadHorizonY != null) ? state._roadHorizonY : (h * 0.42);
    // Vanishing-point / screen-center origin (not lane-based horizon spawn)
    var cy = horizonY;
    var scale = c.tunnelCenterRushScale != null ? c.tunnelCenterRushScale : 0.32;
    var rushSpd = c.tunnelCenterRushApproachSpeed != null ? c.tunnelCenterRushApproachSpeed : 0.72;
    var brain = ns.Brains.spawnBrain(state, {
      tiny: true,
      kind: 'tiny',
      x: cx,
      y: cy,
      sizeScale: scale,
      startScale: 0.04,
      fastGrow: false
    });
    if (!brain) return null;
    brain.tunnelCenterRush = true;
    brain.noFight = true;
    brain.vx = 0;
    brain.spawnCx = cx;
    brain.spawnCy = cy;
    brain.x = cx;
    brain.y = cy;
    brain.baseY = cy;
    brain.approach = 0.04;
    brain.approachSpeed = rushSpd;
    brain.rushSpeed = rushSpd;
    brain.zapTimer = 99999;
    brain.postGrowDelay = 99999;
    brain.telegraph = 0;
    brain.kamikaze = false;
    brain.bobAmp = h * 0.008;
    brain.bobPhase = Math.random() * Math.PI * 2;
    brain._tunnelHitDone = false;
    brain.lane = state.lane != null ? state.lane : 0;
    brain.attackLane = brain.lane;
    brain._aimX = cx;
    brain._aimY = cy;
    // sega43: fair tinies — appear (harmless fade/scale-in) → hover queue → wind-up → one launch
    brain.rushPhase = 'appear';
    brain.rushT = 0;
    brain.fadeAlpha = 0;
    brain.hoverSlot = pickTinySlot(state);
    return brain;
  }

  function pickTinySlot(state) {
    var used = {}, i, b;
    for (i = 0; i < (state.brains || []).length; i++) {
      b = state.brains[i];
      if (b && b.alive && b.tunnelCenterRush && (b.rushPhase === 'appear' || b.rushPhase === 'hover' || b.rushPhase === 'windup')) used[b.hoverSlot] = true;
    }
    var order = [0, 1, 2, 3, 4];
    for (i = 0; i < order.length; i++) if (!used[order[i]]) return order[i];
    return 0;
  }

  function countTinyQueued(state) {
    var n = 0, i, b;
    for (i = 0; i < (state.brains || []).length; i++) {
      b = state.brains[i];
      if (b && b.alive && b.tunnelCenterRush && b.rushPhase !== 'launch') n++;
    }
    return n;
  }

  function tickTunnelCenterRushSpawn(state, dt) {
    var c = cfg(state);
    if (c.tunnelCenterRushEnabled === false) return;
    var every = c.tunnelCenterRushSpawnEverySec != null ? c.tunnelCenterRushSpawnEverySec : 0.75;
    if (!(every > 0)) return;
    state._tunnelCenterRushAcc = (state._tunnelCenterRushAcc || 0) + dt;
    var maxActive = c.tunnelCenterRushMaxActive != null ? c.tunnelCenterRushMaxActive : 7;
    while (state._tunnelCenterRushAcc >= every) {
      state._tunnelCenterRushAcc -= every;
      var maxQ = c.tinyBrainMaxQueued != null ? c.tinyBrainMaxQueued : 3;
      if (countTunnelCenterRush(state) < maxActive && countTinyQueued(state) < maxQ) {
        spawnTunnelCenterRushBrain(state);
      }
    }
  }

  function forceTunnelElev(state, tier) {
    if (ns.Sega31 && ns.Sega31.setElevTier) {
      if ((state.elevTier || 1) !== tier) {
        ns.Sega31.setElevTier(state, tier, { fromTrainer: true });
      }
    } else {
      state.elevTier = tier;
    }
    if (tier >= 2) {
      // Hold continuous-altitude ceiling / legacy aloft so sink/timer cannot drop mid-tunnel
      state.elevFloatHoldTimer = Math.max(state.elevFloatHoldTimer || 0, 1.0);
      state.tier2AloftTimer = Math.max(state.tier2AloftTimer || 0, 1.0);
      state._tunnelForceElev2 = true;
    }
  }

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function computeTunnelPath(state, t) {
    var c = cfg(state);
    var enter = state._tunnelInteriorStart != null ? state._tunnelInteriorStart
      : (c.tunnelEnterSec != null ? c.tunnelEnterSec : 93.5); // sega43: interior starts after black hold
    var exit = c.tunnelExitSec != null ? c.tunnelExitSec : 103.44;
    var u = 0;
    if (exit > enter) u = Math.max(0, Math.min(1, (t - enter) / (exit - enter)));
    var turnAmp = c.tunnelInteriorPathTurnAmp != null ? c.tunnelInteriorPathTurnAmp : 0.22;
    var pitchAmp = c.tunnelInteriorPathPitchAmp != null ? c.tunnelInteriorPathPitchAmp : 0.10;
    var twistAmpDeg = c.tunnelInteriorPathTwistAmpDeg != null ? c.tunnelInteriorPathTwistAmpDeg : 25;
    var hz = c.tunnelInteriorPathHz != null ? c.tunnelInteriorPathHz : 0.15;
    var twistAmp = twistAmpDeg * Math.PI / 180;
    var script = String(c.tunnelInteriorPathScript || 'easeL,twist,easeR,straight').split(',');
    var nPh = Math.max(1, script.length);
    var phaseIdx = Math.min(nPh - 1, Math.floor(u * nPh));
    var local = (u * nPh) - phaseIdx;
    var name = (script[phaseIdx] || 'straight').trim().toLowerCase();
    var turn = 0, pitch = 0, twist = 0;
    var e = easeInOutCubic(Math.max(0, Math.min(1, local)));
    if (name === 'easel' || name === 'easeleft' || name === 'left') {
      turn = -turnAmp * e;
      pitch = pitchAmp * 0.55 * e; // downhill bias
    } else if (name === 'twists' || name === 'twist') {
      turn = -turnAmp * (1 - e) * 0.65 + turnAmp * e * 0.25;
      twist = twistAmp * Math.sin(e * Math.PI);
      pitch = pitchAmp * (0.45 + 0.55 * Math.sin(e * Math.PI));
    } else if (name === 'easer' || name === 'easeright' || name === 'right') {
      turn = turnAmp * e;
      pitch = pitchAmp * 0.35 * (1 - e * 0.5);
    } else {
      // straight — settle
      turn = turnAmp * (1 - e) * 0.2;
      pitch = pitchAmp * 0.12 * (1 - e);
      twist = 0;
    }
    if (c.tunnelInteriorPathEnabled !== false) {
      turn += Math.sin(t * hz * Math.PI * 2) * turnAmp * 0.12;
      pitch += Math.sin(t * hz * Math.PI * 2 * 0.7 + 1.2) * pitchAmp * 0.08;
    }
    var path = {
      vpX: 0.5 + turn,
      vpY: 0.48 + pitch,
      twist: twist,
      u: u,
      phase: name
    };
    state._tunnelPath = path;
    return path;
  }

  function updateTunnel(state, dt, t) {
    var c = cfg(state);
    var approachOn = c.tunnelApproachEnabled !== false;
    // sega35 voice redesign: fixed mouth + player shrink-in/out (always visible) + delayed road
    var freezeStart = c.tunnelFreezeStartSec != null ? c.tunnelFreezeStartSec
      : (c.tunnelApproachStartSec != null ? c.tunnelApproachStartSec : 87.5);
    var enter = c.tunnelEnterSec != null ? c.tunnelEnterSec : 93.5;
    var exit = c.tunnelExitSec != null ? c.tunnelExitSec : 103.44;
    var shrinkDur = c.tunnelPlayerShrinkDurSec != null ? c.tunnelPlayerShrinkDurSec : 2.8;
    var blackDur = c.tunnelBlackDurSec != null ? c.tunnelBlackDurSec : 0.45;
    var exitShrinkDur = c.tunnelExitShrinkDurSec != null ? c.tunnelExitShrinkDurSec : 2.5;
    var exitBlackDur = c.tunnelExitBlackDurSec != null ? c.tunnelExitBlackDurSec : 0.4;
    var roadDelay = c.tunnelRoadDelaySec != null ? c.tunnelRoadDelaySec : 3.0;
    var minScale = c.tunnelPlayerMinScale != null ? c.tunnelPlayerMinScale : 0.12;
    var mouthScale = c.tunnelMouthFixedScale != null ? c.tunnelMouthFixedScale : 0.55;
    var visibleSec = c.tunnelEntranceVisibleSec != null ? c.tunnelEntranceVisibleSec : 90.5;
    // sega43: entry move at tunnelEnterSpeedMult (0.5 = half speed = 2x duration); black-in stays
    // glued to its end and tunnelEnterSec (full entry) is unchanged, so inside time is not cut.
    var enterMult = c.tunnelEnterSpeedMult != null ? c.tunnelEnterSpeedMult : 1;
    if (enterMult > 0) shrinkDur = shrinkDur / enterMult;
    // sega43: pure-black hold after full entry; interior starts later (exit cue fixed → trims interior start)
    var holdSec = Math.max(0, c.tunnelBlackHoldSec != null ? c.tunnelBlackHoldSec : 0);
    var interiorStart = Math.min(enter + holdSec, exit);
    var exitFadeSec = Math.max(0, c.tunnelExitFadeInSec != null ? c.tunnelExitFadeInSec : 0);

    // Derive shrink-in window so black ends at tunnelEnterSec
    var blackInStart = enter - blackDur;
    var shrinkInStart = blackInStart - shrinkDur;
    if (shrinkInStart < freezeStart) shrinkInStart = freezeStart;
    shrinkDur = Math.max(0.05, blackInStart - shrinkInStart);
    var exitShrinkEnd = exit + exitShrinkDur;
    var exitBlackEnd = exitShrinkEnd + exitBlackDur;
    var roadRestoreAt = exitBlackEnd + roadDelay;

    var was = !!state.inTunnel;
    ensureTunnelImages(state);

    // Defaults each frame
    state._tunnelFreezeRoad = false;
    state._tunnelHideRoad = false;
    state.tunnelExiting = false;
    state._tunnelBlackFade = 0;
    state._tunnelPlayerOffX = 0;
    state._tunnelPlayerOffY = 0;

    if (!approachOn) {
      state.tunnelApproaching = false;
      state.tunnelEntranceVisible = false;
      state.inTunnel = (t >= enter && t < exit);
      state._tunnelPlayerScale = 1;
      state._tunnelPlayerShrink = 0;
      state._tunnelExitShrink = 0;
      state._tunnelPhase = state.inTunnel ? 'inside' : null;
      return;
    }

    // --- Clear traffic / brains once freeze begins ---
    if (t >= freezeStart && t < roadRestoreAt) {
      if (!state._tunnelApproachCleared) clearApproachWindow(state);
      state.sectionTraffic = false;
      state._spawnCarsFromHorizon = false;
      if (c.tunnelApproachClearRoadside !== false) state._tunnelHideRoadside = true;
    }

    var phase = null;
    var playerScale = 1;
    var shrinkU = 0;
    var exitU = 0;
    var blackFade = 0;
    var approaching = false;
    var inTunnel = false;
    var exiting = false;
    var freezeRoad = false;
    var hideRoad = false;

    if (t < freezeStart) {
      phase = null;
    } else if (t < shrinkInStart) {
      // Mouth fixed, road frozen, player full size
      phase = 'freeze';
      approaching = true;
      freezeRoad = true;
    } else if (t < blackInStart) {
      // Player shrinks toward fixed mouth (sprite stays visible)
      phase = 'shrinkIn';
      approaching = true;
      freezeRoad = true;
      shrinkU = Math.max(0, Math.min(1, (t - shrinkInStart) / Math.max(0.05, shrinkDur)));
      var easeIn = easeInOutCubic(shrinkU);
      playerScale = 1 - (1 - minScale) * easeIn;
    } else if (t < enter) {
      // Black cover into interior
      phase = 'blackIn';
      approaching = true;
      freezeRoad = true;
      hideRoad = true;
      playerScale = minScale;
      shrinkU = 1;
      blackFade = Math.max(0, Math.min(1, (t - blackInStart) / Math.max(0.05, blackDur)));
    } else if (t < interiorStart) {
      // sega43: pure-black hold — nothing drawn/spawned/moving (renderer paints black over all)
      phase = 'blackHold';
      freezeRoad = true;
      hideRoad = true;
      playerScale = minScale;
      shrinkU = 1;
      blackFade = 1;
    } else if (t < exit) {
      // Inside procedural tunnel — player full size, always drawn
      phase = 'inside';
      inTunnel = true;
      freezeRoad = true;
      hideRoad = true;
      playerScale = 1;
      shrinkU = 0;
    } else if (t < exitShrinkEnd) {
      // Exit mirror: shrink into distance while still on interior
      phase = 'shrinkOut';
      inTunnel = true;
      exiting = true;
      freezeRoad = true;
      hideRoad = true;
      exitU = Math.max(0, Math.min(1, (t - exit) / Math.max(0.05, exitShrinkDur)));
      var easeOut = easeInOutCubic(exitU);
      playerScale = 1 - (1 - minScale) * easeOut;
    } else if (t < exitBlackEnd) {
      phase = 'blackOut';
      exiting = true;
      freezeRoad = true;
      hideRoad = true;
      playerScale = minScale;
      exitU = 1;
      blackFade = Math.max(0, Math.min(1, (t - exitShrinkEnd) / Math.max(0.05, exitBlackDur)));
    } else if (t < roadRestoreAt) {
      // After exit: exterior without road scroll for +roadDelaySec
      // sega40: NO post-exit mouth — approaching stays false (mouth was approach-only)
      phase = 'roadWait';
      freezeRoad = true;
      hideRoad = true;
      playerScale = 1;
      exitU = 1;
      approaching = false;
      // sega43: fade up from black onto the NEW post-tunnel BG (was a hard cut)
      if (exitFadeSec > 0) {
        blackFade = Math.max(0, 1 - (t - exitBlackEnd) / exitFadeSec);
      }
    } else {
      phase = 'done';
      playerScale = 1;
    }

    state._tunnelPhase = phase;
    state.tunnelApproaching = approaching;
    state.tunnelExiting = exiting;
    state.inTunnel = inTunnel;
    state._tunnelFreezeRoad = freezeRoad;
    state._tunnelHideRoad = hideRoad;
    state._tunnelPlayerScale = playerScale;
    state._tunnelPlayerShrink = shrinkU;
    state._tunnelExitShrink = exitU;
    state._tunnelBlackFade = blackFade;
    state.tunnelApproachScale = mouthScale;
    state.tunnelApproachProgress = approaching
      ? Math.max(0, Math.min(1, (t - freezeStart) / Math.max(0.05, enter - freezeStart)))
      : (phase === 'roadWait' ? 1 : 0);
    // sega40: mouth ONLY during approach (freeze/shrinkIn/blackIn). Off on enter + after exit.
    state.tunnelEntranceVisible = !!approaching;
    if (phase === 'inside' || phase === 'shrinkOut' || phase === 'blackOut' || phase === 'roadWait' || phase === 'done') {
      state.tunnelEntranceVisible = false;
      state.tunnelApproaching = false;
      approaching = false;
    }

    // Player offset toward mouth / interior VP while shrinking (screen-space hint for renderer)
    if (shrinkU > 0 || (exitU > 0 && (phase === 'shrinkOut' || phase === 'blackOut'))) {
      var u = shrinkU > 0 ? shrinkU : exitU;
      var ease = easeInOutCubic(u);
      // Move toward horizon vanishing point (up-screen); X stays centered
      state._tunnelPlayerOffY = -ease * 0.42; // fraction of height upward
      state._tunnelPlayerOffX = 0;
    }

    // Force elev on approach / inside
    if (approaching && state.tunnelEntranceVisible && c.tunnelForceTier1OnEntranceVisible !== false) {
      forceTunnelElev(state, 1);
      state._tunnelForceElev2 = false;
    }
    if (inTunnel && c.tunnelForceElevTier2 !== false) {
      forceTunnelElev(state, 2);
    }

    // Enter edge
    if (inTunnel && !was && phase === 'inside') {
      state._tunnelEntered = true;
      if (!state._tunnelBrainSmashDone) {
        if (c.tunnelBrainSmashOnEntrance === true) smashBrainsOnHill(state);
        else despawnBrainsSilent(state);
        state._tunnelBrainSmashDone = true;
      }
      state.sectionTraffic = false;
      state._spawnCarsFromHorizon = false;
      state._tunnelHideRoadside = true;
      if (ns.Sections && ns.Sections.clearTraffic) {
        state._hardClearTraffic = true;
        ns.Sections.clearTraffic(state);
        state._hardClearTraffic = false;
      } else if (state.cars) {
        state.cars = [];
      }
      state._tunnelHeartAcc = 0;
      // sega38: clear any falling hearts on enter (no hearts in tunnel)
      if (state.pickups && state.pickups.length) state.pickups = [];
      state._tier3HeartBurst = 0;
      state._tunnelFractalPhase = 0;
      state._tunnelInteriorPhase = 0;
      state._tunnelDodgeAcc = 0;
      state._tunnelCenterRushAcc = 0;
      state._cyberFlyAcc = 0;
      if (ns.CyberFlies && ns.CyberFlies.clearAll) ns.CyberFlies.clearAll(state);
      else state.cyberFlies = [];
      state._tunnelFullBleed = false;
    }

    // sega43: black hold — despawn everything once, block spawns/motion
    if (phase === 'blackHold') {
      if (!state._tunnelHoldCleared) {
        state._tunnelHoldCleared = true;
        despawnBrainsSilent(state);
        if (state.pickups && state.pickups.length) state.pickups = [];
        if (state.cars && state.cars.length) {
          if (ns.Sections && ns.Sections.clearTraffic) {
            state._hardClearTraffic = true; ns.Sections.clearTraffic(state); state._hardClearTraffic = false;
          } else state.cars = [];
        }
      }
      state.sectionTraffic = false;
      state.sectionPickups = false;
      state.sectionBrains = false;
      state._spawnCarsFromHorizon = false;
      state._tunnelHideRoadside = true;
      state.tunnelEntranceVisible = false;
      state.tunnelApproaching = false;
    } else if (phase !== 'blackIn') {
      state._tunnelHoldCleared = false;
    }
    state._tunnelInteriorStart = interiorStart;

    // Leave interior after blackOut starts (was inTunnel)
    if (!inTunnel && was) {
      state._tunnelExited = true;
      state._tunnelForceElev2 = false;
      state._tunnelPath = null;
      state._tunnelDodgeAcc = 0;
      state._tunnelCenterRushAcc = 0;
      if (state.brains && state.brains.length) {
        var bi, bb;
        for (bi = state.brains.length - 1; bi >= 0; bi--) {
          bb = state.brains[bi];
          if (bb && (bb.tunnelDodge || bb.tunnelCenterRush)) {
            bb.alive = false;
            bb.hp = 0;
          }
        }
        state.brains = state.brains.filter(function(br) {
          return br && (br.alive || br.bossDying || br.isBoss);
        });
      }
      // sega38: clear cyber-flies on tunnel exit
      if (ns.CyberFlies && ns.CyberFlies.clearAll) ns.CyberFlies.clearAll(state);
      else state.cyberFlies = [];
      state._cyberFlyAcc = 0;
    }

    // Inside gameplay
    if (inTunnel && phase === 'inside') {
      state.sectionTraffic = false;
      state._spawnCarsFromHorizon = false;
      state._tunnelHideRoadside = true;
      state._tunnelFractalPhase = (state._tunnelFractalPhase || 0) + dt;
      state._tunnelInteriorPhase = (state._tunnelInteriorPhase || 0) + dt;
      if (c.tunnelInteriorPathEnabled !== false) computeTunnelPath(state, t);
      if (c.tunnelForceElevTier2 !== false) forceTunnelElev(state, 2);

      // sega38: tunnel hearts OFF by default (tunnelHeartsEnabled=false)
      if (c.tunnelHeartsEnabled === true) {
        var every = c.tunnelHeartEverySec != null ? c.tunnelHeartEverySec : 1.0;
        state._tunnelHeartAcc = (state._tunnelHeartAcc || 0) + dt;
        if (every > 0 && state._tunnelHeartAcc >= every) {
          state._tunnelHeartAcc -= every;
          if (ns.Sections && ns.Sections.spawnPickup) {
            ns.Sections.spawnPickup(state, { forceSpawn: true, allowMadMax: true, allowTunnel: true });
          }
        }
      } else {
        state._tunnelHeartAcc = 0;
      }

      if (c.tunnelDodgeBrainsEnabled !== false) {
        var spawnEvery = c.tunnelDodgeSpawnEverySec != null ? c.tunnelDodgeSpawnEverySec : 2.0;
        state._tunnelDodgeAcc = (state._tunnelDodgeAcc || 0) + dt;
        if (spawnEvery > 0 && state._tunnelDodgeAcc >= spawnEvery) {
          state._tunnelDodgeAcc -= spawnEvery;
          spawnTunnelDodgeBrain(state);
        }
      }

      // sega39: tiny brains rush from screen center (replaces cyber-flies)
      // cyber-flies disabled via cyberFlyEnabled=false; keep clear hooks only
      if (c.cyberFlyEnabled === true) {
        if (ns.CyberFlies && ns.CyberFlies.tickSpawn) {
          ns.CyberFlies.tickSpawn(state, dt);
        }
      }
      tickTunnelCenterRushSpawn(state, dt);
    } else if (inTunnel && (phase === 'shrinkOut' || phase === 'blackOut')) {
      // Keep interior anim alive during exit shrink; stop new dodge spawns
      state._tunnelFractalPhase = (state._tunnelFractalPhase || 0) + dt;
      state._tunnelInteriorPhase = (state._tunnelInteriorPhase || 0) + dt;
      if (c.tunnelInteriorPathEnabled !== false) computeTunnelPath(state, t);
      state.sectionTraffic = false;
      state._spawnCarsFromHorizon = false;
      state._tunnelHideRoadside = true;
    }

    // Restore roadside after full sequence
    if (phase === 'done' || t >= roadRestoreAt || t < freezeStart) {
      if (t < freezeStart || t >= roadRestoreAt) {
        state._tunnelHideRoadside = false;
        state._tunnelApproachCleared = false;
      }
    }

    state._tunnelRoadRestoreAt = roadRestoreAt;
  }

  function smashBrainsOnHill(state) {
    if (!state.brains || !state.brains.length) return;
    var i, b;
    for (i = state.brains.length - 1; i >= 0; i--) {
      b = state.brains[i];
      if (!b || !b.alive) continue;
      if (b.isBoss || b.bossDying) continue;
      b.alive = false;
      b.hp = 0;
      if (ns.Fx && ns.Fx.spawnExplosion) {
        ns.Fx.spawnExplosion(state, b.x || state.width * 0.5, b.y || state.height * 0.35, "sega", 1.1);
      }
    }
    // Drop dead brains
    state.brains = state.brains.filter(function(br) {
      return br && (br.alive || br.bossDying || br.isBoss);
    });
    state.shots = [];
    state.lightningBolts = [];
  }

  // --- B) Party-crash weather ---
  function updatePartyCrashWeather(state, dt, t) {
    var c = cfg(state);
    if (c.partyCrashWeatherEnabled === false) {
      state.partyCrashWeatherActive = false;
      return;
    }
    var at = c.partyCrashWeatherAtSec != null ? c.partyCrashWeatherAtSec : 28.02;
    var dur = c.partyCrashWeatherDurationSec != null ? c.partyCrashWeatherDurationSec : 12;
    state.partyCrashWeatherActive = t >= at && t < at + dur;
    if (!state.partyCrashWeatherActive) {
      state._partyCrashFlash = Math.max(0, (state._partyCrashFlash || 0) - dt * 4);
      return;
    }
    state._partyCrashNextBolt = (state._partyCrashNextBolt || 0) - dt;
    if (c.partyCrashLightning !== false && state._partyCrashNextBolt <= 0) {
      state._partyCrashFlash = 0.18 + Math.random() * 0.22;
      state._partyCrashNextBolt = 0.6 + Math.random() * 1.8;
    }
    if (state._partyCrashFlash > 0) {
      state._partyCrashFlash = Math.max(0, state._partyCrashFlash - dt * 3.5);
    }
  }

  // --- F) Austin scroll (sega31y: travel = position delta / segmentLength, same as treeOffset) ---
  function updateAustinScroll(state, dt) {
    var c = cfg(state);
    if (c.austinBgScrollEnabled === false) return;
    if (state.inTunnel || state._tunnelFreezeRoad) return;
    // ~22% of treeSpeed 0.009 — gentle crawl once units match gameplay parallax
    var speed = c.austinBgScrollSpeed != null ? c.austinBgScrollSpeed : 0.002;
    var segLen = state.segmentLength || 200;
    var pos = state.position || 0;
    var last = state._austinScrollLastPos;
    if (last == null || isNaN(last)) last = pos;
    var delta = pos - last;
    var trackLen = state.trackLength || 0;
    if (trackLen > 0) {
      while (delta > trackLen * 0.5) delta -= trackLen;
      while (delta < -trackLen * 0.5) delta += trackLen;
    }
    var travel = delta / segLen;
    state._austinScrollLastPos = pos;
    var curveLean = 0;
    if (ns.Track && ns.Track.findSegment) {
      var seg = ns.Track.findSegment(state, pos + (state.playerZ || 0));
      if (seg) curveLean = (seg.curve || 0) * 0.35;
    }
    var step = speed * (travel + curveLean);
    if (c.austinBgScrollLessDramatic) step *= 0.5;
    if (typeof Util !== "undefined" && Util.increase) {
      state.austinBgScrollOffset = Util.increase(state.austinBgScrollOffset || 0, step, 1);
    } else {
      var off = (state.austinBgScrollOffset || 0) + step;
      while (off >= 1) off -= 1;
      while (off < 0) off += 1;
      state.austinBgScrollOffset = off;
    }
  }

  // --- E) Win finale hearts / cars / ascent FX ---
  function updateWinFinale(state, dt, t) {
    var c = cfg(state);
    if (state.finaleMode !== "winCruise" && !state.finaleWon) return;

    // winNoCars supersedes postBossCarsFromHorizon
    if (c.winNoCars !== false) {
      state.postBossCars = false;
      state._spawnCarsFromHorizon = false;
      state.sectionTraffic = false;
      if (state.cars && state.cars.length && ns.Sections && ns.Sections.clearTraffic) {
        state._hardClearTraffic = true;
        ns.Sections.clearTraffic(state);
        state._hardClearTraffic = false;
      }
    }

    // Hearts at winHeartDropPerSec until ascent (centerY / horizon)
    var ascending = state.winPhase === "centerY" || state.winPhase === "horizon" || state.winPhase === "done";
    var allowHearts = c.winHeartDropPerSec != null && c.winHeartDropPerSec > 0;
    if (allowHearts) {
      if (c.winHeartDropUntilAscent !== false && ascending) {
        // stop
      } else if (!ascending || c.winHeartDropUntilAscent === false) {
        state.sectionPickups = true;
        state.postBossHearts = true;
        var rate = c.winHeartDropPerSec;
        state._winHeartAcc = (state._winHeartAcc || 0) + dt;
        var every = 1 / Math.max(0.05, rate);
        while (state._winHeartAcc >= every) {
          state._winHeartAcc -= every;
          if (ns.Sections && ns.Sections.spawnPickup) {
            ns.Sections.spawnPickup(state, {
              forceSpawn: true,
              allowWinCruise: true,
              allowBossFight: true,
              allowMadMax: true
            });
          }
        }
      }
    }

    // Drop road+BG past tier / during ascent past tier threshold
    var dropPast = c.winAscentDropRoadBgPastTier != null ? c.winAscentDropRoadBgPastTier : 2;
    var elevTier = state.elevTier || 1;
    var pastTier = elevTier > dropPast || (ascending && (state.winCenterBlend || 0) > 0.35);
    if (pastTier && c.winAscentDropRoadBgPastTier != null) {
      if (!state._winDropRoadBgActive) {
        state._winDropRoadBgActive = true;
        state._winDropRoadBgT = 0;
      }
    }
    if (state._winDropRoadBgActive) {
      var dropSec = c.winAscentDropRoadBgSec != null ? c.winAscentDropRoadBgSec : 2.5;
      state._winDropRoadBgT = (state._winDropRoadBgT || 0) + dt;
      state.winRoadBgAlpha = Math.max(0, 1 - state._winDropRoadBgT / Math.max(0.05, dropSec));
    } else {
      state.winRoadBgAlpha = 1;
    }

    // Starry reveal from top during ascent
    if (c.winAscentStarrySkyEnabled !== false && ascending) {
      state._winStarryReveal = Math.min(1, (state._winStarryReveal || 0) + dt / 2.2);
    }
  }

  function winShadowSuppressed(state) {
    var c = cfg(state);
    if (state.finaleMode !== "winCruise" && !state.finaleWon) return false;
    var past = c.winAscentNoShadowPastTier != null ? c.winAscentNoShadowPastTier : 2;
    var tier = state.elevTier || 1;
    if (tier > past) return true;
    // Also suppress once centerY ascent is well underway past "tier 2" feel
    if ((state.winCenterBlend || 0) > 0.5 && past <= 2) return true;
    return false;
  }

  // --- Main update ---
  function update(state, dt) {
    if (!state || (state.phase !== "running" && state.phase !== "countdown")) return;
    var t = songT(state);
    var sax = saxWindow(state);

    // Sax BG during 2nd hold / mad max window (not only fight)
    if (!(state.finaleMode === "fight" && state.bossDefeatBeat)) {
      if (state.finaleMode === "winCruise" || state.finaleMode === "karaoke") {
        // leave existing finale handlers
      } else if (!state.finaleFight || state.finaleMode !== "fight") {
        state.saxBgActive = !!(t >= sax.start && t < sax.end);
      }
    }
    // During fight, don't force-off if outside new window — fight may still want silence
    if (state.finaleMode === "fight" && !state.bossDefeatBeat) {
      // Prefer config window; if fight falls outside 120.5–155, leave sax off (moved to hold)
      state.saxBgActive = !!(t >= sax.start && t < sax.end);
    }

    updateFirstBrain(state, dt, t);
    updateChorus1Brains(state, dt, t);
    updateTunnel(state, dt, t);
    updatePartyCrashWeather(state, dt, t);
    updateAustinScroll(state, dt);
    if (!state.inTunnel) {
      applyRoadModulation(state, t);
    }
    updateWinFinale(state, dt, t);

    // Cap ascent display to winAscentMax*
    if (state.finaleMode === "winCruise") {
      var c = cfg(state);
      var maxDisp = c.winAscentMaxDisplayMph != null ? c.winAscentMaxDisplayMph : 666;
      if (state.config) {
        state.config.ledMadDisplayMax = maxDisp;
      }
    }
  }

  // --- Render helpers ---
  function drawPartyCrashWeather(state, ctx, width, height) {
    var c = cfg(state);
    if (!state.partyCrashWeatherActive && !(state._partyCrashFlash > 0)) return;
    var intensity = c.partyCrashWeatherIntensity != null ? c.partyCrashWeatherIntensity : 0.75;
    var t = songT(state);
    ctx.save();
    if (c.partyCrashClouds !== false && state.partyCrashWeatherActive) {
      var i, cx, cy, rw, rh, a;
      for (i = 0; i < 7; i++) {
        a = 0.18 + 0.1 * intensity;
        cx = ((i * 97 + t * 18 * (0.4 + i * 0.05)) % (width + 160)) - 80;
        cy = height * (0.06 + (i % 4) * 0.07);
        rw = 70 + (i % 5) * 28;
        rh = 18 + (i % 3) * 10;
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 2 ? "#3a3a55" : "#2a2a40";
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + rw * 0.45, cy + 4, rw * 0.7, rh * 0.85, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - rw * 0.4, cy + 2, rw * 0.55, rh * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (c.partyCrashLightning !== false && state._partyCrashFlash > 0) {
      var flash = Math.min(1, state._partyCrashFlash * 4) * intensity;
      ctx.globalAlpha = flash * 0.55;
      ctx.fillStyle = "#e8f0ff";
      ctx.fillRect(0, 0, width, height * 0.55);
      // Jagged bolt
      ctx.globalAlpha = flash;
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#88ccff";
      ctx.shadowBlur = 18;
      var bx = width * (0.25 + (Math.floor(t * 3) % 5) * 0.12);
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 18, height * 0.12);
      ctx.lineTo(bx - 12, height * 0.22);
      ctx.lineTo(bx + 22, height * 0.34);
      ctx.lineTo(bx - 8, height * 0.48);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTunnelApproach(state, ctx, width, height) {
    var c = cfg(state);
    // sega36: fixed mouth plate — cover screen width uniformly (scaleX === scaleY)
    // sega40/41: mouth during freeze/shrinkIn/blackIn ONLY — never inside/exit/roadWait/done
    var phase = state._tunnelPhase;
    var approachPhase = (phase === "freeze" || phase === "shrinkIn" || phase === "blackIn");
    if (!(state.tunnelApproaching || state.tunnelEntranceVisible || approachPhase)) return;
    if (phase === "inside" || phase === "shrinkOut" || phase === "blackOut" || phase === "roadWait" || phase === "done") return;
    ensureTunnelImages(state);
    var img = state._tunnelEntranceImg;
    if (!img || !img.complete || !(img.naturalWidth > 0)) return;
    var coverWidth = c.tunnelMouthCoverWidth !== false; // default ON (sega36)
    var scale = c.tunnelMouthFixedScale != null ? c.tunnelMouthFixedScale
      : (state.tunnelApproachScale != null ? state.tunnelApproachScale : 0.55);
    var horizonY = (state._roadHorizonY != null) ? state._roadHorizonY : (height * 0.52);
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var cropFrac = (c.tunnelEntranceContentFrac != null) ? c.tunnelEntranceContentFrac : 0.67;
    var srcH = Math.max(1, Math.floor(ih * Math.min(1, Math.max(0.2, cropFrac))));
    var aspect = srcH / Math.max(1, iw);
    // Cover-width: dw = canvas width (uniform aspect). Legacy: dw = width * fixedScale.
    var dw = coverWidth ? width : (width * scale);
    var dh = dw * aspect; // scaleX === scaleY — no stretch-distort
    var dy = horizonY - dh; // bottom pinned to horizon; vertical overflow OK
    var dx = (width - dw) / 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0, iw, srcH, dx, dy, dw, dh);
    ctx.restore();
    // Stash mouth rect for player shrink aim
    state._tunnelMouthRect = { x: dx, y: dy, w: dw, h: dh, cx: dx + dw / 2, cy: dy + dh * 0.55 };
  }

  function drawTunnelBlackFade(state, ctx, width, height) {
    var fade = state._tunnelBlackFade || 0;
    if (fade <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawTunnelInteriorProcedural(state, ctx, width, height) {
    var c = cfg(state);
    var phase = state._tunnelInteriorPhase || 0;
    var t = songT(state);
    var path = state._tunnelPath || computeTunnelPath(state, t);
    var ringCount = c.tunnelInteriorRingCount != null ? c.tunnelInteriorRingCount : 12;
    var speed = c.tunnelInteriorRingSpeed != null ? c.tunnelInteriorRingSpeed : 1.0;
    var useBc = c.tunnelInteriorUseBcPalette !== false;
    // Boring Co palette from preview frames: dark void, gray concrete, orange lights
    var voidCol = useBc ? '#090810' : '#050208';
    var concreteNear = useBc ? '#3f3f37' : '#555566';
    var concreteFar = useBc ? '#2a2a28' : '#333344';
    var orange = useBc ? '#f07820' : '#ff66aa';
    var orangeDim = useBc ? '#9a4a14' : '#aa3377';

    ctx.save();
    ctx.fillStyle = voidCol;
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    var cx = width * Math.max(0.15, Math.min(0.85, path.vpX != null ? path.vpX : 0.5));
    var cy = height * Math.max(0.25, Math.min(0.75, path.vpY != null ? path.vpY : 0.48));
    var twist = path.twist || 0;

    // Soft VP glow
    var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.min(width, height) * 0.22);
    g.addColorStop(0, 'rgba(255,140,40,0.18)');
    g.addColorStop(0.45, 'rgba(40,30,20,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    var i, tRing, scale, rw, rh, lw, L, ang, lx, ly, a, seam;
    for (i = ringCount; i >= 0; i--) {
      tRing = (i / Math.max(1, ringCount) + phase * speed) % 1;
      // Ease grow from VP → full frame (rush toward camera)
      scale = 0.04 + 0.96 * (tRing * tRing);
      rw = width * scale * 0.58;
      rh = height * scale * 0.52;
      a = 0.25 + 0.75 * tRing;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(twist * (1 - tRing) * 0.85);
      // Concrete ring body
      ctx.globalAlpha = a;
      ctx.strokeStyle = tRing < 0.45 ? concreteFar : concreteNear;
      lw = 2 + (1 - tRing) * 10;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner darker lip
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = '#1a1816';
      ctx.lineWidth = Math.max(1, lw * 0.35);
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * 0.92, rh * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Seam / panel lines
      ctx.globalAlpha = a * 0.4;
      ctx.strokeStyle = '#181614';
      ctx.lineWidth = 1;
      for (seam = 0; seam < 4; seam++) {
        ang = seam * Math.PI / 2 + twist * 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * rw * 0.15, Math.sin(ang) * rh * 0.15);
        ctx.lineTo(Math.cos(ang) * rw, Math.sin(ang) * rh);
        ctx.stroke();
      }
      // Orange ring lights
      ctx.globalAlpha = Math.min(1, 0.35 + tRing * 0.9);
      for (L = 0; L < 10; L++) {
        ang = (L / 10) * Math.PI * 2 + phase * 0.6 + twist;
        lx = Math.cos(ang) * rw;
        ly = Math.sin(ang) * rh;
        ctx.fillStyle = (L % 3 === 0) ? orange : orangeDim;
        ctx.beginPath();
        ctx.arc(lx, ly, 1.5 + tRing * 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (tRing > 0.55 && L % 2 === 0) {
          ctx.globalAlpha = 0.2 * tRing;
          ctx.beginPath();
          ctx.arc(lx, ly, 4 + tRing * 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = Math.min(1, 0.35 + tRing * 0.9);
        }
      }
      ctx.restore();
    }

    // Slight vignette
    var vig = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.2, cx, cy, Math.max(width, height) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return true;
  }

  function drawTunnelInterior(state, ctx, width, height) {
    var c = cfg(state);
    if (!state.inTunnel) return false;
    // sega34: prefer procedural Super Scaler ring-rush
    if (c.tunnelInteriorProcedural !== false) {
      return drawTunnelInteriorProcedural(state, ctx, width, height);
    }
    ensureTunnelImages(state);
    if (!tunnelInteriorReady(state)) return false;
    var fps = c.tunnelInteriorAnimFps != null ? c.tunnelInteriorAnimFps : 8;
    var frames = state._tunnelInteriorImgs;
    var n = 0, i;
    for (i = 0; i < frames.length; i++) if (frames[i] && frames[i].complete) n++;
    if (n < 1) return false;
    var loop = c.tunnelInteriorAnimLoop !== false;
    var phase = state._tunnelInteriorPhase || 0;
    var idx = Math.floor(phase * fps);
    if (loop) idx = idx % n;
    else idx = Math.min(n - 1, idx);
    // pick nth loaded
    var img = null, seen = 0;
    for (i = 0; i < frames.length; i++) {
      if (frames[i] && frames[i].complete && frames[i].naturalWidth > 8) {
        if (seen === idx) { img = frames[i]; break; }
        seen++;
      }
    }
    if (!img) img = frames[0];
    if (!img) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#050208';
    ctx.fillRect(0, 0, width, height);
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var sc = Math.max(width / iw, height / ih);
    var dw = iw * sc, dh = ih * sc;
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
    ctx.restore();
    return true;
  }

  function drawTunnelFractal(state, ctx, width, height) {
    var c = cfg(state);
    if (!state.inTunnel || c.tunnelFractalEnabled === false) return;
    var frames = Math.max(1, Math.min(6, c.tunnelFractalFrames != null ? c.tunnelFractalFrames : 6));
    var phase = state._tunnelFractalPhase || 0;
    var frame = Math.floor(phase * 8) % frames;
    var cx = width / 2;
    var cy = height / 2;
    var i, s, a, hue;
    ctx.save();
    ctx.fillStyle = "#050208";
    ctx.fillRect(0, 0, width, height);
    for (i = frames; i >= 1; i--) {
      s = ((i + (phase * 1.6 + frame * 0.15) % 1) / frames);
      a = 0.15 + 0.55 * (1 - s);
      hue = (phase * 40 + i * 48) % 360;
      ctx.strokeStyle = "hsla(" + hue + ",100%,60%," + a.toFixed(3) + ")";
      ctx.lineWidth = 2 + (1 - s) * 6;
      ctx.strokeRect(
        cx - width * 0.48 * s,
        cy - height * 0.48 * s,
        width * 0.96 * s,
        height * 0.96 * s
      );
      // Starfield dots coming at you
      ctx.fillStyle = "hsla(" + ((hue + 180) % 360) + ",100%,80%," + (a * 0.9).toFixed(3) + ")";
      var j, ang, rad, px, py;
      for (j = 0; j < 10; j++) {
        ang = (j / 10) * Math.PI * 2 + phase * 0.7 + i;
        rad = s * Math.min(width, height) * 0.48;
        px = cx + Math.cos(ang) * rad;
        py = cy + Math.sin(ang) * rad * 0.85;
        ctx.fillRect(px, py, 2, 2);
      }
    }
    // Hall-of-mirrors vanishing cross
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ff66cc";
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
    ctx.moveTo(0, cy); ctx.lineTo(width, cy);
    ctx.stroke();
    ctx.restore();
  }

  function drawStarrySky(state, ctx, width, height) {
    var c = cfg(state);
    if (c.winAscentStarrySkyEnabled === false) return;
    var reveal = state._winStarryReveal || 0;
    if (reveal <= 0.01) return;
    var fromTop = c.winAscentStarryFromTop !== false;
    var bandH = height * reveal;
    ctx.save();
    ctx.beginPath();
    if (fromTop) ctx.rect(0, 0, width, bandH);
    else ctx.rect(0, height - bandH, width, bandH);
    ctx.clip();
    var g = ctx.createLinearGradient(0, 0, 0, bandH);
    g.addColorStop(0, "#02010a");
    g.addColorStop(0.55, "#0a0830");
    g.addColorStop(1, "#1a1040");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, fromTop ? bandH : height);
    // Procedural Sega stars (deterministic-ish)
    var i, x, y, tw;
    var t = songT(state);
    for (i = 0; i < 90; i++) {
      x = ((i * 97) % width);
      y = ((i * 53) % Math.max(1, Math.floor(bandH)));
      tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      ctx.globalAlpha = tw * reveal;
      ctx.fillStyle = (i % 7 === 0) ? "#ff9ad5" : ((i % 5 === 0) ? "#7dffef" : "#ffffff");
      ctx.fillRect(x, y, (i % 11 === 0) ? 2 : 1, (i % 11 === 0) ? 2 : 1);
    }
    ctx.restore();
  }

  function drawFreshPostNukeOverlay(state, ctx, width, height, bandY, bandH) {
    var c = cfg(state);
    if (c.postNukeFreshSegaBg === false || c.postNukeSegaStyle === false) return;
    if (!state.postNukeAustin) return;
    // Procedural Sega grain / charred look over postnuke plate
    ctx.save();
    ctx.globalAlpha = 0.22;
    var i, x, y;
    for (i = 0; i < 40; i++) {
      x = (i * 37 + Math.floor((state.austinBgScrollOffset || 0) * 200)) % width;
      y = bandY + (i * 29) % Math.max(1, bandH);
      ctx.fillStyle = (i % 3 === 0) ? "#1a0808" : "#2a1010";
      ctx.fillRect(x, y, 6 + (i % 5), 3 + (i % 4));
    }
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ff4400";
    ctx.fillRect(0, bandY + bandH * 0.55, width, bandH * 0.2);
    ctx.restore();
  }

  // Hook: call after BG single-layer / before road — weather, starry
  // sega32: tunnel mouth deferred to post-road when tunnelEntranceInFrontOfRoad
  function renderOverlayPreRoad(state, ctx, width, height) {
    var c = cfg(state);
    if (state.inTunnel || state._tunnelHideRoad) {
      // Interior already drawn in BG branch when inTunnel; hide road during black/wait
      return true;
    }
    var phasePre = state._tunnelPhase;
    var wantMouthPre = state.tunnelApproaching || state.tunnelEntranceVisible ||
      phasePre === "freeze" || phasePre === "shrinkIn" || phasePre === "blackIn";
    if (wantMouthPre && phasePre !== "roadWait" && phasePre !== "done" && phasePre !== "inside") {
      var mouthAfter = (c.tunnelEntranceInFrontOfRoad !== false) || (c.tunnelApproachRoadInFrontException !== false);
      if (!mouthAfter) {
        drawTunnelApproach(state, ctx, width, height);
      }
    }
    drawPartyCrashWeather(state, ctx, width, height);
    drawStarrySky(state, ctx, width, height);
    return false;
  }

  // sega35: fixed mouth AFTER road during approach / roadWait; black fade on transitions
  function renderOverlayPostRoad(state, ctx, width, height) {
    var c = cfg(state);
    if (!state.inTunnel) {
      var mouthAfter = (c.tunnelEntranceInFrontOfRoad !== false) || (c.tunnelApproachRoadInFrontException !== false);
      var phase = state._tunnelPhase;
      var wantMouth = state.tunnelApproaching || state.tunnelEntranceVisible ||
        phase === "freeze" || phase === "shrinkIn" || phase === "blackIn";
      if (mouthAfter && wantMouth && phase !== "roadWait" && phase !== "done") {
        drawTunnelApproach(state, ctx, width, height);
      }
    }
    drawTunnelBlackFade(state, ctx, width, height);
  }

  function shouldSkipRoad(state) {
    if (state.inTunnel) return true;
    if (state._tunnelHideRoad) return true;
    if ((state.winRoadBgAlpha != null) && state.winRoadBgAlpha <= 0.02 && state._winDropRoadBgActive) return true;
    return false;
  }

  function roadBgAlpha(state) {
    if (state.inTunnel || state._tunnelHideRoad) return 0;
    if (state.winRoadBgAlpha != null) return state.winRoadBgAlpha;
    return 1;
  }

  function tunnelPlayerDrawScale(state) {
    var s = state && state._tunnelPlayerScale != null ? state._tunnelPlayerScale : 1;
    // Never fully invisible — clamp to min even if misconfigured
    var c = cfg(state);
    var minS = c.tunnelPlayerMinScale != null ? c.tunnelPlayerMinScale : 0.12;
    if (s < minS && (state.tunnelApproaching || state.inTunnel || state.tunnelExiting || state._tunnelPhase === 'roadWait' || state._tunnelPhase === 'blackIn' || state._tunnelPhase === 'blackOut')) {
      return minS;
    }
    return s;
  }

  function tunnelFreezeRoad(state) {
    if (state && state._tunnelFreezeRoad) return true;
    // sega40: song-time gate so freeze wins even before updateTunnel this frame
    // (gameplay advances position before Sections→Sega31x.update)
    var c = cfg(state);
    if (c.tunnelApproachEnabled === false) return false;
    var t = songT(state);
    var freezeStart = c.tunnelFreezeStartSec != null ? c.tunnelFreezeStartSec
      : (c.tunnelApproachStartSec != null ? c.tunnelApproachStartSec : 87.5);
    var enter = c.tunnelEnterSec != null ? c.tunnelEnterSec : 93.5;
    var exit = c.tunnelExitSec != null ? c.tunnelExitSec : 103.44;
    var shrinkDur = c.tunnelPlayerShrinkDurSec != null ? c.tunnelPlayerShrinkDurSec : 2.8;
    var blackDur = c.tunnelBlackDurSec != null ? c.tunnelBlackDurSec : 0.45;
    var exitShrinkDur = c.tunnelExitShrinkDurSec != null ? c.tunnelExitShrinkDurSec : 2.5;
    var exitBlackDur = c.tunnelExitBlackDurSec != null ? c.tunnelExitBlackDurSec : 0.4;
    var roadDelay = c.tunnelRoadDelaySec != null ? c.tunnelRoadDelaySec : 3.0;
    var roadRestoreAt = exit + exitShrinkDur + exitBlackDur + roadDelay;
    return (t >= freezeStart && t < roadRestoreAt);
  }

  ns.Sega31x = {
    update: update,
    resetFlags: resetFlags,
    saxWindow: saxWindow,
    renderOverlayPreRoad: renderOverlayPreRoad,
    renderOverlayPostRoad: renderOverlayPostRoad,
    drawPartyCrashWeather: drawPartyCrashWeather,
    drawTunnelFractal: drawTunnelFractal,
    drawTunnelApproach: drawTunnelApproach,
    drawTunnelInterior: drawTunnelInterior,
    preloadTunnelImages: preloadTunnelImages,
    drawTunnelInteriorProcedural: drawTunnelInteriorProcedural,
    drawTunnelBlackFade: drawTunnelBlackFade,
    drawStarrySky: drawStarrySky,
    drawFreshPostNukeOverlay: drawFreshPostNukeOverlay,
    shouldSkipRoad: shouldSkipRoad,
    roadBgAlpha: roadBgAlpha,
    tunnelPlayerDrawScale: tunnelPlayerDrawScale,
    tunnelFreezeRoad: tunnelFreezeRoad,
    tunnelRoadSpeedMult: tunnelRoadSpeedMult,
    tunnelStraightK: tunnelStraightK,
    winShadowSuppressed: winShadowSuppressed,
    smashBrainsOnHill: smashBrainsOnHill,
    despawnBrainsSilent: despawnBrainsSilent,
    hideRoadside: function(state) { return !!(state && state._tunnelHideRoadside); }
  };
})(window.ApexRacer = window.ApexRacer || {});
