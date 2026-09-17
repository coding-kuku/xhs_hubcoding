"use strict";

const assert = require("node:assert/strict");
const generator = require("../src/core/daily-generator.js");

const baseOptions = {
  dateKey: "2026-09-15",
  saveSeed: "test-save-01",
  totalAssets: 6000
};

const first = generator.createDailyBoard(baseOptions);
const second = generator.createDailyBoard(baseOptions);
assert.deepEqual(first, second, "同一天、同存档种子必须完全一致");
assert.notDeepEqual(
  first,
  generator.createDailyBoard({ ...baseOptions, dateKey: "2026-09-16" }),
  "隔日必须刷新"
);
assert.equal(first.containers.length, 5, "每日必须生成五个货柜");
assert.equal(generator.publicContainerView(first.containers[0]).trueState, undefined, "公开视图不能泄露真实货物");

const bandChecks = [
  { totalAssets: 6000, expected: ["low", "low", "medium", "medium", "high"] },
  { totalAssets: 12000, expected: ["low", "medium", "medium", "high", "bonded"] },
  { totalAssets: 30000, expected: ["low", "medium", "high", "bonded", "legacy"] }
];
for (const check of bandChecks) {
  const board = generator.createDailyBoard({ ...baseOptions, totalAssets: check.totalAssets });
  assert.deepEqual(board.containers.map((container) => container.tier), check.expected);
}

const typeCounts = { ordinary: 0, collectible: 0, fragment: 0, trash: 0 };
let regularLayers = 0;
let fogDays = 0;
let fogContainers = 0;
const simulatedDays = 6000;

for (let day = 0; day < simulatedDays; day += 1) {
  const year = 2030 + Math.floor(day / 336);
  const withinYear = day % 336;
  const month = Math.floor(withinYear / 28) + 1;
  const date = (withinYear % 28) + 1;
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  const board = generator.createDailyBoard({ dateKey, saveSeed: `sample-${day % 97}`, totalAssets: 6000 });
  const fogs = board.containers.filter((container) => container.isFog);
  if (fogs.length) fogDays += 1;
  fogContainers += fogs.length;
  assert.ok(fogs.length <= 1, "每日雾柜不能超过一个");
  assert.equal(board.containers[0].isFog, false, "第一个低价安全柜不能被替换");

  for (const multiplier of Object.values(board.market.multipliers)) {
    assert.ok(multiplier >= 0.7 && multiplier <= 1.2, "市场波动必须位于 -30% 至 +20%");
  }
  const marketValues = Object.values(board.market.multipliers);
  const upCount = marketValues.filter((multiplier) => multiplier > 1.05).length;
  const downCount = marketValues.filter((multiplier) => multiplier < 0.95).length;
  assert.ok(upCount >= 1 && upCount <= 2, "每日必须有 1–2 类明确上涨");
  assert.ok(downCount >= 1 && downCount <= 2, "每日必须有 1–2 类明确下跌");

  for (const container of board.containers) {
    assert.ok(container.auctionReference > container.startingBid, "竞价参考线必须高于起拍价");
    if (!container.isFog) {
      assert.equal(container.trueState.layers.length, 3, "普通柜必须有三个独立结果层");
      assert.equal(Object.keys(container.inspectionResults).length, 3, "普通柜必须预生成三种检查结果");
      for (const item of container.trueState.layers) {
        typeCounts[item.type] += 1;
        regularLayers += 1;
      }
    } else {
      assert.ok(container.trueState.layers.length <= 1, "雾柜最多一个结果位");
      assert.equal(container.inspectionResults, null, "雾柜不可进行常规深入检查");
      for (const item of container.trueState.layers) {
        if (item.type === "trash") assert.ok(item.quickValue <= 0, "雾柜垃圾不能产生正向即时售价");
      }
    }

    for (const estimate of container.npcEstimates) {
      assert.ok(estimate.maxBid <= estimate.cash, "NPC 最高出价不得超过现金");
    }
  }
}

const ratios = Object.fromEntries(
  Object.entries(typeCounts).map(([type, count]) => [type, count / regularLayers])
);
assert.ok(Math.abs(ratios.ordinary - 0.35) < 0.012, "普通货物比例偏离 35%");
assert.ok(Math.abs(ratios.collectible - 0.35) < 0.012, "实体藏品比例偏离 35%");
assert.ok(Math.abs(ratios.fragment - 0.15) < 0.01, "碎片比例偏离 15%");
assert.ok(Math.abs(ratios.trash - 0.15) < 0.01, "垃圾比例偏离 15%");

const fogDayRate = fogDays / simulatedDays;
assert.ok(fogDayRate > 0.16 && fogDayRate < 0.21, "雾柜日出现率应接近 18.5%");
assert.equal(fogContainers, fogDays, "出现雾柜时只能有一个");

console.log(JSON.stringify({
  deterministic: true,
  simulatedDays,
  regularLayers,
  typeRatios: ratios,
  fogDayRate,
  sampleBoardId: first.boardId,
  sampleTiers: first.containers.map((container) => container.tier),
  sampleFogSlots: first.containers.filter((container) => container.isFog).map((container) => container.slot),
  sampleNpcNames: first.activeNpcs.map((npc) => npc.name)
}, null, 2));
