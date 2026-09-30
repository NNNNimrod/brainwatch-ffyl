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

    // ---- sega48 knobs (editor "sega48 knobs") ----
    roadStraightStart: 75.5, roadStraightBy: 77.5,      // road dead straight/flat by song time (was 81.5 via tunnelStraightLeadSec)
    approachLaneOffsetScale: 0.3,  // lanes pulled toward road centre while straight (camera ~on axis, no side lurch)
    approachCenterEase: 1.0,       // camera-centring weight eases in/out over this many sec
    tunnelApproachMaxOffsetFrac: 0.12, // her on-screen offset from centre capped (via camera weight) on approach
    starfieldEnabled: true, starfieldFadeStart: 76.0, starfieldFadeDur: 3.5, starfieldHoldUntil: 84.5, // sega50: was 78.0 / 1.5; // city -> black starfield before the mouth
    // --- sega51 (baked from editor-live.json 2026-09-27): horizon cars, boss rework, mouth fade, SECOND VERSE at mouth,
    //     bg scroll, boss bg lightning, erratic nuke cycle/shake, nuke scale grow ---
    carSpawnAtHorizon: true, carSpawnHorizonFrac: 0.95, bossRework: true, bossWaitForGround: true, bossWaitForGroundMaxSec: 3.0,
    bossApproachDur: 7.0, bossApproachStartScale: 0.05, bossApproachProjectileFirstDelay: 1.0, bossApproachProjectileEvery: 1.1,
    bossProjectileTravelSec: 1.0, bossProjectileScale: 0.42, bossProjectileDamage: 30, bossProjectileShootable: true,
    bossMediumCount: 3, bossMediumSpeedMult: 1.5, bossMediumHp: 100, bossMediumGlowWarnSec: 1.42, bossExitUpSec: 1.2,
    bossMediumPhaseMaxSec: 9.0, bossDropDescendSec: 4.0, bossDropEvery: 0.7, bossDropFallSec: 0.6, bossDropScale: 0.42,
    bossDropDamage: 30, bossDropShootable: true, bossDropTargetMode: "herLane", bossFinalDescendSec: 1.5, bossFinalYFrac: 0.4,
    bossFinalFollowLane: true, bossGlowWarnSec: 0.5, bossShootableBeforeFinal: true, bossFinalLatestStartSec: 205.0, bossFailsafeShrinkSec: 0.6, tunnelMouthFadeInSec: 8.0, /* sega54 build (was 5.0) */
    tunnelMouthFadeEase: "smooth", secondVerseTitleOn: true, secondVerseTitleText: "VERSE 2", secondVerseTitleSec: 2.5,
    secondVerseTitleFadeSec: 0.5, tunnelInteriorSectionTitle: false, bgScrollEnabled: true, bgScrollCurvePx: 20, bgScrollSteerPx: 12,
    bgScrollMaxPx: 24, bgScrollEase: 0.6, bgScrollCurveNorm: 4, bossBgLightning: true, bossBgLightningIntensity: 1.5,
    bossBgLightningEvery: 0.3, bossBgLightningMaxBolts: 6, nukeCycleErratic: true, nukeCycleHoldMin: 0.8, nukeCycleHoldMax: 2.5,
    nukeCycleFadeMin: 0.3, nukeCycleFadeMax: 1.2, nukeCycleSnapChance: 0.3, nukeCycleFlickerChance: 0.35, nukeShakeErratic: true,
    nukeShakeJitterPx: 2, nukeShakeAmpPx: [4, 10], nukeShakeBurstSec: [0.25, 0.6], nukeShakeBurstGapSec: [0.4, 1.6],
    nukeShakeSpikeChance: 0.25, nukeShakeSpikePx: [12, 18], nukeShakeViolentChance: 0.2, nukeScaleGrow: true, nukeScaleStart: 1.15,
    nukeScaleEnd: 1.8, nukeScaleBlastSec: 0.8, nukeScaleEase: "easeInOut",
    approachNoBrainsStart: 78.0, // sega50: no-brains window start, decoupled from starfieldFadeStart
    approachNoBrains: true, // sega49: no brains of any kind from starfieldFadeStart until tunnel interior brains start; on-screen ones shrink out at 78 s
    tunnelExitConverge: true, tunnelExitTargetX: 0.5, tunnelExitTargetY: 0.48, tunnelExitEase: "easeInOutCubic", // exit shrinks into the VP
    lightningPrebake: true, lightningMaxBolts: 4, lightningBranchDepth: 2, lightningReuseFrames: 3, lightningNoShadowBlur: true,
    bgParallaxStrength: 6, bgParallaxMax: 4, bgParallaxEase: 0.4, // px per unit curve/steer, px cap, smoothing sec
    bgZoomStart: 1.0, bgZoomEnd: 1.2, bgZoomByDistance: true, bgZoomFullDistance: 1200000, // plates zoom toward the city with road distance
    bgPrescalePlates: false, // sega49 (off: no measurable p95 gain at 4x): cache each bg plate pre-resampled to band size (cheaper per-frame zoom/parallax draw)
    postNukeBgShakeSpikeChance: 0.1, postNukeBgShakeSpikePx: [6, 8], postNukeBgShakeHoldFramesMax: 4,
    powerupTitleText: "THRUSTERS HACKED", // big power-up title (stacked) + toast
    loserBloodFx: false, loserHackFx: false, // lose/death screens: no blood drips / no green hack tint
    roadStartLines: false, // sega46: false = no white START / black FINISH stripes anywhere on the road (editor 'queued for sega46')
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
      afterBg: null, // sega45: postapoc-dayglow ditched; post-nuke = dusk/acid fire cross-fade
      usePostnukeAustinPlates: false, // sega45: destroyed postnuke skylines ditched (fire plates instead)
      winterStart: 164.5,       // sega31m: +2s (was 162.5)
      winterDelaySec: 8.0,
      winterBg: "nuclear-winter",
      winterGrayscaleAll: false, // sega31j: no B&W nuclear winter
      nuclearWinterDisabled: true, // sega31j: stay in color (sega45: fire plates)
      skipWinterGrayscale: true,
      winterRoadside: "rubble",
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
      banner: "THRUSTERS HACKED", // sega48 (was "MAD MAX MODE ENGAGED")
      unlockBanner: "666 POWER UNLOCKED",
      bannerText: "THRUSTERS HACKED", // sega48 (was "MAD MAX")
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
    // sega54: on-road bodies from "blood on the streets" (roadbodies54.js). Density = bodies per 100 road segments.
    roadBodiesOn: true, roadBodiesStartSec: 163.7, roadBodiesEndSec: 185.22,
    roadBodiesDensityStart: 3, roadBodiesDensityEnd: 24,
    roadBodySplatParticles: 34, roadBodySplatSpread: 1.0, roadBodySplatLifeSec: 0.75, roadBodyNoDamage: true,
    // sega54: Greenbelt night roadside pool replaces the chorus1 boulders in this window
    greenbeltRoadsideOn: true, greenbeltRoadsideStartSec: 59, greenbeltRoadsideEndSec: 81.5,
    greenbeltRoadsideDensity: 8, // sega54 build: extra greenbelt props / 100 segments
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
    damageDebrisOn: false, // sega55: debris shards on car-hit damage explosions (false = 
    carHitShakeOn: true, // sega55: screen shake on car hits
    carHitShakePx: 8, // sega55: car-hit shake amplitude (px), decays (1-u)^2
    carHitShakeSec: 0.3, // sega55: car-hit shake duration (s)
    invulnBlinkOn: true, // sega55: player blinks for the whole invulnerability window (
    invulnBlinkHz: 12, // sega55: blink rate (Hz)
    invulnBlinkAlpha: 0.35, // sega55: alpha on the 'off' blink phase
    respawnInvulnSeconds: 3.0,
    bgLayersOn: true, // sega55 LAYERED BG master: cut smooth photo plates at runtime into sky 
    bgLayersKeys: ["night-synth", "dusk-clean", "violet", "greenbelt", "austin-free", "austin-free-synth", "dusk", "acid"], // sega55: plate keys drawn layered (Capitol stays flat)
    bgLayerNearFracByKey: {"night-synth": 0.8, "dusk-clean": 0.83, "violet": 0.83, "greenbelt": 0.8, "austin-free": 0.9, "austin-free-synth": 0.9, "dusk": 0.83, "acid": 0.83}, // sega55: near/foreground line per plate (fraction of plate height)
    bgLayersCacheMax: 4, // sega55: max plates kept cut into layers (memory)
    bgParallaxGain: 2.0, // sega55: layer parallax gain on the steering/curve scroll (x bgScroll o
    bgParallaxSky: 0.05, // sega55: sky layer rate (road = 1)
    bgParallaxFar: 0.25, // sega55: far skyline rate
    bgParallaxNear: 0.6, // sega55: near layer rate
    bgSkyDriftPx: 10, // sega55: sky layer slow sway (cloud drift) amplitude px
    bgSkyDriftPeriodSec: 40, // sega55: sky sway period (s)
    bgSkyStarsOn: true, // sega55: twinkling stars on the sky layer (behind the skyline)
    bgSkyStarsKeys: ["night-synth", "violet", "greenbelt", "austin-free-synth"], // sega55: plates with twinkling stars
    bgSkyStarsCount: 60, // sega55: star count
    bgSkySunriseOn: true, // sega55: slow sunrise creep on the dawn plate sky (106.82-120.5)
    bgSkySunriseRgb: "255,150,60", // sega55: sunrise glow colour r,g,b
    bgSkySunriseMaxAlpha: 0.45, // sega55: sunrise glow max alpha
    bgSkyNukeFlashOn: true, // sega55: nuke flash lights only the SKY of the post-nuke plates; buildi
    bgSkyNukeFlashSec: 2.5, // sega55: sky flash decay after the blast window (s)
    bgSkyTintBySection: {}, // sega55: per-section sky tint, e.g. {"diamond2":"rgba(120,0,255,0.12)"}
    bgLayerFxLightsOn: true, // sega55: colour-cycle only the window lights (far layer)
    bgLayerFxLightsAlpha: 0.45, // sega55: window light cycle strength
    bgLayerFxLightsCycleSec: 6, // sega55: hue cycle period (s)
    bgLayerFxFireFlickerOn: true, // sega55: flicker only the fires on post-nuke plates
    bgLayerFxFireAlpha: 0.55, // sega55: fire flicker strength
    bgLayerFxHitShakeNearMult: 1.5, // sega55: extra foreground-only shake on car hits (x carHitShakePx)
    bgZoomNearMult: 1.6, // sega55: progressive zoom on the near layer (x plate zoom delta)
    bgZoomFarMult: 1.0, // sega55: far layer zoom mult
    bgZoomSkyMult: 0.6, // sega55: sky layer zoom mult
    bgRevealCollapseOn: true, // sega55: post-nuke towers collapse one by one
    bgRevealCollapseStartSec: 162, // sega55: first tower collapse (s)
    bgRevealCollapseGapSec: 1.2, // sega55: gap between towers (s)
    bgRevealCollapseDurSec: 2.0, // sega55: each tower sink time (s)
    bgRevealCollapseTallFrac: 0.55, // sega55: only strips taller than this (mask top < frac) collapse
    bgRevealCollapseToFrac: 0.72, // sega55: towers sink to this plate height
    bgRevealTreesPartOn: true, // sega55: Greenbelt trees part before the tunnel portal
    bgRevealTreesPartStartSec: 78.5, // sega55: trees start parting (s)
    bgRevealTreesPartEndSec: 81.5, // sega55: fully parted (portal fades in 81.5)
    bgRevealTreesPartFrac: 0.35, // sega55: each half slides out by this fraction of plate width // sega55: invulnerability after death/respawn (was 2.0)
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
    madMaxBannerText: "THRUSTERS HACKED", // sega48 (was "MAD MAX")
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
    postNukeAnimFrames: 0, // sega45: dusk-postnuke anim ditched (fire plate cross-fade instead)
    postNukeAnimFps: 6,
    postNukeAnimQueued: false,
    nukeMushroomAnimFrames: 0, // sega45: old 6-frame nuke ditched
    // --- sega43 Sega Super Scaler nuke (replaces 6-frame one-shot + procedural mushroom) ---
    nukeSegaEnabled: true,
    nukeSegaSky: "images/fx/nuke-sega-sky.png",
    nukeSegaMushroom: "images/fx/nuke-sega-mushroom.png",
    nukeSegaMaster: [1280, 720], nukeSegaHorizonY: 499, // master coords
    nukeSegaCrop: [291, 48, 700, 451], // mushroom PNG placement in master
    nukeSegaBaseX: 640, nukeSegaCapCenter: [635, 211], nukeSegaCapBottomY: 325,
    nukeSegaScaleFrom: 0.15, nukeSegaScaleTo: 1.15, // sega45: bigger mushroom
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
    elevTier3HeartsOfferedEverySec: 7.8125, // sega48 hearts x0.64 (was 5.0)
    elevTier3HeartsPerOffer: 3,
    elevTier3ReturnToTier2SlowMult: 1.5,
    elevFirstPersonReturnSlowMult: 1.5,
    elevTier2RemainWhileSpeedGe: 100, // unused when elevTier2AloftRules
    elevTier2HoldMinDisplaySpeed: 100,
    elevTier2AloftRules: false, // sega31n: superseded by continuous altitude
    elevTier2DurationSec: 5.0,
    elevTier2CollectHeartAddsSec: 5.0,
    elevTier2HeartsOfferedEverySec: 7.8125, // sega48 hearts x0.64 (was 5.0)
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
    heartFrequencyMult: 0.75, // sega55: 25% fewer hearts everywhere (1 = sega54)
    heartSpawnRateMult: 3.2, // sega48: hearts x0.64 whole game (was 5; lane-swap/pre-boss/post-boss mults stack on top)
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
    austinBgPlates: ["dusk-clean", "violet", "green-clean"], // sega45: PRE-nuke pool only (clean, no fire)

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

    // sega45 pin map (all pre-nuke plates CLEAN): dusk-clean -> violet (59, blend) -> [tunnel] -> green-clean
    // (106.82 white-out) -> violet (120.5, blend) -> nuke 156.5 -> dusk/acid fire cross-fade
    austinBgPlateBySection: { tutorial: "dusk-clean", verse1: "dusk-clean", holding: "dusk-clean", chorus1: "violet",
      bridge: "violet", verse2: "green-clean", applause: "green-clean", diamond2: "violet", chorus2: "violet", finale: "violet" },
    // sega45: skyline silhouette per plate (128 columns, fraction of plate height where buildings/palms
    // start). Sky storm bolts/flashes are clipped ABOVE this line → they read as behind the skyline.
    // clean = dusk-clean / violet / green-clean (same skyline); dusk / acid = the post-nuke fire plates.
    skylineMask: {
      clean: [0.371, 0.371, 0.373, 0.354, 0.354, 0.354, 0.36, 0.365, 0.36, 0.36, 0.36, 0.417, 0.417, 0.419, 0.427, 0.44, 0.65, 0.667, 0.694, 0.679, 0.679, 0.59, 0.562, 0.558, 0.558, 0.558, 0.56, 0.342, 0.329, 0.329, 0.329, 0.329, 0.34, 0.421, 0.617, 0.565, 0.529, 0.502, 0.492, 0.492, 0.492, 0.523, 0.521, 0.517, 0.517, 0.515, 0.515, 0.515, 0.546, 0.598, 0.656, 0.656, 0.656, 0.66, 0.708, 0.729, 0.729, 0.729, 0.658, 0.658, 0.658, 0.658, 0.688, 0.685, 0.571, 0.544, 0.5, 0.481, 0.481, 0.479, 0.479, 0.479, 0.575, 0.558, 0.558, 0.558, 0.558, 0.56, 0.573, 0.573, 0.573, 0.429, 0.277, 0.152, 0.152, 0.152, 0.158, 0.171, 0.156, 0.15, 0.15, 0.15, 0.412, 0.435, 0.496, 0.481, 0.481, 0.481, 0.481, 0.483, 0.642, 0.623, 0.615, 0.594, 0.585, 0.585, 0.585, 0.588, 0.594, 0.602, 0.64, 0.704, 0.704, 0.681, 0.681, 0.681, 0.681, 0.617, 0.588, 0.548, 0.548, 0.542, 0.531, 0.531, 0.531, 0.546, 0.546, 0.546],
      dusk: [0.698, 0.698, 0.233, 0.233, 0.233, 0.233, 0.683, 0.662, 0.633, 0.633, 0.633, 0.692, 0.633, 0.633, 0.633, 0.646, 0.66, 0.717, 0.662, 0.662, 0.662, 0.662, 0.662, 0.665, 0.673, 0.694, 0.319, 0.319, 0.319, 0.49, 0.727, 0.729, 0.729, 0.631, 0.579, 0.546, 0.494, 0.477, 0.477, 0.477, 0.485, 0.517, 0.544, 0.579, 0.64, 0.519, 0.519, 0.519, 0.619, 0.619, 0.619, 0.619, 0.725, 0.725, 0.729, 0.729, 0.729, 0.729, 0.729, 0.729, 0.729, 0.729, 0.725, 0.685, 0.685, 0.465, 0.454, 0.454, 0.454, 0.454, 0.569, 0.569, 0.569, 0.64, 0.66, 0.654, 0.629, 0.59, 0.585, 0.571, 0.571, 0.571, 0.617, 0.338, 0.152, 0.113, 0.113, 0.113, 0.123, 0.127, 0.113, 0.113, 0.113, 0.135, 0.325, 0.49, 0.481, 0.481, 0.465, 0.465, 0.465, 0.465, 0.635, 0.625, 0.625, 0.625, 0.627, 0.625, 0.625, 0.625, 0.633, 0.648, 0.667, 0.617, 0.615, 0.615, 0.615, 0.725, 0.725, 0.725, 0.723, 0.723, 0.723, 0.45, 0.44, 0.44, 0.44, 0.729],
      acid: [0.698, 0.698, 0.227, 0.227, 0.227, 0.233, 0.7, 0.629, 0.629, 0.629, 0.654, 0.692, 0.631, 0.631, 0.631, 0.644, 0.658, 0.698, 0.662, 0.646, 0.617, 0.617, 0.617, 0.535, 0.535, 0.535, 0.321, 0.321, 0.321, 0.492, 0.725, 0.729, 0.729, 0.631, 0.579, 0.544, 0.496, 0.481, 0.481, 0.481, 0.487, 0.519, 0.548, 0.602, 0.635, 0.519, 0.519, 0.519, 0.623, 0.621, 0.621, 0.621, 0.667, 0.677, 0.715, 0.729, 0.729, 0.729, 0.727, 0.727, 0.673, 0.673, 0.673, 0.685, 0.54, 0.469, 0.452, 0.452, 0.452, 0.627, 0.627, 0.627, 0.554, 0.554, 0.554, 0.654, 0.627, 0.59, 0.554, 0.554, 0.554, 0.573, 0.4, 0.4, 0.304, 0.117, 0.117, 0.117, 0.129, 0.131, 0.117, 0.117, 0.117, 0.148, 0.323, 0.492, 0.473, 0.473, 0.473, 0.465, 0.465, 0.465, 0.627, 0.627, 0.64, 0.637, 0.627, 0.621, 0.621, 0.621, 0.637, 0.648, 0.665, 0.608, 0.608, 0.608, 0.613, 0.613, 0.615, 0.615, 0.619, 0.702, 0.723, 0.446, 0.44, 0.44, 0.44, 0.723]
,
      greenbelt: [0.429,  0.412,  0.417,  0.421,  0.438,  0.433,  0.433,  0.433,  0.442,  0.4,  0.404,  0.412,  0.417,  0.425,  0.421,  0.396,  0.4,  0.396,  0.379,  0.35,  0.354,  0.367,  0.338,  0.342,  0.367,  0.358,  0.358,  0.371,  0.388,  0.392,  0.371,  0.346,  0.367,  0.367,  0.408,  0.408,  0.421,  0.421,  0.425,  0.438,  0.467,  0.529,  0.55,  0.617,  0.613,  0.613,  0.458,  0.625,  0.629,  0.613,  0.608,  0.604,  0.613,  0.617,  0.608,  0.604,  0.608,  0.617,  0.604,  0.604,  0.608,  0.613,  0.613,  0.617,  0.617,  0.613,  0.617,  0.608,  0.608,  0.613,  0.613,  0.613,  0.613,  0.613,  0.613,  0.617,  0.629,  0.625,  0.625,  0.629,  0.613,  0.621,  0.621,  0.621,  0.621,  0.479,  0.546,  0.492,  0.421,  0.404,  0.342,  0.317,  0.317,  0.321,  0.296,  0.292,  0.292,  0.3,  0.292,  0.3,  0.296,  0.296,  0.296,  0.308,  0.317,  0.317,  0.312,  0.304,  0.304,  0.308,  0.308,  0.304,  0.321,  0.321,  0.362,  0.354,  0.354,  0.358,  0.367,  0.367,  0.367,  0.404,  0.379,  0.379,  0.383,  0.392,  0.375,  0.375] // sega52: v3 bluff/tree tops
    },
    // sega45: literal strip paths (deploy-pages.sh ships exactly what the code names)
    austinBgStripPaths: {
      "dusk-clean": "images/bg-austin-new/fast/background-dusk-clean.jpg",
      "violet": "images/bg-austin-new/fast/background-violet.jpg",
      "green-clean": "images/bg-austin-new/fast/background-green-clean.jpg",
      "dusk": "images/bg-austin-new/fast/background-dusk.jpg",
      "acid": "images/bg-austin-new/fast/background-acid.jpg",
      "greenbelt": "images/bg-austin-new/fast/background-greenbelt-night-v3.jpg" // sega52: night greenbelt v3
    },
    // sega54 build: PHOTO background set (free-licence photos, Sega-pixelated; see NOTICE). photoPlatesOn=false -> the old
    // illustrated plates above come back. Same plate keys; only the paths + skyline masks swap. New files, old ones untouched.
    photoPlatesOn: true,
    photoNightSynthPath: "images/bg-austin-new/fast/background-photo-night-synthwave.jpg",   // verse 1 (0 -> photoNightUntilSec), first-load plate
    photoDuskCleanPath: "images/bg-austin-new/fast/background-photo-dusk-clean.jpg",         // orange stretch (holding)
    photoVioletPath: "images/bg-austin-new/fast/background-photo-violet.jpg",                // purple (holding x-fade, 120.5-156.5)
    photoGreenbeltPath: "images/bg-austin-new/fast/background-photo-greenbelt-night.jpg",    // greenbelt 59-81.5
    photoPostnukeDuskPath: "images/bg-austin-new/fast/background-photo-postnuke-dusk.jpg",   // post-nuke fire cycle A
    photoPostnukeAcidPath: "images/bg-austin-new/fast/background-photo-postnuke-acid.jpg",   // post-nuke fire cycle B
    photoTunnelPortalPath: "images/fx/tunnel-portal-photo.png",                               // tunnel mouth (same layout as v2)
    photoNightUntilSec: 40.2,   // night-synthwave plate until the orange->violet holding cross-fade starts
    photoNightFadeSec: 2.0,     // night -> orange cross-fade (ends at photoNightUntilSec)
    // sega55 (queued): untouched smooth photo plates + Greenbelt plate mode
    photoPlatesSmooth: true,
    greenbeltPlateMode: "classic",
    photoNightSynthSmoothPath: "images/bg-austin-new/fast/background-photo-night-synthwave-smooth.jpg",
    photoDuskCleanSmoothPath: "images/bg-austin-new/fast/background-photo-dusk-avg-smooth.jpg", // sega55: palette = avg(night-synth, violet); old: background-photo-dusk-clean-smooth.jpg
    photoVioletSmoothPath: "images/bg-austin-new/fast/background-photo-violet-smooth.jpg",
    photoGreenbeltSmoothPath: "images/bg-austin-new/fast/background-photo-greenbelt-night-smooth.jpg",
    photoPostnukeDuskSmoothPath: "images/bg-austin-new/fast/background-photo-postnuke-dusk-smooth.jpg",
    photoPostnukeAcidSmoothPath: "images/bg-austin-new/fast/background-photo-postnuke-acid-smooth.jpg",
    photoTunnelPortalSmoothPath: "images/fx/tunnel-portal-photo-smooth.jpg",
    bossBgCapitolSmooth: true,
    bossBgCapitolSmoothPath: "images/bg-austin-new/fast/background-capitol-postnuke-smooth.jpg",
    bossBgCapitolGreenSmoothPath: "images/bg-austin-new/fast/background-capitol-postnuke-green-smooth.jpg",
    bossBgCapitolOpenSmoothPath: "images/bg-austin-new/fast/background-capitol-postnuke-open-smooth.jpg",
    bossBgCapitolGreenOpenSmoothPath: "images/bg-austin-new/fast/background-capitol-postnuke-green-open-smooth.jpg",
    skylineMaskPhoto: {"night-synth": [0.683, 0.667, 0.658, 0.658, 0.683, 0.667, 0.708, 0.717, 0.717, 0.717, 0.708, 0.717, 0.733, 0.75, 0.733, 0.733, 0.675, 0.642, 0.65, 0.65, 0.642, 0.642, 0.642, 0.658, 0.65, 0.642, 0.642, 0.692, 0.692, 0.692, 0.717, 0.733, 0.692, 0.642, 0.65, 0.667, 0.65, 0.542, 0.542, 0.542, 0.55, 0.7, 0.725, 0.717, 0.725, 0.725, 0.708, 0.642, 0.608, 0.608, 0.675, 0.658, 0.667, 0.683, 0.667, 0.667, 0.667, 0.675, 0.65, 0.65, 0.65, 0.7, 0.683, 0.65, 0.642, 0.642, 0.642, 0.667, 0.658, 0.658, 0.667, 0.667, 0.675, 0.658, 0.65, 0.675, 0.575, 0.575, 0.633, 0.675, 0.7, 0.683, 0.683, 0.683, 0.683, 0.683, 0.692, 0.7, 0.7, 0.7, 0.7, 0.725, 0.717, 0.717, 0.7, 0.683, 0.683, 0.675, 0.683, 0.692, 0.742, 0.7, 0.633, 0.692, 0.675, 0.733, 0.733, 0.742, 0.717, 0.708, 0.692, 0.708, 0.683, 0.683, 0.742, 0.733, 0.7, 0.7, 0.7, 0.708, 0.65, 0.65, 0.683, 0.658, 0.6, 0.6, 0.6, 0.617], "clean": [0.454, 0.446, 0.444, 0.44, 0.438, 0.438, 0.45, 0.619, 0.602, 0.608, 0.608, 0.602, 0.602, 0.613, 0.602, 0.604, 0.617, 0.617, 0.621, 0.625, 0.633, 0.633, 0.633, 0.642, 0.673, 0.667, 0.458, 0.435, 0.438, 0.433, 0.433, 0.435, 0.438, 0.435, 0.458, 0.667, 0.658, 0.642, 0.633, 0.633, 0.635, 0.623, 0.621, 0.617, 0.617, 0.602, 0.602, 0.613, 0.602, 0.604, 0.608, 0.61, 0.602, 0.619, 0.446, 0.438, 0.438, 0.44, 0.444, 0.446, 0.454, 0.36, 0.323, 0.296, 0.298, 0.325, 0.467, 0.463, 0.469, 0.471, 0.475, 0.469, 0.471, 0.492, 0.554, 0.592, 0.6, 0.61, 0.629, 0.604, 0.598, 0.562, 0.496, 0.492, 0.475, 0.473, 0.483, 0.481, 0.483, 0.552, 0.585, 0.6, 0.629, 0.619, 0.454, 0.452, 0.452, 0.44, 0.452, 0.452, 0.454, 0.617, 0.629, 0.602, 0.585, 0.552, 0.519, 0.481, 0.483, 0.473, 0.473, 0.492, 0.494, 0.562, 0.598, 0.6, 0.627, 0.61, 0.6, 0.592, 0.554, 0.492, 0.471, 0.469, 0.475, 0.471, 0.469, 0.463], "dusk": [0.454, 0.446, 0.444, 0.44, 0.438, 0.438, 0.45, 0.619, 0.602, 0.608, 0.608, 0.602, 0.602, 0.613, 0.598, 0.604, 0.617, 0.617, 0.621, 0.625, 0.633, 0.633, 0.633, 0.642, 0.673, 0.667, 0.458, 0.423, 0.417, 0.433, 0.433, 0.435, 0.438, 0.435, 0.458, 0.667, 0.658, 0.642, 0.633, 0.633, 0.635, 0.623, 0.621, 0.617, 0.617, 0.602, 0.602, 0.613, 0.602, 0.604, 0.608, 0.61, 0.602, 0.619, 0.446, 0.438, 0.438, 0.44, 0.444, 0.446, 0.427, 0.36, 0.323, 0.296, 0.298, 0.325, 0.467, 0.463, 0.469, 0.471, 0.475, 0.469, 0.471, 0.492, 0.554, 0.592, 0.6, 0.61, 0.629, 0.604, 0.598, 0.562, 0.496, 0.492, 0.475, 0.452, 0.446, 0.444, 0.44, 0.552, 0.585, 0.6, 0.629, 0.619, 0.429, 0.427, 0.452, 0.44, 0.452, 0.452, 0.454, 0.617, 0.629, 0.602, 0.585, 0.552, 0.519, 0.481, 0.483, 0.473, 0.473, 0.492, 0.494, 0.562, 0.598, 0.6, 0.627, 0.61, 0.6, 0.592, 0.554, 0.492, 0.471, 0.469, 0.475, 0.471, 0.469, 0.463], "acid": [0.454, 0.446, 0.444, 0.44, 0.438, 0.438, 0.45, 0.619, 0.602, 0.608, 0.608, 0.602, 0.602, 0.613, 0.598, 0.604, 0.617, 0.617, 0.621, 0.625, 0.633, 0.633, 0.633, 0.642, 0.673, 0.667, 0.458, 0.423, 0.417, 0.433, 0.433, 0.435, 0.438, 0.435, 0.458, 0.667, 0.658, 0.642, 0.633, 0.633, 0.635, 0.623, 0.621, 0.617, 0.617, 0.602, 0.602, 0.613, 0.602, 0.604, 0.608, 0.61, 0.602, 0.619, 0.446, 0.438, 0.438, 0.44, 0.444, 0.446, 0.427, 0.36, 0.323, 0.296, 0.298, 0.325, 0.467, 0.463, 0.469, 0.471, 0.475, 0.469, 0.471, 0.492, 0.554, 0.592, 0.6, 0.61, 0.629, 0.604, 0.598, 0.562, 0.496, 0.492, 0.475, 0.452, 0.446, 0.444, 0.44, 0.552, 0.585, 0.6, 0.629, 0.619, 0.429, 0.427, 0.452, 0.44, 0.452, 0.452, 0.454, 0.617, 0.629, 0.602, 0.585, 0.552, 0.519, 0.481, 0.483, 0.473, 0.473, 0.492, 0.494, 0.562, 0.598, 0.6, 0.627, 0.61, 0.6, 0.592, 0.554, 0.492, 0.471, 0.469, 0.475, 0.471, 0.469, 0.463], "greenbelt": [0.308, 0.321, 0.338, 0.344, 0.331, 0.331, 0.315, 0.319, 0.329, 0.338, 0.342, 0.342, 0.331, 0.333, 0.348, 0.352, 0.369, 0.371, 0.36, 0.36, 0.333, 0.323, 0.283, 0.283, 0.333, 0.342, 0.369, 0.356, 0.312, 0.31, 0.304, 0.304, 0.321, 0.321, 0.315, 0.315, 0.325, 0.325, 0.365, 0.365, 0.346, 0.346, 0.327, 0.327, 0.36, 0.365, 0.379, 0.379, 0.375, 0.373, 0.35, 0.35, 0.34, 0.338, 0.352, 0.35, 0.34, 0.333, 0.31, 0.31, 0.335, 0.342, 0.35, 0.333, 0.298, 0.283, 0.29, 0.287, 0.298, 0.3, 0.323, 0.35, 0.371, 0.365, 0.365, 0.354, 0.358, 0.362, 0.371, 0.356, 0.348, 0.329, 0.331, 0.346, 0.352, 0.365, 0.344, 0.308, 0.306, 0.294, 0.294, 0.306, 0.306, 0.308, 0.308, 0.31, 0.31, 0.308, 0.308, 0.323, 0.327, 0.346, 0.346, 0.312, 0.312, 0.306, 0.306, 0.344, 0.344, 0.352, 0.352, 0.356, 0.356, 0.377, 0.377, 0.371, 0.369, 0.335, 0.335, 0.344, 0.344, 0.335, 0.335, 0.302, 0.296, 0.308, 0.319, 0.354]},
    // sega54 build: baked sega54 batch editor cells (code defaults already equal; explicit so the build == the editor)
    winDepartureStartSec: 219.76,
    noRoadsideAfterBoss: true,
    noRoadsideFromSec: 185.22,
    tunnelBrainSpeedMult: 1.5,
    nukeFlashShortenSec: 1.0,
    tunnelMouthFadeStartSec: 81.5,
    winStarsSyncFade: true,
    winRoadStarsFadeSec: 2.5,
    winHorizonDropDelaySec: 0.0,
    winHorizonDropFrac: 1.0,
    winHorizonDropSec: 3.0,
    bgVioletZoomOn: true,
    bgVioletZoomTo: 1.15,
    bgVioletZoomStartSec: 40.2,
    bgVioletZoomEndSec: 59.0,
    greenbeltZoomOn: true,
    greenbeltZoomTo: 1.3,
    greenbeltZoomStartSec: 59.0,
    greenbeltZoomEndSec: 81.5,
    postTunnelDawnOn: true,
    postTunnelDawnStartSec: 106.82,
    postTunnelDawnFadeSec: 1.5,
    postTunnelDawnEndSec: 120.5,
    postTunnelDawnPath: "images/bg-austin-new/fast/background-austin-free-dawn.jpg",
    postTunnelDawnChoice: "dawn",
    postTunnelDawnPathBlue: "images/bg-austin-new/fast/background-austin-free.jpg",
    postTunnelDawnPanX: 0.5,
    postTunnelDawnSmooth: true, // sega55: #9 dawn plate (106.82-120.5) uses the smooth de-pixelated vers
    postTunnelDawnSmoothPath: "images/bg-austin-new/fast/background-austin-free-dawn-smooth.jpg", // sega55: smooth #9 dawn plate file
    diamond2PlateOn: true, // sega55: 120.5-diamond2PlateEndSec shows the synthwave-graded skyline i
    diamond2PlatePath: "images/bg-austin-new/fast/background-austin-free-synth-smooth.jpg", // sega55: diamond2 synthwave plate file
    diamond2PlateEndSec: 155, // sega55: diamond2 plate ends (violet pin resumes under the 155 nuke whi
    bossBgCapitolOn: true,
    bossBgCapitolPath: "images/bg-austin-new/fast/background-capitol-postnuke.jpg",
    bossBgCapitolGreenPath: "images/bg-austin-new/fast/background-capitol-postnuke-green.jpg",
    bossBgCapitolStartSec: 184.0,
    bossBgCapitolEndSec: 999,
    bossBgCapitolSteadyBase: true,
    bossBgCapitolGreenGapMinSec: 0.35,
    bossBgCapitolGreenGapMaxSec: 2.2,
    bossBgCapitolGreenOnMinSec: 0.05,
    bossBgCapitolGreenOnMaxSec: 0.4,
    bossBgCapitolGreenPopChance: 0.8,
    bossBgCapitolGreenStutterChance: 0.25,
    bossBgCapitolGreenAlpha: 1.0,
    bossBgCapitolJumpPxX: 18,
    bossBgCapitolJumpPxY: 10,
    bossBgCapitolJumpEverySec: 0.05,
    bossBgCapitolScaleJitter: 0.04,
    bossBgCapitolLazyPrio: 150,
    bossFireCycleOn: true,
    bossFireCycleSpeed: 10,
    bossFireCyclePalette: "auto",
    bossFireCycleMaskPath: "images/bg-austin-new/fast/capitol-postnuke-firemask.png",
    bossDomeRevealOn: true,
    bossDomeCrackStartSec: 185.22,
    bossDomeCrackDurSec: 1.6,
    bossRiseFromDomeSec: 186.97,
    bossRiseDurSec: 2.5,
    bossRiseLiftPx: 70,
    bossBgCapitolUnzoom: true,
    bossDomePreGlowOn: true,
    bossDomePreGlowStartSec: 184.6,
    bossDomePreGlowFlashHz: 4.3,
    bossDomeVibratePx: 3,
    bossDomeVibrateHz: 22,
    bossThrobOn: true,
    bossThrobScale: 0.14,
    bossThrobHz: 2.15,
    bossThrobPhaseSec: 0,
    bossThrobRedFlush: 0.55,
    bossShootFromRevealOn: true,
    bossRevealShootEverySec: 0.8,
    bossDomeHoverSec: 6.0,
    bossDomeSwayPx: 90,
    bossDomeSwayHz: 0.5375,
    bossDomeHoverShootEverySec: 0.7,
    bossDomeHoverScaleMult: 1.25,
    bossDomeApproachSec: 2.0,
    bossDomeMediumEndBySec: 200.5,
    uiFontTitle: "\"Press Start 2P\", \"Courier New\", monospace",
    uiFontBody: "\"VT323\", \"Courier New\", monospace",
    uiFontLyrics: "\"VT323\", \"Courier New\", monospace",
    uiFontScale: 1.0,
    bossRiseStartScaleMult: 1.0,
    bossDomeChunkCount: 18,
    bossDomeCavityY: 138,
    bossDomeCrackMaskPath: "images/bg-austin-new/fast/capitol-dome-crackmask.png",
    bossBgCapitolOpenPath: "images/bg-austin-new/fast/background-capitol-postnuke-open.jpg",
    bossBgCapitolGreenOpenPath: "images/bg-austin-new/fast/background-capitol-postnuke-green-open.jpg",
    austinBgBlendSec: 1.5, // sega45: color-shift blend between pre-nuke plates (same skyline)
    verse1AustinBgPlate: "dusk-clean",
    chorus1AustinBgPlate: "violet",
    // sega43: ROOT CAUSE chorus1 stripes = SECTIONS.chorus1.psych (neonBlood→outrunCheck) faded
    // the Austin world to 0 and painted procedural stripes. A pinned plate now wins over psych.
    austinBgPinSuppressesPsych: true,
    // sega43: fast single-strip plates (1280x480 JPEG, ~200KB) — dusk+violet in CRITICAL set,
    // others first in lazy queue. The 3.6MB PNG sheets are 3 stacked copies; not needed.
    austinBgFastStrips: true,
    austinBgFastStripCritical: ["dusk-clean"], // sega45: clean dusk = first-load plate (start screen, verse1)
    // sega45 lazy strip queue (key, song-time prio): violet well before 59, green before 104, fire plates for the nuke
    austinBgLazyStrips: [["violet", 20], ["greenbelt", 45], ["green-clean", 70], ["dusk", 140], ["acid", 141]], // sega52: + greenbelt
    // sega45 post-nuke (156.5+): slow cross-fade between the two fire plates + background-only shake
    postNukeFirePlates: ["dusk", "acid"],
    postNukeFireHoldSec: 2.67, // sega48 (was 4.0)
    postNukeFireFadeSec: 1.33, // sega48 (was 2.0)
    postNukeBgShakeEnabled: true,
    postNukeBgShakeMinPx: 2, // sega48 (was 1)
    postNukeBgShakeMaxPx: 5, // sega48 (was 3)
    postNukeBgShakeBurstSec: 0.35,
    postNukeBgShakeGapMinSec: 1.2,
    postNukeBgShakeGapMaxSec: 3.5,
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
    postNukeUseAustinPlates: false, // sega45: destroyed skylines ditched
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
    sectionTitlesOnlyVerses: true, // sega51: only VERSE 1 (verse1 start) + VERSE 2 (tunnel mouth); no other section titles
    showChorusTitles: false,
    showBossIncoming: false, // sega51: no BOSS INCOMING toast at boss start // sega51: hide any section title containing "CHORUS"
    sectionTitleYFrac: 0.22, // ~22% down canvas, above player
    sectionTitleDurationSec: 3.0,
    sectionTitleFadeSec: 0.5,
    sectionTitleScale: 1.0,
    sectionTitleFontSizePx: 56,
    sectionTitleFill: "#ff66cc",
    sectionTitleStroke: "#00f0ff",
    sectionTitleGlow: "#ff2ec4",
    sectionTitleLabelVerse1: "VERSE 1", // sega51 (was FIRST VERSE)
    sectionTitleLabelChorus1: "CHORUS",
    sectionTitleLabelVerse2: "SECOND VERSE",
    sectionTitleLabelChorus2: "CHORUS",
    sectionTitleLabels: {
      verse1: "VERSE 1",
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
    tunnelEnterSec: 90.5, // sega45: 3s earlier (end of shrink-in + black-in; interior after black hold)
    tunnelExitSec: 104.32, // sega45: exit shrink-out starts; ends exactly 106.82 ("if you've got the strength")
    tunnelExitWhiteout: true, // sega45: WHITE-OUT at shrink end replaces black exit cover + road delay
    tunnelExitWhiteUpSec: 0.3,
    tunnelExitWhiteDownSec: 1.0,
    tunnelExitRespawnTier: 1, // she comes out at elevation tier 1, normal size
    tunnelMouthFadeIn: true, // sega45: mouth fades in freeze -> tunnelEntranceVisibleSec
    tunnelCityFadeOut: true, // sega45: city plate fades to black freeze -> tunnelEntranceVisibleSec, gone thru tunnel
    tunnelRoadCenter: true,
    tunnelRoadCenterAmount: 0.6,       // sega45 C: 0 = camera follows her, 1 = road dead centre (her lane then sits at the screen edge)
    tunnelApproachPlayerMinXFrac: 0.15, // sega45 C: keep her sprite at least this far (of width) from the screen edge on approach // sega45: camera centered (road dead straight + centered) from straight-lead start
    tunnelNoHeartsLeadSec: 3.0, // sega45: no hearts on screen from (freeze - lead) = 81.5 through tunnel end
    tunnelHeartTravelSec: 2.2, // heart linger+fall time; spawns stop this long before the no-hearts window
    tunnelLeanEpsilon: 0.03, // lane tween: lean frame while |target-playerX| > eps, straight on arrival
    tunnelHeartsEnabled: false, // sega37: NO hearts in tunnel (Facts). Opt-in only.
    tunnelHeartEverySec: 1.0, // interval if tunnelHeartsEnabled=true (legacy sega34 ~1.0s)
    tunnelPlayerLaneScreenX: true, // sega37: draw player at lane X while road skipped (L/R dodge)
    tunnelFractalFrames: 6, // legacy procedural fractal; superseded by interior anim when approach enabled
    tunnelFractalEnabled: true, // keep until Build swaps to asset interior
    // --- sega35 voice redesign: fixed mouth + player shrink (always visible) + delayed road ---
    tunnelApproachEnabled: true,
    tunnelFreezeStartSec: 84.5, // sega45: road decel ends/freeze + fixed mouth appears (3s earlier)
    tunnelApproachStartSec: 84.5, // alias of freeze start (legacy key)
    tunnelEntranceVisibleSec: 87.5, // sega45: mouth fully visible (fade-in end) → force elev tier 1
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
    tunnelExitFadeInSec: 0, // sega45: superseded by white-out
    tunnelBlackDurSec: 0.45, // black cover before interior
    tunnelExitShrinkDurSec: 2.5, // mirror exit: shrink into distance
    tunnelExitBlackDurSec: 0, // sega45: superseded by white-out
    tunnelRoadDelaySec: 0, // sega45: road already scrolling when the white-out fades
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
    tunnelDodgeBrainsEnabled: false, // sega45: replaced by lane-runner tunnel brains
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
    tunnelCenterRushEnabled: false, // sega45: center-hover coordinator removed
    tunnelCenterRushSpawnEverySec: 0.75,
    tunnelCenterRushMaxActive: 7,
    tunnelCenterRushApproachSpeed: 0.72,
    tunnelCenterRushTrackRate: 3.2,
    tunnelCenterRushScale: 0.32,
    tunnelCenterRushDamage: null, // null = medium brainZap damage
    // --- sega45 tunnel brains: horizon -> locked random lane (like cybercabs), tiny or medium; dodge or shoot ---
    tunnelBrainsEnabled: true,
    tunnelBrainSpawnEverySec: 1.44, // sega48 x1.6 (was 0.9)
    tunnelBrainTinyChance: 0.5,
    tunnelBrainSpeed: 0.96, // sega48 x1.6 (was 0.6): path fraction / sec (0.96 ≈ 1.04s horizon -> player)
    tunnelBrainMinGapSec: 0.8, // other lane may not get a brain within this many sec (never both lanes blocked)
    tunnelBrainTinyScale: 0.5,
    tunnelBrainMediumScale: 1.25,
    tunnelBrainDamage: null, // null = medium brainZap damage
    tunnelEntranceAsset: 'images/fx/tunnel-portal-v2.png', // sega52: glowing portal in the hills (was tunnel-entrance.png)
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
    winHeartDropPerSec: 1.28, // sega48 hearts x0.64 (was 2); supersedes noHeartsOnWinCruise for this phase
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
    partyCrashWeatherIntensity: 1.0, // sega45 heavier storm
    partyCrashBoltEverySec: 0.3, // new bolt group cadence (several at once)
    partyCrashMaxBolts: 6,
    partyCrashFlashAlpha: 0.55,
    partyCrashFlashEverySec: 0.9,
    partyCrashWeatherDurationSec: 12,
    partyCrashWeatherQueued: false,

    // --- sega31x sax BG on diamond2 / Mad Max 2nd holding-on ---
    saxBgEnabled: false, // sega45: diamond2 shows the violet Austin plate (Facts pin map), not the sax video
    // --- sega45 final boss: background lightning + offspring ---
    bossLightningEnabled: true,
    bossLightningEverySec: 0.35,
    bossLightningMaxBolts: 6,
    bossLightningFlashAlpha: 0.5,
    bossOffspringEnabled: true,
    bossOffspringStartSec: 2.0,
    bossOffspringEverySec: 3.0,
    bossOffspringMax: 3,
    bossOffspringSize: 0.42,
    // --- sega45 first spawns + hearts on her head ---
    firstCarsAtSec: 5.0,
    firstHeartsAtSec: 8.0,
    heartLaneGapFrac: 0.36, // sega45: other-lane heart sits one lane-gap (x width) from her drawn X; hers lands on her head
    saxBgStartSec: 120.5,
    saxBgEndSec: 155,


    rankThresholds: [
      { score: 0, label: "Survivor" },
      { score: 12000, label: "Street Runner" },
      { score: 35000, label: "Diamond Hands" },
      { score: 70000, label: "Fight Ready" },
      { score: 120000, label: "BRAIN WATCH" }
    ],
    // ===== sega52 baked from editor (2026-09-28 CT) =====
    startBgFadeInSec: 10.0, // sega54 build: 10 s start fade (was 5.0)
    bgHoldingCrossfadeOn: true,
    bgHoldingCrossfadeFrom: "dusk-clean",
    bgHoldingCrossfadeTo: "violet",
    bgHoldingCrossfadeStart: 40.2,
    bgHoldingCrossfadeEnd: 58.58,
    bgHoldingCrossfadeEase: "smooth",
    greenbeltPlateOn: true,
    greenbeltPlateChoice: "v3",
    greenbeltFadeStart: 59.0,
    greenbeltFadeSec: 5.0,
    greenbeltLazyPrio: 45,
    greenbeltReplacesStarfield: true,
    greenbeltToMouthStart: 84.5,
    tunnelPortalOn: true,
    tunnelPortalChoice: "v2",
    carKeepTutorialCars: true,
    coastRemoveOnlyOffscreen: true,
    carFeedFromHorizon: true,
    carMinVisibleAhead: 3,
    carFeedPerTick: 1,
    carFeedSpeedFracMin: 0.45,
    carFeedSpeedFracMax: 0.8,
    bossRespawnNormal: true,
    bossDoomOn: true,
    bossDoomLeadSec: 5.0,
    bossDoomAttackSec: 1.2,
    bossDoomText: "YOU FAILED HUMANITY",
    bossLandFromCurrentY: true,
    bossLandEaseSec: 1.6,
    tunnelEnterFromCurrentAlt: true,
    carExcludeBlack: true,
    carScaleY: 1.12,
    bossSizeMult: 1.45,
    bossGlowOn: true,
    bossGlowColor: "#b04dff",
    bossGlowAlpha: 0.35,
    bossGlowPulseSec: 2.4,
    bossGlowSizeMult: 3.4,
    tinyBrainPersistOffscreen: true,
    bossTinySpeedMatchTunnel: true,
    bossOffspringAsProjectiles: true,
    bossLaneLeanNormal: true,
    shadowFollowDepth: true,
    shadowAltShrink: 0.6,
    shadowAltFade: 0.6,
    shadowHideInTunnel: true,
    duskCleanCapitolFix: true,
    greenbeltPlatePath: "images/bg-austin-new/fast/background-greenbelt-night-v3.jpg",
    tunnelPortalPath: "images/fx/tunnel-portal-v2.png",
    greenbeltPinUntilSec: 92.0,
    // ===== sega53 baked from editor (2026-09-28 CT) =====
    showDebugLabels: false,
    showEventFeed: false,
    showMeterLabels: true,
    curveLeanOn: true,
    curveLeanThresholdDeg: 25,
    curveLeanHysteresisDeg: 3,
    curveLeanEaseSec: 0.25,
    curveLeanAmount: 1.0,
    curveLeanTiltDeg: 6,
    curveLeanLookSegs: 120,
    curveLeanLaneEps: 0.03
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
