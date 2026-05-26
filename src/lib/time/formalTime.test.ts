import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterFormalTimeSlots,
  formatFormalTimeForInput,
  formatFormalTimeSlot,
  FORMAL_TIME_SLOTS,
  parseFormalTimeInput,
} from "./formalTime";

describe("formatFormalTimeSlot", () => {
  it("formats on-the-hour without minutes", () => {
    assert.equal(formatFormalTimeSlot(19, 0), "7pm");
  });

  it("formats with minutes", () => {
    assert.equal(formatFormalTimeSlot(19, 15), "7:15pm");
  });

  it("formats noon", () => {
    assert.equal(formatFormalTimeSlot(12, 0), "12pm");
  });
});

describe("formatFormalTimeForInput", () => {
  it("matches slot label for a date", () => {
    const d = new Date(2026, 4, 19, 19, 15);
    assert.equal(formatFormalTimeForInput(d), "7:15pm");
  });
});

describe("parseFormalTimeInput", () => {
  it("parses pm suffix", () => {
    assert.deepEqual(parseFormalTimeInput("7pm"), { hours: 19, minutes: 0 });
    assert.deepEqual(parseFormalTimeInput("7:15pm"), {
      hours: 19,
      minutes: 15,
    });
    assert.deepEqual(parseFormalTimeInput("7:15 pm"), {
      hours: 19,
      minutes: 15,
    });
  });

  it("parses 24-hour style", () => {
    assert.deepEqual(parseFormalTimeInput("19:15"), {
      hours: 19,
      minutes: 15,
    });
  });

  it("treats bare 1–11 as pm", () => {
    assert.deepEqual(parseFormalTimeInput("7"), { hours: 19, minutes: 0 });
  });

  it("keeps 12 as noon without suffix", () => {
    assert.deepEqual(parseFormalTimeInput("12"), { hours: 12, minutes: 0 });
    assert.deepEqual(parseFormalTimeInput("12:30"), {
      hours: 12,
      minutes: 30,
    });
  });

  it("parses am suffix", () => {
    assert.deepEqual(parseFormalTimeInput("12am"), { hours: 0, minutes: 0 });
  });

  it("rejects invalid input", () => {
    assert.equal(parseFormalTimeInput(""), null);
    assert.equal(parseFormalTimeInput("nope"), null);
    assert.equal(parseFormalTimeInput("25:00"), null);
    assert.equal(parseFormalTimeInput("7:99"), null);
  });
});

describe("filterFormalTimeSlots", () => {
  it("returns all slots for empty query", () => {
    assert.equal(filterFormalTimeSlots("").length, FORMAL_TIME_SLOTS.length);
  });

  it("filters by substring", () => {
    const results = filterFormalTimeSlots("7");
    assert.ok(results.some((r) => r.label === "7pm"));
    assert.ok(results.some((r) => r.label === "7:30pm"));
    assert.ok(!results.some((r) => r.label === "12pm"));
  });
});
