import { Router } from "express";
import {
  addFavoriteItem,
  getFavorites,
  removeFavoriteItem,
} from "../controllers/favoriteController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  addFavoriteItemRequestSchema,
  favoriteItemByProductIdRequestSchema,
} from "../schemas/favoriteSchema";

const router = Router();

router.use(protect);

router.get("/", getFavorites);

router.post(
  "/items",
  validate(addFavoriteItemRequestSchema),
  addFavoriteItem,
);

router.delete(
  "/items/:productId",
  validate(favoriteItemByProductIdRequestSchema),
  removeFavoriteItem,
);

export = router;
