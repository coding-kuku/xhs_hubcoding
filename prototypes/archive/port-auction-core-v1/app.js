'use strict';

const STARTING_MONEY = 6000;
const STORAGE_KEY = 'port-auction-core-v1-collection';

const scenarios = [
  {
    id: 'camera-crate',
    code: 'KB-1978',
    name: '17号神户转运柜',
    manifest: '旧办公设备 · 部分受潮',
    openingBid: 800,
    surfaceValue: 2500,
    marketReference: '同类未清点器材柜通常在¥1,800–¥3,200之间成交。',
    theme: 'camera',
    publicHint: '柜门右侧露出一角硬质防震箱。',
    inspections: [
      { icon: '🔒', title: '查看封条', label: '判断是否换货', result: '封条是原装铅封，编号与模糊货单一致。货物大概率没被二次调包。' },
      { icon: '👂', title: '敲箱体', label: '听内部动静', result: '回声很短，内部塞得较满；右后方传来金属小零件的轻响。' }
    ],
    items: [
      { icon: '📁', name: '泡水文件箱', note: '基本只能按废纸处理', value: 260 },
      { icon: '💡', name: '摄影灯与支架一批', note: '线路老化，但零件齐全', value: 1250 },
      { id: 'rangefinder-1978', icon: '📷', name: '1978年旁轴相机', note: '保存出奇完整，镜头编号连续', value: 4800, featured: true, rarity: '稀有 · 黄金年代摄影器材', description: '防震箱挡住了大部分海水。取景器仍然明亮，是“黄金年代摄影器材”收藏组的一件。' }
    ],
    comments: ['门口那堆文件看着不妙……', '等等，后面那个黑箱像专业器材。', '老陈懂相机，他怎么还没退出？']
  },
  {
    id: 'hotel-clearance',
    code: 'HT-404',
    name: '04号酒店清仓柜',
    manifest: '酒店用品 · 数量不详',
    openingBid: 700,
    surfaceValue: 1300,
    marketReference: '同类轻泡清仓柜通常只值¥900–¥1,700。',
    theme: 'hotel',
    publicHint: '纸箱很多，但整体吃水明显偏浅。',
    inspections: [
      { icon: '🔒', title: '查看封条', label: '判断是否换货', result: '原封条被剪过，后来又补了一枚普通塑料封签。箱内很可能被挑过。' },
      { icon: '⚖️', title: '核对重量', label: '查看吊秤数据', result: '整柜只有1.1吨，比同体积布草柜轻了近一半。里面大概率是轻泡货。' }
    ],
    items: [
      { icon: '🧺', name: '旧浴室防滑垫一批', note: '清洗后还能打包处理', value: 420 },
      { icon: '🩴', name: '酒店拖鞋八百双', note: '遗憾的是已经过了印字时效', value: 760 },
      { id: 'left-skates', icon: '🛼', name: '八十只左脚轮滑鞋', note: '没有一只右脚', value: 120, featured: true, rarity: '奇物 · 港口迷惑行为', description: '你数了三遍，确实全是左脚。直播间笑翻了，但二手商只肯按废塑料收。' }
    ],
    comments: ['这么轻？不会全是泡沫吧。', '拖鞋也能卖，前提是别拍贵。', '阿强笑这么开心，我有点害怕。']
  },
  {
    id: 'marine-relics',
    code: 'OS-1936',
    name: '31号远洋旧货柜',
    manifest: '船舶装饰件 · 金属配件',
    openingBid: 1100,
    surfaceValue: 3000,
    marketReference: '普通船用旧件柜多在¥2,200–¥3,800之间，年代件另计。',
    theme: 'marine',
    publicHint: '柜体锈得厉害，四角却额外加装了固定扣。',
    inspections: [
      { icon: '🔍', title: '看门缝', label: '寻找可见轮廓', result: '麻布下面露出黄铜弧面，还有一排年代很久的手工铆钉。' },
      { icon: '👂', title: '敲箱体', label: '判断内部结构', result: '左侧是松散绳索，右后方有一个沉重物件被单独固定在柜壁上。' }
    ],
    items: [
      { icon: '🪢', name: '旧船用绳索', note: '适合装饰店批量收走', value: 620 },
      { icon: '⚓', name: '黄铜舱门配件', note: '氧化明显，材质是真的', value: 1380 },
      { id: 'ship-clock-1936', icon: '🕰️', name: '1936年远洋船钟', note: '背板刻有船厂编号', value: 3600, featured: true, rarity: '珍稀 · 远洋船员遗物', description: '钟面有盐蚀，但机芯仍可修复。背板编号对应一艘退役邮轮，是“远洋船员遗物”收藏组的一件。' }
    ],
    comments: ['这种锈，修理费怕是不低。', '黄铜是真黄铜，重量骗不了人。', '老陈看到船件就容易上头。']
  },
  {
    id: 'gallery-props',
    code: 'AR-021',
    name: '21号画廊撤展柜',
    manifest: '展览道具 · 装饰画框',
    openingBid: 900,
    surfaceValue: 2300,
    marketReference: '普通布展物料柜多在¥1,500–¥3,000之间，原作例外。',
    theme: 'art',
    publicHint: '木箱上的画廊贴纸是真的，但日期已经褪色。',
    inspections: [
      { icon: '🔒', title: '查看封条', label: '判断是否原柜', result: '海关封条完整，木箱上还有未拆的展览回运标签。至少这批货没有中途换柜。' },
      { icon: '🔍', title: '看门缝', label: '观察包装方式', result: '前排廉价画框后面，有一只单独包了防潮纸的窄木盒。' }
    ],
    items: [
      { icon: '🖼️', name: '空画框十二只', note: '边角磕碰，仍能成批出售', value: 680 },
      { icon: '🎭', name: '展览用石膏头像', note: '普通教学道具', value: 540 },
      { id: 'harbor-sketch', icon: '✏️', name: '港湾速写原稿', note: '落款与展览记录吻合', value: 2950, featured: true, rarity: '稀有 · 城市记忆', description: '防潮纸里是一张港湾速写。它不算名家大作，却记录了旧码头拆除前的最后一个黄昏。' }
    ],
    comments: ['画廊柜最怕全是布展垃圾。', '单独包起来的东西一般有说法。', '别光看签名，包装和来路更重要。']
  }
];

