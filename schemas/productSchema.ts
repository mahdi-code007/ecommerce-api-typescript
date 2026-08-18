import { z } from "zod";

const categoryIdSchema = z.uuid({
  error: "Invalid category id",
});

const brandIdSchema = z.uuid({
  error: "Invalid brand id",
});

const optionalBrandIdSchema = z
  .union([brandIdSchema, z.null()])
  .optional();

const productIdSchema = z.uuid({
  error: "Invalid product id",
});

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
  .max(100, {
    error: "Name must be less than 100 characters long",
  });

const productFieldsSchema = z.strictObject({
  name: nameSchema,

  description: z
    .string({
      error: "Description must be a string",
    })
    .trim()
    .max(2000, {
      error: "Description must be less than 2000 characters long",
    })
    .optional(),

  priceInMinorUnits: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? "Price is required"
          : "Price must be a number",
    })
    .int({
      error: "Price must be an integer",
    })
    .min(1, {
      error: "Price must be greater than zero",
    }),

  stock: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? "Stock is required"
          : "Stock must be a number",
    })
    .int({
      error: "Stock must be an integer",
    })
    .min(0, {
      error: "Stock cannot be negative",
    }),

  categoryId: categoryIdSchema,

  brandId: optionalBrandIdSchema,

  image: z
    .string({
      error: "Image must be a string",
    })
    .trim()
    .optional(),

  isActive: z
    .boolean({
      error: "isActive must be a boolean",
    })
    .optional(),
});

const createProductRequestSchema = z.object({
  body: productFieldsSchema,
});

const updateProductSchema = productFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "No fields to update",
  });

const updateProductRequestSchema = z.object({
  params: z.strictObject({
    id: productIdSchema,
  }),
  body: updateProductSchema,
});

const productByIdRequestSchema = z.object({
  params: z.strictObject({
    id: productIdSchema,
  }),
});

const optionalPriceQuerySchema = (fieldName: string) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? Number.NaN
        : value,
    z.coerce
      .number({
        error: `${fieldName} must be a number`,
      })
      .int({
        error: `${fieldName} must be an integer`,
      })
      .min(0, {
        error: `${fieldName} cannot be negative`,
      }),
  );

const getProductsQuerySchema = z
  .strictObject({
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

    categoryId: categoryIdSchema.optional(),

    brandId: brandIdSchema.optional(),

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

    minPrice: optionalPriceQuerySchema("minPrice").optional(),
    maxPrice: optionalPriceQuerySchema("maxPrice").optional(),

    inStock: z
      .enum(["true", "false"], {
        error: "inStock must be true or false",
      })
      .transform((value) => value === "true")
      .optional(),

    sort: z
      .enum(
        [
          "newest",
          "price_asc",
          "price_desc",
          "rating_desc",
        ],
        {
          error: "Invalid sort option",
        },
      )
      .default("newest"),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined ||
      maxPrice === undefined ||
      minPrice <= maxPrice,
    {
      error: "minPrice must be less than or equal to maxPrice",
      path: ["maxPrice"],
    },
  );

const getProductsRequestSchema = z.object({
  query: getProductsQuerySchema,
});

type CreateProductRequest = z.infer<
  typeof createProductRequestSchema
>;

type UpdateProductRequest = z.infer<
  typeof updateProductRequestSchema
>;

type ProductByIdRequest = z.infer<
  typeof productByIdRequestSchema
>;

type GetProductsRequest = z.infer<
  typeof getProductsRequestSchema
>;

export {
  createProductRequestSchema,
  getProductsRequestSchema,
  productByIdRequestSchema,
  updateProductRequestSchema,
};

export type {
  CreateProductRequest,
  GetProductsRequest,
  ProductByIdRequest,
  UpdateProductRequest,
};
