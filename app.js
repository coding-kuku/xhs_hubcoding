(function startPortAuctionGame() {
  "use strict";

  const SAVE_KEY = "port-auction-game-save-v2";
  const META_KEY = "port-auction-game-meta-v2";
  const BID_STEPS = { low: 50, medium: 100, high: 200, bonded: 500, legacy: 1000 };
  const RENT_BY_CAPACITY = { 50: 0, 60: 500, 70: 1300, 80: 2500, 90: 4300, 100: 7000 };
  const MAX_WAREHOUSE_CAPACITY = 100;
  const TYPE_LABELS = {
    ordinary: "普通货物",
    collectible: "高级货品",
    fragment: "宝藏碎片",
    trash: "垃圾异物"
  };
  const TYPE_SYMBOLS = { ordinary: "货", collectible: "藏", fragment: "片", trash: "废" };
  const FRAGMENT_SETS = {
    "沉船航海图": ["沉船航海图·西北角", "沉船航海图·东北角", "沉船航海图·西南角", "沉船航海图·东南角"],
    "黄铜星盘": ["黄铜星盘·刻度环", "黄铜星盘·星针", "黄铜星盘·悬臂", "黄铜星盘·底盘"],
    "消失的剧院": ["消失的剧院·红玻璃", "消失的剧院·蓝玻璃", "消失的剧院·金徽片", "消失的剧院·铭牌"]
  };
  const VISUAL_BY_NAME = {
    "瑞士陀飞轮腕表": "luxury-0", "满钻高级腕表": "luxury-1", "手工头层皮包": "luxury-2",
    "高级旅行箱": "luxury-3", "设计师礼服整批": "luxury-4", "限量球鞋批货": "luxury-5",
    "精品羊绒大衣": "luxury-6", "设计师眼镜陈列盘": "luxury-7", "数字电影摄影机": "luxury-8",
    "广播级变焦镜头": "premium-0", "专业电影无人机套装": "premium-1", "旗舰落地音箱对箱": "premium-2",
    "钻石珠宝套装": "premium-3", "足金现代摆件": "premium-4", "当代限量版画": "premium-5",
    "当代琉璃雕塑": "premium-6", "高性能中置跑车": "premium-7", "稀有高性能摩托": "premium-8",
    "老式旁轴相机": "vintage-0", "老船罗盘": "vintage-4"
  };
  const NPC_ATLAS_INDEX = { zhao: 0, qiao: 1, ayong: 2, luo: 3, tang: 4 };
  const SET_ATLAS_INDEX = { "沉船航海图": 0, "黄铜星盘": 1, "消失的剧院": 2 };
  const CATEGORY_ICON_PATHS = {
    commercial: '<path d="M4 8h16v11H4zM7 8V5h10v3M4 12h16M9 12v3h6v-3"/>',
    camera: '<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    tools: '<path d="M14 5a4 4 0 0 0-4.7 5.5L4 15.8 8.2 20l5.3-5.3A4 4 0 0 0 19 10l-3 3-2-2 3-3a4 4 0 0 0-3-3z"/>',
    anchor: '<path d="M12 3v15M8 7h8M5 13a7 7 0 0 0 14 0M3 14l2-2 2 2M21 14l-2-2-2 2"/><circle cx="12" cy="4" r="1.5"/>',
    stage: '<path d="M5 4h14v16H5zM5 9h14M9 9v11M15 9v11"/><path d="m9 6 2 1-2 1m6-2-2 1 2 1"/>',
    sports: '<circle cx="12" cy="12" r="8"/><path d="M5.6 8h12.8M5.6 16h12.8M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
    luxury: '<path d="M7 9V7a5 5 0 0 1 10 0v2M4 9h16l-1 11H5z"/><path d="M9 12v1m6-1v1"/>',
    fashion: '<path d="M9 5a3 3 0 1 1 5 2.2L20 11 18 20H6l-2-9 6-3.8"/><path d="M9 5c.5 2 5.5 2 6 0"/>',
    equipment: '<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="11" cy="12.5" r="4"/><path d="M17 9h2M6 6l2-3h5l2 3"/>',
    art: '<path d="m12 3 7 7-7 11-7-11zM5 10h14M9 10l3 11 3-11M8 6h8"/>',
    vehicle: '<path d="M4 14l2-5h12l2 5v4H4zM7 9l2-3h6l2 3M6 18v2m12-2v2"/><circle cx="8" cy="15" r="1.5"/><circle cx="16" cy="15" r="1.5"/>',
    vintage: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2M8 3h8M10 20h4"/>',
    fragment: '<path d="M4 4h6a2 2 0 1 0 4 0h6v6a2 2 0 1 0 0 4v6h-6a2 2 0 1 0-4 0H4v-6a2 2 0 1 0 0-4z"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7m4-7v7"/>'
  };

  const elements = {
    app: document.querySelector("#app"),
    root: document.querySelector("#viewRoot"),
    views: [...document.querySelectorAll(".game-view")],
    cash: document.querySelector("#cashStat"),
    warehouse: document.querySelector("#warehouseStat"),
    heat: document.querySelector("#heatStat"),
    liveMessage: document.querySelector("#liveMessage"),
    viewers: document.querySelector("#viewerCount"),
    nav: document.querySelector("#bottomNav"),
    navButtons: [...document.querySelectorAll(".nav-button")],
    toast: document.querySelector("#toast"),
    modal: document.querySelector("#modalRoot")
  };

  let game = null;
  let view = null;
  let activeTab = "board";
  let previewContainerId = null;
  let toastTimer = null;
  let meta = loadMeta();

  function defaultMeta() {
    return {
      tutorialSeen: false,
      inspectionHintSeen: false,
      heat: 0,
      liveMessage: "港口信号已接通，等你开第一柜。",
      fogRevealed: {},
      openedContainers: {}
    };
  }

  function loadJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function loadMeta() {
    const saved = loadJson(META_KEY);
    return Object.assign(defaultMeta(), saved || {});
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function persist() {
    if (game) saveJson(SAVE_KEY, game.exportSave());
    saveJson(META_KEY, meta);
  }

  function todayKey() {
    return window.CargoDailyGenerator.localDateKey(new Date());
  }

  function createGame() {
    const savedState = loadJson(SAVE_KEY);
    try {
      game = window.CargoGameEngine.createGame(savedState
        ? { generator: window.CargoDailyGenerator, savedState }
        : { generator: window.CargoDailyGenerator, dateKey: todayKey(), initialCash: 6000 });
    } catch (error) {
      game = window.CargoGameEngine.createGame({
        generator: window.CargoDailyGenerator,
        dateKey: todayKey(),
        initialCash: 6000
      });
      showToast("旧存档无法读取，已为你建立新档。");
    }
    view = game.getView();
    persist();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(value) {
    const amount = Number(value) || 0;
    const sign = amount < 0 ? "-" : "";
    return `${sign}¥${Math.abs(amount).toLocaleString("zh-CN")}`;
  }

  function percent(multiplier) {
    const value = Math.round((multiplier - 1) * 100);
    return `${value > 0 ? "+" : ""}${value}%`;
  }

  function displayDate(dateKey) {
    const parts = dateKey.split("-");
    return `${Number(parts[1])}月${Number(parts[2])}日`;
  }

  function nextDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return next.toISOString().slice(0, 10);
  }

  function iconKeyForItem(item) {
    if (item.type === "fragment") return "fragment";
    if (item.type === "trash") return "trash";
    const category = item.category || "";
    if (["商用库存"].includes(category)) return "commercial";
    if (["影像器材", "专业设备"].includes(category)) return item.type === "collectible" ? "equipment" : "camera";
    if (["工坊器材"].includes(category)) return "tools";
    if (["航海用品"].includes(category)) return "anchor";
    if (["演出器材"].includes(category)) return "stage";
    if (["文体库存"].includes(category)) return "sports";
    if (["奢侈配饰"].includes(category)) return "luxury";
    if (["高级时装"].includes(category)) return "fashion";
    if (["珠宝艺术"].includes(category)) return "art";
    if (["车辆大奖"].includes(category)) return "vehicle";
    if (["复古收藏"].includes(category)) return "vintage";
    return item.type === "collectible" ? "luxury" : "commercial";
  }

  function categoryIconMarkup(item, extraClass) {
    const key = iconKeyForItem(item);
    return `<svg class="category-icon ${escapeHtml(extraClass || "")}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_ICON_PATHS[key] || CATEGORY_ICON_PATHS.commercial}</svg>`;
  }

  function atlasPosition(index, columns, rows) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: columns <= 1 ? 0 : column / (columns - 1) * 100,
      y: rows <= 1 ? 0 : row / (rows - 1) * 100
    };
  }

  function atlasMarkup(visualId, extraClass, label) {
    if (!visualId) return "";
    const parts = String(visualId).split("-");
    const atlas = parts[0];
    const index = Number(parts[1]);
    const grids = { luxury: [3, 3], premium: [3, 3], vintage: [4, 3], treasure: [2, 2] };
    const grid = grids[atlas];
    if (!grid || !Number.isFinite(index)) return "";
    const position = atlasPosition(index, grid[0], grid[1]);
    return `<div class="atlas-art atlas-${atlas} ${escapeHtml(extraClass || "")}" role="img" aria-label="${escapeHtml(label || "物品图片")}" style="--atlas-x:${position.x}%;--atlas-y:${position.y}%"></div>`;
  }

  function itemVisualMarkup(item, extraClass) {
    const visualId = item.visualId || VISUAL_BY_NAME[item.name];
    const damageClass = ["报废", "重损", "仿品", "存疑"].includes(item.condition) ? "is-damaged" : "";
    if (visualId) return atlasMarkup(visualId, `item-art ${damageClass} ${extraClass || ""}`, item.name);
    if (item.type === "fragment" && item.set && SET_ATLAS_INDEX[item.set] !== undefined) {
      return atlasMarkup(`treasure-${SET_ATLAS_INDEX[item.set]}`, `item-art fragment-art ${extraClass || ""}`, item.set);
    }
    return `<div class="category-art ${escapeHtml(extraClass || "")}">${categoryIconMarkup(item)}</div>`;
  }

  function npcPortraitMarkup(npcId, name, extraClass) {
    const index = NPC_ATLAS_INDEX[npcId];
    if (index === undefined) return `<div class="npc-avatar ${escapeHtml(extraClass || "")}">${escapeHtml((name || "?").slice(0, 1))}</div>`;
    const position = atlasPosition(index, 3, 2);
    return `<div class="npc-portrait ${escapeHtml(extraClass || "")}" role="img" aria-label="${escapeHtml(name)}头像" style="--npc-x:${position.x}%;--npc-y:${position.y}%"></div>`;
  }

  function rarityLabel(item) {
    if (item.isVehicle && item.rarity === "legendary") return "镇场大奖";
    const labels = { legendary: "传奇发现", epic: "稀有精品", rare: "高价值", premium: "高级货", fragment: "宝藏碎片" };
    return labels[item.rarity] || "";
  }

  function containerById(containerId) {
    return view.containers.find((container) => container.id === containerId) || null;
  }

  function selectedContainer() {
    return view.selection ? containerById(view.selection.containerId) : null;
  }

  function setLiveMessage(message, heatDelta) {
    meta.liveMessage = message;
    if (heatDelta) meta.heat = Math.max(0, meta.heat + heatDelta);
    persist();
    updateChrome();
  }

  function updateChrome() {
    elements.cash.textContent = money(view.player.cash);
    elements.warehouse.textContent = `${view.warehouse.used}/${view.warehouse.activeCapacity}`;
    elements.heat.textContent = String(meta.heat);
    elements.liveMessage.textContent = meta.liveMessage;
    const viewers = meta.heat <= 0 ? 0 : Math.max(3, Math.round(meta.heat * 1.45 + 2));
    elements.viewers.textContent = `${viewers} 人`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2300);
  }

  function showView(viewId, flowMode) {
    elements.views.forEach((section) => section.classList.toggle("is-active", section.id === viewId));
    elements.app.classList.toggle("is-flow", Boolean(flowMode));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateNav() {
    elements.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === activeTab));
  }

  function mutate(action, options) {
    const settings = options || {};
    try {
      const result = action();
      view = game.getView();
      persist();
      if (settings.message) showToast(settings.message);
      render();
      return result;
    } catch (error) {
      showToast(error && error.message ? error.message : "这一步暂时无法完成");
      return null;
    }
  }

  function marketHeadline() {
    const market = view.market;
    return `
      <div class="market-strip">
        <i class="dot"></i>
        <strong>${escapeHtml(market.headlineUp)} ${percent(market.multipliers[market.headlineUp])}</strong>
        <strong class="down">${escapeHtml(market.headlineDown)} ${percent(market.multipliers[market.headlineDown])}</strong>
        <span>仅今日</span>
      </div>`;
  }

  function securitySealMarkup() {
    return `
      <button class="security-seal" type="button" data-role="security-seal" aria-label="向下拖动安全封">
        <span class="seal-ring"></span>
        <span class="seal-bolt"></span>
        <span class="seal-plate">港封<small>SEC · 047</small></span>
        <span class="seal-tail"></span>
      </button>`;
  }

  function cargoBoxMarkup(options) {
    const settings = options || {};
    const classes = ["cargo-box", `tier-${settings.tier || "low"}`];
    if (settings.unsealed) classes.push("is-unsealed");
    if (settings.open) classes.push("is-open");
    if (settings.fogCut) classes.push("is-cut");
    if (settings.fogRevealed) classes.push("is-fog-revealed");
    return `
      <div class="cargo-scene" id="${escapeHtml(settings.sceneId || "cargoScene")}">
        <div class="cargo-floor"></div>
        <div class="${classes.join(" ")}" id="${escapeHtml(settings.boxId || "cargoBox")}">
          <i class="corner corner-tl"></i><i class="corner corner-tr"></i>
          <i class="corner corner-bl"></i><i class="corner corner-br"></i>
          <div class="cargo-interior">
            <div class="cargo-light"></div>
            <div class="cargo-item-shape shape-crate"></div>
            <div class="cargo-item-shape shape-case"></div>
            <div class="cargo-item-shape shape-frame"></div>
          </div>
          <div class="cargo-door left">
            <div class="door-ribs"></div>
            <div class="cargo-label">YARD 03<br><b>CN–2047</b></div>
            <i class="lock-rod rod-lo"><b class="rod-handle"></b></i>
            <i class="lock-rod rod-li"><b class="rod-handle"></b></i>
          </div>
          <div class="cargo-door right">
            <div class="door-ribs"></div>
            <div class="cargo-warning">△ CAUTION</div>
            <i class="lock-rod rod-ri"><b class="rod-handle"></b></i>
            <i class="lock-rod rod-ro"><b class="rod-handle"></b></i>
          </div>
          <div class="door-seam"></div>
          ${settings.showSeal === false ? "" : securitySealMarkup()}
          ${settings.fog ? `
            <div class="fog-veil" id="fogVeil"><div class="fog-stamp">UNKNOWN<br>SEALED LOT</div></div>
            <div class="rope-layer" id="ropeLayer">
              <i class="rope horizontal"></i><i class="rope vertical"></i><i class="rope-knot"></i>
            </div>
            <div class="peel-tab" id="peelTab"></div>
            <div class="cut-trail" id="cutTrail"></div>
            <div class="fog-clue"><span>仅揭露一层</span><strong>${escapeHtml(settings.clue || "价值方向仍未知")}</strong></div>
          ` : ""}
        </div>
      </div>`;
  }

  function typeClass(type) {
    return type ? `is-${type}` : "";
  }

  function itemValueLabel(item) {
    if (item.quickValue < 0) return `清理 ${money(Math.abs(item.quickValue))}`;
    return money(item.quickValue);
  }

  function expansionDue() {
    const current = view.warehouse.contractedCapacity;
    const target = Math.min(MAX_WAREHOUSE_CAPACITY, current + 10);
    return Math.max(0, RENT_BY_CAPACITY[target] - RENT_BY_CAPACITY[current]);
  }

  function lootCardMarkup(item) {
    const details = [TYPE_LABELS[item.type] || item.type, item.condition, item.storageSlots > 1 ? `占 ${item.storageSlots} 格` : ""].filter(Boolean).join(" · ");
    return `
      <article class="loot-card ${typeClass(item.type)} rarity-${escapeHtml(item.rarity || "standard")}">
        <div class="loot-icon">${itemVisualMarkup(item, "is-thumb")}</div>
        <div class="loot-copy">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(details)}</span>
          <small>${escapeHtml(item.category)} · ${escapeHtml(item.quantity)}</small>
          ${item.assessment ? `<em>${escapeHtml(item.assessment)}</em>` : ""}
        </div>
        <div class="loot-side">${rarityLabel(item) ? `<small>${escapeHtml(rarityLabel(item))}</small>` : ""}<div class="loot-value">${itemValueLabel(item)}</div></div>
      </article>`;
  }

  function renderBoard() {
    activeTab = "board";
    updateNav();
    if (!previewContainerId || !containerById(previewContainerId)) previewContainerId = view.containers[0].id;
    const current = containerById(previewContainerId);
    const settledCount = view.containers.filter((container) => container.result).length;
    const tabs = view.containers.map((container) => {
      const label = container.isFog ? "雾" : container.tierLabel.replace("价柜", "").replace("柜", "");
      const price = container.isFog ? "未知" : money(container.startingBid).replace("¥", "¥");
      return `
        <button class="container-tab ${container.id === current.id ? "is-active" : ""} ${container.isFog ? "is-fog" : ""} ${container.result ? "is-settled" : ""}"
          type="button" data-action="preview-container" data-id="${container.id}">
          <span>${String(container.slot + 1).padStart(2, "0")} / ${label}</span>
          <strong>${container.result ? "已落槌" : price}</strong>
        </button>`;
    }).join("");

    let actionArea = "";
    if (current.result) {
      const resultText = current.result.winnerType === "player"
        ? `你以 ${money(current.result.price)} 拍下了这个货柜`
        : current.result.winnerType === "npc"
          ? `${escapeHtml(current.result.winnerName)}以 ${money(current.result.price)} 拍得此柜`
          : "这个货柜最终流拍";
      actionArea = `<div class="settled-banner">${resultText}</div>`;
    } else {
      actionArea = `<button class="primary-button" type="button" data-action="select-container" data-id="${current.id}">查看货柜</button>`;
    }

    document.querySelector("#boardView").innerHTML = `
      ${marketHeadline()}
      <header class="section-heading">
        <div>
          <p class="section-kicker">DAILY AUCTION</p>
          <h2>今日货柜</h2>
        </div>
        <div class="section-meta">${displayDate(view.dateKey)}<br>${settledCount}/5 已落槌</div>
        <button class="icon-button" type="button" data-action="open-settings" aria-label="游戏设置">•••</button>
      </header>
      <div class="container-selector">${tabs}</div>
      <article class="featured-container">
        <header class="featured-head">
          <div>
            <span class="tier-label">${current.isFog ? "未知 · 雾柜" : `${String(current.slot + 1).padStart(2, "0")} · ${escapeHtml(current.tierLabel)}`}</span>
            <h3>${escapeHtml(current.public.manifest.text)}</h3>
          </div>
          <div class="starting-price">
            <span>起拍价</span>
            <strong>${money(current.startingBid)}</strong>
          </div>
        </header>
        <div class="cargo-preview"><div class="mini-cargo tier-${escapeHtml(current.tier)} ${current.isFog ? "is-fog" : ""}"></div></div>
        <div class="clue-summary">
          <div class="clue-row"><span>申报</span><strong>${escapeHtml(current.public.manifest.text)}</strong></div>
          <div class="clue-row"><span>外观</span><strong>${current.isFog ? "帷幕与缆绳完全遮挡" : escapeHtml(current.public.exterior.text)}</strong></div>
        </div>
        ${actionArea}
        <p class="microcopy">点击上方小柜切换比较 · 每只普通柜只能深入检查一次</p>
      </article>
      ${renderRecoveryButton()}
      ${renderDayAdvance(settledCount)}`;
    showView("boardView", false);
  }

  function renderDayAdvance(settledCount) {
    const remaining = view.containers.length - settledCount;
    const completed = remaining === 0;
    return `
      <section class="day-gate ${completed ? "is-complete" : ""}">
        <div class="day-gate-copy">
          <span>PORT CLOSING · ${displayDate(view.dateKey)}</span>
          <strong>${completed ? "今日五柜已经结清" : "今天先拍到这里？"}</strong>
          <p>${completed
            ? "新一天将刷新五只货柜、市场行情、定向商户与拍卖对手。"
            : `还剩 ${remaining} 只未拍货柜；提前收工后它们会直接撤场。`}</p>
        </div>
        <button class="day-advance-button ${completed ? "is-ready" : ""}" type="button" data-action="advance-day">
          <span>${completed ? "今日收官" : "提前收工"}</span>
          <strong>进入下一天</strong>
        </button>
      </section>`;
  }

  function renderRecoveryButton() {
    const unresolved = view.containers.filter((container) => !container.result);
    if (!unresolved.length) return "";
    const minimum = Math.min(...unresolved.map((container) => container.startingBid));
    const sellable = view.warehouse.lots.some((lot) => lot.stallValue > 0);
    if (view.player.cash >= minimum || sellable) return "";
    return `
      <div class="panel-card" style="margin-top:12px;padding:13px">
        <p class="section-kicker">港口临时委托</p>
        <p class="microcopy" style="text-align:left;margin:0 0 10px">你已经无法参加最低档拍卖，也没有可变卖库存。完成一次搬运委托即可恢复最低周转金。</p>
        <button class="secondary-button" type="button" data-action="claim-recovery">去搬一批货</button>
      </div>`;
  }

  function renderDetail() {
    const container = selectedContainer();
    if (!container) {
      renderBoard();
      return;
    }
    const result = view.selection ? view.selection.inspectionResult : null;
    const canAuction = view.phase === "decision";
    const inspections = container.inspectionChoices.map((choice, index) => `
      <button class="inspection-button ${!meta.inspectionHintSeen && index === 2 ? "is-recommended" : ""}" type="button"
        data-action="inspect" data-inspection="${escapeHtml(choice.action)}">
        <strong>${escapeHtml(choice.label)}</strong><span>${escapeHtml(choice.help)}</span>
      </button>`).join("");

    document.querySelector("#detailView").innerHTML = `
      <header class="inner-heading">
        <button class="back-button" type="button" data-action="cancel-selection">‹ 返回</button>
        <div class="inner-heading-copy">
          <p class="section-kicker">${container.isFog ? "FOG CONTAINER" : "ONE CHECK ONLY"}</p>
          <h2>${escapeHtml(container.public.manifest.text)}</h2>
        </div>
        <span class="price-chip">${money(container.startingBid)}</span>
      </header>
      <article class="detail-panel">
        ${cargoBoxMarkup({
          sceneId: "detailCargoScene",
          boxId: "detailCargoBox",
          fog: container.isFog,
          clue: container.public.exterior.text,
          tier: container.tier,
          showSeal: !container.isFog
        })}
        <div class="public-info">
          <div class="public-info-row"><span>公开申报</span><strong>${escapeHtml(container.public.manifest.text)}</strong></div>
          <div class="public-info-row"><span>${container.isFog ? "唯一线索" : "箱体外观"}</span><strong>${escapeHtml(container.public.exterior.text)}<small>${escapeHtml(container.public.exterior.means)}</small></strong></div>
        </div>
        ${container.isFog ? "" : result ? `
          <div class="inspection-result">
            <span>${escapeHtml(result.label)}结果</span>
            <strong>${escapeHtml(result.text)}</strong>
            <small>${escapeHtml(result.means)}</small>
          </div>` : `
          <h3 class="inspection-title">只能深入检查一处：</h3>
          <div class="inspection-grid">${inspections}</div>`}
        ${canAuction ? `<button class="primary-button" type="button" data-action="start-auction">进入三锤拍卖</button>` : ""}
        ${container.isFog ? `<p class="microcopy">竞拍前只公开这一条线索；拍下后才能断绳揭幕。</p>` : ""}
      </article>`;
    showView("detailView", true);
  }

  function getBidOptions(container) {
    const auction = view.auction;
    const baseStep = BID_STEPS[container.tier] || 100;
    if (auction.round === 3) {
      return {
        follow: auction.leaderId === "player" ? auction.currentPrice : auction.currentPrice + baseStep,
        jump: auction.leaderId === "player" ? auction.currentPrice + baseStep * 2 : auction.currentPrice + baseStep * 3
      };
    }
    const step = baseStep * (auction.round === 1 ? 1 : 2);
    return {
      follow: auction.leaderId === "player" ? auction.currentPrice : auction.currentPrice + step,
      jump: auction.leaderId === "player" ? auction.currentPrice + step : auction.currentPrice + step * 2
    };
  }

  function leaderName() {
    if (!view.auction || !view.auction.leaderId) return "拍卖师等待第一口价";
    if (view.auction.leaderId === "player") return "你暂时领先";
    const npc = view.activeNpcs.find((row) => row.id === view.auction.leaderId);
    return npc ? `${npc.name}正在守擂` : "有人暂时领先";
  }

  function auctionLog() {
    const auction = view.auction;
    const last = auction.bids[auction.bids.length - 1];
    if (!last) return "拍卖师：第一锤，谁先举牌？";
    const actor = last.actorId === "player"
      ? "你"
      : view.activeNpcs.find((npc) => npc.id === last.actorId)?.name || "买家";
    if (auction.round === 3) return `拍卖师：公开价停在 ${money(auction.currentPrice)}。最后一锤，所有人同时封价。`;
    return `拍卖师：${actor}出到 ${money(last.amount)}。下一锤加价单位提高，跟还是停？`;
  }

  function npcBidStatus(npcId) {
    const latest = [...view.auction.bids].reverse().find((bid) => bid.actorId === npcId);
    if (view.auction.leaderId === npcId) return `领价 ${money(view.auction.currentPrice)}`;
    if (latest) return `跟至 ${money(latest.amount)}`;
    return "尚未举牌";
  }

  function renderAuction() {
    const container = selectedContainer();
    if (!container || !view.auction) {
      renderBoard();
      return;
    }
    const auction = view.auction;
    const labels = { 1: "第一锤 · 试探", 2: "第二锤 · 争夺", 3: "第三锤 · 封槌" };
    const options = getBidOptions(container);
    const npcCards = view.activeNpcs.map((npc) => `
      <article class="npc-card ${auction.leaderId === npc.id ? "is-leading" : ""}">
        ${npcPortraitMarkup(npc.id, npc.name)}
        <div class="npc-card-copy">
          <strong>${escapeHtml(npc.name)}</strong>
          <span>${escapeHtml(npc.style)}</span>
          <small>${npcBidStatus(npc.id)}</small>
        </div>
      </article>`).join("");
    const dots = [1, 2, 3].map((round) => `<i class="${round === auction.round ? "is-current" : round < auction.round ? "is-done" : ""}"></i>`).join("");
    document.querySelector("#auctionView").innerHTML = `
      <header class="inner-heading">
        <div class="inner-heading-copy">
          <p class="section-kicker">THREE HAMMERS</p>
          <h2>${labels[auction.round]}</h2>
        </div>
        <div class="round-progress">${dots}</div>
      </header>
      <article class="auction-panel">
        <div class="price-board">
          <p>当前公开价</p><strong>${money(auction.currentPrice)}</strong><span>${leaderName()}</span>
        </div>
        <div class="auction-log">${auctionLog()}</div>
        <div class="npc-grid">${npcCards}</div>
        <div class="bid-grid">
          <button class="bid-button follow" type="button" data-action="bid" data-bid="follow" ${options.follow > view.player.cash ? "disabled" : ""}>
            <span>${auction.round === 3 ? "稳妥封价" : "稳跟"}</span><strong>${money(options.follow)}</strong>
          </button>
          <button class="bid-button jump" type="button" data-action="bid" data-bid="jump" ${options.jump > view.player.cash ? "disabled" : ""}>
            <span>${auction.round === 3 ? "强攻封价" : "跳价压场"}</span><strong>${money(options.jump)}</strong>
          </button>
        </div>
        <button class="fold-button" type="button" data-action="bid" data-bid="fold">放弃，让他们拍</button>
        <p class="microcopy">没有自由输入金额，不能用一元加价试探底价；第三锤为同时封价。</p>
      </article>`;
    showView("auctionView", true);
  }

  function openingKey(containerId) {
    return `${view.dateKey}|${containerId}`;
  }

  function renderOpening() {
    const container = selectedContainer();
    const reveal = view.reveal;
    if (!container || !reveal) {
      renderBoard();
      return;
    }
    if (reveal.winnerType !== "player") {
      renderSpectatorResult();
      return;
    }
    const key = openingKey(container.id);
    const opened = Boolean(meta.openedContainers[key]) || reveal.revealed.length > 0;
    const totalLayers = container.isFog ? 1 : 3;
    const nextLayer = reveal.nextIndex + 1;
    const revealedCards = reveal.revealed.map(lootCardMarkup).join("");
    const layerActions = container.isFog
      ? ["揭晓雾柜唯一结果"]
      : ["撬开外层货件", "翻查中层货件", "清点货柜最深处"];
    let ritualControl = "";
    if (!opened && view.phase === "reveal") {
      ritualControl = container.isFog ? `
        <div class="ritual-hud">
          <div class="ritual-symbol" id="openingGestureSymbol">／</div>
          <div class="ritual-copy">
            <small>雾柜开仓 · 你的货柜</small>
            <strong id="openingGestureTitle">第一步：快速划过中央绳结</strong>
            <p id="openingGestureHint">断绳后抓住左上翘角，斜向揭开帷幕</p>
          </div>
          <div class="gesture-progress" id="openingProgress"><span>0%</span></div>
        </div>
        <button class="gesture-fallback-button" type="button" data-action="open-directly" hidden>手势不便？直接打开</button>` : `
        <div class="ritual-hud">
          <div class="ritual-symbol" id="openingGestureSymbol">↓</div>
          <div class="ritual-copy">
            <small>开仓动作 · 你的货柜</small>
            <strong id="openingGestureTitle">按住安全封，向下扯断</strong>
            <p id="openingGestureHint">封签断开后，再横向滑开两扇柜门</p>
          </div>
          <div class="gesture-progress" id="openingProgress"><span>0%</span></div>
        </div>
        <button class="gesture-fallback-button" type="button" data-action="open-directly" hidden>手势不便？直接打开</button>`;
    } else if (view.phase === "reveal") {
      ritualControl = `
        <button class="ritual-layer-action" type="button" data-action="reveal-next">
          <span class="layer-index">0${nextLayer}</span>
          <span class="layer-action-copy"><small>继续清点 · 价值已冻结</small><strong>${layerActions[nextLayer - 1] || "继续清点货物"}</strong></span>
          <span class="layer-chevron">›</span>
        </button>`;
    }

    document.querySelector("#openingView").innerHTML = `
      <header class="inner-heading">
        <div class="inner-heading-copy">
          <p class="section-kicker">YOUR CARGO · OPEN THE DOORS</p>
          <h2>这只货柜现在归你</h2>
        </div>
        <span class="price-chip">成交 ${money(reveal.price)}</span>
      </header>
      <article class="opening-panel">
        <div class="ownership-ticket"><span>LOT ${escapeHtml(container.id)}</span><strong>港口落槌凭证 · 已付款</strong></div>
        <div class="opening-ritual">
          ${cargoBoxMarkup({
            sceneId: "openingCargoScene",
            boxId: "openingCargoBox",
            unsealed: opened,
            open: opened,
            fog: container.isFog,
            fogCut: container.isFog && opened,
            fogRevealed: container.isFog && opened,
            clue: container.isFog ? "已落槌 · 唯一结果待清点" : "",
            tier: container.tier,
            showSeal: !container.isFog
          })}
          ${ritualControl}
        </div>
        <div class="reveal-stack">${revealedCards}</div>
        ${reveal.revealed.length && view.phase === "reveal" ? `<p class="microcopy">已揭晓 ${reveal.revealed.length}/${totalLayers} · 每层独立抽取，不保证越开越好</p>` : ""}
      </article>`;
    showView("openingView", true);
    if (!opened && view.phase === "reveal") {
      if (container.isFog) setupFogOpeningInteraction(key);
      else setupOpeningInteraction(key);
    }
  }

  function renderSpectatorResult() {
    let reveal = view.reveal;
    const container = selectedContainer();
    if (!reveal || !container) {
      renderBoard();
      return;
    }
    if (reveal.winnerType === "npc" && view.phase === "reveal") {
      while (game.getView().phase === "reveal") game.revealNext();
      view = game.getView();
      reveal = view.reveal;
      persist();
    }

    const unsold = reveal.winnerType === "unsold";
    const npcName = unsold
      ? "无人竞得"
      : view.activeNpcs.find((npc) => npc.id === reveal.winnerId)?.name || "对手";
    const returned = reveal.revealed.reduce((sum, item) => sum + item.quickValue, 0);
    const profit = returned - reveal.price;
    const resultClass = profit >= 0 ? "is-profit" : "is-loss";
    const resultText = profit >= 0 ? `赚 ${money(profit)}` : `亏 ${money(Math.abs(profit))}`;

    document.querySelector("#openingView").innerHTML = `
      <header class="inner-heading">
        <div class="inner-heading-copy">
          <p class="section-kicker">SPECTATOR RESULT · NO INTERACTION</p>
          <h2>${unsold ? "本柜流拍" : `${escapeHtml(npcName)}的开柜结果`}</h2>
        </div>
        <span class="status-chip">${unsold ? "无人落槌" : "你未购得"}</span>
      </header>
      <article class="spectator-result-panel">
        ${unsold ? `
          <div class="spectator-empty-mark">流拍</div>
          <h3>没人愿意接下这只货柜</h3>
          <p>没有成交，也不会发生开仓。它不会累积到明天。</p>
        ` : `
          <div class="spectator-owner-row">
            ${npcPortraitMarkup(reveal.winnerId, npcName, "spectator-avatar")}
            <div><small>最终买家</small><strong>${escapeHtml(npcName)}</strong></div>
            <span>旁观结果</span>
          </div>
          <div class="spectator-equation">
            <div><small>落槌价</small><strong>${money(reveal.price)}</strong></div>
            <i>→</i>
            <div><small>开出总值</small><strong>${money(returned)}</strong></div>
            <i>=</i>
            <div class="${resultClass}"><small>本柜盈亏</small><strong>${resultText}</strong></div>
          </div>
          <p class="spectator-note">货柜由买家自行开封，你只看到清点后的公开结果。</p>
          <div class="reveal-stack spectator-loot">${reveal.revealed.map(lootCardMarkup).join("")}</div>
        `}
        <button class="primary-button spectator-return" type="button" data-action="return-board">${unsold ? "返回拍卖场" : "看完了，返回拍卖场"}</button>
      </article>`;
    showView("openingView", true);
  }

  function renderDisposition() {
    const pendingCards = view.pendingItems.map((pending, index) => {
      const item = pending.item;
      return `
        <article class="pending-card ${typeClass(item.type)} ${pending.resolved ? "is-resolved" : ""}">
          <div class="pending-thumb">${itemVisualMarkup(item, "is-card-thumb")}</div>
          <div class="pending-content">
          <header class="item-head"><strong>${escapeHtml(item.name)}</strong><span>${itemValueLabel(item)}</span></header>
          <p class="item-meta">${escapeHtml(TYPE_LABELS[item.type] || item.type)} · ${escapeHtml(item.category)} · ${escapeHtml(item.condition)}${item.storageSlots > 1 ? ` · 占 ${item.storageSlots} 格` : ""}</p>
          ${item.assessment ? `<p class="assessment-line">鉴定：${escapeHtml(item.assessment)}</p>` : ""}
          ${item.handlingFee ? `<p class="fee-line">出售净价会扣运输处置费 ${money(item.handlingFee)}</p>` : ""}
          ${pending.resolved ? `<div class="resolved-mark">${pending.action === "sell" ? "已现场处置" : "已收入仓库"}</div>` : `
            <div class="item-actions">
              <button class="small-button is-gold" type="button" data-action="dispose" data-index="${index}" data-dispose="sell">
                ${item.quickValue < 0 ? `支付清理 ${money(Math.abs(item.quickValue))}` : `立即卖 ${money(item.quickValue)}`}
              </button>
              <button class="small-button" type="button" data-action="dispose" data-index="${index}" data-dispose="store">入仓${item.storageSlots > 1 ? ` · ${item.storageSlots} 格` : ""}</button>
            </div>`}</div>
        </article>`;
    }).join("");
    const fill = Math.min(100, (view.warehouse.used / view.warehouse.activeCapacity) * 100);
    document.querySelector("#dispositionView").innerHTML = `
      <header class="inner-heading">
        <div class="inner-heading-copy"><p class="section-kicker">SELL OR STORE</p><h2>逐件处置</h2></div>
        <span class="status-chip">${view.pendingItems.filter((item) => !item.resolved).length} 件待处理</span>
      </header>
      <div class="capacity-bar">
        <span>仓位</span><div class="bar-track"><div class="bar-fill" style="--fill:${fill}%"></div></div>
        <strong>${view.warehouse.used}/${view.warehouse.activeCapacity}</strong>
      </div>
      <div class="pending-list">${pendingCards}</div>
      ${view.warehouse.contractedCapacity < MAX_WAREHOUSE_CAPACITY ? `<button class="ghost-button" type="button" data-action="rent-expansion">仓库不够？扩租 10 格 · 本月补 ${money(expansionDue())}</button>` : ""}
      <p class="microcopy">立即卖按今日行情结算；垃圾会扣除清理费。收入仓库可等待更好的价格。</p>`;
    showView("dispositionView", true);
  }

  function renderWarehouse() {
    activeTab = "warehouse";
    updateNav();
    const lots = view.warehouse.lots.map((lot) => `
      <article class="warehouse-card">
        <div class="warehouse-thumb">${itemVisualMarkup(lot, "is-list-thumb")}</div>
        <div class="warehouse-copy"><h3>${escapeHtml(lot.name)}${lot.count > 1 ? ` ×${lot.count}` : ""}</h3><p>${escapeHtml(TYPE_LABELS[lot.type] || lot.type)} · ${escapeHtml(lot.condition)} · 占 ${lot.storageSlots || lot.count || 1} 格</p>${lot.assessment ? `<small>${escapeHtml(lot.assessment)}</small>` : ""}</div>
        <div class="lot-value">${money(lot.stallValue)}</div>
        <div class="lot-buttons">
          <button class="small-button" type="button" data-action="sell-lot" data-lot="${escapeHtml(lot.lotId)}" data-channel="stall">按今日价出售</button>
          ${lot.merchantEligible ? `<button class="small-button is-gold" type="button" data-action="sell-lot" data-lot="${escapeHtml(lot.lotId)}" data-channel="merchant">卖给定向商户</button>` : ""}
        </div>
      </article>`).join("");
    document.querySelector("#warehouseView").innerHTML = `
      <header class="section-heading"><div><p class="section-kicker">STORAGE</p><h2>港边仓库</h2></div><div class="section-meta">按批次占格<br>同类同品相自动堆叠</div></header>
      <div class="summary-card">
        <div class="summary-cell"><span>已用仓位</span><strong>${view.warehouse.used}</strong></div>
        <div class="summary-cell"><span>有效容量</span><strong>${view.warehouse.activeCapacity}</strong></div>
        <div class="summary-cell"><span>签约容量</span><strong>${view.warehouse.contractedCapacity}</strong></div>
      </div>
      <div class="warehouse-list">${lots || `<div class="empty-state"><i>□</i><strong>仓库还是空的</strong><p>开柜后选择“收入仓库”，货物会出现在这里。</p></div>`}</div>
      ${view.warehouse.activeCapacity < view.warehouse.contractedCapacity
        ? `<button class="primary-button" type="button" data-action="renew-warehouse">补交本月仓租并解锁</button>`
        : view.warehouse.contractedCapacity < MAX_WAREHOUSE_CAPACITY
          ? `<button class="ghost-button" type="button" data-action="rent-expansion">扩租至 ${view.warehouse.contractedCapacity + 10} 格 · 本月补 ${money(expansionDue())}</button>`
          : ""}`;
    showView("warehouseView", false);
  }

  function renderMarket() {
    activeTab = "market";
    updateNav();
    const featuredCategories = view.market.featuredCategories || Object.keys(view.market.multipliers).slice(0, 6);
    const cards = featuredCategories.map((category) => [category, view.market.multipliers[category] || 1]).map(([category, multiplier]) => `
      <div class="market-card ${multiplier < 1 ? "is-down" : ""}"><span>${escapeHtml(category)}</span><strong>${percent(multiplier)}</strong></div>`).join("");
    const merchant = view.merchant
      ? `<article class="merchant-card"><p class="section-kicker">定向收购</p><h3>${escapeHtml(view.merchant.title)}</h3><p>收购：${escapeHtml(view.merchant.targetCategory)} · 溢价 ${Math.round((view.merchant.premium - 1) * 100)}% · 今日还收 ${view.merchant.lotsRemaining} 批</p></article>`
      : `<article class="merchant-card"><p class="section-kicker">定向收购</p><h3>今天没有特殊买家</h3><p>仍可按每日行情出售仓库货物。定向商户并非每天出现。</p></article>`;
    const lots = view.warehouse.lots.map((lot) => `
      <article class="warehouse-card">
        <div class="warehouse-thumb">${itemVisualMarkup(lot, "is-list-thumb")}</div>
        <div class="warehouse-copy"><h3>${escapeHtml(lot.name)}</h3><p>${escapeHtml(lot.category)} · 今日摊位价 ${money(lot.stallValue)}${lot.merchantEligible ? " · 符合定向收购" : ""}</p></div>
        <div class="lot-buttons">
          <button class="small-button" type="button" data-action="sell-lot" data-lot="${escapeHtml(lot.lotId)}" data-channel="stall">卖给摊主</button>
          ${lot.merchantEligible ? `<button class="small-button is-gold" type="button" data-action="sell-lot" data-lot="${escapeHtml(lot.lotId)}" data-channel="merchant">定向高卖</button>` : ""}
        </div>
      </article>`).join("");
    document.querySelector("#marketView").innerHTML = `
      <header class="section-heading"><div><p class="section-kicker">DAILY MARKET</p><h2>每日交易摊</h2></div><div class="section-meta">波动范围<br>-30% 至 +20%</div></header>
      <div class="market-grid">${cards}</div>
      ${merchant}
      <h3 class="inspection-title">可出售库存</h3>
      <div class="market-lot-list">${lots || `<div class="empty-state"><i>¥</i><strong>没有可卖的库存</strong><p>拍下货柜并把物品存入仓库，再来等行情。</p></div>`}</div>`;
    showView("marketView", false);
  }

  function renderCollection() {
    activeTab = "collection";
    updateNav();
    const setCards = Object.entries(FRAGMENT_SETS).map(([setName, names]) => {
      const owned = names.filter((name) => (view.collections.ownedFragments[name] || 0) > 0).length;
      const covers = names.map((name, index) => `<i class="fragment-cover q${index} ${(view.collections.ownedFragments[name] || 0) > 0 ? "is-owned" : ""}"></i>`).join("");
      const dots = names.map((name) => `<div class="fragment-dot ${(view.collections.ownedFragments[name] || 0) > 0 ? "is-owned" : ""}">${escapeHtml(name.split("·")[1])}</div>`).join("");
      return `<article class="set-card"><div class="set-picture">${atlasMarkup(`treasure-${SET_ATLAS_INDEX[setName]}`, "set-atlas", setName)}<div class="fragment-covers">${covers}</div><b>${owned}/4</b></div><div class="set-info"><header class="set-head"><strong>${escapeHtml(setName)}</strong><span>${owned === 4 ? "已完成" : `还差 ${4 - owned} 片`}</span></header><div class="fragment-dots">${dots}</div></div></article>`;
    }).join("");
    const discoveryTags = view.collections.discovered.map((name) => {
      const visualId = VISUAL_BY_NAME[name];
      return `<div class="discovery-card">${visualId ? atlasMarkup(visualId, "discovery-art", name) : `<div class="discovery-glyph">◇</div>`}<span>${escapeHtml(name)}</span></div>`;
    }).join("");
    document.querySelector("#collectionView").innerHTML = `
      <header class="section-heading"><div><p class="section-kicker">COLLECTION</p><h2>港口藏品册</h2></div><div class="section-meta">卖掉也保留<br>首次发现记录</div></header>
      <div class="collection-hero"><strong>${view.collections.discovered.length}</strong><span>种物品已经见过 · 3 套宝藏等待拼齐</span></div>
      ${setCards}
      <h3 class="inspection-title">发现记录</h3>
      <div class="discoveries">${discoveryTags || `<div class="empty-state"><i>◇</i><strong>还没有发现</strong><p>第一次开仓后，见过的物品会永久记录在这里。</p></div>`}</div>`;
    showView("collectionView", false);
  }

  function setProgress(element, value) {
    if (!element) return;
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    element.style.setProperty("--progress", `${normalized * 3.6}deg`);
    const text = element.querySelector("span");
    if (text) text.textContent = `${normalized}%`;
  }

  function setupOpeningFallback(key) {
    const button = document.querySelector("[data-action='open-directly']");
    if (!button) return () => {};
    const show = () => {
      const current = document.querySelector("[data-action='open-directly']");
      if (current === button && !meta.openedContainers[key]) button.hidden = false;
    };
    window.setTimeout(show, 3000);
    return show;
  }

  function setupFogOpeningInteraction(key) {
    const box = document.querySelector("#openingCargoBox");
    const ropeLayer = document.querySelector("#ropeLayer");
    const peelTab = document.querySelector("#peelTab");
    const veil = document.querySelector("#fogVeil");
    const trail = document.querySelector("#cutTrail");
    const progress = document.querySelector("#openingProgress");
    const title = document.querySelector("#openingGestureTitle");
    const hint = document.querySelector("#openingGestureHint");
    const symbol = document.querySelector("#openingGestureSymbol");
    const showFallback = setupOpeningFallback(key);
    if (!box || !ropeLayer || !peelTab || !veil) {
      showFallback();
      return;
    }

    let step = "cut";
    let start = null;
    let failedAttempts = 0;

    function recordFailure() {
      failedAttempts += 1;
      if (failedAttempts >= 2) showFallback();
    }

    function point(event) {
      const rect = box.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function startCut(event) {
      if (step !== "cut") return;
      start = point(event);
      ropeLayer.setPointerCapture(event.pointerId);
      trail.style.display = "block";
      trail.style.left = `${start.x}px`;
      trail.style.top = `${start.y}px`;
    }

    function moveCut(event) {
      if (step !== "cut" || !start) return;
      const now = point(event);
      const dx = now.x - start.x;
      const dy = now.y - start.y;
      const distance = Math.hypot(dx, dy);
      trail.style.width = `${distance}px`;
      trail.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
      setProgress(progress, distance / 1.1);
    }

    function endCut(event) {
      if (step !== "cut" || !start) return;
      if (ropeLayer.hasPointerCapture(event.pointerId)) ropeLayer.releasePointerCapture(event.pointerId);
      const now = point(event);
      const distance = Math.hypot(now.x - start.x, now.y - start.y);
      const centerY = box.clientHeight / 2;
      const crossedCenter = Math.min(start.y, now.y) <= centerY + 48 && Math.max(start.y, now.y) >= centerY - 48;
      trail.style.display = "none";
      if (distance > 82 && crossedCenter) {
        step = "peel";
        box.classList.add("is-cut");
        setProgress(progress, 0);
        window.setTimeout(() => {
          if (symbol) symbol.textContent = "↘";
          title.textContent = "第二步：抓住翘角，斜向揭幕";
          hint.textContent = "绳索已经卸力，把帷幕拖向右下角";
        }, 340);
      } else {
        setProgress(progress, 0);
        recordFailure();
      }
      start = null;
    }

    function startPeel(event) {
      if (step !== "peel") return;
      start = { x: event.clientX, y: event.clientY };
      peelTab.setPointerCapture(event.pointerId);
      event.stopPropagation();
    }

    function movePeel(event) {
      if (step !== "peel" || !start) return;
      const dx = Math.max(0, Math.min(260, event.clientX - start.x));
      const dy = Math.max(0, Math.min(170, event.clientY - start.y));
      const distance = Math.hypot(dx, dy * 1.2);
      const value = Math.min(100, distance / 1.9);
      peelTab.style.transform = `translate(${dx * .68}px, ${dy * .68}px) rotate(${value * .22}deg)`;
      veil.style.clipPath = `polygon(${value * .72}% 0, 100% 0, 100% 100%, 0 100%, 0 ${value * .9}%)`;
      setProgress(progress, value);
      if (value >= 100) finishPeel();
    }

    function finishPeel() {
      if (step === "done") return;
      step = "done";
      box.classList.add("is-fog-revealed");
      meta.openedContainers[key] = true;
      setProgress(progress, 100);
      if (symbol) symbol.textContent = "✓";
      title.textContent = "帷幕已揭开，柜门正在释放";
      hint.textContent = "接下来清点雾柜的唯一结果";
      window.setTimeout(() => box.classList.add("is-unsealed", "is-open"), 320);
      setLiveMessage("直播间：雾柜终于开了，唯一结果马上揭晓。", 4);
      persist();
      window.setTimeout(renderOpening, 1050);
    }

    function endPeel(event) {
      if (!start) return;
      if (peelTab.hasPointerCapture(event.pointerId)) peelTab.releasePointerCapture(event.pointerId);
      if (step !== "done") {
        peelTab.style.transform = "";
        veil.style.clipPath = "";
        setProgress(progress, 0);
        recordFailure();
      }
      start = null;
    }

    ropeLayer.addEventListener("pointerdown", startCut);
    ropeLayer.addEventListener("pointermove", moveCut);
    ropeLayer.addEventListener("pointerup", endCut);
    ropeLayer.addEventListener("pointercancel", endCut);
    peelTab.addEventListener("pointerdown", startPeel);
    peelTab.addEventListener("pointermove", movePeel);
    peelTab.addEventListener("pointerup", endPeel);
    peelTab.addEventListener("pointercancel", endPeel);
  }

  function setupOpeningInteraction(key) {
    const scene = document.querySelector("#openingCargoScene");
    const box = document.querySelector("#openingCargoBox");
    const seal = box ? box.querySelector("[data-role='security-seal']") : null;
    const progress = document.querySelector("#openingProgress");
    const title = document.querySelector("#openingGestureTitle");
    const hint = document.querySelector("#openingGestureHint");
    const symbol = document.querySelector("#openingGestureSymbol");
    const showFallback = setupOpeningFallback(key);
    if (!scene || !box || !seal) {
      showFallback();
      return;
    }
    let step = "seal";
    let start = null;
    let failedAttempts = 0;

    function recordFailure() {
      failedAttempts += 1;
      if (failedAttempts >= 2) showFallback();
    }

    function startSeal(event) {
      if (step !== "seal") return;
      start = { x: event.clientX, y: event.clientY };
      seal.setPointerCapture(event.pointerId);
      event.stopPropagation();
    }

    function moveSeal(event) {
      if (step !== "seal" || !start) return;
      const distance = Math.max(0, Math.min(78, event.clientY - start.y));
      seal.style.transform = `translateX(-50%) translateY(${distance}px) rotate(${-distance * .06}deg)`;
      setProgress(progress, distance / .58);
    }

    function endSeal(event) {
      if (step !== "seal" || !start) return;
      if (seal.hasPointerCapture(event.pointerId)) seal.releasePointerCapture(event.pointerId);
      const distance = event.clientY - start.y;
      if (distance > 50) {
        step = "door";
        seal.style.transform = "";
        box.classList.add("is-unsealed");
        setProgress(progress, 0);
        symbol.textContent = "↔";
        title.textContent = "横向滑动，拉开两扇柜门";
        hint.textContent = "门体会先吃力，再突然卸力";
      } else {
        seal.style.transform = "";
        setProgress(progress, 0);
        recordFailure();
      }
      start = null;
      event.stopPropagation();
    }

    function startDoor(event) {
      if (step !== "door") return;
      start = { x: event.clientX, y: event.clientY };
      scene.setPointerCapture(event.pointerId);
    }

    function moveDoor(event) {
      if (step !== "door" || !start) return;
      const distance = Math.abs(event.clientX - start.x);
      const openness = Math.max(0, Math.min(1, distance / 85));
      box.querySelector(".cargo-door.left").style.transform = `rotateY(${-85 * openness}deg)`;
      box.querySelector(".cargo-door.right").style.transform = `rotateY(${85 * openness}deg)`;
      setProgress(progress, openness * 100);
    }

    function endDoor(event) {
      if (step !== "door" || !start) return;
      if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
      const distance = Math.abs(event.clientX - start.x);
      const leftDoor = box.querySelector(".cargo-door.left");
      const rightDoor = box.querySelector(".cargo-door.right");
      leftDoor.style.transform = "";
      rightDoor.style.transform = "";
      if (distance > 58) {
        step = "done";
        box.classList.add("is-open");
        meta.openedContainers[key] = true;
        setProgress(progress, 100);
        title.textContent = "柜门已打开，可以逐层清点";
        hint.textContent = "货物价值在开拍前已经冻结";
        setLiveMessage("直播间：门开了！先看轮廓，别急着报价格。", 4);
        persist();
        window.setTimeout(renderOpening, 1050);
      } else {
        setProgress(progress, 0);
        recordFailure();
      }
      start = null;
    }

    seal.addEventListener("pointerdown", startSeal);
    seal.addEventListener("pointermove", moveSeal);
    seal.addEventListener("pointerup", endSeal);
    seal.addEventListener("pointercancel", endSeal);
    scene.addEventListener("pointerdown", startDoor);
    scene.addEventListener("pointermove", moveDoor);
    scene.addEventListener("pointerup", endDoor);
    scene.addEventListener("pointercancel", endDoor);
  }

  function render() {
    view = game.getView();
    updateChrome();
    if (view.phase === "board") {
      if (activeTab === "warehouse") renderWarehouse();
      else if (activeTab === "market") renderMarket();
      else if (activeTab === "collection") renderCollection();
      else renderBoard();
      return;
    }
    activeTab = "board";
    updateNav();
    if (view.phase === "inspection" || view.phase === "decision") renderDetail();
    else if (view.phase === "auction") renderAuction();
    else if (view.phase === "reveal" || view.phase === "spectatorResult") renderOpening();
    else if (view.phase === "disposition") renderDisposition();
    else renderBoard();
  }

  function afterAuctionAction() {
    view = game.getView();
    if (!view.reveal) return;
    if (view.reveal.winnerType === "player") {
      setLiveMessage(`拍卖师：${money(view.reveal.price)} 落槌，货柜归你。`, 4);
    } else if (view.reveal.winnerType === "npc") {
      const npc = view.activeNpcs.find((row) => row.id === view.reveal.winnerId);
      setLiveMessage(`直播间：${npc ? npc.name : "对手"}拍走了这柜，看看你是否躲过一坑。`, 1);
    } else {
      setLiveMessage("拍卖师：无人接价，本柜流拍。", 0);
    }
  }

  function shouldShowcase(item) {
    if (item.isVehicle) return true;
    if (item.type === "fragment") return true;
    return item.type === "collectible" && ["rare", "epic", "legendary"].includes(item.rarity);
  }

  function showLootShowcase(item) {
    const title = item.isVehicle && item.rarity === "legendary" ? "镇场大奖现身"
      : item.isVehicle ? "大型货品现身"
      : item.type === "fragment" ? "宝藏碎片入镜"
        : item.rarity === "legendary" ? "传奇发现"
          : item.rarity === "epic" ? "稀有精品"
            : "高价值货品";
    const particlePositions = [[8, 18], [26, 9], [48, 16], [72, 8], [90, 25], [14, 67], [37, 82], [68, 76], [88, 62]];
    const particles = particlePositions.map(([x, y], index) => `<i style="--particle:${index};--px:${x}%;--py:${y}%"></i>`).join("");
    elements.modal.innerHTML = `
      <div class="modal-card loot-showcase-card rarity-${escapeHtml(item.rarity || "rare")}">
        <div class="showcase-kicker">${escapeHtml(title)}</div>
        <div class="showcase-visual">${itemVisualMarkup(item, "is-showcase")}${particles}</div>
        <p class="showcase-category">${escapeHtml(item.category)} · ${escapeHtml(item.condition)}</p>
        <h2>${escapeHtml(item.name)}</h2>
        ${item.assessment ? `<p class="showcase-assessment">${escapeHtml(item.assessment)}</p>` : ""}
        <div class="showcase-value"><span>现场净处置价</span><strong>${itemValueLabel(item)}</strong></div>
        ${item.storageSlots > 1 ? `<div class="showcase-warning">收入仓库需要 ${item.storageSlots} 个仓位${item.handlingFee ? ` · 出售时仍扣 ${money(item.handlingFee)} 运输处置费` : ""}</div>` : ""}
        <button class="primary-button" type="button" data-modal-action="loot-close">收下结果，继续清点</button>
      </div>`;
    elements.modal.hidden = false;
  }

  function revealNextItem() {
    try {
      const item = game.revealNext();
      view = game.getView();
      if (item.type === "fragment") {
        setLiveMessage(`榜一「海上明月」：这块“${item.name}”先别急着卖，像是一套里的。`, 12);
      } else if (item.type === "collectible") {
        setLiveMessage(`直播间：藏品出镜了，有人开始追问品相。`, 8);
      } else if (item.type === "trash" && item.quickValue < 0) {
        setLiveMessage(`直播间：有人笑出了声——这件还要付清理费。`, 2);
      } else if (item.type === "trash") {
        setLiveMessage(`直播间：这批异物居然还有人愿意接手，至少能回一点钱。`, 3);
      } else {
        setLiveMessage(`直播间：${item.name}，先记下今天的行情再决定。`, 4);
      }
      persist();
      render();
      if (shouldShowcase(item)) showLootShowcase(item);
    } catch (error) {
      showToast(error.message || "暂时无法继续揭晓");
    }
  }

  function advanceToNextDay() {
    const nextKey = nextDateKey(view.dateKey);
    try {
      game.advanceDay(nextKey);
      view = game.getView();
      previewContainerId = null;
      activeTab = "board";
      meta.liveMessage = `${displayDate(nextKey)}的新货柜已经进场，今日行情也已换牌。`;
      persist();
      closeModal();
      render();
      showToast("新一天已开始");
    } catch (error) {
      showToast(error && error.message ? error.message : "暂时无法进入下一天");
    }
  }

  function showEndDayConfirmation(remaining) {
    showModal(`
      <p class="section-kicker">END OF DAY</p>
      <h2>确认提前结束今天？</h2>
      <p>剩余 ${remaining} 只货柜会直接撤场，不能返回。你的现金、仓库、收藏与 NPC 长期状态都会保留。</p>
      <div class="modal-actions">
        <button class="secondary-button" type="button" data-modal-action="close">继续看看</button>
        <button class="primary-button" type="button" data-modal-action="advance-day">确认收工</button>
      </div>`);
  }

  function showModal(content) {
    elements.modal.innerHTML = `<div class="modal-card">${content}</div>`;
    elements.modal.hidden = false;
  }

  function closeModal() {
    elements.modal.hidden = true;
    elements.modal.innerHTML = "";
  }

  function showTutorial() {
    showModal(`
      <p class="section-kicker">30 秒上手</p>
      <h2>挑一只柜，三锤定输赢</h2>
      <p>每天只到五只货柜。先看公开描述，普通柜再选一次检查，然后决定是否出价。</p>
      <div class="tutorial-steps">
        <div class="tutorial-step"><i>1</i><span>比较起拍价、申报和外观，选你愿意承担的风险。</span></div>
        <div class="tutorial-step"><i>2</i><span>三锤只能稳跟、跳价或放弃，不能一元试探底价。</span></div>
        <div class="tutorial-step"><i>3</i><span>开出物品后立即卖掉，或放进仓库等更好的行情。</span></div>
      </div>
      <button class="primary-button" type="button" data-modal-action="start">去看今日货柜</button>`);
  }

  function showSettings() {
    showModal(`
      <p class="section-kicker">LOCAL SAVE</p>
      <h2>离线存档</h2>
      <p>今日货柜、竞拍进度、仓库与收藏均保存在本机。每日货柜只在日期变化后刷新。</p>
      <div class="modal-actions">
        <button class="secondary-button" type="button" data-modal-action="close">继续游戏</button>
        <button class="danger-button" type="button" data-modal-action="confirm-reset">清除存档并重新开始</button>
      </div>`);
  }

  function showResetConfirmation() {
    showModal(`
      <p class="section-kicker">确认重置</p>
      <h2>所有进度都会消失</h2>
      <p>包括现金、仓库、收藏和今日拍卖结果。这个操作无法恢复。</p>
      <div class="modal-actions">
        <button class="danger-button" type="button" data-modal-action="reset">确认清除</button>
        <button class="secondary-button" type="button" data-modal-action="close">取消</button>
      </div>`);
  }

  elements.root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "preview-container") {
      previewContainerId = target.dataset.id;
      renderBoard();
      return;
    }
    if (action === "select-container") {
      mutate(() => game.selectContainer(target.dataset.id));
      return;
    }
    if (action === "cancel-selection") {
      mutate(() => game.cancelSelection());
      return;
    }
    if (action === "inspect") {
      const result = mutate(() => {
        const inspection = game.inspect(target.dataset.inspection);
        meta.inspectionHintSeen = true;
        return inspection;
      });
      if (result) setLiveMessage(`直播间：检查结果出来了——${result.text}`, 1);
      return;
    }
    if (action === "start-auction") {
      mutate(() => game.startAuction());
      setLiveMessage("拍卖师：第一锤，谁先举牌？", 1);
      return;
    }
    if (action === "bid") {
      const result = mutate(() => game.auctionAction(target.dataset.bid));
      if (result) {
        view = game.getView();
        if (view.phase !== "auction") afterAuctionAction();
        persist();
        render();
      }
      return;
    }
    if (action === "reveal-next") {
      revealNextItem();
      return;
    }
    if (action === "open-directly") {
      const container = selectedContainer();
      if (!container || view.phase !== "reveal" || !view.reveal || view.reveal.winnerType !== "player") return;
      const key = openingKey(container.id);
      meta.openedContainers[key] = true;
      setLiveMessage("直播间：柜门已打开，开始逐层清点。", 2);
      renderOpening();
      return;
    }
    if (action === "return-board") {
      mutate(() => game.returnToBoard());
      persist();
      render();
      return;
    }
    if (action === "dispose") {
      const beforePhase = view.phase;
      const result = mutate(() => game.disposeItem(Number(target.dataset.index), target.dataset.dispose));
      if (result && beforePhase === "disposition" && game.getView().phase === "board") {
        setLiveMessage("直播间：这一柜清点完了，下一只还在码头等你。", 2);
      }
      return;
    }
    if (action === "rent-expansion") {
      mutate(() => game.rentWarehouseExpansion(), { message: "已扩租 10 个仓位" });
      return;
    }
    if (action === "renew-warehouse") {
      mutate(() => game.renewWarehouse(), { message: "本月仓租已补交" });
      return;
    }
    if (action === "sell-lot") {
      const channel = target.dataset.channel;
      mutate(() => game.sellWarehouseLot(target.dataset.lot, channel), {
        message: channel === "merchant" ? "已卖给定向商户" : "已按今日行情出售"
      });
      return;
    }
    if (action === "claim-recovery") {
      mutate(() => game.claimRecoveryJob(), { message: "搬运完成，临时周转金已经到账" });
      setLiveMessage("码头主管：先拿这笔周转金，别再闭眼乱拍。", 0);
      return;
    }
    if (action === "advance-day") {
      const remaining = view.containers.filter((container) => !container.result).length;
      if (remaining > 0) showEndDayConfirmation(remaining);
      else advanceToNextDay();
      return;
    }
    if (action === "open-settings") showSettings();
  });

  elements.nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    if (view.phase !== "board") {
      showToast("先完成当前货柜流程");
      return;
    }
    activeTab = button.dataset.tab;
    render();
  });

  elements.modal.addEventListener("click", (event) => {
    const target = event.target.closest("[data-modal-action]");
    if (!target) {
      if (event.target === elements.modal && meta.tutorialSeen) closeModal();
      return;
    }
    const action = target.dataset.modalAction;
    if (action === "start") {
      meta.tutorialSeen = true;
      persist();
      closeModal();
    } else if (action === "close" || action === "loot-close") {
      closeModal();
    } else if (action === "confirm-reset") {
      showResetConfirmation();
    } else if (action === "advance-day") {
      advanceToNextDay();
    } else if (action === "reset") {
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(META_KEY);
      } catch (error) {
        // 即使 localStorage 被禁用，页面仍能重新建立新局。
      }
      window.location.reload();
    }
  });

  window.addEventListener("pagehide", persist);

  createGame();
  render();
  if (!meta.tutorialSeen) showTutorial();
})();
