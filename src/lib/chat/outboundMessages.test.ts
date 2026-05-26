import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Id } from "@/convex/_generated/dataModel";
import type { ChatMessage } from "./types";
import {
  createOutboundEntry,
  mergeOutboundWithServer,
  outboundToChatMessage,
  pendingMessageId,
  type OutboundEntry,
} from "./outboundMessages";

const conversationId = "conv1" as Id<"conversations">;
const senderId = "user1" as Id<"users">;

function serverMsg(id: string, createdAt: number): ChatMessage {
  return {
    id: id as Id<"messages">,
    conversationId,
    senderUserId: senderId,
    body: "server",
    createdAt,
  };
}

function outbound(
  clientId: string,
  overrides: Partial<OutboundEntry> = {},
): OutboundEntry {
  return {
    clientId,
    conversationId,
    senderUserId: senderId,
    body: "pending",
    createdAt: 1000,
    status: "sending",
    ...overrides,
  };
}

describe("mergeOutboundWithServer", () => {
  it("returns server list when outbound is empty", () => {
    const server = [serverMsg("m1", 2000), serverMsg("m2", 1000)];
    assert.deepEqual(mergeOutboundWithServer(server, []), server);
  });

  it("prepends visible outbound messages newest-first among pending", () => {
    const server = [serverMsg("m1", 2000)];
    const merged = mergeOutboundWithServer(server, [
      outbound("a", { createdAt: 3000 }),
      outbound("b", { createdAt: 2500 }),
    ]);
    assert.equal(merged.length, 3);
    assert.equal(merged[0].id, pendingMessageId("a"));
    assert.equal(merged[1].id, pendingMessageId("b"));
    assert.equal(merged[2].id, "m1");
  });

  it("drops outbound once server contains serverMessageId", () => {
    const server = [serverMsg("real1", 2000)];
    const merged = mergeOutboundWithServer(server, [
      outbound("gone", { serverMessageId: "real1" as Id<"messages"> }),
    ]);
    assert.deepEqual(merged, server);
  });

  it("keeps failed outbound without server id", () => {
    const server = [serverMsg("m1", 2000)];
    const entry = outbound("fail", { status: "failed" });
    const merged = mergeOutboundWithServer(server, [entry]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].outboundStatus, "failed");
  });

  it("maps outbound to chat message with pending id and status", () => {
    const msg = outboundToChatMessage(outbound("x", { status: "sending" }));
    assert.equal(msg.id, "pending:x");
    assert.equal(msg.outboundStatus, "sending");
  });
});

describe("createOutboundEntry", () => {
  it("stores listing and mentions from send args", () => {
    const listingId = "list1" as Id<"listings">;
    const entry = createOutboundEntry({
      clientId: "c1",
      conversationId,
      senderUserId: senderId,
      body: "hi",
      mentions: [{ userId: senderId, label: "@me", start: 0 }],
      referencedListing: {
        id: listingId,
        ownerUserId: senderId,
        ownerName: "A",
        college: "X",
        dateTime: "2026-05-01",
        status: "active",
        seatsAvailable: 1,
      },
    });
    assert.equal(entry.referencedListing?.id, listingId);
    assert.equal(entry.mentions?.length, 1);
  });
});
