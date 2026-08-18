import { Router } from "express";
import { getAllAdminProducts } from "../controllers/adminProductController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import { listAdminProductsRequestSchema } from "../schemas/adminProductSchema";

const router = Router();

router.use(protect, restrictTo("admin"));

router.get(
  "/",
  validate(listAdminProductsRequestSchema),
  getAllAdminProducts,
);

export = router;