const npcTemplates = [
  {
    id: 'chen',
    name: '老陈',
    avatar: '🧔🏻',
    bankroll: 7200,
    trait: '识旧货，遇船件会追',
    preferences: { camera: 1.08, hotel: 0.58, marine: 1.18, art: 0.88 },
    estimateRange: [0.62, 1.08],
    jumpChance: 0.16
  },
  {
    id: 'qiang',
    name: '阿强',
    avatar: '🧢',
    bankroll: 6800,
    trait: '急着翻本，容易上头',
    preferences: { camera: 0.92, hotel: 1.02, marine: 0.83, art: 1.04 },
    estimateRange: [0.52, 1.34],
    jumpChance: 0.42
  }
];

const screens = Array.from(document.querySelectorAll('.screen'));
const elements = {
  money: document.querySelector('#money-stat'),
  heat: document.querySelector('#heat-stat'),
  collection: document.querySelector('#collection-stat'),
  start: document.querySelector('#start-button'),
  containerName: document.querySelector('#container-name'),
  containerCode: document.querySelector('#container-code'),
  openingBidChip: document.querySelector('#opening-bid-chip'),
  manifest: document.querySelector('#manifest-text'),
  inspectionActions: document.querySelector('#inspection-actions'),
  inspectionResult: document.querySelector('#inspection-result'),
  enterAuction: document.querySelector('#enter-auction-button'),
  roundTitle: document.querySelector('#round-title'),
  roundDots: Array.from(document.querySelectorAll('.round-dots span')),
  currentPrice: document.querySelector('#current-price'),
  currentLeader: document.querySelector('#current-leader'),
  npcRow: document.querySelector('#npc-row'),
  auctionLog: document.querySelector('#auction-log'),
  follow: document.querySelector('#follow-button'),
  followPrice: document.querySelector('#follow-price'),
  jump: document.querySelector('#jump-button'),
  jumpPrice: document.querySelector('#jump-price'),
  fold: document.querySelector('#fold-button'),
  openingKicker: document.querySelector('#opening-kicker'),
  openingTitle: document.querySelector('#opening-title'),
  winningPriceChip: document.querySelector('#winning-price-chip'),
  openingStage: document.querySelector('#opening-stage'),
  doorContainer: document.querySelector('#door-container'),
  sealHandle: document.querySelector('#seal-handle'),
  dragHint: document.querySelector('#drag-hint'),
  revealArea: document.querySelector('#reveal-area'),
  lootStack: document.querySelector('#loot-stack'),
  reveal: document.querySelector('#reveal-button'),
  featuredItemCard: document.querySelector('#featured-item-card'),
  bulkSummary: document.querySelector('#bulk-summary'),
  sell: document.querySelector('#sell-button'),
  collect: document.querySelector('#collect-button'),
  resultKicker: document.querySelector('#result-kicker'),
  resultTitle: document.querySelector('#result-title'),
  resultEquation: document.querySelector('#result-equation'),
  resultStory: document.querySelector('#result-story'),
  resultTags: document.querySelector('#result-tags'),
  retry: document.querySelector('#retry-button'),
  back: document.querySelector('#back-button'),
  liveMessage: document.querySelector('#live-message')
};

