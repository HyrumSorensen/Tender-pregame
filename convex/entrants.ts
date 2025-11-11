import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

export const joinByCode = mutation({
  args: { code: v.string(), guestKey: v.optional(v.string()) },
  handler: async (ctx: MutationCtx, { code, guestKey }) => {
    const me = await getMyProfile(ctx, guestKey);
    if (!me) throw new Error("Not signed in");

    const lobby = await ctx.db
      .query("lobbies")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!lobby) throw new Error("Lobby not found");
    if (!lobby.isOpen) throw new Error("Lobby closed");

    const existing = await ctx.db
      .query("entrants")
      .withIndex("by_lobby_profile", (q) =>
        q.eq("lobbyId", lobby._id).eq("profileId", me._id)
      )
      .first();
    if (existing) return existing;

    const id = await ctx.db.insert("entrants", {
      lobbyId: lobby._id,
      profileId: me._id,
      role: "guest",
      joinedAt: Date.now(),
    });
    return ctx.db.get(id);
  },
});

export const leaveLobby = mutation({
  args: { lobbyId: v.id("lobbies"), guestKey: v.optional(v.string()) },
  handler: async (ctx: MutationCtx, { lobbyId, guestKey }) => {
    const me = await getMyProfile(ctx, guestKey);
    if (!me) throw new Error("Not signed in");

    const entry = await ctx.db
      .query("entrants")
      .withIndex("by_lobby_profile", (q) =>
        q.eq("lobbyId", lobbyId).eq("profileId", me._id)
      )
      .first();
    if (!entry) return null;

    await ctx.db.delete(entry._id);
    return entry._id;
  },
});

export const listEntrants = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx: QueryCtx, { lobbyId }) => {
    return ctx.db
      .query("entrants")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .collect();
  },
});
