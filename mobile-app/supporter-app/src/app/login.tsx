import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth";
import { Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "react-native";

export default function LoginScreen() {
  const { login } = useAuth();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kav}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>CareScot</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Staff companion app
          </Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.backgroundElement, color: colors.text },
              ]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholderTextColor={colors.textSecondary}
              placeholder="you@example.com"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.backgroundElement, color: colors.text },
              ]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.textSecondary}
              placeholder="••••••••"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            {error && (
              <Text style={styles.error}>{error}</Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed || loading ? 0.7 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.four,
  },
  form: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: -Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: Spacing.two,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
