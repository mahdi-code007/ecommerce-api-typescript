import { z } from "zod";

const registerUserSchema = z.strictObject({
  name: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Name is required"
          : "Name must be a string",
    })
    .trim()
    .min(3, {
      error: "Name must be at least 3 characters long",
    })
    .max(50, {
      error: "Name must be less than 50 characters long",
    }),

  email: z.email({
    error: "Invalid email",
  }),

  password: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Password is required"
          : "Password must be a string",
    })
    .min(8, {
      error: "Password must be at least 8 characters long",
    })
    .max(72, {
      error: "Password must be less than 72 characters long",
    }),
});

const loginUserSchema = z.strictObject({
  email: z.email({
    error: "Invalid email",
  }),

  password: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Password is required"
          : "Password must be a string",
    })
    .min(8, {
      error: "Password must be at least 8 characters long",
    })
    .max(72, {
      error: "Password must be less than 72 characters long",
    }),
});

const registerUserRequestSchema = z.object({
  body: registerUserSchema,
});

const loginUserRequestSchema = z.object({
  body: loginUserSchema,
});

type RegisterUserRequest = z.infer<typeof registerUserRequestSchema>;

type LoginUserRequest = z.infer<typeof loginUserRequestSchema>;

export {
  registerUserRequestSchema,
  loginUserRequestSchema,
};

export type {
  RegisterUserRequest,
  LoginUserRequest,
};
