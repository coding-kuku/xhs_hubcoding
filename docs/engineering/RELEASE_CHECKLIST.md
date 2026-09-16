# 小红书上传前自检

## 文件与入口

- [ ] 只有一个入口文件 `index.html`。
- [ ] 所有 JavaScript 都在独立 `.js` 文件中，并使用相对路径加载。
- [ ] 没有内联 `<script>`、`onclick` 或其他行内事件。
- [ ] 发布包只含 `.html`、`.css`、`.js`、`.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.svg`、`.woff`、`.woff2`、`.json`。
- [ ] 所有路径大小写和实际文件一致。

## 离线与安全

- [ ] 不含 `fetch`、XHR、WebSocket、SSE、WebRTC 或 AI API。
- [ ] 不含 CDN、外链图片、在线字体、iframe 或外部网页。
- [ ] 不含 `eval`、`new Function`、`javascript:` URL。
- [ ] 不含 WASM、Web Worker、Service Worker、SharedArrayBuffer。
- [ ] 断网并清空缓存后仍可从新局正常运行。

## 产品边界

- [ ] 没有登录、账号、支付、广告、下载、跳转外链。
- [ ] 没有云存档、在线排行或多人联机。
- [ ] 存档仅使用 `localStorage`，坏档和无存档均可开始新局。

## 移动端

- [ ] 360px、390px、430px 宽度竖屏可玩。
- [ ] 所有主流程只用触摸完成，不依赖键盘、hover 或全屏。
- [ ] 刘海屏安全区、滚动、弹层和软键盘场景正常。
- [ ] 主要触摸目标约 44px 以上。
- [ ] 低端机动画流畅，快速点击不会重复结算。

## 游戏逻辑

- [ ] 当日五柜、市场和 NPC 状态刷新后不变。
- [ ] 真实内容不会在公开视图或 DOM 属性中泄露。
- [ ] 一次检查和三锤限制不能绕过。
- [ ] 金钱、仓位、租金、清理费和 NPC 资金不出现负向异常。
- [ ] 新日期、跨月、仓库满、资金不足和坏档路径均验证。

## 包体

- [ ] 不包含 `.git/`、`docs/`、`tests/`、`tools/`、`reports/`、`.github/` 和 `prototypes/`。
- [ ] 不包含浏览器 profile、Cookie、History、Crashpad 或缓存。
- [ ] ZIP 尽量小于 10MB。

