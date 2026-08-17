import { z } from "zod";

const productIdSchema = z.uuid({
  error: "Invalid product id",
});

const cartItemIdSchema = z.uuid({
  error: "Invalid cart item id",
});

const quantitySchema = z
  .number({
    error: (issue) =>
      issue.input === undefined
        ? "Quantity is required"
        : "Quantity must be a number",
  })
  .int({
    error: "Quantity must be an integer",
  })
  .min(1, {
    error: "Quantity must be at least 1",
  });

const addCartItemSchema = z.strictObject({
  productId: productIdSchema,
  quantity: quantitySchema,
});

const addCartItemRequestSchema = z.object({
  body: addCartItemSchema,
});

const updateCartItemSchema = z.strictObject({
  quantity: quantitySchema,
});

const updateCartItemRequestSchema = z.object({
  params: z.strictObject({
    itemId: cartItemIdSchema,
  }),
  body: updateCartItemSchema,
});

const cartItemByIdRequestSchema = z.object({
  params: z.strictObject({
    itemId: cartItemIdSchema,
  }),
});

type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>;

type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>;

type CartItemByIdRequest = z.infer<typeof cartItemByIdRequestSchema>;

export {
  addCartItemRequestSchema,
  updateCartItemRequestSchema,
  cartItemByIdRequestSchema,
};

export type {
  AddCartItemRequest,
  UpdateCartItemRequest,
  CartItemByIdRequest,
};
