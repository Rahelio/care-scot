import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { trpc } from "@/lib/trpc";
import { Colors, Spacing } from "@/constants/theme";

// ─── Toggle this to use placeholder data while working on the UI ────────────
const USE_MOCK = true;
// ────────────────────────────────────────────────────────────────────────────

type VisitItem = {
  id: string;
  startTime: string;
  endTime: string;
  serviceUser: { id: string; firstName: string; lastName: string };
  address?: string;
  tasks?: string[];
};

const MOCK_VISITS: VisitItem[] = [
  {
    id: "1",
    startTime: "08:30",
    endTime: "09:30",
    serviceUser: { id: "su1", firstName: "Margaret", lastName: "Thomson" },
    address: "14 Glen Road, Inverness",
    tasks: ["Personal care", "Medication"],
  },
  {
    id: "2",
    startTime: "10:00",
    endTime: "11:00",
    serviceUser: { id: "su2", firstName: "Donald", lastName: "MacLeod" },
    address: "7 Castle Street, Inverness",
    tasks: ["Meal prep", "Mobility"],
  },
  {
    id: "3",
    startTime: "12:30",
    endTime: "13:15",
    serviceUser: { id: "su3", firstName: "Agnes", lastName: "Cameron" },
    address: "23 Millburn Road, Inverness",
    tasks: ["Personal care", "Companionship"],
  },
  {
    id: "4",
    startTime: "15:00",
    endTime: "16:00",
    serviceUser: { id: "su4", firstName: "Hamish", lastName: "Stewart" },
    address: "45 Old Edinburgh Road, Inverness",
    tasks: ["Personal care", "Medication", "Household"],
  },
  {
    id: "5",
    startTime: "17:30",
    endTime: "18:30",
    serviceUser: { id: "su5", firstName: "Morag", lastName: "Fraser" },
    address: "8 Balmoral Drive, Inverness",
    tasks: ["Meal prep", "Medication"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function visitStatus(start: string, end: string): "done" | "active" | "upcoming" {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (nowMins > toMins(end)) return "done";
  if (nowMins >= toMins(start)) return "active";
  return "upcoming";
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  done:     { label: "Completed", bg: "#DCFCE7", text: "#15803D" },
  active:   { label: "Due now",   bg: "#DBEAFE", text: "#1D4ED8" },
  upcoming: { label: "Upcoming",  bg: "#F3F4F6", text: "#6B7280" },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const c = STATUS_CONFIG[status];
  return (
    <View style={[badge.wrap, { backgroundColor: c.bg }]}>
      <Text style={[badge.text, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: "600" },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const scheduleQuery = trpc.rota.getStaffSchedule.useQuery(
    { staffId: user?.staffMemberId ?? "", from: today, to: todayEnd },
    { enabled: !USE_MOCK && !!user?.staffMemberId }
  );

  const visits: VisitItem[] = USE_MOCK
    ? MOCK_VISITS
    : (scheduleQuery.data ?? []).map((s) => ({
        id: s.id,
        startTime: s.startTime ?? "—",
        endTime: s.endTime ?? "—",
        serviceUser: s.serviceUser ?? { id: "", firstName: "Unknown", lastName: "Client" },
      }));

  const doneCount = visits.filter(
    (v) => visitStatus(v.startTime, v.endTime) === "done"
  ).length;

  const dateLabel = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const isLoading = !USE_MOCK && scheduleQuery.isLoading;
  const isError   = !USE_MOCK && scheduleQuery.isError;
  const noStaff   = !USE_MOCK && !user?.staffMemberId;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>Today</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>{dateLabel}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={8}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Sign out</Text>
        </Pressable>
      </View>

      {/* ── Summary strip ── */}
      {visits.length > 0 && (
        <View style={[styles.strip, { backgroundColor: colors.backgroundElement }]}>
          {[
            { value: visits.length,              label: "Visits",    color: colors.text },
            { value: doneCount,                   label: "Done",      color: "#15803D" },
            { value: visits.length - doneCount,   label: "Remaining", color: colors.text },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && (
                <View style={[styles.stripDivider, { backgroundColor: colors.backgroundSelected }]} />
              )}
              <View style={styles.stripItem}>
                <Text style={[styles.stripNumber, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.stripLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── States ── */}
      {noStaff ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Account not linked to a staff record — contact your manager.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: "#DC2626" }]}>
            Failed to load schedule. Pull down to retry.
          </Text>
        </View>
      ) : visits.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No visits scheduled for today.
          </Text>
        </View>
      ) : (
        /* ── Visit list ── */
        <ScrollView contentContainerStyle={styles.list}>
          {visits.map((visit) => {
            const status = visitStatus(visit.startTime, visit.endTime);
            const isDone = status === "done";

            return (
              <View
                key={visit.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.backgroundElement },
                  isDone && styles.cardFaded,
                ]}>
                {/* Time spine */}
                <View style={styles.spine}>
                  <Text style={[styles.spineTop, { color: isDone ? colors.textSecondary : colors.text }]}>
                    {visit.startTime}
                  </Text>
                  <View style={[styles.spineLine, { backgroundColor: isDone ? "#D1D5DB" : "#2563EB" }]} />
                  <Text style={[styles.spineBot, { color: colors.textSecondary }]}>
                    {visit.endTime}
                  </Text>
                </View>

                {/* Main content */}
                <View style={styles.body}>
                  {/* Row: name + badge */}
                  <View style={styles.row}>
                    <Text
                      style={[styles.clientName, { color: isDone ? colors.textSecondary : colors.text }]}
                      numberOfLines={1}>
                      {visit.serviceUser.firstName} {visit.serviceUser.lastName}
                    </Text>
                    <StatusBadge status={status} />
                  </View>

                  {/* Address */}
                  {!!visit.address && (
                    <Text style={[styles.address, { color: colors.textSecondary }]}>
                      {visit.address}
                    </Text>
                  )}

                  {/* Task chips */}
                  {visit.tasks && visit.tasks.length > 0 && (
                    <View style={styles.chips}>
                      {visit.tasks.map((task) => (
                        <View
                          key={task}
                          style={[styles.chip, { backgroundColor: colors.backgroundSelected }]}>
                          <Text style={[styles.chipText, { color: colors.textSecondary }]}>{task}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actions}>
                    {!!visit.serviceUser.id && (
                      <Pressable
                        style={[styles.btn, styles.btnOutline, { borderColor: colors.backgroundSelected }]}
                        onPress={() => router.push(`/(app)/clients/${visit.serviceUser.id}`)}>
                        <Text style={[styles.btnOutlineText, { color: colors.text }]}>View Client</Text>
                      </Pressable>
                    )}
                    {!isDone && !!visit.serviceUser.id && (
                      <Pressable
                        style={[styles.btn, styles.btnPrimary]}
                        onPress={() =>
                          router.push({
                            pathname: `/(app)/clients/${visit.serviceUser.id}/visit/new` as never,
                            params: { scheduledStart: visit.startTime, scheduledEnd: visit.endTime },
                          })
                        }>
                        <Text style={styles.btnPrimaryText}>Log Visit</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  heading: { fontSize: 28, fontWeight: "700" },
  subheading: { fontSize: 14, marginTop: 2 },
  logoutText: { fontSize: 14, paddingTop: 6 },

  // Summary strip
  strip: {
    flexDirection: "row",
    marginHorizontal: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.three,
  },
  stripItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  stripNumber: { fontSize: 22, fontWeight: "700" },
  stripLabel: { fontSize: 12, marginTop: 2 },
  stripDivider: { width: 1 },

  // States
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.four },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },

  // List
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: 12 },

  // Card
  card: { borderRadius: 14, padding: Spacing.three, flexDirection: "row", gap: 12 },
  cardFaded: { opacity: 0.6 },

  // Time spine
  spine: { width: 44, alignItems: "center", paddingTop: 2, gap: 4 },
  spineTop: { fontSize: 13, fontWeight: "600" },
  spineBot: { fontSize: 12 },
  spineLine: { width: 2, flex: 1, borderRadius: 1, minHeight: 20 },

  // Card body
  body: { flex: 1, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  clientName: { fontSize: 16, fontWeight: "600", flex: 1 },
  address: { fontSize: 13, lineHeight: 18 },

  // Task chips
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 12 },

  // Buttons
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  btnOutline: { borderWidth: 1 },
  btnOutlineText: { fontSize: 14, fontWeight: "600" },
  btnPrimary: { backgroundColor: "#2563EB" },
  btnPrimaryText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});