import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as favoriteRepository from "../db/repositories/favoriteRepository";
import * as productRepository from "../db/repositories/productRepository";
import type {
  AddFavoriteItemRequest,
  FavoriteItemByProductIdRequest,
} from "../schemas/favoriteSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

// @desc Get the current user's favorites
// @route GET /api/v1/favorites
// @access private
export const getFavorites = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const items = await favoriteRepository.listItemsByUserId(userId);

  res.status(200).json({
    status: "success",
    results: items.length,
    data: { items },
  });
};

// @desc Add a product to favorites
// @route POST /api/v1/favorites/items
// @access private
export const addFavoriteItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { body } = getValidated<AddFavoriteItemRequest>(req);
  const product = await productRepository.findProductById(body.productId);

  if (!product || !product.isActive) {
    next(new AppError("Product not found", 404));
    return;
  }

  const result = await favoriteRepository.addItem(userId, body.productId);

  if (!result.ok) {
    next(
      new AppError(
        result.reason === "duplicate"
          ? "Product already in favorites"
          : `Favorites cannot contain more than ${favoriteRepository.MAX_FAVORITE_ITEMS} products`,
        result.reason === "duplicate" ? 409 : 400,
      ),
    );
    return;
  }

  res.status(201).json({
    status: "success",
    data: { item: result.item },
    message: "Product added to favorites",
  });
};

// @desc Remove a product from favorites
// @route DELETE /api/v1/favorites/items/:productId
// @access private
export const removeFavoriteItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<FavoriteItemByProductIdRequest>(req);
  const removed = await favoriteRepository.removeItemByProductId(
    userId,
    params.productId,
  );

  if (!removed) {
    next(new AppError("Favorite item not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Product removed from favorites",
  });
};
