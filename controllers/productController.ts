import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as brandRepository from "../db/repositories/brandRepository";
import * as categoryRepository from "../db/repositories/categoryRepository";
import * as productRepository from "../db/repositories/productRepository";
import * as variantRepository from "../db/repositories/variantRepository";
import type {
  CreateProductRequest,
  CreateVariantRequest,
  GetProductsRequest,
  ProductByIdRequest,
  UpdateProductRequest,
  UpdateVariantRequest,
  VariantByIdRequest,
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

const mapVariantWriteError = (
  reason: Extract<
    variantRepository.VariantWriteResult,
    { ok: false }
  >["reason"],
): { message: string; statusCode: number } => {
  switch (reason) {
    case "not_found":
      return { message: "Variant not found", statusCode: 404 };
    case "not_variable":
      return { message: "This product has no variants", statusCode: 400 };
    case "invalid_options":
      return { message: "Variant option values are invalid", statusCode: 400 };
    case "duplicate_combination":
      return {
        message: "A variant with this option combination already exists",
        statusCode: 409,
      };
    case "duplicate_sku":
      return {
        message: "SKU already exists",
        statusCode: 409,
      };
    case "last_variant":
      return {
        message: "A variable product must have at least one variant",
        statusCode: 409,
      };
    case "in_use":
      return {
        message: "Variant has already been used in an order and cannot be deleted. Deactivate it instead.",
        statusCode: 409,
      };
    case "limit_reached":
      return {
        message: "A product can have at most 100 variants",
        statusCode: 400,
      };
  }
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

  try {
    const product = await productRepository.createProduct({
      ...body,
      productType: body.productType ?? "simple",
    });

    res.status(201).json({
      status: "success",
      data: { product },
      message: "Product created successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_options") {
      next(new AppError("Variant option values are invalid", 400));
      return;
    }

    if (error instanceof Error && error.message === "duplicate_combination") {
      next(
        new AppError(
          "A variant with this option combination already exists",
          409,
        ),
      );
      return;
    }

    if (error instanceof Error && error.message === "duplicate_sku") {
      next(new AppError("SKU already exists", 409));
      return;
    }

    throw error;
  }
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

// @desc Get a product by id
// @route GET /api/v1/products/:id
// @access public
export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<ProductByIdRequest>(req);
  const product = await productRepository.findProductById(params.id, {
    includeVariants: true,
  });

  if (!product || !product.isActive) {
    next(new AppError("Product not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { product },
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

  const existing = await productRepository.findProductById(params.id);

  if (!existing) {
    next(new AppError("Product not found", 404));
    return;
  }

  if (
    existing.productType === "variable" &&
    (body.priceInMinorUnits !== undefined || body.stock !== undefined)
  ) {
    next(
      new AppError(
        "Price and stock for variable products are managed on variants",
        400,
      ),
    );
    return;
  }

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
  const result = await productRepository.deleteProductById(params.id);

  if (!result.ok) {
    next(
      new AppError(
        result.reason === "not_found"
          ? "Product not found"
          : "Cannot delete a product that has been ordered. Deactivate it instead.",
        result.reason === "not_found" ? 404 : 409,
      ),
    );
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
};

// @desc Create a variant
// @route POST /api/v1/products/:id/variants
// @access private/admin
export const createVariant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params, body } = getValidated<CreateVariantRequest>(req);
  const result = await variantRepository.addVariant(params.id, body);

  if (!result.ok) {
    const error = mapVariantWriteError(result.reason);
    next(new AppError(error.message, error.statusCode));
    return;
  }

  res.status(201).json({
    status: "success",
    data: { variant: result.variant },
    message: "Variant created successfully",
  });
};

// @desc Update a variant
// @route PATCH /api/v1/products/:id/variants/:variantId
// @access private/admin
export const updateVariant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params, body } = getValidated<UpdateVariantRequest>(req);
  const result = await variantRepository.updateVariant(
    params.id,
    params.variantId,
    body,
  );

  if (!result.ok) {
    const error = mapVariantWriteError(result.reason);
    next(new AppError(error.message, error.statusCode));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { variant: result.variant },
    message: "Variant updated successfully",
  });
};

// @desc Delete a variant
// @route DELETE /api/v1/products/:id/variants/:variantId
// @access private/admin
export const deleteVariant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<VariantByIdRequest>(req);
  const result = await variantRepository.deleteVariant(
    params.id,
    params.variantId,
  );

  if (!result.ok) {
    const error = mapVariantWriteError(result.reason);
    next(new AppError(error.message, error.statusCode));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Variant deleted successfully",
  });
};
