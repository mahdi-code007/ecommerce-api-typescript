import type { Request, Response } from "express";
import * as adminStatsRepository from "../db/repositories/adminStatsRepository";
import type { GetOverviewRequest } from "../schemas/adminStatsSchema";
import getValidated = require("../utils/getValidated");

// @desc Admin dashboard overview aggregates
// @route GET /api/v1/admin/stats/overview
// @access private/admin
export const getOverview = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = getValidated<GetOverviewRequest>(req);
  const overview = await adminStatsRepository.getOverview(query);

  res.status(200).json({
    status: "success",
    data: overview,
  });
};
