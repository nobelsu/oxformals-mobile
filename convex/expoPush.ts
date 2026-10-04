import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string } & Record<string, string>;
  categoryId?: string;
  channelId?: string;
  collapseId?: string;
};

type ExpoPushTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: { error?: string } };

/** Sends to Expo; prunes tokens Expo says are no longer registered. */
export async function deliverExpoPushMessages(
  ctx: ActionCtx,
  messages: PushMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error(
      "deliverExpoPushMessages: Expo API error",
      response.status,
      await response.text(),
    );
    return;
  }

  const result = (await response.json()) as { data?: ExpoPushTicket[] };
  const tickets = result.data ?? [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === "error") {
      const err = ticket.details?.error;
      if (err === "DeviceNotRegistered") {
        const msg = messages[i];
        if (msg) invalidTokens.push(msg.to);
      } else {
        console.error("deliverExpoPushMessages: ticket error", ticket);
      }
    }
  }

  if (invalidTokens.length > 0) {
    await ctx.runMutation(internal.pushNotifications.pruneInvalidPushTokens, {
      tokens: invalidTokens,
    });
  }
}
