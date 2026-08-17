import { count, desc, eq } from "drizzle-orm";
import slugify from "slugify";
import { getPostgresDatabase } from "../../config/postgres";
import { categories, type Category } from "../schema";

type CreateCategoryInput = {
  name: string;
  description?: string;
  image?: string;
};

type UpdateCategoryInput = {
  name?: string;
  description?: string;
  image?: string;
};

type FindAllCategoriesParams = {
  page: number;
  limit: number;
};

type FindAllCategoriesResult = {
  categories: Category[];
  total: number;
};

const buildSlug = (name: string): string =>
  slugify(name, {
    lower: true,
    strict: true,
  });

const createCategory = async (
  input: CreateCategoryInput,
): Promise<Category> => {
  const db = getPostgresDatabase();

  const [category] = await db
    .insert(categories)
    .values({
      name: input.name,
      slug: buildSlug(input.name),
      description: input.description,
      image: input.image,
    })
    .returning();

  if (!category) {
    throw new Error("Failed to create category");
  }

  return category;
};

const findAllCategories = async ({
  page,
  limit,
}: FindAllCategoriesParams): Promise<FindAllCategoriesResult> => {
  const db = getPostgresDatabase();
  const offset = (page - 1) * limit;

  const [totalResult] = await db
    .select({ total: count() })
    .from(categories);

  const rows = await db
    .select()
    .from(categories)
    .orderBy(desc(categories.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    categories: rows,
    total: totalResult?.total ?? 0,
  };
};

const findCategoryById = async (
  id: string,
): Promise<Category | null> => {
  const db = getPostgresDatabase();

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return category ?? null;
};

const updateCategoryById = async (
  id: string,
  input: UpdateCategoryInput,
): Promise<Category | null> => {
  const db = getPostgresDatabase();

  const updateValues: Partial<typeof categories.$inferInsert> & {
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateValues.name = input.name;
    updateValues.slug = buildSlug(input.name);
  }

  if (input.description !== undefined) {
    updateValues.description = input.description;
  }

  if (input.image !== undefined) {
    updateValues.image = input.image;
  }

  const [category] = await db
    .update(categories)
    .set(updateValues)
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
};

const deleteCategoryById = async (
  id: string,
): Promise<Category | null> => {
  const db = getPostgresDatabase();

  const [category] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
};

export {
  createCategory,
  findAllCategories,
  findCategoryById,
  updateCategoryById,
  deleteCategoryById,
};

export type {
  CreateCategoryInput,
  UpdateCategoryInput,
  FindAllCategoriesParams,
  FindAllCategoriesResult,
};
