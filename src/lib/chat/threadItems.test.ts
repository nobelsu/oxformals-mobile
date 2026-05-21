import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Id } from "@/convex/_generated/dataModel";
import type { ChatMessage } from "./types";
import { buildThreadItems } from "./threadItems";

const conversationId = "conv1" as Id<"conversations">;
const senderId = "user1" as Id<"users">;

function msg(id: string, createdAt: number, body = "hi"): ChatMessage {
  return {
    id: id as Id<"messages">,
    conversationId,
    senderUserId: senderId,
    body,
    createdAt,
  };
}

function localTs(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour, 0, 0).getTime();
}

describe("buildThreadItems", () => {
  it("returns empty array for no messages", () => {
    assert.deepEqual(buildThreadItems([]), []);
  });

  it("inserts one divider after the last message of a single day", () => {
    const t = localTs(2026, 5, 19, 10);
    const rows = buildThreadItems([
      msg("c", t + 120_000),
      msg("b", t + 60_000),
      msg("a", t),
    ]);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].kind, "message");
    assert.equal(rows[1].kind, "message");
    assert.equal(rows[2].kind, "message");
    assert.equal(rows[3].kind, "dateDivider");
  });

  it("inserts a divider when the calendar day changes", () => {
    const rows = buildThreadItems([
      msg("b", localTs(2026, 5, 19, 1)),
      msg("a", localTs(2026, 5, 18, 23)),
    ]);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].kind, "message");
    assert.equal(rows[1].kind, "dateDivider");
    assert.equal(rows[2].kind, "message");
    assert.equal(rows[3].kind, "dateDivider");
    if (rows[1].kind === "dateDivider" && rows[3].kind === "dateDivider") {
      assert.notEqual(rows[1].dateKey, rows[3].dateKey);
    }
  });
});
