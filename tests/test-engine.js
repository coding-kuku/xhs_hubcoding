"use strict";

const assert = require("node:assert/strict");
require("../src/core/daily-generator.js");
const { createGame } = require("../src/core/game-engine.js");

function npcStatesWithCash(cash) {
  return Object.fromEntries(["zhao", "qiao", "ayong", "luo", "tang"].map((id) => [id, { cash }]));
}

function revealEverything(game) {
  while (game.getView().phase === "reveal") game.revealNext();
}

function winSelectedContainer(game, containerId) {
  game.selectContainer(containerId);
  const selected = game.getView().containers.find((container) => container.id === containerId);
  if (!selected.isFog) game.inspect("door");
  game.startAuction();
  while (game.getView().phase === "auction") game.auctionAction("follow");
  assert.equal(game.getView().reveal.winnerType, "player");
  revealEverything(game);
  assert.equal(game.getView().phase, "disposition");
}

const game = createGame({
  dateKey: "2026-09-15",
  saveSeed: "engine-test",
  initialCash: 100000,
  npcStates: npcStatesWithCash(0)
});

let view = game.getView();
assert.equal(view.phase, "board");
assert.equal(view.containers.length, 5);
assert.equal(view.player.cash, 100000);
assert.equal(view.containers[0].trueState, undefined, "界面状态不能泄露真实货物");
assert.equal(view.containers[0].npcEstimates, undefined, "界面状态不能泄露 NPC 私有上限");

const regular = view.containers.find((container) => !container.isFog);
game.selectContainer(regular.id);
assert.equal(game.getView().phase, "inspection");
assert.throws(() => game.startAuction(), /当前阶段|检查/);
const clue = game.inspect("documents");
assert.equal(clue.action, "documents");
assert.equal(game.getView().phase, "decision");
assert.throws(() => game.inspect("weigh"), /当前阶段|只能/);
game.cancelSelection();

winSelectedContainer(game, regular.id);
view = game.getView();
const purchasePrice = view.containers.find((container) => container.id === regular.id).result.price;
assert.ok(purchasePrice > 0);
assert.equal(view.pendingItems.length, 3);
const cashAfterPurchase = view.player.cash;

game.disposeItem(0, "store");
assert.equal(game.getView().warehouse.used, 1);
game.disposeItem(1, "sell");
game.disposeItem(2, "store");
view = game.getView();
assert.equal(view.phase, "board");
assert.equal(view.warehouse.used, 2);
assert.notEqual(view.player.cash, cashAfterPurchase);

const saved = game.exportSave();
const restored = createGame({ savedState: saved });
assert.deepEqual(restored.getView(), game.getView(), "导出再载入必须保持全部可见状态");

const beforeRent = restored.getView().player.cash;
restored.rentWarehouseExpansion();
view = restored.getView();
assert.equal(view.warehouse.activeCapacity, 40);
assert.equal(view.player.cash, beforeRent - 500);
restored.rentWarehouseExpansion();
view = restored.getView();
assert.equal(view.warehouse.activeCapacity, 50);
assert.equal(view.player.cash, beforeRent - 1300, "同月升级只补仓租差额");

const firstLot = view.warehouse.lots[0];
const beforeSale = view.player.cash;
restored.sellWarehouseLot(firstLot.lotId, "stall");
assert.equal(restored.getView().warehouse.used, 1);
assert.notEqual(restored.getView().player.cash, beforeSale);

const beforeNewMonth = restored.getView();
restored.advanceDay("2026-10-01");
view = restored.getView();
assert.equal(view.dateKey, "2026-10-01");
assert.notEqual(view.containers[0].id + view.containers[0].public.exterior.id, beforeNewMonth.containers[0].id + beforeNewMonth.containers[0].public.exterior.id);
assert.equal(view.warehouse.activeCapacity, 50);
assert.equal(view.player.cash, beforeNewMonth.player.cash - 1300, "跨月自动扣除当前容量仓租");
const sameDayBoard = view.containers;
restored.advanceDay("2026-10-01");
assert.deepEqual(restored.getView().containers, sameDayBoard, "同日不得重复刷新");

const losingGame = createGame({
  dateKey: "2026-09-16",
  saveSeed: "engine-loss-test",
  initialCash: 6000,
  npcStates: npcStatesWithCash(50000)
});
const losingContainer = losingGame.getView().containers.find((container) => !container.isFog);
losingGame.selectContainer(losingContainer.id);
losingGame.inspect("weigh");
losingGame.startAuction();
losingGame.auctionAction("fold");
assert.ok(["npc", "unsold"].includes(losingGame.getView().reveal.winnerType));
if (losingGame.getView().phase === "reveal") losingGame.skipSpectatorReveal();
assert.equal(losingGame.getView().phase, "spectatorResult");
losingGame.returnToBoard();
assert.equal(losingGame.getView().phase, "board");

const auctionGame = createGame({
  dateKey: "2026-09-17",
  saveSeed: "three-round-test",
  initialCash: 100000,
  npcStates: npcStatesWithCash(0)
});
const auctionContainer = auctionGame.getView().containers.find((container) => !container.isFog);
auctionGame.selectContainer(auctionContainer.id);
auctionGame.inspect("door");
auctionGame.startAuction();
assert.equal(auctionGame.getView().auction.round, 1);
auctionGame.auctionAction("follow");
assert.equal(auctionGame.getView().auction.round, 2);
auctionGame.auctionAction("follow");
assert.equal(auctionGame.getView().auction.round, 3);
auctionGame.auctionAction("follow");
assert.equal(auctionGame.getView().phase, "reveal");

const recoveryGame = createGame({
  dateKey: "2026-09-18",
  saveSeed: "recovery-test",
  initialCash: 0,
  npcStates: npcStatesWithCash(0)
});
const minimumStart = Math.min(...recoveryGame.getView().containers.map((container) => container.startingBid));
assert.ok(recoveryGame.getView().player.cash < minimumStart);
recoveryGame.claimRecoveryJob();
assert.ok(recoveryGame.getView().player.cash >= 1400);
assert.throws(() => recoveryGame.claimRecoveryJob(), /今日已经/);

console.log(JSON.stringify({
  passed: true,
  tested: [
    "公开状态隔离",
    "一次检查限制",
    "三轮拍卖",
    "玩家胜出与扣款",
    "旁观开柜",
    "逐件售卖或入库",
    "仓库租赁差额",
    "跨月仓租",
    "仓库出售",
    "软破产委托",
    "隔日刷新",
    "存档恢复"
  ],
  firstPurchasePrice: purchasePrice,
  restoredCash: restored.getView().player.cash,
  restoredWarehouseUsed: restored.getView().warehouse.used
}, null, 2));
