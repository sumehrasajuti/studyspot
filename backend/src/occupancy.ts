import { pool } from "./db";
import { STATUS_OCCUPANCY, OccupancyStatus, RoomWithOccupancy } from "./types";

// Reports older than this are ignored entirely - stale data is worse than no data.
const MAX_REPORT_AGE_MINUTES = 180;

// Within the valid window, more recent reports count more.
// A report from just now has full weight; a report near the max age has ~10% weight.
export function weightForAgeMinutes(ageMinutes: number): number {
  if (ageMinutes >= MAX_REPORT_AGE_MINUTES) return 0;
  const decayFraction = ageMinutes / MAX_REPORT_AGE_MINUTES;
  return Math.max(0.1, 1 - decayFraction);
}

interface RawReport {
  room_id: number;
  status: OccupancyStatus;
  reported_at: string;
}

export function calculateOccupancy(
  reports: RawReport[],
  now: number = Date.now()
) {
  if (reports.length === 0) {
    return {
      occupancy_percent: null,
      last_reported_at: null,
      report_count_last_hour: 0,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let reportsLastHour = 0;

  const validReports = reports.filter((report) => {
    const ageMinutes =
      (now - new Date(report.reported_at).getTime()) / 60000;

    return ageMinutes < MAX_REPORT_AGE_MINUTES;
  });

  if (validReports.length === 0) {
    return {
      occupancy_percent: null,
      last_reported_at: null,
      report_count_last_hour: 0,
    };
  }

  for (const report of validReports) {
    const ageMinutes =
      (now - new Date(report.reported_at).getTime()) / 60000;

    const weight = weightForAgeMinutes(ageMinutes);

    weightedSum += STATUS_OCCUPANCY[report.status] * weight;
    totalWeight += weight;

    if (ageMinutes <= 60) {
      reportsLastHour += 1;
    }
  }

  return {
    occupancy_percent:
      totalWeight > 0
        ? Math.round(weightedSum / totalWeight)
        : null,

    last_reported_at: validReports[0].reported_at,
    report_count_last_hour: reportsLastHour,
  };
}

/**
 * Fetches all rooms for a building and computes a weighted, decayed occupancy
 * percentage for each from recent crowdsourced reports. Rooms with no recent
 * reports get occupancy_percent: null (shown in the UI as "no data").
 */
export async function getRoomsWithOccupancy(
  buildingId: number
): Promise<RoomWithOccupancy[]> {
  const roomsResult = await pool.query(
    `SELECT * FROM rooms WHERE building_id = $1 ORDER BY floor, name`,
    [buildingId]
  );

  const reportsResult = await pool.query<RawReport>(
    `SELECT room_id, status, reported_at
     FROM occupancy_reports
     WHERE room_id = ANY($1::int[])
       AND reported_at > NOW() - INTERVAL '${MAX_REPORT_AGE_MINUTES} minutes'
     ORDER BY reported_at DESC`,
    [roomsResult.rows.map((r) => r.id)]
  );

  const reportsByRoom = new Map<number, RawReport[]>();
  for (const report of reportsResult.rows) {
    const list = reportsByRoom.get(report.room_id) ?? [];
    list.push(report);
    reportsByRoom.set(report.room_id, list);
  }

  const now = Date.now();

return roomsResult.rows.map((room) => {
  const reports = reportsByRoom.get(room.id) ?? [];

  const occupancy = calculateOccupancy(reports, now);

  return {
    ...room,
    ...occupancy,
  };
});
}