import { Router } from "express";
import { validateCoupon } from "../controllers/couponController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import { validateCouponRequestSchema } from "../schemas/couponSchema";

const router = Router();

router.use(protect);

router.post(
  "/validate",
  validate(validateCouponRequestSchema),
  validateCoupon,
);

export = router;
