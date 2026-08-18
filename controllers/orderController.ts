import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as addressRepository from "../db/repositories/addressRepository";
import * as cartRepository from "../db/repositories/cartRepository";
import * as orderRepository from "../db/repositories/orderRepository";
import type {
  CreateOrderRequest,
  ListOrdersRequest,
  OrderByIdRequest,
} from "../schemas/orderSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

// @desc Place an order from the current cart
// @route POST /api/v1/orders
// @access private
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { body } = getValidated<CreateOrderRequest>(req);
  const address = await addressRepository.findAddressByIdForUser(
    userId,
    body.addressId,
  );

  if (!address) {
    next(new AppError("Address not found", 404));
    return;
  }

  const result = await orderRepository.placeOrder(userId, address);

  if (!result.ok) {
    next(
      new AppError(
        result.reason === "empty_cart"
          ? "Cart is empty"
          : "One or more products are unavailable or out of stock",
        400,
      ),
    );
    return;
  }

  res.status(201).json({
    status: "success",
    data: { order: result.order },
    message: "Order placed successfully",
  });
};

// @desc List the current user's orders
// @route GET /api/v1/orders
// @access private
export const getMyOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { query } = getValidated<ListOrdersRequest>(req);
  const { page, limit } = query;
  const { orders, total } = await orderRepository.listOrders({
    userId,
    status: query.status,
    sort: query.sort,
    page,
    limit,
  });
  const ordersWithReviewContext =
    await orderRepository.attachCustomerReviewContext(userId, orders);
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    status: "success",
    results: ordersWithReviewContext.length,
    data: { orders: ordersWithReviewContext },
    pagination: {
      total,
      totalPages,
      page,
      limit,
    },
  });
};

// @desc Get one of the current user's orders
// @route GET /api/v1/orders/:orderId
// @access private
export const getMyOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<OrderByIdRequest>(req);
  const order = await orderRepository.findOrderByIdForUser(
    userId,
    params.orderId,
  );

  if (!order) {
    next(new AppError("Order not found", 404));
    return;
  }

  const [orderWithReviewContext] =
    await orderRepository.attachCustomerReviewContext(userId, [order]);

  res.status(200).json({
    status: "success",
    data: { order: orderWithReviewContext },
  });
};

// @desc Cancel a pending order
// @route PATCH /api/v1/orders/:orderId/cancel
// @access private
export const cancelMyOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<OrderByIdRequest>(req);
  const result = await orderRepository.cancelPendingOrderForUser(
    userId,
    params.orderId,
  );

  if (!result.ok) {
    next(
      new AppError(
        result.reason === "not_found"
          ? "Order not found"
          : "Only pending orders can be cancelled",
        result.reason === "not_found" ? 404 : 400,
      ),
    );
    return;
  }

  res.status(200).json({
    status: "success",
    data: { order: result.order },
    message: "Order cancelled successfully",
  });
};

// @desc Add a previous order's products back to the cart
// @route POST /api/v1/orders/:orderId/reorder
// @access private
export const reorderMyOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<OrderByIdRequest>(req);
  const result = await orderRepository.reorderOrderToCart(
    userId,
    params.orderId,
  );

  if (!result.ok) {
    next(new AppError("Order not found", 404));
    return;
  }

  if (result.addedCount === 0) {
    next(
      new AppError(
        "No products from this order could be added to the cart",
        400,
      ),
    );
    return;
  }

  const cart = await cartRepository.getCartViewByUserId(userId);

  res.status(200).json({
    status: "success",
    data: {
      cart,
      skipped: result.skipped,
    },
    message: "Order items added to cart",
  });
};
