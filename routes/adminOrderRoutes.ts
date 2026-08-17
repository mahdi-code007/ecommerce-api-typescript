import { Router } from "express";
import {
  getAllOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/adminOrderController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  orderByIdRequestSchema,
  updateOrderStatusRequestSchema,
} from "../schemas/orderSchema";

const router = Router();

router.use(protect, restrictTo("admin"));

router.get("/", getAllOrders);

router.patch(
  "/:orderId/status",
  validate(updateOrderStatusRequestSchema),
  updateOrderStatus,
);

router.get(
  "/:orderId",
  validate(orderByIdRequestSchema),
  getOrder,
);

export = router;
