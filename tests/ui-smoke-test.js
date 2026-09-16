"use strict";

class FakeClassList {
  constructor() { this.values = new Set(); }
  toggle(name, force) {
    if (force === undefined ? !this.values.has(name) : force) this.values.add(name);
    else this.values.delete(name);
  }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
  contains(name) { return this.values.has(name); }
}

class FakeStyle {
  setProperty() {}
}

class FakeElement {
  constructor(id) {
    this.id = id;
    this.innerHTML = "";
    this.textContent = "";
    this.hidden = false;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.style = new FakeStyle();
    this.listeners = {};
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  querySelector() { return null; }
}

const ids = [
  "app", "viewRoot", "cashStat", "warehouseStat", "heatStat", "liveMessage", "viewerCount",
  "bottomNav", "toast", "modalRoot", "boardView", "detailView", "auctionView", "openingView",
  "dispositionView", "warehouseView", "marketView", "collectionView"
];
const byId = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
const viewIds = ["boardView", "detailView", "auctionView", "openingView", "dispositionView", "warehouseView", "marketView", "collectionView"];
const navButtons = ["board", "warehouse", "market", "collection"].map((tab) => {
  const element = new FakeElement(`nav-${tab}`);
  element.dataset.tab = tab;
  return element;
});

global.document = {
  querySelector(selector) {
    if (selector.startsWith("#")) return byId[selector.slice(1)] || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === ".game-view") return viewIds.map((id) => byId[id]);
    if (selector === ".nav-button") return navButtons;
    return [];
  }
};

const memory = new Map();
global.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, value); },
  removeItem(key) { memory.delete(key); }
};

global.window = global;
global.window.scrollTo = () => {};
global.window.addEventListener = () => {};
global.window.location = { reload() {} };
global.CargoDailyGenerator = require("../src/core/daily-generator.js");
global.CargoGameEngine = require("../src/core/game-engine.js");

require("../app.js");

function clickRoot(dataset) {
  const target = { dataset, closest() { return this; } };
  byId.viewRoot.listeners.click({ target });
}

function clickNav(tab) {
  const target = { dataset: { tab }, closest() { return this; } };
  byId.bottomNav.listeners.click({ target });
}

function clickModal(action) {
  const target = { dataset: { modalAction: action }, closest() { return this; } };
  byId.modalRoot.listeners.click({ target });
}

if (!byId.boardView.innerHTML.includes("今日货柜")) throw new Error("board did not render");
if (!byId.boardView.innerHTML.includes("进入下一天")) throw new Error("next day entry did not render");

const beforeDay = JSON.parse(memory.get("port-auction-game-save-v2")).dateKey;
clickRoot({ action: "advance-day" });
if (!byId.modalRoot.innerHTML.includes("确认提前结束今天")) throw new Error("early close confirmation did not render");
clickModal("advance-day");
const afterDay = JSON.parse(memory.get("port-auction-game-save-v2")).dateKey;
if (afterDay <= beforeDay) throw new Error("next day did not advance after player confirmation");

clickNav("warehouse");
if (!byId.warehouseView.innerHTML.includes("港边仓库")) throw new Error("warehouse did not render");
clickNav("market");
if (!byId.marketView.innerHTML.includes("每日交易摊")) throw new Error("market did not render");
clickNav("collection");
if (!byId.collectionView.innerHTML.includes("港口藏品册")) throw new Error("collection did not render");
clickNav("board");

const match = byId.boardView.innerHTML.match(/data-action="select-container" data-id="([^"]+)"/);
if (!match) throw new Error("no selectable container");
clickRoot({ action: "select-container", id: match[1] });

if (byId.detailView.innerHTML.includes("data-action=\"inspect\"")) {
  const inspect = byId.detailView.innerHTML.match(/data-action="inspect" data-inspection="([^"]+)"/);
  clickRoot({ action: "inspect", inspection: inspect[1] });
}

if (byId.detailView.innerHTML.includes("data-action=\"start-auction\"")) {
  clickRoot({ action: "start-auction" });
  clickRoot({ action: "bid", bid: "fold" });
  if (byId.openingView.innerHTML.includes("data-role=\"security-seal\"")) {
    throw new Error("spectator result incorrectly shows an opening interaction");
  }
  if (!byId.openingView.innerHTML.includes("SPECTATOR RESULT")) {
    throw new Error("spectator result did not render directly");
  }
}

if (!memory.has("port-auction-game-save-v2")) throw new Error("save was not written");
console.log("ui smoke ok");
