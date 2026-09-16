"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const runtimeFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "src/core/daily-generator.js",
  "src/core/game-engine.js"
];
const runtimeAssets = [
  "assets/luxury-atlas.webp",
  "assets/npc-atlas.webp",
  "assets/premium-atlas.webp",
  "assets/treasure-atlas.webp",
  "assets/vintage-atlas.webp"
];
const forbidden = [
  [/https?:\/\//i, "HTTP(S) URL"],
  [/url\s*\(\s*["']?\/\//i, "协议相对外部资源"],
  [/\bfetch\s*\(/, "fetch"],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
  [/\bWebSocket\b/, "WebSocket"],
  [/\bEventSource\b/, "SSE/EventSource"],
  [/\bRTCPeerConnection\b/, "WebRTC"],
  [/\bnew\s+(?:Shared)?Worker\s*\(/, "Worker"],
  [/\bserviceWorker\b/, "Service Worker"],
  [/\bWebAssembly\b/, "WebAssembly"],
  [/\beval\s*\(/, "eval"],
  [/\bnew\s+Function\s*\(/, "new Function"],
  [/javascript\s*:/i, "javascript: URL"]
];

for (const relative of runtimeFiles) {
  const absolute = path.join(root, relative);
  assert.equal(fs.existsSync(absolute), true, `缺少运行文件：${relative}`);
  const source = fs.readFileSync(absolute, "utf8");
  for (const [pattern, label] of forbidden) {
    assert.equal(pattern.test(source), false, `${relative} 包含禁用项：${label}`);
  }
}

for (const relative of runtimeAssets) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `缺少本地素材：${relative}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.equal(/<script(?![^>]*\bsrc\s*=)[^>]*>/i.test(html), false, "index.html 存在内联脚本");
assert.equal(/\son[a-z]+\s*=/i.test(html), false, "index.html 存在行内事件");
for (const scriptPath of ["./src/core/daily-generator.js", "./src/core/game-engine.js", "./app.js"]) {
  assert.ok(html.includes(`src="${scriptPath}"`), `index.html 未加载 ${scriptPath}`);
}

const runtimeBytes = [...runtimeFiles, ...runtimeAssets]
  .reduce((sum, relative) => sum + fs.statSync(path.join(root, relative)).size, 0);
assert.ok(runtimeBytes < 10 * 1024 * 1024, `运行文件超过 10MB：${runtimeBytes} bytes`);

console.log(`Repository compliance checks passed (${runtimeBytes} bytes).`);
