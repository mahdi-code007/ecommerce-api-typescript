import type { Request, Response, NextFunction } from "express";
import * as orderRepository from "../db/repositories/orderRepository";
import * as userRepository from "../db/repositories/userRepository";
import type {
  DeleteMeRequest,
  LoginUserRequest,
  RegisterUserRequest,
  UpdateMeRequest,
  UpdateMyPasswordRequest,
} from "../schemas/authSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");
import { signAccessToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

const loadCurrentUser = async (req: Request) => {
  const userId = getAuthenticatedUserId(req);
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  return user;
};

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

// @desc Update the current user's name and/or email
// @route PATCH /api/v1/auth/me
// @access private
export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const user = await loadCurrentUser(req);
  const { body } = getValidated<UpdateMeRequest>(req);

  if (body.email) {
    const email = body.email.toLowerCase();
    const existingUser = await userRepository.findUserByEmail(email);

    if (existingUser && existingUser.id !== user.id) {
      next(new AppError("email already exists", 409));
      return;
    }
  }

  const updatedUser = await userRepository.updateUserById(user.id, {
    name: body.name,
    email: body.email?.toLowerCase(),
  });

  if (!updatedUser) {
    next(new AppError("User no longer exists", 401));
    return;
  }

  res.status(200).json({
    status: "success",
    data: {
      user: userRepository.toPublicUser(updatedUser),
    },
    message: "Profile updated successfully",
  });
};

// @desc Update the current user's password
// @route PATCH /api/v1/auth/me/password
// @access private
export const updateMyPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const user = await loadCurrentUser(req);
  const { body } = getValidated<UpdateMyPasswordRequest>(req);

  const isCurrentPasswordValid = await comparePassword(
    body.currentPassword,
    user.passwordHash,
  );

  if (!isCurrentPasswordValid) {
    next(new AppError("Current password is incorrect", 401));
    return;
  }

  const isSamePassword = await comparePassword(
    body.newPassword,
    user.passwordHash,
  );

  if (isSamePassword) {
    next(
      new AppError(
        "New password must be different from the current password",
        400,
      ),
    );
    return;
  }

  const passwordHash = await hashPassword(body.newPassword);
  const updatedUser = await userRepository.updateUserById(user.id, {
    passwordHash,
  });

  if (!updatedUser) {
    next(new AppError("User no longer exists", 401));
    return;
  }

  res.status(200).json({
    status: "success",
    data: {
      user: userRepository.toPublicUser(updatedUser),
    },
    message: "Password updated successfully",
  });
};

// @desc Delete the current user's account
// @route DELETE /api/v1/auth/me
// @access private
export const deleteMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const user = await loadCurrentUser(req);
  const { body } = getValidated<DeleteMeRequest>(req);

  const isPasswordValid = await comparePassword(
    body.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    next(new AppError("Current password is incorrect", 401));
    return;
  }

  const orderCount = await orderRepository.countOrdersByUserId(user.id);

  if (orderCount > 0) {
    next(
      new AppError(
        "Cannot delete an account that has orders",
        409,
      ),
    );
    return;
  }

  await userRepository.deleteUserById(user.id);

  res.status(200).json({
    status: "success",
    message: "Account deleted successfully",
  });
};
