import { Router } from "express";
import {
  deleteMe,
  getMe,
  login,
  register,
  updateMe,
  updateMyPassword,
} from "../controllers/authController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  deleteMeRequestSchema,
  loginUserRequestSchema,
  registerUserRequestSchema,
  updateMeRequestSchema,
  updateMyPasswordRequestSchema,
} from "../schemas/authSchema";

const router = Router();

router.post(
  "/register",
  validate(registerUserRequestSchema),
  register,
);

router.post(
  "/login",
  validate(loginUserRequestSchema),
  login,
);

router.patch(
  "/me/password",
  protect,
  validate(updateMyPasswordRequestSchema),
  updateMyPassword,
);

router
  .route("/me")
  .get(protect, getMe)
  .patch(
    protect,
    validate(updateMeRequestSchema),
    updateMe,
  )
  .delete(
    protect,
    validate(deleteMeRequestSchema),
    deleteMe,
  );

export = router;
