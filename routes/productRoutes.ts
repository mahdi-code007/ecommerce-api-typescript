import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "../controllers/productController";
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
    validate(createProductRequestSchema),
    createProduct,
  );

router
  .route("/:id")
  .patch(
    validate(updateProductRequestSchema),
    updateProduct,
  )
  .delete(
    validate(productByIdRequestSchema),
    deleteProduct,
  );

export = router;
