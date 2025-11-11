// convex/lobbies.ts
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function genCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function getMyProfile(ctx: QueryCtx | MutationCtx, guestKey?: string) {
  const authUserId = await getAuthUserId(ctx);
  console.log("[lobbies.getMyProfile] authUserId:", authUserId, "guestKey:", guestKey);

  if (authUserId) {
    const byAuth = await ctx.db
      .query("profiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();
    console.log("[lobbies.getMyProfile] lookup by auth:", byAuth?._id);
    if (byAuth) return byAuth;
  }

  if (guestKey) {
    const byGuest = await ctx.db
      .query("profiles")
      .withIndex("by_guest", (q) => q.eq("guestKey", guestKey))
      .first();
    console.log("[lobbies.getMyProfile] lookup by guest:", byGuest?._id);
    if (byGuest) return byGuest;
  }

  console.warn("[lobbies.getMyProfile] no profile found");
  return null;
}

export const createLobby = mutation({
  args: { title: v.optional(v.string()), guestKey: v.optional(v.string()) },
  handler: async (ctx: MutationCtx, { title, guestKey }) => {
    console.log("[lobbies.createLobby] start", { title, hasGuestKey: Boolean(guestKey) });

    const me = await getMyProfile(ctx, guestKey);
    console.log("[lobbies.createLobby] profile:", me?._id);

    if (!me) {
      console.error("[lobbies.createLobby] Not signed in (no profile) — check guestKey & ensureMe()");
      throw new Error("Not signed in");
    }

    const code = genCode();
    const lobbyId = await ctx.db.insert("lobbies", {
      code,
      hostId: me._id,
      title,
      isOpen: true,
      createdAt: Date.now(),
    });
    console.log("[lobbies.createLobby] lobby inserted:", lobbyId, "code:", code);

    const entrantId = await ctx.db.insert("entrants", {
      lobbyId,
      profileId: me._id,
      role: "host",
      joinedAt: Date.now(),
    });
    console.log("[lobbies.createLobby] host entrant inserted:", entrantId);

    const lobby = await ctx.db.get(lobbyId);
    console.log("[lobbies.createLobby] returning lobby:", lobby?._id);
    return lobby;
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx: QueryCtx, { code }) => {
    console.log("[lobbies.getByCode] code:", code);
    const lobby = await ctx.db
      .query("lobbies")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    console.log("[lobbies.getByCode] found:", lobby?._id);
    return lobby;
  },
});

export const myLobbies = query({
  args: { guestKey: v.optional(v.string()) },
  handler: async (ctx: QueryCtx, { guestKey }) => {
    console.log("[lobbies.myLobbies] hasGuestKey:", Boolean(guestKey));
    const me = await getMyProfile(ctx, guestKey);
    console.log("[lobbies.myLobbies] me:", me?._id);
    if (!me) return [];
    const rows = await ctx.db
      .query("lobbies")
      .withIndex("by_host", (q) => q.eq("hostId", me._id))
      .collect();
    console.log("[lobbies.myLobbies] count:", rows.length);
    return rows;
  },
});

export const closeLobby = mutation({
  args: { lobbyId: v.id("lobbies"), guestKey: v.optional(v.string()) },
  handler: async (ctx: MutationCtx, { lobbyId, guestKey }) => {
    console.log("[lobbies.closeLobby] lobbyId:", lobbyId, "hasGuestKey:", Boolean(guestKey));
    const lobby = await ctx.db.get(lobbyId);
    console.log("[lobbies.closeLobby] lobby exists:", Boolean(lobby));
    if (!lobby) throw new Error("Lobby not found");

    const me = await getMyProfile(ctx, guestKey);
    console.log("[lobbies.closeLobby] me:", me?._id, "hostId:", lobby.hostId);
    if (!me || lobby.hostId !== me._id) {
      console.error("[lobbies.closeLobby] forbidden: only host can close");
      throw new Error("Only host can close");
    }

    await ctx.db.patch(lobbyId, { isOpen: false });
    console.log("[lobbies.closeLobby] lobby closed:", lobbyId);
    return ctx.db.get(lobbyId);
  },
});
