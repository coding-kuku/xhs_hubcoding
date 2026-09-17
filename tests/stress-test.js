"use strict";

const assert = require("node:assert/strict");
require("../src/core/daily-generator.js");
const { createGame } = require("../src/core/game-engine.js");

function dateKey(offset) {
  const date = new Date(2026, 0, 1 + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

let auctions = 0;
let wins = 0;
let losses = 0;
let stored = 0;
let sold = 0;
let recoveries = 0;

for (let career = 0; career < 160; career += 1) {
  let game = createGame({ dateKey: dateKey(0), saveSeed: `stress-${career}`, initialCash: 6000 });
  for (let day = 0; day < 30; day += 1) {
    let safety = 0;
    while (safety < 8) {
      safety += 1;
      let view = game.getView();
      assert.equal(view.phase, "board");
      const available = view.containers.filter((container) => !container.result);
      if (!available.length) break;
      let affordable = available.filter((container) => container.startingBid <= view.player.cash);
      if (!affordable.length) {
        const positiveLot = view.warehouse.lots.find((lot) => lot.stallValue > 0);
        if (positiveLot) {
          game.sellWarehouseLot(positiveLot.lotId, "stall");
          sold += 1;
          continue;
        }
        try {
          game.claimRecoveryJob();
          recoveries += 1;
          view = game.getView();
          affordable = available.filter((container) => container.startingBid <= view.player.cash);
        } catch (error) {
          break;
        }
      }
      if (!affordable.length) break;

      const container = affordable[(career + day + safety) % affordable.length];
      game.selectContainer(container.id);
      if (!container.isFog) game.inspect(["documents", "weigh", "door"][(career + day) % 3]);
      game.startAuction();
      while (game.getView().phase === "auction") {
        const action = (career + day + game.getView().auction.round) % 4 === 0 ? "jump" : "follow";
        try {
          game.auctionAction(action);
        } catch (error) {
          game.auctionAction("fold");
        }
      }
      auctions += 1;

      view = game.getView();
      if (view.phase === "reveal" && view.reveal.winnerType === "player") {
        wins += 1;
        while (game.getView().phase === "reveal") game.revealNext();
        while (game.getView().phase === "disposition") {
          const pendingIndex = game.getView().pendingItems.findIndex((item) => !item.resolved);
          const pendingItem = game.getView().pendingItems[pendingIndex].item;
          const canStore = game.getView().warehouse.used + (pendingItem.storageSlots || 1)
            <= game.getView().warehouse.activeCapacity;
          const shouldStore = canStore && (career + day + pendingIndex) % 3 === 0;
          game.disposeItem(pendingIndex, shouldStore ? "store" : "sell");
          if (shouldStore) stored += 1;
          else sold += 1;
        }
      } else {
        losses += 1;
        if (view.phase === "reveal") game.skipSpectatorReveal();
        if (game.getView().phase === "spectatorResult") game.returnToBoard();
      }
    }

    if (day < 29) game.advanceDay(dateKey(day + 1));
    const exported = game.exportSave();
    game = createGame({ savedState: exported });
    assert.deepEqual(game.exportSave(), exported, "压力测试中的存档往返必须无损");
  }
}

assert.ok(auctions > 1000);
assert.equal(auctions, wins + losses);
console.log(JSON.stringify({ careers: 160, daysEach: 30, auctions, wins, losses, stored, sold, recoveries, passed: true }, null, 2));
