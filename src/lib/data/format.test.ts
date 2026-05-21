import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatChatDayLabel,
  timestampToLocalDateKey,
} from "./format";

/** 19 May 2026, noon local */
const now = new Date(2026, 4, 19, 12, 0, 0).getTime();

function localTs(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour, 0, 0).getTime();
}

describe("timestampToLocalDateKey", () => {
  it("returns YYYY-MM-DD in local timezone", () => {
    assert.equal(timestampToLocalDateKey(localTs(2026, 5, 19)), "2026-05-19");
  });
});

describe("formatChatDayLabel", () => {
  it('returns "Today" for the same calendar day', () => {
    assert.equal(formatChatDayLabel(now, now), "Today");
  });

  it('returns "Yesterday" for the previous calendar day', () => {
    assert.equal(formatChatDayLabel(localTs(2026, 5, 18), now), "Yesterday");
  });

  it("returns weekday name for 2–7 days ago", () => {
    assert.equal(formatChatDayLabel(localTs(2026, 5, 17), now), "Sunday");
    assert.equal(formatChatDayLabel(localTs(2026, 5, 12), now), "Tuesday");
  });

  it("returns short date for older messages in the same year", () => {
    assert.equal(formatChatDayLabel(localTs(2026, 4, 1), now), "1 Apr");
  });

  it("includes year for messages from a different year", () => {
    assert.equal(formatChatDayLabel(localTs(2025, 12, 25), now), "25 Dec 2025");
  });
});
