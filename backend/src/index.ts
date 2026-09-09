import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { buildingsRouter } from "./routes/buildings";
import { reportsRouter } from "./routes/reports";
import { searchRouter } from "./routes/search";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/buildings", buildingsRouter);
app.use("/rooms", reportsRouter);
app.use("/search", searchRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`StudySpot backend running on http://localhost:${PORT}`);
});
