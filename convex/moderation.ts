/** Result of checking user-written text with OpenAI's moderation endpoint. */
export type ModerationResult = "clean" | "flagged" | "unavailable";

/**
 * Checks text with OpenAI's free moderation endpoint. Fails closed: a missing
 * key, network error or bad response is "unavailable", never "clean".
 * Must run in an action (uses fetch).
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("moderateText: OPENAI_API_KEY is not set");
    return "unavailable";
  }
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
    });
    if (!res.ok) {
      console.error("moderateText: OpenAI responded", res.status);
      return "unavailable";
    }
    const body = (await res.json()) as { results?: { flagged?: boolean }[] };
    const result = body.results?.[0];
    if (!result || typeof result.flagged !== "boolean") return "unavailable";
    return result.flagged ? "flagged" : "clean";
  } catch (e) {
    console.error("moderateText: request failed", e);
    return "unavailable";
  }
}
