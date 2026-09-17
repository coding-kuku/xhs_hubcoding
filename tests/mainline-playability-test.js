"use strict";

const assert = require("node:assert/strict");
const generator = require("../src/core/daily-generator.js");
const { createGame } = require("../src/core/game-engine.js");

function dateKey(offset) {
  const date = new Date(2030, 0, 1 + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const careers = 60;
const daysPerCareer = 30;
const endingCash = [];
let auctions = 0;
let wins = 0;
let recoveries = 0;

for (let career = 0; career < careers; career += 1) {
  let game = createGame({
    generator,
    dateKey: dateKey(0),
    saveSeed: `mainline-${career}`,
    initialCash: 6000
  });

  for (let day = 0; day < daysPerCareer; day += 1) {
    for (const container of game.getView().containers.filter((row) => !row.result)) {
      const cash = game.getView().player.cash;
      if (container.startingBid > cash) continue;
      if (container.tier === "medium" && cash < 3500) continue;
      if (container.tier === "high" && cash < 9000) continue;

      game.selectContainer(container.id);
      if (container.isFog) {
        game.cancelSelection();
        continue;
      }

      const clue = game.inspect("documents");
      if (clue.evidence < 1) {
        game.cancelSelection();
        continue;
      }

      game.startAuction();
      while (game.getView().phase === "auction") {
        try {
          game.auctionAction("follow");
        } catch (error) {
          game.auctionAction("fold");
        }
      }
      auctions += 1;

      const result = game.getView();
      if (result.phase === "reveal" && result.reveal.winnerType === "player") {
        wins += 1;
        while (game.getView().phase === "reveal") game.revealNext();
        while (game.getView().phase === "disposition") {
          const pendingIndex = game.getView().pendingItems.findIndex((row) => !row.resolved);
          game.disposeItem(pendingIndex, "sell");
        }
        break;
      }

      if (result.phase === "reveal") game.skipSpectatorReveal();
      if (game.getView().phase === "spectatorResult") game.returnToBoard();
    }

    if (day < daysPerCareer - 1) {
      if (game.getView().player.cash < 200) {
        try {
          game.claimRecoveryJob();
          recoveries += 1;
        } catch (error) {
          // The recovery job is only a last-resort guard; a sellable asset may legitimately block it.
        }
      }
      game.advanceDay(dateKey(day + 1));
    }
  }

  endingCash.push(game.getView().player.cash);
}

endingCash.sort((a, b) => a - b);
const p10 = endingCash[Math.floor(endingCash.length * 0.1)];
const median = endingCash[Math.floor(endingCash.length * 0.5)];
const p90 = endingCash[Math.floor(endingCash.length * 0.9)];
const average = endingCash.reduce((sum, value) => sum + value, 0) / endingCash.length;

assert.ok(auctions > careers * 20, "保守主线策略必须有足够多的可参与拍卖");
assert.ok(wins > careers * 8, "保守主线策略必须能稳定买到货柜");
assert.equal(recoveries, 0, "按正向线索竞拍不应依赖软破产救济维持主线");
assert.ok(endingCash[0] >= 500, "最差样本也必须保留下一次低价柜入场能力");
assert.ok(p10 >= 3000, "至少 90% 的主线样本在 30 天后仍应保持可玩资金");
assert.ok(median >= 6000, "保守主线策略的 30 天现金中位数不应低于初始资金");
assert.ok(p90 <= 50000, "主线经济不能在 30 天内普遍失控膨胀");

console.log(JSON.stringify({
  careers,
  daysPerCareer,
  auctions,
  wins,
  recoveries,
  endingCash: {
    minimum: endingCash[0],
    p10,
    median,
    p90,
    maximum: endingCash[endingCash.length - 1],
    average: Math.round(average)
  },
  passed: true
}, null, 2));
