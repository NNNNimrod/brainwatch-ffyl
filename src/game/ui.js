(function(ns) {
  function formatInteger(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function formatDistance(worldUnits) {
    return (worldUnits / 1000).toFixed(1) + " km";
  }

  function formatClock(seconds) {
    var safe = Math.max(0, Math.floor(seconds));
    var minutes = Math.floor(safe / 60);
    var remaining = safe % 60;
    return (minutes < 10 ? "0" : "") + minutes + ":" + (remaining < 10 ? "0" : "") + remaining;
  }

  function formatLap(seconds) {
    if (!seconds) {
      return "--";
    }
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds - (mins * 60));
    var tenths = Math.floor(10 * (seconds - Math.floor(seconds)));
    if (mins > 0) {
      return mins + ":" + (secs < 10 ? "0" : "") + secs + "." + tenths;
    }
    return secs + "." + tenths;
  }

  function openTrainer(state, refs) {
    if (!refs || !refs.trainerPanel) return;
    if (ns.Sega31 && ns.Sega31.ensureTrainer) ns.Sega31.ensureTrainer(state);
    var box = refs.trainerToggles;
    if (box) {
      box.innerHTML = "";
      var toggles = [
        { id: "invincible", label: "Invincibility (no damage)", def: false },
        { id: "carCollisions", label: "Collisions with cars", def: true },
        { id: "goTier1", label: "Ground now", kind: "action" },
        { id: "goTier2", label: "Ceiling (fly) now", kind: "action" },
        // sega31l: goTier3 removed (nix elevation tier 3)
        { id: "showRoadside", label: "Show roadside props", def: true, cheap: true },
        { id: "showTraffic", label: "Show cybercabs / traffic", def: true, cheap: true },
        { id: "showBrains", label: "Show brains", def: true, cheap: true },
        { id: "showFx", label: "Show FX (explosions/zaps)", def: true, cheap: true },
        { id: "showLyrics", label: "Show lyrics HUD", def: true, cheap: true },
        { id: "showMeters", label: "Show HP / power meters", def: true, cheap: true },
        { id: "showPsych", label: "Show psych overlays", def: true, cheap: true },
        { id: "showBgPlates", label: "Show BG plates", def: true, cheap: true },
        { id: "showZaps", label: "Show / enable zaps", def: true, cheap: true },
        { id: "showPickups", label: "Show pickups/hearts", def: true, cheap: true }
      ];
      toggles.forEach(function(t) {
        if (t.kind === "action") {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "secondary-btn";
          b.textContent = t.label;
          b.style.margin = "4px 0";
          b.addEventListener("click", function() {
            if (t.id === "goTier3") return; // sega31l nix
            var tier = t.id === "goTier1" ? 1 : 2;
            if (ns.Sega31 && ns.Sega31.setElevTier) ns.Sega31.setElevTier(state, tier, { fromTrainer: true });
          });
          box.appendChild(b);
          return;
        }
        var lab = document.createElement("label");
        var inp = document.createElement("input");
        inp.type = "checkbox";
        var cur = state.trainer[t.id];
        inp.checked = (cur == null) ? !!t.def : !!cur;
        inp.addEventListener("change", function() {
          state.trainer[t.id] = !!inp.checked;
        });
        lab.appendChild(inp);
        lab.appendChild(document.createTextNode(" " + t.label));
        box.appendChild(lab);
      });
    }
    refs.trainerPanel.classList.remove("hidden");
    refs.trainerPanel.setAttribute("aria-hidden", "false");
    // sega31o: hide floating PAUSE while trainer open (z-order / hit steal)
    if (refs.pauseButton) {
      refs.pauseButton.classList.add("trainer-open-hide");
      refs.pauseButton.classList.add("hidden");
    }
    bindTrainerCloseButtons(refs, state);
  }

  // sega31o: single closeTrainer — pointerup+click, stopPropagation; return to pause sheet
  function closeTrainer(refs, state, ev) {
    if (ev) {
      try { ev.preventDefault(); ev.stopPropagation(); } catch (e0) {}
    }
    if (!refs) return;
    // debounce pointerup+click double delivery
    var now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (refs._trainerCloseAt && (now - refs._trainerCloseAt) < 280) return;
    refs._trainerCloseAt = now;
    if (refs.trainerPanel) {
      refs.trainerPanel.classList.add("hidden");
      refs.trainerPanel.setAttribute("aria-hidden", "true");
    }
    if (refs.pauseButton) {
      refs.pauseButton.classList.remove("trainer-open-hide");
      // renderHud will restore visibility for paused/running
    }
    // trainerCloseReturnsToPaused: stay paused; re-show pause sheet
    if (state && state.phase === "paused" && refs.pauseTsPanel) {
      var keepPaused = !(state.config && state.config.trainerCloseReturnsToPaused === false);
      if (keepPaused) {
        refs.pauseTsPanel.classList.remove("hidden");
        refs.pauseTsPanel.setAttribute("aria-hidden", "false");
      }
    }
  }

  function bindTrainerCloseButtons(refs, state) {
    if (!refs) return;
    function onClose(ev) { closeTrainer(refs, state, ev); }
    function bindBtn(el) {
      if (!el) return;
      if (el._ffylTrainerCloseBound) return;
      el._ffylTrainerCloseBound = true;
      el.addEventListener("pointerup", onClose, { passive: false });
      el.addEventListener("click", onClose);
    }
    bindBtn(refs.trainerClose);
    bindBtn(refs.trainerCloseTop);
  }

  function collectRefs() {
    return {
      playerHandle: Dom.get("player_handle"),
      playerHandleRecord: Dom.get("player_handle_record"),

      speed: Dom.get("speed_value"),
      score: Dom.get("score_value"),
      combo: Dom.get("combo_value"),
      level: Dom.get("level_value"),
      lap: Dom.get("lap_value"),
      nitroValue: Dom.get("nitro_value"),
      hits: Dom.get("hits_value"),
      deaths: Dom.get("deaths_value"),
      speedLed: Dom.get("speed_led"),
      deathFlash: Dom.get("deathFlash"),
      powerups: Dom.get("powerups_value"),

      healthFill: Dom.get("health_fill"),
      healthText: Dom.get("health_text"),
      nitroFill: Dom.get("nitro_fill"),

      sessionScore: Dom.get("session_score"),
      sessionDistance: Dom.get("session_distance"),
      sessionTime: Dom.get("session_time"),
      sessionRank: Dom.get("session_rank"),

      bestScore: Dom.get("best_score_value"),
      bestDistance: Dom.get("best_distance_value"),
      bestTime: Dom.get("best_time_value"),
      bestLap: Dom.get("best_lap_value"),

      startButton: Dom.get("startButton"),
      restartButton: Dom.get("restartButton"),
      overlay: Dom.get("phaseOverlay"),
      overlayTitle: Dom.get("overlayTitle"),
      overlayMessage: Dom.get("overlayMessage"),
      overlayButton: Dom.get("overlayButton"),
      insertTokenButton: Dom.get("insertTokenButton"),
      titleLogo: Dom.get("titleLogo"),
      overlayCard: Dom.get("overlayCard"),
      highScoreList: Dom.get("highScoreList"),
      initialsEntry: Dom.get("initialsEntry"),
      initialsInput: Dom.get("initialsInput"),
      initialsSave: Dom.get("initialsSave"),
      powerFill: Dom.get("power_fill"),
      countdown: Dom.get("countdown"),
      eventFeed: Dom.get("eventFeed"),
      lyricCurrent: Dom.get("lyric-current"),
      lyricNext: Dom.get("lyric-next"),
      instructionBanner: Dom.get("instructionBanner"),
      finaleKaraoke: Dom.get("finaleKaraoke"),
      karaokeArt: Dom.get("karaokeArt"),
      karaokeVideo: Dom.get("karaokeVideo"),
      karaokeCurrent: Dom.get("karaokeCurrent"),
      karaokeNext: Dom.get("karaokeNext"),
      appShell: Dom.get("app"),
      bgChip: Dom.get("bgChip"),
      highScoresButton: Dom.get("highScoresButton"),
      laneControls: Dom.get("laneControls"),
      socialLinks: Dom.get("socialLinks"),
      finaleFx: Dom.get("finaleFx"),
      laneButtons: document.querySelectorAll("[data-lane]"),
      // sega31b: pause / TS / trainer / instructions (were missing from collectRefs)
      pauseButton: Dom.get("pauseButton"),
      tsButton: Dom.get("tsButton"),
      pauseTsPanel: Dom.get("pauseTsPanel"),
      pauseTsDisplay: Dom.get("pauseTsDisplay"),
      pauseTsSend: Dom.get("pauseTsSend"),
      pauseTsTrainer: Dom.get("pauseTsTrainer"),
      pauseTsClose: Dom.get("pauseTsClose"),
      trainerPanel: Dom.get("trainerPanel"),
      trainerToggles: Dom.get("trainerToggles"),
      trainerClose: Dom.get("trainerClose"),
      trainerCloseTop: Dom.get("trainerCloseTop"),
      hqToast: Dom.get("hqToast"),
      instructionsButton: Dom.get("instructionsButton"),
      instructionsModal: Dom.get("instructionsModal"),
      instructionsBody: Dom.get("instructionsBody"),
      instructionsClose: Dom.get("instructionsClose")
    };
  }

  function bindLaneControls(state, refs) {
    var activePointerId = null;
    var buttons = refs.laneButtons || [];

    function canSteer() {
      return !(state.phase === "menu" || state.phase === "gameover" || finaleFreezesUi(state));
    }

    function setActiveVisual(lane) {
      buttons.forEach(function(button) {
        var l = parseInt(button.getAttribute("data-lane"), 10);
        button.classList.toggle("active", l === lane);
      });
    }

    function laneFromPoint(clientX, clientY) {
      var i, r, nav, nr, mid;
      for (i = 0; i < buttons.length; i++) {
        r = buttons[i].getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
          return parseInt(buttons[i].getAttribute("data-lane"), 10);
        }
      }
      // Finger resting in the bottom control strip — pick LEFT/RIGHT by X half
      nav = refs.laneControls;
      if (!nav) return null;
      nr = nav.getBoundingClientRect();
      if (clientY < nr.top || clientY > nr.bottom || clientX < nr.left || clientX > nr.right) {
        return null;
      }
      mid = nr.left + nr.width * 0.5;
      return clientX < mid ? 0 : 1;
    }

    function applyLane(lane) {
      if (lane == null || isNaN(lane)) return;
      setActiveVisual(lane);
      if (!canSteer()) return;
      ns.Gameplay.setLane(state, lane);
    }

    // Tap LEFT/RIGHT (retained)
    var press = function(ev) {
      var lane = parseInt(ev.currentTarget.getAttribute("data-lane"), 10);
      ev.preventDefault();
      applyLane(lane);
    };

    var release = function(ev) {
      ev.preventDefault();
      // Keep active highlight while a swipe pointer is held on the strip
      if (activePointerId == null) {
        ev.currentTarget.classList.remove("active");
      }
    };

    buttons.forEach(function(button) {
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
    });

    // sega31g: rest finger at bottom and slide/swipe between LEFT and RIGHT
    var nav = refs.laneControls;
    if (nav && !nav._ffylSwipeBound) {
      nav._ffylSwipeBound = true;
      nav.addEventListener("pointerdown", function(ev) {
        // Buttons already handle their own taps; still track for move
        activePointerId = ev.pointerId;
        try { nav.setPointerCapture(ev.pointerId); } catch (eCap) {}
        applyLane(laneFromPoint(ev.clientX, ev.clientY));
      });
      nav.addEventListener("pointermove", function(ev) {
        if (activePointerId !== ev.pointerId) return;
        applyLane(laneFromPoint(ev.clientX, ev.clientY));
      });
      var endSwipe = function(ev) {
        if (activePointerId !== ev.pointerId) return;
        activePointerId = null;
        try { nav.releasePointerCapture(ev.pointerId); } catch (eRel) {}
        buttons.forEach(function(button) { button.classList.remove("active"); });
      };
      nav.addEventListener("pointerup", endSwipe);
      nav.addEventListener("pointercancel", endSwipe);
    }
  }

  function bindCanvasShoot(state) {
    var canvas = state.canvas;
    if (!canvas) {
      return;
    }
    var onPointer = function(ev) {
      if (finaleFreezesUi(state)) {
        return;
      }
      if (state.phase !== "running" && state.phase !== "countdown") {
        return;
      }
      if (ev.target !== canvas) {
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / Math.max(1, rect.width);
      var scaleY = canvas.height / Math.max(1, rect.height);
      var x = (ev.clientX - rect.left) * scaleX;
      var y = (ev.clientY - rect.top) * scaleY;
      if (ns.Brains && ns.Brains.tryTapShoot(state, x, y)) {
        ev.preventDefault();
      }
    };
    canvas.addEventListener("pointerdown", onPointer);
  }

  function dismissTitleOverlay(refs) {
    if (!refs) return;
    if (refs.overlay) {
      refs.overlay.className = "overlay hidden";
      refs.overlay.style.display = "none";
      refs.overlay.setAttribute("aria-hidden", "true");
    }
    if (refs.overlayCard) { refs.overlayCard.classList.remove("menu-title"); }
    if (refs.insertTokenButton) {
      refs.insertTokenButton.classList.add("hidden");
      refs.insertTokenButton.disabled = true;
    }
    if (refs.instructionsButton) { refs.instructionsButton.classList.add("hidden"); }
    if (refs.titleLogo) { refs.titleLogo.classList.add("hidden"); }
  }

  // sega44: LOADING button shows live progress (bytes of the small critical set, floored by the
  // safety-deadline clock) so it never looks frozen
  function loadingText(state) {
    var pct = (state && state._loadPct != null) ? Math.max(0, Math.min(99, Math.floor(state._loadPct))) : 0;
    var dots = ["", ".", "..", "..."][((state && state._loadTick) || 0) % 4];
    return "LOADING " + pct + "%" + dots;
  }

  function onLoadProgress(state) {
    var refs = state && state.ui;
    if (!refs || !refs.insertTokenButton || state.assetsReady) return;
    if (state.phase !== "menu" && state.phase !== "gameover") return;
    var btn = refs.insertTokenButton;
    if (!btn.disabled) return;
    var txt = loadingText(state);
    if (btn.textContent !== txt) btn.textContent = txt;
  }

  // sega42: only Start once assetsReady — else queue + keep overlay (blank-screen fix)
  function tryStartRun(state, refs) {
    if (!state.assetsReady) {
      state._pendingStart = true;
      if (refs && refs.insertTokenButton) {
        refs.insertTokenButton.textContent = loadingText(state);
        refs.insertTokenButton.disabled = true;
        refs.insertTokenButton.classList.remove("hidden");
        refs.insertTokenButton.hidden = false;
      }
      return false;
    }
    if (ns.Sfx) {
      try { ns.Sfx.unlock(); ns.Sfx.ui(); } catch (eS) {}
    }
    var ok = true;
    if (ns.Gameplay && ns.Gameplay.startRun) {
      ok = ns.Gameplay.startRun(state);
      if (ok === false) return false;
    }
    dismissTitleOverlay(refs);
    if (typeof renderOverlay === "function") {
      try { renderOverlay(state); } catch (eH) {}
    }
    return true;
  }

  function onAssetsReady(state) {
    var refs = state.ui;
    if (refs && refs.insertTokenButton) {
      var label = (state.config && state.config.insertTokenLabel) || "INSERT TOKEN";
      if (state.tokenInserted) {
        refs.insertTokenButton.textContent = "START GAME";
      } else {
        refs.insertTokenButton.textContent = label;
      }
      refs.insertTokenButton.disabled = false;
      refs.insertTokenButton.classList.remove("hidden");
      refs.insertTokenButton.hidden = false;
    }
    if (state._pendingStart && state.tokenInserted) {
      tryStartRun(state, refs);
    } else {
      state._pendingStart = false;
      if (typeof renderOverlay === "function") {
        try { renderOverlay(state); } catch (eRO) {}
      }
    }
  }

    function bindButtons(state, refs) {
    var start = function() {
      if (state.config && state.config.requireInsertToken !== false &&
          state.config.startGameAfterTokenOnly !== false &&
          !state.tokenInserted && state.phase === "menu") {
        return;
      }
      tryStartRun(state, refs);
    };

    if (refs.insertTokenButton) {
      refs.insertTokenButton.addEventListener("click", function() {
        if (state.phase !== "menu" && state.phase !== "gameover") { return; }
        var replace = !(state.config && state.config.replaceTokenWithStart === false);
        // If already inserted and button is acting as START GAME
        if (state.tokenInserted && replace && (state.phase === "menu" || state.phase === "gameover")) {
          if (state.phase === "gameover" && ns.Gameplay && ns.Gameplay.returnToMenu) {
            // credit already inserted — start a new run from RUN COMPLETE flow
          }
          tryStartRun(state, refs);
          return;
        }
        if (ns.Gameplay && ns.Gameplay.insertToken) {
          ns.Gameplay.insertToken(state);
        } else {
          state.tokenInserted = true;
        }
        // sega31h: force label flip immediately (music could start while label lagged)
        state.tokenInserted = true;
        if (replace && refs.insertTokenButton) {
          // sega42: keep LOADING/disabled until assetsReady even after token
          if (!state.assetsReady) {
            refs.insertTokenButton.textContent = loadingText(state);
            refs.insertTokenButton.disabled = true;
          } else {
            refs.insertTokenButton.textContent = "START GAME";
            refs.insertTokenButton.disabled = false;
          }
          refs.insertTokenButton.classList.remove("hidden");
          refs.insertTokenButton.hidden = false;
        }
        // After token on gameover, stay on overlay until START (same button)
        if (state.phase === "gameover") {
          state._runCompleteTokenReady = true;
        }
        if (typeof renderOverlay === "function") {
          try { renderOverlay(state); } catch (eRO) {}
        }
      });
    }

    // sega31: INSTRUCTIONS modal
    if (refs.instructionsButton) {
      refs.instructionsButton.addEventListener("click", function() {
        // sega31k: any menu gesture starts/unmutes 8-bar loop
        if (ns.Gameplay && ns.Gameplay.unmuteMenuMusicAudible) ns.Gameplay.unmuteMenuMusicAudible(state);
        if (!refs.instructionsModal) return;
        var text = (state.config && state.config.menuInstructionsText) || "";
        if (refs.instructionsBody) refs.instructionsBody.textContent = text;
        refs.instructionsModal.classList.remove("hidden");
        refs.instructionsModal.setAttribute("aria-hidden", "false");
      });
    }
    if (refs.instructionsClose) {
      refs.instructionsClose.addEventListener("click", function() {
        if (refs.instructionsModal) {
          refs.instructionsModal.classList.add("hidden");
          refs.instructionsModal.setAttribute("aria-hidden", "true");
        }
      });
    }

    // sega31: top PAUSE button
    if (refs.pauseButton) {
      refs.pauseButton.addEventListener("click", function(ev) {
        ev.preventDefault();
        if (state.phase === "running" || state.phase === "paused") {
          ns.Gameplay.togglePause(state);
        }
      });
    }
    // TS button (visible while paused)
    if (refs.tsButton) {
      refs.tsButton.addEventListener("click", function(ev) {
        ev.preventDefault();
        if (state.phase !== "paused") return;
        if (refs.pauseTsPanel) {
          var n = (ns.Sega31 && ns.Sega31.loadTsLog) ? ns.Sega31.loadTsLog().length : (state.pauseTsCount || 0);
          // display next number preview but do NOT increment until send
          var label = ns.Sega31 ? ns.Sega31.formatTs(n + 1, state.runElapsedSinceStart || state.elapsed || 0) : ("TS: " + (n+1));
          if (refs.pauseTsDisplay) refs.pauseTsDisplay.textContent = label;
          if (refs.pauseTsSend) {
            refs.pauseTsSend.textContent = (state.config && state.config.pauseTsSendLabel) || "SEND TS";
          }
          refs.pauseTsPanel.classList.remove("hidden");
        }
      });
    }
    if (refs.pauseTsSend) {
      refs.pauseTsSend.addEventListener("click", function() {
        if (ns.Sega31 && ns.Sega31.sendTimestamp) {
          var entry = ns.Sega31.sendTimestamp(state);
          if (refs.pauseTsDisplay && entry) refs.pauseTsDisplay.textContent = entry.label;
        }
      });
    }
    if (refs.pauseTsTrainer) {
      refs.pauseTsTrainer.addEventListener("click", function() {
        if (refs.pauseTsPanel) refs.pauseTsPanel.classList.add("hidden");
        openTrainer(state, refs);
      });
    }
    if (refs.pauseTsClose) {
      refs.pauseTsClose.addEventListener("click", function(ev) {
        // sega31o: force-hide trainer on pause-sheet CLOSE
        closeTrainer(refs, state, ev);
        if (refs.pauseTsPanel) {
          refs.pauseTsPanel.classList.add("hidden");
          refs.pauseTsPanel.setAttribute("aria-hidden", "true");
        }
        // sega31f: CLOSE dismisses sheet AND unpauses
        if (state.phase === "paused" && ns.Gameplay && ns.Gameplay.togglePause) {
          ns.Gameplay.togglePause(state);
        }
      });
    }
    // sega31o: single closeTrainer binding (pointerup+click)
    bindTrainerCloseButtons(refs, state);

    if (refs.startButton) {
      refs.startButton.addEventListener("click", start);
    }
    refs.restartButton.addEventListener("click", function() {
      if (ns.Sfx) {
        ns.Sfx.unlock();
        ns.Sfx.ui();
      }
      ns.Gameplay.restartRun(state);
    });

    if (refs.initialsSave) {
      refs.initialsSave.addEventListener("click", function() {
        var initials = refs.initialsInput ? refs.initialsInput.value : "AAA";
        var score = state.summary ? state.summary.score : Math.round(state.score || 0);
        if (ns.State.submitHighScore) {
          ns.State.submitHighScore(state.records, initials, score);
        }
        state.awaitingInitials = false;
        showInitialsEntry(state, false);
        renderHighScoreList(state);
        if (ns.Sfx && ns.Sfx.ui) { ns.Sfx.ui(); }
      });
    }
    if (refs.initialsInput) {
      var sanitizeInitials = function() {
        var v = (refs.initialsInput.value || "")
          .toUpperCase()
          .replace(/[^A-Z0-9 ]/g, "")
          .slice(0, 20);
        if (refs.initialsInput.value !== v) {
          refs.initialsInput.value = v;
        }
      };
      refs.initialsInput.addEventListener("input", sanitizeInitials);
      refs.initialsInput.addEventListener("keyup", sanitizeInitials);
      refs.initialsInput.addEventListener("change", sanitizeInitials);
      // Stop game keys / overlay from stealing focus while typing
      refs.initialsInput.addEventListener("keydown", function(ev) {
        ev.stopPropagation();
      });
      refs.initialsInput.addEventListener("touchstart", function(ev) {
        ev.stopPropagation();
      }, { passive: true });
    }

    refs.overlayButton.addEventListener("click", function() {
      // Allow MAIN MENU even if initials prompt is open
      if (state.awaitingInitials && state.phase === "gameover") {
        state.awaitingInitials = false;
        showInitialsEntry(state, false);
      } else if (state.awaitingInitials) {
        return;
      }
      if (state.phase === "paused") {
        ns.Gameplay.togglePause(state);
        return;
      }
      if (state.phase === "gameover") {
        if (ns.Sfx) {
          ns.Sfx.unlock();
          ns.Sfx.ui();
        }
        if (ns.Gameplay.returnToMenu) {
          ns.Gameplay.returnToMenu(state);
        }
        return;
      }
      if (state.phase === "menu" && state.config && state.config.requireInsertToken !== false &&
          !state.tokenInserted) {
        return;
      }
      start();
    });

    if (refs.highScoresButton) {
      refs.highScoresButton.addEventListener("click", function() {
        // sega31k: any menu gesture starts/unmutes 8-bar loop
        if (ns.Gameplay && ns.Gameplay.unmuteMenuMusicAudible) ns.Gameplay.unmuteMenuMusicAudible(state);
        if (ns.Sfx && ns.Sfx.ui) { ns.Sfx.ui(); }
        state.showHighScores = !state.showHighScores;
        if (refs.highScoreList) {
          refs.highScoreList.classList.toggle("hidden", !state.showHighScores);
        }
        if (state.showHighScores) {
          renderHighScoreList(state);
        }
      });
    }

    bindLaneControls(state, refs);
    bindCanvasShoot(state);

    document.addEventListener("touchmove", function(e) {
      var t = e.target;
      if (t && (t.closest && (t.closest("input, textarea, select, .initials-entry")))) {
        return;
      }
      if (t && t.closest && t.closest(".touch-controls")) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  function lyricPair(t) {
    var lines = ns.LYRICS || [];
    var idx = -1;
    var i;
    for (i = 0; i < lines.length; i++) {
      if (t >= lines[i].t) {
        idx = i;
      } else {
        break;
      }
    }
    return {
      idx: idx,
      current: idx >= 0 ? lines[idx].text : "",
      next: "",
      howto: idx >= 0 ? !!lines[idx].howto : false
    };
  }

  /** Next real song lyric after fromIdx — never returns howto / tutorial lines. */
  function nextSongLyric(lines, fromIdx) {
    var i;
    for (i = fromIdx + 1; i < lines.length; i++) {
      if (!lines[i].howto) {
        return lines[i].text;
      }
    }
    return "";
  }

  /** Current song lyric only (skips howto). Used for bottom strip. */
  function songLyricPair(t) {
    var lines = ns.LYRICS || [];
    var idx = -1;
    var i;
    for (i = 0; i < lines.length; i++) {
      if (lines[i].howto) {
        continue;
      }
      if (t >= lines[i].t) {
        idx = i;
      }
    }
    return {
      idx: idx,
      current: idx >= 0 ? lines[idx].text : "",
      next: nextSongLyric(lines, idx)
    };
  }

  function inSaxWindow(t) {
    var sax = (ns.Sections && ns.Sections.SAX_VIDEO) ? ns.Sections.SAX_VIDEO : null;
    return !!(sax && t >= sax.start && t < sax.end);
  }

  function finaleFreezesUi(state) {
    if (ns.Gameplay && ns.Gameplay.finaleFreezesDriving) {
      return ns.Gameplay.finaleFreezesDriving(state);
    }
    return state.finaleMode === "paused" || state.finaleMode === "karaoke";
  }

  function ledDisplayValue(state) {
    // display = internal * (222/140); clamp to 333 normal / 666 while Mad Max
    var baseLed = (state.config && state.config.ledMaxSpeed) ? state.config.ledMaxSpeed : (333 * 140 / 222);
    var displayMax = (state.madMaxMode)
      ? ((state.config && state.config.ledMadDisplayMax != null) ? state.config.ledMadDisplayMax : 666)
      : ((state.config && state.config.ledDisplayMax != null) ? state.config.ledDisplayMax : 333);
    var scale = (state.config && state.config.ledDisplayScale != null)
      ? state.config.ledDisplayScale
      : (169 / 140);
    var internal = (state.speed / Math.max(1e-6, state.maxSpeed)) * baseLed;
    return Math.min(displayMax, Math.round(internal * scale));
  }

  function updateLyrics(state) {
    var refs = state.ui;
    var music = Dom.get("music");
    var t = music && !isNaN(music.currentTime) ? music.currentTime : 0;
    var pair;
    var lines = ns.LYRICS || [];
    var displayT;

    // Protect karaoke / lose storyboard / sax-as-karaoke owns stage — fight keeps bottom strip off too (lyrics on canvas via karaoke only pre-fight)
    if (finaleFreezesUi(state) || state.finaleMode === "fight" || state.finaleMode === "winCruise" || t >= 195) {
      if (refs.lyricCurrent) refs.lyricCurrent.innerHTML = "&nbsp;";
      if (refs.lyricNext) refs.lyricNext.textContent = "";
      return;
    }

    if (state.phase === "menu") {
      return;
    }

    // Absolute song clock (audio.currentTime from song start) — no display lag
    // songLyricPair ignores howto lines so LEFT/RIGHT etc never appear here
    displayT = (state.songClock != null) ? state.songClock : t;
    pair = songLyricPair(displayT);
    if (pair.idx === state.lyricIndex) {
      return;
    }

    state.lyricIndex = pair.idx;
    // Austin backdrop rotate by lyric lines (disabled when per-section or every<=0/false)
    (function rotateAustinBg() {
      var cfg = state.config || {};
      if (cfg.austinBgFromStart === false) return;
      if (cfg.austinBgRotatePerSection) return; // section changes own the plate cycle
      if (pair.idx < 0) return;
      if (pair.idx === state.austinLastLyricIndex) return;
      state.austinLastLyricIndex = pair.idx;
      state.austinSongLyricCount = (state.austinSongLyricCount || 0) + 1;
      var plates = cfg.austinBgPlates || ["dusk", "ember", "night", "violet", "storm", "acid"];
      if (!plates.length) return;
      var every = cfg.austinBgRotateEveryLyricLines;
      if (every === false || every == null || every === 0 || every === "0") return;
      every = Math.max(1, every | 0);
      var plateIdx = Math.floor((state.austinSongLyricCount - 1) / every) % plates.length;
      state.austinBgPlate = plates[plateIdx];
      state.bgStyle = state.austinBgPlate;
      state.nightAustin = (state.bgStyle === "night" || state.bgStyle === "violet" ||
        state.bgStyle === "storm" || state.bgStyle === "acid");
    })();
    if (!refs.lyricCurrent || !refs.lyricNext) {
      return;
    }

    if (pair.idx < 0) {
      refs.lyricCurrent.innerHTML = "&nbsp;";
      refs.lyricNext.textContent = "";
      return;
    }

    refs.lyricCurrent.textContent = (pair.current || ""); // sega31k preserve case
    refs.lyricCurrent.classList.remove("flash");
    void refs.lyricCurrent.offsetWidth;
    refs.lyricCurrent.classList.add("flash");
    if (refs.lyricNext) {
      refs.lyricNext.textContent = "";
      refs.lyricNext.classList.add("hidden");
    }
  }

  function renderInstructionBanner(state) {
    var refs = state.ui;
    var el = refs.instructionBanner;
    var music;
    var t;
    var pair;

    if (!el) {
      return;
    }

    if (
      state.phase === "menu" ||
      state.phase === "gameover" ||
      finaleFreezesUi(state) ||
      state.finaleMode === "fight" ||
      state.finaleMode === "winCruise"
    ) {
      el.className = "instruction-banner hidden";
      el.textContent = "";
      return;
    }

    music = Dom.get("music");
    t = music && !isNaN(music.currentTime) ? music.currentTime : 0;
    // Absolute song time (no lag) — hide during sax reel
    if (inSaxWindow(t)) {
      el.className = "instruction-banner hidden";
      el.textContent = "";
      return;
    }

    pair = lyricPair(t);
    if (pair.howto && pair.current) {
      var cfgH = state.config || {};
      var lines = ns.LYRICS || [];
      var lineT = (pair.idx >= 0 && lines[pair.idx]) ? lines[pair.idx].t : t;
      var age = Math.max(0, t - lineT);
      var maxSec = cfgH.howtoBannerMaxSec != null ? cfgH.howtoBannerMaxSec : 2.5;
      var inLive = (state.phase === "running" || state.phase === "countdown");
      // sega31v: during active run, shorten howto display; song lyrics stay on bottom strip
      if (inLive && cfgH.howtoBannerDimDuringRun !== false && age > maxSec) {
        el.className = "instruction-banner hidden";
        el.textContent = "";
        el.style.opacity = "";
        return;
      }
      el.className = "instruction-banner on" + (inLive ? " howto-quiet" : "");
      el.textContent = pair.current;
      if (inLive && cfgH.howtoBannerDimDuringRun !== false) {
        var op = cfgH.howtoBannerOpacity != null ? cfgH.howtoBannerOpacity : 0.45;
        el.style.opacity = String(op);
      } else {
        el.style.opacity = "";
      }
      return;
    }

    el.className = "instruction-banner hidden";
    el.textContent = "";
    el.style.opacity = "";
  }

  function ensureSaxVideoLoaded(vid, sax) {
    if (!vid || !sax) {
      return;
    }
    if (!vid.getAttribute("data-src") || vid.getAttribute("data-src") !== sax.src) {
      vid.src = sax.src;
      vid.setAttribute("data-src", sax.src);
      try { vid.load(); } catch (eLoad) {}
      vid.muted = true;
      vid.playsInline = true;
    }
  }

  function syncSaxPlayback(vid, sax, t, asBackground) {
    var want;
    var ready;
    var p;
    if (!vid || !sax) {
      return false;
    }
    want = Math.max(0, t - sax.start);
    if (!vid._saxArmed) {
      try { vid.currentTime = want; } catch (e) {}
      vid._saxArmed = true;
    } else if (Math.abs((vid.currentTime || 0) - want) > 1.25) {
      try { vid.currentTime = want; } catch (e3) {}
    }
    if (vid.paused) {
      p = vid.play();
      if (p && p.catch) { p.catch(function() {}); }
    }
    ready = (vid.readyState >= 2) && ((vid.currentTime || 0) > 0.05 || !vid.paused);
    if (asBackground) {
      // Hidden DOM video — canvas drawImage uses the element; keep chrome off
      vid.className = "karaoke-video sax-bg-source";
      return ready;
    }
    vid.className = "karaoke-video on";
    return ready;
  }

  function renderFinaleKaraoke(state) {
    var refs = state.ui;
    var el = refs.finaleKaraoke;
    var art = refs.karaokeArt;
    var music;
    var t;
    var pair;
    var key;
    var img;
    var src;
    var vid;
    var sax;
    var showSax;
    var inFight;

    if (!el) {
      return;
    }

    music = Dom.get("music");
    t = music && !isNaN(music.currentTime) ? music.currentTime : 0;
    sax = (ns.Sections && ns.Sections.SAX_VIDEO) ? ns.Sections.SAX_VIDEO : null;
    if (sax && state.config) {
      if (state.config.saxBgStartSec != null) sax.start = state.config.saxBgStartSec;
      if (state.config.saxBgEndSec != null) sax.end = state.config.saxBgEndSec;
    }
    inFight = state.finaleMode === "fight" || !!state.saxBgActive;
    showSax = !!(sax && t >= sax.start && t < sax.end) || !!state.saxBgActive;
    vid = refs.karaokeVideo;

    // sega31x: sax as canvas BG during 2nd hold / Mad Max (saxBgActive) — not karaoke takeover
    if (state.phase !== "gameover" && showSax && (state.saxBgActive || state.finaleMode === "fight") && state.finaleMode !== "karaoke") {
      el.className = "finale-karaoke hidden sax-bg-mode";
      if (refs.appShell) {
        refs.appShell.classList.remove("karaoke-active");
        refs.appShell.classList.add("sax-bg-active");
      }
      ensureSaxVideoLoaded(vid, sax);
      syncSaxPlayback(vid, sax, t, true);
      if (art) {
        art.className = "karaoke-art";
        art.style.backgroundImage = "";
        art.removeAttribute("data-key");
      }
      return;
    }

    if (refs.appShell) {
      refs.appShell.classList.remove("sax-bg-active");
    }

    // End screen / non-karaoke modes: hide overlay (pause video unless fight already returned)
    if (state.phase === "gameover" || state.finaleMode !== "karaoke") {
      el.className = "finale-karaoke hidden";
      if (refs.appShell) {
        refs.appShell.classList.remove("karaoke-active");
      }
      if (vid && !vid.paused && !inFight) {
        try { vid.pause(); } catch (e0) {}
        vid._saxArmed = false;
        vid.className = "karaoke-video";
      }
      return;
    }

    // Protect karaoke (pre-fight) OR losing storyboard path
    el.className = "finale-karaoke";
    if (refs.appShell) {
      refs.appShell.classList.add("karaoke-active");
    }

    pair = lyricPair(t);

    if (refs.karaokeCurrent) {
      // Pre-fight Protect: show scrollUp lyrics. Lose storyboard: show lyric over art.
      // Never fullscreen-sax takeover anymore during fight (handled above).
      if (pair.howto) {
        refs.karaokeCurrent.textContent = "";
        refs.karaokeCurrent.classList.remove("scroll-up");
      } else {
        var line = (ns.LYRICS && pair.idx >= 0) ? ns.LYRICS[pair.idx] : null;
        var txt = (pair.current || ""); // sega31k preserve case
        var wantScroll = !!(line && line.scrollUp);
        if (refs.karaokeCurrent.textContent !== txt) {
          refs.karaokeCurrent.textContent = txt;
          refs.karaokeCurrent.classList.remove("scroll-up");
          if (wantScroll && txt) {
            void refs.karaokeCurrent.offsetWidth;
            refs.karaokeCurrent.classList.add("scroll-up");
          }
        } else if (wantScroll) {
          refs.karaokeCurrent.classList.add("scroll-up");
        } else {
          refs.karaokeCurrent.classList.remove("scroll-up");
        }
      }
    }
    if (refs.karaokeNext) {
      refs.karaokeNext.textContent = "";
      refs.karaokeNext.classList.add("hidden");
    }

    ensureSaxVideoLoaded(vid, sax);
    // During Protect karaoke we do NOT play sax fullscreen (fight owns sax as BG).
    // Pause any leftover reel.
    if (vid) {
      vid._saxArmed = false;
      if (!vid.paused) { try { vid.pause(); } catch (e2) {} }
      vid.className = "karaoke-video";
      el.classList.remove("video-active");
    }

    // Losing storyboard art cards (power/scream/fight) — or empty during Protect
    key = state.finaleStoryboard;
    if (art) {
      if (key && state.endingImages && state.endingImages[key]) {
        img = state.endingImages[key];
        src = img._assetUrl || img.src || ""; // sega44: loader uses revoked blob: URLs — use the relative asset URL
        if (art.getAttribute("data-key") !== key) {
          art.style.backgroundImage = "url('" + src + "')";
          art.setAttribute("data-key", key);
        }
        art.className = "karaoke-art on";
      } else {
        art.className = "karaoke-art";
        art.style.backgroundImage = "";
        art.removeAttribute("data-key");
      }
    }
  }


  function renderHighScoreList(state) {
    var el = state.ui && state.ui.highScoreList;
    var list;
    var i;
    var row;
    var item;
    if (!el) {
      return;
    }
    list = (state.records && state.records.highScores) ? state.records.highScores : [];
    el.innerHTML = "";
    for (i = 0; i < 3; i++) {
      item = list[i] || { initials: "---", score: 0 };
      row = document.createElement("li");
      row.innerHTML =
        "<span class=\"rank\">" + (i + 1) + "</span>" +
        "<span class=\"initials\">" + item.initials + "</span>" +
        "<span class=\"pts\">" + formatInteger(item.score || 0) + "</span>";
      el.appendChild(row);
    }
  }

  function showInitialsEntry(state, show) {
    var refs = state.ui;
    if (!refs.initialsEntry) {
      return;
    }
    if (show) {
      var wasHidden = refs.initialsEntry.classList.contains("hidden");
      refs.initialsEntry.classList.remove("hidden");
      // Keep MAIN MENU / START visible — initials SAVE is separate
      if (refs.overlayButton) {
        refs.overlayButton.classList.remove("hidden");
      }
      // Only clear + focus when first opening — clearing every frame kills Android typing
      if (wasHidden && refs.initialsInput) {
        refs.initialsInput.value = "";
        setTimeout(function() {
          try { refs.initialsInput.focus(); } catch (e) {}
        }, 50);
      }
    } else {
      refs.initialsEntry.classList.add("hidden");
      // sega31e: do not force-show overlayButton here — menu must stay token-only
    }
  }

  function maybePromptHighScore(state) {
    var score = state.summary ? state.summary.score : Math.round(state.score || 0);
    if (ns.State.qualifiesHighScore && ns.State.qualifiesHighScore(state.records, score)) {
      state.awaitingInitials = true;
      showInitialsEntry(state, true);
      return true;
    }
    state.awaitingInitials = false;
    showInitialsEntry(state, false);
    return false;
  }

  function renderOverlay(state) {
    var refs = state.ui;
    var summary;

    // sega31d: no extra Start/Restart — only INSERT TOKEN → START GAME
    if (refs.startButton) {
      refs.startButton.classList.add("hidden");
      refs.startButton.hidden = true;
      refs.startButton.style.display = "none";
    }
    if (refs.restartButton) {
      refs.restartButton.classList.add("hidden");
      refs.restartButton.hidden = true;
      refs.restartButton.style.display = "none";
    }

    // Finale cinematic owns the stage — but never hide the end-run stats
    // Fight / winCruise keep playing under HUD (no overlay)
    if (state.finaleMode && state.phase !== "gameover") {
      refs.overlay.className = "overlay hidden";
      return;
    }

    if (state.phase === "menu") {
      if (ns.Gameplay && ns.Gameplay.ensureMenuMusic && !state._menuMusicArmed) {
        state._menuMusicArmed = true;
        ns.Gameplay.ensureMenuMusic(state);
      }
      refs.overlay.className = "overlay";
      refs.overlay.style.display = "";
      refs.overlay.removeAttribute("aria-hidden");
      if (refs.overlayCard) { refs.overlayCard.classList.add("menu-title"); }
      if (refs.titleLogo) { refs.titleLogo.classList.remove("hidden"); }
      if (refs.highScoresButton) { refs.highScoresButton.classList.remove("hidden"); }
      if (refs.highScoreList) {
        refs.highScoreList.classList.toggle("hidden", !state.showHighScores);
      }
      showInitialsEntry(state, false);
      if (refs.overlayMessage) {
        refs.overlayMessage.textContent = "";
        refs.overlayMessage.classList.add("hidden");
      }
      refs.overlayTitle.textContent = "FIGHT FOR YOUR LIFE";
      // sega31: hide START until INSERT TOKEN; then token button becomes START GAME
      var needToken = !(state.config && state.config.requireInsertToken === false);
      var replace = !(state.config && state.config.replaceTokenWithStart === false);
      var hideStart = !(state.config && state.config.hideStartUntilToken === false);
      var label = (state.config && state.config.insertTokenLabel) || "INSERT TOKEN";
      if (ns.Sega31 && ns.Sega31.applyTitleLogoSize) ns.Sega31.applyTitleLogoSize(state);
      if (refs.instructionsButton) {
        refs.instructionsButton.classList.remove("hidden");
        refs.instructionsButton.textContent = (state.config && state.config.menuInstructionsLabel) || "INSTRUCTIONS";
      }
      if (refs.insertTokenButton) {
        if (!state.assetsReady) {
          refs.insertTokenButton.textContent = loadingText(state);
          refs.insertTokenButton.classList.remove("hidden");
          refs.insertTokenButton.disabled = true;
          refs.insertTokenButton.hidden = false;
        } else if (needToken && !state.tokenInserted) {
          refs.insertTokenButton.textContent = label;
          refs.insertTokenButton.classList.remove("hidden");
          refs.insertTokenButton.disabled = false;
          refs.insertTokenButton.hidden = false;
        } else if (replace || state.tokenInserted) {
          refs.insertTokenButton.textContent = "START GAME";
          refs.insertTokenButton.classList.remove("hidden");
          refs.insertTokenButton.disabled = false;
          refs.insertTokenButton.hidden = false;
        } else {
          refs.insertTokenButton.classList.add("hidden");
          refs.insertTokenButton.disabled = true;
        }
      }
      if (refs.overlayButton) {
        // sega31e: never show duplicate overlay START — token button is the only start
        refs.overlayButton.classList.add("hidden");
        refs.overlayButton.disabled = true;
        refs.overlayButton.hidden = true;
        refs.overlayButton.setAttribute("aria-hidden", "true");
        refs.overlayButton.style.display = "none";
        refs.overlayButton.textContent = "MAIN MENU";
      }
      if (state.showHighScores) {
        renderHighScoreList(state);
      }
      return;
    }

    if (state.phase === "paused") {
      // sega31f: no Paused/Resume/Instructions overlay — sheet = SEND TS / TRAINER / CLOSE
      refs.overlay.className = "overlay hidden";
      if (refs.titleLogo) { refs.titleLogo.classList.add("hidden"); }
      if (refs.highScoresButton) { refs.highScoresButton.classList.add("hidden"); }
      if (refs.highScoreList) { refs.highScoreList.classList.add("hidden"); }
      if (refs.insertTokenButton) {
        refs.insertTokenButton.classList.add("hidden");
        refs.insertTokenButton.disabled = true;
      }
      if (refs.instructionsButton) { refs.instructionsButton.classList.add("hidden"); }
      showInitialsEntry(state, false);
      if (refs.overlayMessage) {
        refs.overlayMessage.textContent = "";
        refs.overlayMessage.classList.add("hidden");
      }
      if (refs.overlayTitle) { refs.overlayTitle.textContent = ""; }
      if (refs.overlayButton) {
        refs.overlayButton.classList.add("hidden");
        refs.overlayButton.disabled = true;
        refs.overlayButton.hidden = true;
        refs.overlayButton.setAttribute("aria-hidden", "true");
        refs.overlayButton.style.display = "none";
      }
      return;
    }

    if (state.phase === "gameover") {
      summary = state.summary || {
        score: 0, rawScore: 0, nearMisses: 0, brainKills: 0, deaths: 0, avgSpeed: 0
      };
      if (refs.titleLogo) { refs.titleLogo.classList.add("hidden"); }
      if (refs.overlayCard) { refs.overlayCard.classList.remove("menu-title"); }
      if (refs.highScoresButton) { refs.highScoresButton.classList.add("hidden"); }
      if (refs.highScoreList) { refs.highScoreList.classList.remove("hidden"); }
      if (refs.insertTokenButton) {
        refs.insertTokenButton.classList.add("hidden");
        refs.insertTokenButton.disabled = true;
      }
      refs.overlay.className = "overlay";
      refs.overlay.style.display = "";
      refs.overlay.removeAttribute("aria-hidden");
      if (state.loseBanner || (summary.finaleResult === "lose" && !state.songEnded)) {
        refs.overlayTitle.textContent = "YOU LOST. GAME OVER.";
      } else if (state.finaleWon || summary.finaleResult === "win") {
        refs.overlayTitle.textContent = state.songEnded ? "WELL DONE. YOU WIN!" : "WELL DONE. YOU WIN!";
      } else {
        refs.overlayTitle.textContent = state.songEnded ? "RUN COMPLETE" : "Run Over";
      }
      if (refs.overlayMessage) {
        refs.overlayMessage.classList.remove("hidden");
        refs.overlayMessage.innerHTML =
          "<span class=\"end-score\">SCORE  " + formatInteger(summary.score) + "</span>" +
          "<span class=\"end-stats\">Avoids " + (summary.nearMisses || 0) +
          " · Brains " + (summary.brainKills || 0) +
          " · Deaths " + (summary.deaths || 0) +
          " · Avg SPD " + (summary.avgSpeed || 0) + "</span>";
      }
      // sega31: RUN COMPLETE uses INSERT TOKEN flow; hide PLAY AGAIN
      var useToken = !(state.config && state.config.runCompleteUsesInsertToken === false);
      if (refs.instructionsButton) refs.instructionsButton.classList.add("hidden");
      if (useToken) {
        state.tokenInserted = !!state._runCompleteTokenReady;
        var lab = (state.config && state.config.insertTokenLabel) || "INSERT TOKEN";
        if (refs.insertTokenButton) {
          refs.insertTokenButton.classList.remove("hidden");
          refs.insertTokenButton.disabled = false;
          refs.insertTokenButton.textContent = state.tokenInserted ? "START GAME" : lab;
        }
        // MAIN MENU still available but no PLAY AGAIN
        refs.overlayButton.textContent = "MAIN MENU";
        refs.overlayButton.classList.remove("hidden");
        refs.overlayButton.hidden = false;
        refs.overlayButton.removeAttribute("aria-hidden");
        refs.overlayButton.style.display = "";
        refs.overlayButton.disabled = false;
      } else {
        if (refs.insertTokenButton) {
          refs.insertTokenButton.classList.add("hidden");
          refs.insertTokenButton.disabled = true;
        }
        refs.overlayButton.textContent = "MAIN MENU";
        refs.overlayButton.classList.remove("hidden");
        refs.overlayButton.hidden = false;
        refs.overlayButton.removeAttribute("aria-hidden");
        refs.overlayButton.style.display = "";
        refs.overlayButton.disabled = false;
      }
      renderHighScoreList(state);
      if (state.awaitingInitials) {
        showInitialsEntry(state, true);
      } else if (state.awaitingInitials !== false) {
        maybePromptHighScore(state);
      }
      refs.overlayButton.classList.remove("hidden");
      refs.overlayButton.textContent = "MAIN MENU";
      return;
    }

    // countdown / running / other — hide title overlay hard
    refs.overlay.className = "overlay hidden";
    refs.overlay.style.display = "none";
    refs.overlay.setAttribute("aria-hidden", "true");
    if (refs.overlayCard) { refs.overlayCard.classList.remove("menu-title"); }
    if (refs.insertTokenButton) {
      refs.insertTokenButton.classList.add("hidden");
      refs.insertTokenButton.disabled = true;
    }
    if (refs.instructionsButton) { refs.instructionsButton.classList.add("hidden"); }
  }

  function renderCountdown(state) {
    var refs = state.ui;
    if (state.phase !== "countdown" || finaleFreezesUi(state)) {
      refs.countdown.className = "countdown hidden";
      return;
    }

    refs.countdown.className = "countdown";
    refs.countdown.textContent = Math.max(1, Math.ceil(state.countdown));
  }

  function renderEventFeed(state) {
    var refs = state.ui;
    var music = Dom.get("music");
    var songT = music && !isNaN(music.currentTime) ? music.currentTime : 0;
    if (finaleFreezesUi(state) || state.finaleMode === "winCruise" || songT >= 215.96 || state.eventTimer <= 0 || !state.eventText) {
      refs.eventFeed.className = "event-feed";
      refs.eventFeed.textContent = "";
      return;
    }
    // No LEVEL commentary / howto spills in the feed
    if (/^LEVEL\b/i.test(state.eventText) || /howto/i.test(state.eventText)) {
      refs.eventFeed.className = "event-feed";
      refs.eventFeed.textContent = "";
      return;
    }
    refs.eventFeed.className = "event-feed on";
    refs.eventFeed.textContent = state.eventText;
  }

  function renderRecords(state) {
    var refs = state.ui;
    if (!refs.bestScore) {
      return;
    }
    refs.bestScore.textContent = formatInteger(state.records.bestScore);
    refs.bestDistance.textContent = formatDistance(state.records.bestDistance);
    refs.bestTime.textContent = formatClock(state.records.bestTime);
    refs.bestLap.textContent = formatLap(state.records.bestLapTime);
  }

  function renderBottomControls(state) {
    var refs = state.ui;
    var inPlay = state.phase === "running" || state.phase === "countdown" || state.phase === "paused";
    if (refs.laneControls) {
      refs.laneControls.classList.toggle("hidden", !inPlay);
    }
    if (refs.socialLinks) {
      refs.socialLinks.classList.toggle("hidden", !!inPlay);
    }
  }

  function renderFinaleFx(state) {
    var refs = state.ui;
    var el = refs.finaleFx;
    var music;
    var t;
    var show;
    if (!el) {
      return;
    }
    music = Dom.get("music");
    t = music && !isNaN(music.currentTime) ? music.currentTime : 0;
    // Flames/blood: lose storyboard path only (win uses cruise; fight has sax BG)
    show = (
      state.phase !== "menu" &&
      state.phase !== "gameover" &&
      state.finaleMode === "karaoke" &&
      !!state.finaleLost &&
      t >= 215.96
    );
    el.classList.toggle("hidden", !show);
    el.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function renderHud(state) {
    var refs = state.ui;
    var inPlay = state.phase === "running" || state.phase === "countdown" || state.phase === "paused";
    if (refs.appShell) {
      refs.appShell.classList.toggle("playing", !!inPlay);
      refs.appShell.setAttribute("data-bg", state.bgStyle || "dusk");
    }
    if (refs.bgChip) {
      refs.bgChip.textContent = (state.bgStyle || "dusk").toUpperCase();
      refs.bgChip.classList.toggle("hidden", !inPlay && state.phase !== "countdown");
    }
    renderBottomControls(state);
    renderFinaleFx(state);
    // HUD SPD: internal * (222/140), clamp 333 (or 666 in Mad Max)
    var speedKmh = ledDisplayValue(state);
    var maxH = (state.config && state.config.maxHealth) ? state.config.maxHealth : 100;
    var healthPercent = Util.limit((state.health / Math.max(1e-6, maxH)) * 100, 0, 100);
    var nitroPercent = Util.limit(state.nitro, 0, 100);

    if (refs.speed) refs.speed.textContent = String(speedKmh);
    if (refs.speedLed) {
      var led = String(Math.max(0, speedKmh));
      while (led.length < 3) led = "0" + led;
      refs.speedLed.textContent = led;
    }
    if (refs.score) refs.score.textContent = formatInteger(state.score);
    if (refs.combo) refs.combo.textContent = "x" + state.multiplier.toFixed(2);
    if (refs.level) refs.level.textContent = String(state.difficultyLevel);
    if (refs.lap) refs.lap.textContent = String(state.lap);
    if (refs.nitroValue) refs.nitroValue.textContent = String(Math.round(nitroPercent));
    if (refs.hits) refs.hits.textContent = String(state.hits || 0);
    if (refs.deaths) refs.deaths.textContent = String(state.deaths || 0);
    if (refs.powerups) refs.powerups.textContent = String(state.weaponPower != null ? state.weaponPower : (state.powerups || 0));
    if (refs.deathFlash) {
      // sega28: Mad Max uses same death-flash DOM/CSS styling
      if (state.madMaxFlashTimer > 0) {
        refs.deathFlash.className = "death-flash on glow-green";
        refs.deathFlash.textContent = (state.config && state.config.madMaxBannerText) || state.madMaxFlashText || "MAD MAX";
        refs.deathFlash.setAttribute("aria-hidden", "false");
        if (ns.Sega31 && ns.Sega31.styleMadMaxFlash) ns.Sega31.styleMadMaxFlash(refs.deathFlash, state);
      } else if (state.deathFlashTimer > 0) {
        refs.deathFlash.className = "death-flash on glow-red";
        refs.deathFlash.textContent = "DEATH";
        refs.deathFlash.setAttribute("aria-hidden", "false");
      } else {
        refs.deathFlash.className = "death-flash hidden";
        refs.deathFlash.setAttribute("aria-hidden", "true");
      }
    }

    if (refs.healthFill) refs.healthFill.style.width = healthPercent.toFixed(1) + "%";
    if (refs.nitroFill) refs.nitroFill.style.width = nitroPercent.toFixed(1) + "%";
    if (refs.powerFill) {
      var pwr = Util.limit(state.weaponPower != null ? state.weaponPower : ((state.powerups || 0) * 10), 0, 100);
      refs.powerFill.style.width = pwr.toFixed(1) + "%";
    }
    if (refs.healthText) refs.healthText.textContent = Math.round(healthPercent) + "%";

    if (refs.sessionScore) refs.sessionScore.textContent = formatInteger(state.score);
    if (refs.sessionDistance) refs.sessionDistance.textContent = formatDistance(state.distance);
    if (refs.sessionTime) refs.sessionTime.textContent = formatClock(state.elapsed);
    if (refs.sessionRank) refs.sessionRank.textContent = state.rank;

    renderRecords(state);
    renderOverlay(state);
    renderCountdown(state);
    renderEventFeed(state);
    renderInstructionBanner(state);
    renderFinaleKaraoke(state);
    updateLyrics(state);

    // sega31: pause / TS / toast / cheap hides
    // sega31o: force-close trainer if not paused (orphan guard)
    if (refs.trainerPanel && state.phase !== "paused") {
      if (!refs.trainerPanel.classList.contains("hidden")) {
        refs.trainerPanel.classList.add("hidden");
        refs.trainerPanel.setAttribute("aria-hidden", "true");
      }
      if (refs.pauseButton) refs.pauseButton.classList.remove("trainer-open-hide");
    }
    var trainerOpenNow = refs.trainerPanel && !refs.trainerPanel.classList.contains("hidden");
    if (refs.pauseButton) {
      var showPause = (state.phase === "running" || state.phase === "paused" || state.phase === "countdown");
      // sega31o: hide pause btn while trainer open
      if (trainerOpenNow) showPause = false;
      refs.pauseButton.classList.toggle("hidden", !showPause);
      if (state.phase === "paused") {
        refs.pauseButton.textContent = (state.config && state.config.pauseButtonPausedLabel) || "PAUSED";
        refs.pauseButton.classList.add("paused-on");
      } else {
        refs.pauseButton.textContent = (state.config && state.config.pauseButtonLabel) || "PAUSE";
        refs.pauseButton.classList.remove("paused-on");
      }
    }
    if (refs.tsButton) {
      // sega31f: pause sheet owns SEND TS — hide floating TS button
      refs.tsButton.classList.add("hidden");
    }
    if (refs.pauseTsPanel) {
      if (state.phase === "paused") {
        // Prefer open sheet on pause; keep open unless trainer panel is up
        var trainerOpen = refs.trainerPanel && !refs.trainerPanel.classList.contains("hidden");
        if (!trainerOpen) {
          var n = (ns.Sega31 && ns.Sega31.loadTsLog) ? ns.Sega31.loadTsLog().length : (state.pauseTsCount || 0);
          var label = ns.Sega31 ? ns.Sega31.formatTs(n + 1, state.runElapsedSinceStart || state.elapsed || 0) : ("TS: " + (n + 1));
          if (refs.pauseTsDisplay) refs.pauseTsDisplay.textContent = label;
          if (refs.pauseTsSend) {
            refs.pauseTsSend.textContent = (state.config && state.config.pauseTsSendLabel) || "SEND TS";
          }
          refs.pauseTsPanel.classList.remove("hidden");
          refs.pauseTsPanel.setAttribute("aria-hidden", "false");
        }
      } else {
        refs.pauseTsPanel.classList.add("hidden");
        refs.pauseTsPanel.setAttribute("aria-hidden", "true");
      }
    }
    if (refs.hqToast) {
      if (state.hqToastTimer > 0) {
        refs.hqToast.textContent = state.hqToastText || "Timestamp sent to HQ";
        refs.hqToast.classList.remove("hidden");
        state.hqToastTimer -= (state.step || 1/60);
      } else {
        refs.hqToast.classList.add("hidden");
      }
    }
    if (ns.Sega31 && ns.Sega31.ensureTrainer) ns.Sega31.ensureTrainer(state);
    if (ns.Sega31 && ns.Sega31.trainerOn) {
      var lyr = Dom.get("lyrics");
      if (lyr) lyr.classList.toggle("hidden", !ns.Sega31.trainerOn(state, "showLyrics"));
      var meters = document.querySelector(".meters");
      if (meters) meters.classList.toggle("hidden", !ns.Sega31.trainerOn(state, "showMeters"));
    }
    if (state.winterGrayscale && refs.appShell) {
      refs.appShell.classList.add("winter-grayscale");
    } else if (refs.appShell) {
      refs.appShell.classList.remove("winter-grayscale");
    }
    // After nukeFlash: fade 100% brightness B&W → full color (nukePostFlashBw 1→0)
    var bw = state.nukePostFlashBw || 0;
    // sega43: Sega nuke keeps full color (yellow→white det flash + fiery mushroom); swap timing unchanged
    if (state.config && state.config.nukeSegaEnabled !== false && state.config.nukeSegaSkipPostFlashBw !== false) bw = 0;
    var stageEl = refs.appShell || null;
    var canvasEl = refs.canvas || (state && state.canvas) || Dom.get("canvas");
    if (bw > 0.001 && !state.winterGrayscale) {
      // grayscale(1) + elevated brightness at start → identity at 0
      var br = 1 + 0.45 * bw;
      var filt = "grayscale(" + bw.toFixed(3) + ") brightness(" + br.toFixed(3) + ")";
      if (canvasEl) canvasEl.style.filter = filt;
      if (stageEl) {
        stageEl.classList.add("nuke-postflash-bw");
        stageEl.style.setProperty("--nuke-bw", String(bw));
        stageEl.style.setProperty("--nuke-br", String(br));
      }
    } else {
      if (canvasEl && !state.winterGrayscale) canvasEl.style.filter = "";
      if (stageEl) {
        stageEl.classList.remove("nuke-postflash-bw");
        stageEl.style.removeProperty("--nuke-bw");
        stageEl.style.removeProperty("--nuke-br");
      }
    }
  }

  function create(state) {
    var refs = collectRefs();
    // sega42: button starts as LOADING until critical assets ready
    if (refs.insertTokenButton) {
      refs.insertTokenButton.textContent = loadingText(state);
      refs.insertTokenButton.disabled = true;
    }
    bindButtons(state, refs);
    if (refs.playerHandle) refs.playerHandle.textContent = state.playerName;
    if (refs.playerHandleRecord) refs.playerHandleRecord.textContent = state.playerName;
    state.ui = refs;
    renderHud(state);
    if (ns.Gameplay && ns.Gameplay.ensureMenuMusic) {
      ns.Gameplay.ensureMenuMusic(state);
    }

    var music = Dom.get("music");
    if (music) {
      music.addEventListener("ended", function() {
        if (state.phase === "running" || state.phase === "countdown") {
          ns.Gameplay.finishSong(state);
        }
        if (ns.Gameplay && ns.Gameplay.onSongFullyFinished) {
          ns.Gameplay.onSongFullyFinished(state);
        }
      });
    }
  }

  ns.UI = {
    create: create,
    render: renderHud,
    onAssetsReady: onAssetsReady,
    onLoadProgress: onLoadProgress
  };
})(window.ApexRacer = window.ApexRacer || {});
