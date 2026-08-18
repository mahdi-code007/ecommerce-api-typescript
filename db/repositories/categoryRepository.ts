import { and, asc, count, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import slugify from "slugify";
import { getPostgresDatabase } from "../../config/postgres";
import { categories, type Category } from "../schema";

type CategorySummary = {
  id: string;
  name: string;
  slug: string;
};

type CategoryView = Category & {
  parent: CategorySummary | null;
  subcategories: CategorySummary[];
};

type CreateCategoryInput = {
  name: string;
  description?: string;
  image?: string;
  parentId?: string | null;
};

type UpdateCategoryInput = {
  name?: string;
  description?: string;
  image?: string;
  parentId?: string | null;
};

type FindAllCategoriesParams = {
  page: number;
  limit: number;
  parentId?: string;
  rootsOnly?: boolean;
};

type FindAllCategoriesResult = {
  categories: Category[];
  total: number;
};

type ValidateParentResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "parent_not_found"
        | "self_parent"
        | "parent_not_root"
        | "has_subcategories";
    };

const buildSlug = (name: string): string =>
  slugify(name, {
    lower: true,
    strict: true,
  });

const mapCategorySummary = (category: Category): CategorySummary => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
});

const findDirectChildCategoryIds = async (
  categoryId: string,
): Promise<string[]> => {
  const db = getPostgresDatabase();

  const rows = await db
    .select({
      id: categories.id,
    })
    .from(categories)
    .where(eq(categories.parentId, categoryId));

  return rows.map((row) => row.id);
};

const resolveCategoryIdsForFilter = async (
  categoryId: string,
): Promise<string[]> => {
  const childIds = await findDirectChildCategoryIds(categoryId);
  return [categoryId, ...childIds];
};

const expandCategoryIdsWithDescendants = async (
  categoryIds: string[],
): Promise<string[]> => {
  if (categoryIds.length === 0) {
    return [];
  }

  const db = getPostgresDatabase();

  const childRows = await db
    .select({
      id: categories.id,
    })
    .from(categories)
    .where(inArray(categories.parentId, categoryIds));

  const expanded = new Set(categoryIds);

  for (const row of childRows) {
    expanded.add(row.id);
  }

  return [...expanded];
};

const countChildCategories = async (parentId: string): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({ total: count() })
    .from(categories)
    .where(eq(categories.parentId, parentId));

  return result?.total ?? 0;
};

const validateParentAssignment = async (
  parentId: string | null | undefined,
  categoryId?: string,
): Promise<ValidateParentResult> => {
  if (parentId === undefined || parentId === null) {
    return { ok: true };
  }

  if (categoryId && parentId === categoryId) {
    return { ok: false, reason: "self_parent" };
  }

  const db = getPostgresDatabase();

  const [parent] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, parentId))
    .limit(1);

  if (!parent) {
    return { ok: false, reason: "parent_not_found" };
  }

  if (parent.parentId !== null) {
    return { ok: false, reason: "parent_not_root" };
  }

  if (categoryId) {
    const childCount = await countChildCategories(categoryId);

    if (childCount > 0) {
      return { ok: false, reason: "has_subcategories" };
    }
  }

  return { ok: true };
};

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
      parentId: input.parentId ?? null,
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
  parentId,
  rootsOnly,
}: FindAllCategoriesParams): Promise<FindAllCategoriesResult> => {
  const db = getPostgresDatabase();
  const offset = (page - 1) * limit;
  const filters: SQL[] = [];

  if (rootsOnly) {
    filters.push(isNull(categories.parentId));
  }

  if (parentId !== undefined) {
    filters.push(eq(categories.parentId, parentId));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const [totalResult] = await db
    .select({ total: count() })
    .from(categories)
    .where(whereClause);

  const rows = await db
    .select()
    .from(categories)
    .where(whereClause)
    .orderBy(desc(categories.createdAt), asc(categories.id))
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

const findCategoryViewById = async (
  id: string,
): Promise<CategoryView | null> => {
  const category = await findCategoryById(id);

  if (!category) {
    return null;
  }

  const db = getPostgresDatabase();

  let parent: CategorySummary | null = null;

  if (category.parentId) {
    const [parentCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, category.parentId))
      .limit(1);

    parent = parentCategory ? mapCategorySummary(parentCategory) : null;
  }

  const childRows = await db
    .select()
    .from(categories)
    .where(eq(categories.parentId, category.id))
    .orderBy(asc(categories.name), asc(categories.id));

  return {
    ...category,
    parent,
    subcategories: childRows.map(mapCategorySummary),
  };
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

  if (input.parentId !== undefined) {
    updateValues.parentId = input.parentId;
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
  countChildCategories,
  createCategory,
  expandCategoryIdsWithDescendants,
  findAllCategories,
  findCategoryById,
  findCategoryViewById,
  findDirectChildCategoryIds,
  resolveCategoryIdsForFilter,
  updateCategoryById,
  deleteCategoryById,
  validateParentAssignment,
};

export type {
  CategorySummary,
  CategoryView,
  CreateCategoryInput,
  UpdateCategoryInput,
  FindAllCategoriesParams,
  FindAllCategoriesResult,
  ValidateParentResult,
};
