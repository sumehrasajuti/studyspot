import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { OccupancyStatus, Room } from "../types";
import { colors, spacing, typography } from "../theme";

interface Props {
  room: Room | null;
  onClose: () => void;
  onSubmit: (status: OccupancyStatus) => void;
}

const OPTIONS: { status: OccupancyStatus; label: string; description: string; color: string }[] = [
  { status: "empty", label: "Empty", description: "Lots of available seats", color: colors.statusEmpty },
  { status: "some_space", label: "Some Space", description: "Plenty of room available", color: colors.statusSomeSpace },
  { status: "crowded", label: "Crowded", description: "Limited seats available", color: colors.statusCrowded },
  { status: "packed", label: "Packed", description: "No seats available", color: colors.statusPacked },
];

export function ReportModal({ room, onClose, onSubmit }: Props) {
  return (
    <Modal visible={room !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Report Occupancy</Text>
              <Text style={styles.subtitle}>{room?.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helper}>Help others by reporting current conditions.</Text>

          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.status}
              style={[styles.option, { backgroundColor: `${option.color}15`, borderColor: `${option.color}40` }]}
              onPress={() => onSubmit(option.status)}
            >
              <Text style={[styles.optionLabel, { color: option.color }]}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  title: { ...typography.heading, fontSize: 22, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkMuted, marginTop: 2 },
  closeButton: { fontSize: 20, color: colors.inkMuted },
  helper: { ...typography.body, color: colors.inkMuted, marginBottom: spacing.md },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionLabel: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  optionDescription: { fontSize: 13, color: colors.inkMuted },
});
