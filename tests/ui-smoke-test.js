"use strict";

const fs = require("node:fs");
const path = require("node:path");

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
if (!navButtons.find((button) => button.dataset.tab === "market").classList.contains("is-active")) {
  throw new Error("market navigation did not become active");
}
if (byId.marketView.innerHTML.includes("波动范围")) throw new Error("market exposed the hidden fluctuation range");
if (!byId.marketView.innerHTML.includes('class="market-summary"')) throw new Error("compact market summary did not render");
if (!byId.marketView.innerHTML.includes("领涨") || !byId.marketView.innerHTML.includes("领跌")) {
  throw new Error("market extremes did not render");
}
const marketCounts = byId.marketView.innerHTML.match(/is-up">(\d+)涨<\/b><i>·<\/i><b class="is-down">(\d+)跌<\/b><i>·<\/i><b>(\d+)平<\/b>/);
if (!marketCounts || marketCounts.slice(1).map(Number).reduce((sum, count) => sum + count, 0) !== 6) {
  throw new Error("market trend counts did not cover all six categories");
}
if (byId.marketView.innerHTML.includes("market-grid")) throw new Error("retired market card grid still rendered");
clickNav("collection");
if (!byId.collectionView.innerHTML.includes("港口藏品册")) throw new Error("collection did not render");
clickNav("board");

const match = byId.boardView.innerHTML.match(/data-action="select-container" data-id="([^"]+)"/);
if (!match) throw new Error("no selectable container");
clickRoot({ action: "select-container", id: match[1] });

if (byId.detailView.innerHTML.includes("data-action=\"inspect\"")) {
  if (!byId.detailView.innerHTML.includes("is-recommended")) throw new Error("first inspection hint was not shown");
  const inspect = byId.detailView.innerHTML.match(/data-action="inspect" data-inspection="([^"]+)"/);
  clickRoot({ action: "inspect", inspection: inspect[1] });
  const meta = JSON.parse(memory.get("port-auction-game-meta-v2"));
  if (!meta.inspectionHintSeen) throw new Error("inspection hint completion was not saved");
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
  clickRoot({ action: "return-board" });
  const previews = [...byId.boardView.innerHTML.matchAll(/data-action="preview-container" data-id="([^"]+)"/g)];
  const nextPreview = previews.find((entry) => entry[1] !== match[1]);
  if (!nextPreview) throw new Error("no second container available for hint regression check");
  clickRoot({ action: "preview-container", id: nextPreview[1] });
  const nextMatch = byId.boardView.innerHTML.match(/data-action="select-container" data-id="([^"]+)"/);
  if (!nextMatch) throw new Error("second container was not selectable");
  clickRoot({ action: "select-container", id: nextMatch[1] });
  if (byId.detailView.innerHTML.includes("is-recommended")) throw new Error("inspection hint repeated after the first use");
}

if (!memory.has("port-auction-game-save-v2")) throw new Error("save was not written");
const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
if (!appSource.includes('data-action="open-directly" hidden')) throw new Error("opening fallback control is missing");
if (!appSource.includes('action === "open-directly"')) throw new Error("opening fallback action is missing");
if (!appSource.includes("window.setTimeout(show, 3000)")) throw new Error("opening fallback timeout is missing");
if (!appSource.includes('item.isVehicle && item.rarity === "legendary"')) throw new Error("vehicle prize badge is not rarity-gated");
if (!appSource.includes('class="market-lot-card')) throw new Error("compact market inventory row is missing");
if (!appSource.includes('class="market-lot-actions"')) throw new Error("side-aligned market sell actions are missing");
console.log("ui smoke ok");
