// convex/profiles.ts
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

async function findByGuestKey(ctx: QueryCtx | MutationCtx, guestKey: string) {
  const row = await ctx.db
    .query("profiles")
    .withIndex("by_guest", (q) => q.eq("guestKey", guestKey))
    .first();
  console.log("[profiles.findByGuestKey] guestKey:", guestKey, "found:", row?._id);
  return row ?? null;
}

async function getMyProfile(ctx: QueryCtx | MutationCtx, guestKey?: string) {
  const authUserId = await getAuthUserId(ctx);
  console.log("[profiles.getMyProfile] authUserId:", authUserId, "guestKey:", guestKey);

  if (authUserId) {
    const byAuth = await ctx.db
      .query("profiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();
    console.log("[profiles.getMyProfile] byAuth:", byAuth?._id);
    if (byAuth) return byAuth;
  }
  if (guestKey) {
    const byGuest = await findByGuestKey(ctx, guestKey);
    console.log("[profiles.getMyProfile] byGuest:", byGuest?._id);
    if (byGuest) return byGuest;
  }
  console.warn("[profiles.getMyProfile] not found");
  return null;
}

/** Create profile if missing, but require identity:
 * - If authenticated: OK
 * - If not authenticated: require guestKey (fail fast if missing)
 */
async function createIfMissing(ctx: MutationCtx, guestKey?: string) {
  const existing = await getMyProfile(ctx, guestKey);
  if (existing) {
    console.log("[profiles.createIfMissing] already exists:", existing._id);
    return existing;
  }

  const authUserId = await getAuthUserId(ctx);
  const noIdentity = !authUserId && !guestKey;
  console.log("[profiles.createIfMissing] creating. authUserId:", authUserId, "guestKey:", guestKey);
  if (noIdentity) {
    console.error("[profiles.createIfMissing] Missing identity: provide guestKey or sign in");
    throw new Error("Missing identity: provide guestKey or sign in");
  }

  const newId: Id<"profiles"> = await ctx.db.insert("profiles", {
    authUserId: authUserId ?? undefined,
    guestKey: authUserId ? undefined : guestKey, // only store guestKey for guests
    displayName: authUserId ? "New Diner" : "Guest",
    createdAt: Date.now(),
  });
  const created = await ctx.db.get(newId);
  console.log("[profiles.createIfMissing] created:", created?._id);
  if (!created) throw new Error("Failed to create profile");
  return created;
}

/* ---------------- QUERIES ---------------- */

export const me = query({
  args: { guestKey: v.optional(v.string()) },
  handler: async (ctx: QueryCtx, { guestKey }) => {
    const p = await getMyProfile(ctx, guestKey);
    console.log("[profiles.me] result:", p?._id);
    return p;
  },
});

/* ---------------- MUTATIONS ---------------- */

export const ensureMe = mutation({
  args: { guestKey: v.optional(v.string()) },
  handler: async (ctx: MutationCtx, { guestKey }) => {
    const p = await createIfMissing(ctx, guestKey);
    console.log("[profiles.ensureMe] ensured:", p._id);
    return p;
  },
});
