import React, { useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { colors, spacing, typography } from "../theme";

interface Props {
  onSearch: (query: string) => Promise<void>;
}

export function SearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      await onSearch(query);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder='Try "quiet spot with outlets, not too busy"'
        placeholderTextColor={colors.inkMuted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Search</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.sfuRed,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    minWidth: 76,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
});
