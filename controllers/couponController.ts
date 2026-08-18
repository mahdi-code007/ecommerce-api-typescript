import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as cartRepository from "../db/repositories/cartRepository";
import * as couponRepository from "../db/repositories/couponRepository";
import type { ValidateCouponRequest } from "../schemas/couponSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

const getCouponError = (
  reason: couponRepository.CouponValidationReason,
): { message: string; statusCode: number } => {
  switch (reason) {
    case "not_found":
    case "inactive":
      return {
        message: "Invalid or inactive coupon code",
        statusCode: 404,
      };
    case "not_yet_active":
      return {
        message: "Coupon is not yet active",
        statusCode: 400,
      };
    case "expired":
      return {
        message: "Coupon has expired",
        statusCode: 400,
      };
    case "usage_limit_reached":
      return {
        message: "Coupon usage limit reached",
        statusCode: 400,
      };
    case "per_user_limit_reached":
      return {
        message: "Coupon usage limit reached",
        statusCode: 400,
      };
    case "min_order_not_met":
      return {
        message: "Minimum order amount not met",
        statusCode: 400,
      };
    case "no_eligible_items":
      return {
        message: "Coupon does not apply to any items in your cart",
        statusCode: 400,
      };
  }
};

// @desc Preview a coupon against the current cart
// @route POST /api/v1/coupons/validate
// @access private
export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { body } = getValidated<ValidateCouponRequest>(req);
  const cartLineItems =
    await cartRepository.getCartLineItemsForCoupon(userId);

  if (cartLineItems.length === 0) {
    next(new AppError("Cart is empty", 400));
    return;
  }

  const result = await couponRepository.validateCouponForCart({
    userId,
    code: body.code,
    cartLineItems,
  });

  if (!result.ok) {
    const error = getCouponError(result.reason);
    next(new AppError(error.message, error.statusCode));
    return;
  }

  res.status(200).json({
    status: "success",
    data: {
      coupon: result.coupon,
      subtotal: result.subtotal,
      eligibleSubtotal: result.eligibleSubtotal,
      discountAmount: result.discountAmount,
      total: result.total,
    },
  });
};

export { getCouponError };
