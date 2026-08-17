import { Router } from "express";
import {
  createAddress,
  deleteAddress,
  getAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../controllers/addressController";
import { protect } from "../middlewares/auth";
import validate = require("../middlewares/validate");
import {
  addressByIdRequestSchema,
  createAddressRequestSchema,
  updateAddressRequestSchema,
} from "../schemas/addressSchema";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(getAddresses)
  .post(
    validate(createAddressRequestSchema),
    createAddress,
  );

router.patch(
  "/:addressId/default",
  validate(addressByIdRequestSchema),
  setDefaultAddress,
);

router
  .route("/:addressId")
  .get(
    validate(addressByIdRequestSchema),
    getAddress,
  )
  .patch(
    validate(updateAddressRequestSchema),
    updateAddress,
  )
  .delete(
    validate(addressByIdRequestSchema),
    deleteAddress,
  );

export = router;
