import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const request = new Request("http://localhost/", { headers: { accept: "text/html" } });
  if (typeof worker === "function") return worker(request);
  return worker.fetch(
    request,
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the game board directly and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>别惹小毛头｜MOTO 16选1聚会挑战<\/title>/i);
  assert.match(html, /挑一个小毛头/);
  assert.match(html, /怎么玩？/);
  assert.doesNotMatch(html, /开始挑战/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships the complete local game content", async () => {
  const [game, css, packageJson] = await Promise.all([
    readFile(new URL("app/seven-game.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(game, /const TOTAL = 16/);
  assert.match(game, /const PENALTIES/);
  assert.match(game, /你把小毛头惹毛了/);
  assert.match(game, /navigator\.vibrate/);
  assert.match(css, /grid-template-columns:\s*repeat\(4, 1fr\)/);
  assert.match(css, /orientation:\s*landscape/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
