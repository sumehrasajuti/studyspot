import { Router } from "express";
import { pool } from "../db";
import { getRoomsWithOccupancy } from "../occupancy";
import { askClaude, extractJson } from "../llm/anthropic";
import { Building, RoomWithOccupancy, SearchFilters } from "../types";
import { recommendRooms } from "../recommendations";

export const searchRouter = Router();

const SYSTEM_PROMPT = `You convert a student's natural-language study-space request into a JSON filter object.

Respond with ONLY a JSON object, no other text, matching this exact shape:
{
  "requireWifi": boolean or null,
  "requireOutlets": boolean or null,
  "requireQuiet": boolean or null,
  "requireWhiteboard": boolean or null,
  "maxOccupancyPercent": number or null
}

Rules:
- Set a field to true only if the student's request clearly implies it (e.g. "needs outlets" -> requireOutlets: true).
- Use null for anything not mentioned or unclear.
- "quiet", "not crowded", "empty", "not busy" imply a low maxOccupancyPercent (e.g. 40).
- "doesn't matter if it's busy" or no mention of crowd level -> maxOccupancyPercent: null.
- Never include any text outside the JSON object.`;

// GET /search?q=natural language query
searchRouter.get("/", async (req, res, next) => {
  try {
    const query = String(req.query.q ?? "").trim();
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    let filters: SearchFilters = {};
    try {
      const rawResponse = await askClaude(SYSTEM_PROMPT, query);
      const parsed = JSON.parse(extractJson(rawResponse));
      filters = {
        requireWifi: parsed.requireWifi ?? undefined,
        requireOutlets: parsed.requireOutlets ?? undefined,
        requireQuiet: parsed.requireQuiet ?? undefined,
        requireWhiteboard: parsed.requireWhiteboard ?? undefined,
        maxOccupancyPercent: parsed.maxOccupancyPercent ?? undefined,
      };
    } catch (llmError) {
      // If the LLM call fails (bad key, rate limit, etc), fall back to
      // returning everything rather than breaking search entirely.
      console.error("LLM filter parsing failed, falling back to unfiltered search:", llmError);
    }

    const buildingsResult = await pool.query<Building>(`SELECT * FROM buildings`);

    const allRooms: (RoomWithOccupancy & { building_name: string; building_id: number })[] = [];
    for (const building of buildingsResult.rows) {
      const rooms = await getRoomsWithOccupancy(building.id);
      for (const room of rooms) {
        allRooms.push({ ...room, building_name: building.name, building_id: building.id });
      }
    }

    const filtered = allRooms.filter((room) => {
      if (filters.requireWifi && !room.has_wifi) return false;
      if (filters.requireOutlets && !room.has_outlets) return false;
      if (filters.requireQuiet && !room.is_quiet) return false;
      if (filters.requireWhiteboard && !room.has_whiteboard) return false;
      if (
        filters.maxOccupancyPercent !== undefined &&
        room.occupancy_percent !== null &&
        room.occupancy_percent > filters.maxOccupancyPercent
      ) {
        return false;
      }
      return true;
    });

    res.json({ appliedFilters: filters, results: filtered });
  } catch (err) {
    next(err);
  }
});

// GET /search/recommendations
// Example: /search/recommendations?requireQuiet=true&requireOutlets=true
searchRouter.get("/recommendations", async (req, res, next) => {
  // Convert query-string values into booleans.
  function parseBoolean(value: unknown): boolean | undefined {
    if (value === undefined) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error("Boolean filters must be 'true' or 'false'.");
  }

  let filters: SearchFilters;

  try {
    const rawMax = req.query.maxOccupancyPercent;
    let maxOccupancyPercent: number | undefined;

    if (rawMax !== undefined) {
      if (typeof rawMax !== "string" || rawMax.trim() === "") {
        throw new Error("maxOccupancyPercent must be a number.");
      }

      maxOccupancyPercent = Number(rawMax);

      if (
        !Number.isFinite(maxOccupancyPercent) ||
        maxOccupancyPercent < 0 ||
        maxOccupancyPercent > 100
      ) {
        throw new Error("maxOccupancyPercent must be between 0 and 100.");
      }
    }

    filters = {
      requireWifi: parseBoolean(req.query.requireWifi),
      requireOutlets: parseBoolean(req.query.requireOutlets),
      requireQuiet: parseBoolean(req.query.requireQuiet),
      requireWhiteboard: parseBoolean(req.query.requireWhiteboard),
      maxOccupancyPercent,
    };
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid filters",
    });
  }

  try {
    // Fetch the same real building and occupancy data used by search.
    const buildingsResult = await pool.query<Building>(
      "SELECT * FROM buildings"
    );

    const allRooms: (RoomWithOccupancy & {
      building_name: string;
      building_id: number;
    })[] = [];

    for (const building of buildingsResult.rows) {
      const rooms = await getRoomsWithOccupancy(building.id);

      for (const room of rooms) {
        allRooms.push({
          ...room,
          building_name: building.name,
          building_id: building.id,
        });
      }
    }

    // Rank the rooms without calling Claude.
    const results = recommendRooms(allRooms, filters);

    res.json({
      appliedFilters: filters,
      total: results.length,
      results,
    });
  } catch (err) {
    next(err);
  }
});
