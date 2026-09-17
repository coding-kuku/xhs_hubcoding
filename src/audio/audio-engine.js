(function installPortAudio(globalScope) {
  "use strict";

  const STORAGE_KEY = "port-auction-audio-v1";
  const DEFAULT_SETTINGS = Object.freeze({
    music: true,
    sfx: true,
    musicVolume: 0.42,
    sfxVolume: 0.72
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Number(value) || 0));
  }

  function readSettings(storage) {
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return { ...DEFAULT_SETTINGS };
      return {
        music: saved.music !== false,
        sfx: saved.sfx !== false,
        musicVolume: clamp(saved.musicVolume ?? DEFAULT_SETTINGS.musicVolume, 0, 1),
        sfxVolume: clamp(saved.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume, 0, 1)
      };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function createAudioEngine(options) {
    const config = options || {};
    let browserStorage = null;
    try {
      browserStorage = globalScope.localStorage || null;
    } catch (error) {
      browserStorage = null;
    }
    const storage = config.storage || browserStorage;
    const AudioContextConstructor = globalScope.AudioContext || globalScope.webkitAudioContext || null;
    let settings = storage ? readSettings(storage) : { ...DEFAULT_SETTINGS };
    let context = null;
    let masterBus = null;
    let musicBus = null;
    let effectsBus = null;
    let noiseBuffer = null;
    let scheduler = null;
    let ambience = null;
    let scene = "board";
    let auctionRound = 1;
    let nextPhraseAt = 0;
    let unlocked = false;
    let destroyed = false;
    let randomState = 0x5f3759df;

    function persistSettings() {
      if (!storage) return;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        // 声音设置保存失败不影响游戏继续运行。
      }
    }

    function random() {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return randomState / 4294967296;
    }

    function disconnect(node) {
      if (!node) return;
      try {
        node.disconnect();
      } catch (error) {
        // 节点可能已经由浏览器回收。
      }
    }

    function ramp(parameter, value, duration) {
      if (!context || !parameter) return;
      const now = context.currentTime;
      const target = Math.max(0.0001, value);
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(Math.max(0.0001, parameter.value || 0.0001), now);
      parameter.linearRampToValueAtTime(target, now + Math.max(0.01, duration || 0.08));
    }

    function createNoiseBuffer() {
      const seconds = 1.5;
      const length = Math.max(1, Math.floor(context.sampleRate * seconds));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      let last = 0;
      for (let index = 0; index < length; index += 1) {
        const white = random() * 2 - 1;
        last = last * 0.94 + white * 0.06;
        channel[index] = last * 0.82;
      }
      return buffer;
    }

    function ensureContext() {
      if (destroyed || !AudioContextConstructor) return false;
      if (context) return true;
      try {
        context = new AudioContextConstructor();
        masterBus = context.createGain();
        musicBus = context.createGain();
        effectsBus = context.createGain();
        const limiter = context.createDynamicsCompressor();
        masterBus.gain.value = 0.68;
        musicBus.gain.value = 0.0001;
        effectsBus.gain.value = settings.sfx ? settings.sfxVolume : 0.0001;
        limiter.threshold.value = -12;
        limiter.knee.value = 16;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.004;
        limiter.release.value = 0.16;
        musicBus.connect(masterBus);
        effectsBus.connect(masterBus);
        masterBus.connect(limiter);
        limiter.connect(context.destination);
        noiseBuffer = createNoiseBuffer();
        return true;
      } catch (error) {
        context = null;
        return false;
      }
    }

    function tone(destination, frequency, duration, volume, options) {
      if (!context || !destination) return;
      const detail = options || {};
      const startAt = context.currentTime + Math.max(0, detail.delay || 0);
      const stopAt = startAt + Math.max(0.025, duration || 0.1);
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const filter = context.createBiquadFilter();
      oscillator.type = detail.type || "sine";
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), startAt);
      if (detail.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, detail.endFrequency), stopAt);
      }
      if (detail.detune) oscillator.detune.setValueAtTime(detail.detune, startAt);
      filter.type = detail.filterType || "lowpass";
      filter.frequency.value = detail.filterFrequency || 7200;
      filter.Q.value = detail.filterQ || 0.7;
      const attack = Math.max(0.008, Math.min(detail.attack || 0.018, duration * 0.42));
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.linearRampToValueAtTime(Math.max(0.0001, volume), startAt + attack);
      envelope.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(destination);
      oscillator.onended = function cleanTone() {
        disconnect(oscillator);
        disconnect(filter);
        disconnect(envelope);
      };
      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.02);
    }

    function noise(destination, duration, volume, options) {
      if (!context || !destination || !noiseBuffer) return;
      const detail = options || {};
      const startAt = context.currentTime + Math.max(0, detail.delay || 0);
      const stopAt = startAt + Math.max(0.035, duration || 0.1);
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      source.buffer = noiseBuffer;
      source.playbackRate.value = detail.playbackRate || 1;
      filter.type = detail.filterType || "bandpass";
      filter.frequency.value = detail.frequency || 1200;
      filter.Q.value = detail.q || 0.8;
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.linearRampToValueAtTime(Math.max(0.0001, volume), startAt + Math.min(0.025, duration * 0.25));
      envelope.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(destination);
      source.onended = function cleanNoise() {
        disconnect(source);
        disconnect(filter);
        disconnect(envelope);
      };
      source.start(startAt, random() * 0.45, Math.min(noiseBuffer.duration, duration + 0.04));
      source.stop(stopAt + 0.02);
    }

    function metal(destination, baseFrequency, volume, delay) {
      [1, 1.47, 2.12].forEach(function addPartial(multiplier, index) {
        tone(destination, baseFrequency * multiplier, 0.15 + index * 0.04, volume * 0.72 / (index + 1), {
          delay: (delay || 0) + index * 0.004,
          endFrequency: baseFrequency * multiplier * 0.76,
          type: index === 0 ? "triangle" : "sine",
          filterFrequency: 3600,
          attack: 0.024
        });
      });
    }

    function profile() {
      if (scene === "auction") {
        if (auctionRound >= 3) return { level: 0.17, interval: 3.4, pattern: [0, 2, 4, 3], spacing: 0.38 };
        if (auctionRound === 2) return { level: 0.16, interval: 4.2, pattern: [0, 2, 4], spacing: 0.44 };
        return { level: 0.15, interval: 5.1, pattern: [0, 2], spacing: 0.52 };
      }
      const profiles = {
        board: { level: 0.15, interval: 7.2, pattern: [0, 2, 4, 2], spacing: 0.52 },
        detail: { level: 0.13, interval: 7.8, pattern: [0, 2, 3], spacing: 0.58 },
        opening: { level: 0.12, interval: 8.4, pattern: [0, 3, 4], spacing: 0.62 },
        disposition: { level: 0.12, interval: 8.1, pattern: [2, 0, 3], spacing: 0.58 },
        warehouse: { level: 0.1, interval: 9.2, pattern: [0, 2, 4], spacing: 0.66 },
        market: { level: 0.14, interval: 7.5, pattern: [0, 3, 2, 4], spacing: 0.5 },
        collection: { level: 0.15, interval: 7, pattern: [0, 2, 4, 5], spacing: 0.54 }
      };
      return profiles[scene] || profiles.board;
    }

    function updateMusicLevel() {
      if (!context || !musicBus) return;
      const level = settings.music ? profile().level * settings.musicVolume : 0.0001;
      ramp(musicBus.gain, level, scene === "auction" ? 0.12 : 0.42);
    }

    function startAmbience() {
      if (!context || ambience || !settings.music) return;
      // BGM 只播放有明确音高的短句；不再铺持续低频、空气噪声或模拟唱片底噪。
      ambience = { active: true };
      updateMusicLevel();
    }

    function stopAmbience() {
      if (!ambience) return;
      ambience = null;
    }

    function schedulePhrase() {
      const current = profile();
      const pentatonic = [261.63, 293.66, 329.63, 392, 440, 523.25];
      const transpose = random() > 0.76 ? 1.12246 : 1;
      current.pattern.forEach(function playPhraseNote(scaleIndex, index) {
        const frequency = pentatonic[scaleIndex] * transpose;
        const delay = index * current.spacing;
        tone(musicBus, frequency, 1.15, 0.11, {
          delay,
          type: "sine",
          filterFrequency: 2500,
          attack: 0.055
        });
        tone(musicBus, frequency * 2, 0.42, 0.018, {
          delay: delay + 0.018,
          type: "triangle",
          filterFrequency: 3200,
          attack: 0.026
        });
      });
      nextPhraseAt = context.currentTime + current.interval + random() * 1.4;
    }

    function schedulerTick() {
      if (!context || !unlocked || !settings.music || destroyed) return;
      if (globalScope.document && globalScope.document.hidden) return;
      if (!ambience) startAmbience();
      if (context.currentTime >= nextPhraseAt) schedulePhrase();
    }

    function startScheduler() {
      if (scheduler || !globalScope.setInterval) return;
      scheduler = globalScope.setInterval(schedulerTick, 180);
    }

    function stopScheduler() {
      if (!scheduler || !globalScope.clearInterval) return;
      globalScope.clearInterval(scheduler);
      scheduler = null;
    }

    function unlock() {
      if (!ensureContext()) return Promise.resolve(false);
      startScheduler();
      if (settings.music) startAmbience();
      const resume = context.state === "suspended" ? context.resume() : Promise.resolve();
      return Promise.resolve(resume).then(function markUnlocked() {
        unlocked = true;
        nextPhraseAt = context.currentTime + 0.35;
        updateMusicLevel();
        return true;
      }).catch(function ignoreUnlockFailure() {
        return false;
      });
    }

    function setScene(nextScene, detail) {
      scene = nextScene || "board";
      auctionRound = clamp(detail && detail.round ? detail.round : 1, 1, 3);
      if (context) {
        nextPhraseAt = Math.min(nextPhraseAt || context.currentTime, context.currentTime + 0.45);
        updateMusicLevel();
      }
    }

    function playSequence(notes, spacing, volume, options) {
      notes.forEach(function playNote(note, index) {
        tone(effectsBus, note, (options && options.duration) || 0.22, volume, {
          delay: index * spacing,
          type: (options && options.type) || "sine",
          filterFrequency: (options && options.filterFrequency) || 4200
        });
      });
    }

    function playEffect(name, detail) {
      if (!settings.sfx || !ensureContext()) return false;
      const info = detail || {};
      if (context.state === "suspended") context.resume().catch(function ignoreResumeFailure() {});
      const amount = settings.sfxVolume;
      switch (name) {
        case "preview":
          tone(effectsBus, 248, 0.075, 0.12 * amount, { type: "triangle", endFrequency: 185 });
          break;
        case "select":
          metal(effectsBus, 185, 0.24 * amount);
          tone(effectsBus, 92, 0.18, 0.16 * amount, { type: "sine", endFrequency: 71 });
          break;
        case "inspect-documents":
          noise(effectsBus, 0.16, 0.12 * amount, { frequency: 1850, q: 0.45, playbackRate: 1.4 });
          metal(effectsBus, 510, 0.14 * amount, 0.11);
          break;
        case "inspect-weigh":
          tone(effectsBus, 78, 0.32, 0.22 * amount, { type: "sine", endFrequency: 64 });
          playSequence([330, 392], 0.13, 0.1 * amount, { duration: 0.13, type: "triangle" });
          break;
        case "inspect-door":
          noise(effectsBus, 0.24, 0.16 * amount, { frequency: 720, q: 1.1, playbackRate: 0.72 });
          metal(effectsBus, 142, 0.2 * amount, 0.08);
          break;
        case "auction-start":
          tone(effectsBus, 55, 0.38, 0.28 * amount, { type: "sine", endFrequency: 48 });
          metal(effectsBus, 630, 0.16 * amount, 0.04);
          break;
        case "bid-follow":
          metal(effectsBus, 430, 0.18 * amount);
          break;
        case "bid-jump":
          metal(effectsBus, 260, 0.26 * amount);
          tone(effectsBus, 74, 0.27, 0.2 * amount, { type: "sine", endFrequency: 59 });
          break;
        case "bid-fold":
          tone(effectsBus, 196, 0.22, 0.13 * amount, { type: "triangle", endFrequency: 116 });
          break;
        case "auction-win":
          metal(effectsBus, 118, 0.34 * amount);
          playSequence([220, 293.66], 0.15, 0.14 * amount, { duration: 0.26, type: "triangle" });
          break;
        case "auction-lose":
          metal(effectsBus, 118, 0.26 * amount);
          tone(effectsBus, 174.61, 0.3, 0.13 * amount, { delay: 0.13, type: "triangle", endFrequency: 130.81 });
          break;
        case "auction-unsold":
          metal(effectsBus, 105, 0.2 * amount);
          break;
        case "rope-cut":
          noise(effectsBus, 0.15, 0.24 * amount, { frequency: 2450, q: 0.72, playbackRate: 1.7 });
          tone(effectsBus, 560, 0.11, 0.13 * amount, { type: "triangle", endFrequency: 270 });
          break;
        case "veil-open":
          noise(effectsBus, 0.52, 0.15 * amount, { frequency: 930, q: 0.4, playbackRate: 0.78 });
          playSequence([146.83, 220], 0.2, 0.11 * amount, { duration: 0.34, type: "sine" });
          break;
        case "seal-break":
          noise(effectsBus, 0.11, 0.22 * amount, { frequency: 2100, q: 0.8, playbackRate: 1.55 });
          metal(effectsBus, 340, 0.2 * amount, 0.04);
          break;
        case "door-open":
          noise(effectsBus, 0.68, 0.2 * amount, { frequency: 540, q: 0.9, playbackRate: 0.62 });
          tone(effectsBus, 62, 0.58, 0.25 * amount, { type: "sine", endFrequency: 43 });
          metal(effectsBus, 126, 0.25 * amount, 0.42);
          break;
        case "reveal-ordinary":
          playSequence([261.63, 329.63], 0.09, 0.13 * amount, { duration: 0.18, type: "triangle" });
          break;
        case "reveal-collectible": {
          const notes = info.isVehicle
            ? [110, 220, 329.63, 440]
            : info.rarity === "legendary"
              ? [293.66, 369.99, 440, 587.33]
              : info.rarity === "epic"
                ? [293.66, 369.99, 440]
                : [293.66, 369.99];
          playSequence(notes, 0.105, 0.16 * amount, { duration: 0.34, type: "sine", filterFrequency: 5600 });
          metal(effectsBus, info.isVehicle ? 92 : 720, 0.16 * amount, 0.03);
          break;
        }
        case "reveal-fragment": {
          const fragmentNotes = [293.66, 349.23, 440, 523.25];
          const index = clamp(info.motifIndex || 0, 0, fragmentNotes.length - 1);
          tone(effectsBus, fragmentNotes[index], 0.54, 0.2 * amount, { type: "sine", filterFrequency: 3200 });
          tone(effectsBus, fragmentNotes[index] * 2, 0.28, 0.07 * amount, { delay: 0.08, type: "sine", filterFrequency: 4800 });
          break;
        }
        case "reveal-trash":
          noise(effectsBus, 0.18, 0.17 * amount, { frequency: 390, q: 1.2, playbackRate: 0.68 });
          tone(effectsBus, 151, 0.27, 0.18 * amount, { type: "triangle", endFrequency: 72 });
          break;
        case "sell":
          metal(effectsBus, 680, 0.13 * amount);
          playSequence([440, 554.37], 0.075, 0.1 * amount, { duration: 0.14, type: "triangle" });
          break;
        case "store":
          noise(effectsBus, 0.12, 0.09 * amount, { frequency: 820, q: 0.6 });
          metal(effectsBus, 238, 0.17 * amount, 0.05);
          break;
        case "cleanup":
          noise(effectsBus, 0.28, 0.18 * amount, { frequency: 330, q: 0.7, playbackRate: 0.58 });
          metal(effectsBus, 96, 0.22 * amount, 0.09);
          break;
        case "set-complete":
          playSequence([293.66, 349.23, 440, 523.25, 587.33], 0.17, 0.19 * amount, { duration: 0.58, type: "sine", filterFrequency: 5200 });
          break;
        case "expand":
          playSequence([174.61, 220, 261.63], 0.09, 0.13 * amount, { duration: 0.2, type: "triangle" });
          break;
        case "new-day":
          playSequence([220, 293.66, 369.99], 0.14, 0.13 * amount, { duration: 0.34, type: "sine" });
          break;
        case "recovery":
          metal(effectsBus, 180, 0.2 * amount);
          playSequence([196, 246.94], 0.12, 0.11 * amount, { duration: 0.24, type: "triangle" });
          break;
        default:
          tone(effectsBus, 320, 0.06, 0.08 * amount, { type: "triangle", endFrequency: 270 });
      }
      return true;
    }

    function setMusicEnabled(enabled) {
      settings.music = Boolean(enabled);
      persistSettings();
      if (settings.music && context) {
        startAmbience();
        updateMusicLevel();
      } else if (context) {
        ramp(musicBus.gain, 0.0001, 0.12);
        globalScope.setTimeout(function stopMutedAmbience() {
          if (!settings.music) stopAmbience();
        }, 180);
      }
      return settings.music;
    }

    function setEffectsEnabled(enabled) {
      settings.sfx = Boolean(enabled);
      persistSettings();
      if (effectsBus) ramp(effectsBus.gain, settings.sfx ? settings.sfxVolume : 0.0001, 0.06);
      return settings.sfx;
    }

    function getSettings() {
      return { ...settings, supported: Boolean(AudioContextConstructor) };
    }

    function suspend() {
      if (!context || context.state !== "running") return Promise.resolve(false);
      return context.suspend().then(function suspended() { return true; }).catch(function failed() { return false; });
    }

    function resume() {
      if (!context || !unlocked || context.state !== "suspended") return Promise.resolve(false);
      return context.resume().then(function resumed() { return true; }).catch(function failed() { return false; });
    }

    function destroy() {
      destroyed = true;
      stopScheduler();
      stopAmbience();
      if (context && context.state !== "closed") context.close().catch(function ignoreCloseFailure() {});
      context = null;
    }

    if (globalScope.document && typeof globalScope.document.addEventListener === "function") {
      globalScope.document.addEventListener("visibilitychange", function handleVisibility() {
        if (globalScope.document.hidden) suspend();
        else resume();
      });
    }

    return Object.freeze({
      unlock,
      setScene,
      sfx: playEffect,
      getSettings,
      setMusicEnabled,
      setEffectsEnabled,
      toggleMusic: function toggleMusic() { return setMusicEnabled(!settings.music); },
      toggleEffects: function toggleEffects() { return setEffectsEnabled(!settings.sfx); },
      suspend,
      resume,
      destroy,
      isSupported: function isSupported() { return Boolean(AudioContextConstructor); }
    });
  }

  const api = Object.freeze({ create: createAudioEngine });
  globalScope.PortAudio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
