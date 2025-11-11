import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const addEatery = mutation({
  args: {
    lobbyId: v.id("lobbies"),
    name: v.string(),
    externalRef: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("eateries", {
      lobbyId: args.lobbyId,
      name: args.name,
      externalRef: args.externalRef,
      photoUrl: args.photoUrl,
      tags: args.tags,
      addedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const listEateries = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, { lobbyId }) => {
    return await ctx.db
      .query("eateries")
      .withIndex("by_lobby", q => q.eq("lobbyId", lobbyId))
      .collect();
  },
});

export const removeEatery = mutation({
  args: { eateryId: v.id("eateries") },
  handler: async (ctx, { eateryId }) => {
    await ctx.db.delete(eateryId);
    return eateryId;
  },
});
