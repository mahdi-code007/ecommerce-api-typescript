import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as orderRepository from "../db/repositories/orderRepository";
import type {
  ListOrdersRequest,
  OrderByIdRequest,
  UpdateOrderStatusRequest,
} from "../schemas/orderSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

// @desc List all orders
// @route GET /api/v1/admin/orders
// @access private/admin
export const getAllOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = getValidated<ListOrdersRequest>(req);
  const { page, limit } = query;
  const { orders, total } = await orderRepository.listOrders({
    status: query.status,
    sort: query.sort,
    page,
    limit,
  });
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
    pagination: {
      total,
      totalPages,
      page,
      limit,
    },
  });
};

// @desc Get any order
// @route GET /api/v1/admin/orders/:orderId
// @access private/admin
export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params } = getValidated<OrderByIdRequest>(req);
  const order = await orderRepository.findOrderById(params.orderId);

  if (!order) {
    next(new AppError("Order not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
};

// @desc Update order status
// @route PATCH /api/v1/admin/orders/:orderId/status
// @access private/admin
export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { params, body } = getValidated<UpdateOrderStatusRequest>(req);
  const result = await orderRepository.updateOrderStatus(
    params.orderId,
    body.status,
  );

  if (!result.ok) {
    next(
      new AppError(
        result.reason === "not_found"
          ? "Order not found"
          : "This status transition is not allowed",
        result.reason === "not_found" ? 404 : 400,
      ),
    );
    return;
  }

  res.status(200).json({
    status: "success",
    data: { order: result.order },
    message: "Order status updated successfully",
  });
};
