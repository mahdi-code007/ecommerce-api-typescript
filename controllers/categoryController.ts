import type {
  NextFunction,
  Request,
  Response,
} from "express";
import Category = require("../models/Category");
import AppError = require("../utils/AppError");
import type {
  CategoryByIdRequest,
  CreateCategoryRequest,
  GetCategoriesRequest,
  UpdateCategoryRequest,
} from "../schemas/categorySchema";

const getValidated = <T>(req: Request): T => {
  if (req.validated === undefined) {
    throw new AppError("Validated request data is missing", 500);
  }

  return req.validated as T;
};

// @desc Create a new category
// @route POST /api/v1/categories
// @access private
export const createCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { body } = getValidated<CreateCategoryRequest>(req);
  const category = await Category.create(body);

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
  const skip = (page - 1) * limit;

  const total = await Category.countDocuments();
  const totalPages = Math.ceil(total / limit) || 1;

  const categories = await Category.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

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
  const category = await Category.findById(params.id);

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

  const category = await Category.findById(params.id);

  if (!category) {
    next(new AppError("Category not found", 404));
    return;
  }

  const { name, description, image } = body;

  if (name !== undefined) {
    category.name = name;
  }

  if (description !== undefined) {
    category.description = description;
  }

  if (image !== undefined) {
    category.image = image;
  }

  await category.save();

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
  const category = await Category.findByIdAndDelete(params.id);

  if (!category) {
    next(new AppError("Category not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
  });
};
