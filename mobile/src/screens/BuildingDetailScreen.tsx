import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { fetchBuildingDetail, submitReport } from "../api/client";
import { BuildingDetail, OccupancyStatus, Room, RootStackParamList } from "../types";
import { colors, spacing, typography } from "../theme";
import { RoomCard } from "../components/RoomCard";
import { ReportModal } from "../components/ReportModal";

type Props = NativeStackScreenProps<RootStackParamList, "BuildingDetail">;

export function BuildingDetailScreen({ route, navigation }: Props) {
  const { buildingId, buildingName } = route.params;
  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportingRoom, setReportingRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: buildingName });
  }, [navigation, buildingName]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchBuildingDetail(buildingId);
      setBuilding(data);
    } catch (err) {
      setError("Couldn't load this building's data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildingId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReportSubmit = async (status: OccupancyStatus) => {
    if (!reportingRoom) return;
    try {
      await submitReport(reportingRoom.id, status);
      setReportingRoom(null);
      load(); // refresh so the new report is reflected immediately
    } catch (err) {
      setError("Couldn't submit your report. Try again.");
      setReportingRoom(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.sfuRed} />
      </View>
    );
  }

  if (!building) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Building not found."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.description}>{building.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {building.rooms.length} study {building.rooms.length === 1 ? "space" : "spaces"}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Study Spaces</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={building.rooms}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        renderItem={({ item }) => (
          <RoomCard room={item} onReportPress={() => setReportingRoom(item)} />
        )}
      />

      <ReportModal
        room={reportingRoom}
        onClose={() => setReportingRoom(null)}
        onSubmit={handleReportSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  description: { ...typography.body, color: colors.ink },
  metaRow: { flexDirection: "row", marginTop: spacing.sm },
  metaText: { ...typography.caption, color: colors.inkMuted },
  sectionTitle: { ...typography.subheading, color: colors.ink, marginBottom: spacing.sm },
  error: { color: colors.statusPacked, marginBottom: spacing.sm },
});
