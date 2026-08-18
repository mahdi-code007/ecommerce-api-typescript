import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as brandRepository from "../db/repositories/brandRepository";
import * as categoryRepository from "../db/repositories/categoryRepository";
import * as productRepository from "../db/repositories/productRepository";
import type {
  CreateProductRequest,
  GetProductsRequest,
  ProductByIdRequest,
  UpdateProductRequest,
} from "../schemas/productSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const ensureCategoryExists = async (
  categoryId: string,
  next: NextFunction,
): Promise<boolean> => {
  const category = await categoryRepository.findCategoryById(categoryId);

  if (!category) {
    next(new AppError("Category not found", 404));
    return false;
  }

  return true;
};

const ensureBrandExists = async (
  brandId: string,
  next: NextFunction,
): Promise<boolean> => {
  const brand = await brandRepository.findBrandById(brandId);

  if (!brand) {
    next(new AppError("Brand not found", 404));
    return false;
  }

  return true;
};

// @desc Create a new product
// @route POST /api/v1/products
// @access private
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { body } = getValidated<CreateProductRequest>(req);

  if (!(await ensureCategoryExists(body.categoryId, next))) {
    return;
  }

  if (
    body.brandId &&
    !(await ensureBrandExists(body.brandId, next))
  ) {
    return;
  }

  const product = await productRepository.createProduct(body);

  res.status(201).json({
    status: "success",
    data: { product },
    message: "Product created successfully",
  });
};

// @desc Get all products, optionally filtered by category
// @route GET /api/v1/products
// @access public
export const getAllProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = getValidated<GetProductsRequest>(req);
  const { page, limit } = query;

  const { total, products } =
    await productRepository.findAllProducts(query);
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    status: "success",
    data: { products },
    pagination: {
      total,
      totalPages,
      page,
      limit,
    },
  });
};

// @desc Update a specific product
// @route PATCH /api/v1/products/:id
// @access private
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params, body } =
    getValidated<UpdateProductRequest>(req);

  if (
    body.categoryId !== undefined &&
    !(await ensureCategoryExists(body.categoryId, next))
  ) {
    return;
  }

  if (
    body.brandId &&
    !(await ensureBrandExists(body.brandId, next))
  ) {
    return;
  }

  const product = await productRepository.updateProductById(
    params.id,
    body,
  );

  if (!product) {
    next(new AppError("Product not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { product },
    message: "Product updated successfully",
  });
};

// @desc Delete a specific product
// @route DELETE /api/v1/products/:id
// @access private
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<ProductByIdRequest>(req);
  const product = await productRepository.deleteProductById(params.id);

  if (!product) {
    next(new AppError("Product not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
};
