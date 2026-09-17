import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(here, "../src/data/economy-config.json"), "utf8"));

console.warn("[legacy] 该脚本不代表当前运行时经济；请改跑 tests/economy-balance-test.js 与 tests/mainline-playability-test.js。");

const RUNS = Number(process.argv[2] || 30000);
const DAYS = Number(process.argv[3] || 60);
const SEED = Number(process.argv[4] || 20260915);

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(SEED);

function between(min, max) {
  return min + (max - min) * random();
}

function normal(mean = 0, deviation = 1) {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickWeighted(rows, weightKey = "probability") {
  let cursor = random();
  for (const row of rows) {
    cursor -= row[weightKey];
    if (cursor <= 0) return row;
  }
  return rows.at(-1);
}

function pick(array) {
  return array[Math.floor(random() * array.length)];
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function percentile(sorted, p) {
  const index = Math.floor((sorted.length - 1) * p);
  return sorted[index];
}

function rollLayerType() {
  const rows = Object.entries(config.layerTypeProbability).map(([name, probability]) => ({ name, probability }));
  return pickWeighted(rows).name;
}

function tierMix(totalAssets) {
  if (totalAssets >= config.unlockAsset.legacy) return ["low", "medium", "high", "bonded", "legacy"];
  if (totalAssets >= config.unlockAsset.bonded) return ["low", "medium", "medium", "high", "bonded"];
  return config.dailyBoard.baseMix;
}

function rollMarket() {
  const market = {};
  const categories = [...new Set([
    ...config.itemLibrary.ordinary,
    ...config.itemLibrary.collectible
  ].map((item) => item.category))];
  for (const category of categories) {
    const band = pickWeighted(config.marketBands);
    market[category] = between(band.min, band.max);
  }
  return market;
}

function rollRegularContainer(tierName, market) {
  const tier = config.tiers[tierName];
  const closePrice = Math.round(between(tier.closeMin, tier.closeMax));
  const items = [];

  for (let layer = 0; layer < 3; layer += 1) {
    const type = rollLayerType();
    const item = pick(config.itemLibrary[type]);
    const ratio = pickWeighted(config.contentValueBuckets[type]).ratio;
    const neutralValue = closePrice * ratio;
    const marketMultiplier = ["ordinary", "collectible"].includes(type) ? market[item.category] : 1;
    const quickValue = neutralValue * config.instantSaleMultiplier[type] * marketMultiplier;
    items.push({ type, item, neutralValue, quickValue, ratio });
  }

  const positiveItems = items.filter((item) => item.neutralValue > 0);
  if (positiveItems.length > 0) {
    const outcome = pickWeighted(config.regularOutcomeBuckets);
    const targetNeutralValue = closePrice * between(outcome.minRatio, outcome.maxRatio);
    const negativeValue = items
      .filter((item) => item.neutralValue <= 0)
      .reduce((sum, item) => sum + item.neutralValue, 0);
    const rawPositiveValue = positiveItems.reduce((sum, item) => sum + item.neutralValue, 0);
    const scale = Math.max(0, targetNeutralValue - negativeValue) / rawPositiveValue;
    for (const layerItem of positiveItems) {
      layerItem.neutralValue *= scale;
      const marketMultiplier = ["ordinary", "collectible"].includes(layerItem.type) ? market[layerItem.item.category] : 1;
      layerItem.quickValue =
        layerItem.neutralValue * config.instantSaleMultiplier[layerItem.type] * marketMultiplier;
    }
  }

  const neutralValue = items.reduce((sum, item) => sum + item.neutralValue, 0);
  const quickValue = items.reduce((sum, item) => sum + item.quickValue, 0);
  const quickRatio = quickValue / closePrice;
  const assetRatio = neutralValue / closePrice;

  const boundedOutcome = Math.tanh(assetRatio - 1);
  const publicSignal = clamp(1 + 0.025 * boundedOutcome + normal(0, 0.20), 0.35, 2.4);
  const deepSignal = clamp(1 + 0.06 * boundedOutcome + normal(0, 0.20), 0.25, 3.2);

  return {
    tierName,
    isFog: false,
    closePrice,
    items,
    quickValue,
    neutralValue,
    quickRatio,
    assetRatio,
    publicSignal,
    deepSignal
  };
}

function rollFogContainer(tierName) {
  const tier = config.tiers[tierName];
  const closePrice = Math.round(between(tier.closeMin, tier.closeMax));
  const outcome = pickWeighted(config.fogOutcomeBuckets);
  const quickValue = closePrice * outcome.quickRatio;
  const neutralValue = closePrice * outcome.assetRatio;
  const publicSignal = clamp(1 + 0.03 * Math.tanh(outcome.assetRatio - 1) + normal(0, 0.30), 0.3, 2.6);

  return {
    tierName,
    isFog: true,
    closePrice,
    items: [{ type: outcome.name, item: { name: `雾柜：${outcome.name}` }, neutralValue, quickValue }],
    quickValue,
    neutralValue,
    quickRatio: outcome.quickRatio,
    assetRatio: outcome.assetRatio,
    publicSignal,
    deepSignal: publicSignal
  };
}

function makeBoard(totalAssets, market) {
  const mix = tierMix(totalAssets);
  let fogUsed = false;
  return mix.map((tierName, index) => {
    const fogEligible = index >= 1;
    const shouldFog = fogEligible && !fogUsed && random() < config.dailyBoard.fogChancePerEligibleSlot;
    if (shouldFog) fogUsed = true;
    return shouldFog ? rollFogContainer(tierName) : rollRegularContainer(tierName, market);
  });
}

function projectedSignal(container, strategyName) {
  if (strategyName === "blind") return 1;
  if (container.isFog) return container.publicSignal - 0.05;
  if (strategyName === "aware") return container.publicSignal * 0.35 + container.deepSignal * 0.65;
  return container.publicSignal * 0.25 + container.deepSignal * 0.75;
}

function storedSaleValue(item, dayMarket) {
  if (["ordinary", "collectible"].includes(item.type)) {
    const favorableMarket = Math.max(dayMarket[item.item.category] || 1, 1.0);
    const baseMultiplier = config.instantSaleMultiplier[item.type];
    return item.neutralValue * baseMultiplier * Math.min(favorableMarket, 1.05);
  }
  if (item.type === "fragment") return item.neutralValue * between(0.85, 0.89);
  if (item.type === "trash" && item.item.kind === "oddity" && random() < 0.12) {
    return Math.abs(item.neutralValue) * between(0.6, 1.4);
  }
  return item.quickValue;
}

function liquidateDueInventory(state, market, force = false) {
  const keep = [];
  for (const lot of state.inventory) {
    const due = force || lot.sellDay <= state.day;
    if (due) {
      const saleValue = storedSaleValue(lot.item, market);
      state.cash += saleValue;
      state.realizedRevenue += saleValue;
    } else {
      keep.push(lot);
    }
  }
  state.inventory = keep;
}

function emergencyLiquidateInventory(state) {
  if (state.cash >= config.recovery.triggerCashBelow || state.inventory.length === 0) return;
  state.inventory.sort((a, b) => a.sellDay - b.sellDay);
  const keep = [];
  for (const lot of state.inventory) {
    if (state.cash < config.recovery.restoreCashTo && lot.item.quickValue > 0) {
      state.cash += lot.item.quickValue;
      state.realizedRevenue += lot.item.quickValue;
    } else {
      keep.push(lot);
    }
  }
  state.inventory = keep;
}

function inventoryUsed(state) {
  return state.inventory.reduce(
    (sum, lot) => sum + Math.max(1, Number(lot.item.item.storageSlots) || 1),
    0
  );
}

function handleSkilledItems(container, state, market) {
  if (container.isFog) {
    const delay = container.assetRatio > container.quickRatio + 0.08 ? Math.ceil(between(2, 7)) : 0;
    if (delay > 0 && inventoryUsed(state) < config.warehouse.freeSlots) {
      const synthetic = {
        type: "collectible",
        item: { name: "雾柜暂存物", category: "特殊藏品" },
        neutralValue: container.neutralValue,
        quickValue: container.quickValue
      };
      state.inventory.push({ item: synthetic, sellDay: state.day + delay });
      return 0;
    }
    return container.quickValue;
  }

  let immediate = 0;
  for (const item of container.items) {
    let shouldStore = false;
    let delay = 0;
    if (item.type === "ordinary" && market[item.item.category] < 1.05) {
      shouldStore = true;
      delay = Math.ceil(between(1, 5));
    } else if (item.type === "collectible") {
      shouldStore = true;
      delay = Math.ceil(between(2, 7));
    } else if (item.type === "fragment") {
      shouldStore = true;
      delay = Math.ceil(between(3, 8));
    } else if (item.type === "trash" && item.item.kind === "oddity" && random() < 0.18) {
      shouldStore = true;
      delay = Math.ceil(between(1, 6));
    }

    const slotsNeeded = Math.max(1, Number(item.item.storageSlots) || 1);
    if (shouldStore && inventoryUsed(state) + slotsNeeded <= config.warehouse.freeSlots) {
      state.inventory.push({ item, sellDay: state.day + delay });
    } else {
      immediate += item.quickValue;
    }
  }
  return immediate;
}

function simulateCareer(strategyName) {
  const strategy = config.strategies[strategyName];
  const state = {
    day: 0,
    cash: config.startingCash,
    inventory: [],
    invested: 0,
    realizedRevenue: 0,
    auctions: 0,
    winningDays: 0,
    flatDays: 0,
    losingDays: 0,
    bigDays: 0,
    inactiveDays: 0,
    recoveries: 0,
    fogBought: 0,
    maxAssets: config.startingCash
  };

  for (let day = 1; day <= DAYS; day += 1) {
    state.day = day;
    const market = rollMarket();
    liquidateDueInventory(state, market);
    emergencyLiquidateInventory(state);

    if (state.cash < config.recovery.triggerCashBelow) {
      state.cash = config.recovery.restoreCashTo;
      state.recoveries += 1;
    }

    const startAssets = state.cash + state.inventory.reduce((sum, lot) => sum + lot.item.neutralValue, 0);
    const board = makeBoard(startAssets, market);
    const candidates = board.map((container) => ({ container, signal: projectedSignal(container, strategyName) }));
    const ordered = strategyName === "blind" ? shuffle(candidates) : candidates.sort((a, b) => b.signal - a.signal);
    const canKeepReserve = board.some(
      (container) => container.closePrice * strategy.bidPremiumMin <= state.cash - strategy.cashReserve
    );
    const effectiveReserve = canKeepReserve ? strategy.cashReserve : 0;

    let dailyAuctions = 0;
    let dailyInvested = 0;
    for (const candidate of ordered) {
      if (dailyAuctions >= strategy.maxDailyAuctions) break;
      const isFallbackBid =
        strategyName !== "blind" && dailyAuctions === 0 && candidate.signal >= strategy.fallbackSignal;
      if (candidate.signal < strategy.minimumSignal && !isFallbackBid) continue;

      const premium = between(strategy.bidPremiumMin, strategy.bidPremiumMax);
      const paid = candidate.container.closePrice * premium;
      if (paid > state.cash - effectiveReserve) continue;
      if (strategyName !== "blind" && candidate.signal < premium + 0.015 && !isFallbackBid) continue;

      state.cash -= paid;
      state.invested += paid;
      dailyInvested += paid;
      state.auctions += 1;
      dailyAuctions += 1;
      if (candidate.container.isFog) state.fogBought += 1;

      const immediateRevenue = strategy.usesWarehouse
        ? handleSkilledItems(candidate.container, state, market)
        : candidate.container.quickValue;
      state.cash += immediateRevenue;
      state.realizedRevenue += immediateRevenue;
    }

    const endAssets = state.cash + state.inventory.reduce((sum, lot) => sum + lot.item.neutralValue, 0);
    if (dailyInvested === 0) {
      state.inactiveDays += 1;
    } else {
      const dailyReturn = (endAssets - startAssets) / dailyInvested;
      if (dailyReturn < -0.10) state.losingDays += 1;
      else if (dailyReturn > 0.75) state.bigDays += 1;
      else if (dailyReturn > 0.10) state.winningDays += 1;
      else state.flatDays += 1;
    }
    state.maxAssets = Math.max(state.maxAssets, endAssets);
  }

  const finalMarket = rollMarket();
  liquidateDueInventory(state, finalMarket, true);
  return {
    ...state,
    finalAssets: state.cash,
    roi: state.invested > 0 ? state.realizedRevenue / state.invested : 1
  };
}

function summarize(strategyName) {
  const rows = [];
  for (let run = 0; run < RUNS; run += 1) rows.push(simulateCareer(strategyName));

  const finalAssets = rows.map((row) => row.finalAssets).sort((a, b) => a - b);
  const rois = rows.map((row) => row.roi).sort((a, b) => a - b);
  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  const auctionTotal = sum("auctions");
  const calendarDayTotal = RUNS * DAYS;
  const activeDayTotal = Math.max(1, calendarDayTotal - sum("inactiveDays"));

  return {
    strategy: config.strategies[strategyName].label,
    runs: RUNS,
    days: DAYS,
    meanRoi: sum("realizedRevenue") / sum("invested"),
    medianCareerRoi: percentile(rois, 0.5),
    finalAssetsP10: percentile(finalAssets, 0.1),
    finalAssetsMedian: percentile(finalAssets, 0.5),
    finalAssetsP90: percentile(finalAssets, 0.9),
    auctionsPerDay: auctionTotal / calendarDayTotal,
    inactiveDayRate: sum("inactiveDays") / calendarDayTotal,
    lossActiveDayRate: sum("losingDays") / activeDayTotal,
    flatActiveDayRate: sum("flatDays") / activeDayTotal,
    winActiveDayRate: sum("winningDays") / activeDayTotal,
    bigActiveDayRate: sum("bigDays") / activeDayTotal,
    recoveryPerCareer: sum("recoveries") / RUNS,
    careerRecoveryRate: rows.filter((row) => row.recoveries > 0).length / RUNS,
    fogShare: auctionTotal > 0 ? sum("fogBought") / auctionTotal : 0,
    reachedBondedRate: rows.filter((row) => row.maxAssets >= config.unlockAsset.bonded).length / RUNS,
    reachedLegacyRate: rows.filter((row) => row.maxAssets >= config.unlockAsset.legacy).length / RUNS
  };
}

const results = ["blind", "aware", "skilled"].map(summarize);
const output = {
  seed: SEED,
  runsPerStrategy: RUNS,
  daysPerCareer: DAYS,
  results
};

const resultPath = path.join(here, "../reports/economy-simulation-latest.json");
fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
