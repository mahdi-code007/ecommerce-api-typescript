import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as orderRepository from "../db/repositories/orderRepository";
import * as productRepository from "../db/repositories/productRepository";
import * as reviewRepository from "../db/repositories/reviewRepository";
import type {
  CreateReviewRequest,
  GetProductReviewsRequest,
  UpdateMyReviewRequest,
} from "../schemas/reviewSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

const ensureProductExists = async (
  productId: string,
  next: NextFunction,
): Promise<boolean> => {
  const product = await productRepository.findProductById(productId);

  if (!product) {
    next(new AppError("Product not found", 404));
    return false;
  }

  return true;
};

// @desc List reviews for a product
// @route GET /api/v1/products/:id/reviews
// @access public
export const getProductReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<GetProductReviewsRequest>(req);

  if (!(await ensureProductExists(params.id, next))) {
    return;
  }

  const reviews = await reviewRepository.listReviewsByProductId(params.id);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
};

// @desc Create a review for a delivered product
// @route POST /api/v1/products/:id/reviews
// @access private
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params, body } = getValidated<CreateReviewRequest>(req);

  if (!(await ensureProductExists(params.id, next))) {
    return;
  }

  const hasDeliveredProduct =
    await orderRepository.hasDeliveredProductForUser(userId, params.id);

  if (!hasDeliveredProduct) {
    next(
      new AppError(
        "You can only review products from delivered orders",
        403,
      ),
    );
    return;
  }

  const existingReview = await reviewRepository.findReviewByUserAndProduct(
    userId,
    params.id,
  );

  if (existingReview) {
    next(new AppError("You have already reviewed this product", 409));
    return;
  }

  const review = await reviewRepository.createReview({
    userId,
    productId: params.id,
    rating: body.rating,
    comment: body.comment,
  });

  res.status(201).json({
    status: "success",
    data: { review },
    message: "Review created successfully",
  });
};

// @desc Update the current user's review for a product
// @route PATCH /api/v1/products/:id/reviews/me
// @access private
export const updateMyReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params, body } = getValidated<UpdateMyReviewRequest>(req);

  if (!(await ensureProductExists(params.id, next))) {
    return;
  }

  const review = await reviewRepository.updateReviewByUserAndProduct(
    userId,
    params.id,
    body,
  );

  if (!review) {
    next(new AppError("Review not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { review },
    message: "Review updated successfully",
  });
};
