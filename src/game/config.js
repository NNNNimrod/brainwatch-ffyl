(function(ns) {
  // Speed display calibration (sega28/29/30 — editor balance):
  //   Ratio: speedoRatioCode 140 / speedoRatioDisplay 169
  //   display = internal * (169/140); clamp to display max.
  //   Normal display max 333 → internal = 333 * 140/169 ≈ 275.68
  //   Mad Max display max 666 → internal = 666 * 140/169 ≈ 551.36
  var LED_DISPLAY_SCALE = 169 / 140;
  var LED_DISPLAY_MAX = 333;
  var LED_MAD_DISPLAY_MAX = 666;
  var LED_MAX_SPEED = LED_DISPLAY_MAX * 140 / 169;       // ≈ 275.68
  var LED_MAD_MAX_SPEED = LED_MAD_DISPLAY_MAX * 140 / 169; // ≈ 551.36

  var config = {
    fps: 60,
    step: 1 / 60,
    width: 640,
    height: 720,
    centrifugal: 0.08,
    // Distinct parallax speeds so depth reads clearly (far < mid < near)
    skySpeed: 0.00075,
    hillSpeed: 0.003,
    treeSpeed: 0.009,
    roadWidth: 2000,
    segmentLength: 200,
    rumbleLength: 3,
    lanes: 2,
    fieldOfView: 100,
    cameraHeight: 1000,
    drawDistance: 300,
    fogDensity: 8,
    trafficBase: 28,
    trafficStep: 3,
    trafficMax: 55,
    laneSwapTrafficMult: 2.0, // sega31 editor
    laneSwapTrafficMax: 200,
    spriteScaleCars: 2.625, // base; sega31s uses carsWidthMult/carsHeightMult
    carsWidthMult: 1.20, // sega31s +20% W
    carsHeightMult: 1.15, // sega31s +15% H
    spriteScalePickups: 1.26, // sega31m ×0.8 of sega31l 1.575 (SIZE only; spawn ×5 keep)
    spriteScalePlayer: 1.5,
    maxHealth: 100,
    maxNitro: 100,
    nitroDrainPerSecond: 38,
    nitroRecoverPerSecond: 20,
    nitroBoostAccelFactor: 1.55,
    nitroTopSpeedFactor: 1.3,
    comboWindow: 2.5,
    nearMissLateralThreshold: 0.28,
    difficultyStepSeconds: 28,
    maxDifficultyLevel: 10,
    countdownSeconds: 0, // sega31k: no multi-second black stall after START
    eventFeedDuration: 1.4,
    // Discrete 2-lane offsets (road space ~ -1..1)
    laneOffsets: [-0.55, 0.55],
    laneSnapSpeed: 7.5,
    autoDriveSpeedFactor: 1.0,
    unlimitedTopSpeed: true,
    // --- Speed / LED (sega19) ---
    // Physics "internal" units; HUD = internal * ledDisplayScale, clamped.
    // maxSpeed (road) maps to ledMaxSpeed internal when speed === maxSpeed.
    ledMaxSpeed: LED_MAX_SPEED,
    ledMadMaxSpeed: LED_MAD_MAX_SPEED,
    ledDisplayScale: LED_DISPLAY_SCALE,
    ledDisplayMax: LED_DISPLAY_MAX,
    ledMadDisplayMax: LED_MAD_DISPLAY_MAX,
    // Accel bands in INTERNAL units — display 60/120/220/333 via * (140/169)
    ledAccelBands: [
      { upTo: 50, rate: 24 },
      { upTo: 99, rate: 7.5 },
      { upTo: 182, rate: 5 },
      { upTo: LED_MAX_SPEED, rate: 2.5 }
    ],
    // Mad Max climb past normal cap toward ~551 internal (display 666)
    // sega21/27: aggressive rates so a clean 120.5–154.5 run can hit display 666
    ledMadAccelBands: [
      { upTo: 50, rate: 28 },
      { upTo: 99, rate: 18 },
      { upTo: 182, rate: 14 },
      { upTo: LED_MAX_SPEED, rate: 12 },
      { upTo: 394, rate: 18 },
      { upTo: LED_MAD_MAX_SPEED, rate: 16 }
    ],
    // sega27: nuke +2s later (was 152.0–155.1)
    nuclearBlast: {
      start: 156.5,             // sega31m: +2s (was 154.5)
      end: 159.6,               // sega31m: +2s (was 157.6)
      flashStart: 155.0,        // sega31m: +2s (was 153.0); flashBeforeSec 1.5 keep
      flashBeforeSec: 1.5,
      flashFullScreen: true,
      afterBg: "postapoc-dayglow",
      usePostnukeAustinPlates: true, // sega31v: after whiteout swap to background-*-postnuke.png
      winterStart: 164.5,       // sega31m: +2s (was 162.5)
      winterDelaySec: 8.0,
      winterBg: "nuclear-winter",
      winterGrayscaleAll: false, // sega31j: no B&W nuclear winter
      nuclearWinterDisabled: true, // sega31j: stay postapoc-dayglow / color
      skipWinterGrayscale: true,
      winterRoadside: "rubble",
      plate: "images/nuke-bg.png",
      nuclearBlastScale: 2.5,     // mushroom/stem/shock/gradients ×2.5 (250%)
      nuclearBlastSizeMult: 2.5,  // alias of nuclearBlastScale
      nuclearBlastMushroomClear: true, // redesign: clear mushroom / sun — no heart silhouette
      nuclearBlastNoHeartSilhouette: true,
      nukePostFlashBwToColorSec: 1.0  // after white flash: bright B&W → full color over 1.0s
    },
    // Mad Max (2nd holding-on / diamond2 ~120.5)
    // Collision choice: knock speed down + pause climb ~2.5s (do not fully reset mode).
    madMax: {
      // Window: 2nd holding-on / diamond2 (~120.5) until nuke window.
      start: 120.5,
      end: 156.0,               // sega31m: ends before nuke flash 155 / blast 156.5
      climbPerSecond: 24,
      climbPauseOnHit: 2.5,
      speedKnockFactor: 0.72,
      banner: "MAD MAX MODE ENGAGED",
      unlockBanner: "666 POWER UNLOCKED",
      bannerText: "MAD MAX",
      bannerGlow: "green",
      bannerCentered: true,
      accelMult: 2.0,
      trafficMult: 2.0
    },
    // Finale boss fight — starts at "Protect your freedoms!" (~193.22)
    // Choreography: slow-to-stop → boss from top → 3 boss zaps → 2 mediums →
    // global zap lock → after mediums zap a while each spawns 2 tinies.
    finaleFight: {
      start: 185.22, // sega31: bossStartEarlierSec 8 → ~185.22
      deadline: 215.96,
      songEnd: 243,
      loseStoryboardEnd: 223.76,
      bossScale: 2.0,
      mediumScale: 1.25, // sega31s +25% medium default
      tinyScale: 0.42,
      bossHp: 1000,
      mediumHp: 100,
      tinyHp: 10,
      bossZapsBeforeMediums: 3,
      mediumZapWindow: 5, // sega29: bossTinySpawnAfterMediumsSec
      bossTinySpawnAfterMediumsSec: 5,
      ensureBossTinies: true,
      approachDuration: 3.2,
      bossEmergeSpeed: 0.32,
      bossLevelSpeed: 25 // sega30: crawl ~display 25 (not hard zero)
    },
    // Combat (absolute HP / weapon power — sega19)
    combat: {
      // sega31v: normal === medium (single entity); kinds tiny/medium/boss only — no normalHp
      tinyHp: 10,
      mediumHp: 100,
      bossHp: 1000,
      baseTapDamage: 10,
      // tapDamage = baseTapDamage + weaponPower (weaponPower 0..100 → 10..110)
      weaponPowerMax: 100,
      weaponPowerPerPickup: 8, // sega27 editor: powerUpValue
      powerPenaltyFromDamage: 16, // sega27 editor: powerPenaltyFromDamage
      enemyDamageTakenMult: 0.4875 // sega29 editor: ×0.4875 dmg TO enemies
    },
    // sega28/29/30 win ride (editor balance)
    winVanishSlowMult: 14.0, // sega31d
    winAscentSlowMult: 3.5,
    winFinalTopPx: 10,
    roadsideBuildingScale: 30.31, // sega31d
    roadsideOffsetTowardRoad: 0.72,
    roadsideBuildingOffsetTowardRoad: 0.99, // sega31k buildings closer still
    roadsidePullTowardRoadBuildingsOnly: true,
    roadsidePullTowardRoad: true,
    heartAsset: "heart.pre-sega17.png",
    // sega30 menu / insert token
    requireInsertToken: true,
    insertTokenStartsMusic: true,
    insertTokenLabel: "INSERT TOKEN",
    startGameAfterTokenOnly: true,
    fixMenuMusicAudible: true,
    fixAvgSpeedDisplay: true,
    menuMusicTapHint: false,
    // sega30 boss fight redesign
    bossSurviveAtZeroUntilAddsClear: true,
    bossFinalShotAfterAdds: true,
    bossThrobWithLowHp: true,
    bossDeathExpandTo: 1.75, // sega31s −65% of sega31o 5 (was 10→5)
    bossDeathThrob: true,
    bossDeathThrobExpandShrinkRatio: "3:1",
    bossDeathThrobTargetScale: 1.75, // sega31s final boss death size −65%
    bossDeathThrobSegaExplosionsWhileThrobbing: true,
    bossDeathExplosionsShrink: true,
    bossDeathExplosionSizeMult: 3.5, // sega31s boss death explosions +250% (×3.5)
    bossLevelSpeed: 25,
    // sega29 editor flags / pre-boss (sega30: preBossHeartMult 2.0)
    motionVibrateCarsBrains: true,
    fixHeartSpawnAsCar: true,
    preBossLaneSwapSec: 15,
    preBossHeartMult: 2.0,
    laneSwapHeartMult: 2.5, // sega31q: ~half of sega31o ×5 during trafficLaneSwap (still on top of global ×5)
    madMaxNoHearts: true, // sega31p no heart/pickup spawns during madMaxMode / [120.5,156.0)
    noHeartsDuringMadMax: true,
    invulnSeconds: 0.85,
    softFail: true,
    // Respawn after DEATH banner: SPD LED ≈ respawnDisplayMph (not from zero).
    // Mapping: display = internalLED × (speedoRatioDisplay/speedoRatioCode) = internal × (169/140).
    // respawnSpeed = internal LED units = respawnDisplayMph × 140/169 ≈ 57.16 (69 display).
    respawnDisplayMph: 69,
    respawnSpeed: 69 * 140 / 169,
    songEndPad: 0.5,
    brains: {
      maxActive: 2,
      spawnInterval: 7.5,
      hp: 100,
      radius: 51,
      zapInterval: 2.6,
      telegraphSeconds: 1.42, // sega29 editor: brainTelegraphSeconds (+1s vs 0.42)
      zapDamage: 30, // sega27 editor: playerDamageFromZaps
      shotSpeed: 720,
      postGrowZapDelay: 2.0 // sega24: extra seconds after fully grown before zaps
    },
    // Enemy damage to player — 1.5× prior sega18 values
    damage: {
      carCollision: 25,      // sega27 editor
      roadsideCollision: 0,  // sega27 editor
      offRoadPerSecond: 6,
      brainZap: 30           // sega27 editor (match brains.zapDamage)
    },
    // --- sega31 Flying / menu / pause / elevation ---
    hideStartUntilToken: true,
    replaceTokenWithStart: true,
    hidePlayAgain: true,
    runCompleteUsesInsertToken: false, // sega31j: RUN COMPLETE = MAIN MENU only
    tokenCoinSfx: true,
    tokenCoinSfxFile: "sounds/token-coin.wav",
    tokenCreditSfx: true,
    tokenCreditSfxFile: "sounds/token-credit.wav",
    menuInstructionsButton: true,
    menuInstructionsModal: true,
    menuInstructionsLabel: "INSTRUCTIONS",
    menuInstructionsCloseLabel: "CLOSE",
    menuInstructionsText: "She's always on the move: hit LEFT & RIGHT to steer.\n\nYou'll die on your knees unless you fight: Tap to fire at the enemy.\n\nGet your ass off the ground: Take heart and you've got the power! Extend your life, energize your rocket thrusters, and boost your firepower.\n\nStrafe to survive: TAP to FIRE.",
    titleLogoScaleMult: 1.11,
    titleLogoMaxPx: 244,
    titleLogoMaxVw: 80,
    titleLogoMaxVh: 31,
    madMaxBannerGlow: "green",
    madMaxBannerCentered: true,
    madMaxBannerText: "MAD MAX",
    deathBannerGlow: "red",
    pauseButton: true,
    pauseButtonLabel: "PAUSE",
    pauseButtonPausedLabel: "PAUSED",
    pauseButtonNearTop: true,
    pauseFreezesGameplay: true,
    pauseMutesPausesMusic: true,
    pauseTsButton: true,
    pauseTsButtonLabel: "TS",
    pauseTsChoices: ["SEND TS", "TRAINER"],
    pauseTsSendLabel: "SEND TS",
    pauseHideInstructions: true,
    pausePanelOnlyTrainerAndSendTs: true,
    pauseHideOverlayResume: true,
    pauseHidePausedTitleAndMessage: true,
    pauseNoTapResumeWhenReady: true,
    pauseSheetOnlySendTsTrainerClose: true,
    pauseCloseUnpauses: true,
    pauseOpenShowsTsPanel: true,
    doNotBuildUntilAsked: false, // sega35 SHIPPED drive-into-mouth redesign
    // --- Sega psych pack stubs (queued; render not shipped) ---
    psychSegaStyle: true, // master: remap legacy psych ids → Sega arcade styles
    psychSegaPalette: true, // pixel dither / limited palette / hard edges
    psychSegaQueued: false,
    psychRemapNeonBlood: 'outrunCheck',       // chorus1
    psychRemapAcidRain: 'afterBurnerClouds',  // applause
    psychRemapDiamondVoid: 'harrierCheck',    // diamond2
    psychRemapLaneFreak: 'hangOnRush',        // chorus2
    psychRemapChromeStrobe: 'outrunSun',
    psychRemapVoidPulse: 'outrunSun',
    psychSegaStyles: ['outrunCheck', 'outrunSun', 'afterBurnerClouds', 'harrierCheck', 'hangOnRush'],

    // --- sega31z player-hit red-diff (SHIPPED) ---
    playerHitUseRedDiff: true,
    playerHitRedDiffOnBrainOnly: true,
    playerHitRedDiffDurationSec: 0.35,
    playerHitRedDiffQueued: false,
    playerHitRedDiffSource: 'images/mockups/player-poses/pose-diff-analysis.png',
    playerHitRedDiffLeft: 'images/player-hit/diff-left.png',
    playerHitRedDiffRight: 'images/player-hit/diff-right.png',
    playerHitRedDiffStraight: 'images/player-hit/diff-straight.png',
    // --- sega31z multi-frame dusk postnuke + nuke mushroom (SHIPPED) ---
    postNukeAnimFrames: 4,
    postNukeAnimFps: 6,
    postNukeAnimQueued: false,
    nukeMushroomAnimFrames: 6, // legacy (unused when nukeSegaEnabled)
    // --- sega43 Sega Super Scaler nuke (replaces 6-frame one-shot + procedural mushroom) ---
    nukeSegaEnabled: true,
    nukeSegaSky: "images/fx/nuke-sega-sky.png",
    nukeSegaMushroom: "images/fx/nuke-sega-mushroom.png",
    nukeSegaMaster: [1280, 720], nukeSegaHorizonY: 499, // master coords
    nukeSegaCrop: [291, 48, 700, 451], // mushroom PNG placement in master
    nukeSegaBaseX: 640, nukeSegaCapCenter: [635, 211], nukeSegaCapBottomY: 325,
    nukeSegaScaleFrom: 0.15, nukeSegaScaleTo: 1.0,
    nukeSegaExpandSec: null, // null = whole blast window (3.1s); ease-out cubic
    nukeSegaShakePx: 16, // max screen shake at detonation (decays over window)
    nukeSegaDetFlashSec: 0.55, // yellow → white → fade at detonation
    nukeSegaGlowHz: 2.2, // core glow pulse
    nukeSegaShimmerPx: 2.0, // per-row cap heat wobble (master px)
    nukeSegaFadeOutSec: 0.35, // fade sega nuke to postnuke Austin at window end
    nukeSegaSkipPostFlashBw: true, // keep color (B&W filter would gray the yellow flash)
    nukeMushroomAnimFps: 8,
    nukeMushroomAnimLoop: false,
    nukeMushroomAnimQueued: false,

    elevMaxTier: 2, // sega31l nix tier3
    elevTier3Enabled: false, // sega31l
    nixTier3: true, // sega31l only Tier1 ground + Tier2 fly
    menuLoopOnAnyInput: true, // sega31k any main-menu gesture starts/unmutes 8-bar
    inheritMenuAudioUnlockOnStart: true, // sega31k run song unmuted immediately
    skipStartBlackStall: true,
    playerHoverWobbleMult: 1.20, // sega31k +20% vertical bounce always
    // sega31q+ editor: ground shadow — fixed low screen Y, tracks player X, darker than road
    playerGroundShadow: true,
    playerShadowScreenY: 0.94, // fraction of playfield H (near bottom; not elev destY)
    playerShadowColor: 'rgb(18, 12, 28)', // darker purple/black vs road rgb(50,40,69)
    playerShadowAlpha: 0.78,
    playerShadowWOfWidth: 0.16, // ellipse rx as fraction of canvas W (phones)
    playerShadowHOfWidth: 0.028, // ellipse ry
    // editor: shrink shadow with altitude (ground plane Y stays fixed in normal play)
    // shrinkAmount 1.0 → scale = 1 − elevProgress → 0 at elevCeiling (full fade)
    playerShadowScalesWithElev: true,
    playerShadowShrinkAmount: 1.0, // scale = 1 − elevProgress × 1.0 → 0 at ceiling
    playerShadowMinScale: 0, // full fade at elevCeiling
    playerShadowFullAtGround: true, // scale 1.0 when playerElevScreenY ≈ elevGround 0.99
    // winCruise / YOU WIN sky takeoff: shadow Y tracks player draw Y (else fixed ground plane)
    playerShadowFollowsPlayerYOnWinCruise: true,
    roadFillColor: 'rgb(50, 40, 69)', // docs; COLORS.LIGHT/DARK.road = #322845 in common.js
    playerInFrontOfBrains: true, // sega31k draw player after brains
    zapHitShakeLeftRight: true, // sega31k rapid L/R frame flip on zap
    noCuteSparklesOnZap: true, // sega31k fiery FX only; pickup burst hearts-only
    lyricsPreserveCase: true, // sega31k no ALL CAPS on lyric display
    lyricsNoAllCaps: true,
    bulletOriginTracksElevation: true, // sega31l spawn Y follows gun/elev
    bulletMuzzleYOffsetPx: -45, // sega31l relative to player elev Y (not fixed screen -50)
    bulletOriginYOffsetPx: 0, // sega31l unused when tracks elevation

    pauseTsIncrementOnlyOnSend: true,
    pauseTsLogFile: "script-edit/pause-timestamps.json",
    pauseTsSentToast: "Timestamp sent to HQ",
    pauseTsSentToastSec: 1.2,
    pauseTimestampFormat: "TS: {n} @ {m}:{ss}:{cs}",
    trainerMenu: true,
    trainerCloseLabel: "CLOSE",
    trainerCloseReturnsToPaused: true,
    playerElevationEnabled: true,
    playerElevationViaHearts: true,
    elevHeartsPerTier: 3,
    elevTier1OnGround: true,
    elevTier1ScreenY: 0.99, // sega31g: lower still (was 0.96 too high)
    elevTier2ScaleMult: 1.15,
    elevTier3ScaleMult: 1.15,
    elevFlyOverCarsFromTier: 2,
    elevFirstPersonBurst: false, // sega31l nix tier3 / 1st-person
    elevFirstPersonScaleMult: 10.0,
    elevFirstPersonZapSec: 5.0, // sega31d tier3 duration
    elevTier3DurationSec: 5.0,
    elevTier3ExpandRateMult: 0.10,
    elevTier3CollectHeartAddsSec: 5.0,
    elevTier3HeartsOfferedEverySec: 5.0,
    elevTier3HeartsPerOffer: 3,
    elevTier3ReturnToTier2SlowMult: 1.5,
    elevFirstPersonReturnSlowMult: 1.5,
    elevTier2RemainWhileSpeedGe: 100, // unused when elevTier2AloftRules
    elevTier2HoldMinDisplaySpeed: 100,
    elevTier2AloftRules: false, // sega31n: superseded by continuous altitude
    elevTier2DurationSec: 5.0,
    elevTier2CollectHeartAddsSec: 5.0,
    elevTier2HeartsOfferedEverySec: 5.0,
    elevTier2HeartsPerOffer: 3,
    elevTier2ReturnToTier1: true,
    elevTier2ScreenY: 0.62, // legacy; continuous uses elevCeilingScreenY
    elevSmoothLerp: true, // sega31n keep smooth motion
    elevSmoothLerpRate: 5.5,
    elevTier2TimerDisplay: false, // sega31n no aloft countdown
    // sega31n continuous altitude (resolution-independent fractions of playfield H)
    elevContinuousAltitude: true,
    elevCeilingScreenY: 0.7125, // ground 0.99 − 0.75×(0.99−0.62)
    elevCeiling: 0.7125,
    elevHeartBoostOfPlayfieldH: 0.08333, // sega31o ×3 (was 0.02778; ~60px @ H≈720)
    elevHeartBoostScreenY: 0.08333, // sega31o ×3
    elevSinkRateOfPlayfieldHPerSec: 0.01389, // intent ~10px/s @ H≈720
    elevSinkRateScreenYPerSec: 0.01389,
    carClearAltitude: 0.8361, // editor: climb delta ×1.5 vs sega31t (ground 0.99 − 0.1026×1.5); higher min fly-over
    carClearScreenY: 0.8361,
    elevFloatHoldSec: 1.0,
    elevCeilingHeartGrantsFloatHold: true,
    // sega31n YOU WIN elev freeze
    winFreezeElevTier: true,
    winPreserveElevY: true,
    winNoGroundSnap: true,
    winSkipElevTimeout: true,
    // sega31n tiny kamikaze chew shake
    tinyKamikazeChewOnContact: true,
    tinyChewShakeSec: 1.0,
    tinyChewAttachToPlayer: true,
    tinyChewDamageAtStart: true,
    tinyChewShakeAmpOfPlayfieldH: 0.01111, // intent ~8px @ H≈720
    // sega31n zaps aim at player elev
    zapAimedAtAltitude: true,
    elevTier3ShootCars: true, // keep capability; gate via minTier not tier3
    tier3CanShootCars: true,
    elevShootCars: true, // sega31l
    playerCanShootCars: true, // sega31l
    elevTier3TimerDisplay: false, // sega31l no tier3 countdown
    playerShootCarsMinTier: 1, // sega31l shoot cybercabs anytime
    carHp: 1, // sega31l one bullet kills
    cybercabHp: 1, // sega31l
    tinyKamikazeAfterGlow: true, // sega31l tinies: glow then dive, no lightning
    tinyKamikazeDiveSec: 0.55,
    tinyKamikazeAimPlayerElev: true, // sega31m dive at player's elev tier Y (lock at attack)
    tinyKamikazeMissFallsToGround: true, // sega31m evade → visible fall, harmless
    tinyKamikazeHeadOffsetOfPlayerDrawH: 0.90, // legacy feet-frac equiv of crown+0.10 inset (sega31p 0.65 failed = chest)
    tinyKamikazeAimCrownInset: true, // sega31q: aimY = feetY − drawH + inset×drawH
    tinyKamikazeHeadInsetOfPlayerDrawH: 0.10, // near crown (0.08–0.12 OK)
    noFireWhenHealthZero: true, // sega31q: block all shoot when HP≤0 / DEATH / dying
    noFireOnWinCruise: true, // sega31r: block shoot when WELL DONE / YOU WIN / winCruise
    noFireWhenWinBanner: true, // sega31r: same gate via winBanner / finaleWon
    clearHeartsOnBossFight: true, // sega31r: clear pickups at Protect / beginFinaleFight
    bossFightNoHearts: true, // sega31r: stop leftover / new sky hearts during fight
    noScreenFlashOnHeartCollect: true, // sega31q: no white/damage/shock flash on heart; damage only
    tinyChewShards: true, // sega31o debris shards during chew
    tinyChewShardPulseSec: 0.08,
    cybercabCoastOff: true, // sega31o never pop-despawn — decelerate/coast so player passes
    cybercabCoastDecelPerSec: 0.55, // fraction of speed shed per sec toward stop
    brainExitShrink: true, // sega31o clear/despawn → perspective shrink, not instant vanish
    brainExitShrinkSec: 0.85,
    heartSizeMult: 0.3, // sega31m ~×0.8 of 0.375 if used
    elevFirstPersonImmuneToZaps: true,
    elevFirstPersonCanZapBrains: true,
    elevFirstPersonReturnToTier: 2,
    heartDropFromSky: true,
    heartDropSpawnScaleMult: 3.75, // sega31d 75%
    heartSpawnAtTopOfScreen: true,
    // sega32 SHIPPED: hearts originate above a random absolute road lane, not above her head.
    heartSpawnForegroundAbovePlayer: false, // superseded: means above random lane, never above player
    heartsSpawnAboveLaneNotPlayer: true,
    heartLaneScreenXAbsolute: true,
    heartLaneScreenXFrac: 0.18, // sega40: keep older lane-switch feel (NOT heartsInward 0.14)
    heartsLaneSpawnQueued: false, // sega32 SHIPPED; sega33 frac+catch widen
    // sega32 SHIPPED: draw road after every background pass; BG clipped above horizon.
    roadAlwaysInFrontOfBg: true,
    roadOverBgZOrder: true,
    roadBgLayerConflictQueued: false,
    roadNoBgFlashThrough: true, // no BG peeking/flashing through road; stable occlusion
    roadUnderHorizonFillColor: null, // sega33: null → dusk/night grass; opaque fill under horizon
    bgFlashBehindRoadFixQueued: false, // sega32 SHIPPED
    // Keep heartsRandomLeftRight/heartsRandomLaneOnSkyOffer below; no runtime wiring yet.
    heartDropGravity: true,
    heartDropGravityAccel: 1800,
    heartDropInitialVy: 0,
    heartSpawnScreenY: -0.12, // sega31m a little higher / more off-top
    heartDropEndScaleMult: 0.25, // sega31k shrink to 25% while falling
    heartSpawnRateMult: 5, // sega31k 5× spawn rate
    heartNotFromRoadHorizon: true,
    heartDropLingerSec: 1.0,
    heartDropScaleToNormalInFlight: true,
    heartDropLaneGated: true,
    heartLaneGatedCatch: true, // sega31j
    heartsRandomLeftRight: true, // sega31z SHIPPED: each heart independently random L/R lane
    heartsRandomLaneOnSkyOffer: true, // sega31z SHIPPED: offerTier3Hearts uses Math.random lane
    heartsBulletTapQueued: false, // editor-first QUEUE: hearts random L/R + bullet end-at-tap — NO runtime wiring until Build
    heartScreenSpaceFollowsLaneOffset: true, // sega31j: X from laneOffsets vs playerX
    heartShiftWithRoadOnLaneChange: true,
    heartDropFallFast: true,
    bossZapStormBeforeStoryboardSec: 3,
    bossZapStormIntervalSec: 2.0,
    bossZapStormUnavoidable: true,
    bossZapStormSegaExplode: true,
    cybercabColorMode: "pixel", // sega31r: B = NN+limited-palette cybercab-pixel/* (soft prebake OFF; NOT atlas A)
    // sega31r: B shipped alone; C pending (mix ratio ready). Facts typed c+c → B+C when C art lands.
    cybercabTrafficMix: "B+C", // B = cybercab-pixel; C = cybercab-handpixel when present; NOT atlas SPRITES.CARS
    cybercabMixRatioB: 0.5, // default ~50/50; configurable TBD
    cybercabMixRatioC: 0.5,
    cybercabSoftPrebakeDisabledForShip: true, // sega31r: soft/modern prebake OFF; traffic uses B pixel path
    cybercabHandPixelPending: true, // sega31r: C pending — ship B alone; mix uses B until handpixel assets exist
    cybercabCanShipBAlone: true,
    cybercabRejectAtlasMix: true, // do NOT use SPRITES.CARS atlas as mix partner
    cybercabPixelStylePick: "B+C",
    cybercabPixelDir: "cybercab-pixel", // B assets
    cybercabHandPixelDir: "cybercab-handpixel", // C when authored
    cybercabImageSmoothing: false, // NN draw for B/C
    cybercabNeonGlowOffForPixel: true, // no soft shadowBlur/lighter wash on B
    cybercabColorVariants: true,
    introPartyGoers: true,
    introPartyGoersWindowSec: 25,
    introPartyGoersSparse: true,
    uphillPosesDistinctFromFlat: false, // sega31g: nix uphill frames — original 3 static only
    nixUphillPlayerFrame: true,
    playerUphillFrameDisabled: true,
    laneSwipeBetweenButtons: true,
    laneSwipeActivatesLeftRight: true,
    trainerCloseAlwaysVisible: true,
    trainerCloseStickyTopAndBottom: true,
    nukeFlashConsumesEntireScreen: true,
    nukeFlashCoversWhileBgSwap: true,
    nukeFlashRevealsNukeBg: true,
    nukeFlashFullBleedHideWorld: true,
    nukeFlashSwapBgUnderWhiteout: true,
    nuclearWinterDisabled: true, // sega31j
    nukeNoNuclearWinterBw: true,
    nuclearBlastScale: 2.5, // top-level alias → nuclearBlast.nuclearBlastScale
    nuclearBlastSizeMult: 2.5,
    nuclearBlastMushroomClear: true,
    nuclearBlastNoHeartSilhouette: true,
    nukePostFlashBwToColorSec: 1.0, // after nukeFlash: bright grayscale → color over 1s
    nukeSkipWinterGrayscale: true,
    runCompleteMainMenuOnly: true,
    runCompleteNoInsertToken: true,
    // --- sega31d ---
    // --- sega31m ---
    tapRequiresBrainHit: true, // tap ON brain to shoot brains
    missAutoAimNearest: false, // REMOVE miss→nearest auto-aim
    brainBulletHoming: false, // DISABLE brain bullet homing
    cybercabTapKeep: true, // cybercab tap KEEP
    hideBrainHpBars: true, // NO health bar/pips under brains
    brainThrobWithLowHp: true, // all brains: visual pulse faster+harder as HP↓
    brainThrobAmpFull: 0.10,
    brainThrobAmpLow: 0.34,
    brainThrobRateFull: 2.2,
    brainThrobRateLow: 18,
    earlyTrafficUntilSec: 96, // 2× cars until verse2 starts
    earlyTrafficMult: 2,
    earlyTrafficBase: 56,
    earlyTrafficMax: 110,
    // --- sega31s ---
    zapHitShakeMult: 0.70, // sega31s zap shake −30%
    segaExplosionSizeMult: 1.35, // sega31s sega explosions +35%
    mediumBrainScale: 1.25, // sega31s medium default size +25%
    // SUPERSEDED: sega31s postBossGenerousHearts during winCruise/takeoff — no hearts on YOU WIN
    postBossGenerousHearts: false, // was true sega31s; disabled — noHeartsOnWinCruise
    postBossHeartBurstCount: 14,
    postBossHeartSpawnRateMult: 8,
    noHeartsOnWinCruise: true, // YOU WIN / winCruise / end takeoff: no spawn + clear falling
    noHeartsOnWinTakeoff: true,
    heartGroundMissSilent: true, // ground miss = fade/remove; no spawnExplosion / cute / fiery
    heartMissNoExplosion: true,
    heartMissFade: true,
    heartMissFadeSec: 0.35,
    postBossCarsFromHorizon: true, // sega31s after boss gone: lots of cars from horizon
    postBossTrafficBase: 90,
    postBossTrafficMax: 160,
    postBossTrafficMinDistSeg: 3,
    alwaysCanShootExceptDeath: true,
    shootBlockedOnlyDuringDeathBanner: true,
    deathCoverPlayerWithExplosions: true,
    carsExplodeWithSegaOnShot: true,
    carShotFxKind: "sega",
    carHitByPlayerUsesSegaExplosion: true,
    enemyCollisionFxKind: "sega", // player↔car: Sega explosion (never pickup/cute)
    carCollisionFxKind: "sega",
    carCollisionExplosionSizeMult: 1.30, // +30% size for player↔car collision explosions only
    pickupBurstHeartsOnly: true,
    pickupParticlesOnlyOnHeartCollect: true,
    heartCollectFxKind: "pickup",
    cuteParticlesOnlyOnHeartCollect: true, // HARD: pink/cyan ONLY when _heartCollectFx
    noPickupBurstOnEnemyCollision: true,
    noPickupBurstOnZap: true,
    blockPickupBurstOnCarHit: true,
    // Austin backdrop from start; rotate among Austin plates on each song section change
    austinBgFromStart: true,
    austinBgRotatePerSection: true,
    austinBgRotateEveryLyricLines: 0, // disabled when 0/false; per-section wins when true
    austinBgPlates: ["dusk", "ember", "night", "violet", "storm", "acid"],

    // --- sega31w Austin single-layer BG ---
    austinBgSingleLayer: true, // when true: draw one scaled plate instead of SKY/HILLS/TREES stack
    austinBgSingleScaleMode: "cover", // cover | contain | stretch
    austinBgSingleYFrac: 0, // top of single plate band
    austinBgSingleHFrac: 0.55, // height band above road (~fills upper playfield)
    austinBgSingleScale: 1.0, // extra multiplier after cover/contain/stretch
    austinBgSingleSource: "full", // sega40/41: full PNG (trees crop = glitch); no wrap scroll
    austinBgSingleLayerQueued: false,
    // sega40/41: austin-new plates (lazy) + pins (chorus1 violet PRE-nuke; verse1 dusk)
    austinBgUseAustinNewPlates: true,
    austinBgFullPlateNoScroll: true, // sega41: kill hard vertical seam on full PNG wrap

    austinBgPlateBySection: { verse1: "dusk", chorus1: "violet", verse2: "storm" }, // sega43: verse2 = NEW BG after tunnel exit
    verse1AustinBgPlate: "dusk",
    chorus1AustinBgPlate: "violet",
    // sega43: ROOT CAUSE chorus1 stripes = SECTIONS.chorus1.psych (neonBlood→outrunCheck) faded
    // the Austin world to 0 and painted procedural stripes. A pinned plate now wins over psych.
    austinBgPinSuppressesPsych: true,
    // sega43: fast single-strip plates (1280x480 JPEG, ~200KB) — dusk+violet in CRITICAL set,
    // others first in lazy queue. The 3.6MB PNG sheets are 3 stacked copies; not needed.
    austinBgFastStrips: true,
    austinBgFastStripCritical: ["dusk"], // sega44: violet moved to the lazy queue (chorus1 @59s)
    criticalDeadlineMs: 7500, // sega44: hard safety — Start unlocks by ~7.5s after page load even if art is still arriving
    austinBgLoadFullPngSheets: false, // sega43: skip ~25MB lazy PNG batch (strip == same pixels)
    austinBgAtlasSource: "trees", // sega43: atlas/postnuke sheets draw ONE strip (never full 3-band sheet)
    verse1BgGlitchFixQueued: false,
    chorus1BgGlitchFixQueued: false,
    heartCatchFxAtPlayerHead: true,
    heartCatchOffsetXFrac: 0,
    heartCatchOffsetYFrac: 0,
    heartCatchHeadOfPlayerDrawH: 0.90,
    heartCatchLandingQueued: false,
    heartsInwardQueued: false, // CANCELLED sega40 — keep 0.18 lane-switch feel
    heartsInwardCancelled: true,
    holdingCarsEnabled: true,
    holdingCarsTrafficMult: 2,
    holdingCarsDoubleQueued: false,
    // --- sega31v tunables ---
    // A) Horizon black-gap seal (playtest shot-02)
    bgSkyYFrac: 0.0,
    bgSkyHFrac: 0.72,
    bgHillsYFrac: 0.12,
    bgHillsHFrac: 0.58,
    bgTreesYFrac: 0.10,
    bgTreesHFrac: 0.62,
    bgHorizonSeal: true,
    bgHorizonSealYFrac: 0.45,
    bgHorizonSealHFrac: 0.28,
    bgHorizonSealColor: null, // null = dusk/night default in renderer
    roadsideGrassLessBlack: true,
    // B) Howto overlays quieter during live combat
    howtoBannerDimDuringRun: true,
    howtoBannerOpacity: 0.45,
    howtoBannerMaxSec: 2.5,
    // C) Brain tap hitboxes ~28% wider (still requires brain aim)
    brainTapHitPadMult: 1.28,
    // D) Final bullet rule (editor-first queue; no runtime wiring until Build):
    // shots stop on brain/car collision; missed freeAim shots die at fire-time tx/ty.
    // NO free-bullet extend/coast past aim (never use dir*8000); game stays sega31y.
    playerBulletStopOnCollision: true, // hit brain/car: stop immediately on collision
    playerBulletEndAtTapOnMiss: true,  // miss: freeAim ends at the fire-time tap point
    playerBulletEndAtTap: true,        // alias kept for miss end-at-tap
    playerBulletFullScreenRange: false, // NO full-screen range / free-bullet coast
    // E) Post-nuke Austin plates
    postNukeUseAustinPlates: true,
    normalBrainsAreMedium: true,
    brainKinds: ["tiny", "medium", "boss"],
    preBridgeOnlyTinyBrains: true,
    preBridgeBrainKind: "tiny",
    tinyBrainHorizontalSpeedBoostPerSpawn: 0.05,
    chorus1MediumGestationSec: 3.0,
    chorus1MediumSpawnsTiniesFromSelf: true,
    chorus1MediumSpawnsTinyCount: 2,
    mediumBrainGestationSec: 3.0,
    carCollisionDamageScaleByDisplaySpeed: true,
    carCollisionDamageFullAtDisplayMph: 240,
    carCollisionDamageCapMph: 240,
    carCollisionDamageAtZeroDisplaySpeed: 0,
    roadMorePixelly: true,
    roadPixelQuantize: true,
    roadNearestNeighborUpscale: true,
    hideDesktopStartRestart: true,
    singleInsertTokenToStartGame: true,
    insertTokenStartsLoopMusicOnLaunch: true,
    runCompleteLoopAfterSongEnds: true,

    // --- sega31w section title banners ---
    sectionTitleEnabled: true,
    sectionTitleYFrac: 0.22, // ~22% down canvas, above player
    sectionTitleDurationSec: 3.0,
    sectionTitleFadeSec: 0.5,
    sectionTitleScale: 1.0,
    sectionTitleFontSizePx: 56,
    sectionTitleFill: "#ff66cc",
    sectionTitleStroke: "#00f0ff",
    sectionTitleGlow: "#ff2ec4",
    sectionTitleLabelVerse1: "FIRST VERSE",
    sectionTitleLabelChorus1: "CHORUS",
    sectionTitleLabelVerse2: "SECOND VERSE",
    sectionTitleLabelChorus2: "CHORUS",
    sectionTitleLabels: {
      verse1: "FIRST VERSE",
      chorus1: "CHORUS",
      verse2: "SECOND VERSE",
      chorus2: "CHORUS"
    },
    sectionTitleQueued: false,

    // --- sega31x first brain (late verse1) ---
    firstBrainEnabled: true,
    firstBrainAtSec: 27.0, // just before "This party's been crashed" @ 28.02
    firstBrainQueued: false,

    // --- sega31x holding hills → chorus1 brains → tunnel ---
    holdingHillsEnabled: true,
    holdingHillsStartSec: 40,
    holdingHillsRampSec: 19,
    holdingHillsMaxAmp: 24, // sega32 toned (was 40)
    hillsTonedDownQueued: false, // sega32 SHIPPED
    chorus1MediumSpawnTinies: true,
    chorus1MediumAtSec: 59,
    bloodMediumAtSec: 66.92,
    bloodMediumSpawnPerSec: 1.0,
    tunnelEnterSec: 93.5, // sega35: interior starts after shrink-in + black (anchors kept)
    tunnelExitSec: 103.44, // sega35: start exit shrink-out (lyric cue kept)
    tunnelHeartsEnabled: false, // sega37: NO hearts in tunnel (Facts). Opt-in only.
    tunnelHeartEverySec: 1.0, // interval if tunnelHeartsEnabled=true (legacy sega34 ~1.0s)
    tunnelPlayerLaneScreenX: true, // sega37: draw player at lane X while road skipped (L/R dodge)
    tunnelFractalFrames: 6, // legacy procedural fractal; superseded by interior anim when approach enabled
    tunnelFractalEnabled: true, // keep until Build swaps to asset interior
    // --- sega35 voice redesign: fixed mouth + player shrink (always visible) + delayed road ---
    tunnelApproachEnabled: true,
    tunnelFreezeStartSec: 87.5, // road scroll freezes; fixed mouth appears
    tunnelApproachStartSec: 87.5, // alias of freeze start (legacy key)
    tunnelEntranceVisibleSec: 90.5, // when mouth visible → force elev tier 1
    tunnelEntranceVisibleProgress: 0.4, // 0–1 of approach phase alt threshold for force tier1
    tunnelApproachDurationSec: 6.0, // legacy duration hint (derived from enter-freeze)
    tunnelMouthFixedScale: 0.55, // FIXED distant mouth — used when tunnelMouthCoverWidth=false
    tunnelMouthCoverWidth: true, // sega36: uniform scale-to-cover screen WIDTH (scaleX===scaleY; vertical may clip)
    tunnelPlayerShrinkDurSec: 2.8, // BASE shrink duration (before tunnelEnterSpeedMult)
    tunnelEnterSpeedMult: 0.5, // sega43: shrink-in move ×0.5 speed (= 2× duration); ends at black-in (enter fixed)
    // sega43: straight + decel approach into the mouth
    tunnelStraightLeadSec: 3.0, // road forced straight/flat for this many song-sec before mouth (freeze)
    tunnelStraightEaseSec: 0.6, // curvature/pitch ease to zero at start of straight window
    tunnelDecelSec: 2.5, // ease-out decel window; road reaches 0 exactly at tunnelFreezeStartSec
    tunnelBlackHoldSec: 1.5, // sega43: pure black after full entry; interior starts later (exit cue fixed)
    tunnelExitFadeInSec: 1.0, // sega43: fade up from black onto the new post-tunnel BG
    tunnelBlackDurSec: 0.45, // black cover before interior
    tunnelExitShrinkDurSec: 2.5, // mirror exit: shrink into distance
    tunnelExitBlackDurSec: 0.4, // black after exit shrink
    tunnelRoadDelaySec: 3.0, // +3s after exit black before road/scroll resume
    tunnelPlayerMinScale: 0.12, // never invisible — scaled small OK
    tunnelApproachScaleFrom: 0.55, // legacy; mouth uses tunnelMouthFixedScale
    tunnelApproachDownhillEnabled: false, // sega35 OFF — no downhill pitch into mouth
    tunnelApproachDownhillSec: 3.0,
    tunnelApproachDownhillAmp: 35,
    tunnelApproachEnvelopeScreen: false, // sega35 OFF — no mouth envelope fly-at-camera
    tunnelApproachScaleTo: 0.55, // unused when envelope off; keep near fixed scale
    tunnelApproachFullBleedAtEnter: false, // sega35: black fade replaces full-bleed mouth
    // sega32 SHIPPED: approach mouth AFTER road; bottom pinned to horizon; no horizon drop.
    tunnelApproachHorizonLock: true, // mouth bottom pinned to road horizon
    tunnelApproachHorizonDrop: false, // optional; prefer tunnel BG in front over moving horizon
    tunnelApproachScaleWithHorizon: true, // expand mouth while keeping bottom locked to horizon
    tunnelApproachRoadInFrontException: true, // approach exception to roadAlwaysInFrontOfBg
    tunnelEntranceInFrontOfRoad: true, // Build: draw mouth after road during approach
    tunnelForceTier1OnEntranceVisible: true,
    tunnelApproachClearTraffic: true, // queued: no new cars from downhill window start
    tunnelApproachClearRoadside: true, // queued: no new roadside sprites/graphics from window start
    tunnelApproachDespawnBrains: true, // queued: extant pre-enter brains silently disappear; interior spawns passive dodge brains
    tunnelBrainSmashOnEntrance: false, // queued add-on supersedes wall-smash behavior
    tunnelApproachNoBrainWallHit: true,
    tunnelInteriorAnimFrames: 6,
    tunnelInteriorAnimFps: 8,
    tunnelInteriorAnimLoop: true,
    // --- queued Sega Boring Co procedural interior (editor-first; no Build yet) ---
    tunnelInteriorProcedural: true, // Super Scaler ring-rush, preferred over weak six-frame stubs
    tunnelInteriorPathEnabled: true,
    tunnelInteriorPathTurnAmp: 0.22, // vanishing-point X wobble as fraction of width
    tunnelInteriorPathPitchAmp: 0.10, // vanishing-point Y wobble with downhill bias
    tunnelInteriorPathTwistAmpDeg: 25, // roll/spiral degrees
    tunnelInteriorPathHz: 0.15,
    tunnelInteriorPathScript: 'easeL,twist,easeR,straight',
    tunnelInteriorRingCount: 12,
    tunnelInteriorRingSpeed: 1.0,
    tunnelInteriorUseBcPalette: true, // gray concrete + orange lights
    tunnelInteriorPathQueued: false, // sega35 SHIPPED
    // --- queued passive tunnel dodge gameplay (editor-first; no Build yet) ---
    tunnelForceElevTier2: true, // while inTunnel / interior — set elev tier 2 (fly)
    tunnelDodgeBrainsEnabled: true,
    tunnelDodgeBrainKind: 'medium',
    tunnelDodgeSpawnFromHorizon: true,
    tunnelDodgeRandomLane: true,
    tunnelDodgeNoFight: true, // no zap, kamikaze, or telegraph attack
    tunnelDodgeOnly: true, // player dodges by lane only
    tunnelDodgeBobOnly: true, // vertical bob only; no left/right movement
    tunnelDodgeBobAmp: 0.03, // gentle bob as playfield fraction
    tunnelDodgeBobHz: 0.7,
    tunnelDodgeSpawnEverySec: 2.0, // medium passive dodge brains remain (less dense than tinies)
    tunnelDodgeQueued: false, // sega35 SHIPPED
    // --- sega39 tunnel center-rush tinies (replaces cyber-flies) ---
    tunnelCenterRushEnabled: true,
    tunnelCenterRushSpawnEverySec: 0.75,
    tunnelCenterRushMaxActive: 7,
    tunnelCenterRushApproachSpeed: 0.72,
    tunnelCenterRushTrackRate: 3.2,
    tunnelCenterRushScale: 0.32,
    tunnelCenterRushDamage: null, // null = medium brainZap damage
    // --- sega43 fair tinies: appear → hover (queue) → wind-up tell → one straight launch at a time ---
    tinyBrainAppearSec: 1.0, // fade+scale in near center; harmless
    tinyBrainWindupSec: 0.35, // red pulse + shake tell before launch
    tinyBrainLaunchGapSec: 1.0, // gap after one launch resolves before next wind-up
    tinyBrainMaxQueued: 3, // max appearing/hovering at once
    tinyBrainLaunchSpeed: 1.6, // path fraction / sec (1.6 ≈ 0.63s flight) straight to lane locked at launch
    tinyBrainHoverScale: 0.42, // hover size vs full (1.0 at player)
    // --- sega38 cyber-flies (DISABLED sega39 — module unused) ---
    cyberFlyEnabled: false,
    cyberFlySpawnEverySec: 1.4,
    cyberFlyMaxActive: 3,
    cyberFlyGlowSec: 1.0,
    cyberFlyApproachSpeed: 0.22,
    cyberFlySwirlApproachSpeed: 0.045,
    cyberFlySwirlSec: 1.8,
    cyberFlyApproachNear: 0.72,
    cyberFlyDiveSpeed: 9.5,
    cyberFlyDiveSec: 0.55,
    cyberFlyDamage: null, // null = medium brainZap damage
    cyberFlyRadius: 28,
    cyberFlyAnimFrames: 6,
    cyberFlyAnimFps: 10,
    cyberFlyFramePrefix: 'images/fx/cyber-fly/f',
    cyberFlyFrameExt: '.png',
    cyberFlyFrames: [
      'images/fx/cyber-fly/f01.png',
      'images/fx/cyber-fly/f02.png',
      'images/fx/cyber-fly/f03.png',
      'images/fx/cyber-fly/f04.png',
      'images/fx/cyber-fly/f05.png',
      'images/fx/cyber-fly/f06.png'
    ],
    tunnelEntranceAsset: 'images/fx/tunnel-entrance.png',
    tunnelEntranceContentFrac: 0.67, // sega33: source-crop black void below content
    tunnelInteriorFramePrefix: 'images/fx/tunnel-interior-f',
    tunnelInteriorFrameExt: '.png',
    tunnelInteriorFrames: [
      'images/fx/tunnel-interior-f01.png',
      'images/fx/tunnel-interior-f02.png',
      'images/fx/tunnel-interior-f03.png',
      'images/fx/tunnel-interior-f04.png',
      'images/fx/tunnel-interior-f05.png',
      'images/fx/tunnel-interior-f06.png'
    ],
    tunnelApproachQueued: false, // sega35 SHIPPED
    tunnelDownhillEnvelopeQueued: false, // sega35 replaced by drive-in
    holdingChorusTunnelQueued: false,

    // --- sega31x chorus2 road chaos ---
    chorus2ChaosEnabled: true,
    chorus2ChaosStartSec: 155,
    chorus2ChaosRampUpSec: 5,
    chorus2ChaosHillAmp: 36,
    chorus2ChaosBumpAmp: 18,
    chorus2ChaosCurveAmp: 4,
    chorus2ChaosEaseDownStartSec: 175,
    chorus2ChaosEaseDownSec: 10,

    // --- sega31x win-path finale (after boss WIN) ---
    winNoCars: true, // supersedes postBossCarsFromHorizon on win path
    winHeartDropPerSec: 2, // supersedes noHeartsOnWinCruise for this phase
    winHeartDropUntilAscent: true,
    winAscentMaxDisplayMph: 666,
    winAscentMaxSpeed: 666,
    winAscentNoShadowPastTier: 2,
    winAscentDropRoadBgPastTier: 2,
    winAscentDropRoadBgSec: 2.5,
    winAscentStarrySkyEnabled: true,
    winAscentStarryFromTop: true,
    winFinaleQueued: false,

    // --- sega31x/y Austin city BG scroll (single-layer) ---
    austinBgScrollEnabled: true,
    austinBgScrollSpeed: 0.002, // ~22% of treeSpeed; travel = posDelta/segmentLength
    austinBgScrollLessDramatic: true,
    austinBgScrollQueued: false,

    // --- sega31x fresh post-nuke Sega Austin BG ---
    postNukeFreshSegaBg: true,
    postNukeSegaStyle: true,
    postNukeFreshSegaQueued: false,

    // --- sega31x party-crash clouds + lightning @ 28.02 ---
    partyCrashWeatherEnabled: true,
    partyCrashWeatherAtSec: 28.02,
    partyCrashClouds: true,
    partyCrashLightning: true,
    partyCrashWeatherIntensity: 0.75,
    partyCrashWeatherDurationSec: 12,
    partyCrashWeatherQueued: false,

    // --- sega31x sax BG on diamond2 / Mad Max 2nd holding-on ---
    saxBgStartSec: 120.5,
    saxBgEndSec: 155,


    rankThresholds: [
      { score: 0, label: "Survivor" },
      { score: 12000, label: "Street Runner" },
      { score: 35000, label: "Diamond Hands" },
      { score: 70000, label: "Fight Ready" },
      { score: 120000, label: "BRAIN WATCH" }
    ]
  };

  var keyMap = {
    left: [KEY.LEFT, KEY.A],
    right: [KEY.RIGHT, KEY.D],
    faster: [KEY.UP, KEY.W],
    slower: [KEY.DOWN, KEY.S],
    nitro: [32],
    start: [13],
    pause: [80],
    restart: [82]
  };

  ns.CONFIG = config;
  ns.KEYMAP = keyMap;
  ns.STORAGE_KEYS = {
    records: "brainwatch_ffyl_racer_records_v1",
    player: "brainwatch_ffyl_racer_player"
  };
})(window.ApexRacer = window.ApexRacer || {});
