import { Router } from "express";
import {
  cancelMyOrder,
  createOrder,
  getMyOrder,
  getMyOrders,
} from "../controllers/orderController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  createOrderRequestSchema,
  orderByIdRequestSchema,
} from "../schemas/orderSchema";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(getMyOrders)
  .post(
    validate(createOrderRequestSchema),
    createOrder,
  );

router.patch(
  "/:orderId/cancel",
  validate(orderByIdRequestSchema),
  cancelMyOrder,
);

router.get(
  "/:orderId",
  validate(orderByIdRequestSchema),
  getMyOrder,
);

export = router;
