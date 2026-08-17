import type { RequestHandler } from "express";
import * as userRepository from "../db/repositories/userRepository";
import AppError = require("../utils/AppError");
import { verifyAccessToken, type UserRole } from "../utils/jwt";

const protect: RequestHandler = async (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError("You are not logged in", 401));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    next(new AppError("You are not logged in", 401));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await userRepository.findUserById(payload.sub);

    if (!user) {
      next(new AppError("User no longer exists", 401));
      return;
    }

    req.user = userRepository.toPublicUser(user);
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
};

const restrictTo = (...roles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(
        new AppError(
          "You do not have permission to perform this action",
          403,
        ),
      );
      return;
    }

    next();
  };
};

export {
  protect,
  restrictTo,
};
