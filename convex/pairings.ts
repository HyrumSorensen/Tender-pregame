// convex/pairings.ts
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/** Count how many entrants are in a lobby (usable from query or mutation). */
async function countEntrants(
  ctx: QueryCtx | MutationCtx,
  lobbyId: Id<"lobbies">
): Promise<number> {
  const entrants = await ctx.db
    .query("entrants")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .collect();
  return entrants.length;
}

/* ===================== MUTATIONS ===================== */

/** Create a pairing when all entrants 'like' the same eatery. */
export const checkAndRecordMatch = mutation({
  args: { lobbyId: v.id("lobbies"), eateryId: v.id("eateries") },
  handler: async (ctx: MutationCtx, { lobbyId, eateryId }) => {
    const total = await countEntrants(ctx, lobbyId);
    if (total === 0) return null;

    const picks = await ctx.db
      .query("picks")
      .withIndex("by_lobby_eatery", (q) =>
        q.eq("lobbyId", lobbyId).eq("eateryId", eateryId)
      )
      .collect();

    const likeCount = picks.filter((p) => p.decision === "like").length;
    if (likeCount < total) return null;

    // Already paired?
    const existing = await ctx.db
      .query("pairings")
      .withIndex("by_lobby_eatery", (q) =>
        q.eq("lobbyId", lobbyId).eq("eateryId", eateryId)
      )
      .first();
    if (existing) return existing;

    const id = await ctx.db.insert("pairings", {
      lobbyId,
      eateryId,
      matchedAt: Date.now(),
      isWinner: false,
    });
    return await ctx.db.get(id);
  },
});

/** Mark a specific pairing as the winner (and clear any previous winner). */
export const setWinner = mutation({
  args: { lobbyId: v.id("lobbies"), eateryId: v.id("eateries") },
  handler: async (ctx: MutationCtx, { lobbyId, eateryId }) => {
    // Clear any existing winner for this lobby
    const all = await ctx.db
      .query("pairings")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .collect();
    await Promise.all(all.map((p) => ctx.db.patch(p._id, { isWinner: false })));

    // Ensure there is a pairing doc for the chosen eatery
    const existing = await ctx.db
      .query("pairings")
      .withIndex("by_lobby_eatery", (q) =>
        q.eq("lobbyId", lobbyId).eq("eateryId", eateryId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { isWinner: true });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("pairings", {
      lobbyId,
      eateryId,
      matchedAt: Date.now(),
      isWinner: true,
    });
    return await ctx.db.get(id);
  },
});

/* ===================== QUERIES ===================== */

export const listPairings = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx: QueryCtx, { lobbyId }) => {
    return await ctx.db
      .query("pairings")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .collect();
  },
});
