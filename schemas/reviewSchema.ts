import { z } from "zod";

const productIdSchema = z.uuid({
  error: "Invalid product id",
});

const ratingSchema = z
  .number({
    error: (issue) =>
      issue.input === undefined
        ? "Rating is required"
        : "Rating must be a number",
  })
  .int({
    error: "Rating must be an integer",
  })
  .min(1, {
    error: "Rating must be at least 1",
  })
  .max(5, {
    error: "Rating must be at most 5",
  });

const commentSchema = z
  .string({
    error: "Comment must be a string",
  })
  .trim()
  .max(1000, {
    error: "Comment must be less than 1000 characters long",
  });

const createReviewSchema = z.strictObject({
  rating: ratingSchema,
  comment: commentSchema.optional(),
});

const updateReviewSchema = z
  .strictObject({
    rating: ratingSchema.optional(),
    comment: commentSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "No fields to update",
  });

const productParamsSchema = z.strictObject({
  id: productIdSchema,
});

const getProductReviewsRequestSchema = z.object({
  params: productParamsSchema,
});

const createReviewRequestSchema = z.object({
  params: productParamsSchema,
  body: createReviewSchema,
});

const updateMyReviewRequestSchema = z.object({
  params: productParamsSchema,
  body: updateReviewSchema,
});

type GetProductReviewsRequest = z.infer<
  typeof getProductReviewsRequestSchema
>;

type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>;

type UpdateMyReviewRequest = z.infer<typeof updateMyReviewRequestSchema>;

export {
  createReviewRequestSchema,
  getProductReviewsRequestSchema,
  updateMyReviewRequestSchema,
};

export type {
  CreateReviewRequest,
  GetProductReviewsRequest,
  UpdateMyReviewRequest,
};
