import { describe, expect, it } from "vitest";
import {
  recommendRooms,
  type RecommendationRoom,
} from "./recommendations";

describe("recommendRooms", () => {
  const now = new Date("2026-09-08T12:00:00Z").getTime();

  // Creates a complete sample room with sensible defaults.
  // Each test can override only the fields it needs.
  function makeRoom(
    overrides: Partial<RecommendationRoom> = {}
  ): RecommendationRoom {
    return {
      id: 1,
      building_id: 1,
      building_name: "Academic Quadrangle",
      name: "Study Room",
      floor: 1,
      capacity: 20,
      has_wifi: true,
      has_outlets: true,
      is_quiet: true,
      has_whiteboard: false,
      occupancy_percent: 30,
      last_reported_at: new Date(now).toISOString(),
      report_count_last_hour: 3,
      ...overrides,
    };
  }

  it("filters out rooms missing required amenities", () => {
    const rooms = [
      makeRoom({ id: 1, has_outlets: true, is_quiet: true }),
      makeRoom({ id: 2, has_outlets: false, is_quiet: true }),
      makeRoom({ id: 3, has_outlets: true, is_quiet: false }),
    ];

    const results = recommendRooms(
      rooms,
      { requireOutlets: true, requireQuiet: true },
      now
    );

    expect(results.map((room) => room.id)).toEqual([1]);
  });

  it("ranks lower occupancy above higher occupancy", () => {
    const rooms = [
      makeRoom({ id: 1, occupancy_percent: 80 }),
      makeRoom({ id: 2, occupancy_percent: 20 }),
    ];

    const results = recommendRooms(rooms, {}, now);

    expect(results.map((room) => room.id)).toEqual([2, 1]);
    expect(results[0].recommendation_score).toBeGreaterThan(
      results[1].recommendation_score
    );
  });

  it("prefers fresher evidence when occupancy is equal", () => {
    const rooms = [
      makeRoom({
        id: 1,
        occupancy_percent: 30,
        last_reported_at: new Date(now - 120 * 60_000).toISOString(),
      }),
      makeRoom({
        id: 2,
        occupancy_percent: 30,
        last_reported_at: new Date(now - 5 * 60_000).toISOString(),
      }),
    ];

    const results = recommendRooms(rooms, {}, now);

    expect(results[0].id).toBe(2);
    expect(results[0].data_confidence).toBeGreaterThan(
      results[1].data_confidence
    );
  });

  it("applies a maximum occupancy filter", () => {
    const rooms = [
      makeRoom({ id: 1, occupancy_percent: 20 }),
      makeRoom({ id: 2, occupancy_percent: 70 }),
    ];

    const results = recommendRooms(
      rooms,
      { maxOccupancyPercent: 40 },
      now
    );

    expect(results.map((room) => room.id)).toEqual([1]);
  });

  it("keeps unknown occupancy but ranks it below known occupancy", () => {
    const rooms = [
      makeRoom({
        id: 1,
        occupancy_percent: null,
        last_reported_at: null,
        report_count_last_hour: 0,
      }),
      makeRoom({ id: 2, occupancy_percent: 60 }),
    ];

    const results = recommendRooms(rooms, {}, now);

    expect(results.map((room) => room.id)).toEqual([2, 1]);
    expect(results[1].data_confidence).toBe(0);
  });

  it("uses room ID to break equal-score ties", () => {
    const rooms = [
      makeRoom({ id: 3 }),
      makeRoom({ id: 1 }),
      makeRoom({ id: 2 }),
    ];

    const results = recommendRooms(rooms, {}, now);

    expect(results.map((room) => room.id)).toEqual([1, 2, 3]);
  });

  it("does not modify the original room array", () => {
    const rooms = [
      makeRoom({ id: 1, occupancy_percent: 80 }),
      makeRoom({ id: 2, occupancy_percent: 20 }),
    ];

    recommendRooms(rooms, {}, now);

    expect(rooms.map((room) => room.id)).toEqual([1, 2]);
  });
});