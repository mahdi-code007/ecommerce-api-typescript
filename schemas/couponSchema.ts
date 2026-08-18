import { z } from "zod";

const couponIdSchema = z.uuid({
  error: "Invalid coupon id",
});

const couponCodeSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? "Coupon code is required"
        : "Coupon code must be a string",
  })
  .trim()
  .min(1, {
    error: "Coupon code is required",
  })
  .max(50, {
    error: "Coupon code must be less than 50 characters long",
  });

const discountTypeSchema = z.enum(["fixed_amount", "percentage"], {
  error: "Invalid discount type",
});

const couponScopeSchema = z.enum(["all", "category", "product"], {
  error: "Invalid coupon scope",
});

const positiveMinorUnitsSchema = z
  .number({
    error: "Amount must be a number",
  })
  .int({
    error: "Amount must be an integer",
  })
  .min(1, {
    error: "Amount must be at least 1",
  });

const optionalPositiveMinorUnitsSchema = z
  .number({
    error: "Amount must be a number",
  })
  .int({
    error: "Amount must be an integer",
  })
  .min(1, {
    error: "Amount must be at least 1",
  })
  .optional();

const optionalPositiveIntegerSchema = z
  .number({
    error: "Value must be a number",
  })
  .int({
    error: "Value must be an integer",
  })
  .min(1, {
    error: "Value must be at least 1",
  })
  .optional();

const optionalDateSchema = z.coerce
  .date({
    error: "Invalid date",
  })
  .optional();

const categoryIdsSchema = z.array(
  z.uuid({
    error: "Invalid category id",
  }),
);

const productIdsSchema = z.array(
  z.uuid({
    error: "Invalid product id",
  }),
);

const createCouponBodySchema = z
  .strictObject({
    code: couponCodeSchema,
    name: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? "Name is required"
            : "Name must be a string",
      })
      .trim()
      .min(1, {
        error: "Name is required",
      })
      .max(100, {
        error: "Name must be less than 100 characters long",
      }),
    description: z
      .string({
        error: "Description must be a string",
      })
      .trim()
      .max(500, {
        error: "Description must be less than 500 characters long",
      })
      .optional(),
    discountType: discountTypeSchema,
    discountValue: z
      .number({
        error: "Discount value must be a number",
      })
      .int({
        error: "Discount value must be an integer",
      }),
    maxDiscountAmount: optionalPositiveMinorUnitsSchema,
    minOrderAmount: optionalPositiveMinorUnitsSchema,
    startsAt: optionalDateSchema,
    endsAt: optionalDateSchema,
    isActive: z.boolean().optional(),
    usageLimit: optionalPositiveIntegerSchema,
    usageLimitPerUser: optionalPositiveIntegerSchema,
    scope: couponScopeSchema,
    categoryIds: categoryIdsSchema.optional(),
    productIds: productIdsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "percentage") {
      if (data.discountValue < 1 || data.discountValue > 100) {
        ctx.addIssue({
          code: "custom",
          message: "Percentage discount must be between 1 and 100",
          path: ["discountValue"],
        });
      }
    } else if (data.discountValue < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed amount discount must be at least 1",
        path: ["discountValue"],
      });
    }

    if (
      data.discountType === "fixed_amount" &&
      data.maxDiscountAmount !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "maxDiscountAmount is only allowed for percentage discounts",
        path: ["maxDiscountAmount"],
      });
    }

    if (data.scope === "category") {
      if (!data.categoryIds || data.categoryIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one category id is required",
          path: ["categoryIds"],
        });
      }
    }

    if (data.scope === "product") {
      if (!data.productIds || data.productIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one product id is required",
          path: ["productIds"],
        });
      }
    }
  });

const updateCouponBodySchema = z
  .strictObject({
    code: couponCodeSchema.optional(),
    name: z
      .string({
        error: "Name must be a string",
      })
      .trim()
      .min(1, {
        error: "Name is required",
      })
      .max(100, {
        error: "Name must be less than 100 characters long",
      })
      .optional(),
    description: z
      .string({
        error: "Description must be a string",
      })
      .trim()
      .max(500, {
        error: "Description must be less than 500 characters long",
      })
      .optional(),
    discountType: discountTypeSchema.optional(),
    discountValue: z
      .number({
        error: "Discount value must be a number",
      })
      .int({
        error: "Discount value must be an integer",
      })
      .optional(),
    maxDiscountAmount: optionalPositiveMinorUnitsSchema,
    minOrderAmount: optionalPositiveMinorUnitsSchema,
    startsAt: optionalDateSchema,
    endsAt: optionalDateSchema,
    isActive: z.boolean().optional(),
    usageLimit: optionalPositiveIntegerSchema,
    usageLimitPerUser: optionalPositiveIntegerSchema,
    scope: couponScopeSchema.optional(),
    categoryIds: categoryIdsSchema.optional(),
    productIds: productIdsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required",
      });
      return;
    }

    if (data.discountType === "percentage" && data.discountValue !== undefined) {
      if (data.discountValue < 1 || data.discountValue > 100) {
        ctx.addIssue({
          code: "custom",
          message: "Percentage discount must be between 1 and 100",
          path: ["discountValue"],
        });
      }
    }

    if (
      data.discountType === "fixed_amount" &&
      data.discountValue !== undefined &&
      data.discountValue < 1
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed amount discount must be at least 1",
        path: ["discountValue"],
      });
    }

    if (
      data.discountType === "fixed_amount" &&
      data.maxDiscountAmount !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "maxDiscountAmount is only allowed for percentage discounts",
        path: ["maxDiscountAmount"],
      });
    }

    if (data.scope === "category") {
      if (!data.categoryIds || data.categoryIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one category id is required",
          path: ["categoryIds"],
        });
      }
    }

    if (data.scope === "product") {
      if (!data.productIds || data.productIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one product id is required",
          path: ["productIds"],
        });
      }
    }
  });

const createCouponRequestSchema = z.object({
  body: createCouponBodySchema,
});

const updateCouponRequestSchema = z.object({
  params: z.strictObject({
    couponId: couponIdSchema,
  }),
  body: updateCouponBodySchema,
});

const couponByIdRequestSchema = z.object({
  params: z.strictObject({
    couponId: couponIdSchema,
  }),
});

const listCouponsRequestSchema = z.object({
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

    isActive: z
      .enum(["true", "false"], {
        error: "isActive must be true or false",
      })
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === "true",
      ),
  }),
});

const validateCouponRequestSchema = z.object({
  body: z.strictObject({
    code: couponCodeSchema,
  }),
});

type CreateCouponRequest = z.infer<typeof createCouponRequestSchema>;
type UpdateCouponRequest = z.infer<typeof updateCouponRequestSchema>;
type CouponByIdRequest = z.infer<typeof couponByIdRequestSchema>;
type ListCouponsRequest = z.infer<typeof listCouponsRequestSchema>;
type ValidateCouponRequest = z.infer<typeof validateCouponRequestSchema>;

export {
  couponByIdRequestSchema,
  createCouponRequestSchema,
  listCouponsRequestSchema,
  updateCouponRequestSchema,
  validateCouponRequestSchema,
};

export type {
  CouponByIdRequest,
  CreateCouponRequest,
  ListCouponsRequest,
  UpdateCouponRequest,
  ValidateCouponRequest,
};
