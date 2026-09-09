export type OccupancyStatus = "empty" | "some_space" | "crowded" | "packed";

export interface BuildingSummary {
  id: number;
  name: string;
  slug: string;
  description: string;
  hours_close: string;
  latitude: number;
  longitude: number;
  room_count: number;
  avg_occupancy_percent: number | null;
}

export interface Room {
  id: number;
  building_id: number;
  name: string;
  floor: number;
  capacity: number;
  has_wifi: boolean;
  has_outlets: boolean;
  is_quiet: boolean;
  has_whiteboard: boolean;
  occupancy_percent: number | null;
  last_reported_at: string | null;
  report_count_last_hour: number;
}

export interface BuildingDetail extends BuildingSummary {
  rooms: Room[];
}

export type RootStackParamList = {
  Home: undefined;
  BuildingDetail: { buildingId: number; buildingName: string };
};
