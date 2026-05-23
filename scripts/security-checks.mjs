import { ConvexHttpClient } from "convex/browser";

const convexUrl =
  process.env.CONVEX_URL ??
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.error(
    "Missing CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL / EXPO_PUBLIC_CONVEX_URL).",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);
const conversationIdForChatChecks =
  process.env.SECURITY_TEST_CONVERSATION_ID ??
  process.env.SECURITY_TEST_FOREIGN_CONVERSATION_ID;
const nonMemberConversationId = process.env.SECURITY_TEST_FOREIGN_CONVERSATION_ID;
const nonMemberToken =
  process.env.SECURITY_TEST_NON_MEMBER_TOKEN ??
  process.env.SECURITY_TEST_AUTH_TOKEN;
const sensitiveUserKeys = new Set([
  "email",
  "phone",
  "emailVerificationTime",
  "whatsappPhone",
  "instagramHandle",
  "wishlistColleges",
  "dietaryRequirements",
  "pushChatAlerts",
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertRejected(run, message) {
  let rejected = false;
  try {
    await run();
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

async function assertListPublicRedaction() {
  const users = await client.query("users:listPublic", {});
  assert(Array.isArray(users), "users:listPublic did not return an array.");
  for (const user of users) {
    for (const key of Object.keys(user)) {
      assert(
        !sensitiveUserKeys.has(key),
        `users:listPublic leaked sensitive field "${key}".`,
      );
    }
  }
  return users;
}

async function assertGetPublicByIdsRedaction(users) {
  if (users.length === 0) return;
  const first = users[0];
  if (!first?._id) return;

  const selected = await client.query("users:getPublicByIds", {
    userIds: [first._id],
  });
  assert(Array.isArray(selected), "users:getPublicByIds did not return an array.");
  for (const user of selected) {
    for (const key of Object.keys(user)) {
      assert(
        !sensitiveUserKeys.has(key),
        `users:getPublicByIds leaked sensitive field "${key}".`,
      );
    }
  }
}

async function assertAnonymousMutationDenied() {
  let blocked = false;
  try {
    await client.mutation("users:patchProfile", { name: "AnonProbe" });
  } catch {
    blocked = true;
  }
  assert(blocked, "Anonymous mutation call to users:patchProfile was not denied.");
}

async function assertAnonymousChatAccessDenied() {
  const convos = await client.query("chat:listMyConversations", {});
  assert(
    Array.isArray(convos) && convos.length === 0,
    "Anonymous query to chat:listMyConversations should return an empty array.",
  );

  if (!conversationIdForChatChecks) {
    console.warn(
      "Skipped anonymous conversation/message retrieval checks (set SECURITY_TEST_CONVERSATION_ID).",
    );
    return;
  }

  const convo = await client.query("chat:getConversation", {
    conversationId: conversationIdForChatChecks,
  });
  assert(
    convo === null,
    "Anonymous query to chat:getConversation should return null.",
  );

  await assertRejected(
    () =>
      client.query("chat:listMessages", {
        conversationId: conversationIdForChatChecks,
        paginationOpts: { numItems: 1, cursor: null },
      }),
    "Anonymous query to chat:listMessages was not denied.",
  );
}

async function assertNonMemberChatAccessDenied() {
  if (!nonMemberConversationId || !nonMemberToken) {
    console.warn(
      "Skipped non-member chat retrieval checks (set SECURITY_TEST_FOREIGN_CONVERSATION_ID and SECURITY_TEST_NON_MEMBER_TOKEN).",
    );
    return;
  }

  const authedClient = new ConvexHttpClient(convexUrl);
  authedClient.setAuth(nonMemberToken);

  const convo = await authedClient.query("chat:getConversation", {
    conversationId: nonMemberConversationId,
  });
  assert(
    convo === null,
    "Non-member authenticated query to chat:getConversation should return null.",
  );

  await assertRejected(
    () =>
      authedClient.query("chat:listMessages", {
        conversationId: nonMemberConversationId,
        paginationOpts: { numItems: 1, cursor: null },
      }),
    "Non-member authenticated query to chat:listMessages was not denied.",
  );
}

async function main() {
  const users = await assertListPublicRedaction();
  await assertGetPublicByIdsRedaction(users);
  await assertAnonymousMutationDenied();
  await assertAnonymousChatAccessDenied();
  await assertNonMemberChatAccessDenied();
  console.log("Security checks passed.");
}

main().catch((error) => {
  console.error("Security checks failed:", error.message);
  process.exit(1);
});
