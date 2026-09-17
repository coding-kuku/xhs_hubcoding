"use strict";

const assert = require("node:assert/strict");
const generator = require("../src/core/daily-generator.js");

const TIERS = ["low", "medium", "high"];
const samples = Object.fromEntries(TIERS.map((tier) => [tier, {
  containers: 0,
  quickValue: 0,
  reference: 0,
  returns: [],
  profits: [],
  positiveClueQuick: 0,
  positiveClueReference: 0,
  conditions: {
    ordinary: { total: 0, poor: 0 },
    collectible: { total: 0, poor: 0 },
    fragment: { total: 0, poor: 0 }
  },
  ordinaryQuantity: { total: 0, small: 0 }
}]));

function dateKey(offset) {
  const year = 2030 + Math.floor(offset / 336);
  const withinYear = offset % 336;
  const month = Math.floor(withinYear / 28) + 1;
  const day = (withinYear % 28) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function roundMoney(value) {
  return Math.round(value / 10) * 10;
}

function percentile(values, ratio) {
  const ordered = values.slice().sort((a, b) => a - b);
  return ordered[Math.floor((ordered.length - 1) * ratio)];
}

function standardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

const simulatedDays = 12000;
for (let day = 0; day < simulatedDays; day += 1) {
  const board = generator.createDailyBoard({
    dateKey: dateKey(day),
    saveSeed: `economy-${day % 193}`,
    totalAssets: 6000
  });

  for (const container of board.containers) {
    if (container.isFog || !samples[container.tier]) continue;
    const sample = samples[container.tier];
    const quickValue = container.trueState.quickValue;
    const reference = container.auctionReference;
    sample.containers += 1;
    sample.quickValue += quickValue;
    sample.reference += reference;
    sample.returns.push(quickValue / reference);
    sample.profits.push(quickValue - reference);

    if (container.inspectionResults.documents.evidence >= 1) {
      sample.positiveClueQuick += quickValue;
      sample.positiveClueReference += reference;
    }

    for (const item of container.trueState.layers) {
      const expectedNeutral = item.type === "trash"
        ? item.baseValue
        : roundMoney(item.baseValue * item.quantityFactor * item.conditionFactor);
      assert.equal(item.neutralValue, expectedNeutral, `${item.name} 必须按固定价格和系数计算`);

      if (container.tier === "low" && item.type === "trash") {
        assert.ok(!["泡水木板", "发霉床垫", "裂缝水族箱"].includes(item.name), "低价柜不得生成高额污染处置货");
      }

      const condition = sample.conditions[item.type];
      if (condition) {
        condition.total += 1;
        if (item.type === "ordinary" && ["残旧", "重损", "报废"].includes(item.conditionBand)) condition.poor += 1;
        if (item.type === "collectible" && ["invalid", "suspect"].includes(item.conditionBand)) condition.poor += 1;
        if (item.type === "fragment" && ["残旧", "重损", "报废"].includes(item.conditionBand)) condition.poor += 1;
      }
      if (item.type === "ordinary") {
        sample.ordinaryQuantity.total += 1;
        if (item.quantityBand === "small") sample.ordinaryQuantity.small += 1;
      }
    }
  }
}

const report = {};
for (const tier of TIERS) {
  const sample = samples[tier];
  report[tier] = {
    containers: sample.containers,
    quickReturn: sample.quickValue / sample.reference,
    medianReturn: percentile(sample.returns, 0.5),
    p10Profit: percentile(sample.profits, 0.1),
    p90Profit: percentile(sample.profits, 0.9),
    profitDeviation: standardDeviation(sample.profits),
    positiveClueReturn: sample.positiveClueQuick / sample.positiveClueReference,
    poorConditionRates: Object.fromEntries(
      Object.entries(sample.conditions).map(([type, row]) => [type, row.poor / row.total])
    ),
    smallQuantityRate: sample.ordinaryQuantity.small / sample.ordinaryQuantity.total
  };
}

assert.ok(report.low.quickReturn >= 1.00 && report.low.quickReturn <= 1.12, "低价柜应在参考价附近缓慢回本");
assert.ok(report.medium.quickReturn >= 0.94 && report.medium.quickReturn <= 1.10, "中价柜长期回报必须可持续");
assert.ok(report.high.quickReturn >= 0.94 && report.high.quickReturn <= 1.10, "高价柜长期回报必须可持续");
for (const tier of TIERS) {
  assert.ok(report[tier].medianReturn < 1, `${tier} 不能让盲拍中位结果稳定赚钱`);
  assert.ok(report[tier].positiveClueReturn > 1.12, `${tier} 的正向线索必须产生可利用优势`);
}

assert.ok(Math.abs(report.medium.p10Profit) > Math.abs(report.low.p10Profit) * 2.5, "中价柜亏损额必须显著高于低价柜");
assert.ok(Math.abs(report.high.p10Profit) > Math.abs(report.medium.p10Profit) * 2, "高价柜亏损额必须显著高于中价柜");
assert.ok(report.medium.p90Profit > report.low.p90Profit * 3, "中价柜盈利额必须显著高于低价柜");
assert.ok(report.high.p90Profit > report.medium.p90Profit * 2, "高价柜盈利额必须显著高于中价柜");
assert.ok(report.low.profitDeviation < report.medium.profitDeviation, "中价柜方差必须高于低价柜");
assert.ok(report.medium.profitDeviation < report.high.profitDeviation, "高价柜方差必须高于中价柜");

for (const type of ["ordinary", "collectible", "fragment"]) {
  assert.ok(
    report.low.poorConditionRates[type] > report.medium.poorConditionRates[type],
    `低价柜 ${type} 差品相率必须高于中价柜`
  );
  assert.ok(
    report.medium.poorConditionRates[type] > report.high.poorConditionRates[type],
    `中价柜 ${type} 差品相率必须高于高价柜`
  );
}
assert.ok(report.low.smallQuantityRate > report.medium.smallQuantityRate, "低价柜少量货比例必须高于中价柜");
assert.ok(report.medium.smallQuantityRate > report.high.smallQuantityRate, "中价柜少量货比例必须高于高价柜");

console.log(JSON.stringify({ simulatedDays, ...report, passed: true }, null, 2));
