// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
// If you're using Convex Auth, keep this import & spread; otherwise remove both lines.
// import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  // ...authTables, // uncomment if using Convex Auth

  // People in the system (separate from auth "users" table if you use Convex Auth)
    profiles: defineTable({
      authUserId: v.optional(v.id("users")),
      guestKey: v.optional(v.string()),         // 👈 NEW
      displayName: v.string(),
      avatarUrl: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_auth_user", ["authUserId"])
      .index("by_guest", ["guestKey"]), 

  // A swiping "room" (host shares the code; friends join)
  lobbies: defineTable({
    code: v.string(),                // short code like "H9KQ2F"
    hostId: v.id("profiles"),
    title: v.optional(v.string()),   // e.g., "Dinner tonight"
    isOpen: v.boolean(),             // open to join?
    createdAt: v.number(),
  }).index("by_code", ["code"])
    .index("by_host", ["hostId"]),

  // Membership of profiles in a lobby
  entrants: defineTable({
    lobbyId: v.id("lobbies"),
    profileId: v.id("profiles"),
    role: v.optional(v.union(v.literal("host"), v.literal("guest"))),
    joinedAt: v.number(),
  }).index("by_lobby", ["lobbyId"])
    .index("by_profile", ["profileId"])
    .index("by_lobby_profile", ["lobbyId", "profileId"]),

  // Candidate places to swipe on for a lobby
  eateries: defineTable({
    lobbyId: v.id("lobbies"),
    name: v.string(),
    externalRef: v.optional(v.string()), // e.g., Google/Yelp place_id
    photoUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())), // ["mexican", "tacos"]
    addedAt: v.number(),
  }).index("by_lobby", ["lobbyId"]),

  // Swipes (like/pass) per user per place
  picks: defineTable({
    lobbyId: v.id("lobbies"),
    eateryId: v.id("eateries"),
    profileId: v.id("profiles"),
    decision: v.union(v.literal("like"), v.literal("pass")),
    createdAt: v.number(),
  }).index("by_lobby_eatery", ["lobbyId", "eateryId"])
    .index("by_lobby_profile", ["lobbyId", "profileId"])
    .index("by_unique", ["lobbyId", "eateryId", "profileId"]),

  // Results when a place reaches your match rule (e.g., everyone liked)
  pairings: defineTable({
    lobbyId: v.id("lobbies"),
    eateryId: v.id("eateries"),
    matchedAt: v.number(),
    isWinner: v.boolean(), // mark the final choice
  }).index("by_lobby", ["lobbyId"])
    .index("by_lobby_eatery", ["lobbyId", "eateryId"]),
});

export default schema;