const state = {
  money: STARTING_MONEY,
  heat: 0,
  collection: loadCollection(),
  scenario: null,
  previousScenarioId: null,
  inspected: false,
  round: 1,
  currentPrice: 0,
  leader: null,
  playerBid: 0,
  npcs: [],
  playerWon: false,
  winner: null,
  winningBid: 0,
  revealIndex: 0,
  auctionLocked: false,
  revealLocked: false,
  settled: false,
  sealStartY: null,
  sealDragging: false,
  collectedFeatured: false
};

function loadCollection() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveCollection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.collection));
  } catch (error) {
    // 存档不可用时不影响新局。
  }
}

function money(value) {
  return `¥${Math.max(0, Math.round(value)).toLocaleString('zh-CN')}`;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function roundToHundred(value) {
  return Math.max(100, Math.round(value / 100) * 100);
}

function getTotalValue(scenario = state.scenario) {
  return scenario.items.reduce((sum, item) => sum + item.value, 0);
}

function getFeaturedItem() {
  return state.scenario.items.find((item) => item.featured);
}

function getIncrement(price = state.currentPrice) {
  if (price < 2000) return 200;
  if (price < 4000) return 400;
  return 600;
}

function showScreen(id) {
  screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.id === id);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStats() {
  elements.money.textContent = money(state.money);
  elements.heat.textContent = state.heat.toLocaleString('zh-CN');
  elements.collection.textContent = state.collection.length.toLocaleString('zh-CN');
}

function setLiveMessage(message) {
  elements.liveMessage.textContent = `直播间：${message}`;
}

function chooseScenario() {
  const choices = scenarios.filter((scenario) => scenario.id !== state.previousScenarioId);
  const selected = choices[Math.floor(Math.random() * choices.length)];
  state.previousScenarioId = selected.id;
  return selected;
}

function setupNpc(template, scenario) {
  const [low, high] = template.estimateRange;
  // NPC只根据可见类型的表面估值判断，不读取柜内真实总价。
  const imperfectEstimate = scenario.surfaceValue * randomBetween(low, high);
  const preference = template.preferences[scenario.theme] || 1;
  const maxBid = Math.min(template.bankroll, roundToHundred(imperfectEstimate * preference));

  return {
    ...template,
    maxBid,
    active: true,
    currentBid: 0,
    reaction: '正在观察货柜'
  };
}

function startPrototype() {
  state.money = STARTING_MONEY;
  state.heat = 0;
  state.scenario = chooseScenario();
  state.inspected = false;
  state.round = 1;
  state.currentPrice = state.scenario.openingBid;
  state.leader = null;
  state.playerBid = 0;
  state.npcs = npcTemplates.map((template) => setupNpc(template, state.scenario));
  state.playerWon = false;
  state.winner = null;
  state.winningBid = 0;
  state.revealIndex = 0;
  state.auctionLocked = false;
  state.revealLocked = false;
  state.settled = false;
  state.collectedFeatured = false;

  updateStats();
  renderInspection();
  showScreen('inspect-screen');
  setLiveMessage(`新柜到场：${state.scenario.publicHint}`);
}

function renderInspection() {
  const scenario = state.scenario;
  elements.containerName.textContent = scenario.name;
  elements.containerCode.textContent = scenario.code;
  elements.openingBidChip.textContent = `起拍 ${money(scenario.openingBid)}`;
  elements.manifest.textContent = scenario.manifest;
  elements.inspectionResult.hidden = true;
  elements.enterAuction.hidden = true;
  elements.inspectionActions.hidden = false;
  elements.inspectionActions.replaceChildren();

  scenario.inspections.forEach((inspection) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inspect-button';
    button.innerHTML = `${inspection.icon} ${inspection.title}<small>${inspection.label}</small>`;
    button.addEventListener('click', () => selectInspection(inspection));
    elements.inspectionActions.append(button);
  });
}

