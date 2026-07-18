import { Router } from "express";
import * as categoryController from "../controllers/categoryController";
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
    validate(updateCategoryRequestSchema),
    categoryController.updateCategory,
  )
  .delete(
    validate(categoryByIdRequestSchema),
    categoryController.deleteCategory,
  );

export = router;
