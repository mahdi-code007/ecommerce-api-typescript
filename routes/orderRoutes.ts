import { Router } from "express";
import {
  cancelMyOrder,
  createOrder,
  getMyOrder,
  getMyOrders,
  reorderMyOrder,
} from "../controllers/orderController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  createOrderRequestSchema,
  listOrdersRequestSchema,
  orderByIdRequestSchema,
} from "../schemas/orderSchema";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(
    validate(listOrdersRequestSchema),
    getMyOrders,
  )
  .post(
    validate(createOrderRequestSchema),
    createOrder,
  );

router.patch(
  "/:orderId/cancel",
  validate(orderByIdRequestSchema),
  cancelMyOrder,
);

router.post(
  "/:orderId/reorder",
  validate(orderByIdRequestSchema),
  reorderMyOrder,
);

router.get(
  "/:orderId",
  validate(orderByIdRequestSchema),
  getMyOrder,
);

export = router;
