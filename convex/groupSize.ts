import { v } from "convex/values";

export const groupSizeValidator = v.union(
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
);
