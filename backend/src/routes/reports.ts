import { Router } from "express";
import { pool } from "../db";
import { OccupancyStatus } from "../types";

export const reportsRouter = Router();

const VALID_STATUSES: OccupancyStatus[] = ["empty", "some_space", "crowded", "packed"];

// POST /rooms/:roomId/reports - submit a crowdsourced occupancy report
reportsRouter.post("/:roomId/reports", async (req, res, next) => {
  try {
    const roomId = Number(req.params.roomId);
    const { status } = req.body as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as OccupancyStatus)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const roomExists = await pool.query(`SELECT id FROM rooms WHERE id = $1`, [roomId]);
    if (roomExists.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const result = await pool.query(
      `INSERT INTO occupancy_reports (room_id, status, reported_at)
       VALUES ($1, $2, NOW())
       RETURNING id, room_id, status, reported_at`,
      [roomId, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});
