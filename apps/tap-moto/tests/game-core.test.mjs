import assert from "node:assert/strict";
import test from "node:test";
import { drawWithoutRepeat, secureIndex } from "../app/game-core.ts";

test("500 rounds always contain exactly one valid danger position", () => {
  const seen = new Set();
  for (let round = 0; round < 500; round += 1) {
    const danger = secureIndex(16);
    assert.ok(Number.isInteger(danger));
    assert.ok(danger >= 0 && danger < 16);
    const positions = Array.from({ length: 16 }, (_, index) => index === danger);
    assert.equal(positions.filter(Boolean).length, 1);
    seen.add(danger);
  }
  assert.equal(seen.size, 16);
});

test("24 penalty cards do not repeat until the deck is exhausted", () => {
  const allIds = Array.from({ length: 24 }, (_, index) => index + 1);
  const remaining = [];
  const firstDeck = Array.from({ length: 24 }, () => drawWithoutRepeat(allIds, remaining));
  assert.equal(new Set(firstDeck).size, 24);
  assert.equal(remaining.length, 0);
  const next = drawWithoutRepeat(allIds, remaining);
  assert.ok(allIds.includes(next));
  assert.equal(remaining.length, 23);
});

test("invalid random ranges fail safely", () => {
  assert.throws(() => secureIndex(0), RangeError);
  assert.throws(() => secureIndex(-1), RangeError);
  assert.throws(() => secureIndex(0x100000001), RangeError);
});
