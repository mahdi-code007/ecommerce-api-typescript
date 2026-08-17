import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as categoryRepository from "../db/repositories/categoryRepository";
import * as productRepository from "../db/repositories/productRepository";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");
import type {
  CategoryByIdRequest,
  CreateCategoryRequest,
  GetCategoriesRequest,
  UpdateCategoryRequest,
} from "../schemas/categorySchema";

// @desc Create a new category
// @route POST /api/v1/categories
// @access private
export const createCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { body } = getValidated<CreateCategoryRequest>(req);
  const category = await categoryRepository.createCategory(body);

  res.status(201).json({
    status: "success",
    data: { category },
    message: "Category created successfully",
  });
};

// @desc Get all categories
// @route GET /api/v1/categories
// @access public
export const getAllCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = getValidated<GetCategoriesRequest>(req);
  const { page, limit } = query;

  const { total, categories } = await categoryRepository.findAllCategories({ page, limit });
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    status: "success",
    data: { categories },
    pagination: {
      total,
      totalPages,
      page,
      limit,
    },
  });
};

// @desc Get a category by id
// @route GET /api/v1/categories/:id
// @access public
export const getCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<CategoryByIdRequest>(req);
  const category = await categoryRepository.findCategoryById(params.id);

  if (!category) {
    next(new AppError("Category not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { category },
  });
};

// @desc Update specific category by id
// @route PATCH /api/v1/categories/:id
// @access private
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params, body } =
    getValidated<UpdateCategoryRequest>(req);

  const category = await categoryRepository.updateCategoryById(params.id, body);

  if (!category) {
    next(new AppError("Category not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { category },
    message: "Category updated successfully",
  });
};

// @desc Delete specific category by id
// @route DELETE /api/v1/categories/:id
// @access private
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<CategoryByIdRequest>(req);

  const associatedProductsCount =
    await productRepository.countProductsByCategoryId(params.id);

  if (associatedProductsCount > 0) {
    next(
      new AppError(
        "Cannot delete a category that has associated products",
        409,
      ),
    );
    return;
  }

  const category = await categoryRepository.deleteCategoryById(params.id);

  if (!category) {
    next(new AppError("Category not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
  });
};
