"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const runtimeFiles = ["index.html", "styles.css", "app.js"];
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

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.equal(/<script(?![^>]*\bsrc\s*=)[^>]*>/i.test(html), false, "index.html 存在内联脚本");
assert.equal(/\son[a-z]+\s*=/i.test(html), false, "index.html 存在行内事件");
assert.match(html, /<script[^>]+src=["']\.\/app\.js["'][^>]*><\/script>/i, "index.html 未加载 ./app.js");

console.log("Repository compliance checks passed.");
