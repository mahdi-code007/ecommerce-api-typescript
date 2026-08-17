import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "../controllers/productController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  createProductRequestSchema,
  getProductsRequestSchema,
  productByIdRequestSchema,
  updateProductRequestSchema,
} from "../schemas/productSchema";

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
