"use strict";

const assert = require("node:assert/strict");
const generator = require("../src/core/daily-generator.js");
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
  if (!selected.isFog && game.getView().phase === "inspection") game.inspect("door");
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
game.selectContainer(regular.id);
assert.equal(game.getView().phase, "decision", "返回后再次进入同一柜必须保留已完成的检查");
assert.equal(game.getView().selection.inspectionChoice, "documents");
assert.equal(game.getView().selection.inspectionResult.action, "documents");
assert.throws(() => game.inspect("weigh"), /当前阶段|只能/);
game.cancelSelection();

winSelectedContainer(game, regular.id);
view = game.getView();
const purchasePrice = view.containers.find((container) => container.id === regular.id).result.price;
assert.ok(purchasePrice > 0);
assert.equal(view.pendingItems.length, 3);
const cashAfterPurchase = view.player.cash;
const firstSlots = view.pendingItems[0].item.storageSlots || 1;
const thirdSlots = view.pendingItems[2].item.storageSlots || 1;

game.disposeItem(0, "store");
assert.equal(game.getView().warehouse.used, firstSlots);
game.disposeItem(1, "sell");
game.disposeItem(2, "store");
view = game.getView();
assert.equal(view.phase, "board");
assert.equal(view.warehouse.used, firstSlots + thirdSlots);
assert.notEqual(view.player.cash, cashAfterPurchase);

const saved = game.exportSave();
const restored = createGame({ savedState: saved });
assert.deepEqual(restored.getView(), game.getView(), "导出再载入必须保持全部可见状态");

const beforeRent = restored.getView().player.cash;
restored.rentWarehouseExpansion();
view = restored.getView();
assert.equal(view.warehouse.activeCapacity, 60);
assert.equal(view.player.cash, beforeRent - 500);
restored.rentWarehouseExpansion();
view = restored.getView();
assert.equal(view.warehouse.activeCapacity, 70);
assert.equal(view.player.cash, beforeRent - 1300, "同月升级只补仓租差额");

const firstLot = view.warehouse.lots[0];
const usedBeforeSale = view.warehouse.used;
const beforeSale = view.player.cash;
restored.sellWarehouseLot(firstLot.lotId, "stall");
assert.equal(restored.getView().warehouse.used, usedBeforeSale - firstLot.storageSlots);
assert.notEqual(restored.getView().player.cash, beforeSale);

const legacyInspectionState = createGame({
  dateKey: "2026-09-20",
  saveSeed: "legacy-inspection-save",
  initialCash: 6000,
  npcStates: npcStatesWithCash(0)
});
const legacyInspectionContainer = legacyInspectionState.getView().containers.find((container) => !container.isFog);
legacyInspectionState.selectContainer(legacyInspectionContainer.id);
legacyInspectionState.inspect("documents");
const saveWithoutInspectionMap = legacyInspectionState.exportSave();
delete saveWithoutInspectionMap.containerInspections;
const migratedInspectionGame = createGame({ savedState: saveWithoutInspectionMap });
migratedInspectionGame.cancelSelection();
migratedInspectionGame.selectContainer(legacyInspectionContainer.id);
assert.equal(migratedInspectionGame.getView().phase, "decision", "旧存档迁移后仍须保留已完成检查");
assert.equal(migratedInspectionGame.getView().selection.inspectionChoice, "documents");
migratedInspectionGame.cancelSelection();
migratedInspectionGame.advanceDay("2026-09-21");
const nextDayRegular = migratedInspectionGame.getView().containers.find((container) => !container.isFog);
migratedInspectionGame.selectContainer(nextDayRegular.id);
assert.equal(migratedInspectionGame.getView().phase, "inspection", "进入新一天后必须清空昨日检查锁");

const beforeNewMonth = restored.getView();
restored.advanceDay("2026-10-01");
view = restored.getView();
assert.equal(view.dateKey, "2026-10-01");
assert.notDeepEqual(view.containers, beforeNewMonth.containers, "跨日后必须生成新的五柜");
assert.equal(view.warehouse.activeCapacity, 70);
assert.equal(view.player.cash, beforeNewMonth.player.cash - 1300, "跨月自动扣除当前容量仓租");
const sameDayBoard = view.containers;
restored.advanceDay("2026-10-01");
assert.deepEqual(restored.getView().containers, sameDayBoard, "同日不得重复刷新");

