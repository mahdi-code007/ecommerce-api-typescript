import type { Request, Response } from "express";
import * as productRepository from "../db/repositories/productRepository";
import type { ListAdminProductsRequest } from "../schemas/adminProductSchema";
import getValidated = require("../utils/getValidated");

// @desc List all products for admin, including inactive
// @route GET /api/v1/admin/products
// @access private/admin
export const getAllAdminProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { query } = getValidated<ListAdminProductsRequest>(req);
  const { page, limit } = query;
  const { products, total } =
    await productRepository.findAllAdminProducts(query);
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    status: "success",
    data: { products },
    pagination: {
      total,
      totalPages,
      page,
      limit,
    },
  });
};