function selectInspection(inspection) {
  if (state.inspected) return;
  state.inspected = true;
  elements.inspectionActions.hidden = true;
  elements.inspectionResult.textContent = `关键线索：${inspection.result} 行情参考：${state.scenario.marketReference}`;
  elements.inspectionResult.hidden = false;
  elements.enterAuction.hidden = false;
  setLiveMessage('这条线索有用，但还不能直接算出整柜价格。');
}

function startAuction() {
  state.round = 1;
  state.currentPrice = state.scenario.openingBid;
  state.leader = null;
  state.playerBid = 0;
  state.auctionLocked = false;
  elements.auctionLog.textContent = '拍卖师：第一锤，谁先举牌？';
  renderAuction();
  showScreen('auction-screen');
  setLiveMessage(state.scenario.comments[0]);
}

function getLeaderLabel() {
  if (!state.leader) return '拍卖师等待第一口价';
  if (state.leader === 'player') return '你暂时领先';
  const npc = state.npcs.find((candidate) => candidate.id === state.leader);
  return npc ? `${npc.name}暂时领先` : '等待下一口价';
}

function getPlayerBidOptions() {
  const increment = getIncrement();
  // 即使已领先，再出手也必须至少加一个公开档位，不允许零成本耗轮次探底。
  const follow = state.currentPrice + increment;
  const jump = Math.max(follow + increment, state.currentPrice + increment * 3);
  return { follow, jump };
}

function renderAuction() {
  const titles = ['第一锤 · 试探', '第二锤 · 争夺', '第三锤 · 同时报价'];
  elements.roundTitle.textContent = titles[state.round - 1];
  elements.currentPrice.textContent = money(state.currentPrice);
  elements.currentLeader.textContent = getLeaderLabel();

  elements.roundDots.forEach((dot, index) => {
    dot.classList.toggle('is-current', index === state.round - 1);
    dot.classList.toggle('is-done', index < state.round - 1);
  });

  renderNpcs();
  const options = getPlayerBidOptions();
  const leadingText = state.leader === 'player' ? '加码守住' : '稳跟';
  elements.follow.querySelector('span').textContent = state.round === 3 ? `${leadingText}最终价` : leadingText;
  elements.followPrice.textContent = money(options.follow);
  elements.jumpPrice.textContent = money(options.jump);
  elements.follow.disabled = state.auctionLocked || options.follow > state.money;
  elements.jump.disabled = state.auctionLocked || options.jump > state.money;
  elements.fold.disabled = state.auctionLocked;
}

function renderNpcs() {
  elements.npcRow.replaceChildren();
  state.npcs.forEach((npc) => {
    const card = document.createElement('article');
    card.className = `npc-card${npc.active ? '' : ' is-out'}`;
    const currentBid = npc.currentBid > 0 ? `已报 ${money(npc.currentBid)}` : `资金 ${money(npc.bankroll)}`;
    card.innerHTML = `
      <span class="npc-state"></span>
      <div class="npc-avatar">${npc.avatar}</div>
      <div class="npc-copy">
        <strong>${npc.name}</strong>
        <small>${npc.trait} · ${currentBid}</small>
        <em>${npc.reaction}</em>
      </div>
    `;
    elements.npcRow.append(card);
  });
}

