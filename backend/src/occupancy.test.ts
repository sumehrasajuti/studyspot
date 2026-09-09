import { describe, expect, it } from "vitest";
import { STATUS_OCCUPANCY } from "./types";
import {
  calculateOccupancy,
  weightForAgeMinutes,
} from "./occupancy";

describe("weightForAgeMinutes", () => {
  it("gives a fresh report full weight", () => {
    expect(weightForAgeMinutes(0)).toBe(1);
  });

  it("reduces weight as a report gets older", () => {
    expect(weightForAgeMinutes(30)).toBeLessThan(1);
  });

  it("returns zero for reports 180 minutes old", () => {
    expect(weightForAgeMinutes(180)).toBe(0);
  });
});

describe("calculateOccupancy", () => {
  const now = new Date("2026-09-08T12:00:00Z").getTime();

  it("returns null when there are no reports", () => {
    const result = calculateOccupancy([], now);

    expect(result.occupancy_percent).toBeNull();
    expect(result.last_reported_at).toBeNull();
    expect(result.report_count_last_hour).toBe(0);
  });

  it("uses a single fresh report", () => {
    const reports = [
      {
        room_id: 1,
        status: "empty" as const,
        reported_at: "2026-09-08T11:55:00Z",
      },
    ];

    const result = calculateOccupancy(reports, now);

    expect(result.occupancy_percent).toBe(STATUS_OCCUPANCY.empty);
    expect(result.report_count_last_hour).toBe(1);
  });

  it("weights newer reports more heavily than older reports", () => {
    const reports = [
      {
        room_id: 1,
        status: "empty" as const,
        reported_at: "2026-09-08T11:55:00Z",
      },
      {
        room_id: 1,
        status: "packed" as const,
        reported_at: "2026-09-08T10:00:00Z",
      },
    ];

    const result = calculateOccupancy(reports, now);

    expect(result.occupancy_percent).not.toBeNull();
    expect(result.occupancy_percent!).toBeLessThan(50);
  });

  it("ignores reports older than 180 minutes", () => {
    const reports = [
      {
        room_id: 1,
        status: "packed" as const,
        reported_at: "2026-09-08T08:00:00Z",
      },
    ];

    const result = calculateOccupancy(reports, now);

    expect(result.occupancy_percent).toBeNull();
    });
    it("counts reports exactly 60 minutes old in the last hour", () => {
  const reports = [
    {
      room_id: 1,
      status: "empty" as const,
      reported_at: new Date(now - 60 * 60_000).toISOString(),
    },
    {
      room_id: 1,
      status: "empty" as const,
      reported_at: new Date(now - 60 * 60_000 - 1).toISOString(),
    },
  ];

  const result = calculateOccupancy(reports, now);

  // Exactly 60 minutes counts; 60 minutes + 1 ms does not.
  expect(result.report_count_last_hour).toBe(1);
});

it("ignores a report exactly 180 minutes old", () => {
  const reports = [
    {
      room_id: 1,
      status: "packed" as const,
      reported_at: new Date(now - 180 * 60_000).toISOString(),
    },
  ];

  const result = calculateOccupancy(reports, now);

  expect(result.occupancy_percent).toBeNull();
  expect(result.last_reported_at).toBeNull();
  expect(result.report_count_last_hour).toBe(0);
});

it("gives a report near expiry the minimum valid weight", () => {
  const reports = [
    {
      room_id: 1,
      status: "packed" as const,
      reported_at: new Date(now - 179 * 60_000).toISOString(),
    },
  ];

  const result = calculateOccupancy(reports, now);

  // A valid report still contributes, even when it is almost expired.
  expect(result.occupancy_percent).toBe(STATUS_OCCUPANCY.packed);
  expect(result.report_count_last_hour).toBe(0);
    });
  });