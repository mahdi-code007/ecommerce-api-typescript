import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as cartRepository from "../db/repositories/cartRepository";
import * as productRepository from "../db/repositories/productRepository";
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

const assertQuantityWithinStock = (
  quantity: number,
  stock: number,
  next: NextFunction,
): boolean => {
  if (quantity > stock) {
    next(
      new AppError(
        "Requested quantity exceeds available stock",
        400,
      ),
    );
    return false;
  }

  return true;
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
  const product = await productRepository.findProductById(body.productId);

  if (!product || !product.isActive) {
    next(new AppError("Product not found", 404));
    return;
  }

  const cart = await cartRepository.getOrCreateCart(userId);
  const existingItem = await cartRepository.findItemByProduct(
    cart.id,
    body.productId,
  );
  const nextQuantity = (existingItem?.quantity ?? 0) + body.quantity;

  if (!assertQuantityWithinStock(nextQuantity, product.stock, next)) {
    return;
  }

  if (existingItem) {
    await cartRepository.updateCartItemQuantity(
      existingItem.id,
      nextQuantity,
    );
  } else {
    await cartRepository.insertCartItem(
      cart.id,
      body.productId,
      body.quantity,
    );
  }

  const updatedCart = await cartRepository.getCartViewByUserId(userId);

  res.status(existingItem ? 200 : 201).json({
    status: "success",
    data: { cart: updatedCart },
    message: existingItem
      ? "Cart item quantity updated"
      : "Product added to cart",
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

  const product = await productRepository.findProductById(item.productId);

  if (!product || !product.isActive) {
    next(new AppError("Product not found", 404));
    return;
  }

  if (!assertQuantityWithinStock(body.quantity, product.stock, next)) {
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
