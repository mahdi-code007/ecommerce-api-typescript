import type {
  NextFunction,
  Request,
  Response,
} from "express";
import * as addressRepository from "../db/repositories/addressRepository";
import type {
  AddressByIdRequest,
  CreateAddressRequest,
  UpdateAddressRequest,
} from "../schemas/addressSchema";
import AppError = require("../utils/AppError");
import getValidated = require("../utils/getValidated");

const MAX_ADDRESSES_PER_USER = 10;

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }

  return req.user.id;
};

// @desc List the current user's addresses
// @route GET /api/v1/addresses
// @access private
export const getAddresses = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const addresses = await addressRepository.listAddressesByUserId(userId);

  res.status(200).json({
    status: "success",
    results: addresses.length,
    data: { addresses },
  });
};

// @desc Create a shipping address
// @route POST /api/v1/addresses
// @access private
export const createAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { body } = getValidated<CreateAddressRequest>(req);
  const existingCount =
    await addressRepository.countAddressesByUserId(userId);

  if (existingCount >= MAX_ADDRESSES_PER_USER) {
    next(
      new AppError(
        "You can save up to 10 addresses",
        400,
      ),
    );
    return;
  }

  const address = await addressRepository.createAddress(userId, {
    ...body,
    isDefault: existingCount === 0 ? true : Boolean(body.isDefault),
  });

  res.status(201).json({
    status: "success",
    data: { address },
    message: "Address created successfully",
  });
};

// @desc Get one of the current user's addresses
// @route GET /api/v1/addresses/:addressId
// @access private
export const getAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<AddressByIdRequest>(req);
  const address = await addressRepository.findAddressByIdForUser(
    userId,
    params.addressId,
  );

  if (!address) {
    next(new AppError("Address not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { address },
  });
};

// @desc Update one of the current user's addresses
// @route PATCH /api/v1/addresses/:addressId
// @access private
export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params, body } = getValidated<UpdateAddressRequest>(req);
  const address = await addressRepository.updateAddressByIdForUser(
    userId,
    params.addressId,
    body,
  );

  if (!address) {
    next(new AppError("Address not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { address },
    message: "Address updated successfully",
  });
};

// @desc Set an address as the default shipping address
// @route PATCH /api/v1/addresses/:addressId/default
// @access private
export const setDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<AddressByIdRequest>(req);
  const address = await addressRepository.setDefaultAddressForUser(
    userId,
    params.addressId,
  );

  if (!address) {
    next(new AppError("Address not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    data: { address },
    message: "Default address updated successfully",
  });
};

// @desc Delete one of the current user's addresses
// @route DELETE /api/v1/addresses/:addressId
// @access private
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  const { params } = getValidated<AddressByIdRequest>(req);
  const address = await addressRepository.deleteAddressByIdForUser(
    userId,
    params.addressId,
  );

  if (!address) {
    next(new AppError("Address not found", 404));
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Address deleted successfully",
  });
};
