import { z } from "zod";

const nameSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined ? "Name is required" : "Name must be a string",
  })
  .trim()
  .min(3, {
    error: "Name must be at least 3 characters long",
  })
  .max(50, {
    error: "Name must be less than 50 characters long",
  });

const brandIdSchema = z.uuid({
  error: "Invalid brand id",
});

const brandParamsSchema = z.strictObject({
  id: brandIdSchema,
});

const createBrandSchema = z.strictObject({
  name: nameSchema,
  logo: z
    .string({
      error: "Logo must be a string",
    })
    .trim()
    .optional(),
});

const createBrandRequestSchema = z.object({
  body: createBrandSchema,
});

const updateBrandSchema = createBrandSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "No fields to update",
  });

const updateBrandRequestSchema = z.object({
  params: brandParamsSchema,
  body: updateBrandSchema,
});

const brandByIdRequestSchema = z.object({
  params: brandParamsSchema,
});

const getBrandsRequestSchema = z.object({
  query: z.strictObject({
    page: z.coerce
      .number({
        error: "Page must be a number",
      })
      .int({
        error: "Page must be an integer",
      })
      .min(1, {
        error: "Page must be at least 1",
      })
      .default(1),

    limit: z.coerce
      .number({
        error: "Limit must be a number",
      })
      .int({
        error: "Limit must be an integer",
      })
      .min(1, {
        error: "Limit must be at least 1",
      })
      .max(100, {
        error: "Limit must not exceed 100",
      })
      .default(10),
  }),
});

type CreateBrandRequest = z.infer<typeof createBrandRequestSchema>;
type UpdateBrandRequest = z.infer<typeof updateBrandRequestSchema>;
type BrandByIdRequest = z.infer<typeof brandByIdRequestSchema>;
type GetBrandsRequest = z.infer<typeof getBrandsRequestSchema>;

export {
  brandByIdRequestSchema,
  createBrandRequestSchema,
  getBrandsRequestSchema,
  updateBrandRequestSchema,
};

export type {
  BrandByIdRequest,
  CreateBrandRequest,
  GetBrandsRequest,
  UpdateBrandRequest,
};
