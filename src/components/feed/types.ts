import type { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type FeedScope = "forYou" | "following";

export type FeedItem = FunctionReturnType<
  typeof api.feed.getCampusFeed
>["items"][number];

export type FeedListingItem = Extract<FeedItem, { kind: "listing" }>;
export type FeedReviewItem = Extract<FeedItem, { kind: "review" }>;
export type FeedAttendedItem = Extract<FeedItem, { kind: "attended" }>;
