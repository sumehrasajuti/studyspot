export type OccupancyStatus = "empty" | "some_space" | "crowded" | "packed";

// Rough percentage midpoint used to convert a reported status into a number
// so we can average multiple reports and decay them over time.
export const STATUS_OCCUPANCY: Record<OccupancyStatus, number> = {
  empty: 10,
  some_space: 35,
  crowded: 70,
  packed: 95,
};

export interface Building {
  id: number;
  name: string;
  slug: string;
  description: string;
  hours_close: string;
  latitude: number;
  longitude: number;
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
}

export interface OccupancyReport {
  id: number;
  room_id: number;
  status: OccupancyStatus;
  reported_at: string;
}

export interface RoomWithOccupancy extends Room {
  occupancy_percent: number | null; // null = no recent data
  last_reported_at: string | null;
  report_count_last_hour: number;
}

export interface SearchFilters {
  requireWifi?: boolean;
  requireOutlets?: boolean;
  requireQuiet?: boolean;
  requireWhiteboard?: boolean;
  maxOccupancyPercent?: number;
}
