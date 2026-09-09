import { Router } from "express";
import { pool } from "../db";
import { getRoomsWithOccupancy } from "../occupancy";
import { Building } from "../types";

export const buildingsRouter = Router();

// GET /buildings - list all buildings with a rolled-up occupancy summary
buildingsRouter.get("/", async (_req, res, next) => {
  try {
    const buildingsResult = await pool.query<Building>(
      `SELECT * FROM buildings ORDER BY name`
    );

    const buildingsWithSummary = await Promise.all(
      buildingsResult.rows.map(async (building) => {
        const rooms = await getRoomsWithOccupancy(building.id);
        const withData = rooms.filter((r) => r.occupancy_percent !== null);
        const avgOccupancy =
          withData.length > 0
            ? Math.round(
                withData.reduce((sum, r) => sum + (r.occupancy_percent ?? 0), 0) /
                  withData.length
              )
            : null;

        return {
          ...building,
          room_count: rooms.length,
          avg_occupancy_percent: avgOccupancy,
        };
      })
    );

    res.json(buildingsWithSummary);
  } catch (err) {
    next(err);
  }
});

// GET /buildings/:id - one building with its rooms and computed occupancy
buildingsRouter.get("/:id", async (req, res, next) => {
  try {
    const buildingId = Number(req.params.id);
    const buildingResult = await pool.query<Building>(
      `SELECT * FROM buildings WHERE id = $1`,
      [buildingId]
    );

    if (buildingResult.rows.length === 0) {
      return res.status(404).json({ error: "Building not found" });
    }

    const rooms = await getRoomsWithOccupancy(buildingId);

    res.json({ ...buildingResult.rows[0], rooms });
  } catch (err) {
    next(err);
  }
});