function placePlayerBid(kind) {
  if (state.auctionLocked) return;
  state.auctionLocked = true;
  const options = getPlayerBidOptions();
  const amount = kind === 'jump' ? options.jump : options.follow;
  if (amount > state.money) {
    state.auctionLocked = false;
    return;
  }

  if (state.round === 3) {
    resolveFinalRound(amount, kind);
    return;
  }

  state.playerBid = amount;
  state.currentPrice = amount;
  state.leader = 'player';
  const logParts = [`你报出${money(amount)}${kind === 'jump' ? '，直接跳价压场' : ''}。`];
  const respondingNpcs = state.npcs.filter((npc) => npc.active);

  respondingNpcs.forEach((npc) => {
    const increment = getIncrement(state.currentPrice);
    const minimumResponse = state.currentPrice + increment;
    if (npc.maxBid < minimumResponse) {
      npc.active = false;
      npc.reaction = npc.id === 'qiang' ? '咬了咬牙，还是放下牌子' : '看了一眼价格，主动退出';
      logParts.push(`${npc.name}退出。`);
      return;
    }

    let response = minimumResponse;
    if (Math.random() < npc.jumpChance && npc.maxBid >= minimumResponse + increment) {
      response = Math.min(npc.maxBid, minimumResponse + increment);
    }
    npc.currentBid = response;
    state.currentPrice = response;
    state.leader = npc.id;
    const pressure = response / npc.maxBid;
    npc.reaction = pressure > 0.84 ? '嘴上很硬，手已经慢了' : npc.id === 'qiang' ? '几乎没犹豫就跟了' : '眯着眼又举了一次牌';
    logParts.push(`${npc.name}追到${money(response)}。`);
  });

  elements.auctionLog.textContent = logParts.join(' ');
  const activeNpcs = state.npcs.filter((npc) => npc.active);
  if (activeNpcs.length === 0 && state.leader === 'player') {
    concludeAuction('player', state.playerBid);
    return;
  }

  state.round += 1;
  renderAuction();
  setLiveMessage(state.scenario.comments[Math.min(state.round - 1, state.scenario.comments.length - 1)]);
  window.setTimeout(() => {
    state.auctionLocked = false;
    renderAuction();
  }, 320);
}

function resolveFinalRound(playerFinalBid, kind) {
  state.playerBid = playerFinalBid;
  const finalBids = [{ id: 'player', name: '你', bid: playerFinalBid }];
  const previousLeader = state.leader;

  state.npcs.forEach((npc) => {
    if (!npc.active) return;
    const increment = getIncrement(state.currentPrice);
    const minimum = state.currentPrice + (state.leader === npc.id ? 0 : increment);
    if (npc.maxBid < minimum) {
      npc.reaction = '最终选择退出';
      npc.active = false;
      return;
    }

    const appetite = npc.id === 'qiang' ? randomBetween(0.84, 1) : randomBetween(0.72, 0.96);
    const bid = Math.max(minimum, npc.currentBid, roundToHundred(npc.maxBid * appetite));
    npc.currentBid = Math.min(npc.maxBid, bid);
    npc.reaction = '封住报价，等最后落槌';
    finalBids.push({ id: npc.id, name: npc.name, bid: npc.currentBid });
  });

  finalBids.sort((a, b) => b.bid - a.bid);
  const topBids = finalBids.filter((entry) => entry.bid === finalBids[0].bid);
  const defendingWinner = topBids.find((entry) => entry.id === previousLeader);
  const winner = defendingWinner || topBids[Math.floor(Math.random() * topBids.length)];
  const bidsText = finalBids.map((entry) => `${entry.name}${money(entry.bid)}`).join('、');
  const tieResult = defendingWinner
    ? `${winner.name}与人同价，凭上一锤领先守擂成交。`
    : `${winner.name}与人同价，抽签后成交。`;
  elements.auctionLog.textContent = `最后一锤同时揭价：${bidsText}。${topBids.length > 1 ? tieResult : `${winner.name}最高。`}`;
  renderNpcs();
  elements.follow.disabled = true;
  elements.jump.disabled = true;
  elements.fold.disabled = true;

  window.setTimeout(() => concludeAuction(winner.id, winner.bid, kind), 900);
}

