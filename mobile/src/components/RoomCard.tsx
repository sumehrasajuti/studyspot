import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Room } from "../types";
import { colors, occupancyColor, occupancyLabel, spacing, typography } from "../theme";

interface Props {
  room: Room;
  onReportPress: () => void;
}

export function RoomCard({ room, onReportPress }: Props) {
  const dotColor = occupancyColor(room.occupancy_percent);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{room.name}</Text>
          <Text style={styles.meta}>
            Floor {room.floor} · Capacity {room.capacity}
          </Text>
        </View>
        {room.occupancy_percent !== null && (
          <View style={styles.percentBlock}>
            <Text style={[styles.percentNumber, { color: dotColor }]}>
              {room.occupancy_percent}%
            </Text>
            <Text style={styles.percentLabel}>occupied</Text>
          </View>
        )}
      </View>

      {room.occupancy_percent === null ? (
        <Text style={styles.noData}>{occupancyLabel(null)} - be the first to report</Text>
      ) : (
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${room.occupancy_percent}%`, backgroundColor: dotColor },
            ]}
          />
        </View>
      )}

      <View style={styles.tagRow}>
        {room.has_wifi && <Tag label="wifi" />}
        {room.has_outlets && <Tag label="outlets" />}
        {room.is_quiet && <Tag label="quiet" />}
        {room.has_whiteboard && <Tag label="whiteboard" />}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.updated}>
          {room.last_reported_at ? formatRelativeTime(room.last_reported_at) : "No reports yet"}
        </Text>
        <TouchableOpacity style={styles.reportButton} onPress={onReportPress}>
          <Text style={styles.reportButtonText}>Report Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  return `Updated ${diffHours}h ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, marginRight: spacing.sm },
  name: { ...typography.subheading, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  percentBlock: { alignItems: "flex-end" },
  percentNumber: { fontSize: 22, fontWeight: "700" },
  percentLabel: { ...typography.caption, color: colors.inkMuted },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  barFill: { height: "100%", borderRadius: 3 },
  noData: { ...typography.caption, color: colors.inkMuted, marginBottom: spacing.sm },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  tag: {
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { fontSize: 12, color: colors.inkMuted },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  updated: { ...typography.caption, color: colors.inkMuted },
  reportButton: {
    backgroundColor: colors.sfuRed,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reportButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
});
