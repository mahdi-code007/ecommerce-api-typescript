import mongoose from "mongoose";
import slugify from "slugify";

interface IProduct {
  name: string;
  slug?: string;
  description?: string;
  priceInMinorUnits: number;
  stock: number;
  category: mongoose.Types.ObjectId;
  image?: string;
  isActive: boolean;
  ratingAverage: number;
  ratingsCount: number;
}

const productSchema = new mongoose.Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [
        3,
        "Product name must be at least 3 characters long",
      ],
      maxlength: [
        100,
        "Product name must be less than 100 characters long",
      ],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        "Description must be less than 2000 characters",
      ],
    },

    priceInMinorUnits: {
      type: Number,
      required: true,
      min: [
        1,
        "Product price must be greater than zero",
      ],
      validate: {
        validator: Number.isInteger,
        message: "Product price must be an integer",
      },
    },

    stock: {
      type: Number,
      required: true,
      min: [
        0,
        "Product stock cannot be negative",
      ],
      validate: {
        validator: Number.isInteger,
        message: "Product stock must be an integer",
      },
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    image: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    ratingAverage: {
      type: Number,
      min: [0, "Rating average cannot be less than zero"],
      max: [5, "Rating average cannot exceed five"],
      default: 0,
    },

    ratingsCount: {
      type: Number,
      min: [0, "Ratings count cannot be negative"],
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
});

const Product = mongoose.model<IProduct>(
  "Product",
  productSchema,
);

export = Product;
