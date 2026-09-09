import { RoomWithOccupancy, SearchFilters } from "./types";

// A room returned by search also includes its building name.
export type RecommendationRoom = RoomWithOccupancy & {
  building_name: string;
};

export type RankedRoom = RecommendationRoom & {
  recommendation_score: number;
  data_confidence: number;
};

// Keep the same expiry window as the occupancy algorithm.
const MAX_REPORT_AGE_MINUTES = 180;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rank rooms using required amenities, reported occupancy, and report evidence.
 *
 * This is a deterministic heuristic, not an AI model.
 * Unknown occupancy is kept in the results but ranked below known occupancy.
 */
export function recommendRooms(
  rooms: RecommendationRoom[],
  filters: SearchFilters = {},
  now: number = Date.now()
): RankedRoom[] {
  const filtered = rooms.filter((room) => {
    // Required amenities are hard filters.
    if (filters.requireWifi && !room.has_wifi) return false;
    if (filters.requireOutlets && !room.has_outlets) return false;
    if (filters.requireQuiet && !room.is_quiet) return false;
    if (filters.requireWhiteboard && !room.has_whiteboard) return false;

    // Unknown occupancy is not assumed to be empty or crowded.
    if (
      filters.maxOccupancyPercent !== undefined &&
      room.occupancy_percent !== null &&
      room.occupancy_percent > filters.maxOccupancyPercent
    ) {
      return false;
    }

    return true;
  });

  const ranked = filtered.map((room): RankedRoom => {
    // No recent occupancy data means we cannot estimate availability.
    if (room.occupancy_percent === null) {
      return {
        ...room,
        recommendation_score: 0,
        data_confidence: 0,
      };
    }

    // Lower occupancy means more reported availability.
    const availability = 100 - clamp(room.occupancy_percent, 0, 100);

    // Newer reports provide stronger evidence.
    const reportedAt = room.last_reported_at
      ? new Date(room.last_reported_at).getTime()
      : NaN;

    const ageMinutes = Number.isFinite(reportedAt)
      ? Math.max(0, (now - reportedAt) / 60_000)
      : MAX_REPORT_AGE_MINUTES;

    const recency = clamp(
      1 - ageMinutes / MAX_REPORT_AGE_MINUTES,
      0,
      1
    );

    // More reports provide additional evidence, capped at three.
    const reportEvidence = clamp(
      room.report_count_last_hour / 3,
      0,
      1
    );

    // Evidence score: 70% recency, 30% report count.
    const evidence = 0.7 * recency + 0.3 * reportEvidence;

    // Final score: 80% availability, 20% evidence.
    const score = 0.8 * availability + 20 * evidence;

    return {
      ...room,
      recommendation_score: Math.round(score),
      data_confidence: Math.round(evidence * 100),
    };
  });

  // Known occupancy comes first, followed by higher scores.
  // Room ID provides deterministic ordering when scores are equal.
  return ranked.sort((a, b) => {
    const aUnknown = a.occupancy_percent === null;
    const bUnknown = b.occupancy_percent === null;

    if (aUnknown !== bUnknown) {
      return aUnknown ? 1 : -1;
    }

    return (
      b.recommendation_score - a.recommendation_score ||
      a.id - b.id
    );
  });
}