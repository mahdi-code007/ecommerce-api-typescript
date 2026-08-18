import { Router } from "express";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  getCoupon,
  updateCoupon,
} from "../controllers/adminCouponController";
import { protect, restrictTo } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  couponByIdRequestSchema,
  createCouponRequestSchema,
  listCouponsRequestSchema,
  updateCouponRequestSchema,
} from "../schemas/couponSchema";

const router = Router();

router.use(protect, restrictTo("admin"));

router
  .route("/")
  .get(
    validate(listCouponsRequestSchema),
    getAllCoupons,
  )
  .post(
    validate(createCouponRequestSchema),
    createCoupon,
  );

router
  .route("/:couponId")
  .get(
    validate(couponByIdRequestSchema),
    getCoupon,
  )
  .patch(
    validate(updateCouponRequestSchema),
    updateCoupon,
  )
  .delete(
    validate(couponByIdRequestSchema),
    deleteCoupon,
  );

export = router;
