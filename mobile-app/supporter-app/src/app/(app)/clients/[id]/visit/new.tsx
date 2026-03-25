import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { trpc } from "@/lib/trpc";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import { Colors, Spacing } from "@/constants/theme";

const DEFAULT_TASKS = [
  "Personal hygiene / washing",
  "Dressing / undressing",
  "Meal preparation",
  "Medication prompting",
  "Mobility assistance",
  "Social engagement",
];

export default function NewVisitScreen() {
  const { id, scheduledStart, scheduledEnd } = useLocalSearchParams<{
    id: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [visitDate] = useState(todayStr);
  const [actualStart, setActualStart] = useState(scheduledStart ?? "");
  const [actualEnd, setActualEnd] = useState(scheduledEnd ?? "");
  const [tasks, setTasks] = useState<{ task: string; completed: boolean; notes: string }[]>(
    DEFAULT_TASKS.map((t) => ({ task: t, completed: false, notes: "" }))
  );
  const [wellbeingObservations, setWellbeingObservations] = useState("");
  const [refusedCare, setRefusedCare] = useState(false);
  const [refusedCareDetails, setRefusedCareDetails] = useState("");
  const [familyCommunication, setFamilyCommunication] = useState("");
  const [conditionChanges, setConditionChanges] = useState("");
  const [mileage, setMileage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isMock = !!MOCK_CLIENTS[id];
  const createVisit = trpc.clients.createCareVisit.useMutation();

  function toggleTask(index: number) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, completed: !t.completed } : t))
    );
  }

  async function handleSubmit() {
    if (!scheduledStart || !scheduledEnd) {
      Alert.alert("Missing times", "Scheduled start and end times are required.");
      return;
    }

    // Mock mode — simulate a successful submission without hitting the API
    if (isMock) {
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 600)); // brief delay to show loading state
      setSubmitting(false);
      Alert.alert("Visit logged", "The care visit has been recorded.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      await createVisit.mutateAsync({
        serviceUserId: id,
        visitDate: new Date(visitDate),
        scheduledStart: scheduledStart!,
        scheduledEnd: scheduledEnd!,
        actualStart: actualStart || undefined,
        actualEnd: actualEnd || undefined,
        tasksCompleted: tasks.map(({ task, completed, notes }) => ({
          task,
          completed,
          notes: notes || undefined,
        })),
        wellbeingObservations: wellbeingObservations || undefined,
        refusedCare,
        refusedCareDetails: refusedCareDetails || undefined,
        familyCommunication: familyCommunication || undefined,
        conditionChanges: conditionChanges || undefined,
        mileageMiles: mileage || undefined,
      });
      Alert.alert("Visit logged", "The care visit has been recorded.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to log visit.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: "#2563EB" }]}>‹ Cancel</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Log Visit</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Visit date */}
          <Field label="Visit date" colors={colors}>
            <Text style={[styles.staticValue, { color: colors.text }]}>{visitDate}</Text>
          </Field>

          {/* Times */}
          <View style={styles.row}>
            <Field label="Actual start" colors={colors} style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                value={actualStart}
                onChangeText={setActualStart}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </Field>
            <Field label="Actual end" colors={colors} style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                value={actualEnd}
                onChangeText={setActualEnd}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </Field>
          </View>

          {/* Tasks checklist */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tasks</Text>
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              {tasks.map((t, i) => (
                <Pressable key={i} style={styles.taskRow} onPress={() => toggleTask(i)}>
                  <View
                    style={[
                      styles.checkbox,
                      t.completed && styles.checkboxChecked,
                    ]}>
                    {t.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.taskLabel, { color: colors.text }]}>{t.task}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Wellbeing */}
          <Field label="Wellbeing observations" colors={colors}>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              value={wellbeingObservations}
              onChangeText={setWellbeingObservations}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textSecondary}
              placeholder="How was the client today?"
              textAlignVertical="top"
            />
          </Field>

          {/* Refused care */}
          <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Refused care</Text>
              <Switch value={refusedCare} onValueChange={setRefusedCare} />
            </View>
            {refusedCare && (
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                value={refusedCareDetails}
                onChangeText={setRefusedCareDetails}
                multiline
                numberOfLines={2}
                placeholderTextColor={colors.textSecondary}
                placeholder="Details of refused care…"
                textAlignVertical="top"
              />
            )}
          </View>

          {/* Family communication */}
          <Field label="Family communication" colors={colors}>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              value={familyCommunication}
              onChangeText={setFamilyCommunication}
              multiline
              numberOfLines={2}
              placeholderTextColor={colors.textSecondary}
              placeholder="Any communication with family?"
              textAlignVertical="top"
            />
          </Field>

          {/* Condition changes */}
          <Field label="Condition changes" colors={colors}>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              value={conditionChanges}
              onChangeText={setConditionChanges}
              multiline
              numberOfLines={2}
              placeholderTextColor={colors.textSecondary}
              placeholder="Any notable changes in condition?"
              textAlignVertical="top"
            />
          </Field>

          {/* Mileage */}
          <Field label="Mileage (miles)" colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              value={mileage}
              onChangeText={setMileage}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textSecondary}
              placeholder="0.0"
            />
          </Field>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { opacity: pressed || submitting ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit Visit</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
  colors,
  style,
}: {
  label: string;
  children: React.ReactNode;
  colors: (typeof Colors)[keyof typeof Colors];
  style?: object;
}) {
  return (
    <View style={[styles.fieldGroup, style]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  back: { fontSize: 17, width: 60 },
  title: { fontSize: 17, fontWeight: "600" },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  row: { flexDirection: "row", gap: Spacing.two },
  fieldGroup: { gap: Spacing.one },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", marginLeft: 2 },
  staticValue: { fontSize: 16 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  textarea: { borderRadius: 8, padding: 12, fontSize: 15, minHeight: 80 },
  card: { borderRadius: 12, overflow: "hidden" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  taskLabel: { fontSize: 15, flex: 1 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
