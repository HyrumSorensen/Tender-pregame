import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

async function getMyProfile(
  ctx: QueryCtx | MutationCtx,
  guestKey?: string
) {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId) {
    const byAuth = await ctx.db
      .query("profiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();
    if (byAuth) return byAuth;
  }
  if (guestKey) {
    return ctx.db
      .query("profiles")
      .withIndex("by_guest", (q) => q.eq("guestKey", guestKey))
      .first();
  }
  return null;
}

export const myPicks = query({
  args: { lobbyId: v.id("lobbies"), guestKey: v.optional(v.string()) },
  handler: async (ctx: QueryCtx, { lobbyId, guestKey }) => {
    const me = await getMyProfile(ctx, guestKey);
    if (!me) return [];
    return ctx.db
      .query("picks")
      .withIndex("by_lobby_profile", (q) =>
        q.eq("lobbyId", lobbyId).eq("profileId", me._id)
      )
      .collect();
  },
});

export const nextEatery = query({
  args: { lobbyId: v.id("lobbies"), guestKey: v.optional(v.string()) },
  handler: async (ctx: QueryCtx, { lobbyId, guestKey }) => {
    const me = await getMyProfile(ctx, guestKey);
    if (!me) return null;

    const all = await ctx.db
      .query("eateries")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .collect();

    const myPicksForLobby = await ctx.db
      .query("picks")
      .withIndex("by_lobby_profile", (q) =>
        q.eq("lobbyId", lobbyId).eq("profileId", me._id)
      )
      .collect();

    const swiped = new Set<Id<"eateries">>(myPicksForLobby.map((p) => p.eateryId));

    return all.find((e) => !swiped.has(e._id)) ?? null;
  },
});

export const swipe = mutation({
  args: {
    lobbyId: v.id("lobbies"),
    eateryId: v.id("eateries"),
    decision: v.union(v.literal("like"), v.literal("pass")),
    guestKey: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, { lobbyId, eateryId, decision, guestKey }) => {
    const me = await getMyProfile(ctx, guestKey);
    if (!me) throw new Error("Not signed in");

    const existing = await ctx.db
      .query("picks")
      .withIndex("by_unique", (q) =>
        q.eq("lobbyId", lobbyId).eq("eateryId", eateryId).eq("profileId", me._id)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { decision, createdAt: Date.now() });
      return ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("picks", {
      lobbyId,
      eateryId,
      profileId: me._id,
      decision,
      createdAt: Date.now(),
    });
    return ctx.db.get(id);
  },
});
