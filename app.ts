import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import path from "node:path";
import morgan from "morgan";
import categoryRoutes = require("./routes/categoryRoutes");
import brandRoutes = require("./routes/brandRoutes");
import productRoutes = require("./routes/productRoutes");
import authRoutes = require("./routes/authRoutes");
import cartRoutes = require("./routes/cartRoutes");
import addressRoutes = require("./routes/addressRoutes");
import orderRoutes = require("./routes/orderRoutes");
import adminOrderRoutes = require("./routes/adminOrderRoutes");
import couponRoutes = require("./routes/couponRoutes");
import adminCouponRoutes = require("./routes/adminCouponRoutes");
import wishlistRoutes = require("./routes/wishlistRoutes");
import favoriteRoutes = require("./routes/favoriteRoutes");
import AppError = require("./utils/AppError");

interface ApiError extends Error {
  statusCode?: number;
  status?: "fail" | "error";
  isOperational?: boolean;
  cause?: unknown;
}

type PostgresDriverError = {
  code?: string;
  detail?: string;
  constraint?: string;
};

const getPostgresDriverError = (
  error: Error,
): PostgresDriverError | null => {
  const cause = (error as ApiError).cause;

  if (!cause || typeof cause !== "object") {
    return null;
  }

  return cause as PostgresDriverError;
};

const getDuplicatedFieldFromPostgresDetail = (
  detail?: string,
): string | undefined => {
  if (!detail) {
    return undefined;
  }

  const match = detail.match(/Key \((.+?)\)=/);
  return match?.[1];
};

const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3001";

app.use(
  cors({
    origin: corsOrigin,
  }),
);

app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin/orders", adminOrderRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/admin/coupons", adminCouponRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/favorites", favoriteRoutes);

const uploadsDirectory = path.resolve(
  process.cwd(),
  process.env.UPLOADS_DIR ?? "uploads",
);

app.use("/uploads", express.static(uploadsDirectory));

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

  const postgresError = getPostgresDriverError(err);

  let statusCode = err.statusCode ?? 500;
  let status: "fail" | "error" = err.status ?? "error";
  let message = err.message;

  // PostgreSQL unique violation
  if (postgresError?.code === "23505") {
    statusCode = 409;
    status = "fail";

    const duplicatedField =
      getDuplicatedFieldFromPostgresDetail(postgresError.detail);

    const fieldName = duplicatedField?.includes("email")
      ? "email"
      : duplicatedField;

    message = fieldName
      ? `${fieldName} already exists`
      : "Resource already exists";
  }

  // PostgreSQL foreign key violation
  if (postgresError?.code === "23503") {
    status = "fail";

    if (postgresError.detail?.includes("is still referenced")) {
      statusCode = 409;
      message = "Cannot delete a category that has associated products";
    } else {
      statusCode = 404;
      message = "Category not found";
    }
  }

  if (
    process.env.NODE_ENV === "production" &&
    !err.isOperational &&
    postgresError?.code !== "23505" &&
    postgresError?.code !== "23503"
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
