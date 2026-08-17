import jwt, { type SignOptions } from "jsonwebtoken";

type UserRole = "user" | "admin";

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
};

const isUserRole = (value: unknown): value is UserRole =>
  value === "user" || value === "admin";

const signAccessToken = (payload: AccessTokenPayload): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  });
};

const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    !isUserRole(decoded.role)
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    sub: decoded.sub,
    role: decoded.role,
  };
};

export {
  signAccessToken,
  verifyAccessToken,
};

export type {
  AccessTokenPayload,
  UserRole,
};
