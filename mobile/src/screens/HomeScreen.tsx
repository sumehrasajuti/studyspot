import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} 

from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  fetchBuildings,
  searchRooms,
  fetchRecommendations,
  RecommendationFilters,
} from "../api/client";
import { BuildingSummary, Room, RootStackParamList } from "../types";
import { colors, occupancyColor, spacing, typography } from "../theme";
import { SearchBar } from "../components/SearchBar";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type SearchResult = Room & {
  building_name: string;
  building_id: number;
  recommendation_score?: number;
  data_confidence?: number;
};

function buildCampusMapHtml(buildings: BuildingSummary[]): string {
  // Give the five seeded buildings short labels for the map.
  const labels: Record<string, string> = {
    "Academic Quadrangle": "AQ",
    "W.A.C. Bennett Library": "LIB",
    "Student Union Building": "SUB",
    "Technology and Science Complex 1": "TASC1",
    "Robert C. Brown Building": "RCB",
  };

  // Reuse the app's existing occupancy colours and database coordinates.
  const mapBuildings = buildings
    .filter(
      (b) =>
        Number.isFinite(b.latitude) &&
        Number.isFinite(b.longitude)
    )
    .map((b) => ({
      name: b.name,
      label: labels[b.name] ?? b.name.slice(0, 4).toUpperCase(),
      latitude: b.latitude,
      longitude: b.longitude,
      roomCount: b.room_count,
      occupancy: b.avg_occupancy_percent,
      color: occupancyColor(b.avg_occupancy_percent),
    }));

  // Escape "<" so database text cannot break out of the HTML script.
  const data = JSON.stringify(mapBuildings).replace(/</g, "\\u003c");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <style>
          html, body, #map {
            margin: 0;
            width: 100%;
            height: 100%;
          }

          .pin {
            min-width: 48px;
            height: 48px;
            padding: 0 5px;
            border: 3px solid white;
            border-radius: 26px;
            box-shadow: 0 3px 12px rgba(0,0,0,0.25);
            color: white;
            font: bold 12px Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            white-space: nowrap;
          }

          .popup-title {
            font: bold 14px Arial, sans-serif;
            margin-bottom: 5px;
          }

          .popup-detail {
            font: 12px Arial, sans-serif;
            color: #555;
            line-height: 1.5;
          }
        </style>
      </head>

      <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <script>
          const buildings = ${data};

          // Centre the map on SFU Burnaby.
          const map = L.map("map", {
            scrollWheelZoom: false
          }).setView([49.2781, -122.9199], 16);

          // OpenStreetMap provides the actual campus map tiles.
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          const bounds = [];

          buildings.forEach((b) => {
            // Create the coloured circular marker.
            const pin = document.createElement("div");
            pin.className = "pin";
            pin.style.backgroundColor = b.color;
            pin.textContent = b.label;

            const icon = L.divIcon({
              html: pin,
              className: "",
              iconSize: [48, 48],
              iconAnchor: [24, 24]
            });

            // Create a popup with the building's real database information.
            const popup = document.createElement("div");

            const title = document.createElement("div");
            title.className = "popup-title";
            title.textContent = b.name;

            const detail = document.createElement("div");
            detail.className = "popup-detail";

            const occupancyText =
              b.occupancy === null
                ? "No recent occupancy reports"
                : Math.round(b.occupancy) + "% reported occupancy";

            detail.textContent =
              b.roomCount + " study spaces · " + occupancyText;

            popup.appendChild(title);
            popup.appendChild(detail);

            L.marker([b.latitude, b.longitude], { icon })
              .addTo(map)
              .bindPopup(popup);

            bounds.push([b.latitude, b.longitude]);
          });

          // Make sure all of the building markers fit on screen.
          if (bounds.length > 0) {
            map.fitBounds(bounds, {
              padding: [35, 35],
              maxZoom: 16
            });
          }
        </script>
      </body>
    </html>
  `;
}

export function HomeScreen({ navigation }: Props) {
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
    // Preferences selected by the student
  const [recommendationFilters, setRecommendationFilters] =
    useState<RecommendationFilters>({});

  // Whether the recommendation request is loading
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  // Heading shown above the results
  const [resultsTitle, setResultsTitle] = useState("Search Results");

const campusMapHtml = React.useMemo(
  () => buildCampusMapHtml(buildings),
  [buildings]
);

const loadBuildings = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchBuildings();
      setBuildings(data);
    } catch (err) {
      setError("Couldn't load buildings. Check that the backend is running and reachable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBuildings();
  };

  const handleSearch = async (query: string) => {
  try {
    const { results } = await searchRooms(query);
    setSearchResults(results);
    setResultsTitle("Search Results");
  } catch (err) {
    setError("Search failed. Check your Anthropic API key and backend connection.");
  }
};

const handleRecommendations = async () => {
  setRecommendationLoading(true);
  setError(null);

  try {
    const { results } = await fetchRecommendations(recommendationFilters);

    setSearchResults(results);
    setResultsTitle("Recommended for You");
  } catch (err) {
    setError("Couldn't load recommendations. Check that the backend is running.");
  } finally {
    setRecommendationLoading(false);
  }
};

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.sfuRed} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>StudySpot</Text>
<Text style={styles.subtitle}>Find your perfect study space at SFU</Text>

{Platform.OS === "web" && (
  <View
    style={{
      height: 320,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    }}
  >
    {React.createElement("iframe", {
      title: "SFU Burnaby Campus Map",
      srcDoc: campusMapHtml,
      style: {
        width: "100%",
        height: "100%",
        border: 0,
      },
    })}
  </View>
)}

<SearchBar onSearch={handleSearch} />
<View
  style={{
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  }}
>
  <Text style={styles.sectionTitle}>Find Study Spaces</Text>

  <Text style={{ ...typography.caption, color: colors.inkMuted, marginBottom: 12 }}>
    Choose your preferences to find the best rooms.
  </Text>

  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
    {(
      [
        ["requireQuiet", "Quiet"],
        ["requireOutlets", "Outlets"],
        ["requireWifi", "Wi-Fi"],
        ["requireWhiteboard", "Whiteboard"],
      ] as const
    ).map(([key, label]) => {
      const selected = recommendationFilters[key] === true;

      return (
        <TouchableOpacity
          key={key}
          onPress={() =>
            setRecommendationFilters((current) => ({
              ...current,
              [key]: !current[key],
            }))
          }
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selected ? colors.sfuRed : colors.border,
            backgroundColor: selected ? colors.sfuRed : colors.background,
          }}
        >
          <Text style={{ color: selected ? "#FFFFFF" : colors.ink, fontWeight: "600" }}>
            {selected ? "✓ " : ""}{label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>

  <Text
  style={{
    ...typography.caption,
    color: colors.inkMuted,
    fontWeight: "600",
    marginBottom: 8,
  }}
>
  Maximum reported occupancy
</Text>

<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  }}
>
  {(
    [
      { label: "Any", value: undefined },
      { label: "40% or less", value: 40 },
      { label: "70% or less", value: 70 },
    ] as const
  ).map((option) => {
    const selected =
      recommendationFilters.maxOccupancyPercent === option.value;

    return (
      <TouchableOpacity
        key={option.label}
        onPress={() =>
          setRecommendationFilters((current) => ({
            ...current,
            maxOccupancyPercent: option.value,
          }))
        }
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: selected ? colors.sfuRed : colors.border,
          backgroundColor: selected ? colors.sfuRed : colors.background,
        }}
      >
        <Text
          style={{
            color: selected ? "#FFFFFF" : colors.ink,
            fontWeight: "600",
          }}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
  <TouchableOpacity
    onPress={handleRecommendations}
    disabled={recommendationLoading}
    style={{
      backgroundColor: colors.sfuRed,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
    }}
  >
    {recommendationLoading ? (
      <ActivityIndicator color="#FFFFFF" size="small" />
    ) : (
      <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
        Find Study Spaces
      </Text>
    )}
  </TouchableOpacity>
</View>

      {error && <Text style={styles.error}>{error}</Text>}

      {searchResults ? (
        <>
          <View style={styles.searchResultsHeader}>
            <Text style={styles.sectionTitle}>{resultsTitle}</Text>
            <TouchableOpacity onPress={() => setSearchResults(null)}>
              <Text style={styles.clearLink}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() =>
                  navigation.navigate("BuildingDetail", {
                    buildingId: item.building_id,
                    buildingName: item.building_name,
                  })
                }
              >
                <View
                  style={[styles.dot, { backgroundColor: occupancyColor(item.occupancy_percent) }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultRoomName}>{item.name}</Text>
<Text style={styles.resultBuildingName}>{item.building_name}</Text>

{item.recommendation_score !== undefined && (
  <Text
    style={{
      ...typography.caption,
      color: colors.sfuRed,
      fontWeight: "600",
      marginTop: 5,
    }}
  >
    Ranking score: {item.recommendation_score}/100
  </Text>
)}

<Text
  style={{
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 3,
  }}
>
  {item.occupancy_percent === null
    ? "No recent occupancy data"
    : `${Math.round(item.occupancy_percent)}% reported occupancy`}
</Text>

{item.data_confidence !== undefined && (
  <Text
    style={{
      ...typography.caption,
      color: colors.inkMuted,
      marginTop: 3,
    }}
  >
    Data quality: {item.data_confidence}/100
  </Text>
)}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No rooms matched that search.</Text>}
          />
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>All Buildings</Text>
          <FlatList
            data={buildings}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            renderItem={({ item }) => (

              

              
              <TouchableOpacity
                style={styles.buildingCard}
                onPress={() =>
                  navigation.navigate("BuildingDetail", {
                    buildingId: item.id,
                    buildingName: item.name,
                  })
                }
              >
                <View
                  style={[styles.dot, { backgroundColor: occupancyColor(item.avg_occupancy_percent) }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.buildingName}>{item.name}</Text>
                  <Text style={styles.buildingDescription}>{item.description}</Text>
                  <Text style={styles.buildingMeta}>
                    {item.room_count} study {item.room_count === 1 ? "space" : "spaces"} · Open until{" "}
                    {item.hours_close}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  title: { ...typography.heading, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkMuted, marginBottom: spacing.md },
  sectionTitle: { ...typography.subheading, color: colors.ink, marginBottom: spacing.sm, marginTop: spacing.sm },
  searchResultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clearLink: { color: colors.sfuRed, fontWeight: "600" },
  error: { color: colors.statusPacked, marginBottom: spacing.sm },
  emptyText: { color: colors.inkMuted, textAlign: "center", marginTop: spacing.lg },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.sm },
  buildingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  buildingName: { ...typography.subheading, color: colors.ink },
  buildingDescription: { ...typography.caption, color: colors.inkMuted, marginTop: 2, marginBottom: 4 },
  buildingMeta: { ...typography.caption, color: colors.inkMuted },
  chevron: { fontSize: 22, color: colors.inkMuted, marginLeft: spacing.sm },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resultRoomName: { ...typography.subheading, fontSize: 15, color: colors.ink },
  resultBuildingName: { ...typography.caption, color: colors.inkMuted },
});
