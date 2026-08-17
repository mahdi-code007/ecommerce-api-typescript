import { Router } from "express";
import * as categoryController from "../controllers/categoryController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  categoryByIdRequestSchema,
  createCategoryRequestSchema,
  getCategoriesRequestSchema,
  updateCategoryRequestSchema,
} from "../schemas/categorySchema";

const router = Router();

router
  .route("/")
  .get(
    validate(getCategoriesRequestSchema),
    categoryController.getAllCategories,
  )
  .post(
    protect,
    restrictTo("admin"),
    validate(createCategoryRequestSchema),
    categoryController.createCategory,
  );

router
  .route("/:id")
  .get(
    validate(categoryByIdRequestSchema),
    categoryController.getCategory,
  )
  .patch(
    protect,
    restrictTo("admin"),
    validate(updateCategoryRequestSchema),
    categoryController.updateCategory,
  )
  .delete(
    protect,
    restrictTo("admin"),
    validate(categoryByIdRequestSchema),
    categoryController.deleteCategory,
  );

export = router;
