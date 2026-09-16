# 维护约定

## 改动前

1. 从 `README.md` 的维护表找到对应代码和机制文档。
2. 判断改动属于体验、数值、内容还是工程，不在一次提交中混合无关变化。
3. 数值改动先写预期，例如“降低盲拍回收率，但不改变熟练经营上限”。

## 提交要求

- 功能提交：`feat: add warehouse screen`
- 修复提交：`fix: restore frozen daily board`
- 平衡提交：`balance: reduce fog cabinet quick value`
- 文档提交：`docs: clarify auction tie rule`
- 重构提交：`refactor: centralize economy data`

## 机制改动最小闭环

1. 修改配置或核心代码。
2. 更新对应机制文档中的版本、结论和原因。
3. 运行相关单元测试；经济或概率变化还要运行模拟器。
4. 把玩家可感知变化写入 `CHANGELOG.md`。
5. 检查断网、触摸和本地文件打开场景。

## 不允许进入运行代码的内容

- 网络请求和 AI API。
- CDN、外链图片、在线字体、iframe。
- 内联 JavaScript、行内事件、动态代码执行。
- WebAssembly、Worker、Service Worker。
- 登录、支付、广告、在线排行或多人联机。

## 原型管理

`prototypes/archive/` 只用于回溯。新功能不能继续建立在旧原型上；验证通过的交互应迁入根目录正式运行代码。

