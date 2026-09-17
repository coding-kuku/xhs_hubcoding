"use strict";

const assert = require("node:assert/strict");
const generator = require("../src/core/daily-generator.js");
const engine = require("../src/core/game-engine.js");

assert.equal(generator.VERSION, "1.2.0");
assert.equal(engine.VERSION, "1.1.0");

const modernNames = new Set();
for (let day = 1; day <= 45; day += 1) {
  const dateKey = `2026-10-${String((day - 1) % 28 + 1).padStart(2, "0")}`;
  const board = generator.createDailyBoard({ dateKey, saveSeed: `mechanism-${day}`, totalAssets: 42000 });
  assert.equal(board.market.featuredCategories.length, 6);
  for (const multiplier of Object.values(board.market.multipliers)) {
    assert.ok(multiplier >= 0.7 && multiplier <= 1.2, `market multiplier out of range: ${multiplier}`);
  }
  for (const container of board.containers) {
    for (const item of container.trueState.layers) {
      if (item.type === "collectible") {
        modernNames.add(item.name);
        assert.ok(item.visualId, `${item.name} has no visual`);
        assert.ok(item.assessment, `${item.name} has no assessment`);
        assert.ok(item.storageSlots >= 1, `${item.name} has no storage cost`);
        if (item.isVehicle && item.condition === "报废") {
          assert.equal(item.rarity, "junk", "报废车辆不能标记为传奇大奖");
        }
        if (item.isVehicle && item.rarity === "legendary") {
          assert.equal(item.condition, "完整", "只有完整车辆可以标记为传奇大奖");
        }
      }
    }
  }
}

assert.ok(modernNames.has("瑞士陀飞轮腕表"), "modern luxury pool did not appear");
assert.ok(modernNames.has("数字电影摄影机"), "premium equipment pool did not appear");
assert.ok(!modernNames.has("机械打字机"), "retired antique pool still appears");

const vehicleRaritiesByCondition = new Map();
for (let sample = 0; sample < 1200; sample += 1) {
  const board = generator.createDailyBoard({
    dateKey: "2026-12-08",
    saveSeed: `vehicle-rarity-${sample}`,
    totalAssets: 42000
  });
  for (const container of board.containers) {
    for (const item of container.trueState.layers) {
      if (item.isVehicle) vehicleRaritiesByCondition.set(item.condition, item.rarity);
    }
  }
}
assert.equal(vehicleRaritiesByCondition.get("报废"), "junk", "报废车辆必须降为垃圾级");
assert.equal(vehicleRaritiesByCondition.get("完整"), "legendary", "完整车辆才允许标记为传奇大奖");

function pendingVehicleState() {
  const game = engine.createGame({ generator, dateKey: "2026-11-03", saveSeed: "vehicle-store", initialCash: 6000 });
  const state = game.exportSave();
  state.phase = "disposition";
  state.selectedContainerId = "C1";
  state.pendingItems = [{
    resolved: false,
    action: null,
    item: {
      layer: 1,
      type: "collectible",
      name: "高性能中置跑车",
      category: "车辆大奖",
      visualId: "premium-7",
      rarity: "legendary",
      riskProfile: "vehicle",
      assessment: "车况良好，手续可以补齐",
      condition: "良好",
      storageSlots: 10,
      quantity: "1 辆",
      neutralValue: 12000,
      quickValue: 9200,
      handlingFee: 800,
      cleanupFee: 0,
      tags: ["vehicle", "luxury", "heavy"]
    }
  }];
  return state;
}

const storedGame = engine.createGame({ generator, savedState: pendingVehicleState() });
storedGame.disposeItem(0, "store");
const storedView = storedGame.getView();
assert.equal(storedView.warehouse.activeCapacity, 50);
assert.equal(storedView.warehouse.used, 10);
assert.equal(storedView.warehouse.lots[0].storageSlots, 10);
const expectedStall = Math.round((12000 * 0.9 - 800) / 10) * 10;
assert.equal(storedView.warehouse.lots[0].stallValue, expectedStall);
assert.equal(storedView.warehouse.lots[0].handlingFee, 800, "车辆入库后必须保留运输处置费");
assert.equal(storedView.player.totalAssets, 17200, "总资产必须扣除尚未支付的车辆运输处置费");

const merchantVehicleState = pendingVehicleState();
merchantVehicleState.board.merchant = {
  id: "M-vehicle-test",
  title: "车辆定向买家",
  targetType: "collectible",
  targetCategory: "车辆大奖",
  premium: 1.2,
  maxLots: 1
};
const merchantVehicleGame = engine.createGame({ generator, savedState: merchantVehicleState });
merchantVehicleGame.disposeItem(0, "store");
const merchantVehicleLot = merchantVehicleGame.getView().warehouse.lots[0];
const merchantGross = Math.round((12000 * 0.9) / 10) * 10;
const expectedMerchantValue = Math.round((merchantGross * 1.2 - 800) / 10) * 10;
merchantVehicleGame.sellWarehouseLot(merchantVehicleLot.lotId, "merchant");
assert.equal(merchantVehicleGame.getView().player.cash, 6000 + expectedMerchantValue, "商户溢价后仍须完整扣除车辆运输处置费");

const crowdedState = pendingVehicleState();
crowdedState.warehouse.lots.push({
  lotId: "L-crowded",
  name: "占位库存",
  type: "ordinary",
  category: "商用库存",
  condition: "一般",
  count: 1,
  storageSlots: 45,
  neutralValue: 100,
  originalQuickValue: 100,
  storedDate: crowdedState.dateKey
});
const crowdedGame = engine.createGame({ generator, savedState: crowdedState });
assert.throws(() => crowdedGame.disposeItem(0, "store"), /需要 10 个仓位/);

const rolloverState = engine.createGame({ generator, dateKey: "2026-11-03", saveSeed: "day-rollover", initialCash: 7800 }).exportSave();
rolloverState.collections.discovered.push("瑞士陀飞轮腕表");
rolloverState.warehouse.lots.push({
  lotId: "L-rollover",
  name: "跨日库存",
  type: "ordinary",
  category: "商用库存",
  condition: "一般",
  count: 1,
  storageSlots: 1,
  neutralValue: 500,
  originalQuickValue: 460,
  storedDate: rolloverState.dateKey
});
rolloverState.containerResults.C1 = { winnerType: "npc", winnerId: "zhao", price: 600, status: "completed", npcSettled: true };
const previousBoardId = rolloverState.board.boardId;
const rolloverGame = engine.createGame({ generator, savedState: rolloverState });
rolloverGame.advanceDay("2026-11-04");
const rolloverView = rolloverGame.getView();
const rolloverSave = rolloverGame.exportSave();
assert.equal(rolloverView.dateKey, "2026-11-04");
assert.equal(rolloverView.containers.length, 5);
assert.notEqual(rolloverSave.board.boardId, previousBoardId);
assert.deepEqual(rolloverSave.containerResults, {});
assert.equal(rolloverView.warehouse.lots[0].name, "跨日库存");
assert.ok(rolloverView.collections.discovered.includes("瑞士陀飞轮腕表"));
assert.ok(rolloverSave.board.market);
assert.ok(Object.prototype.hasOwnProperty.call(rolloverSave.board, "merchant"));
assert.throws(() => rolloverGame.advanceDay("2026-11-03"), /不能返回/);

console.log("mechanism test ok", { modernItemsSeen: modernNames.size, vehicleSlots: storedView.warehouse.used });
