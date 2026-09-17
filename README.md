# 港口开仓

一款面向小红书“小工具”的竖屏离线货柜盲盒游戏。玩家根据有限线索挑选货柜，在三锤拍卖中与 NPC 竞争，逐层开柜，再决定立即变现还是存入仓库等待行情、商户和收藏机会。

核心体验不是稳定赚钱，而是“未知揭晓 + 有依据地冒险 + 收集满足”。玩家可能开出实体藏品和宝藏碎片，也可能买到泡水木板、发霉床垫或一整箱只有杯盖没有杯的东西。

## 当前状态

仓库目前处于 **首个完整离线可玩版本已经接线并通过自动测试** 的阶段。

| 模块 | 状态 | 位置 |
|---|---|---|
| 完整竖屏小游戏 | 可直接试玩 | `index.html`、`app.js`、`styles.css`、`assets/` |
| 每日五柜生成 | 已实现并有测试 | `src/core/daily-generator.js` |
| 拍卖、开柜、处置、仓库状态机 | 已实现并有测试 | `src/core/game-engine.js` |
| 经济与概率模型 | 已实装并形成回归基线 | `src/core/daily-generator.js`、`docs/mechanics/ECONOMY_AND_PROBABILITY_BASELINE.md` |
| 线索配置 | 已形成基线 | `src/data/clue-config.json` |
| 拍卖场、仓库、交易摊、藏品册与直播反馈 | 已接线 | 根目录运行文件 |
| NPC 长线关系、榜一与随机事件 | 规则方向已确认，待实现 | `docs/mechanics/NPC_AND_RANDOM_EVENTS.md` |

根目录页面就是当前完整游戏入口。旧原型统一放在 `prototypes/archive/`，仅用于回溯，不再作为新功能开发入口。

## 游戏主循环

```text
每日一次刷新拍卖场
        ↓
从五个货柜中查看档位、申报和外观
        ↓
任选一次检查：查单据 / 过磅 / 验箱门
        ↓
放弃或进入三锤拍卖
        ↓
中标后逐层开柜；落败后可旁观 NPC 开柜
        ↓
逐件立即出售或收入仓库
        ↓
利用每日行情、定向商户、直播间和收藏需求择机出售
        ↓
隔日刷新新货柜与市场
```

首局目标是让玩家在 30–45 秒内完成第一次开柜。初期操作保持短平快，经营深度在玩家理解“挑柜—竞价—揭晓”后逐步出现。

## 已确认的设计原则

- 每天固定刷新五个货柜，当日不补货，隔日才换新。
- 初始展示低、中、高三档；总资产达到 12,000 和 30,000 后逐步出现保税柜与远洋遗存柜。
- 符合条件的位置各有 5% 概率替换为雾柜，每天最多一个；首个低价安全柜不被替换。
- 普通柜固定三层，但三层独立抽取，不设置“第三层保底”。
- 每层类型概率按柜档区分：低价柜 52/15/8/25%，中价柜 44/27/13/16%，高价柜 34/40/16/10%（普通/藏品/碎片/垃圾）。
- 常规柜也会明显亏损；雾柜波动更大，可能爆赚，也可能为空且倒贴清理费。
- 玩家只能选择稳跟、跳价或放弃，不能用每次加一元反复探测 NPC 底价。
- 拍前最多做一次深入检查；物理线索真实，NPC 判断可能受能力、情绪、偏好和立场影响。
- 普通货物每日行情控制在 -30% 至 +20%；藏品不跟随大宗行情。藏品和碎片可立即出售，也可入库等待更好的回收渠道。
- 初始仓库 50 格；扩仓按 10 格递增至 100 格并按自然月收租，避免无限囤货。
- 垃圾存在不同清理费和税费，不是所有开出物都能卖钱。
- 存档只使用 `localStorage`；丢失存档后必须能正常开始新局。

## 工程目录

```text
.
├─ index.html                  # 当前唯一入口、可直接打开
├─ app.js                      # 完整页面渲染、触摸交互与本地存档
├─ styles.css                  # 完整竖屏视觉样式
├─ assets/                     # NPC、现代藏品与宝藏本地图集
├─ src/
│  ├─ core/                    # 生成器和状态机
│  └─ data/                    # 数值与线索结构化基线
├─ tests/                      # 生成、状态、压力与合规测试
├─ tools/                      # 仅开发期使用的平衡模拟器
├─ reports/                    # 可追溯的代表性模拟结果
├─ docs/
│  ├─ product/                 # 产品定位、范围、路线图
│  ├─ mechanics/               # 已确认玩法机制
│  ├─ ui/                      # 视觉方向与稿件
│  ├─ engineering/             # 架构、状态、发布规则
│  └─ decisions/               # 关键决策记录
├─ prototypes/archive/         # 历史原型，只用于回溯
└─ .github/                    # Issue 与 PR 模板
```

## 本地运行

不需要安装依赖或构建工具。

1. 双击根目录 `index.html`；或使用任意本地静态服务器打开仓库根目录。
2. 页面必须在断网状态下正常运行。
3. 根目录运行代码不得引用 CDN、远程图片、在线字体或 API。

开发期测试使用 Node.js 的内置模块，但 Node 不属于小游戏运行环境：

```bash
node tests/test-generator.js
node tests/economy-balance-test.js
node tests/mainline-playability-test.js
node tests/test-engine.js
node tests/stress-test.js
node tests/legacy-prototype-smoke-test.js
node tests/repository-compliance.js
```

