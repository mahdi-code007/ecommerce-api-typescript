import { z } from "zod";

const addressIdSchema = z.uuid({
  error: "Invalid address id",
});

const optionalTrimmedString = (
  maxLength: number,
  maxMessage: string,
) =>
  z
    .string({
      error: "Must be a string",
    })
    .trim()
    .max(maxLength, {
      error: maxMessage,
    })
    .optional();

const requiredTrimmedString = (
  fieldName: string,
  minLength: number,
  maxLength: number,
) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? `${fieldName} is required`
          : `${fieldName} must be a string`,
    })
    .trim()
    .min(minLength, {
      error: `${fieldName} must be at least ${minLength} characters long`,
    })
    .max(maxLength, {
      error: `${fieldName} must be less than ${maxLength} characters long`,
    });

const phoneSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? "Phone is required"
        : "Phone must be a string",
  })
  .trim()
  .transform((value) => value.replace(/\s+/g, ""))
  .refine(
    (phone) => /^05\d{8}$/.test(phone) || /^\+9665\d{8}$/.test(phone),
    {
      error:
        "Phone must be a Saudi number such as 05XXXXXXXX or +9665XXXXXXXX",
    },
  );

const isDefaultSchema = z
  .boolean({
    error: "isDefault must be a boolean",
  })
  .optional();

const createAddressSchema = z.strictObject({
  label: optionalTrimmedString(
    50,
    "Label must be less than 50 characters long",
  ),
  fullName: requiredTrimmedString("Full name", 3, 50),
  phone: phoneSchema,
  city: requiredTrimmedString("City", 2, 100),
  district: requiredTrimmedString("District", 2, 100),
  street: requiredTrimmedString("Street", 3, 200),
  building: optionalTrimmedString(
    50,
    "Building must be less than 50 characters long",
  ),
  notes: optionalTrimmedString(
    500,
    "Notes must be less than 500 characters long",
  ),
  isDefault: isDefaultSchema,
});

const updateAddressSchema = z
  .strictObject({
    label: optionalTrimmedString(
      50,
      "Label must be less than 50 characters long",
    ),
    fullName: requiredTrimmedString("Full name", 3, 50).optional(),
    phone: phoneSchema.optional(),
    city: requiredTrimmedString("City", 2, 100).optional(),
    district: requiredTrimmedString("District", 2, 100).optional(),
    street: requiredTrimmedString("Street", 3, 200).optional(),
    building: optionalTrimmedString(
      50,
      "Building must be less than 50 characters long",
    ),
    notes: optionalTrimmedString(
      500,
      "Notes must be less than 500 characters long",
    ),
    isDefault: isDefaultSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "No fields to update",
  });

const addressParamsSchema = z.strictObject({
  addressId: addressIdSchema,
});

const createAddressRequestSchema = z.object({
  body: createAddressSchema,
});

const updateAddressRequestSchema = z.object({
  params: addressParamsSchema,
  body: updateAddressSchema,
});

const addressByIdRequestSchema = z.object({
  params: addressParamsSchema,
});

type CreateAddressRequest = z.infer<typeof createAddressRequestSchema>;

type UpdateAddressRequest = z.infer<typeof updateAddressRequestSchema>;

type AddressByIdRequest = z.infer<typeof addressByIdRequestSchema>;

export {
  createAddressRequestSchema,
  updateAddressRequestSchema,
  addressByIdRequestSchema,
};

export type {
  CreateAddressRequest,
  UpdateAddressRequest,
  AddressByIdRequest,
};
