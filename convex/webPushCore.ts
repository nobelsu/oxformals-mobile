/**
 * Sending to a user's browsers, with the actual sender injected so this can be
 * tested without the `web-push` package (which only runs in the Node action).
 */

export type WebPushSubscription = { endpoint: string; p256dh: string; auth: string };

/** Sends one payload; resolves to the push service's HTTP status. */
export type WebPushSender = (sub: WebPushSubscription, payload: string) => Promise<number>;

/** Sends to every subscription and returns the endpoints that are gone (404/410). */
export async function sendToSubscriptions(
  subs: WebPushSubscription[],
  payload: string,
  send: WebPushSender,
): Promise<string[]> {
  const gone: string[] = [];
  for (const sub of subs) {
    try {
      const status = await send(sub, payload);
      if (status === 404 || status === 410) gone.push(sub.endpoint);
    } catch (err) {
      console.error("web push failed", sub.endpoint, err);
    }
  }
  return gone;
}
