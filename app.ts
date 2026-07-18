import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import morgan from "morgan";
import categoryRoutes = require("./routes/categoryRoutes");
import AppError = require("./utils/AppError");

interface ApiError extends Error {
  statusCode?: number;
  status?: "fail" | "error";
  isOperational?: boolean;
  code?: number;
  keyValue?: Record<string, unknown>;
}

const app = express();

app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api/v1/categories", categoryRoutes);

const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      404,
    ),
  );
};

app.all("/{*splat}", notFoundHandler);

const globalErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  const err: ApiError =
    error instanceof Error
      ? (error as ApiError)
      : new Error("Unknown error");

  let statusCode = err.statusCode ?? 500;
  let status: "fail" | "error" = err.status ?? "error";
  let message = err.message;

  if (err.code === 11000) {
    statusCode = 409;
    status = "fail";

    const duplicatedField = Object.keys(
      err.keyValue ?? {},
    )[0];

    message = duplicatedField
      ? `${duplicatedField} already exists`
      : "Resource already exists";
  }

  if (
    process.env.NODE_ENV === "production" &&
    !err.isOperational &&
    err.code !== 11000
  ) {
    message = "Something went wrong";
  }

  res.status(statusCode).json({
    status,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

app.use(globalErrorHandler);

export = app;
