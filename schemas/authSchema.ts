import { z } from "zod";

const nameSchema = z
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
  });

const emailSchema = z.email({
  error: "Invalid email",
});

const passwordSchema = z
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
  });

const registerUserSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const loginUserSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

const updateMeSchema = z
  .strictObject({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "No fields to update",
  });

const updateMyPasswordSchema = z.strictObject({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

const deleteMeSchema = z.strictObject({
  password: passwordSchema,
});

const registerUserRequestSchema = z.object({
  body: registerUserSchema,
});

const loginUserRequestSchema = z.object({
  body: loginUserSchema,
});

const updateMeRequestSchema = z.object({
  body: updateMeSchema,
});

const updateMyPasswordRequestSchema = z.object({
  body: updateMyPasswordSchema,
});

const deleteMeRequestSchema = z.object({
  body: deleteMeSchema,
});

type RegisterUserRequest = z.infer<typeof registerUserRequestSchema>;

type LoginUserRequest = z.infer<typeof loginUserRequestSchema>;

type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;

type UpdateMyPasswordRequest = z.infer<typeof updateMyPasswordRequestSchema>;

type DeleteMeRequest = z.infer<typeof deleteMeRequestSchema>;

export {
  registerUserRequestSchema,
  loginUserRequestSchema,
  updateMeRequestSchema,
  updateMyPasswordRequestSchema,
  deleteMeRequestSchema,
};

export type {
  RegisterUserRequest,
  LoginUserRequest,
  UpdateMeRequest,
  UpdateMyPasswordRequest,
  DeleteMeRequest,
};