const marketState = createGame({
  generator,
  dateKey: "2026-09-15",
  saveSeed: "warehouse-market-regression",
  initialCash: 6000
}).exportSave();
marketState.warehouse.lots.push(
  {
    lotId: "L-market-ordinary",
    name: "行情普通货",
    type: "ordinary",
    category: "商用库存",
    condition: "良好",
    count: 1,
    storageSlots: 1,
    neutralValue: 1000,
    originalQuickValue: 1000,
    handlingFee: 0,
    storedDate: marketState.dateKey
  },
  {
    lotId: "L-market-collectible",
    name: "行情高级货",
    type: "collectible",
    category: "奢侈配饰",
    condition: "真品",
    count: 1,
    storageSlots: 1,
    neutralValue: 10000,
    originalQuickValue: 9000,
    handlingFee: 0,
    storedDate: marketState.dateKey
  }
);
const marketGame = createGame({ generator, savedState: marketState });
const marketBefore = marketGame.getView();
const ordinaryBefore = marketBefore.warehouse.lots.find((lot) => lot.lotId === "L-market-ordinary");
const collectibleBefore = marketBefore.warehouse.lots.find((lot) => lot.lotId === "L-market-collectible");
assert.equal(ordinaryBefore.stallValue, Math.round((1000 * ordinaryBefore.marketMultiplier) / 10) * 10);
assert.equal(collectibleBefore.stallValue, Math.round((10000 * 0.9 * collectibleBefore.marketMultiplier) / 10) * 10);

let changedDate = null;
for (let day = 16; day <= 30; day += 1) {
  const candidateDate = `2026-09-${day}`;
  const candidateMarket = generator.createDailyBoard({
    dateKey: candidateDate,
    saveSeed: marketState.saveSeed,
    totalAssets: 17000
  }).market.multipliers;
  if (candidateMarket["商用库存"] !== ordinaryBefore.marketMultiplier
    && candidateMarket["奢侈配饰"] !== collectibleBefore.marketMultiplier) {
    changedDate = candidateDate;
    break;
  }
}
assert.ok(changedDate, "测试日期范围内必须能找到两个库存品类同时波动的一天");
marketGame.advanceDay(changedDate);
const marketAfter = marketGame.getView();
const ordinaryAfter = marketAfter.warehouse.lots.find((lot) => lot.lotId === "L-market-ordinary");
const collectibleAfter = marketAfter.warehouse.lots.find((lot) => lot.lotId === "L-market-collectible");
assert.notEqual(ordinaryAfter.marketMultiplier, ordinaryBefore.marketMultiplier, "普通库存跨日后必须读取新行情");
assert.notEqual(ordinaryAfter.stallValue, ordinaryBefore.stallValue, "普通库存报价必须随跨日行情变化");
assert.notEqual(collectibleAfter.marketMultiplier, collectibleBefore.marketMultiplier, "高级货品跨日后必须读取新行情");
assert.notEqual(collectibleAfter.stallValue, collectibleBefore.stallValue, "高级货品报价必须随跨日行情变化");
const cashBeforeMarketSale = marketAfter.player.cash;
marketGame.sellWarehouseLot(collectibleAfter.lotId, "stall");
assert.equal(
  marketGame.getView().player.cash,
  cashBeforeMarketSale + collectibleAfter.stallValue,
  "高级货品出售必须按刷新后的当日行情结算"
);

const legacyMarketState = createGame({
  generator,
  dateKey: "2026-09-15",
  saveSeed: "legacy-market-backfill",
  initialCash: 6000
}).exportSave();
const legacyOrdinaryMarket = { ...legacyMarketState.board.market.multipliers };
for (const category of ["奢侈配饰", "高级时装", "专业设备", "珠宝艺术", "车辆大奖", "复古收藏"]) {
  delete legacyMarketState.board.market.multipliers[category];
}
const migratedMarketGame = createGame({ generator, savedState: legacyMarketState });
const migratedMarket = migratedMarketGame.getView().market.multipliers;
assert.equal(Object.keys(migratedMarket).length, 12, "旧存档载入时必须补齐高级货品行情");
for (const category of ["商用库存", "影像器材", "工坊器材", "航海用品", "演出器材", "文体库存"]) {
  assert.equal(migratedMarket[category], legacyOrdinaryMarket[category], "旧存档原有普通货行情不得被重抽");
}
for (const category of ["奢侈配饰", "高级时装", "专业设备", "珠宝艺术", "车辆大奖", "复古收藏"]) {
  assert.ok(Number.isFinite(migratedMarket[category]), `旧存档必须补齐 ${category} 行情`);
}

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
    "一次检查限制与返回防绕过",
    "旧存档检查迁移与跨日重置",
    "三轮拍卖",
    "玩家胜出与扣款",
    "旁观开柜",
    "逐件售卖或入库",
    "大件多仓位占用",
    "仓库租赁差额",
    "跨月仓租",
    "仓库出售",
    "普通库存与高级货品跨日行情联动",
    "旧存档高级货品行情补齐",
    "软破产委托",
    "隔日刷新",
    "存档恢复"
  ],
  firstPurchasePrice: purchasePrice,
  restoredCash: restored.getView().player.cash,
  restoredWarehouseUsed: restored.getView().warehouse.used
}, null, 2));
