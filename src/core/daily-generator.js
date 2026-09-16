(function attachCargoDailyGenerator(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CargoDailyGenerator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGeneratorApi() {
  "use strict";

  const VERSION = "1.1.0";

  const TIERS = {
    low: { label: "低价柜", start: [300, 700], close: [500, 1200] },
    medium: { label: "中价柜", start: [800, 1500], close: [1200, 2600] },
    high: { label: "高价柜", start: [1800, 2800], close: [2600, 4200] },
    bonded: { label: "保税柜", start: [4500, 7000], close: [6000, 10000] },
    legacy: { label: "远洋遗存柜", start: [10000, 18000], close: [15000, 26000] }
  };

  const TIER_MIX = {
    starter: ["low", "low", "medium", "medium", "high"],
    bonded: ["low", "medium", "medium", "high", "bonded"],
    legacy: ["low", "medium", "high", "bonded", "legacy"]
  };

  const TYPE_WEIGHTS = [
    { id: "ordinary", weight: 0.35 },
    { id: "collectible", weight: 0.35 },
    { id: "fragment", weight: 0.15 },
    { id: "trash", weight: 0.15 }
  ];

  const OUTCOME_BANDS = [
    { id: "severeLoss", label: "惨亏", weight: 0.08, range: [0.05, 0.35] },
    { id: "loss", label: "普通亏损", weight: 0.22, range: [0.50, 0.85] },
    { id: "nearEven", label: "接近回本", weight: 0.25, range: [0.95, 1.20] },
    { id: "profit", label: "普通盈利", weight: 0.33, range: [1.18, 1.38] },
    { id: "bigProfit", label: "大赚", weight: 0.10, range: [1.60, 2.20] },
    { id: "jackpot", label: "爆仓", weight: 0.02, range: [2.80, 4.20] }
  ];

  const VALUE_BUCKETS = {
    ordinary: [
      { weight: 0.18, ratio: 0.12 },
      { weight: 0.36, ratio: 0.24 },
      { weight: 0.29, ratio: 0.45 },
      { weight: 0.14, ratio: 0.85 },
      { weight: 0.03, ratio: 1.50 }
    ],
    collectible: [
      { weight: 0.22, ratio: 0.12 },
      { weight: 0.38, ratio: 0.30 },
      { weight: 0.26, ratio: 0.65 },
      { weight: 0.115, ratio: 1.50 },
      { weight: 0.025, ratio: 3.80 }
    ],
    fragment: [
      { weight: 0.23, ratio: 0.10 },
      { weight: 0.40, ratio: 0.28 },
      { weight: 0.25, ratio: 0.60 },
      { weight: 0.10, ratio: 1.35 },
      { weight: 0.02, ratio: 3.20 }
    ],
    trash: [
      { weight: 0.25, ratio: -0.03 },
      { weight: 0.38, ratio: -0.08 },
      { weight: 0.27, ratio: -0.18 },
      { weight: 0.10, ratio: -0.40 }
    ]
  };

  const SALE_MULTIPLIER = { ordinary: 1, collectible: 0.9, fragment: 0.84, trash: 1 };

  const ORDINARY_MARKET_CATEGORIES = ["商用库存", "影像器材", "工坊器材", "航海用品", "演出器材", "文体库存"];
  const PREMIUM_MARKET_CATEGORIES = ["奢侈配饰", "高级时装", "专业设备", "珠宝艺术", "车辆大奖", "复古收藏"];
  const MARKET_CATEGORIES = [...ORDINARY_MARKET_CATEGORIES, ...PREMIUM_MARKET_CATEGORIES];

  const ITEMS = {
    ordinary: [
      { name: "酒店布草包", category: "商用库存", tags: ["hotel", "textile", "bulky"] },
      { name: "成套客房台灯", category: "商用库存", tags: ["hotel", "fragile"] },
      { name: "餐具周转箱", category: "商用库存", tags: ["hotel", "fragile", "heavy"] },
      { name: "折叠展示架", category: "商用库存", tags: ["warehouse", "metal", "bulky"] },
      { name: "摄影补光灯", category: "影像器材", tags: ["photo", "fragile"] },
      { name: "三脚架套装", category: "影像器材", tags: ["photo", "metal"] },
      { name: "广播线材箱", category: "影像器材", tags: ["photo", "stage", "dense"] },
      { name: "舞台音箱", category: "演出器材", tags: ["stage", "heavy", "fragile"] },
      { name: "电钻工具箱", category: "工坊器材", tags: ["repair", "dense", "metal"] },
      { name: "小型电机", category: "工坊器材", tags: ["repair", "heavy", "metal", "oil"] },
      { name: "铜线盘", category: "工坊器材", tags: ["repair", "dense", "metal"] },
      { name: "轴承备件", category: "工坊器材", tags: ["repair", "dense", "metal", "oil"] },
      { name: "船用缆绳", category: "航海用品", tags: ["port", "heavy", "textile"] },
      { name: "旧式航行灯", category: "航海用品", tags: ["port", "fragile", "metal"] },
      { name: "舷窗配件", category: "航海用品", tags: ["port", "heavy", "metal"] },
      { name: "救生用品箱", category: "航海用品", tags: ["port", "bulky", "textile"] },
      { name: "球拍库存", category: "文体库存", tags: ["sports", "bulky"] },
      { name: "拼装模型库存", category: "文体库存", tags: ["sports", "fragile", "light"] }
    ],
    collectible: [
      { name: "瑞士陀飞轮腕表", category: "奢侈配饰", visualId: "luxury-0", riskProfile: "auth", storageSlots: 1, tags: ["luxury", "personal", "fragile", "dense"] },
      { name: "满钻高级腕表", category: "奢侈配饰", visualId: "luxury-1", riskProfile: "auth", storageSlots: 1, tags: ["luxury", "personal", "fragile", "dense"] },
      { name: "手工头层皮包", category: "奢侈配饰", visualId: "luxury-2", riskProfile: "auth", storageSlots: 1, tags: ["luxury", "fashion", "personal", "light"] },
      { name: "高级旅行箱", category: "奢侈配饰", visualId: "luxury-3", riskProfile: "auth", storageSlots: 2, tags: ["luxury", "fashion", "bulky"] },
      { name: "设计师礼服整批", category: "高级时装", visualId: "luxury-4", riskProfile: "fashion", storageSlots: 3, quantity: "1 整架", tags: ["fashion", "textile", "bulky"] },
      { name: "限量球鞋批货", category: "高级时装", visualId: "luxury-5", riskProfile: "fashion", storageSlots: 2, quantity: "6 双", tags: ["fashion", "sports", "bulky"] },
      { name: "精品羊绒大衣", category: "高级时装", visualId: "luxury-6", riskProfile: "fashion", storageSlots: 3, quantity: "5 件", tags: ["fashion", "textile", "bulky"] },
      { name: "设计师眼镜陈列盘", category: "高级时装", visualId: "luxury-7", riskProfile: "fashion", storageSlots: 2, quantity: "8 副", tags: ["fashion", "fragile", "light"] },
      { name: "数字电影摄影机", category: "专业设备", visualId: "luxury-8", riskProfile: "equipment", storageSlots: 2, tags: ["professional", "photo", "fragile", "dense"] },
      { name: "广播级变焦镜头", category: "专业设备", visualId: "premium-0", riskProfile: "equipment", storageSlots: 2, tags: ["professional", "photo", "fragile", "dense"] },
      { name: "专业电影无人机套装", category: "专业设备", visualId: "premium-1", riskProfile: "equipment", storageSlots: 3, tags: ["professional", "photo", "fragile"] },
      { name: "旗舰落地音箱对箱", category: "专业设备", visualId: "premium-2", riskProfile: "equipment", storageSlots: 4, quantity: "1 对", tags: ["professional", "stage", "heavy", "fragile"] },
      { name: "钻石珠宝套装", category: "珠宝艺术", visualId: "premium-3", riskProfile: "art", storageSlots: 1, tags: ["art", "luxury", "personal", "dense"] },
      { name: "足金现代摆件", category: "珠宝艺术", visualId: "premium-4", riskProfile: "art", storageSlots: 1, tags: ["art", "luxury", "metal", "dense"] },
      { name: "当代限量版画", category: "珠宝艺术", visualId: "premium-5", riskProfile: "art", storageSlots: 2, tags: ["art", "paper", "fragile", "light"] },
      { name: "当代琉璃雕塑", category: "珠宝艺术", visualId: "premium-6", riskProfile: "art", storageSlots: 2, tags: ["art", "fragile", "heavy"] },
      { name: "老式旁轴相机", category: "复古收藏", visualId: "vintage-0", riskProfile: "vintage", storageSlots: 1, tags: ["vintage", "photo", "personal", "fragile", "dense"] },
      { name: "老船罗盘", category: "复古收藏", visualId: "vintage-4", riskProfile: "vintage", storageSlots: 1, tags: ["vintage", "port", "oldPort", "fragile", "metal"] }
    ],
    fragment: [
      { name: "沉船航海图·西北角", set: "沉船航海图", tags: ["oldPort", "personal", "paper", "light"] },
      { name: "沉船航海图·东北角", set: "沉船航海图", tags: ["oldPort", "personal", "paper", "light"] },
      { name: "沉船航海图·西南角", set: "沉船航海图", tags: ["oldPort", "personal", "paper", "light"] },
      { name: "沉船航海图·东南角", set: "沉船航海图", tags: ["oldPort", "personal", "paper", "light"] },
      { name: "黄铜星盘·刻度环", set: "黄铜星盘", tags: ["oldPort", "personal", "metal", "dense"] },
      { name: "黄铜星盘·星针", set: "黄铜星盘", tags: ["oldPort", "personal", "metal", "light"] },
      { name: "黄铜星盘·悬臂", set: "黄铜星盘", tags: ["oldPort", "personal", "metal", "light"] },
      { name: "黄铜星盘·底盘", set: "黄铜星盘", tags: ["oldPort", "personal", "metal", "dense"] },
      { name: "消失的剧院·红玻璃", set: "消失的剧院", tags: ["stage", "personal", "fragile", "light"] },
      { name: "消失的剧院·蓝玻璃", set: "消失的剧院", tags: ["stage", "personal", "fragile", "light"] },
      { name: "消失的剧院·金徽片", set: "消失的剧院", tags: ["stage", "personal", "metal", "light"] },
      { name: "消失的剧院·铭牌", set: "消失的剧院", tags: ["stage", "personal", "metal", "light"] }
    ],
    trash: [
      { name: "八十只左脚溜冰鞋", kind: "oddity", tags: ["sports", "bulky", "mismatch"] },
      { name: "整箱过期挂历", kind: "disposal", tags: ["warehouse", "paper", "bulky"] },
      { name: "找不到主机的遥控器", kind: "oddity", tags: ["photo", "warehouse", "mismatch"] },
      { name: "只有杯盖没有杯", kind: "oddity", tags: ["hotel", "mismatch"] },
      { name: "同款石膏头像", kind: "oddity", tags: ["stage", "heavy", "fragile"] },
      { name: "巨型龙虾灯牌", kind: "oddity", tags: ["stage", "bulky", "fragile"] },
      { name: "残缺霓虹字母", kind: "scrap", tags: ["stage", "fragile", "mismatch"] },
      { name: "七十二把无锁钥匙", kind: "oddity", tags: ["hotel", "metal", "mismatch"] },
      { name: "泡水木板", kind: "disposal", tags: ["warehouse", "wet", "heavy"] },
      { name: "发霉床垫", kind: "disposal", tags: ["hotel", "wet", "bulky"] },
      { name: "淘汰转接线", kind: "scrap", tags: ["photo", "warehouse", "mismatch"] },
      { name: "打不开的空保险箱", kind: "scrap", tags: ["personal", "heavy", "dense"] },
      { name: "裂缝水族箱", kind: "disposal", tags: ["warehouse", "fragile", "bulky"] },
      { name: "只有腿的椅子", kind: "scrap", tags: ["hotel", "mismatch", "bulky"] },
      { name: "石膏金砖", kind: "oddity", tags: ["personal", "heavy", "mismatch"] },
      { name: "空镜头盒", kind: "oddity", tags: ["photo", "light", "mismatch"] },
      { name: "只有正面的戏服", kind: "oddity", tags: ["stage", "textile", "mismatch"] },
      { name: "船舱压载块", kind: "disposal", tags: ["port", "heavy", "dense", "mismatch"] }
    ]
  };

  const JACKPOT_ITEMS = [
    { name: "高性能中置跑车", category: "车辆大奖", visualId: "premium-7", riskProfile: "vehicle", storageSlots: 10, quantity: "1 辆", isVehicle: true, tags: ["vehicle", "luxury", "heavy", "dense"] },
    { name: "稀有高性能摩托", category: "车辆大奖", visualId: "premium-8", riskProfile: "vehicle", storageSlots: 6, quantity: "1 辆", isVehicle: true, tags: ["vehicle", "luxury", "heavy", "dense"] }
  ];

  const MANIFESTS = [
    { id: "hotel_clearance", label: "旅店清仓物资", tags: ["hotel"] },
    { id: "photo_studio", label: "影像工作室器材", tags: ["photo"] },
    { id: "ship_repair", label: "船厂维修备件", tags: ["repair", "port"] },
    { id: "stage_tour", label: "巡演舞台物资", tags: ["stage"] },
    { id: "sports_stock", label: "文体用品库存", tags: ["sports"] },
    { id: "personal_effects", label: "未分类私人旧物", tags: ["personal"] },
    { id: "warehouse_returns", label: "仓储退运杂货", tags: ["warehouse", "mismatch"] },
    { id: "old_port_transfer", label: "旧港转运留置物", tags: ["oldPort", "port", "vintage"] },
    { id: "luxury_returns", label: "精品店退运货", tags: ["luxury", "fashion"] },
    { id: "fashion_transfer", label: "高级成衣转运货", tags: ["fashion", "textile"] },
    { id: "production_gear", label: "影视制作设备", tags: ["professional", "photo"] },
    { id: "gallery_transfer", label: "画廊转运陈设", tags: ["art", "fragile"] },
    { id: "vehicle_transfer", label: "车辆及配套部件", tags: ["vehicle", "heavy"] },
    { id: "private_collection", label: "私人收藏寄存物", tags: ["luxury", "art", "vintage", "personal"] }
  ];

  const EXTERIORS = [
    { id: "dry_dust", text: "门缝积着干灰", evidence: 1, means: "明显进水风险较低" },
    { id: "intact_seal", text: "铅封完整，编号连贯", evidence: 1, means: "被翻找或调包的概率较低" },
    { id: "reinforced_corner", text: "四角做过加固", evidence: 1, means: "可能重视防撞，也可能只是货物过重" },
    { id: "fresh_repaint", text: "箱门有新补漆", evidence: 0, means: "遮锈还是维护无法确定" },
    { id: "old_customs_mark", text: "残留旧海关粉笔记号", evidence: 0, means: "经历过查验，价值方向未知" },
    { id: "clean_but_old", text: "外壳干净，锁扣却严重老化", evidence: 0, means: "外观可能被临时整理过" },
    { id: "uneven_floor", text: "箱体落地后略向后倾", evidence: 0, means: "重物集中在后侧" },
    { id: "salt_crystal", text: "底梁挂着盐霜", evidence: -1, means: "长期潮气风险" },
    { id: "rusted_hinge", text: "门铰锈蚀，开合发涩", evidence: -1, means: "内部品相存在风险" },
    { id: "low_waterline", text: "箱底有浅水线", evidence: -2, means: "下层物品可能受潮" },
    { id: "bulged_panel", text: "侧板从内部顶出", evidence: -2, means: "可能装满，也可能散货挤压" },
    { id: "high_waterline", text: "水线越过半扇箱门", evidence: -3, means: "大面积水损风险" }
  ];

  const INSPECTIONS = {
    documents: {
      label: "查单据",
      help: "更懂可能是什么",
      results: [
        { id: "single_owner", text: "原始货主单一，品名记录连续", evidence: 1, class: "good", means: "申报方向更可信" },
        { id: "sealed_inventory", text: "附有完整装箱数量，但没有估价", evidence: 2, class: "good", means: "缺件风险降低" },
        { id: "fragile_insured", text: "曾按易碎品投保，保额已被涂去", evidence: 1, class: "good", means: "包装可能较认真" },
        { id: "mixed_bills", text: "三批货单被订在一起", evidence: 0, class: "mixed", means: "混装概率高" },
        { id: "customs_opened", text: "记录显示曾被海关开箱复封", evidence: 0, class: "mixed", means: "封条变化有合理来源" },
        { id: "handwritten_change", text: "品名被手写改过一次", evidence: -1, class: "bad", means: "申报可信度降低" },
        { id: "many_transfers", text: "货权连续转手四次", evidence: -1, class: "bad", means: "缺件和混货概率上升" },
        { id: "claim_return", text: "上一任货主提交过残损理赔", evidence: -2, class: "bad", means: "已知存在损坏" },
        { id: "disposal_note", text: "备注写着“到港后自行处置”", evidence: -2, class: "bad", means: "清理成本风险上升" }
      ]
    },
    weigh: {
      label: "过磅",
      help: "更懂可能有多少",
      results: [
        { id: "matched_stable", text: "重量与申报接近，重心稳定", evidence: 1, class: "stable", means: "数量和包装较符合记录" },
        { id: "slightly_heavy", text: "比申报重 12%，重心居中", evidence: 1, class: "heavy", means: "可能多装或含金属件" },
        { id: "dense_corner", text: "整体不重，后角却有高密度物体", evidence: 0, class: "dense", means: "设备、保险箱、配重或小件皆有可能" },
        { id: "very_heavy", text: "明显超重，叉车起步吃力", evidence: 0, class: "heavy", means: "金属设备和废料都有可能" },
        { id: "bulky_light", text: "体积占满，实际重量偏轻", evidence: 0, class: "light", means: "布草、道具、空包装或泡沫箱" },
        { id: "slightly_light", text: "比申报轻 18%", evidence: -1, class: "light", means: "可能缺件" },
        { id: "shifting_center", text: "移动后重心明显滑向箱门", evidence: -1, class: "unstable", means: "固定包装可能破损" },
        { id: "near_empty", text: "称重接近空箱自重", evidence: -3, class: "empty", means: "大概率货少或近乎空箱" },
        { id: "wet_weight", text: "重量异常增加，箱底持续滴水", evidence: -3, class: "wet", means: "额外重量很可能来自积水" }
      ]
    },
    door: {
      label: "验箱门",
      help: "更懂保存得怎么样",
      results: [
        { id: "dry_paper", text: "探纸抽出后干燥，只有陈旧纸味", evidence: 2, class: "dry", means: "保存风险明显降低" },
        { id: "intact_foam", text: "门缝内能看到完整防震泡棉", evidence: 2, class: "packed", means: "至少表层包装认真" },
        { id: "ordered_crates", text: "里面是固定整齐的木箱边缘", evidence: 1, class: "packed", means: "散落和碰撞风险较低" },
        { id: "cloth_wrap", text: "能勾到多层旧布包裹", evidence: 1, class: "packed", means: "可能保护着器材或普通布货" },
        { id: "oil_smell", text: "有机油味，没有霉味", evidence: 0, class: "oil", means: "机械和金属件概率上升" },
        { id: "mixed_bags", text: "门口堆着不同规格的编织袋", evidence: 0, class: "mixed", means: "混装明显" },
        { id: "loose_metal", text: "轻推箱门能听到散落金属碰撞", evidence: -1, class: "loose", means: "工具零件或废料都有可能" },
        { id: "damp_cardboard", text: "探纸带出湿纸板纤维", evidence: -2, class: "wet", means: "下层包装受潮" },
        { id: "mold_smell", text: "门缝有明显霉味", evidence: -2, class: "wet", means: "布料、纸品和木件风险高" },
        { id: "pest_trace", text: "门槛处发现虫蛀碎屑", evidence: -2, class: "pest", means: "有机材料保存风险高" },
        { id: "black_water", text: "探纸末端沾到黑色积水", evidence: -3, class: "wet", means: "严重水损与处置费风险" }
      ]
    }
  };

  const FOG_OUTCOMES = [
    { id: "empty", weight: 0.14, quickRatio: -0.12, assetRatio: -0.12, type: "trash" },
    { id: "nearEmpty", weight: 0.22, quickRatio: 0.35, assetRatio: 0.42, types: ["ordinary", "trash"] },
    { id: "loss", weight: 0.22, quickRatio: 0.70, assetRatio: 0.84, types: ["ordinary", "collectible", "fragment"] },
    { id: "nearEven", weight: 0.18, quickRatio: 1.00, assetRatio: 1.08, types: ["ordinary", "collectible", "fragment"] },
    { id: "profit", weight: 0.15, quickRatio: 1.60, assetRatio: 1.85, types: ["collectible", "fragment", "ordinary"] },
    { id: "bigProfit", weight: 0.07, quickRatio: 3.00, assetRatio: 3.40, types: ["collectible", "fragment"] },
    { id: "jackpot", weight: 0.02, quickRatio: 6.00, assetRatio: 6.80, types: ["collectible", "fragment"] }
  ];

  const NPCS = [
    { id: "zhao", name: "赵叔", style: "稳健旧货商", cash: 12000, aggression: 0.94, inspection: "door", likes: ["hotel_clearance", "ship_repair"] },
    { id: "qiao", name: "乔姐", style: "挑剔收藏家", cash: 22000, aggression: 1.03, inspection: "documents", likes: ["personal_effects", "old_port_transfer", "photo_studio"] },
    { id: "ayong", name: "阿勇", style: "情绪型赌徒", cash: 8000, aggression: 1.12, inspection: "weigh", likes: ["warehouse_returns", "old_port_transfer"] },
    { id: "luo", name: "罗老板", style: "精算转卖商", cash: 42000, aggression: 0.99, inspection: "documents", likes: ["photo_studio", "ship_repair", "stage_tour"] },
    { id: "tang", name: "小唐", style: "胆小新人", cash: 6000, aggression: 0.9, inspection: "door", likes: ["sports_stock", "hotel_clearance"] }
  ];

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function between(random, min, max) {
    return min + (max - min) * random();
  }

  function normal(random, mean, deviation) {
    const u = Math.max(random(), Number.EPSILON);
    const v = Math.max(random(), Number.EPSILON);
    return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundMoney(value) {
    return Math.round(value / 10) * 10;
  }

  function pick(random, rows) {
    return rows[Math.floor(random() * rows.length)];
  }

  function pickWeighted(random, rows) {
    const total = rows.reduce((sum, row) => sum + row.weight, 0);
    let cursor = random() * total;
    for (const row of rows) {
      cursor -= row.weight;
      if (cursor <= 0) return row;
    }
    return rows[rows.length - 1];
  }

  function shuffled(random, rows) {
    const copy = rows.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
    }
    return copy;
  }

  function getTierMix(totalAssets) {
    if (totalAssets >= 30000) return TIER_MIX.legacy.slice();
    if (totalAssets >= 12000) return TIER_MIX.bonded.slice();
    return TIER_MIX.starter.slice();
  }

  function rollMarket(random) {
    const multipliers = {};
    const ordered = shuffled(random, MARKET_CATEGORIES);
    const downCount = random() < 0.5 ? 1 : 2;
    const upCount = random() < 0.5 ? 1 : 2;
    const downCategories = new Set(ordered.slice(0, downCount));
    const upCategories = new Set(ordered.slice(downCount, downCount + upCount));
    for (const category of MARKET_CATEGORIES) {
      let range = [0.95, 1.05];
      if (downCategories.has(category)) range = random() < 0.5 ? [0.70, 0.80] : [0.80, 0.945];
      if (upCategories.has(category)) range = random() < 0.2 ? [1.15, 1.20] : [1.055, 1.15];
      multipliers[category] = Number(between(random, range[0], range[1]).toFixed(3));
    }
    const sorted = Object.entries(multipliers).sort((a, b) => b[1] - a[1]);
    const featuredCategories = [...new Set([
      sorted[0][0],
      sorted[sorted.length - 1][0],
      ...ordered
    ])].slice(0, 6);
    return {
      multipliers,
      featuredCategories,
      headlineUp: sorted[0][0],
      headlineDown: sorted[sorted.length - 1][0]
    };
  }

  function rollCondition(random, outcomeId) {
    const byOutcome = {
      severeLoss: ["报废", "重损", "残旧"],
      loss: ["重损", "残旧", "一般"],
      nearEven: ["残旧", "一般", "良好"],
      profit: ["一般", "良好", "完整"],
      bigProfit: ["残旧", "良好", "完整"],
      jackpot: ["一般", "良好", "完整"]
    };
    return pick(random, byOutcome[outcomeId] || byOutcome.nearEven);
  }

  function quantityLabel(random, type, source) {
    if (source && source.quantity) return source.quantity;
    if (type === "ordinary") return pick(random, ["1 批", "2 箱", "3 箱", "成套"]);
    if (type === "fragment") return "1 片";
    if (type === "trash") return pick(random, ["1 堆", "1 批", "塞满一角"]);
    return "1 件";
  }

  function collectibleAssessment(random, source, outcomeId) {
    const level = outcomeId === "severeLoss" ? 0
      : outcomeId === "loss" ? 1
        : outcomeId === "nearEven" ? 2
          : outcomeId === "profit" ? 3
            : 4;
    const profiles = {
      auth: [
        ["高仿货，材质检测不符", "仿品"],
        ["真伪存疑，附件缺失", "存疑"],
        ["确认正品，但缺盒证", "一般"],
        ["确认正品，附件基本齐全", "良好"],
        ["正品全套，编号与证书一致", "完整"]
      ],
      fashion: [
        ["霉变并混入大量仿品", "重损"],
        ["部分仿品，尺码严重断档", "残旧"],
        ["确认正品，但款式过季", "一般"],
        ["正品居多，吊牌基本完整", "良好"],
        ["当季正品整批，尺码齐全", "完整"]
      ],
      equipment: [
        ["核心故障，维修价值很低", "重损"],
        ["无法完整开机，缺关键配件", "残旧"],
        ["功能可用，耗材与附件不全", "一般"],
        ["通过测试，仅有轻微使用痕迹", "良好"],
        ["低使用时长，原装附件齐全", "完整"]
      ],
      art: [
        ["材质与申报不符，基本无收藏价值", "仿品"],
        ["来源记录断裂，市场认可度很低", "存疑"],
        ["材质确认，作者或批次仍待核验", "一般"],
        ["附工作室或检测文件", "良好"],
        ["来源完整，可追溯且品相上佳", "完整"]
      ],
      vintage: [
        ["大量后配件，核心结构损坏", "重损"],
        ["翻修痕迹明显，真伪存疑", "残旧"],
        ["主体原装，功能需要保养", "一般"],
        ["原装度较高，功能正常", "良好"],
        ["罕见原装全套，保存完整", "完整"]
      ],
      vehicle: [
        ["泡水事故车，无有效手续", "报废"],
        ["事故修复痕迹重，缺钥匙或手续", "重损"],
        ["可以启动，但手续或保养记录不全", "一般"],
        ["车况良好，手续可以补齐", "良好"],
        ["低里程完整车况，钥匙手续齐全", "完整"]
      ]
    };
    const profile = profiles[source.riskProfile] || profiles.vintage;
    const row = profile[level];
    return { assessment: row[0], condition: row[1] };
  }

  function itemRarity(item, expectedClose) {
    if (item.isVehicle) return "legendary";
    if (item.type === "fragment") return "fragment";
    if (item.type !== "collectible") return item.type === "trash" ? "junk" : "standard";
    const ratio = expectedClose > 0 ? item.neutralValue / expectedClose : 0;
    if (ratio >= 1.8) return "legendary";
    if (ratio >= 0.9) return "epic";
    if (ratio >= 0.45) return "rare";
    return "premium";
  }

  function sourceForType(random, type, vehicleItem) {
    if (type === "collectible" && vehicleItem) return vehicleItem;
    return pick(random, ITEMS[type]);
  }

  function chooseManifest(random, items) {
    const scored = MANIFESTS.map((manifest) => ({
      manifest,
      score: items.reduce(
        (sum, item) => sum + item.tags.filter((tag) => manifest.tags.includes(tag)).length,
        0
      )
    })).sort((a, b) => b.score - a.score);

    const bestScore = scored[0].score;
    const best = scored.filter((row) => row.score === bestScore).map((row) => row.manifest);
    if (bestScore === 0 || random() < 0.18) return pick(random, MANIFESTS);
    return pick(random, best);
  }

  function chooseByEvidence(random, rows, targetEvidence) {
    const weighted = rows.map((row) => ({
      value: row,
      weight: 1 / (1 + Math.abs(row.evidence - targetEvidence) * 2.5)
    }));
    return pickWeighted(random, weighted).value;
  }

  function latentState(random, outcomeId, items) {
    const riskBase = { severeLoss: 2.6, loss: 1.5, nearEven: 0.4, profit: -0.4, bigProfit: -0.5, jackpot: -0.2 };
    const trashCount = items.filter((item) => item.type === "trash").length;
    const wetTag = items.some((item) => item.tags.includes("wet")) ? 1 : 0;
    const fragileCount = items.filter((item) => item.tags.includes("fragile")).length;
    const packedCount = items.filter((item) => item.type === "collectible" || item.type === "fragment").length;
    const heavyCount = items.filter((item) => item.tags.includes("heavy") || item.tags.includes("dense")).length;
    const lightCount = items.filter((item) => item.tags.includes("light") || item.tags.includes("bulky")).length;
    const risk = clamp((riskBase[outcomeId] || 0) + trashCount * 0.35 + wetTag + normal(random, 0, 0.75), -2, 4);
    return {
      risk,
      moisture: clamp(Math.round(risk + wetTag + normal(random, -0.4, 0.8)), 0, 3),
      packaging: clamp(Math.round(1 + packedCount * 0.35 - risk * 0.25 + normal(random, 0, 0.6)), 0, 2),
      documentReliability: clamp(Math.round(1.5 - trashCount * 0.25 - risk * 0.12 + normal(random, 0, 0.65)), 0, 2),
      heavyCount,
      lightCount,
      fragileCount,
      nearEmpty: items.length === 0 || items.every((item) => item.tags.includes("light"))
    };
  }

  function buildInspectionResults(random, latent, items) {
    let documentClass = "mixed";
    if (latent.documentReliability >= 2) documentClass = "good";
    if (latent.documentReliability <= 0) documentClass = "bad";
    const documentRows = INSPECTIONS.documents.results.filter((row) => row.class === documentClass);
    const documents = pick(random, documentRows);

    let weighClass = "stable";
    if (latent.moisture >= 3 && random() < 0.55) weighClass = "wet";
    else if (latent.nearEmpty && random() < 0.55) weighClass = "empty";
    else if (latent.heavyCount >= 2) weighClass = random() < 0.48 ? "heavy" : "dense";
    else if (latent.lightCount >= 2) weighClass = "light";
    else if (latent.risk > 1.6 && random() < 0.35) weighClass = "unstable";
    const weighRows = INSPECTIONS.weigh.results.filter((row) => row.class === weighClass);
    const weigh = pick(random, weighRows.length ? weighRows : INSPECTIONS.weigh.results);

    let doorClass = "mixed";
    if (latent.moisture >= 2) doorClass = "wet";
    else if (latent.packaging >= 2) doorClass = "packed";
    else if (items.some((item) => item.tags.includes("oil"))) doorClass = "oil";
    else if (items.some((item) => item.tags.includes("metal")) && latent.risk > 0.8) doorClass = "loose";
    else if (latent.moisture === 0 && latent.risk < 0.2) doorClass = "dry";
    const doorRows = INSPECTIONS.door.results.filter((row) => row.class === doorClass);
    const door = pick(random, doorRows.length ? doorRows : INSPECTIONS.door.results);

    return {
      documents: { action: "documents", label: INSPECTIONS.documents.label, help: INSPECTIONS.documents.help, ...documents },
      weigh: { action: "weigh", label: INSPECTIONS.weigh.label, help: INSPECTIONS.weigh.help, ...weigh },
      door: { action: "door", label: INSPECTIONS.door.label, help: INSPECTIONS.door.help, ...door }
    };
  }

  function generateRegularContainer(random, tierId, index, market) {
    const tier = TIERS[tierId];
    const startingBid = roundMoney(between(random, tier.start[0], tier.start[1]));
    const expectedClose = roundMoney(
      Math.max(between(random, tier.close[0], tier.close[1]), startingBid * 1.1)
    );
    let outcome = pickWeighted(random, OUTCOME_BANDS);
    const layers = [];
    const vehicleEligible = ["high", "bonded", "legacy"].includes(tierId);
    const vehicleItem = vehicleEligible && random() < 0.025 ? pick(random, JACKPOT_ITEMS) : null;
    const vehicleLayer = vehicleItem ? Math.floor(random() * 3) : -1;

    for (let layerIndex = 0; layerIndex < 3; layerIndex += 1) {
      const type = layerIndex === vehicleLayer ? "collectible" : pickWeighted(random, TYPE_WEIGHTS).id;
      const source = sourceForType(random, type, layerIndex === vehicleLayer ? vehicleItem : null);
      const ratio = pickWeighted(random, VALUE_BUCKETS[type]).ratio;
      const neutralValue = expectedClose * ratio;
      const marketMultiplier = type === "ordinary" || type === "collectible"
        ? market.multipliers[source.category] || 1
        : 1;
      layers.push({
        layer: layerIndex + 1,
        type,
        name: source.name,
        category: source.category || source.set || source.kind,
        set: source.set || null,
        kind: source.kind || null,
        visualId: source.visualId || null,
        riskProfile: source.riskProfile || null,
        storageSlots: source.storageSlots || 1,
        isVehicle: Boolean(source.isVehicle),
        tags: source.tags.slice(),
        quantity: quantityLabel(random, type, source),
        neutralValue,
        quickValue: neutralValue * SALE_MULTIPLIER[type] * marketMultiplier
      });
    }

    const positive = layers.filter((item) => item.neutralValue > 0);
    if (positive.length === 0) {
      outcome = OUTCOME_BANDS[0];
    } else {
      const negativeValue = layers
        .filter((item) => item.neutralValue <= 0)
        .reduce((sum, item) => sum + item.neutralValue, 0);
      const rawPositive = positive.reduce((sum, item) => sum + item.neutralValue, 0);
      const targetValue = expectedClose * between(random, outcome.range[0], outcome.range[1]);
      const positiveScale = Math.max(0, targetValue - negativeValue) / rawPositive;
      for (const item of positive) {
        item.neutralValue *= positiveScale;
        const multiplier = item.type === "ordinary" || item.type === "collectible"
          ? market.multipliers[item.category] || 1
          : 1;
        item.quickValue = item.neutralValue * SALE_MULTIPLIER[item.type] * multiplier;
      }
    }

    for (const item of layers) {
      if (item.type === "collectible") {
        const assessed = collectibleAssessment(random, item, outcome.id);
        item.condition = assessed.condition;
        item.assessment = assessed.assessment;
      } else {
        item.condition = rollCondition(random, outcome.id);
        item.assessment = null;
      }
      item.handlingFee = item.isVehicle ? roundMoney(expectedClose * (outcome.id === "severeLoss" ? 0.18 : 0.08)) : 0;
      item.quickValue -= item.handlingFee;
      item.rarity = itemRarity(item, expectedClose);
      item.neutralValue = roundMoney(item.neutralValue);
      item.quickValue = roundMoney(item.quickValue);
      item.cleanupFee = item.quickValue < 0 ? Math.abs(item.quickValue) : 0;
    }

    const manifest = chooseManifest(random, layers);
    const latent = latentState(random, outcome.id, layers);
    const exteriorTarget = clamp(Math.round(-latent.risk + normal(random, 0, 0.8)), -3, 1);
    const exterior = chooseByEvidence(random, EXTERIORS, exteriorTarget);
    const inspectionResults = buildInspectionResults(random, latent, layers);

    return {
      id: `C${index + 1}`,
      slot: index,
      type: "regular",
      isFog: false,
      tier: tierId,
      tierLabel: tier.label,
      startingBid,
      public: {
        manifest: { id: manifest.id, text: manifest.label },
        exterior: { id: exterior.id, text: exterior.text, evidence: exterior.evidence, means: exterior.means }
      },
      inspectionResults,
      trueState: {
        outcome: outcome.id,
        outcomeLabel: outcome.label,
        neutralValue: layers.reduce((sum, item) => sum + item.neutralValue, 0),
        quickValue: layers.reduce((sum, item) => sum + item.quickValue, 0),
        layers
      },
      auctionReference: expectedClose
    };
  }

  function fogItemForOutcome(random, outcome, tierId) {
    if (outcome.id === "empty") {
      return { name: "积水与空托盘", category: "处置垃圾", kind: "disposal", tags: ["wet", "warehouse", "light"] };
    }
    const type = outcome.type || pick(random, outcome.types);
    if (type === "collectible" && ["high", "bonded", "legacy"].includes(tierId)) {
      const vehicleChance = outcome.id === "jackpot" ? 0.35 : outcome.id === "bigProfit" ? 0.08 : 0;
      if (random() < vehicleChance) return { ...pick(random, JACKPOT_ITEMS), type };
    }
    const source = pick(random, ITEMS[type]);
    return { ...source, type };
  }

  function generateFogContainer(random, tierId, index, market) {
    const tier = TIERS[tierId];
    const startingBid = roundMoney(between(random, tier.start[0], tier.start[1]));
    const expectedClose = roundMoney(
      Math.max(between(random, tier.close[0], tier.close[1]), startingBid * 1.1)
    );
    const outcome = pickWeighted(random, FOG_OUTCOMES);
    const source = fogItemForOutcome(random, outcome, tierId);
    const type = source.type || "trash";
    const neutralValue = roundMoney(expectedClose * outcome.assetRatio);
    const marketMultiplier = type === "ordinary" || type === "collectible"
      ? market.multipliers[source.category] || 1
      : 1;
    const handlingFee = source.isVehicle ? roundMoney(expectedClose * (outcome.id === "loss" ? 0.16 : 0.08)) : 0;
    const quickValue = roundMoney(expectedClose * outcome.quickRatio * marketMultiplier - handlingFee);
    const fogAssessment = type === "collectible"
      ? collectibleAssessment(random, source, outcome.id === "nearEmpty" ? "loss" : outcome.id)
      : null;
    const layers = outcome.id === "empty"
      ? []
      : [{
          layer: 1,
          type,
          name: source.name,
          category: source.category || source.set || source.kind,
          set: source.set || null,
          kind: source.kind || null,
          visualId: source.visualId || null,
          riskProfile: source.riskProfile || null,
          storageSlots: source.storageSlots || 1,
          isVehicle: Boolean(source.isVehicle),
          tags: source.tags.slice(),
          quantity: quantityLabel(random, type, source),
          condition: fogAssessment ? fogAssessment.condition : rollCondition(random, outcome.id === "nearEmpty" ? "loss" : "nearEven"),
          assessment: fogAssessment ? fogAssessment.assessment : null,
          rarity: source.isVehicle ? "legendary" : outcome.id === "jackpot" ? "legendary" : outcome.id === "bigProfit" ? "epic" : type === "collectible" ? "rare" : type,
          neutralValue,
          quickValue,
          handlingFee,
          cleanupFee: quickValue < 0 ? Math.abs(quickValue) : 0
        }];
    const cluePool = [
      { id: "no_manifest", text: "单据缺失，只剩一枚旧封签", evidence: 0, means: "品类完全未知" },
      { id: "covered_door", text: "黑色篷布盖住了原始箱门", evidence: 0, means: "无法进行常规验箱" },
      { id: "scratched_code", text: "箱号被刮去两位", evidence: -1, means: "流转记录无法完整追溯" },
      { id: "odd_seal", text: "封条样式早于箱体生产年份", evidence: 0, means: "可能换封或重复使用旧封条" },
      { id: "sealed_inner", text: "门缝里还有一层木封板", evidence: 1, means: "内部曾被额外封装，但原因未知" }
    ];
    const clue = pick(random, cluePool);
    return {
      id: `C${index + 1}`,
      slot: index,
      type: "fog",
      isFog: true,
      tier: tierId,
      tierLabel: "无单柜",
      startingBid,
      public: { manifest: { id: "unknown", text: "无申报" }, exterior: clue },
      inspectionResults: null,
      trueState: {
        outcome: outcome.id,
        outcomeLabel: outcome.id,
        neutralValue,
        quickValue,
        layers
      },
      auctionReference: expectedClose
    };
  }

  function mergeNpcState(npc, npcStates) {
    const state = npcStates && npcStates[npc.id] ? npcStates[npc.id] : {};
    return {
      ...npc,
      cash: Number.isFinite(state.cash) ? Math.max(0, state.cash) : npc.cash,
      mood: Number.isFinite(state.mood) ? clamp(state.mood, 0.75, 1.25) : null,
      relationship: Number.isFinite(state.relationship) ? clamp(state.relationship, -100, 100) : 0
    };
  }

  function npcEstimateFromClues(random, publicView, npc) {
    const inspection = publicView.inspectionResults
      ? publicView.inspectionResults[npc.inspection]
      : publicView.public.exterior;
    const exteriorEvidence = publicView.public.exterior.evidence || 0;
    const inspectionEvidence = inspection ? inspection.evidence || 0 : 0;
    const preference = npc.likes.includes(publicView.public.manifest.id) ? 0.07 : 0;
    const fogBias = publicView.isFog && npc.id === "ayong" ? 0.12 : publicView.isFog ? -0.05 : 0;
    const mood = npc.mood === null ? between(random, 0.88, 1.12) : npc.mood;
    const clueAdjustment = clamp(exteriorEvidence * 0.025 + inspectionEvidence * 0.035, -0.14, 0.14);
    const noisyOpinion = normal(random, 0, npc.id === "ayong" ? 0.22 : 0.13);
    const estimatedValue = Math.max(
      publicView.startingBid,
      publicView.auctionReference * (1 + clueAdjustment + preference + fogBias + noisyOpinion)
    );
    const spendableCash = npc.cash * (npc.id === "ayong" ? 0.92 : 0.78);
    const maxBid = Math.max(0, Math.min(spendableCash, estimatedValue * npc.aggression * mood));
    return {
      npcId: npc.id,
      name: npc.name,
      style: npc.style,
      cash: roundMoney(npc.cash),
      mood: Number(mood.toFixed(3)),
      privateInspection: npc.inspection,
      estimatedValue: roundMoney(estimatedValue),
      maxBid: roundMoney(maxBid),
      willEnter: maxBid >= publicView.startingBid
    };
  }

  function attachNpcEstimates(random, containers, activeNpcs) {
    for (const container of containers) {
      const publicView = {
        isFog: container.isFog,
        startingBid: container.startingBid,
        auctionReference: container.auctionReference,
        public: container.public,
        inspectionResults: container.inspectionResults
      };
      container.npcEstimates = activeNpcs.map((npc) => npcEstimateFromClues(random, publicView, npc));
    }
  }

  function rollMerchant(random) {
    if (random() >= 0.48) return null;
    const targets = [
      ...ORDINARY_MARKET_CATEGORIES.map((category) => ({ type: "ordinary", category })),
      ...PREMIUM_MARKET_CATEGORIES.map((category) => ({ type: "collectible", category })),
      { type: "fragment", category: "宝藏碎片" },
      { type: "trash", category: "诙谐异物" }
    ];
    const target = pick(random, targets);
    return {
      id: `M-${Math.floor(random() * 9000 + 1000)}`,
      title: pick(random, ["临时收货商", "直播间定向买家", "港口收藏客"]),
      targetType: target.type,
      targetCategory: target.category,
      premium: Number(between(random, 1.10, 1.30).toFixed(3)),
      maxLots: Math.floor(between(random, 1, 4))
    };
  }

  function validateDateKey(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("dateKey 必须使用 YYYY-MM-DD 格式");
  }

  function createDailyBoard(options) {
    const settings = options || {};
    const dateKey = String(settings.dateKey || localDateKey());
    const saveSeed = String(settings.saveSeed || "local-save");
    const totalAssets = Math.max(0, Number(settings.totalAssets) || 0);
    validateDateKey(dateKey);

    const seedText = `cargo-daily|${VERSION}|${dateKey}|${saveSeed}`;
    const unlockBand = totalAssets >= 30000 ? "legacy" : totalAssets >= 12000 ? "bonded" : "starter";
    const seed = hashString(seedText);
    const random = createRandom(seed);
    const market = rollMarket(random);
    const mix = getTierMix(totalAssets);
    const fogCandidates = [];
    for (let index = 1; index < mix.length; index += 1) {
      if (random() < 0.05) fogCandidates.push(index);
    }
    const fogIndex = fogCandidates.length ? pick(random, fogCandidates) : -1;
    const containers = mix.map((tierId, index) =>
      index === fogIndex
        ? generateFogContainer(random, tierId, index, market)
        : generateRegularContainer(random, tierId, index, market)
    );

    const npcPool = NPCS.map((npc) => mergeNpcState(npc, settings.npcStates));
    const activeNpcs = shuffled(random, npcPool).slice(0, 3);
    attachNpcEstimates(random, containers, activeNpcs);

    return {
      schemaVersion: VERSION,
      boardId: `D-${hashString(seedText + "|" + unlockBand + "|board").toString(16).padStart(8, "0")}`,
      dateKey,
      saveSeedHash: hashString(saveSeed).toString(16).padStart(8, "0"),
      totalAssetsAtRefresh: roundMoney(totalAssets),
      unlockBand,
      market,
      merchant: rollMerchant(random),
      activeNpcs: activeNpcs.map((npc) => ({ id: npc.id, name: npc.name, style: npc.style, cash: roundMoney(npc.cash) })),
      containers
    };
  }

  function localDateKey(dateValue) {
    const date = dateValue instanceof Date ? dateValue : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function publicContainerView(container) {
    return {
      id: container.id,
      slot: container.slot,
      type: container.type,
      isFog: container.isFog,
      tier: container.tier,
      tierLabel: container.tierLabel,
      startingBid: container.startingBid,
      public: {
        manifest: { id: container.public.manifest.id, text: container.public.manifest.text },
        exterior: {
          id: container.public.exterior.id,
          text: container.public.exterior.text,
          means: container.public.exterior.means
        }
      },
      inspectionChoices: container.inspectionResults
        ? Object.values(container.inspectionResults).map(({ action, label, help }) => ({ action, label, help }))
        : []
    };
  }

  return Object.freeze({
    VERSION,
    createDailyBoard,
    localDateKey,
    publicContainerView
  });
});
