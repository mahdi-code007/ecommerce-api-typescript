import { z } from "zod";

const categoryIdSchema = z.uuid({
  error: "Invalid category id",
});

const brandIdSchema = z.uuid({
  error: "Invalid brand id",
});

const optionalBooleanQuerySchema = (fieldName: string) =>
  z
    .enum(["true", "false"], {
      error: `${fieldName} must be true or false`,
    })
    .transform((value) => value === "true")
    .optional();

const listAdminProductsQuerySchema = z.strictObject({
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

  search: z
    .string({
      error: "Search must be a string",
    })
    .trim()
    .min(1, {
      error: "Search cannot be empty",
    })
    .max(100, {
      error: "Search must be less than 100 characters long",
    })
    .optional(),

  isActive: optionalBooleanQuerySchema("isActive"),
  inStock: optionalBooleanQuerySchema("inStock"),
  categoryId: categoryIdSchema.optional(),
  brandId: brandIdSchema.optional(),

  sort: z
    .enum(
      ["newest", "oldest", "stock_asc", "stock_desc", "name_asc"],
      {
        error: "Invalid sort option",
      },
    )
    .default("newest"),
});

const listAdminProductsRequestSchema = z.object({
  query: listAdminProductsQuerySchema,
});

type ListAdminProductsRequest = z.infer<typeof listAdminProductsRequestSchema>;

export { listAdminProductsRequestSchema };

export type { ListAdminProductsRequest };
