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
assert.deepEqual(generator.itemProfile("酒店布草包"), {
  type: "ordinary",
  category: "商用库存",
  set: null,
  kind: null,
  visualId: null
}, "普通货物应能从唯一商品定义读取分类");
assert.equal(generator.itemProfile("瑞士陀飞轮腕表").type, "collectible", "实体藏品分类应可查询");
assert.equal(generator.itemProfile("沉船航海图·西北角").type, "fragment", "宝藏碎片分类应可查询");
assert.equal(generator.itemProfile("只有杯盖没有杯").type, "trash", "特殊杂物分类应可查询");
assert.equal(generator.itemProfile("高性能中置跑车").category, "车辆大奖", "大奖商品应复用同一分类查询");
assert.equal(generator.itemProfile("不存在的物品"), null, "未知名称不应生成虚假分类");

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
const tierTypeCounts = Object.fromEntries(
  ["low", "medium", "high"].map((tier) => [tier, { ordinary: 0, collectible: 0, fragment: 0, trash: 0 }])
);
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
        if (tierTypeCounts[container.tier]) tierTypeCounts[container.tier][item.type] += 1;
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
const expectedTierRatios = {
  low: { ordinary: 0.52, collectible: 0.15, fragment: 0.08, trash: 0.25 },
  medium: { ordinary: 0.44, collectible: 0.27, fragment: 0.13, trash: 0.16 },
  high: { ordinary: 0.34, collectible: 0.40, fragment: 0.16, trash: 0.10 }
};
const tierRatios = {};
for (const [tier, counts] of Object.entries(tierTypeCounts)) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  tierRatios[tier] = Object.fromEntries(
    Object.entries(counts).map(([type, count]) => [type, count / total])
  );
  for (const [type, expected] of Object.entries(expectedTierRatios[tier])) {
    assert.ok(
      Math.abs(tierRatios[tier][type] - expected) < 0.015,
      `${tier} 的 ${type} 出货率偏离 ${(expected * 100).toFixed(0)}%`
    );
  }
}
assert.ok(tierRatios.low.trash > tierRatios.medium.trash, "低价柜垃圾率必须高于中价柜");
assert.ok(tierRatios.medium.trash > tierRatios.high.trash, "中价柜垃圾率必须高于高价柜");
assert.ok(tierRatios.high.collectible > tierRatios.medium.collectible, "高价柜藏品率必须高于中价柜");

const fogDayRate = fogDays / simulatedDays;
assert.ok(fogDayRate > 0.16 && fogDayRate < 0.21, "雾柜日出现率应接近 18.5%");
assert.equal(fogContainers, fogDays, "出现雾柜时只能有一个");

console.log(JSON.stringify({
  deterministic: true,
  simulatedDays,
  regularLayers,
  typeRatios: ratios,
  tierTypeRatios: tierRatios,
  fogDayRate,
  sampleBoardId: first.boardId,
  sampleTiers: first.containers.map((container) => container.tier),
  sampleFogSlots: first.containers.filter((container) => container.isFog).map((container) => container.slot),
  sampleNpcNames: first.activeNpcs.map((npc) => npc.name)
}, null, 2));
