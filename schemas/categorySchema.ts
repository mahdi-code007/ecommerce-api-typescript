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

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  error: "Invalid category id",
});

const categoryParamsSchema = z.strictObject({
  id: objectIdSchema,
});
const createCategorySchema = z.strictObject({
  name: nameSchema,

  description: z
    .string({
      error: "Description must be a string",
    })
    .trim()
    .max(500, {
      error: "Description must be less than 500 characters long",
    })
    .optional(),

  image: z
    .string({
      error: "Image must be a string",
    })
    .trim()
    .optional(),
});

const createCategoryRequestSchema = z.object({
  body: createCategorySchema,
});

const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "No fields to update",
  });

const updateCategoryRequestSchema = z.object({
  params: categoryParamsSchema,
  body: updateCategorySchema,
});

const getCategoryRequestSchema = z.object({
  params: categoryParamsSchema,
});

const categoryByIdRequestSchema = getCategoryRequestSchema;

const getCategoriesRequestSchema = z.object({
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

type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;

type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;

type CategoryByIdRequest = z.infer<typeof categoryByIdRequestSchema>;

type GetCategoriesRequest = z.infer<typeof getCategoriesRequestSchema>;

export {
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
  categoryByIdRequestSchema,
  getCategoriesRequestSchema,
};

export type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryByIdRequest,
  GetCategoriesRequest,
};
