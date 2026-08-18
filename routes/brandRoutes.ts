import { Router } from "express";
import * as brandController from "../controllers/brandController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  brandByIdRequestSchema,
  createBrandRequestSchema,
  getBrandsRequestSchema,
  updateBrandRequestSchema,
} from "../schemas/brandSchema";

const router = Router();

router
  .route("/")
  .get(
    validate(getBrandsRequestSchema),
    brandController.getAllBrands,
  )
  .post(
    protect,
    restrictTo("admin"),
    validate(createBrandRequestSchema),
    brandController.createBrand,
  );

router
  .route("/:id")
  .get(
    validate(brandByIdRequestSchema),
    brandController.getBrand,
  )
  .patch(
    protect,
    restrictTo("admin"),
    validate(updateBrandRequestSchema),
    brandController.updateBrand,
  )
  .delete(
    protect,
    restrictTo("admin"),
    validate(brandByIdRequestSchema),
    brandController.deleteBrand,
  );

export = router;