function foldAuction() {
  if (state.auctionLocked) return;
  state.auctionLocked = true;
  const contenders = state.npcs.filter((npc) => npc.active && npc.maxBid >= state.currentPrice);
  if (contenders.length === 0) {
    concludeAuction('none', state.scenario.openingBid);
    return;
  }

  contenders.sort((a, b) => b.maxBid - a.maxBid);
  const winner = contenders[0];
  const secondMax = contenders[1] ? contenders[1].maxBid : state.currentPrice;
  const competitivePrice = secondMax + (contenders[1] ? getIncrement(secondMax) : 0);
  const winningBid = Math.min(winner.maxBid, Math.max(state.currentPrice, competitivePrice));
  winner.currentBid = winningBid;
  winner.reaction = '接下货柜，准备开门';
  state.npcs.filter((npc) => npc.id !== winner.id).forEach((npc) => {
    npc.active = false;
    npc.reaction = '没有继续追价';
  });
  concludeAuction(winner.id, winningBid);
}

function concludeAuction(winnerId, winningBid) {
  state.winner = winnerId;
  state.winningBid = winningBid;
  state.playerWon = winnerId === 'player';
  state.revealIndex = 0;

  if (state.playerWon) {
    state.money -= winningBid;
    elements.openingKicker.textContent = '落槌 · 货柜归你';
    elements.openingTitle.textContent = '亲手开仓';
    elements.dragHint.textContent = '按住封条向下拖，或点一下';
  } else {
    const npc = state.npcs.find((candidate) => candidate.id === winnerId);
    elements.openingKicker.textContent = '你已放手 · 旁观结果';
    elements.openingTitle.textContent = npc ? `${npc.name}来开仓` : '本柜流拍';
    elements.dragHint.textContent = '看看你是成功避坑，还是错过宝柜';
  }

  elements.winningPriceChip.textContent = `成交 ${money(winningBid)}`;
  elements.doorContainer.classList.remove('is-open');
  elements.sealHandle.style.transform = 'translate(-50%, 0)';
  elements.openingStage.hidden = false;
  elements.revealArea.hidden = true;
  elements.lootStack.replaceChildren();
  updateStats();
  showScreen('opening-screen');

  if (!state.playerWon) {
    window.setTimeout(openDoors, 650);
  } else {
    setLiveMessage('落槌了！拖下封条，看看这一锤值不值。');
  }
}

function openDoors() {
  if (elements.doorContainer.classList.contains('is-open')) return;
  elements.doorContainer.classList.add('is-open');
  elements.dragHint.textContent = '柜门已开，里面还压着三层货';
  window.setTimeout(() => {
    elements.openingStage.hidden = true;
    elements.revealArea.hidden = false;
    state.revealLocked = false;
    elements.reveal.disabled = false;
    updateRevealButton();
  }, 720);
}

function updateRevealButton() {
  const labels = ['掀开第一层', '查看遮挡物后方', '打开最后的压轴箱'];
  elements.reveal.textContent = labels[state.revealIndex] || '完成清点';
}

function revealNextItem() {
  const item = state.scenario.items[state.revealIndex];
  if (!item) return;

  const card = document.createElement('article');
  card.className = `loot-card${item.featured ? ' is-featured' : ''}`;
  card.innerHTML = `
    <div class="loot-icon">${item.icon}</div>
    <div class="loot-copy">
      <strong>${item.name}</strong>
      <small>${item.note}</small>
    </div>
    <div class="loot-value">${money(item.value)}</div>
  `;
  elements.lootStack.append(card);
  state.revealIndex += 1;

  if (item.featured) {
    setLiveMessage(item.value >= 2500 ? `压轴出货！${item.name}把直播间炸醒了。` : `${item.name}太离谱了，弹幕全在笑。`);
  } else {
    setLiveMessage(state.scenario.comments[Math.min(state.revealIndex - 1, state.scenario.comments.length - 1)]);
  }

  if (state.revealIndex >= state.scenario.items.length) {
    elements.reveal.textContent = state.playerWon ? '清点完成，决定去留' : '查看这次放手是否正确';
  } else {
    updateRevealButton();
  }
}

function handleRevealButton() {
  if (state.revealLocked || state.settled) return;
  if (state.revealIndex < state.scenario.items.length) {
    state.revealLocked = true;
    elements.reveal.disabled = true;
    revealNextItem();
    window.setTimeout(() => {
      state.revealLocked = false;
      elements.reveal.disabled = false;
    }, 240);
    return;
  }

  if (state.playerWon) {
    renderDecision();
    showScreen('decision-screen');
  } else {
    finishSpectatorResult();
  }
}

