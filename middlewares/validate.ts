import type { RequestHandler } from "express";
import { z } from "zod";
import AppError = require("../utils/AppError");

const validate = <TOutput, TInput>(
  schema: z.ZodType<TOutput, TInput>,
): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const message =
        firstIssue?.message ?? "Invalid request data";

      return next(new AppError(message, 400));
    }

    req.validated = result.data;

    return next();
  };
};

export = validate;
