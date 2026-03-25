import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { trpc } from "@/lib/trpc";
import { Colors, Spacing } from "@/constants/theme";

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function ClientsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isError } = trpc.clients.list.useQuery({
    status: "ACTIVE",
    search: debouncedSearch || undefined,
    page: 1,
    limit: 30,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.text }]}>Clients</Text>
      </View>

      <View style={styles.searchWrapper}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: colors.backgroundElement, color: colors.text },
          ]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or CHI…"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: "#DC2626" }]}>
            Failed to load clients.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No clients found.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => router.push(`/(app)/clients/${item.id}`)}>
              <View style={styles.rowLeft}>
                <Text style={[styles.clientName, { color: colors.text }]}>
                  {item.firstName} {item.lastName}
                </Text>
                {item.chiNumber && (
                  <Text style={[styles.chi, { color: colors.textSecondary }]}>
                    CHI: {item.chiNumber}
                  </Text>
                )}
              </View>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  heading: { fontSize: 28, fontWeight: "700" },
  searchWrapper: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  searchInput: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 16,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  emptyText: { textAlign: "center", fontSize: 15, marginTop: Spacing.four },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  rowLeft: { flex: 1, gap: 2 },
  clientName: { fontSize: 16, fontWeight: "600" },
  chi: { fontSize: 13 },
  chevron: { fontSize: 22, fontWeight: "300" },
});
