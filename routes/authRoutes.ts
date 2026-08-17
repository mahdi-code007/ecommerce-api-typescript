import { Router } from "express";
import { getMe, login, register } from "../controllers/authController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  loginUserRequestSchema,
  registerUserRequestSchema,
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

router.get(
  "/me",
  protect,
  getMe,
);

export = router;
