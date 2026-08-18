import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as productRepository from "../db/repositories/productRepository";
import * as wishlistRepository from "../db/repositories/wishlistRepository";
import type {
  AddWishlistItemRequest,
  WishlistItemByProductIdRequest,
} from "../schemas/wishlistSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

// @desc Get the current user's wishlist
// @route GET /api/v1/wishlist
// @access private
export const getWishlist = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const items = await wishlistRepository.listItemsByUserId(userId);

  res.status(200).json({
    status: "success",
    results: items.length,
    data: { items },
  });
};

// @desc Add a product to the wishlist
// @route POST /api/v1/wishlist/items
// @access private
export const addWishlistItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { body } = getValidated<AddWishlistItemRequest>(req);
  const product = await productRepository.findProductById(body.productId);

  if (!product || !product.isActive) {
    next(new AppError("Product not found", 404));
    return;
  }

  const result = await wishlistRepository.addItem(userId, body.productId);

  if (!result.ok) {
    next(
      new AppError(
        result.reason === "duplicate"
          ? "Product already in wishlist"
          : `Wishlist cannot contain more than ${wishlistRepository.MAX_WISHLIST_ITEMS} products`,
        result.reason === "duplicate" ? 409 : 400,
      ),
    );
    return;
  }

  res.status(201).json({
    status: "success",
    data: { item: result.item },
    message: "Product added to wishlist",
  });
};

// @desc Remove a product from the wishlist
// @route DELETE /api/v1/wishlist/items/:productId
// @access private
export const removeWishlistItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<WishlistItemByProductIdRequest>(req);
  const removed = await wishlistRepository.removeItemByProductId(
    userId,
    params.productId,
  );

  if (!removed) {
    next(new AppError("Wishlist item not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Product removed from wishlist",
  });
};
