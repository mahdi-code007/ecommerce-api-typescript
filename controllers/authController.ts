import type { Request, Response, NextFunction } from "express";
import * as userRepository from "../db/repositories/userRepository";
import type {
  LoginUserRequest,
  RegisterUserRequest,
} from "../schemas/authSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");
import { signAccessToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";

// @desc Register a new user
// @route POST /api/v1/auth/register
// @access public
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { body } = getValidated<RegisterUserRequest>(req);
  const email = body.email.toLowerCase();

  const existingUser = await userRepository.findUserByEmail(email);

  if (existingUser) {
    next(new AppError("email already exists", 409));
    return;
  }

  const passwordHash = await hashPassword(body.password);
  const user = await userRepository.createUser({
    name: body.name,
    email,
    passwordHash,
  });

  res.status(201).json({
    status: "success",
    data: {
      user: userRepository.toPublicUser(user),
    },
    message: "User registered successfully",
  });
};

const invalidLoginError = (): AppError =>
  new AppError("Invalid email or password", 401);

// @desc Login an existing user
// @route POST /api/v1/auth/login
// @access public
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { body } = getValidated<LoginUserRequest>(req);
  const email = body.email.toLowerCase();
  const user = await userRepository.findUserByEmail(email);

  if (!user) {
    next(invalidLoginError());
    return;
  }

  const isPasswordValid = await comparePassword(
    body.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    next(invalidLoginError());
    return;
  }

  const token = signAccessToken({
    sub: user.id,
    role: user.role,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: userRepository.toPublicUser(user),
      token,
    },
    message: "Logged in successfully",
  });
};

// @desc Get the current logged-in user
// @route GET /api/v1/auth/me
// @access private
export const getMe = (
  req: Request,
  res: Response,
): void => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
};
