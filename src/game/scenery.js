(function(ns) {
  // Scenery director — psych/night flags are owned by sections.js.
  // This module only smooths worldFade and optional corpse flood flavor.

  var BODIES_SMASHED_T = 32.5;

  function songTime(state) {
    if (ns.Sections && ns.Sections.songTime) {
      return ns.Sections.songTime(state);
    }
    var music = Dom.get("music");
    if (music && !isNaN(music.currentTime)) {
      return music.currentTime;
    }
    return state.elapsed || 0;
  }

  function reset(state) {
    state.bodiesSmashed = false;
    state.worldFade = 1;
    state.psychPhase = 0;
    state._bodiesFloodBurst = false;
  }

  function floodCorpses(state, count) {
    var i;
    var lane;
    var ahead;
    var z;
    var offset;
    if (!state.trackLength || !SPRITES.CORPSE) {
      return;
    }
    for (i = 0; i < count; i++) {
      lane = Math.random() < 0.5 ? 0 : 1;
      ahead = state.position + state.segmentLength * (8 + Math.random() * 120);
      z = ahead % state.trackLength;
      if (Math.random() < 0.45) {
        offset = state.config.laneOffsets[lane] + (Math.random() - 0.5) * 0.25;
      } else if (Math.random() < 0.5) {
        offset = -1.15 - Math.random() * 0.55;
      } else {
        offset = 1.15 + Math.random() * 0.55;
      }
      state.corpses.push({
        z: z,
        offset: offset,
        lane: lane,
        sprite: SPRITES.CORPSE,
        percent: 0,
        harmless: true
      });
    }
    while (state.corpses.length > 90) {
      state.corpses.shift();
    }
  }

  function update(state, dt) {
    var t = songTime(state);
    var targetFade;

    if (t >= BODIES_SMASHED_T) {
      if (!state.bodiesSmashed) {
        state.bodiesSmashed = true;
        state._bodiesFloodBurst = false;
      }
      if (!state._bodiesFloodBurst && state.sectionCorpses) {
        state._bodiesFloodBurst = true;
        floodCorpses(state, 28);
        state.corpseSpawnTimer = 0.05;
      }
    }

    // Outside psych: always full Austin world. In psych: fade toward void.
    if (!state.psychMode) {
      state.worldFade = 1;
    } else {
      targetFade = 0;
      if (state.worldFade == null) {
        state.worldFade = 1;
      }
      state.worldFade += (targetFade - state.worldFade) * Math.min(1, dt * 2.4);
      if (Math.abs(state.worldFade - targetFade) < 0.01) {
        state.worldFade = targetFade;
      }
    }

    state.psychPhase = (state.psychPhase || 0) + dt;

    if (state.bodiesSmashed && state.sectionCorpses && state.worldFade > 0.15) {
      state.corpseSpawnTimer -= dt;
      if (state.corpseSpawnTimer <= 0) {
        floodCorpses(state, 2 + Math.floor(Math.random() * 3));
        state.corpseSpawnTimer = 0.12 + Math.random() * 0.18;
      }
    }
  }

  ns.Scenery = {
    reset: reset,
    update: update,
    BODIES_SMASHED_T: BODIES_SMASHED_T
  };
})(window.ApexRacer = window.ApexRacer || {});
