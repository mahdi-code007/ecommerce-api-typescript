import { Router } from "express";
import {
  createProduct,
  createVariant,
  deleteProduct,
  deleteVariant,
  getAllProducts,
  getProduct,
  updateProduct,
  updateVariant,
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
  createVariantRequestSchema,
  getProductsRequestSchema,
  productByIdRequestSchema,
  updateProductRequestSchema,
  updateVariantRequestSchema,
  variantByIdRequestSchema,
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

router.post(
  "/:id/variants",
  protect,
  restrictTo("admin"),
  validate(createVariantRequestSchema),
  createVariant,
);

router.patch(
  "/:id/variants/:variantId",
  protect,
  restrictTo("admin"),
  validate(updateVariantRequestSchema),
  updateVariant,
);

router.delete(
  "/:id/variants/:variantId",
  protect,
  restrictTo("admin"),
  validate(variantByIdRequestSchema),
  deleteVariant,
);

router
  .route("/:id")
  .get(
    validate(productByIdRequestSchema),
    getProduct,
  )
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
