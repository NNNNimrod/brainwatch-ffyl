(function(ns) {
  var ROAD = {
    LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
    HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
    CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 }
  };

  function wrappedIndex(state, n) {
    var len = state.segments.length;
    if (!len) {
      return 0;
    }
    return ((n % len) + len) % len;
  }

  function findSegment(state, z) {
    return state.segments[Math.floor(z / state.segmentLength) % state.segments.length];
  }

  function lastY(state) {
    return (state.segments.length === 0) ? 0 : state.segments[state.segments.length - 1].p2.world.y;
  }

  function addSegment(state, curve, y) {
    var n = state.segments.length;
    state.segments.push({
      index: n,
      p1: { world: { y: lastY(state), z: n * state.segmentLength }, camera: {}, screen: {} },
      p2: { world: { y: y, z: (n + 1) * state.segmentLength }, camera: {}, screen: {} },
      curve: curve,
      sprites: [],
      cars: [],
      color: Math.floor(n / state.rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT
    });
  }

  function addSprite(state, n, sprite, offset, sectionId) {
    if (!state.segments.length) {
      return;
    }
    state.segments[wrappedIndex(state, n)].sprites.push({
      source: sprite,
      offset: offset,
      sectionId: sectionId || null
    });
  }

  function addRoad(state, enter, hold, leave, curve, y) {
    var startY = lastY(state);
    var endY = startY + (Util.toInt(y, 0) * state.segmentLength);
    var total = enter + hold + leave;
    var n;

    for (n = 0; n < enter; n++) {
      addSegment(
        state,
        Util.easeIn(0, curve, n / enter),
        Util.easeInOut(startY, endY, n / total)
      );
    }
    for (n = 0; n < hold; n++) {
      addSegment(
        state,
        curve,
        Util.easeInOut(startY, endY, (enter + n) / total)
      );
    }
    for (n = 0; n < leave; n++) {
      addSegment(
        state,
        Util.easeInOut(curve, 0, n / leave),
        Util.easeInOut(startY, endY, (enter + hold + n) / total)
      );
    }
  }

  function addStraight(state, num) {
    num = num || ROAD.LENGTH.MEDIUM;
    addRoad(state, num, num, num, 0, 0);
  }

  function addHill(state, num, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    height = height || ROAD.HILL.MEDIUM;
    addRoad(state, num, num, num, 0, height);
  }

  function addCurve(state, num, curve, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    curve = curve || ROAD.CURVE.MEDIUM;
    height = height || ROAD.HILL.NONE;
    addRoad(state, num, num, num, curve, height);
  }

  function addLowRollingHills(state, num, height) {
    num = num || ROAD.LENGTH.SHORT;
    height = height || ROAD.HILL.LOW;
    addRoad(state, num, num, num, 0, height / 2);
    addRoad(state, num, num, num, 0, -height);
    addRoad(state, num, num, num, ROAD.CURVE.EASY, height);
    addRoad(state, num, num, num, 0, 0);
    addRoad(state, num, num, num, -ROAD.CURVE.EASY, height / 2);
    addRoad(state, num, num, num, 0, 0);
  }

  function addSCurves(state) {
    addRoad(state, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.NONE);
    addRoad(state, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    addRoad(state, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.LOW);
    addRoad(state, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.MEDIUM);
    addRoad(state, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, -ROAD.HILL.MEDIUM);
  }

  function addBumps(state) {
    addRoad(state, 10, 10, 10, 0, 5);
    addRoad(state, 10, 10, 10, 0, -2);
    addRoad(state, 10, 10, 10, 0, -5);
    addRoad(state, 10, 10, 10, 0, 8);
    addRoad(state, 10, 10, 10, 0, 5);
    addRoad(state, 10, 10, 10, 0, -7);
    addRoad(state, 10, 10, 10, 0, 5);
    addRoad(state, 10, 10, 10, 0, -2);
  }

  function addDownhillToEnd(state, num) {
    num = num || 200;
    addRoad(state, num, num, num, -ROAD.CURVE.EASY, -lastY(state) / state.segmentLength);
  }

  function decorateRoad(state) {
    var n;
    var i;
    var side;
    var sprite;
    var offset;
    var sectionIds;
    var pool;
    var secId;
    var stride;

    addSprite(state, 20, SPRITES.BILLBOARD07, -1);
    addSprite(state, 40, SPRITES.BILLBOARD06, -1);
    addSprite(state, 60, SPRITES.BILLBOARD08, -1);
    addSprite(state, 80, SPRITES.BILLBOARD09, -1);
    addSprite(state, 100, SPRITES.BILLBOARD01, -1);
    addSprite(state, 120, SPRITES.BILLBOARD02, -1);
    addSprite(state, 140, SPRITES.BILLBOARD03, -1);
    addSprite(state, 160, SPRITES.BILLBOARD04, -1);
    addSprite(state, 180, SPRITES.BILLBOARD05, -1);

    addSprite(state, 240, SPRITES.BILLBOARD07, -1.2);
    addSprite(state, 240, SPRITES.BILLBOARD06, 1.45);
    addSprite(state, state.segments.length - 25, SPRITES.BILLBOARD07, -1.2);
    addSprite(state, state.segments.length - 25, SPRITES.BILLBOARD06, 1.45);

    // Sparse palms — tutorial/verse1 only (city props dominate elsewhere)
    for (n = 14; n < 200; n += 18 + Math.floor(n / 80)) {
      addSprite(state, n, SPRITES.PALM_TREE, 1.4 + Math.random() * 0.5, "tutorial");
      addSprite(state, n + 3, SPRITES.PALM_TREE, 1.4 + Math.random() * 0.5, "verse1");
    }

    // Thin far trees — not every few segments
    for (n = 280; n < 900; n += 28) {
      addSprite(state, n, SPRITES.COLUMN, 1.55, "holding");
      if (n % 56 === 0) {
        addSprite(state, n + 2, SPRITES.TREE1, -1.4 - Math.random() * 1.5, "verse1");
      }
    }

    for (n = 1000; n < (state.segments.length - 50); n += 140) {
      side = Util.randomChoice([1, -1]);
      addSprite(
        state,
        n + Util.randomInt(0, 40),
        Util.randomChoice(SPRITES.BILLBOARDS),
        side < 0 ? -1.2 : 1.45
      );
    }

    // sega24: one roadside TYPE per section, sparse density (chorus2 denser buildings)
    sectionIds = [
      "tutorial", "verse1", "holding", "chorus1", "bridge",
      "verse2", "applause", "diamond2", "chorus2", "finale"
    ];
    for (i = 0; i < sectionIds.length; i++) {
      secId = sectionIds[i];
      pool = (SPRITES.SECTION_ROADSIDE && SPRITES.SECTION_ROADSIDE[secId]) || [SPRITES.RS_LAMP];
      sprite = pool[0];
      if (!sprite) {
        continue;
      }
      // Sparse default stride; chorus2 denser single building type
      if (secId === "chorus2") {
        stride = 14;
      } else if (secId === "finale" || secId === "bridge") {
        stride = 28;
      } else {
        stride = 36 + (i % 4) * 2;
      }
      for (n = 30 + i * 5; n < state.segments.length - 40; n += stride) {
        side = Util.randomChoice([1, -1]);
        offset = side < 0
          ? (-1.45 - Math.random() * 0.55)
          : (1.6 + Math.random() * 0.55);
        addSprite(state, n, sprite, offset, secId);
        // Occasional opposite-side twin for tall buildings only (same type)
        if ((secId === "chorus2" || secId === "bridge" || secId === "finale") && (n % (stride * 3) < 3)) {
          addSprite(
            state,
            n + 1,
            sprite,
            side < 0 ? (1.65 + Math.random() * 0.35) : (-1.5 - Math.random() * 0.35),
            secId
          );
        }
      }
    }
  }

  function resetRoad(state) {
    var n;
    var startLineIndex;

    state.segments = [];

    addStraight(state, ROAD.LENGTH.SHORT);
    addLowRollingHills(state);
    addSCurves(state);
    addCurve(state, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
    addBumps(state);
    addLowRollingHills(state);
    addCurve(state, ROAD.LENGTH.LONG * 2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    addStraight(state);
    addHill(state, ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH);
    addSCurves(state);
    addCurve(state, ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE);
    addHill(state, ROAD.LENGTH.LONG, ROAD.HILL.HIGH);
    addCurve(state, ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW);
    addBumps(state);
    addHill(state, ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
    addStraight(state);
    addSCurves(state);
    addDownhillToEnd(state);

    decorateRoad(state);
    state.trackLength = state.segments.length * state.segmentLength;

    startLineIndex = findSegment(state, state.playerZ).index + 2;
    state.segments[wrappedIndex(state, startLineIndex)].color = COLORS.START;
    state.segments[wrappedIndex(state, startLineIndex + 1)].color = COLORS.START;

    for (n = 0; n < state.rumbleLength; n++) {
      state.segments[state.segments.length - 1 - n].color = COLORS.FINISH;
    }
  }

  ns.Track = {
    ROAD: ROAD,
    findSegment: findSegment,
    resetRoad: resetRoad
  };
})(window.ApexRacer = window.ApexRacer || {});
