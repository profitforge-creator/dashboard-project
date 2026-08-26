import test from "node:test";
import assert from "node:assert/strict";
import { computeRotationTodayIndex } from "./rotation";

test("computeRotationTodayIndex: zero days returns null, no crash", () => {
  assert.equal(computeRotationTodayIndex(0, "2026-08-20", 0, "2026-08-24"), null);
});

test("computeRotationTodayIndex: no anchor defaults to index 0", () => {
  assert.equal(computeRotationTodayIndex(4, null, null, "2026-08-24"), 0);
});

test("computeRotationTodayIndex: same day as anchor returns the anchor index", () => {
  assert.equal(computeRotationTodayIndex(4, "2026-08-24", 2, "2026-08-24"), 2);
});

test("computeRotationTodayIndex: advances forward and wraps around the cycle", () => {
  // anchor index 2 of 4, 3 days later -> (2+3) % 4 = 1
  assert.equal(computeRotationTodayIndex(4, "2026-08-24", 2, "2026-08-27"), 1);
});

test("computeRotationTodayIndex: handles a date before the anchor (negative diff) without going negative", () => {
  // anchor index 0 of 4, 1 day before -> (0-1) mod 4 = 3
  assert.equal(computeRotationTodayIndex(4, "2026-08-24", 0, "2026-08-23"), 3);
});
