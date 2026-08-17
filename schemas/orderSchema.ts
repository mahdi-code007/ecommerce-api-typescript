import { z } from "zod";

const orderIdSchema = z.uuid({
  error: "Invalid order id",
});

const createOrderRequestSchema = z.object({
  body: z.strictObject({
    addressId: z.uuid({
      error: "Invalid address id",
    }),
  }),
});

const orderByIdRequestSchema = z.object({
  params: z.strictObject({
    orderId: orderIdSchema,
  }),
});

const updateOrderStatusRequestSchema = z.object({
  params: z.strictObject({
    orderId: orderIdSchema,
  }),
  body: z.strictObject({
    status: z.enum(
      ["confirmed", "shipped", "delivered", "cancelled"],
      {
        error: "Invalid order status",
      },
    ),
  }),
});

type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

type OrderByIdRequest = z.infer<typeof orderByIdRequestSchema>;

type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusRequestSchema>;

export {
  createOrderRequestSchema,
  orderByIdRequestSchema,
  updateOrderStatusRequestSchema,
};

export type {
  CreateOrderRequest,
  OrderByIdRequest,
  UpdateOrderStatusRequest,
};
