import type { Request } from "express";
import AppError = require("./AppError");

const getValidated = <T>(req: Request): T => {
  if (req.validated === undefined) {
    throw new AppError("Validated request data is missing", 500);
  }

  return req.validated as T;
};

export = getValidated;
