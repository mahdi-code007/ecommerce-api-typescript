import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as couponRepository from "../db/repositories/couponRepository";
import type {
  CouponByIdRequest,
  CreateCouponRequest,
  ListCouponsRequest,
  UpdateCouponRequest,
} from "../schemas/couponSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

// @desc List coupons
// @route GET /api/v1/admin/coupons
// @access private/admin
export const getAllCoupons = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = getValidated<ListCouponsRequest>(req);
  const { page, limit } = query;
  const { coupons, total } = await couponRepository.listCoupons({
    page,
    limit,
    isActive: query.isActive,
  });
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    status: "success",
    results: coupons.length,
    data: { coupons },
    pagination: {
      total,
      totalPages,
      page,
      limit,
    },
  });
};

// @desc Create a coupon
// @route POST /api/v1/admin/coupons
// @access private/admin
export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { body } = getValidated<CreateCouponRequest>(req);

  try {
    const coupon = await couponRepository.createCoupon(body);

    res.status(201).json({
      status: "success",
      data: { coupon },
      message: "Coupon created successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Category not found") {
      next(new AppError("Category not found", 404));
      return;
    }

    if (error instanceof Error && error.message === "Product not found") {
      next(new AppError("Product not found", 404));
      return;
    }

    throw error;
  }
};

// @desc Get one coupon
// @route GET /api/v1/admin/coupons/:couponId
// @access private/admin
export const getCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<CouponByIdRequest>(req);
  const coupon = await couponRepository.findCouponById(params.couponId);

  if (!coupon) {
    next(new AppError("Coupon not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { coupon },
  });
};

// @desc Update a coupon
// @route PATCH /api/v1/admin/coupons/:couponId
// @access private/admin
export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params, body } = getValidated<UpdateCouponRequest>(req);

  try {
    const coupon = await couponRepository.updateCoupon(
      params.couponId,
      body,
    );

    if (!coupon) {
      next(new AppError("Coupon not found", 404));
      return;
    }

    res.status(200).json({
      status: "success",
      data: { coupon },
      message: "Coupon updated successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Category not found") {
      next(new AppError("Category not found", 404));
      return;
    }

    if (error instanceof Error && error.message === "Product not found") {
      next(new AppError("Product not found", 404));
      return;
    }

    throw error;
  }
};

// @desc Delete a coupon
// @route DELETE /api/v1/admin/coupons/:couponId
// @access private/admin
export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<CouponByIdRequest>(req);
  const result = await couponRepository.deleteCoupon(params.couponId);

  if (!result.ok) {
    next(
      new AppError(
        result.reason === "not_found"
          ? "Coupon not found"
          : "Coupon has already been used and cannot be deleted. Deactivate it instead.",
        result.reason === "not_found" ? 404 : 409,
      ),
    );
    return;
  }

  res.status(204).send();
};
