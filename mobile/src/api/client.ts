import { BuildingDetail, BuildingSummary, OccupancyStatus, Room } from "../types";

// While developing with Expo Go, your phone can't reach "localhost" - that
// means the phone itself. Replace this with your computer's local network IP
// (e.g. 192.168.1.42), which you can find by running `ipconfig` on Windows
// and looking for "IPv4 Address". Keep the port 3000 and the http:// prefix.
const API_BASE_URL = "http://192.168.1.81:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  return response.json();
}

export function fetchBuildings(): Promise<BuildingSummary[]> {
  return request<BuildingSummary[]>("/buildings");
}

export function fetchBuildingDetail(buildingId: number): Promise<BuildingDetail> {
  return request<BuildingDetail>(`/buildings/${buildingId}`);
}

export function submitReport(roomId: number, status: OccupancyStatus): Promise<void> {
  return request(`/rooms/${roomId}/reports`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function searchRooms(
  query: string
): Promise<{ appliedFilters: unknown; results: (Room & { building_name: string; building_id: number })[] }> {
  return request(`/search?q=${encodeURIComponent(query)}`);
}

// Preferences sent to the recommendation endpoint.
export interface RecommendationFilters {
  requireWifi?: boolean;
  requireOutlets?: boolean;
  requireQuiet?: boolean;
  requireWhiteboard?: boolean;
  maxOccupancyPercent?: number;
}

// A recommended room includes its building and ranking information.
export type RecommendedRoom = Room & {
  building_name: string;
  recommendation_score: number;
  data_confidence: number;
};

export function fetchRecommendations(
  filters: RecommendationFilters = {}
): Promise<{
  appliedFilters: RecommendationFilters;
  total: number;
  results: RecommendedRoom[];
}> {
  const params = new URLSearchParams();

  // Convert selected preferences into URL query parameters.
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  }

  const query = params.toString();

  return request(
    `/search/recommendations${query ? `?${query}` : ""}`
  );
}