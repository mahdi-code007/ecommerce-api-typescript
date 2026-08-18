import { z } from "zod";

const productIdSchema = z.uuid({
  error: "Invalid product id",
});

const addFavoriteItemRequestSchema = z.object({
  body: z.strictObject({
    productId: productIdSchema,
  }),
});

const favoriteItemByProductIdRequestSchema = z.object({
  params: z.strictObject({
    productId: productIdSchema,
  }),
});

type AddFavoriteItemRequest = z.infer<typeof addFavoriteItemRequestSchema>;

type FavoriteItemByProductIdRequest = z.infer<
  typeof favoriteItemByProductIdRequestSchema
>;

export {
  addFavoriteItemRequestSchema,
  favoriteItemByProductIdRequestSchema,
};

export type {
  AddFavoriteItemRequest,
  FavoriteItemByProductIdRequest,
};