function renderDecision() {
  const featured = getFeaturedItem();
  const bulkValue = getTotalValue() - featured.value;
  const isCollected = state.collection.includes(featured.id);

  elements.featuredItemCard.innerHTML = `
    <div class="featured-top">
      <div class="loot-icon">${featured.icon}</div>
      <div>
        <h3>${featured.name}</h3>
        <p>${featured.rarity}</p>
      </div>
    </div>
    <p class="featured-description">${featured.description}</p>
  `;
  elements.bulkSummary.innerHTML = `<span>其余货物自动回收</span><strong>${money(bulkValue)}</strong>`;
  elements.sell.disabled = false;
  elements.sell.textContent = `全部出售 · 收回${money(getTotalValue())}`;
  elements.collect.disabled = isCollected;
  elements.collect.textContent = isCollected
    ? '已有同款 · 本次直接出售'
    : `收藏压轴物 · 放弃${money(featured.value)}`;
  setLiveMessage('卖掉保留现金收益，留下则变成收藏战绩。');
}

function finishPlayerResult(collectFeatured) {
  if (state.settled) return;
  state.settled = true;
  elements.sell.disabled = true;
  elements.collect.disabled = true;
  const featured = getFeaturedItem();
  const totalValue = getTotalValue();
  const bulkValue = totalValue - featured.value;
  const keptFeatured = collectFeatured && !state.collection.includes(featured.id);
  const realizedValue = keptFeatured ? bulkValue : totalValue;
  state.money += realizedValue;
  state.collectedFeatured = keptFeatured;

  if (keptFeatured) {
    state.collection.push(featured.id);
    saveCollection();
  }

  const profit = realizedValue - state.winningBid;
  state.heat += profit >= 0 ? 6 : 11;
  updateStats();
  renderResult({
    paid: state.winningBid,
    returned: realizedValue,
    profit,
    title: getResultTitle(profit, keptFeatured),
    story: keptFeatured
      ? `你把「${featured.name}」留在了收藏柜。现金收益变少，但这件东西记住了它是怎样从${state.scenario.name}里被你抢出来的。`
      : getProfitStory(profit),
    tags: keptFeatured
      ? ['新增实体收藏', featured.rarity, `直播热度 +${profit >= 0 ? 6 : 11}`]
      : [profit >= 0 ? '现金回笼' : '本柜亏损', featured.rarity, `直播热度 +${profit >= 0 ? 6 : 11}`]
  });
}

function getResultTitle(profit, collected) {
  if (collected && profit >= 0) return '既有藏品，也没伤筋骨';
  if (collected) return '为收藏交了一次学费';
  if (profit >= 2500) return '这一锤，真的翻身了';
  if (profit > 0) return '看准了，小赚离场';
  if (profit === 0) return '不赚不亏，刚好回本';
  if (profit > -1200) return '判断失手，但还能再来';
  return '这一柜，拍成了事故现场';
}

function getProfitStory(profit) {
  const featured = getFeaturedItem();
  if (profit > 0) {
    return `你把「${featured.name}」连同其余货物全部出手。本柜净赚${money(profit)}，这次对线索和价格的判断得到了验证。`;
  }
  if (profit === 0) return `你把「${featured.name}」连同其余货物全部出手，收回的金额与成交价刚好相抵。`;
  return `「${featured.name}」没能救回过高的成交价。本柜亏了${money(Math.abs(profit))}，但柜内线索与结果能够对应，不是系统临时改了答案。`;
}

