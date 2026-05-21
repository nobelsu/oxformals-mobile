import {
  buildMonthCells,
  chunkWeeks,
  keyFromDate,
  parseKey,
  toDateKey,
} from "./monthGrid";

describe("monthGrid", () => {
  it("buildMonthCells pads to full weeks", () => {
    const cells = buildMonthCells(2026, 4); // May 2026
    expect(cells.length % 7).toBe(0);
    expect(cells.length).toBeGreaterThan(28);
  });

  it("chunkWeeks splits into rows of 7", () => {
    const cells = buildMonthCells(2026, 4);
    const weeks = chunkWeeks(cells);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.length).toBe(cells.length / 7);
  });

  it("round-trips date keys", () => {
    const key = toDateKey(2026, 4, 20);
    expect(key).toBe("2026-05-20");
    const d = parseKey(key);
    expect(d).not.toBeNull();
    expect(keyFromDate(d!)).toBe(key);
  });
});
