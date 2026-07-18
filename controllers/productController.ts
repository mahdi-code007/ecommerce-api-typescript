import type {
  NextFunction,
  Request,
  Response,
} from "express";
import mongoose from "mongoose";
import Category = require("../models/Category");
import Product = require("../models/Product");
import type { CreateProductRequest } from "../schemas/productSchema";
import type {
  GetProductsRequest,
  ProductByIdRequest,
  UpdateProductRequest,
} from "../schemas/productSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

// @desc Create a new product
// @route POST /api/v1/products
// @access private
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { body } = getValidated<CreateProductRequest>(req);
  const { categoryId, ...productData } = body;
  const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

  const categoryExists = await Category.exists({
    _id: categoryObjectId,
  });

  if (!categoryExists) {
    next(new AppError("Category not found", 404));
    return;
  }

  const product = await Product.create({
    ...productData,
    category: categoryObjectId,
  });

  await product.populate("category", "name slug");

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
  const { page, limit, categoryId } = query;
  const skip = (page - 1) * limit;

  const filter = categoryId
    ? {
        category: new mongoose.Types.ObjectId(categoryId),
      }
    : {};

  const total = await Product.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || 1;

  const products = await Product.find(filter)
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

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

  const product = await Product.findById(params.id);

  if (!product) {
    next(new AppError("Product not found", 404));
    return;
  }

  const { categoryId, ...productData } = body;

  if (categoryId !== undefined) {
    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);
    const categoryExists = await Category.exists({
      _id: categoryObjectId,
    });

    if (!categoryExists) {
      next(new AppError("Category not found", 404));
      return;
    }

    product.category = categoryObjectId;
  }

  product.set(productData);
  await product.save();
  await product.populate("category", "name slug");

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
  const product = await Product.findByIdAndDelete(params.id);

  if (!product) {
    next(new AppError("Product not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
};
