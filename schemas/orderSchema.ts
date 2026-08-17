import { z } from "zod";

const orderIdSchema = z.uuid({
  error: "Invalid order id",
});

const orderStatusFilterSchema = z.enum(
  ["pending", "confirmed", "shipped", "delivered", "cancelled"],
  {
    error: "Invalid order status",
  },
);

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

const listOrdersRequestSchema = z.object({
  query: z.strictObject({
    page: z.coerce
      .number({
        error: "Page must be a number",
      })
      .int({
        error: "Page must be an integer",
      })
      .min(1, {
        error: "Page must be at least 1",
      })
      .default(1),

    limit: z.coerce
      .number({
        error: "Limit must be a number",
      })
      .int({
        error: "Limit must be an integer",
      })
      .min(1, {
        error: "Limit must be at least 1",
      })
      .max(100, {
        error: "Limit must not exceed 100",
      })
      .default(10),

    status: orderStatusFilterSchema.optional(),

    sort: z
      .enum(["newest", "oldest"], {
        error: "Invalid sort option",
      })
      .default("newest"),
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

type ListOrdersRequest = z.infer<typeof listOrdersRequestSchema>;

type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusRequestSchema>;

export {
  createOrderRequestSchema,
  listOrdersRequestSchema,
  orderByIdRequestSchema,
  updateOrderStatusRequestSchema,
};

export type {
  CreateOrderRequest,
  ListOrdersRequest,
  OrderByIdRequest,
  UpdateOrderStatusRequest,
};
