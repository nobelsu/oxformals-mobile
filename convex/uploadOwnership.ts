import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export async function claimStorageOwnership(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  ownerUserId: Id<"users">,
): Promise<void> {
  const existing = await ctx.db
    .query("uploadedFiles")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();

  if (!existing) {
    await ctx.db.insert("uploadedFiles", {
      storageId,
      ownerUserId,
      createdAt: Date.now(),
    });
    return;
  }

  if (existing.ownerUserId !== ownerUserId) {
    throw new Error("You can only attach files that you uploaded.");
  }
}

export async function deleteStorageAndOwnership(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
): Promise<void> {
  const existing = await ctx.db
    .query("uploadedFiles")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();
  if (existing) {
    await ctx.db.delete(existing._id);
  }
  await ctx.storage.delete(storageId);
}
