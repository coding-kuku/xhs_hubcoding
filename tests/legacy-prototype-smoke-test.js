'use strict';

const assert = require('node:assert/strict');

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }

  toggle(value, force) {
    if (force === true) this.values.add(value);
    else if (force === false) this.values.delete(value);
    else if (this.values.has(value)) this.values.delete(value);
    else this.values.add(value);
  }
}

class ElementStub {
  constructor(id = '') {
    this.id = id;
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.children = [];
    this.handlers = new Map();
    this.classList = new ClassList();
    this.nested = new Map();
  }

  addEventListener(type, handler) {
    this.handlers.set(type, handler);
  }

  click() {
    if (this.disabled) return;
    const handler = this.handlers.get('click');
    if (handler) handler({ preventDefault() {} });
  }

  querySelector(selector) {
    if (!this.nested.has(selector)) this.nested.set(selector, new ElementStub());
    return this.nested.get(selector);
  }

  replaceChildren() {
    this.children = [];
  }

  append(child) {
    this.children.push(child);
  }

  setPointerCapture() {}
}

const ids = [
  'money-stat', 'heat-stat', 'collection-stat', 'start-button', 'container-name',
  'container-code', 'opening-bid-chip', 'manifest-text', 'inspection-actions',
  'inspection-result', 'enter-auction-button', 'round-title', 'current-price',
  'current-leader', 'npc-row', 'auction-log', 'follow-button', 'follow-price',
  'jump-button', 'jump-price', 'fold-button', 'opening-kicker', 'opening-title',
  'winning-price-chip', 'opening-stage', 'door-container', 'seal-handle', 'drag-hint',
  'reveal-area', 'loot-stack', 'reveal-button', 'featured-item-card', 'bulk-summary',
  'sell-button', 'collect-button', 'result-kicker', 'result-title', 'result-equation',
  'result-story', 'result-tags', 'retry-button', 'back-button', 'live-message'
];

const byId = new Map(ids.map((id) => [id, new ElementStub(id)]));
const screenIds = ['intro-screen', 'inspect-screen', 'auction-screen', 'opening-screen', 'decision-screen', 'result-screen'];
const screens = screenIds.map((id) => new ElementStub(id));
const dots = [new ElementStub(), new ElementStub(), new ElementStub()];
const storage = new Map();

global.document = {
  querySelector(selector) {
    return byId.get(selector.slice(1));
  },
  querySelectorAll(selector) {
    if (selector === '.screen') return screens;
    if (selector === '.round-dots span') return dots;
    return [];
  },
  createElement() {
    return new ElementStub();
  }
};

global.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, value);
  }
};

global.window = {
  scrollTo() {},
  setTimeout(callback) {
    callback();
    return 1;
  }
};

Math.random = () => 0.1;

require('../prototypes/archive/port-auction-core-v1/app.js');

function playWinningCabinet() {
  byId.get('start-button').click();
  assert.equal(byId.get('inspection-actions').children.length, 2);
  byId.get('inspection-actions').children[0].click();
  byId.get('enter-auction-button').click();
  byId.get('follow-button').click();
  if (screens.find((screen) => screen.id === 'auction-screen').classList.contains('is-active')) {
    byId.get('follow-button').click();
  }
  if (screens.find((screen) => screen.id === 'auction-screen').classList.contains('is-active')) {
    byId.get('follow-button').click();
  }
  assert.equal(screens.find((screen) => screen.id === 'opening-screen').classList.contains('is-active'), true);
  byId.get('seal-handle').click();
  byId.get('reveal-button').click();
  byId.get('reveal-button').click();
  byId.get('reveal-button').click();
  byId.get('reveal-button').click();
  assert.equal(screens.find((screen) => screen.id === 'decision-screen').classList.contains('is-active'), true);
}

playWinningCabinet();
assert.equal(byId.get('sell-button').disabled, false);
byId.get('sell-button').click();
const moneyAfterSettlement = byId.get('money-stat').textContent;
byId.get('sell-button').click();
assert.equal(byId.get('money-stat').textContent, moneyAfterSettlement);

byId.get('retry-button').click();
byId.get('inspection-actions').children[0].click();
byId.get('enter-auction-button').click();
byId.get('follow-button').click();
byId.get('seal-handle').click();
byId.get('reveal-button').click();
byId.get('reveal-button').click();
byId.get('reveal-button').click();
byId.get('reveal-button').click();
assert.equal(byId.get('sell-button').disabled, false);

process.stdout.write('Smoke test passed: two rounds, result idempotence, and button reset.\n');
