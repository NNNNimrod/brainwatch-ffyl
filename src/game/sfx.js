(function(ns) {
  var ctx = null;
  var muted = false;
  var STORAGE_KEY = "brainwatch_ffyl_sfx_muted";

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  function loadPref() {
    try {
      muted = (localStorage.getItem(STORAGE_KEY) === "true");
    } catch (e) {
      muted = false;
    }
    return muted;
  }

  function setMuted(v) {
    muted = !!v;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
    } catch (e) {}
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    var ac = ensureCtx();
    if (!ac) return;
    if (ac.state === "suspended") {
      try { ac.resume(); } catch (e) {}
    }
    var t0 = ac.currentTime;
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain || 0.08), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, gain) {
    if (muted) return;
    var ac = ensureCtx();
    if (!ac) return;
    if (ac.state === "suspended") {
      try { ac.resume(); } catch (e) {}
    }
    var n = Math.floor(ac.sampleRate * dur);
    var buf = ac.createBuffer(1, n, ac.sampleRate);
    var data = buf.getChannelData(0);
    var i;
    for (i = 0; i < n; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    }
    var src = ac.createBufferSource();
    var g = ac.createGain();
    src.buffer = buf;
    g.gain.value = gain || 0.12;
    src.connect(g);
    g.connect(ac.destination);
    src.start();
  }

  var Sfx = {
    init: function() {
      loadPref();
      return muted;
    },
    setMuted: setMuted,
    isMuted: isMuted,
    unlock: function() {
      ensureCtx();
    },
    lane: function() {
      tone(420, 0.06, "square", 0.05, 560);
    },
    nearMiss: function() {
      tone(880, 0.08, "triangle", 0.07, 1320);
    },
    brainShot: function() {
      tone(660, 0.05, "sawtooth", 0.05, 220);
    },
    brainKill: function() {
      tone(180, 0.12, "square", 0.09, 90);
      setTimeout(function() { tone(320, 0.08, "triangle", 0.06); }, 40);
    },
    hurt: function() {
      tone(140, 0.14, "sawtooth", 0.1, 60);
      noiseBurst(0.08, 0.08);
    },
    death: function() {
      tone(90, 0.35, "sawtooth", 0.12, 40);
      noiseBurst(0.2, 0.1);
    },
    life: function() {
      tone(523, 0.07, "sine", 0.07);
      setTimeout(function() { tone(659, 0.07, "sine", 0.07); }, 55);
      setTimeout(function() { tone(784, 0.1, "sine", 0.08); }, 110);
    },
    ui: function() {
      tone(700, 0.05, "square", 0.05);
      setTimeout(function() { tone(940, 0.07, "square", 0.05); }, 45);
    },
    squish: function() {
      // sega54: tiny wet squish for the on-road body splat (no wav in sounds/)
      noiseBurst(0.07, 0.07);
      tone(120, 0.09, "sine", 0.07, 45);
    },
    tokenCoin: function() {
      // prefer short wav; fall back to synth
      playWav("sounds/token-coin.wav", function() {
        tone(1800, 0.05, "square", 0.08, 2400);
        setTimeout(function() { tone(2200, 0.06, "square", 0.07); }, 40);
      });
    },
    tokenCredit: function() {
      playWav("sounds/token-credit.wav", function() {
        tone(660, 0.08, "triangle", 0.09);
        setTimeout(function() { tone(990, 0.1, "triangle", 0.08); }, 60);
        setTimeout(function() { tone(1320, 0.12, "sine", 0.07); }, 120);
      });
    }
  };

  function playWav(url, fallback) {
    if (muted) return;
    try {
      var a = new Audio(url);
      a.volume = 0.7;
      var p = a.play();
      if (p && p.catch) p.catch(function() { if (fallback) fallback(); });
    } catch (e) {
      if (fallback) fallback();
    }
  }

  ns.Sfx = Sfx;
})(window.ApexRacer = window.ApexRacer || {});
