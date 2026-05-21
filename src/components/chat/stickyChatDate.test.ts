import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeStickyFromViewables,
  findNextDividerIndex,
  shouldHideInlineDivider,
  stickyLabelForTopIndex,
  topVisibleIndex,
  type StickyThreadRow,
} from "./stickyChatDateLogic.ts";

const dayLabel = (ts: number) =>
  new Date(ts).toISOString().slice(0, 10);

const items: StickyThreadRow[] = [
  {
    kind: "message",
    message: { createdAt: new Date(2026, 4, 19, 1).getTime() },
  },
  { kind: "dateDivider", dateKey: "2026-05-19", label: "Today" },
  {
    kind: "message",
    message: { createdAt: new Date(2026, 4, 18, 23).getTime() },
  },
  { kind: "dateDivider", dateKey: "2026-05-18", label: "Yesterday" },
];

describe("topVisibleIndex", () => {
  it("picks the highest index in an inverted list", () => {
    assert.equal(
      topVisibleIndex([
        { index: 0, isViewable: true },
        { index: 7, isViewable: true },
        { index: 3, isViewable: true },
      ]),
      7,
    );
  });
});

describe("stickyLabelForTopIndex", () => {
  it("uses the divider label when the top row is a divider", () => {
    assert.equal(stickyLabelForTopIndex(items, 1, dayLabel), "Today");
  });

  it("uses the message day when the top row is a message", () => {
    assert.equal(
      stickyLabelForTopIndex(items, 2, dayLabel),
      dayLabel(items[2].kind === "message" ? items[2].message.createdAt : 0),
    );
  });
});

describe("computeStickyFromViewables", () => {
  it("hides sticky near latest messages", () => {
    assert.deepEqual(
      computeStickyFromViewables(
        items,
        [{ index: 0, isViewable: true }],
        0,
        dayLabel,
      ),
      { stickyLabel: null, pushOffset: 0, topIndex: null },
    );
  });

  it("shows the day at the visual top of the viewport", () => {
    const result = computeStickyFromViewables(
      items,
      [{ index: 2, isViewable: true }],
      200,
      dayLabel,
    );
    assert.equal(
      result.stickyLabel,
      dayLabel(items[2].kind === "message" ? items[2].message.createdAt : 0),
    );
    assert.equal(result.topIndex, 2);
  });
});

describe("findNextDividerIndex", () => {
  it("finds the divider after the top visible row", () => {
    assert.equal(findNextDividerIndex(items, 0), 1);
    assert.equal(findNextDividerIndex(items, 2), 3);
  });
});

describe("shouldHideInlineDivider", () => {
  it("hides the inline divider when it is the sticky row at the top", () => {
    assert.equal(shouldHideInlineDivider("Today", "Today", 1, 1), true);
    assert.equal(shouldHideInlineDivider("Today", "Today", 1, 2), false);
  });
});
