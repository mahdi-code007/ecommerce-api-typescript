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

const variantIdSchema = z.uuid({
  error: "Invalid variant id",
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

const optionNameSchema = z
  .string({
    error: "Option name must be a string",
  })
  .trim()
  .min(1, {
    error: "Option name is required",
  })
  .max(50, {
    error: "Option name must be less than 50 characters long",
  });

const optionValueSchema = z
  .string({
    error: "Option value must be a string",
  })
  .trim()
  .min(1, {
    error: "Option value is required",
  })
  .max(50, {
    error: "Option value must be less than 50 characters long",
  });

const productOptionInputSchema = z.strictObject({
  name: optionNameSchema,
  values: z
    .array(optionValueSchema)
    .min(1, {
      error: "Each option must have at least one value",
    })
    .max(20, {
      error: "Each option can have at most 20 values",
    }),
});

const variantInputSchema = z.strictObject({
  optionValues: z
    .record(z.string(), optionValueSchema)
    .refine((value) => Object.keys(value).length > 0, {
      error: "Variant option values are required",
    }),
  priceInMinorUnits: z
    .number({
      error: "Price must be a number",
    })
    .int({
      error: "Price must be an integer",
    })
    .min(1, {
      error: "Price must be greater than zero",
    }),
  stock: z
    .number({
      error: "Stock must be a number",
    })
    .int({
      error: "Stock must be an integer",
    })
    .min(0, {
      error: "Stock cannot be negative",
    }),
  sku: z
    .string({
      error: "SKU must be a string",
    })
    .trim()
    .max(64, {
      error: "SKU must be less than 64 characters long",
    })
    .optional(),
  isActive: z.boolean().optional(),
});

const createProductBodySchema = z
  .strictObject({
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
    productType: z
      .enum(["simple", "variable"], {
        error: "Invalid product type",
      })
      .optional(),
    priceInMinorUnits: z
      .number({
        error: "Price must be a number",
      })
      .int({
        error: "Price must be an integer",
      })
      .min(1, {
        error: "Price must be greater than zero",
      })
      .optional(),
    stock: z
      .number({
        error: "Stock must be a number",
      })
      .int({
        error: "Stock must be an integer",
      })
      .min(0, {
        error: "Stock cannot be negative",
      })
      .optional(),
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
    options: z
      .array(productOptionInputSchema)
      .min(1, {
        error: "A variable product must have at least one option",
      })
      .max(3, {
        error: "A product can have at most 3 options",
      })
      .optional(),
    variants: z
      .array(variantInputSchema)
      .min(1, {
        error: "A variable product must have at least one variant",
      })
      .max(100, {
        error: "A product can have at most 100 variants",
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const productType = data.productType ?? "simple";

    if (productType === "simple") {
      if (data.priceInMinorUnits === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Price is required",
          path: ["priceInMinorUnits"],
        });
      }

      if (data.stock === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Stock is required",
          path: ["stock"],
        });
      }

      if (data.options !== undefined || data.variants !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Simple products cannot have options or variants",
          path: ["options"],
        });
      }

      return;
    }

    if (data.priceInMinorUnits !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Price is set on each variant",
        path: ["priceInMinorUnits"],
      });
    }

    if (data.stock !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Stock is set on each variant",
        path: ["stock"],
      });
    }

    if (!data.options || data.options.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "A variable product must have at least one option",
        path: ["options"],
      });
    }

    if (!data.variants || data.variants.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "A variable product must have at least one variant",
        path: ["variants"],
      });
    }
  });

const updateProductBodySchema = z
  .strictObject({
    name: nameSchema.optional(),
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
        error: "Price must be a number",
      })
      .int({
        error: "Price must be an integer",
      })
      .min(1, {
        error: "Price must be greater than zero",
      })
      .optional(),
    stock: z
      .number({
        error: "Stock must be a number",
      })
      .int({
        error: "Stock must be an integer",
      })
      .min(0, {
        error: "Stock cannot be negative",
      })
      .optional(),
    categoryId: categoryIdSchema.optional(),
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
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "No fields to update",
  });

const createProductRequestSchema = z.object({
  body: createProductBodySchema,
});

const updateProductRequestSchema = z.object({
  params: z.strictObject({
    id: productIdSchema,
  }),
  body: updateProductBodySchema,
});

const productByIdRequestSchema = z.object({
  params: z.strictObject({
    id: productIdSchema,
  }),
});

const createVariantRequestSchema = z.object({
  params: z.strictObject({
    id: productIdSchema,
  }),
  body: variantInputSchema,
});

const variantByIdRequestSchema = z.object({
  params: z.strictObject({
    id: productIdSchema,
    variantId: variantIdSchema,
  }),
});

const updateVariantRequestSchema = z.object({
  params: z.strictObject({
    id: productIdSchema,
    variantId: variantIdSchema,
  }),
  body: z
    .strictObject({
      priceInMinorUnits: z
        .number()
        .int()
        .min(1, {
          error: "Price must be greater than zero",
        })
        .optional(),
      stock: z
        .number()
        .int()
        .min(0, {
          error: "Stock cannot be negative",
        })
        .optional(),
      sku: z
        .union([
          z.string().trim().max(64),
          z.null(),
        ])
        .optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      error: "No fields to update",
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

type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
type ProductByIdRequest = z.infer<typeof productByIdRequestSchema>;
type GetProductsRequest = z.infer<typeof getProductsRequestSchema>;
type CreateVariantRequest = z.infer<typeof createVariantRequestSchema>;
type UpdateVariantRequest = z.infer<typeof updateVariantRequestSchema>;
type VariantByIdRequest = z.infer<typeof variantByIdRequestSchema>;

export {
  createProductRequestSchema,
  createVariantRequestSchema,
  getProductsRequestSchema,
  productByIdRequestSchema,
  updateProductRequestSchema,
  updateVariantRequestSchema,
  variantByIdRequestSchema,
};

export type {
  CreateProductRequest,
  CreateVariantRequest,
  GetProductsRequest,
  ProductByIdRequest,
  UpdateProductRequest,
  UpdateVariantRequest,
  VariantByIdRequest,
};
