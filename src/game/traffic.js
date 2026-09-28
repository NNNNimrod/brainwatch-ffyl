(function(ns) {
  function trafficTarget(state) {
    var cfg = state.config;
    var target = cfg.trafficBase + ((state.difficultyLevel - 1) * cfg.trafficStep);
    var lo = cfg.trafficBase;
    var hi = cfg.trafficMax;
    if (state.trafficLaneSwap) {
      var mult = cfg.laneSwapTrafficMult != null ? cfg.laneSwapTrafficMult : 2.2;
      target = Math.round(target * mult);
      hi = cfg.laneSwapTrafficMax != null ? cfg.laneSwapTrafficMax : Math.round(cfg.trafficMax * mult);
      lo = Math.round(cfg.trafficBase * 1.6);
      // tighter spacing allowed in lane-swap chaos
      state._trafficMinDistSeg = 4;
    } else {
      state._trafficMinDistSeg = 12;
    }
    // sega31m: 2× cars until verse2 (t<96); after verse2 keep today rates
    var songT = state.musicTime != null ? state.musicTime
      : (state.runElapsedSinceStart != null ? state.runElapsedSinceStart : (state.elapsed || 0));
    var earlyUntil = cfg.earlyTrafficUntilSec != null ? cfg.earlyTrafficUntilSec : 96;
    if (!state.madMaxMode && songT < earlyUntil) {
      var eMult = cfg.earlyTrafficMult != null ? cfg.earlyTrafficMult : 2;
      if (cfg.earlyTrafficBase != null) lo = cfg.earlyTrafficBase;
      else lo = Math.round(cfg.trafficBase * eMult);
      if (cfg.earlyTrafficMax != null) hi = cfg.earlyTrafficMax;
      else hi = Math.round(cfg.trafficMax * eMult);
      target = Math.round((cfg.trafficBase + ((state.difficultyLevel - 1) * cfg.trafficStep)) * eMult);
      if (!state.trafficLaneSwap) {
        state._trafficMinDistSeg = Math.max(6, Math.round((state._trafficMinDistSeg || 12) / eMult));
      }
    }
    // sega40: holding section (1st hold-on) — ×holdingCarsTrafficMult cars
    if (state.sectionId === "holding" && cfg.holdingCarsEnabled) {
      var hMult = cfg.holdingCarsTrafficMult != null ? cfg.holdingCarsTrafficMult : 2;
      lo = Math.round(cfg.trafficBase * hMult);
      hi = Math.round(cfg.trafficMax * hMult);
      target = Math.round((cfg.trafficBase + ((state.difficultyLevel - 1) * cfg.trafficStep)) * hMult);
      if (!state.trafficLaneSwap) {
        state._trafficMinDistSeg = Math.max(6, Math.round((state._trafficMinDistSeg || 12) / hMult));
      }
    }
    // sega29: during Mad Max window, double cybercab density
    if (state.madMaxMode && !state.postBossCars) {
      var mm = cfg.madMax || {};
      var tMult = mm.trafficMult != null ? mm.trafficMult : 2.0;
      target = Math.round(target * tMult);
      hi = Math.round(hi * tMult);
      lo = Math.round(lo * Math.min(tMult, 1.6));
      if (!state.trafficLaneSwap) {
        state._trafficMinDistSeg = Math.max(6, Math.round((state._trafficMinDistSeg || 12) / tMult));
      }
    }
    // sega31s: after boss gone — lots of cars from horizon
    if (state.postBossCars || state.finaleMode === "winCruise") {
      if (cfg.postBossCarsFromHorizon !== false) {
        lo = cfg.postBossTrafficBase != null ? cfg.postBossTrafficBase : 90;
        hi = cfg.postBossTrafficMax != null ? cfg.postBossTrafficMax : 160;
        target = hi;
        state._trafficMinDistSeg = cfg.postBossTrafficMinDistSeg != null ? cfg.postBossTrafficMinDistSeg : 3;
        state._spawnCarsFromHorizon = true;
      }
    }
    return Util.limit(Math.round(target), lo, hi);
  }

  function randomTrafficSpeed(state, sprite) {
    var base = state.maxSpeed / 4;
    var variance = state.maxSpeed / ((sprite === SPRITES.SEMI) ? 4 : 2.2);
    var difficultyBoost = 1 + ((state.difficultyLevel - 1) * 0.03);
    return (base + (Math.random() * variance)) * difficultyBoost;
  }

  function zoneClear(state, z, lane, minDist) {
    var n, car, dz, track = state.trackLength;
    for (n = 0; n < state.cars.length; n++) {
      car = state.cars[n];
      dz = Math.abs(car.z - z);
      if (dz > track / 2) dz = track - dz;
      if (dz < minDist) {
        if (car.lane === lane || dz < minDist * 0.35) {
          return false;
        }
      }
    }
    return true;
  }

  // sega51: is track position z between a few segments behind the player and the horizon spawn line?
  function carInVisibleWindow(state, z, hzFrac) {
    var L = state.segmentLength || 200, N = state.segments.length, tl = state.trackLength || (N * L);
    var playerZ = Util.increase(state.position || 0, state.playerZ || 0, tl);
    var rel = z - playerZ;
    rel = ((rel % tl) + tl) % tl; // 0..tl ahead
    var ahead = (state.drawDistance || 300) * hzFrac * L;
    var behind = 20 * L;
    return rel < ahead || rel > tl - behind;
  }

  // sega52: cars ahead of the player inside the draw distance (what's actually on the road)
  function countAhead(state) {
    var L = state.segmentLength || 200, tl = state.trackLength, n, r, cnt = 0;
    var pz = Util.increase(state.position || 0, state.playerZ || 0, tl), lim = (state.drawDistance || 300) * L;
    for (n = 0; n < state.cars.length; n++) {
      if (state.cars[n].coasting) continue;
      r = ((state.cars[n].z - pz) % tl + tl) % tl;
      if (r < lim) cnt++;
    }
    return cnt;
  }

  // sega52: carFeedFromHorizon — when fewer than carMinVisibleAhead cars are on the road ahead, put one at the
  // horizon moving slower than her, so it drives in from the horizon (sega51 banned mid-road spawns; the
  // off-screen density cars could take 10+ s to show up, leaving the road empty).
  function feedFromHorizon(state) {
    var c = state.config || {};
    if (c.carFeedFromHorizon === false || state._spawnCarsFromHorizon || state.postBossCars) return;
    var need = Math.max(0, (c.carMinVisibleAhead != null ? c.carMinVisibleAhead : 3) - countAhead(state));
    need = Math.min(need, c.carFeedPerTick != null ? c.carFeedPerTick : 1);
    var L = state.segmentLength, tl = state.trackLength, dd = state.drawDistance || 300;
    var hzF = Math.max(0.5, Math.min(1, c.carSpawnHorizonFrac != null ? c.carSpawnHorizonFrac : 0.95));
    var pz = Util.increase(state.position || 0, state.playerZ || 0, tl);
    var minDist = L * (state._trafficMinDistSeg != null ? state._trafficMinDistSeg : 12);
    var fMin = c.carFeedSpeedFracMin != null ? c.carFeedSpeedFracMin : 0.45;
    var fMax = c.carFeedSpeedFracMax != null ? c.carFeedSpeedFracMax : 0.8;
    var k, a, lane, z, ok, car, far, farR, n, r, seg;
    for (k = 0; k < need; k++) {
      ok = false;
      for (a = 0; a < 12 && !ok; a++) {
        lane = Math.random() < 0.5 ? 0 : 1;
        z = Util.increase(pz, Math.floor(dd * (hzF - 0.05 + Math.random() * 0.05)) * L, tl);
        z = Math.floor(z / L) * L;
        ok = zoneClear(state, z, lane, minDist);
      }
      if (!ok) return;
      // recycle the farthest off-screen car when at the density target, else add one
      car = null;
      if (state.cars.length >= trafficTarget(state)) {
        far = -1; farR = -1;
        for (n = 0; n < state.cars.length; n++) {
          if (state.cars[n].coasting || state.cars[n].tutorial) continue;
          r = ((state.cars[n].z - pz) % tl + tl) % tl;
          if (carInVisibleWindow(state, state.cars[n].z, 1)) continue;
          r = Math.min(r, tl - r);
          if (r > farR) { farR = r; far = n; }
        }
        if (far >= 0) {
          car = state.cars[far];
          seg = ns.Track.findSegment(state, car.z);
          var si = seg.cars.indexOf(car); if (si >= 0) seg.cars.splice(si, 1);
          state.cars.splice(far, 1);
        }
      }
      if (!car) {
        var before = state.cars.length;
        spawnCar(state, true);
        if (state.cars.length <= before) return;
        car = state.cars.pop();
        seg = ns.Track.findSegment(state, car.z);
        var sj = seg.cars.indexOf(car); if (sj >= 0) seg.cars.splice(sj, 1);
      }
      car.z = z; car.lane = lane; car.percent = 0; car.lastRelativeZ = null;
      car.offset = state.config.laneOffsets[lane] + (Math.random() - 0.5) * 0.06;
      var ps = state.speed || 0;
      car.speed = ps > 1500 ? ps * (fMin + Math.random() * (fMax - fMin)) : randomTrafficSpeed(state, car.sprite);
      car._fed = true;
      ns.Track.findSegment(state, car.z).cars.push(car);
      state.cars.push(car);
      state._carFeedCount = (state._carFeedCount || 0) + 1;
    }
  }

  function spawnCar(state, anyZ) {
    var attempts = 0;
    var lane, offset, z, sprite, car, segment, ok;
    var minDist = state.segmentLength * (state._trafficMinDistSeg != null ? state._trafficMinDistSeg : 12);
    var fromHorizon = !!(state._spawnCarsFromHorizon || state.postBossCars);
    var cfgH = state.config || {};
    var atHorizon = cfgH.carSpawnAtHorizon !== false; // sega51
    var hzFrac = Math.max(0.5, Math.min(1, cfgH.carSpawnHorizonFrac != null ? cfgH.carSpawnHorizonFrac : 0.95));

    while (attempts < 40) {
      attempts++;
      lane = Math.random() < 0.5 ? 0 : 1;
      if (fromHorizon) {
        // sega31s: spawn ahead near horizon (far draw distance), not random/behind
        var playerZ = Util.increase(state.position || 0, state.playerZ || 0, state.trackLength);
        // sega51: carSpawnAtHorizon — right at the far draw distance (was 55-95% of it = mid-road pop-in)
        var hzLo = atHorizon ? Math.max(0.5, hzFrac - 0.05) : 0.55, hzHi = atHorizon ? hzFrac : 0.95;
        var aheadSeg = Math.floor((state.drawDistance || 300) * (hzLo + Math.random() * (hzHi - hzLo)));
        z = Util.increase(playerZ, aheadSeg * state.segmentLength, state.trackLength);
        z = Math.floor(z / state.segmentLength) * state.segmentLength;
      } else {
        z = Math.floor(Math.random() * state.segments.length) * state.segmentLength;
        // sega51: never place a density car inside the visible stretch of road (just behind the player
        // up to the horizon) — it would pop in mid-road. Off-screen cars drive in from the horizon.
        if (atHorizon && !anyZ && carInVisibleWindow(state, z, hzFrac)) continue;
      }
      if (!zoneClear(state, z, lane, minDist)) {
        continue;
      }
      ok = true;
      break;
    }
    if (!ok) {
      return;
    }

    offset = state.config.laneOffsets[lane];
    offset += (Math.random() - 0.5) * 0.06;
    sprite = Util.randomChoice(SPRITES.CARS);
    // sega31r: pixel (B) / B+C mix / legacy soft prebake — never atlas A as mix partner
    if (ns.Sega31 && ns.Sega31.pickCybercabSprite && state.config) {
      var ccm = state.config.cybercabColorMode;
      if (ccm === "prebake" || ccm === "pixel" || ccm === "B" || ccm === "B+C" || ccm === "mix" || state.config.cybercabTrafficMix) {
        sprite = ns.Sega31.pickCybercabSprite(sprite, state);
      }
    }
    var cabHp = 1;
    if (state.config) {
      if (state.config.carHp != null) cabHp = state.config.carHp;
      else if (state.config.cybercabHp != null) cabHp = state.config.cybercabHp;
    }
    car = {
      offset: offset,
      z: z,
      sprite: sprite,
      speed: randomTrafficSpeed(state, sprite),
      percent: 0,
      lastRelativeZ: null,
      lane: lane,
      laneSwapTimer: 1.0 + Math.random() * 1.2,
      hp: cabHp // sega31l one-shot cybercabs
    };

    segment = ns.Track.findSegment(state, car.z);
    segment.cars.push(car);
    state.cars.push(car);
  }

  function removeCar(state, index) {
    if (index < 0 || index >= state.cars.length) {
      return;
    }

    var car = state.cars[index];
    var segment = ns.Track.findSegment(state, car.z);
    var segmentIndex = segment.cars.indexOf(car);
    if (segmentIndex >= 0) {
      segment.cars.splice(segmentIndex, 1);
    }
    state.cars.splice(index, 1);
  }

  function resetTraffic(state) {
    var n;
    for (n = 0; n < state.segments.length; n++) {
      state.segments[n].cars = [];
    }
    // Start empty — sections / ensureTrafficDensity populate when traffic is enabled
    state.cars = [];
  }

  function ensureTrafficDensity(state) {
    var n;
    if (state.sectionTraffic === false) {
      return;
    }
    // sega31x/34: no cars in tunnel or approach clear window
    if (state.inTunnel) return;
    if (state.tunnelApproaching && (state._tunnelApproachCleared || state._tunnelHideRoadside)) return;
    if (state.config && state.config.winNoCars !== false &&
        (state.finaleMode === "winCruise" || state.finaleWon)) {
      return;
    }
    var target = trafficTarget(state);
    var missing = target - state.cars.length;
    feedFromHorizon(state); // sega52
    missing = target - state.cars.length;

    if (missing > 0) {
      for (n = 0; n < missing; n++) {
        spawnCar(state);
      }
      return;
    }

    if (missing < 0) {
      // sega31o: mark excess cars to coast/stop instead of pop-despawn
      var coastOn = !(state.config && state.config.cybercabCoastOff === false);
      var need = Math.abs(missing);
      var picked = 0;
      var idx, car;
      // Prefer cars already behind or far ahead; mark for coast
      for (n = 0; n < state.cars.length && picked < need; n++) {
        car = state.cars[n];
        if (!car || car.coasting) continue;
        car.coasting = true;
        car.coastT = 0;
        picked++;
      }
      if (!coastOn) {
        for (n = 0; n < need; n++) {
          if (!state.cars.length) break;
          removeCar(state, Util.randomInt(0, state.cars.length - 1));
        }
      }
    }
  }

  function updateCarOffset(state, car, carSegment, playerSegment, playerW) {
    var lookahead = 20;
    var carScale = state.config.spriteScaleCars != null ? state.config.spriteScaleCars : 1.75;
    if (state.config.carsWidthMult != null) carScale *= state.config.carsWidthMult;
    var carW = car.sprite.w * SPRITES.SCALE * carScale;
    var i;
    var j;
    var dir;
    var segment;
    var otherCar;
    var otherCarW;
    var target = state.config.laneOffsets[car.lane != null ? car.lane : (car.offset < 0 ? 0 : 1)];

    if ((carSegment.index - playerSegment.index) > state.drawDistance) {
      return 0;
    }

    var hold = (target - car.offset) * 0.04;

    for (i = 1; i < lookahead; i++) {
      segment = state.segments[(carSegment.index + i) % state.segments.length];

      if (
        (segment === playerSegment) &&
        (car.speed > state.speed) &&
        Util.overlap(state.playerX, playerW, car.offset, carW, 1.2)
      ) {
        car.lane = car.lane === 0 ? 1 : 0;
        return hold;
      }

      for (j = 0; j < segment.cars.length; j++) {
        otherCar = segment.cars[j];
        otherCarW = otherCar.sprite.w * SPRITES.SCALE * carScale;
        if ((car.speed > otherCar.speed) && Util.overlap(car.offset, carW, otherCar.offset, otherCarW, 1.2)) {
          if (otherCar.lane != null) {
            car.lane = otherCar.lane === 0 ? 1 : 0;
          } else {
            dir = (car.offset > otherCar.offset) ? 1 : -1;
            return dir * (1 / i) * (car.speed - otherCar.speed) / state.maxSpeed;
          }
          return hold;
        }
      }
    }

    return hold;
  }

  function maybeLaneSwap(state, car, dt) {
    if (!state.trafficLaneSwap) {
      return;
    }
    if (car.laneSwapTimer == null) {
      car.laneSwapTimer = 1.0 + Math.random() * 1.0;
    }
    car.laneSwapTimer -= dt;
    if (car.laneSwapTimer <= 0) {
      car.lane = car.lane === 0 ? 1 : 0;
      car.laneSwapTimer = 1.0 + Math.random() * 1.2;
    }
  }

  function updateCars(state, dt, playerSegment, playerW) {
    var n;
    var car;
    var oldSegment;
    var newSegment;
    var index;
    var playerWorldZ;
    var relative;
    var decel;

    playerWorldZ = Util.increase(state.position, state.playerZ, state.trackLength);

    for (n = state.cars.length - 1; n >= 0; n--) {
      car = state.cars[n];
      // sega31o: coast/decel to a stop so player passes — no pop-despawn
      if (car.coasting) {
        car.coastT = (car.coastT || 0) + dt;
        decel = (state.config && state.config.cybercabCoastDecelPerSec != null)
          ? state.config.cybercabCoastDecelPerSec : 0.55;
        car.speed = Math.max(0, (car.speed || 0) * Math.max(0, 1 - decel * dt));
        // also absolute floor toward near-stop
        car.speed = Math.max(0, car.speed - (state.maxSpeed || 1) * 0.08 * dt);
        maybeLaneSwap(state, car, dt); // keep lane chaos until stopped
        oldSegment = ns.Track.findSegment(state, car.z);
        car.offset = car.offset + updateCarOffset(state, car, oldSegment, playerSegment, playerW) * 0.35;
        car.z = Util.increase(car.z, dt * car.speed, state.trackLength);
        car.percent = Util.percentRemaining(car.z, state.segmentLength);
        newSegment = ns.Track.findSegment(state, car.z);
        if (oldSegment !== newSegment) {
          index = oldSegment.cars.indexOf(car);
          if (index >= 0) oldSegment.cars.splice(index, 1);
          newSegment.cars.push(car);
        }
        relative = car.z - playerWorldZ;
        if (relative > state.trackLength / 2) relative -= state.trackLength;
        if (relative < -state.trackLength / 2) relative += state.trackLength;
        // remove once player has passed (behind) or after long coast
        // sega52: coastRemoveOnlyOffscreen — the 8 s timeout no longer deletes a car that is still on screen
        var coastOnScreen = state.config && state.config.coastRemoveOnlyOffscreen !== false &&
          relative >= -state.segmentLength * 3 && relative < (state.drawDistance || 300) * state.segmentLength && car.coastT < 30;
        if (relative < -state.segmentLength * 3 || (car.coastT > 8 && !coastOnScreen)) {
          removeCar(state, n);
        }
        continue;
      }
      maybeLaneSwap(state, car, dt);
      oldSegment = ns.Track.findSegment(state, car.z);
      car.offset = car.offset + updateCarOffset(state, car, oldSegment, playerSegment, playerW);
      car.z = Util.increase(car.z, dt * car.speed, state.trackLength);
      car.percent = Util.percentRemaining(car.z, state.segmentLength);
      newSegment = ns.Track.findSegment(state, car.z);

      if (oldSegment !== newSegment) {
        index = oldSegment.cars.indexOf(car);
        if (index >= 0) {
          oldSegment.cars.splice(index, 1);
        }
        newSegment.cars.push(car);
      }
    }
  }

  ns.Traffic = {
    trafficTarget: trafficTarget,
    resetTraffic: resetTraffic,
    ensureTrafficDensity: ensureTrafficDensity,
    updateCars: updateCars,
    spawnCar: spawnCar
  };
})(window.ApexRacer = window.ApexRacer || {});
