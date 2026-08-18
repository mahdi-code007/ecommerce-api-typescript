import { Router } from "express";
import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from "../controllers/wishlistController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  addWishlistItemRequestSchema,
  wishlistItemByProductIdRequestSchema,
} from "../schemas/wishlistSchema";

const router = Router();

router.use(protect);

router.get("/", getWishlist);

router.post(
  "/items",
  validate(addWishlistItemRequestSchema),
  addWishlistItem,
);

router.delete(
  "/items/:productId",
  validate(wishlistItemByProductIdRequestSchema),
  removeWishlistItem,
);

export = router;
