import { Router } from "express";
import { getOverview } from "../controllers/adminStatsController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import { getOverviewRequestSchema } from "../schemas/adminStatsSchema";

const router = Router();

router.use(protect, restrictTo("admin"));

router.get(
  "/overview",
  validate(getOverviewRequestSchema),
  getOverview,
);

export = router;
