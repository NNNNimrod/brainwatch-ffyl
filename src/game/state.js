(function(ns) {

  function normalizeHighScores(list) {
    var out = [];
    var i;
    if (!list || !list.length) {
      return out;
    }
    for (i = 0; i < list.length; i++) {
      out.push({
        initials: String(list[i].initials || "AAA").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().slice(0, 20) || "AAA",
        score: Util.toInt(list[i].score, 0)
      });
    }
    out.sort(function(a, b) { return b.score - a.score; });
    return out.slice(0, 3);
  }

  function qualifiesHighScore(records, score) {
    var list = (records && records.highScores) ? records.highScores : [];
    if (list.length < 3) {
      return true;
    }
    return score > (list[list.length - 1].score || 0);
  }

  function submitHighScore(records, initials, score) {
    var list = (records.highScores || []).slice();
    list.push({
      initials: String(initials || "AAA").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().slice(0, 20) || "AAA",
      score: Math.round(score || 0)
    });
    records.highScores = normalizeHighScores(list);
    if (records.highScores[0]) {
      records.bestScore = Math.max(records.bestScore || 0, records.highScores[0].score);
    }
    persistRecords(records);
    return records.highScores;
  }

  function loadRecords() {
    var fallback = {
      bestScore: 0,
      bestDistance: 0,
      bestTime: 0,
      bestLapTime: 0,
      highScores: []
    };

    try {
      var raw = Dom.storage[ns.STORAGE_KEYS.records];
      if (!raw) {
        return fallback;
      }

      var parsed = JSON.parse(raw);
      return {
        bestScore: Util.toInt(parsed.bestScore, 0),
        bestDistance: Util.toFloat(parsed.bestDistance, 0),
        bestTime: Util.toFloat(parsed.bestTime, 0),
        bestLapTime: Util.toFloat(parsed.bestLapTime, 0),
        highScores: normalizeHighScores(parsed.highScores)
      };
    } catch (err) {
      return fallback;
    }
  }

  function persistRecords(records) {
    Dom.storage[ns.STORAGE_KEYS.records] = JSON.stringify(records);
  }

  function deriveRank(score, config) {
    var rank = config.rankThresholds[0].label;
    for (var n = 0; n < config.rankThresholds.length; n++) {
      if (score >= config.rankThresholds[n].score) {
        rank = config.rankThresholds[n].label;
      }
    }
    return rank;
  }

  function recomputeCamera(state) {
    state.cameraDepth = 1 / Math.tan((state.fieldOfView / 2) * Math.PI / 180);
    state.playerZ = state.cameraHeight * state.cameraDepth;
    state.resolution = state.height / 480;

    state.maxSpeed = state.segmentLength / state.step;
    state.accel = state.maxSpeed / 5;
    state.braking = -state.maxSpeed;
    state.decel = -state.maxSpeed / 5;
    state.offRoadDecel = -state.maxSpeed / 2;
    state.offRoadLimit = state.maxSpeed / 4;
  }

  function clearInputFlags(state) {
    state.input.left = false;
    state.input.right = false;
    state.input.faster = false;
    state.input.slower = false;
    state.input.nitro = false;
  }

  function laneOffset(state, lane) {
    var offsets = state.config.laneOffsets;
    var idx = Util.limit(lane, 0, offsets.length - 1);
    var sc = (state._approachLaneScale != null) ? state._approachLaneScale : 1; // sega48
    return offsets[idx] * sc;
  }

  function resetRunState(state) {
    clearInputFlags(state);

    state.phase = "menu";
    state.tokenInserted = false;
    state.countdown = 0;
    state.position = 0;
    state.speed = 0;
    state.activeMaxSpeed = state.maxSpeed;
    state.lane = 0;
    state.playerX = laneOffset(state, 0);

    state.skyOffset = 0;
    state.hillOffset = 0;
    state.treeOffset = 0;
    state.austinBgScrollOffset = 0;

    state.health = state.config.maxHealth;
    state.nitro = state.config.maxNitro;
    state.nitroActive = false;
    state.hits = 0;
    state.deaths = 0;
    state.invulnTimer = 0;
    state.songEnded = false;
    state.lyricIndex = -1;
    state.austinBgPlate = "dusk";
    state.austinSongLyricCount = 0;
    state.austinLastLyricIndex = -1;
    state.austinSectionCount = 0;
    state.awaitingInitials = null;
    state.showHighScores = false;

    state.score = 0;
    state.distance = 0;
    state.elapsed = 0;
    state.currentLapTime = 0;
    state.lastLapTime = 0;
    state.fastLapTime = state.records.bestLapTime;
    state.lap = 1;

    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.nearMisses = 0;
    state.brainKills = 0;

    state.difficultyLevel = 1;
    state.trafficAdjustCooldown = 0;

    state.eventText = "";
    state.eventTimer = 0;
    state.damageFlash = 0;
    state.nearMissFlash = 0;
    state.deathFlashTimer = 0;
    state.madMaxFlashTimer = 0;
    state.madMaxFlashText = "";
    state.sectionTitleText = "";
    state.sectionTitleAge = 0;
    state.sectionTitleDuration = 0;
    state.sectionTitleFade = 0;
    state.accelSpawnElapsed0 = 0;
    state.accelSpawnBoost = 0;
    state.speedSamples = 0;
    state.speedSum = 0;
    state.avgSpeed = 0;
    state.brains = [];
    state.shots = [];
    state.lightningBolts = [];
    state.particles = [];
    state.brainSpawnTimer = 0;
    state.explosionFlash = 0;
    state.powerups = 0;
    state.weaponPower = 0;
    state.madMaxMode = false;
    state.madMaxUnlocked666 = false;
    state.madMaxClimbPause = 0;
    state.madMaxLedCap = 0;
    state.bossApproach = false;
    state.bossPhase = null;
    state.bossZapCount = 0;
    state.bossMediumsSpawned = false;
    state.bossTiniesSpawned = false;
    state.mediumZapElapsed = 0;
    state.globalZapLock = null;
    state.bossDefeatBeat = false;
    state.bossDefeatTimer = 0;
    state.bossDefeatElapsed = 0;
    state.bossDefeatExplodeAcc = 0;
    state.bossDefeatReason = null;
    state.failHumanityBanner = null;
    state.bossDoom = false; state._bossDoomT = 0; state._landY0 = null; state._tunnelEnterY0 = null; // sega52
    state.corpses = [];
    state.pickups = [];
    state.corpseSpawnTimer = 0;
    state.pickupSpawnTimer = 2.5;
    state.invasionFlash = 0;
    state.invasionTriggered = false;
    state.sectionId = "howto";
    state.sectionTraffic = true;
    state.sectionBrains = false;
    state.sectionCorpses = false;
    state.sectionPickups = true;
    state.sectionBrainsOnly = false;
    state._clearedForSection = null;
    state.bodiesSmashed = false;
    state.psychMode = false;
    state.worldFade = 1;
    state.psychPhase = 0;
    state.shockFlash = 0;
    state.scorchMarks = [];
    state._bodiesFloodBurst = false;
    state.nightAustin = false;
    state.bgStyle = "dusk";
    state.trafficLaneSwap = false;
    state.pauseZaps = false;
    state.instructionMode = null;
    state.finaleMode = null;
    state.finalePauseTimer = 0;
    state.finaleStoryboard = null;
    state.finaleFight = false;
    state.finaleWon = false;
    state.finaleLost = false;
    state.finaleBrainsSpawned = false;
    state.finaleBossId = null;
    state.saxBgActive = false;
    state.winBanner = null;
    state.loseBanner = null;
    state.winCruiseStartT = 0;
    state.winCruiseEndT = 0;
    state.winRideAhead = 0;
    state.winRideProgress = 0;
    state.winPhase = null;
    state.winCenterBlend = 0;
    state.winPlayerAlpha = 1;
    state.winSequenceDone = false;
    state.nuclearBlast = 0;
    state.postNukeAustin = false;
    state.postNukeFire = false;
    state.nuclearBlastT = 0;
    state.nukeFlash = 0;
    state.nukePostFlashBw = 0;
    state.nukePlateUnderFlash = false;
    state._tutorialCarsSpawned = false;
    state._tutorialPickupsSpawned = false;
    state._burstForSection = null;

    state.rank = deriveRank(0, state.config);
  }

  function createNoopStats() {
    return {
      update: function() {}
    };
  }

  function createState(canvas) {
    var config = ns.CONFIG;
    var playerName = "BRAIN WATCH";
    Dom.storage[ns.STORAGE_KEYS.player] = playerName;

    var state = {
      config: config,
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      width: config.width,
      height: config.height,
      step: config.step,
      roadWidth: config.roadWidth,
      segmentLength: config.segmentLength,
      rumbleLength: config.rumbleLength,
      lanes: config.lanes,
      drawDistance: config.drawDistance,
      cameraHeight: config.cameraHeight,
      fieldOfView: config.fieldOfView,
      fogDensity: config.fogDensity,
      centrifugal: config.centrifugal,
      skySpeed: config.skySpeed,
      hillSpeed: config.hillSpeed,
      treeSpeed: config.treeSpeed,
      segments: [],
      cars: [],
      brains: [],
      shots: [],
      lightningBolts: [],
      particles: [],
      brainSpawnTimer: 0,
      explosionFlash: 0,
      powerups: 0,
      weaponPower: 0,
      madMaxMode: false,
      madMaxUnlocked666: false,
      madMaxClimbPause: 0,
      madMaxLedCap: 0,
      madMaxFlashTimer: 0,
      madMaxFlashText: "",
      sectionTitleText: "",
      sectionTitleAge: 0,
      sectionTitleDuration: 0,
      sectionTitleFade: 0,
      showHighScores: false,
      corpses: [],
      pickups: [],
      corpseSpawnTimer: 0,
      pickupSpawnTimer: 2.5,
      invasionFlash: 0,
      invasionTriggered: false,
      sectionId: "howto",
      sectionTraffic: true,
      sectionBrains: false,
      sectionCorpses: false,
      sectionPickups: true,
      sectionBrainsOnly: false,
      bodiesSmashed: false,
      psychMode: false,
      worldFade: 1,
      psychPhase: 0,
      shockFlash: 0,
      scorchMarks: [],
      nightAustin: false,
      trafficLaneSwap: false,
      pauseZaps: false,
      instructionMode: null,
      finaleMode: null,
      finalePauseTimer: 0,
      finaleStoryboard: null,
      finaleFight: false,
      finaleWon: false,
      finaleLost: false,
      finaleBrainsSpawned: false,
      saxBgActive: false,
      winBanner: null,
      winRideAhead: 0,
      winRideProgress: 0,
      winPhase: null,
      winCenterBlend: 0,
      winPlayerAlpha: 1,
      winSequenceDone: false,
      nuclearBlast: 0,
      postNukeAustin: false,
      nuclearBlastT: 0,
      loseBanner: null,
      backgroundNight: null,
      endingImages: {},
      trackLength: 0,
      background: null,
      sprites: null,
      input: {
        left: false,
        right: false,
        faster: false,
        slower: false,
        nitro: false
      },
      playerName: playerName,
      records: loadRecords(),
      summary: null,
      ui: null,
      lane: 0,
      hits: 0,
      deaths: 0,
      invulnTimer: 0,
      songEnded: false,
      lyricIndex: -1,
      austinBgPlate: "dusk",
      austinSongLyricCount: 0,
      austinLastLyricIndex: -1,
      austinSectionCount: 0
    };

    canvas.width = state.width;
    canvas.height = state.height;

    recomputeCamera(state);
    resetRunState(state);
    // sega42: Start must wait for critical images (early Start hid overlay → blank canvas)
    state.assetsReady = false;
    state._pendingStart = false;

    return state;
  }

  ns.State = {
    createState: createState,
    createNoopStats: createNoopStats,
    clearInputFlags: clearInputFlags,
    resetRunState: resetRunState,
    recomputeCamera: recomputeCamera,
    loadRecords: loadRecords,
    qualifiesHighScore: qualifiesHighScore,
    submitHighScore: submitHighScore,
    normalizeHighScores: normalizeHighScores,
    persistRecords: persistRecords,
    deriveRank: deriveRank,
    laneOffset: laneOffset
  };
})(window.ApexRacer = window.ApexRacer || {});
