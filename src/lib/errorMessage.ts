import { ConvexError } from "convex/values";

const FALLBACK = "Something went wrong. Try again.";

/**
 * The sentence to show someone when a backend call fails. Convex wraps the
 * message ("[CONVEX M(listings:acceptRequest)] ... Uncaught Error: <text> at
 * handler") and, on production, replaces it with "Server Error".
 */
export function errorMessage(error: unknown, fallback: string = FALLBACK): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  if (!(error instanceof Error)) return fallback;
  const raw = error.message;
  const uncaught = raw.match(/Uncaught (?:\w*Error): ([\s\S]*?)(?:\n\s+at |$)/);
  const text = (uncaught ? uncaught[1] : raw.replace(/^\[CONVEX [^\]]+\]\s*(\[Request ID: [^\]]+\]\s*)?/, "")).trim();
  if (!text || /^server error/i.test(text)) return fallback;
  return text;
}
