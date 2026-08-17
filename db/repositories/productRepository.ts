import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lte,
  type SQL,
} from "drizzle-orm";
import slugify from "slugify";
import { getPostgresDatabase } from "../../config/postgres";
import { categories, products, type Product } from "../schema";

type CreateProductInput = {
  name: string;
  description?: string;
  priceInMinorUnits: number;
  stock: number;
  categoryId: string;
  image?: string;
  isActive?: boolean;
};

type UpdateProductInput = {
  name?: string;
  description?: string;
  priceInMinorUnits?: number;
  stock?: number;
  categoryId?: string;
  image?: string;
  isActive?: boolean;
};

type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating_desc";

type FindAllProductsParams = {
  page: number;
  limit: number;
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort: ProductSort;
};

type ProductCategorySummary = {
  id: string;
  name: string;
  slug: string;
};

type ProductWithCategory = Product & {
  category: ProductCategorySummary;
};

type FindAllProductsResult = {
  products: ProductWithCategory[];
  total: number;
};

const productWithCategorySelect = {
  product: products,
  category: {
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
  },
};

const buildSlug = (name: string): string =>
  slugify(name, {
    lower: true,
    strict: true,
  });

const escapeIlikePattern = (value: string): string =>
  value.replace(/[%_\\]/g, "\\$&");

const mapProductWithCategory = (row: {
  product: Product;
  category: ProductCategorySummary;
}): ProductWithCategory => ({
  ...row.product,
  category: row.category,
});

const getSortColumns = (sort: ProductSort) => {
  switch (sort) {
    case "price_asc":
      return [
        asc(products.priceInMinorUnits),
        desc(products.createdAt),
        desc(products.id),
      ];
    case "price_desc":
      return [
        desc(products.priceInMinorUnits),
        desc(products.createdAt),
        desc(products.id),
      ];
    case "rating_desc":
      return [
        desc(products.ratingAverage),
        desc(products.ratingsCount),
        desc(products.createdAt),
        desc(products.id),
      ];
    default:
      return [desc(products.createdAt), desc(products.id)];
  }
};

const buildCatalogFilters = ({
  categoryId,
  search,
  minPrice,
  maxPrice,
  inStock,
}: Omit<FindAllProductsParams, "page" | "limit" | "sort">): SQL[] => {
  const filters: SQL[] = [eq(products.isActive, true)];

  if (search !== undefined) {
    filters.push(
      ilike(products.name, `%${escapeIlikePattern(search)}%`),
    );
  }

  if (categoryId !== undefined) {
    filters.push(eq(products.categoryId, categoryId));
  }

  if (minPrice !== undefined) {
    filters.push(gte(products.priceInMinorUnits, minPrice));
  }

  if (maxPrice !== undefined) {
    filters.push(lte(products.priceInMinorUnits, maxPrice));
  }

  if (inStock !== undefined) {
    filters.push(
      inStock ? gt(products.stock, 0) : eq(products.stock, 0),
    );
  }

  return filters;
};

const findProductById = async (
  id: string,
): Promise<ProductWithCategory | null> => {
  const db = getPostgresDatabase();

  const [row] = await db
    .select(productWithCategorySelect)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);

  return row ? mapProductWithCategory(row) : null;
};

const createProduct = async (
  input: CreateProductInput,
): Promise<ProductWithCategory> => {
  const db = getPostgresDatabase();

  const [created] = await db
    .insert(products)
    .values({
      name: input.name,
      slug: buildSlug(input.name),
      description: input.description,
      priceInMinorUnits: input.priceInMinorUnits,
      stock: input.stock,
      categoryId: input.categoryId,
      image: input.image,
      isActive: input.isActive,
    })
    .returning({
      id: products.id,
    });

  if (!created) {
    throw new Error("Failed to create product");
  }

  const product = await findProductById(created.id);

  if (!product) {
    throw new Error("Failed to load created product");
  }

  return product;
};

const findAllProducts = async (
  params: FindAllProductsParams,
): Promise<FindAllProductsResult> => {
  const db = getPostgresDatabase();
  const { page, limit, sort } = params;
  const offset = (page - 1) * limit;
  const filters = buildCatalogFilters(params);
  const whereClause = and(...filters);

  const [totalResult] = await db
    .select({ total: count() })
    .from(products)
    .where(whereClause);

  const rows = await db
    .select(productWithCategorySelect)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(whereClause)
    .orderBy(...getSortColumns(sort))
    .limit(limit)
    .offset(offset);

  return {
    products: rows.map(mapProductWithCategory),
    total: totalResult?.total ?? 0,
  };
};

const updateProductById = async (
  id: string,
  input: UpdateProductInput,
): Promise<ProductWithCategory | null> => {
  const db = getPostgresDatabase();

  const updateValues: Partial<typeof products.$inferInsert> & {
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

  if (input.priceInMinorUnits !== undefined) {
    updateValues.priceInMinorUnits = input.priceInMinorUnits;
  }

  if (input.stock !== undefined) {
    updateValues.stock = input.stock;
  }

  if (input.categoryId !== undefined) {
    updateValues.categoryId = input.categoryId;
  }

  if (input.image !== undefined) {
    updateValues.image = input.image;
  }

  if (input.isActive !== undefined) {
    updateValues.isActive = input.isActive;
  }

  const [updated] = await db
    .update(products)
    .set(updateValues)
    .where(eq(products.id, id))
    .returning({
      id: products.id,
    });

  if (!updated) {
    return null;
  }

  return findProductById(updated.id);
};

const deleteProductById = async (
  id: string,
): Promise<Product | null> => {
  const db = getPostgresDatabase();

  const [product] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning();

  return product ?? null;
};

const countProductsByCategoryId = async (
  categoryId: string,
): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.categoryId, categoryId));

  return result?.total ?? 0;
};

export {
  createProduct,
  findAllProducts,
  findProductById,
  updateProductById,
  deleteProductById,
  countProductsByCategoryId,
};

export type {
  CreateProductInput,
  UpdateProductInput,
  FindAllProductsParams,
  FindAllProductsResult,
  ProductWithCategory,
  ProductSort,
};
