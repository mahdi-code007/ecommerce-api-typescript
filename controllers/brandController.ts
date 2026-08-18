import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as brandRepository from "../db/repositories/brandRepository";
import * as productRepository from "../db/repositories/productRepository";
import type {
  BrandByIdRequest,
  CreateBrandRequest,
  GetBrandsRequest,
  UpdateBrandRequest,
} from "../schemas/brandSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

// @desc Create a new brand
// @route POST /api/v1/brands
// @access private/admin
export const createBrand = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { body } = getValidated<CreateBrandRequest>(req);
  const brand = await brandRepository.createBrand(body);

  res.status(201).json({
    status: "success",
    data: { brand },
    message: "Brand created successfully",
  });
};

// @desc Get all brands
// @route GET /api/v1/brands
// @access public
export const getAllBrands = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = getValidated<GetBrandsRequest>(req);
  const { page, limit } = query;
  const { total, brands } = await brandRepository.findAllBrands({
    page,
    limit,
  });
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    status: "success",
    data: { brands },
    pagination: {
      total,
      totalPages,
      page,
      limit,
    },
  });
};

// @desc Get a brand by id
// @route GET /api/v1/brands/:id
// @access public
export const getBrand = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<BrandByIdRequest>(req);
  const brand = await brandRepository.findBrandById(params.id);

  if (!brand) {
    next(new AppError("Brand not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { brand },
  });
};

// @desc Update a brand
// @route PATCH /api/v1/brands/:id
// @access private/admin
export const updateBrand = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params, body } = getValidated<UpdateBrandRequest>(req);
  const brand = await brandRepository.updateBrandById(params.id, body);

  if (!brand) {
    next(new AppError("Brand not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { brand },
    message: "Brand updated successfully",
  });
};

// @desc Delete a brand
// @route DELETE /api/v1/brands/:id
// @access private/admin
export const deleteBrand = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<BrandByIdRequest>(req);
  const associatedProductsCount =
    await productRepository.countProductsByBrandId(params.id);

  if (associatedProductsCount > 0) {
    next(
      new AppError(
        "Cannot delete a brand that has associated products",
        409,
      ),
    );
    return;
  }

  const brand = await brandRepository.deleteBrandById(params.id);

  if (!brand) {
    next(new AppError("Brand not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Brand deleted successfully",
  });
};
