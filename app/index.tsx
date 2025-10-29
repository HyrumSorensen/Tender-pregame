import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Index() {
  const [sessionCode, setSessionCode] = useState("ABCD");
  const [joined, setJoined] = useState(false);

  if (!joined) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tender</Text>
        <Text style={styles.subtitle}>Decide where to eat — together 🤝</Text>

        <View style={styles.box}>
          <Text style={styles.boxTitle}>Start or Join a Session</Text>

          <TouchableOpacity style={styles.button} onPress={() => {
            setSessionCode("ABCD");
            setJoined(true);
          }}>
            <Text style={styles.buttonText}>Create Session 🔥</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonOutline} onPress={() => setJoined(true)}>
            <Text style={styles.buttonOutlineText}>Join ({sessionCode})</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>Room codes & real swiping coming soon...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session: {sessionCode}</Text>
      <Text style={styles.subtitle}>Swipe UI coming soon 🍔🍣🌮</Text>

      <View style={styles.card}>
        <Text style={{ color: "white", fontSize: 18 }}>
          This will be your restaurant swipe card 👇
        </Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.smallButton}>
          <Text style={styles.smallButtonText}>⬅️ Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton}>
          <Text style={styles.smallButtonText}>Like ➡️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: 20,
    fontSize: 14,
  },
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
  boxTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
  },
  buttonText: {
    textAlign: "center",
    fontWeight: "800",
    color: "black",
    fontSize: 16,
  },
  buttonOutline: {
    borderColor: "#22c55e",
    borderWidth: 2,
    padding: 14,
    borderRadius: 12,
    width: "100%",
    marginBottom: 10,
  },
  buttonOutlineText: {
    textAlign: "center",
    fontWeight: "700",
    color: "#22c55e",
    fontSize: 16,
  },
  hint: {
    marginTop: 10,
    color: "#94a3b8",
    fontSize: 12,
  },
  card: {
    marginTop: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    width: "90%",
    maxWidth: 360,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  smallButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  smallButtonText: {
    fontWeight: "800",
    color: "black",
    fontSize: 14,
  },
});
