import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Id } from "@/convex/_generated/dataModel";
import {
  conversationDisplayTitle,
  filterConversationsByQuery,
} from "./conversationList";
import type { ConversationPreview } from "./types";

const convoId = "convo1" as Id<"conversations">;
const userId = "user1" as Id<"users">;
const otherId = "user2" as Id<"users">;

const dm: ConversationPreview = {
  kind: "dm",
  id: convoId,
  otherUserId: otherId,
  otherUserName: "Alex Chen",
  otherUserCollege: "Balliol",
  lastMessageAt: 1000,
  lastMessageBody: "See you at formal",
  unreadCount: 0,
};

const groupWithName: ConversationPreview = {
  kind: "group",
  id: "convo2" as Id<"conversations">,
  title: "Alex, Sam, Jordan",
  name: "Formal crew",
  memberCount: 3,
  memberPreview: [
    { id: otherId, name: "Alex" },
    { id: "user3" as Id<"users">, name: "Sam" },
  ],
  createdByUserId: userId,
  isCreator: true,
  lastMessageAt: 2000,
  lastMessageBody: "Who's driving?",
  unreadCount: 1,
};

const groupFallbackTitle: ConversationPreview = {
  kind: "group",
  id: "convo3" as Id<"conversations">,
  title: "Alex and Sam",
  memberCount: 2,
  memberPreview: [
    { id: otherId, name: "Alex" },
    { id: "user3" as Id<"users">, name: "Sam" },
  ],
  createdByUserId: otherId,
  isCreator: false,
  lastMessageAt: 500,
  unreadCount: 0,
};

describe("conversationDisplayTitle", () => {
  it("uses other user name for DMs", () => {
    assert.equal(conversationDisplayTitle(dm), "Alex Chen");
  });

  it("uses custom name for groups when set", () => {
    assert.equal(conversationDisplayTitle(groupWithName), "Formal crew");
  });

  it("falls back to member title for unnamed groups", () => {
    assert.equal(conversationDisplayTitle(groupFallbackTitle), "Alex and Sam");
  });
});

describe("filterConversationsByQuery", () => {
  const all = [dm, groupWithName, groupFallbackTitle];

  it("returns all conversations when query is empty", () => {
    assert.deepEqual(filterConversationsByQuery(all, ""), all);
    assert.deepEqual(filterConversationsByQuery(all, "   "), all);
  });

  it("matches DM by name", () => {
    assert.deepEqual(filterConversationsByQuery(all, "chen"), [dm]);
  });

  it("matches DM by college", () => {
    assert.deepEqual(filterConversationsByQuery(all, "balliol"), [dm]);
  });

  it("matches group by custom name", () => {
    assert.deepEqual(filterConversationsByQuery(all, "formal crew"), [
      groupWithName,
    ]);
  });

  it("matches group by member name when title is fallback", () => {
    assert.deepEqual(filterConversationsByQuery(all, "sam"), [
      groupWithName,
      groupFallbackTitle,
    ]);
  });

  it("matches last message body", () => {
    assert.deepEqual(filterConversationsByQuery(all, "driving"), [
      groupWithName,
    ]);
  });

  it("returns empty when nothing matches", () => {
    assert.deepEqual(filterConversationsByQuery(all, "zzznomatch"), []);
  });
});