function finishSpectatorResult() {
  if (state.settled) return;
  state.settled = true;
  elements.reveal.disabled = true;
  const totalValue = getTotalValue();
  const avoidedLoss = state.winningBid > totalValue;
  const brokeEven = state.winningBid === totalValue;
  const difference = Math.abs(totalValue - state.winningBid);
  const winnerNpc = state.npcs.find((npc) => npc.id === state.winner);

  if (winnerNpc) {
    winnerNpc.bankroll = Math.max(0, winnerNpc.bankroll - state.winningBid + totalValue);
  }
  state.heat += avoidedLoss ? 12 : 5;
  updateStats();

  renderResult({
    paid: 0,
    returned: 0,
    profit: 0,
    title: avoidedLoss ? '漂亮放手，成功避坑' : brokeEven ? '放手后才知道，这柜刚好持平' : '这次放手，错过了一柜好货',
    story: avoidedLoss
      ? `${winnerNpc ? winnerNpc.name : '对手'}用${money(state.winningBid)}拍下价值${money(totalValue)}的货，血亏${money(difference)}。对手也会为误判付钱。`
      : brokeEven
        ? `${winnerNpc ? winnerNpc.name : '对手'}的成交价与货值刚好相等。你没有损失现金，也记住了这类线索。`
        : `${winnerNpc ? winnerNpc.name : '对手'}用${money(state.winningBid)}拿到价值${money(totalValue)}的货，捡漏${money(difference)}。你没有损失现金，但记住了这类线索。`,
    tags: avoidedLoss
      ? ['成功避坑', '对手本柜也会盈亏', '直播热度 +12']
      : [brokeEven ? '判断持平' : '错失宝柜', '获得鉴货经验', '直播热度 +5']
  });
}

function renderResult({ paid, returned, profit, title, story, tags }) {
  elements.resultKicker.textContent = state.playerWon ? '本柜战报' : '旁观战报';
  elements.resultTitle.textContent = title;
  const profitClass = profit < 0 ? 'loss' : 'profit';
  elements.resultEquation.innerHTML = `
    <div class="equation-cell"><span>成交支出</span><strong>${money(paid)}</strong></div>
    <div class="equation-cell"><span>现金回收</span><strong>${money(returned)}</strong></div>
    <div class="equation-cell ${profitClass}"><span>本柜净额</span><strong>${profit < 0 ? '-' : '+'}${money(Math.abs(profit))}</strong></div>
  `;
  elements.resultStory.textContent = story;
  elements.resultTags.replaceChildren();
  tags.forEach((tag) => {
    const chip = document.createElement('span');
    chip.textContent = tag;
    elements.resultTags.append(chip);
  });
  setLiveMessage(profit < 0 ? '亏也要亏得有故事。下一柜别再被情绪带走。' : '有人说见好就收，也有人已经开始催下一柜。');
  showScreen('result-screen');
}

function startSealDrag(event) {
  if (!state.playerWon || elements.doorContainer.classList.contains('is-open')) return;
  state.sealDragging = true;
  state.sealStartY = event.clientY;
  elements.sealHandle.setPointerCapture(event.pointerId);
}

function moveSeal(event) {
  if (!state.sealDragging) return;
  const delta = Math.max(0, Math.min(82, event.clientY - state.sealStartY));
  elements.sealHandle.style.transform = `translate(-50%, ${delta}px)`;
  if (delta >= 66) {
    state.sealDragging = false;
    openDoors();
  }
}

function stopSealDrag() {
  if (!state.sealDragging) return;
  state.sealDragging = false;
  elements.sealHandle.style.transform = 'translate(-50%, 0)';
}

function handleSealKeyboard(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openDoors();
  }
}

elements.start.addEventListener('click', startPrototype);
elements.enterAuction.addEventListener('click', startAuction);
elements.follow.addEventListener('click', () => placePlayerBid('follow'));
elements.jump.addEventListener('click', () => placePlayerBid('jump'));
elements.fold.addEventListener('click', foldAuction);
elements.reveal.addEventListener('click', handleRevealButton);
elements.sell.addEventListener('click', () => finishPlayerResult(false));
elements.collect.addEventListener('click', () => finishPlayerResult(true));
elements.retry.addEventListener('click', startPrototype);
elements.back.addEventListener('click', () => {
  state.money = STARTING_MONEY;
  state.heat = 0;
  updateStats();
  setLiveMessage('港口信号已接通');
  showScreen('intro-screen');
});
elements.sealHandle.addEventListener('pointerdown', startSealDrag);
elements.sealHandle.addEventListener('pointermove', moveSeal);
elements.sealHandle.addEventListener('pointerup', stopSealDrag);
elements.sealHandle.addEventListener('pointercancel', stopSealDrag);
elements.sealHandle.addEventListener('keydown', handleSealKeyboard);
elements.sealHandle.addEventListener('click', openDoors);

updateStats();
