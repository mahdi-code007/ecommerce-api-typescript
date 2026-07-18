import mongoose from "mongoose";
import slugify from "slugify";

interface ICategory {
  name: string;
  description: string;
  image?: string;
  slug?: string;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [3, "Category name must be at least 3 characters long"],
      maxlength: [50, "Category name must be less than 50 characters long"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be less than 500 characters"],
      default: "No description provided",
    },
    image: { type: String },
    slug: { type: String, unique: true, lowercase: true, index: true },
  },
  { timestamps: true },
);

// توليد slug تلقائياً من الاسم إذا لم يُرسل من العميل
categorySchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
});

const Category = mongoose.model<ICategory>(
  "Category",
  categorySchema,
);

export = Category;
