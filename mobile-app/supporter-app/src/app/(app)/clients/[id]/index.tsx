import { useLocalSearchParams, useRouter } from "expo-router";
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

import { trpc } from "@/lib/trpc";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import { Colors, Spacing } from "@/constants/theme";

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  // Use mock data when id matches a mock client (UI development)
  const mockClient = MOCK_CLIENTS[id];
  const isMock = !!mockClient;

  const clientQuery = trpc.clients.getById.useQuery({ id }, { enabled: !isMock });
  const riskQuery = trpc.clients.listRiskAssessments.useQuery(
    { serviceUserId: id },
    { enabled: !isMock }
  );
  const allergyQuery = trpc.clients.listHealthRecords.useQuery(
    { serviceUserId: id, recordType: "ALLERGY" },
    { enabled: !isMock }
  );
  const planQuery = trpc.clients.getActivePlan.useQuery(
    { serviceUserId: id },
    { enabled: !isMock }
  );

  const isLoading =
    !isMock &&
    (clientQuery.isLoading || riskQuery.isLoading || allergyQuery.isLoading || planQuery.isLoading);
  const isError = !isMock && clientQuery.isError;

  // Derived data — resolved from mock or live API
  const clientFirstName = isMock ? mockClient.firstName : (clientQuery.data?.firstName ?? "");
  const clientLastName  = isMock ? mockClient.lastName  : (clientQuery.data?.lastName ?? "");

  const highRisks = isMock
    ? mockClient.risks.filter((r) => r.riskLevel === "HIGH")
    : (riskQuery.data ?? []).filter((r: { riskLevel: string }) => r.riskLevel === "HIGH");

  const allergies = isMock ? mockClient.allergies : (allergyQuery.data ?? []);

  const careRequirements: string[] = (() => {
    const plan = isMock ? mockClient.plan : planQuery.data;
    if (!plan) return [];
    const reqs: string[] = [];
    if (plan.healthNeeds) reqs.push(`Health: ${plan.healthNeeds}`);
    if (plan.welfareNeeds) reqs.push(`Welfare: ${plan.welfareNeeds}`);
    if (plan.personalCareRequirements) reqs.push(`Personal care: ${plan.personalCareRequirements}`);
    if (plan.howNeedsWillBeMet) reqs.push(`How needs are met: ${plan.howNeedsWillBeMet}`);
    return reqs;
  })();

  const contacts = isMock
    ? mockClient.contacts
    : (clientQuery.data?.contacts ?? []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: "#2563EB" }]}>‹ Back</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: "#DC2626" }}>Failed to load client.</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.name, { color: colors.text }]}>
              {clientFirstName} {clientLastName}
            </Text>

            {/* Risk Alerts */}
            {highRisks.length > 0 && (
              <Section title="⚠ Risk Alerts" colors={colors}>
                {highRisks.map(
                  (r: {
                    id: string;
                    assessmentType: string;
                    assessmentDetail?: string | null;
                    controlMeasures?: string | null;
                  }) => (
                    <View key={r.id} style={styles.alertCard}>
                      <Text style={styles.alertTitle}>{r.assessmentType.replace(/_/g, " ")}</Text>
                      {r.assessmentDetail ? (
                        <Text style={styles.alertDesc}>{r.assessmentDetail}</Text>
                      ) : null}
                      {r.controlMeasures ? (
                        <Text style={styles.alertDesc}>Controls: {r.controlMeasures}</Text>
                      ) : null}
                    </View>
                  )
                )}
              </Section>
            )}

            {/* Allergies */}
            {allergies.length > 0 && (
              <Section title="Allergies" colors={colors}>
                {allergies.map(
                  (a: { id: string; title: string; description?: string | null }) => (
                    <Row
                      key={a.id}
                      label={a.title}
                      value={a.description ?? ""}
                      colors={colors}
                    />
                  )
                )}
              </Section>
            )}

            {/* Care Requirements */}
            {careRequirements.length > 0 && (
              <Section title="Care Requirements" colors={colors}>
                {careRequirements.map((req, i) => (
                  <Text key={i} style={[styles.bodyText, { color: colors.text }]}>
                    • {req}
                  </Text>
                ))}
              </Section>
            )}

            {/* Emergency Contacts */}
            {contacts.length > 0 && (
              <Section title="Emergency Contacts" colors={colors}>
                {contacts
                  .filter(
                    (c: { isEmergencyContact: boolean }) => c.isEmergencyContact
                  )
                  .map(
                    (c: {
                      id: string;
                      contactName: string;
                      relationship?: string | null;
                      phone?: string | null;
                    }) => (
                      <View key={c.id} style={styles.contactRow}>
                        <Text style={[styles.contactName, { color: colors.text }]}>
                          {c.contactName}
                        </Text>
                        {c.relationship && (
                          <Text style={[styles.contactMeta, { color: colors.textSecondary }]}>
                            {c.relationship}
                          </Text>
                        )}
                        {c.phone && (
                          <Text style={[styles.contactMeta, { color: colors.textSecondary }]}>
                            {c.phone}
                          </Text>
                        )}
                      </View>
                    )
                  )}
              </Section>
            )}
          </ScrollView>

          {/* FAB */}
          <Pressable
            style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push(`/(app)/clients/${id}/visit/new`)}>
            <Text style={styles.fabText}>+ Log Visit</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  return (
    <View style={styles.rowItem}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  back: { fontSize: 17 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: 100 },
  name: { fontSize: 26, fontWeight: "700", marginBottom: Spacing.two },
  section: { gap: Spacing.one },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", marginLeft: 4 },
  sectionCard: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  alertCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
  },
  alertTitle: { fontSize: 15, fontWeight: "600", color: "#DC2626" },
  alertDesc: { fontSize: 13, color: "#991B1B", marginTop: 2 },
  rowItem: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.two },
  rowLabel: { fontSize: 14, flex: 1 },
  rowValue: { fontSize: 14, flex: 2, textAlign: "right" },
  bodyText: { fontSize: 14, lineHeight: 20 },
  contactRow: { gap: 2 },
  contactName: { fontSize: 15, fontWeight: "600" },
  contactMeta: { fontSize: 13 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2563EB",
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});