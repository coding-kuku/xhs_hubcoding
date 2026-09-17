"use strict";

const assert = require("node:assert/strict");

const memory = new Map();
const storage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, value); }
};

delete global.AudioContext;
delete global.webkitAudioContext;
const PortAudio = require("../src/audio/audio-engine.js");
class FakeParam {
  constructor(value) { this.value = value || 0; }
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeNode {
  connect() { return this; }
  disconnect() {}
}

class FakeSource extends FakeNode {
  constructor() {
    super();
    this.frequency = new FakeParam(440);
    this.detune = new FakeParam(0);
    this.playbackRate = new FakeParam(1);
    this.onended = null;
  }
  start() {}
  stop() { if (this.onended) this.onended(); }
}

class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.destination = new FakeNode();
    this.oscillatorCount = 0;
    FakeAudioContext.latest = this;
  }
  createGain() { const node = new FakeNode(); node.gain = new FakeParam(1); return node; }
  createOscillator() { this.oscillatorCount += 1; return new FakeSource(); }
  createBufferSource() { return new FakeSource(); }
  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeParam(1000);
    node.Q = new FakeParam(1);
    return node;
  }
  createDynamicsCompressor() {
    const node = new FakeNode();
    node.threshold = new FakeParam();
    node.knee = new FakeParam();
    node.ratio = new FakeParam();
    node.attack = new FakeParam();
    node.release = new FakeParam();
    return node;
  }
  createBuffer(channels, length, sampleRate) {
    const samples = new Float32Array(length);
    return { duration: length / sampleRate, getChannelData() { return samples; } };
  }
  resume() { this.state = "running"; return Promise.resolve(); }
  suspend() { this.state = "suspended"; return Promise.resolve(); }
  close() { this.state = "closed"; return Promise.resolve(); }
}

(async function run() {
  const audio = PortAudio.create({ storage });
  assert.equal(audio.isSupported(), false);
  assert.deepEqual(audio.getSettings(), {
    music: true,
    sfx: true,
    musicVolume: 0.42,
    sfxVolume: 0.72,
    supported: false
  });
  assert.equal(audio.sfx("preview"), false);
  assert.equal(audio.toggleMusic(), false);
  assert.equal(audio.toggleEffects(), false);
  assert.equal(JSON.parse(memory.get("port-auction-audio-v1")).music, false);
  assert.equal(JSON.parse(memory.get("port-auction-audio-v1")).sfx, false);
  audio.setScene("auction", { round: 3 });
  audio.destroy();

  memory.clear();
  global.AudioContext = FakeAudioContext;
  const synthesized = PortAudio.create({ storage });
  assert.equal(synthesized.isSupported(), true);
  assert.equal(await synthesized.unlock(), true);
  FakeAudioContext.latest.currentTime = 1;
  await new Promise((resolve) => setTimeout(resolve, 220));
  assert.ok(FakeAudioContext.latest.oscillatorCount >= 80, "harbor morning BGM should schedule its full arrangement");
  synthesized.setScene("auction", { round: 3 });
  const effects = [
    ["preview"],
    ["select"],
    ["inspect-documents"],
    ["inspect-weigh"],
    ["inspect-door"],
    ["auction-start"],
    ["bid-follow"],
    ["bid-jump"],
    ["bid-fold"],
    ["auction-win"],
    ["auction-lose"],
    ["auction-unsold"],
    ["rope-cut"],
    ["veil-open"],
    ["seal-break"],
    ["door-open"],
    ["reveal-ordinary"],
    ["reveal-collectible", { rarity: "epic" }],
    ["reveal-collectible", { rarity: "legendary" }],
    ["reveal-collectible", { isVehicle: true }],
    ["reveal-fragment", { motifIndex: 3 }],
    ["reveal-trash"],
    ["sell"],
    ["store"],
    ["cleanup"],
    ["set-complete"],
    ["expand"],
    ["new-day"],
    ["recovery"]
  ];
  for (const [name, detail] of effects) {
    assert.equal(synthesized.sfx(name, detail), true, `${name} should synthesize`);
  }
  assert.equal(await synthesized.suspend(), true);
  assert.equal(await synthesized.resume(), true);
  synthesized.destroy();

  console.log("audio engine synthesis and fallback ok");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
