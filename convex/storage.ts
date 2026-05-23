import { mutation } from "./_generated/server";
import { requireActiveUser } from "./guards";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireActiveUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
