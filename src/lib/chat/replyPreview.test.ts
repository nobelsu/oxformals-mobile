import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Id } from "@/convex/_generated/dataModel";
import {
  formatReplyListingPreview,
  replySnapshotSenderLabel,
  truncateReplyBody,
  UNAVAILABLE_LABEL,
} from "./replyPreview";
import type { ListingSummary, MessageReplySnapshot } from "./types";

const userId = "user1" as Id<"users">;
const otherId = "user2" as Id<"users">;

const sampleListing: ListingSummary = {
  id: "listing1" as Id<"listings">,
  ownerUserId: otherId,
  ownerName: "Alex",
  college: "Balliol",
  dateTime: "2026-06-15T19:00:00.000Z",
  status: "active",
  seatsAvailable: 2,
};

describe("truncateReplyBody", () => {
  it("returns short bodies unchanged", () => {
    assert.equal(truncateReplyBody("hello"), "hello");
  });

  it("truncates long bodies with ellipsis", () => {
    const long = "a".repeat(130);
    assert.equal(truncateReplyBody(long).length, 121);
    assert.ok(truncateReplyBody(long).endsWith("…"));
  });
});

describe("formatReplyListingPreview", () => {
  it("joins owner, college, date, and status", () => {
    const preview = formatReplyListingPreview(sampleListing);
    assert.ok(preview.includes("Alex"));
    assert.ok(preview.includes("Balliol"));
    assert.ok(preview.includes("·"));
  });
});

describe("replySnapshotSenderLabel", () => {
  it('returns "You" for current user', () => {
    const reply: MessageReplySnapshot = {
      id: "m1" as Id<"messages">,
      senderUserId: userId,
      body: "hi",
    };
    assert.equal(replySnapshotSenderLabel(reply, userId), "You");
  });

  it("returns sender name when available", () => {
    const reply: MessageReplySnapshot = {
      id: "m1" as Id<"messages">,
      senderUserId: otherId,
      senderName: "Sam",
      body: "hi",
    };
    assert.equal(replySnapshotSenderLabel(reply, userId), "Sam");
  });
});

describe("UNAVAILABLE_LABEL", () => {
  it("matches web copy", () => {
    assert.equal(UNAVAILABLE_LABEL, "Original message unavailable");
  });
});
