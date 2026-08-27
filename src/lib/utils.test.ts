import test from "node:test";
import assert from "node:assert/strict";
import { goalCountdown } from "./utils";

test("goalCountdown: rounds sub-hour remaining time to whole minutes for the pill label", () => {
  const now = new Date("2026-08-27T17:15:00Z");
  const deadline = new Date(now.getTime() + 5 * 60000 + 55000).toISOString(); // 5m55s away
  const created = new Date(now.getTime() - 10 * 60000).toISOString();
  const cd = goalCountdown(deadline, created, now);
  assert.equal(cd.pillLabel, "6M LEFT");
  assert.equal(cd.level, "urgent");
});

test("goalCountdown: hours-away deadline rounds to whole hours and is not urgent past the 6h threshold", () => {
  const now = new Date("2026-08-27T17:15:00Z");
  const deadline = new Date(now.getTime() + 22 * 3600000).toISOString();
  const created = now.toISOString();
  const cd = goalCountdown(deadline, created, now);
  assert.equal(cd.pillLabel, "22H LEFT");
  assert.equal(cd.level, "normal");
});

test("goalCountdown: within the 6h window is urgent even though it rounds to whole hours", () => {
  const now = new Date("2026-08-27T17:15:00Z");
  const deadline = new Date(now.getTime() + 3 * 3600000).toISOString();
  const created = now.toISOString();
  const cd = goalCountdown(deadline, created, now);
  assert.equal(cd.pillLabel, "3H LEFT");
  assert.equal(cd.level, "urgent");
});

test("goalCountdown: past deadline reports overdue with a live-ticking long label under a day", () => {
  const now = new Date("2026-08-27T17:15:00Z");
  const deadline = new Date(now.getTime() - 10 * 60000).toISOString();
  const created = new Date(now.getTime() - 60 * 60000).toISOString();
  const cd = goalCountdown(deadline, created, now);
  assert.equal(cd.level, "overdue");
  assert.equal(cd.pillLabel, "OVERDUE");
  assert.match(cd.longLabel, /^Overdue /);
});

test("goalCountdown: timePct reflects elapsed fraction of the creation-to-deadline span", () => {
  const created = new Date("2026-08-27T12:00:00Z");
  const deadline = new Date("2026-08-27T18:00:00Z"); // 6h span
  const now = new Date("2026-08-27T15:00:00Z"); // 3h in => 50%
  const cd = goalCountdown(deadline.toISOString(), created.toISOString(), now);
  assert.equal(cd.timePct, 50);
});

test("goalCountdown: timePct clamps to 100 once overdue, never exceeding it", () => {
  const created = new Date("2026-08-27T12:00:00Z");
  const deadline = new Date("2026-08-27T13:00:00Z");
  const now = new Date("2026-08-28T00:00:00Z"); // well past deadline
  const cd = goalCountdown(deadline.toISOString(), created.toISOString(), now);
  assert.equal(cd.timePct, 100);
});
