import { Router } from "express";
import {
  addCartItem,
  clearCart,
  deleteCartItem,
  getCart,
  updateCartItem,
} from "../controllers/cartController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  addCartItemRequestSchema,
  cartItemByIdRequestSchema,
  updateCartItemRequestSchema,
} from "../schemas/cartSchema";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(getCart)
  .delete(clearCart);

router.post(
  "/items",
  validate(addCartItemRequestSchema),
  addCartItem,
);

router
  .route("/items/:itemId")
  .patch(
    validate(updateCartItemRequestSchema),
    updateCartItem,
  )
  .delete(
    validate(cartItemByIdRequestSchema),
    deleteCartItem,
  );

export = router;
