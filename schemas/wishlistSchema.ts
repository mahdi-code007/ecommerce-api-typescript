import { z } from "zod";

const productIdSchema = z.uuid({
  error: "Invalid product id",
});

const addWishlistItemRequestSchema = z.object({
  body: z.strictObject({
    productId: productIdSchema,
  }),
});

const wishlistItemByProductIdRequestSchema = z.object({
  params: z.strictObject({
    productId: productIdSchema,
  }),
});

type AddWishlistItemRequest = z.infer<typeof addWishlistItemRequestSchema>;

type WishlistItemByProductIdRequest = z.infer<
  typeof wishlistItemByProductIdRequestSchema
>;

export {
  addWishlistItemRequestSchema,
  wishlistItemByProductIdRequestSchema,
};

export type {
  AddWishlistItemRequest,
  WishlistItemByProductIdRequest,
};
