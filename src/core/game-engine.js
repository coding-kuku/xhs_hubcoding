(function attachCargoGameEngine(root, factory) {
  "use strict";
  const api = factory(root && root.CargoDailyGenerator);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CargoGameEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createEngineApi(defaultGenerator) {
  "use strict";

  const VERSION = "1.1.0";
  const BID_STEPS = { low: 50, medium: 100, high: 200, bonded: 500, legacy: 1000 };
  const BASE_WAREHOUSE_CAPACITY = 50;
  const MAX_WAREHOUSE_CAPACITY = 100;
  const RENT_BY_CAPACITY = { 50: 0, 60: 500, 70: 1300, 80: 2500, 90: 4300, 100: 7000 };
  const SALE_MULTIPLIER = { ordinary: 1, collectible: 0.9, fragment: 0.84, trash: 1 };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function unitFromKey(key) {
    return hashString(key) / 4294967296;
  }

  function roundMoney(value) {
    return Math.round(value / 10) * 10;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function monthKey(dateKey) {
    return dateKey.slice(0, 7);
  }

  function fail(message) {
    throw new Error(message);
  }

  function createInitialState(generator, options) {
    const dateKey = String(options.dateKey || generator.localDateKey());
    const saveSeed = String(options.saveSeed || `save-${hashString(dateKey + "|cargo")}`);
    const cash = Number.isFinite(options.initialCash) ? Math.max(0, options.initialCash) : 6000;
    const board = generator.createDailyBoard({
      dateKey,
      saveSeed,
      totalAssets: cash,
      npcStates: options.npcStates || null
    });
    const npcCash = {};
    for (const npc of board.activeNpcs) npcCash[npc.id] = npc.cash;
    return {
      schemaVersion: VERSION,
      dateKey,
      saveSeed,
      cash: roundMoney(cash),
      board,
      npcCash,
      phase: "board",
      selectedContainerId: null,
      selectedInspection: null,
      containerInspections: {},
      auction: null,
      reveal: null,
      pendingItems: [],
      containerResults: {},
      warehouse: {
        contractedCapacity: BASE_WAREHOUSE_CAPACITY,
        activeCapacity: BASE_WAREHOUSE_CAPACITY,
        rentMonth: monthKey(dateKey),
        rentPaidThisMonth: 0,
        lots: []
      },
      collections: {
        discovered: [],
        ownedFragments: {}
      },
      recoveryClaimedDate: null,
      merchantLotsSold: 0,
      journal: []
    };
  }

  function validateLoadedState(state) {
    if (!state || state.schemaVersion !== VERSION) fail("存档版本不兼容");
    if (!state.board || !Array.isArray(state.board.containers)) fail("存档缺少每日货柜数据");
    if (!state.warehouse || !Array.isArray(state.warehouse.lots)) fail("存档缺少仓库数据");
    if (!state.containerInspections || Array.isArray(state.containerInspections) || typeof state.containerInspections !== "object") {
      state.containerInspections = {};
    }
    if (state.selectedContainerId && state.selectedInspection && !state.containerInspections[state.selectedContainerId]) {
      state.containerInspections[state.selectedContainerId] = state.selectedInspection;
    }
    const contracted = clamp(Number(state.warehouse.contractedCapacity) || BASE_WAREHOUSE_CAPACITY, BASE_WAREHOUSE_CAPACITY, MAX_WAREHOUSE_CAPACITY);
    const active = clamp(Number(state.warehouse.activeCapacity) || BASE_WAREHOUSE_CAPACITY, BASE_WAREHOUSE_CAPACITY, contracted);
    state.warehouse.contractedCapacity = contracted;
    state.warehouse.activeCapacity = active;
    state.warehouse.rentPaidThisMonth = Math.min(
      Math.max(0, Number(state.warehouse.rentPaidThisMonth) || 0),
      RENT_BY_CAPACITY[contracted]
    );
  }

  function backfillMissingMarketCategories(state, generator) {
    const categories = Array.isArray(generator.MARKET_CATEGORIES) ? generator.MARKET_CATEGORIES : [];
    const currentMarket = state.board.market;
    const currentMultipliers = currentMarket && currentMarket.multipliers;
    if (!categories.length || !currentMultipliers || typeof currentMultipliers !== "object") return;
    if (categories.every((category) => Number.isFinite(Number(currentMultipliers[category])))) return;

    const regenerated = generator.createDailyBoard({
      dateKey: state.dateKey,
      saveSeed: state.saveSeed,
      totalAssets: state.board.totalAssetsAtRefresh
    }).market;
    const multipliers = { ...regenerated.multipliers, ...currentMultipliers };
    const sorted = Object.entries(multipliers).sort((left, right) => right[1] - left[1]);
    const headlineUp = sorted[0][0];
    const headlineDown = sorted[sorted.length - 1][0];
    state.board.market = {
      ...currentMarket,
      multipliers,
      featuredCategories: [...new Set([
        headlineUp,
        headlineDown,
        ...(regenerated.featuredCategories || []),
        ...categories
      ])].slice(0, 6),
      headlineUp,
      headlineDown
    };
  }

  function createGame(options) {
    const settings = options || {};
    const generator = settings.generator || defaultGenerator;
    if (!generator || typeof generator.createDailyBoard !== "function") {
      fail("必须先加载 CargoDailyGenerator");
    }

    const state = settings.savedState ? clone(settings.savedState) : createInitialState(generator, settings);
    validateLoadedState(state);
    backfillMissingMarketCategories(state, generator);

    function containerById(containerId) {
      const container = state.board.containers.find((row) => row.id === containerId);
      if (!container) fail("找不到货柜");
      return container;
    }

    function resultFor(containerId) {
      return state.containerResults[containerId] || null;
    }

    function assertPhase(...allowed) {
      if (!allowed.includes(state.phase)) fail(`当前阶段不能执行该操作：${state.phase}`);
    }

    function currentContainer() {
      if (!state.selectedContainerId) fail("当前没有选择货柜");
      return containerById(state.selectedContainerId);
    }

    function liveNpcCap(container, npcId) {
      const estimate = container.npcEstimates.find((row) => row.npcId === npcId);
      if (!estimate) return 0;
      return Math.max(0, Math.min(estimate.maxBid, state.npcCash[npcId] || 0));
    }

    function pushBid(actorId, amount, kind, round) {
      const bid = { actorId, amount: roundMoney(amount), kind, round };
      state.auction.bids.push(bid);
      state.auction.currentPrice = bid.amount;
      state.auction.leaderId = actorId;
      return bid;
    }

    function auctionKey(suffix) {
      return `${state.board.boardId}|${state.selectedContainerId}|${suffix}`;
    }

    function orderedNpcIds(container, round) {
      return container.npcEstimates
        .map((row) => row.npcId)
        .sort((a, b) => unitFromKey(auctionKey(`order|${round}|${a}`)) - unitFromKey(auctionKey(`order|${round}|${b}`)));
    }

    function npcOpenResponses(container, round) {
      const increment = BID_STEPS[container.tier] * (round === 1 ? 1 : 2);
      for (const npcId of orderedNpcIds(container, round)) {
        if (state.auction.leaderId === npcId) continue;
        const cap = liveNpcCap(container, npcId);
        const nextBid = state.auction.currentPrice + increment;
        if (cap < nextBid) continue;
        const jumps = unitFromKey(auctionKey(`jump|${round}|${npcId}`)) < 0.18;
        const target = jumps && cap >= nextBid + increment ? nextBid + increment : nextBid;
        pushBid(npcId, Math.min(cap, target), jumps ? "jump" : "follow", round);
      }
    }

    function priorNpcLeader(container) {
      const npcBids = state.auction.bids.filter((bid) => bid.actorId !== "player");
      if (!npcBids.length) return null;
      return npcBids.reduce((best, bid) => (bid.amount > best.amount ? bid : best), npcBids[0]);
    }

    function sealedNpcBids(container, basePrice, previousLeaderId) {
      const step = BID_STEPS[container.tier];
      const bids = [];
      for (const estimate of container.npcEstimates) {
        const npcId = estimate.npcId;
        const cap = liveNpcCap(container, npcId);
        const minimum = npcId === previousLeaderId ? basePrice : basePrice + step;
        if (cap < minimum) continue;
        const extraSteps = Math.floor(unitFromKey(auctionKey(`sealed|${npcId}`)) * 3);
        const desired = minimum + extraSteps * step;
        bids.push({ actorId: npcId, amount: roundMoney(Math.min(cap, desired)), kind: "sealed", round: 3 });
      }
      return bids;
    }

    function chooseWinner(candidates, previousLeaderId) {
      if (!candidates.length) return null;
      const topAmount = Math.max(...candidates.map((bid) => bid.amount));
      const tied = candidates.filter((bid) => bid.amount === topAmount);
      const incumbent = tied.find((bid) => bid.actorId === previousLeaderId);
      if (incumbent) return incumbent;
      return tied.sort(
        (a, b) => unitFromKey(auctionKey(`tie|${a.actorId}`)) - unitFromKey(auctionKey(`tie|${b.actorId}`))
      )[0];
    }

    function beginReveal(container, winnerBid) {
      let winnerType = "unsold";
      let winnerId = null;
      let price = 0;
      if (winnerBid) {
        winnerId = winnerBid.actorId;
        winnerType = winnerId === "player" ? "player" : "npc";
        price = winnerBid.amount;
      }

      if (winnerType === "player") {
        if (price > state.cash) fail("结算时玩家现金不足");
        state.cash = roundMoney(state.cash - price);
      } else if (winnerType === "npc") {
        state.npcCash[winnerId] = roundMoney(Math.max(0, (state.npcCash[winnerId] || 0) - price));
      }

      state.containerResults[container.id] = {
        winnerType,
        winnerId,
        price,
        status: winnerType === "unsold" ? "unsold" : "awaitReveal",
        npcSettled: false
      };
      state.reveal = {
        containerId: container.id,
        winnerType,
        winnerId,
        price,
        revealed: [],
        nextIndex: 0
      };
      state.auction = null;
      state.phase = winnerType === "unsold" ? "spectatorResult" : "reveal";
      state.journal.push({ type: "auction", containerId: container.id, winnerType, winnerId, price });
    }

    function settleNpcOnly(container) {
      const previousNpc = priorNpcLeader(container);
      const basePrice = previousNpc ? previousNpc.amount : container.startingBid;
      const previousLeaderId = previousNpc ? previousNpc.actorId : null;
      const candidates = sealedNpcBids(container, basePrice, previousLeaderId);
      if (previousNpc && !candidates.some((bid) => bid.actorId === previousNpc.actorId)) candidates.push(previousNpc);
      beginReveal(container, chooseWinner(candidates, previousLeaderId));
    }

    function settleSealedRound(container, playerAction) {
      const previousLeaderId = state.auction.leaderId;
      const basePrice = state.auction.currentPrice;
      const step = BID_STEPS[container.tier];
      const candidates = sealedNpcBids(container, basePrice, previousLeaderId);

      if (playerAction !== "fold") {
        let playerBid;
        if (playerAction === "follow") {
          playerBid = previousLeaderId === "player" ? basePrice : basePrice + step;
        } else {
          playerBid = previousLeaderId === "player" ? basePrice + step * 2 : basePrice + step * 3;
        }
        if (playerBid > state.cash) fail("现金不足以提交封槌价");
        candidates.push({ actorId: "player", amount: roundMoney(playerBid), kind: playerAction, round: 3 });
      }

      if (previousLeaderId && previousLeaderId !== "player") {
        const priorBid = state.auction.bids
          .filter((bid) => bid.actorId === previousLeaderId)
          .sort((a, b) => b.amount - a.amount)[0];
        if (priorBid && !candidates.some((bid) => bid.actorId === previousLeaderId)) candidates.push(priorBid);
      }

      beginReveal(container, chooseWinner(candidates, previousLeaderId));
    }

    function revealDeck(container) {
      if (container.trueState.layers.length) return clone(container.trueState.layers);
      return [{
        layer: 1,
        type: "trash",
        name: "空箱积水清理",
        category: "处置垃圾",
        set: null,
        kind: "disposal",
        tags: ["wet", "empty"],
        quantity: "1 次",
        condition: "报废",
        neutralValue: container.trueState.neutralValue,
        quickValue: container.trueState.quickValue,
        cleanupFee: Math.abs(Math.min(0, container.trueState.quickValue))
      }];
    }

    function markDiscovered(item) {
      if (!state.collections.discovered.includes(item.name)) state.collections.discovered.push(item.name);
    }

    function settleNpcGoodsIfNeeded() {
      if (!state.reveal || state.reveal.winnerType !== "npc") return;
      const result = resultFor(state.reveal.containerId);
      if (!result || result.npcSettled) return;
      const container = containerById(state.reveal.containerId);
      state.npcCash[state.reveal.winnerId] = roundMoney(
        Math.max(0, (state.npcCash[state.reveal.winnerId] || 0) + container.trueState.quickValue)
      );
      result.npcSettled = true;
      result.npcProfit = roundMoney(container.trueState.quickValue - result.price);
      result.status = "completed";
    }

    function completeDispositionIfReady() {
      if (!state.pendingItems.length || state.pendingItems.some((row) => !row.resolved)) return;
      const result = resultFor(state.selectedContainerId);
      if (result) result.status = "completed";
      state.pendingItems = [];
      state.reveal = null;
      state.selectedContainerId = null;
      state.selectedInspection = null;
      state.phase = "board";
    }

  function warehouseUsed() {
      return state.warehouse.lots.reduce(
        (sum, lot) => sum + Math.max(1, Number(lot.storageSlots) || Number(lot.count) || 1),
        0
      );
    }

    function storeItem(item) {
      const slotsNeeded = Math.max(1, Number(item.storageSlots) || 1);
      const matching = state.warehouse.lots.find(
        (lot) => lot.name === item.name && lot.condition === item.condition && lot.type === item.type
      );
      if (warehouseUsed() + slotsNeeded > state.warehouse.activeCapacity) {
        fail(`仓库空间不足，这批货需要 ${slotsNeeded} 个仓位`);
      }
      if (matching) {
        matching.count += 1;
        matching.storageSlots = Math.max(1, Number(matching.storageSlots) || 1) + slotsNeeded;
        matching.neutralValue = roundMoney(matching.neutralValue + item.neutralValue);
        matching.originalQuickValue = roundMoney(matching.originalQuickValue + item.quickValue);
        matching.handlingFee = roundMoney((Number(matching.handlingFee) || 0) + (Number(item.handlingFee) || 0));
      } else {
        state.warehouse.lots.push({
          lotId: `L-${hashString(state.dateKey + "|" + state.selectedContainerId + "|" + item.layer + "|" + state.warehouse.lots.length).toString(16)}`,
          name: item.name,
          type: item.type,
          category: item.category,
          set: item.set || null,
          kind: item.kind || null,
          visualId: item.visualId || null,
          rarity: item.rarity || "standard",
          assessment: item.assessment || null,
          riskProfile: item.riskProfile || null,
          condition: item.condition,
          count: 1,
          storageSlots: slotsNeeded,
          neutralValue: item.neutralValue,
          originalQuickValue: item.quickValue,
          handlingFee: Number(item.handlingFee) || 0,
          storedDate: state.dateKey
        });
      }
      if (item.type === "fragment") {
        state.collections.ownedFragments[item.name] = (state.collections.ownedFragments[item.name] || 0) + 1;
      }
    }

    function handlingFee(lot) {
      return Math.max(0, Number(lot.handlingFee) || 0);
    }

    function marketMultiplier(lot) {
      if (lot.type !== "ordinary" && lot.type !== "collectible") return 1;
      const multiplier = Number(state.board.market.multipliers[lot.category]);
      return Number.isFinite(multiplier) ? multiplier : 1;
    }

    function stallGrossValue(lot) {
      if (lot.type === "ordinary") {
        return roundMoney(lot.neutralValue * marketMultiplier(lot));
      }
      if (lot.type === "collectible") {
        return roundMoney(lot.neutralValue * SALE_MULTIPLIER.collectible * marketMultiplier(lot));
      }
      if (lot.type === "fragment") return roundMoney(lot.neutralValue * SALE_MULTIPLIER.fragment);
      return roundMoney(lot.originalQuickValue);
    }

    function stallValue(lot) {
      return roundMoney(stallGrossValue(lot) - handlingFee(lot));
    }

    function merchantMatches(lot) {
      const merchant = state.board.merchant;
      if (!merchant || state.merchantLotsSold >= merchant.maxLots) return false;
      if (merchant.targetType !== lot.type) return false;
      if (lot.type === "fragment") return true;
      if (lot.type === "trash") return lot.kind === "oddity";
      return merchant.targetCategory === lot.category;
    }

    function removeOwnedFragments(lot) {
      if (lot.type !== "fragment") return;
      state.collections.ownedFragments[lot.name] = Math.max(
        0,
        (state.collections.ownedFragments[lot.name] || 0) - lot.count
      );
    }

    function totalAssets() {
      const stored = state.warehouse.lots.reduce(
        (sum, lot) => sum + lot.neutralValue - handlingFee(lot),
        0
      );
      const pending = state.pendingItems
        .filter((row) => !row.resolved)
        .reduce((sum, row) => sum + row.item.neutralValue - handlingFee(row.item), 0);
      return roundMoney(state.cash + stored + pending);
    }

    function completedFragmentSets() {
      const sets = {};
      for (const lot of state.warehouse.lots) {
        if (lot.type === "fragment" && lot.set && lot.count > 0) {
          if (!sets[lot.set]) sets[lot.set] = new Set();
          sets[lot.set].add(lot.name);
        }
      }
      return Object.entries(sets)
        .filter(([, names]) => names.size >= 4)
        .map(([setName]) => setName);
    }

    function getView() {
      const selected = state.selectedContainerId ? containerById(state.selectedContainerId) : null;
      const containers = state.board.containers.map((container) => ({
        ...generator.publicContainerView(container),
        result: resultFor(container.id)
          ? {
              winnerType: resultFor(container.id).winnerType,
              winnerName: resultFor(container.id).winnerId === "player"
                ? "你"
                : state.board.activeNpcs.find((npc) => npc.id === resultFor(container.id).winnerId)?.name || null,
              price: resultFor(container.id).price,
              status: resultFor(container.id).status
            }
          : null
      }));
      return clone({
        schemaVersion: VERSION,
        dateKey: state.dateKey,
        phase: state.phase,
        player: { cash: state.cash, totalAssets: totalAssets() },
        market: state.board.market,
        merchant: state.board.merchant
          ? { ...state.board.merchant, lotsRemaining: Math.max(0, state.board.merchant.maxLots - state.merchantLotsSold) }
          : null,
        activeNpcs: state.board.activeNpcs.map((npc) => ({ ...npc, cash: state.npcCash[npc.id] || 0 })),
        containers,
        selection: selected
          ? {
              containerId: selected.id,
              inspectionChoice: state.selectedInspection,
              inspectionResult: state.selectedInspection && selected.inspectionResults
                ? selected.inspectionResults[state.selectedInspection]
                : null
            }
          : null,
        auction: state.auction,
        reveal: state.reveal,
        pendingItems: state.pendingItems,
        warehouse: {
          contractedCapacity: state.warehouse.contractedCapacity,
          activeCapacity: state.warehouse.activeCapacity,
          used: warehouseUsed(),
          rentMonth: state.warehouse.rentMonth,
          lots: state.warehouse.lots.map((lot) => ({
            ...lot,
            stallValue: stallValue(lot),
            marketMultiplier: marketMultiplier(lot),
            merchantEligible: merchantMatches(lot)
          }))
        },
        collections: {
          discovered: state.collections.discovered.slice(),
          ownedFragments: { ...state.collections.ownedFragments },
          completedSets: completedFragmentSets()
        }
      });
    }

    function selectContainer(containerId) {
      assertPhase("board");
      if (resultFor(containerId)) fail("该货柜今日已经结算");
      const container = containerById(containerId);
      state.selectedContainerId = container.id;
      state.selectedInspection = state.containerInspections[container.id] || null;
      state.phase = container.isFog || state.selectedInspection ? "decision" : "inspection";
      return getView();
    }

    function cancelSelection() {
      assertPhase("inspection", "decision");
      state.selectedContainerId = null;
      state.selectedInspection = null;
      state.phase = "board";
      return getView();
    }

    function inspect(action) {
      assertPhase("inspection");
      const container = currentContainer();
      if (!container.inspectionResults || !container.inspectionResults[action]) fail("无效的检查方式");
      if (state.selectedInspection || state.containerInspections[container.id]) fail("每个货柜只能深入检查一次");
      state.selectedInspection = action;
      state.containerInspections[container.id] = action;
      state.phase = "decision";
      return clone(container.inspectionResults[action]);
    }

    function startAuction() {
      assertPhase("decision");
      const container = currentContainer();
      if (!container.isFog && !state.selectedInspection) fail("普通柜竞拍前需要选择一次检查");
      if (state.cash < container.startingBid) fail("现金不足以参加起拍");
      state.auction = {
        containerId: container.id,
        round: 1,
        roundLabel: "试探",
        currentPrice: container.startingBid,
        leaderId: null,
        bids: []
      };
      const openingNpcs = orderedNpcIds(container, 0).filter((npcId) => liveNpcCap(container, npcId) >= container.startingBid);
      if (openingNpcs.length) pushBid(openingNpcs[0], container.startingBid, "opening", 0);
      state.phase = "auction";
      return getView();
    }

    function auctionAction(action) {
      assertPhase("auction");
      if (!["follow", "jump", "fold"].includes(action)) fail("无效的竞拍动作");
      const container = currentContainer();
      const round = state.auction.round;

      if (action === "fold") {
        settleNpcOnly(container);
        return getView();
      }

      if (round === 3) {
        settleSealedRound(container, action);
        return getView();
      }

      const step = BID_STEPS[container.tier] * (round === 1 ? 1 : 2);
      let playerBid;
      if (state.auction.leaderId === "player") {
        playerBid = action === "follow" ? state.auction.currentPrice : state.auction.currentPrice + step;
      } else {
        playerBid = state.auction.currentPrice + (action === "jump" ? step * 2 : step);
      }
      if (playerBid > state.cash) fail("现金不足以继续出价");
      pushBid("player", playerBid, action, round);
      npcOpenResponses(container, round);

      state.auction.round += 1;
      state.auction.roundLabel = state.auction.round === 2 ? "争夺" : "封槌";
      return getView();
    }

    function revealNext() {
      assertPhase("reveal");
      const container = currentContainer();
      const deck = revealDeck(container);
      if (state.reveal.nextIndex >= deck.length) fail("该货柜已经全部揭晓");
      const item = deck[state.reveal.nextIndex];
      state.reveal.revealed.push(clone(item));
      state.reveal.nextIndex += 1;
      markDiscovered(item);

      if (state.reveal.nextIndex >= deck.length) {
        const result = resultFor(container.id);
        if (state.reveal.winnerType === "player") {
          state.pendingItems = deck.map((deckItem) => ({ item: clone(deckItem), resolved: false, action: null }));
          result.status = "disposition";
          state.phase = "disposition";
        } else {
          settleNpcGoodsIfNeeded();
          state.phase = "spectatorResult";
        }
      }
      return clone(item);
    }

    function skipSpectatorReveal() {
      assertPhase("reveal", "spectatorResult");
      if (!state.reveal || state.reveal.winnerType === "player") fail("自己的货柜不能跳过处置");
      settleNpcGoodsIfNeeded();
      state.phase = "spectatorResult";
      return getView();
    }

    function returnToBoard() {
      assertPhase("spectatorResult");
      state.reveal = null;
      state.selectedContainerId = null;
      state.selectedInspection = null;
      state.phase = "board";
      return getView();
    }

    function disposeItem(index, action) {
      assertPhase("disposition");
      if (!["sell", "store"].includes(action)) fail("无效的处置方式");
      const pending = state.pendingItems[index];
      if (!pending) fail("找不到待处置物品");
      if (pending.resolved) fail("该物品已经处置");
      if (action === "sell") {
        state.cash = roundMoney(state.cash + pending.item.quickValue);
      } else {
        storeItem(pending.item);
      }
      pending.resolved = true;
      pending.action = action;
      state.journal.push({ type: "dispose", item: pending.item.name, action, value: action === "sell" ? pending.item.quickValue : 0 });
      completeDispositionIfReady();
      return getView();
    }

    function renewWarehouse() {
      assertPhase("board", "inspection", "decision", "disposition");
      const target = state.warehouse.contractedCapacity;
      if (target <= BASE_WAREHOUSE_CAPACITY) fail("免费仓库不需要续租");
      const currentMonth = monthKey(state.dateKey);
      const alreadyPaid = state.warehouse.rentMonth === currentMonth
        ? state.warehouse.rentPaidThisMonth
        : 0;
      const due = Math.max(0, RENT_BY_CAPACITY[target] - alreadyPaid);
      if (due === 0 && state.warehouse.activeCapacity === target) fail("本月仓租已经付清");
      if (state.cash < due) fail("现金不足以支付本月仓租");
      state.cash = roundMoney(state.cash - due);
      state.warehouse.activeCapacity = target;
      state.warehouse.rentMonth = currentMonth;
      state.warehouse.rentPaidThisMonth = RENT_BY_CAPACITY[target];
      state.journal.push({ type: "warehouseRenew", capacity: target, cost: due });
      return getView();
    }

    function rentWarehouseExpansion() {
      assertPhase("board", "inspection", "decision", "disposition");
      const current = state.warehouse.contractedCapacity;
      if (current >= MAX_WAREHOUSE_CAPACITY) fail(`仓库已经达到 ${MAX_WAREHOUSE_CAPACITY} 格上限`);
      if (state.warehouse.activeCapacity < current) fail("请先续租当前仓库");
      const target = current + 10;
      const targetRent = RENT_BY_CAPACITY[target];
      const alreadyPaid = state.warehouse.rentMonth === monthKey(state.dateKey)
        ? state.warehouse.rentPaidThisMonth
        : 0;
      const due = Math.max(0, targetRent - alreadyPaid);
      if (state.cash < due) fail("现金不足以支付本月仓租");
      state.cash = roundMoney(state.cash - due);
      state.warehouse.contractedCapacity = target;
      state.warehouse.activeCapacity = target;
      state.warehouse.rentMonth = monthKey(state.dateKey);
      state.warehouse.rentPaidThisMonth = targetRent;
      state.journal.push({ type: "warehouseRent", capacity: target, cost: due });
      return getView();
    }

    function sellWarehouseLot(lotId, channel) {
      assertPhase("board", "inspection", "decision", "disposition");
      const saleChannel = channel || "stall";
      if (!["stall", "merchant"].includes(saleChannel)) fail("无效的售卖渠道");
      const index = state.warehouse.lots.findIndex((lot) => lot.lotId === lotId);
      if (index < 0) fail("找不到仓库批次");
      const lot = state.warehouse.lots[index];
      let value = stallValue(lot);
      if (saleChannel === "merchant") {
        if (!merchantMatches(lot)) fail("该批货不符合今日定向收购条件");
        if (lot.type === "trash" && lot.kind === "oddity") {
          value = roundMoney(Math.max(50, Math.abs(lot.neutralValue) * 0.8) * state.board.merchant.premium);
        } else {
          value = roundMoney(stallGrossValue(lot) * state.board.merchant.premium - handlingFee(lot));
        }
        state.merchantLotsSold += 1;
      }
      state.cash = roundMoney(state.cash + value);
      removeOwnedFragments(lot);
      state.warehouse.lots.splice(index, 1);
      state.journal.push({ type: "warehouseSale", lotId, channel: saleChannel, value });
      return getView();
    }

    function claimRecoveryJob() {
      assertPhase("board");
      if (state.recoveryClaimedDate === state.dateKey) fail("今日已经完成过港口临时委托");
      const minimumStart = Math.min(...state.board.containers
        .filter((container) => !resultFor(container.id))
        .map((container) => container.startingBid));
      if (!Number.isFinite(minimumStart)) fail("今日货柜已经全部结算");
      if (state.cash >= minimumStart) fail("当前现金仍可参加最低档拍卖");
      const sellableLot = state.warehouse.lots.find((lot) => stallValue(lot) > 0);
      if (sellableLot) fail("仓库仍有可变卖资产，请先自行处理");
      const restoreTo = Math.max(1400, minimumStart + 100);
      const reward = roundMoney(restoreTo - state.cash);
      state.cash = roundMoney(restoreTo);
      state.recoveryClaimedDate = state.dateKey;
      state.journal.push({ type: "recoveryJob", reward });
      return getView();
    }

    function advanceDay(nextDateKey) {
      assertPhase("board");
      const dateKey = String(nextDateKey);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) fail("日期必须使用 YYYY-MM-DD 格式");
      if (dateKey === state.dateKey) return getView();
      if (dateKey < state.dateKey) fail("不能返回已经结束的日期");

      const oldMonth = monthKey(state.dateKey);
      const newMonth = monthKey(dateKey);
      if (oldMonth !== newMonth && state.warehouse.contractedCapacity > BASE_WAREHOUSE_CAPACITY) {
        const rent = RENT_BY_CAPACITY[state.warehouse.contractedCapacity];
        state.warehouse.rentMonth = newMonth;
        state.warehouse.rentPaidThisMonth = 0;
        if (state.cash >= rent) {
          state.cash = roundMoney(state.cash - rent);
          state.warehouse.activeCapacity = state.warehouse.contractedCapacity;
          state.warehouse.rentPaidThisMonth = rent;
          state.journal.push({ type: "monthlyRent", month: newMonth, capacity: state.warehouse.contractedCapacity, cost: rent });
        } else {
          state.warehouse.activeCapacity = BASE_WAREHOUSE_CAPACITY;
          state.journal.push({ type: "warehouseLocked", month: newMonth, capacity: state.warehouse.contractedCapacity });
        }
      }

      state.dateKey = dateKey;
      const npcStates = Object.fromEntries(
        Object.entries(state.npcCash).map(([npcId, cash]) => [npcId, { cash }])
      );
      state.board = generator.createDailyBoard({
        dateKey,
        saveSeed: state.saveSeed,
        totalAssets: totalAssets(),
        npcStates
      });
      for (const npc of state.board.activeNpcs) {
        if (!Number.isFinite(state.npcCash[npc.id])) state.npcCash[npc.id] = npc.cash;
      }
      state.selectedContainerId = null;
      state.selectedInspection = null;
      state.containerInspections = {};
      state.auction = null;
      state.reveal = null;
      state.pendingItems = [];
      state.containerResults = {};
      state.merchantLotsSold = 0;
      state.journal.push({ type: "newDay", dateKey, boardId: state.board.boardId });
      return getView();
    }

    function exportSave() {
      return clone(state);
    }

    return Object.freeze({
      getView,
      selectContainer,
      cancelSelection,
      inspect,
      startAuction,
      auctionAction,
      revealNext,
      skipSpectatorReveal,
      returnToBoard,
      disposeItem,
      renewWarehouse,
      rentWarehouseExpansion,
      sellWarehouseLot,
      claimRecoveryJob,
      advanceDay,
      exportSave
    });
  }

  return Object.freeze({ VERSION, createGame });
});
