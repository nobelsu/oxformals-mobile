import { v } from "convex/values";

/** The biggest group a listing can have, host included. */
export const MAX_GROUP_SIZE = 6;

export const groupSizeValidator = v.union(
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
);
