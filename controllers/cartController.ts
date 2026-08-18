import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as cartRepository from "../db/repositories/cartRepository";
import type {
  AddCartItemRequest,
  CartItemByIdRequest,
  UpdateCartItemRequest,
} from "../schemas/cartSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

const mapAddCartError = (
  reason: Extract<
    cartRepository.AddOrIncreaseCartItemResult,
    { ok: false }
  >["reason"],
): { message: string; statusCode: number } => {
  switch (reason) {
    case "unavailable":
      return { message: "Product not found", statusCode: 404 };
    case "out_of_stock":
      return {
        message: "Requested quantity exceeds available stock",
        statusCode: 400,
      };
    case "variant_required":
      return { message: "Variant is required", statusCode: 400 };
    case "no_variants":
      return { message: "This product has no variants", statusCode: 400 };
    case "variant_not_found":
      return { message: "Variant not found", statusCode: 404 };
  }
};

// @desc Get the current user's cart
// @route GET /api/v1/cart
// @access private
export const getCart = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const cart = await cartRepository.getCartViewByUserId(userId);

  res.status(200).json({
    status: "success",
    data: { cart },
  });
};

// @desc Add a product to the cart or increase its quantity
// @route POST /api/v1/cart/items
// @access private
export const addCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { body } = getValidated<AddCartItemRequest>(req);
  const existingCart = await cartRepository.getCartViewByUserId(userId);
  const existingCount = existingCart.items.length;
  const result = await cartRepository.addOrIncreaseCartItem(
    userId,
    body.productId,
    body.quantity,
    body.variantId,
  );

  if (!result.ok) {
    const error = mapAddCartError(result.reason);
    next(new AppError(error.message, error.statusCode));
    return;
  }

  const cart = await cartRepository.getCartViewByUserId(userId);
  const created = cart.items.length > existingCount;

  res.status(created ? 201 : 200).json({
    status: "success",
    data: { cart },
    message: created
      ? "Product added to cart"
      : "Cart item quantity updated",
  });
};

// @desc Update a cart item quantity
// @route PATCH /api/v1/cart/items/:itemId
// @access private
export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params, body } = getValidated<UpdateCartItemRequest>(req);
  const item = await cartRepository.findItemInUserCart(userId, params.itemId);

  if (!item) {
    next(new AppError("Cart item not found", 404));
    return;
  }

  const stock = await cartRepository.getAvailableStockForCartItem(item);

  if (stock === null) {
    next(new AppError("Product not found", 404));
    return;
  }

  if (body.quantity > stock) {
    next(
      new AppError(
        "Requested quantity exceeds available stock",
        400,
      ),
    );
    return;
  }

  await cartRepository.updateCartItemQuantity(item.id, body.quantity);
  const cart = await cartRepository.getCartViewByUserId(userId);

  res.status(200).json({
    status: "success",
    data: { cart },
    message: "Cart item updated successfully",
  });
};

// @desc Remove a cart item
// @route DELETE /api/v1/cart/items/:itemId
// @access private
export const deleteCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<CartItemByIdRequest>(req);
  const item = await cartRepository.findItemInUserCart(userId, params.itemId);

  if (!item) {
    next(new AppError("Cart item not found", 404));
    return;
  }

  await cartRepository.deleteCartItem(item.id);
  const cart = await cartRepository.getCartViewByUserId(userId);

  res.status(200).json({
    status: "success",
    data: { cart },
    message: "Cart item removed successfully",
  });
};

// @desc Clear the current user's cart
// @route DELETE /api/v1/cart
// @access private
export const clearCart = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  await cartRepository.clearCartByUserId(userId);
  const cart = await cartRepository.getCartViewByUserId(userId);

  res.status(200).json({
    status: "success",
    data: { cart },
    message: "Cart cleared successfully",
  });
};