重新运行经济与主线可玩性模拟：

```bash
node tests/economy-balance-test.js
node tests/mainline-playability-test.js
```

`tools/simulate-economy.mjs` 与 `src/data/economy-config.json` 保留为旧版研究记录，不再代表当前运行时经济。

## 如何维护

不要直接在多个地方同时改同一规则。先找到规则所属模块，更新结构化配置或核心代码，再运行对应测试，最后更新机制文档和 `CHANGELOG.md`。

| 想修改什么 | 首先修改 | 必须复核 |
|---|---|---|
| 赚亏率、物品类型概率、品相概率 | `src/core/daily-generator.js` | 两个经济/主线测试、`ECONOMY_AND_PROBABILITY_BASELINE.md` |
| 物品名称、价格、藏品、碎片、垃圾 | `src/core/daily-generator.js` | 商品价格清单、生成器测试 |
| 市场波动、商户溢价、仓租 | 每日生成器与 `src/core/game-engine.js` | 经济测试、状态机测试 |
| 雾柜概率和结果 | 每日生成器 | 生成器测试、经济测试 |
| 申报、外观、检查文本 | `src/data/clue-config.json`、每日生成器 | `CLUE_AND_INSPECTION.md` |
| 拍卖轮次、加价单位、封槌规则 | `src/core/game-engine.js` | `AUCTION_RULES.md`、状态机测试 |
| 每日五柜与资产解锁 | `src/core/daily-generator.js` | `DAILY_GENERATION.md`、生成器测试 |
| 仓库和跨月扣租 | `src/core/game-engine.js` | `WAREHOUSE_MARKET_AND_LIVE.md`、状态机测试 |
| NPC 性格、估价、资金 | `src/core/daily-generator.js`、状态机 | `NPC_AND_RANDOM_EVENTS.md` |
| 页面布局与视觉风格 | `index.html`、`styles.css`、`docs/ui/` | 移动端与断网检查 |
| 开柜动作和反馈节奏 | `app.js`、`styles.css` | 触摸操作与低端机体验 |
| 小红书上传规则 | 根目录运行文件 | `RELEASE_CHECKLIST.md`、合规测试 |

当前唯一生效的经济逻辑在生成器和状态机中；旧 JSON 只作历史研究记录。后续仍应将运行时常量收敛到本地 `.js` 数据文件，不能用 `fetch` 读取 JSON。详情见架构与实施状态文档。

## 分支和版本建议

- `main`：始终保持可打开、可测试。
- 功能分支：`feature/auction-ui`、`feature/warehouse`。
- 平衡调整：`balance/economy-v2`。
- 修复：`fix/save-restore`。
- 机制文档采用版本号；未经模拟和测试，不直接覆盖已确认基线。
- 发布标签建议使用 `v0.1.0-prototype`、`v0.2.0-core-loop`、`v1.0.0`。

## 小红书发布边界

GitHub 仓库可以保留 Markdown、测试脚本和模拟工具，但上传到小红书的 ZIP 只应包含运行所需的 HTML、CSS、JS、图片、字体和必要 JSON。不得把 `docs/`、`tests/`、`tools/`、`reports/`、`.github/`、`.git/` 或历史原型打进发布包。

## License

当前仓库尚未选择开源许可证。在明确授权协议前，公开可见不等于允许复制、修改或商用。

## 机制详情文件索引

以下列表就是后续讨论和改动的入口：

- 游戏定位与核心爽点：[GAME_VISION.md](docs/product/GAME_VISION.md)
- 开发范围与路线图：[SCOPE_AND_ROADMAP.md](docs/product/SCOPE_AND_ROADMAP.md)
- 物品分类、藏品、碎片、垃圾：[CARGO_AND_LOOT.md](docs/mechanics/CARGO_AND_LOOT.md)
- 经济、赚亏和概率基线：[ECONOMY_AND_PROBABILITY_BASELINE.md](docs/mechanics/ECONOMY_AND_PROBABILITY_BASELINE.md)
- 货柜线索与一次检查：[CLUE_AND_INSPECTION.md](docs/mechanics/CLUE_AND_INSPECTION.md)
- 每日五柜和刷新生成：[DAILY_GENERATION.md](docs/mechanics/DAILY_GENERATION.md)
- 三锤拍卖和防一元试价：[AUCTION_RULES.md](docs/mechanics/AUCTION_RULES.md)
- 开柜、处置、跨日状态机：[GAME_FLOW_AND_STATE_MACHINE.md](docs/mechanics/GAME_FLOW_AND_STATE_MACHINE.md)
- 仓库、行情、交易摊和直播售卖：[WAREHOUSE_MARKET_AND_LIVE.md](docs/mechanics/WAREHOUSE_MARKET_AND_LIVE.md)
- 固定 NPC、好感、恩怨和随机事件：[NPC_AND_RANDOM_EVENTS.md](docs/mechanics/NPC_AND_RANDOM_EVENTS.md)
- 界面风格与前端美化：[UI_DIRECTION.md](docs/ui/UI_DIRECTION.md)
- 工程架构与数据归属：[ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md)
- 当前实现完成度和缺口：[IMPLEMENTATION_STATUS.md](docs/engineering/IMPLEMENTATION_STATUS.md)
- 上传前自检：[RELEASE_CHECKLIST.md](docs/engineering/RELEASE_CHECKLIST.md)
- 已确认决策时间线：[DECISION_LOG.md](docs/decisions/DECISION_LOG.md)
