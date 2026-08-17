import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "../controllers/productController";
import {
  createReview,
  getProductReviews,
  updateMyReview,
} from "../controllers/reviewController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  createProductRequestSchema,
  getProductsRequestSchema,
  productByIdRequestSchema,
  updateProductRequestSchema,
} from "../schemas/productSchema";
import {
  createReviewRequestSchema,
  getProductReviewsRequestSchema,
  updateMyReviewRequestSchema,
} from "../schemas/reviewSchema";

const router = Router();

router
  .route("/")
  .get(
    validate(getProductsRequestSchema),
    getAllProducts,
  )
  .post(
    protect,
    restrictTo("admin"),
    validate(createProductRequestSchema),
    createProduct,
  );

router.get(
  "/:id/reviews",
  validate(getProductReviewsRequestSchema),
  getProductReviews,
);

router.post(
  "/:id/reviews",
  protect,
  validate(createReviewRequestSchema),
  createReview,
);

router.patch(
  "/:id/reviews/me",
  protect,
  validate(updateMyReviewRequestSchema),
  updateMyReview,
);

router
  .route("/:id")
  .patch(
    protect,
    restrictTo("admin"),
    validate(updateProductRequestSchema),
    updateProduct,
  )
  .delete(
    protect,
    restrictTo("admin"),
    validate(productByIdRequestSchema),
    deleteProduct,
  );

export = router;
