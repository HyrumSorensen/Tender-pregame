// app/index.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function randomKey(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : "Unexpected error";
}

export default function Index() {
  const [guestKey, setGuestKey] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState<string>("");
  const [lobbyId, setLobbyId] = useState<Id<"lobbies"> | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Load or create guestKey
  useEffect(() => {
    (async () => {
      try {
        let k = await SecureStore.getItemAsync("tender_guest_key");
        console.log("[Index] SecureStore.get guestKey:", k);
        if (!k) {
          k = randomKey();
          await SecureStore.setItemAsync("tender_guest_key", k);
          console.log("[Index] SecureStore.set guestKey:", k);
        }
        setGuestKey(k);
      } catch (e) {
        console.error("[Index] guestKey error:", e);
      }
    })();
  }, []);

  const ensureMe = useMutation(api.profiles.ensureMe);
  const createLobby = useMutation(api.lobbies.createLobby);
  const addEatery = useMutation(api.eateries.addEatery);
  const joinByCode = useMutation(api.entrants.joinByCode);
  const swipe = useMutation(api.picks.swipe);
  const checkMatch = useMutation(api.pairings.checkAndRecordMatch);

  const next = useQuery(
    api.picks.nextEatery,
    lobbyId && guestKey ? { lobbyId, guestKey } : "skip"
  );
  const pairings = useQuery(
    api.pairings.listPairings,
    lobbyId ? { lobbyId } : "skip"
  );

  const winner = useMemo(() => (pairings ?? []).find((p) => p.isWinner), [pairings]);

  const handleCreate = async (): Promise<void> => {
    if (!guestKey) {
      console.warn("[Index.handleCreate] guestKey not ready; blocking call");
      Alert.alert("Please wait", "Initializing guest identity…");
      return;
    }
    try {
      setIsCreating(true);
      console.log("[Index.handleCreate] ensureMe start", { guestKey });
      const ensured = await ensureMe({ guestKey });
      console.log("[Index.handleCreate] ensureMe ok profileId:", ensured?._id);

      console.log("[Index.handleCreate] createLobby start", { guestKeyPassed: guestKey.slice(0, 6) + "…" });
      const lobby = await createLobby({ title: "Tonight's Dinner", guestKey });
      console.log("[Index.handleCreate] createLobby ok", lobby?._id, "code:", lobby?.code);

      if (!lobby) throw new Error("Failed to create lobby");
      setLobbyId(lobby._id);
      setSessionCode(lobby.code);

      const seeds: Array<{ name: string; tags: string[] }> = [
        { name: "La Taquería • 🌮", tags: ["mexican", "tacos"] },
        { name: "Sushi House • 🍣", tags: ["sushi", "japanese"] },
        { name: "Pasta Fresca • 🍝", tags: ["italian", "pasta"] },
      ];
      console.log("[Index.handleCreate] seeding eateries:", seeds.length);
      await Promise.all(
        seeds.map((s) =>
          addEatery({
            lobbyId: lobby._id,
            name: s.name,
            tags: s.tags,
          })
        )
      );
      console.log("[Index.handleCreate] seeded eateries");
    } catch (e: unknown) {
      console.error("[Index.handleCreate] error:", e);
      Alert.alert("Error", errorMessage(e));
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (): Promise<void> => {
    if (!guestKey) {
      console.warn("[Index.handleJoin] guestKey not ready; blocking call");
      Alert.alert("Please wait", "Initializing guest identity…");
      return;
    }
    try {
      if (!sessionCode.trim()) {
        Alert.alert("Room code required", "Please enter a code to join.");
        return;
      }
      setIsJoining(true);
      console.log("[Index.handleJoin] ensureMe start", { guestKey });
      const ensured = await ensureMe({ guestKey });
      console.log("[Index.handleJoin] ensureMe ok profileId:", ensured?._id);

      console.log("[Index.handleJoin] joinByCode start for code:", sessionCode);
      const entry = await joinByCode({ code: sessionCode.trim().toUpperCase(), guestKey });
      console.log("[Index.handleJoin] joinByCode ok entrantId:", entry?._id, "lobbyId:", entry?.lobbyId);

      setLobbyId(entry.lobbyId);
    } catch (e: unknown) {
      console.error("[Index.handleJoin] error:", e);
      Alert.alert("Error", errorMessage(e));
    } finally {
      setIsJoining(false);
    }
  };

  const handlePass = async (): Promise<void> => {
    if (!lobbyId || !guestKey || !next?._id) {
      console.warn("[Index.handlePass] missing state", {
        lobbyId,
        hasGuestKey: Boolean(guestKey),
        hasNext: Boolean(next?._id),
      });
      return;
    }
    console.log("[Index.handlePass] swipe PASS eatery:", next._id);
    await swipe({ lobbyId, eateryId: next._id, decision: "pass", guestKey });
  };

  const handleLike = async (): Promise<void> => {
    if (!lobbyId || !guestKey || !next?._id) {
      console.warn("[Index.handleLike] missing state", {
        lobbyId,
        hasGuestKey: Boolean(guestKey),
        hasNext: Boolean(next?._id),
      });
      return;
    }
    console.log("[Index.handleLike] swipe LIKE eatery:", next._id);
    await swipe({ lobbyId, eateryId: next._id, decision: "like", guestKey });
    console.log("[Index.handleLike] checkMatch");
    await checkMatch({ lobbyId, eateryId: next._id });
  };

  // Block UI until guestKey is loaded
  if (!guestKey) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tender</Text>
        <Text style={styles.subtitle}>Initializing guest…</Text>
      </View>
    );
  }

  if (!lobbyId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tender</Text>
        <Text style={styles.subtitle}>Decide where to eat — together 🤝</Text>

        <View style={styles.box}>
          <Text style={styles.boxTitle}>Start or Join a Session</Text>

          <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={isCreating}>
            {isCreating ? <ActivityIndicator /> : <Text style={styles.buttonText}>Create Session 🔥</Text>}
          </TouchableOpacity>

          <View style={{ width: "100%", marginTop: 8, marginBottom: 8 }}>
            <Text style={{ color: "#94a3b8", marginBottom: 6 }}>Room Code</Text>
            <TextInput
              value={sessionCode}
              onChangeText={setSessionCode}
              autoCapitalize="characters"
              placeholder="e.g. H9KQ2F"
              placeholderTextColor="#64748b"
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.buttonOutline} onPress={handleJoin} disabled={isJoining}>
            {isJoining ? <ActivityIndicator /> : <Text style={styles.buttonOutlineText}>Join</Text>}
          </TouchableOpacity>

          <Text style={styles.hint}>Create a session, then share the code with friends.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session: {sessionCode || "—"}</Text>
      <Text style={styles.subtitle}>Swipe to vote 🍔🍣🌮</Text>

      <View style={styles.card}>
        {!next && <Text style={{ color: "#94a3b8", fontSize: 16 }}>No more cards. Add more places!</Text>}
        {next && (
          <>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "700", marginBottom: 6 }}>{next.name}</Text>
            {!!next.tags?.length && <Text style={{ color: "#94a3b8" }}>{next.tags.join(" • ")}</Text>}
          </>
        )}
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.smallButton} onPress={handlePass} disabled={!next}>
          <Text style={styles.smallButtonText}>⬅️ Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={handleLike} disabled={!next}>
          <Text style={styles.smallButtonText}>Like ➡️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", padding: 20 },
  title: { color: "white", fontSize: 32, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#94a3b8", marginBottom: 20, fontSize: 14 },
  box: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  boxTitle: { color: "white", fontSize: 18, fontWeight: "600", marginBottom: 16 },
  button: { backgroundColor: "#22c55e", padding: 14, borderRadius: 12, width: "100%", marginBottom: 12 },
  buttonText: { textAlign: "center", fontWeight: "800", color: "black", fontSize: 16 },
  buttonOutline: { borderColor: "#22c55e", borderWidth: 2, padding: 14, borderRadius: 12, width: "100%", marginBottom: 10 },
  buttonOutlineText: { textAlign: "center", fontWeight: "700", color: "#22c55e", fontSize: 16 },
  hint: { marginTop: 10, color: "#94a3b8", fontSize: 12 },
  input: { width: "100%", borderColor: "#334155", borderWidth: 1, borderRadius: 12, padding: 12, color: "white", backgroundColor: "#0b1220", letterSpacing: 2 },
  card: { marginTop: 20, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: "#334155", backgroundColor: "#1e293b", width: "90%", maxWidth: 360, alignItems: "center", minHeight: 120, justifyContent: "center" },
  row: { flexDirection: "row", marginTop: 20, gap: 12 },
  smallButton: { backgroundColor: "#22c55e", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  smallButtonText: { fontWeight: "800", color: "black", fontSize: 14 },
});
