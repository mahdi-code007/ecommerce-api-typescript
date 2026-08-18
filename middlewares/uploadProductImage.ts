import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";
import AppError = require("../utils/AppError");

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError("Image must be jpeg, png, or webp", 400));
      return;
    }

    callback(null, true);
  },
});

const uploadProductImage: RequestHandler = (req, res, next) => {
  upload.single("image")(req, res, (error: unknown) => {
    if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Image must be 2MB or smaller", 400));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    if (!req.file) {
      next(new AppError("Image file is required", 400));
      return;
    }

    next();
  });
};

export { uploadProductImage };
