import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  type SQL,
} from "drizzle-orm";
import slugify from "slugify";
import { deleteProductImageDirectory } from "../../utils/localImageStorage";
import { getPostgresDatabase } from "../../config/postgres";
import * as categoryRepository from "./categoryRepository";
import * as productImageRepository from "./productImageRepository";
import * as variantRepository from "./variantRepository";
import {
  brands,
  categories,
  orderItems,
  productVariants,
  products,
  type Product,
  type ProductType,
} from "../schema";

type CreateProductInput = {
  name: string;
  description?: string;
  productType?: ProductType;
  priceInMinorUnits?: number;
  stock?: number;
  categoryId: string;
  brandId?: string | null;
  image?: string;
  isActive?: boolean;
  options?: variantRepository.OptionInput[];
  variants?: variantRepository.VariantInput[];
};

type UpdateProductInput = {
  name?: string;
  description?: string;
  priceInMinorUnits?: number;
  stock?: number;
  categoryId?: string;
  brandId?: string | null;
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
  brandId?: string;
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
  parentId: string | null;
};

type ProductBrandSummary = {
  id: string;
  name: string;
  slug: string;
};

type ProductWithCategoryAndBrand = Product & {
  category: ProductCategorySummary;
  brand: ProductBrandSummary | null;
  priceMaxInMinorUnits: number;
  options: variantRepository.OptionSummary[];
  variants: variantRepository.VariantView[] | null;
  images: productImageRepository.ProductImageView[] | null;
};

type FindAllProductsResult = {
  products: ProductWithCategoryAndBrand[];
  total: number;
};

const productWithRelationsSelect = {
  product: products,
  category: {
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
    parentId: categories.parentId,
  },
  brand: {
    id: brands.id,
    name: brands.name,
    slug: brands.slug,
  },
};

const buildSlug = (name: string): string =>
  slugify(name, {
    lower: true,
    strict: true,
  });

const escapeIlikePattern = (value: string): string =>
  value.replace(/[%_\\]/g, "\\$&");

const mapProductWithRelations = (
  row: {
    product: Product;
    category: ProductCategorySummary;
    brand: ProductBrandSummary | null;
  },
  extras?: {
    priceMaxInMinorUnits?: number;
    options?: variantRepository.OptionSummary[];
    variants?: variantRepository.VariantView[] | null;
    images?: productImageRepository.ProductImageView[] | null;
  },
): ProductWithCategoryAndBrand => ({
  ...row.product,
  category: row.category,
  brand: row.brand?.id ? row.brand : null,
  priceMaxInMinorUnits:
    extras?.priceMaxInMinorUnits ?? row.product.priceInMinorUnits,
  options: extras?.options ?? [],
  variants: extras?.variants ?? null,
  images: extras?.images ?? null,
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
  categoryIds,
  brandId,
  search,
  minPrice,
  maxPrice,
  inStock,
}: {
  categoryIds?: string[];
  brandId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}): SQL[] => {
  const filters: SQL[] = [eq(products.isActive, true)];

  if (search !== undefined) {
    filters.push(
      ilike(products.name, `%${escapeIlikePattern(search)}%`),
    );
  }

  if (categoryIds !== undefined && categoryIds.length > 0) {
    filters.push(inArray(products.categoryId, categoryIds));
  }

  if (brandId !== undefined) {
    filters.push(eq(products.brandId, brandId));
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
  options?: {
    includeVariants?: boolean;
    includeImages?: boolean;
  },
): Promise<ProductWithCategoryAndBrand | null> => {
  const db = getPostgresDatabase();

  const [row] = await db
    .select(productWithRelationsSelect)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const images = options?.includeImages
    ? await productImageRepository.loadImagesForProduct(id)
    : null;

  if (row.product.productType !== "variable") {
    return mapProductWithRelations(row, {
      priceMaxInMinorUnits: row.product.priceInMinorUnits,
      options: [],
      variants: null,
      images,
    });
  }

  const details = await variantRepository.loadOptionsAndVariants(id);
  const maxPrices = await variantRepository.loadMaxPricesByProductIds([id]);

  return mapProductWithRelations(row, {
    priceMaxInMinorUnits:
      maxPrices.get(id) ?? row.product.priceInMinorUnits,
    options: details.optionSummaries,
    variants: options?.includeVariants ? details.variants : null,
    images,
  });
};

const createProduct = async (
  input: CreateProductInput,
): Promise<ProductWithCategoryAndBrand> => {
  const db = getPostgresDatabase();
  const productType = input.productType ?? "simple";

  if (productType === "variable") {
    if (!input.options || !input.variants) {
      throw new Error("invalid_options");
    }

    const createdId = await db.transaction(async (tx) => {
      const firstVariant = input.variants?.[0];

      const [created] = await tx
        .insert(products)
        .values({
          name: input.name,
          slug: buildSlug(input.name),
          description: input.description,
          productType,
          priceInMinorUnits: firstVariant?.priceInMinorUnits ?? 1,
          stock: 0,
          categoryId: input.categoryId,
          brandId: input.brandId ?? null,
          image: input.image,
          isActive: input.isActive,
        })
        .returning({
          id: products.id,
        });

      if (!created) {
        throw new Error("Failed to create product");
      }

      await variantRepository.createOptionsAndVariants(
        tx,
        created.id,
        input.options ?? [],
        input.variants ?? [],
      );

      return created.id;
    });

    const product = await findProductById(createdId, {
      includeVariants: true,
      includeImages: true,
    });

    if (!product) {
      throw new Error("Failed to load created product");
    }

    return product;
  }

  const [created] = await db
    .insert(products)
    .values({
      name: input.name,
      slug: buildSlug(input.name),
      description: input.description,
      productType: "simple",
      priceInMinorUnits: input.priceInMinorUnits ?? 1,
      stock: input.stock ?? 0,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      image: input.image,
      isActive: input.isActive,
    })
    .returning({
      id: products.id,
    });

  if (!created) {
    throw new Error("Failed to create product");
  }

  const product = await findProductById(created.id, {
    includeImages: true,
  });

  if (!product) {
    throw new Error("Failed to load created product");
  }

  return product;
};

const findAllProducts = async (
  params: FindAllProductsParams,
): Promise<FindAllProductsResult> => {
  const db = getPostgresDatabase();
  const { page, limit, sort, categoryId, brandId } = params;
  const offset = (page - 1) * limit;

  const categoryIds =
    categoryId !== undefined
      ? await categoryRepository.resolveCategoryIdsForFilter(categoryId)
      : undefined;

  const filters = buildCatalogFilters({
    categoryIds,
    brandId,
    search: params.search,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    inStock: params.inStock,
  });
  const whereClause = and(...filters);

  const [totalResult] = await db
    .select({ total: count() })
    .from(products)
    .where(whereClause);

  const rows = await db
    .select(productWithRelationsSelect)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(whereClause)
    .orderBy(...getSortColumns(sort))
    .limit(limit)
    .offset(offset);

  return {
    products: await attachCatalogExtras(rows.map((row) => mapProductWithRelations(row))),
    total: totalResult?.total ?? 0,
  };
};

const attachCatalogExtras = async (
  catalogProducts: ProductWithCategoryAndBrand[],
): Promise<ProductWithCategoryAndBrand[]> => {
  const variableIds = catalogProducts
    .filter((product) => product.productType === "variable")
    .map((product) => product.id);

  const [optionSummaries, maxPrices] = await Promise.all([
    variantRepository.loadOptionSummariesByProductIds(variableIds),
    variantRepository.loadMaxPricesByProductIds(variableIds),
  ]);

  return catalogProducts.map((product) => {
    if (product.productType !== "variable") {
      return {
        ...product,
        priceMaxInMinorUnits: product.priceInMinorUnits,
        options: [],
        variants: null,
        images: null,
      };
    }

    return {
      ...product,
      priceMaxInMinorUnits:
        maxPrices.get(product.id) ?? product.priceInMinorUnits,
      options: optionSummaries.get(product.id) ?? [],
      variants: null,
      images: null,
    };
  });
};

const updateProductById = async (
  id: string,
  input: UpdateProductInput,
): Promise<ProductWithCategoryAndBrand | null> => {
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

  if (input.brandId !== undefined) {
    updateValues.brandId = input.brandId;
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

  return findProductById(updated.id, {
    includeVariants: true,
    includeImages: true,
  });
};

type DeleteProductResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "in_use" };

const deleteProductById = async (
  id: string,
): Promise<DeleteProductResult> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  if (product.productType === "variable") {
    const variants = await db
      .select({
        id: productVariants.id,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    const variantIds = variants.map((variant) => variant.id);

    if (variantIds.length > 0) {
      const [usage] = await db
        .select({ total: count() })
        .from(orderItems)
        .where(inArray(orderItems.variantId, variantIds));

      if ((usage?.total ?? 0) > 0) {
        return { ok: false, reason: "in_use" };
      }

      await db
        .delete(productVariants)
        .where(inArray(productVariants.id, variantIds));
    }
  }

  await db.delete(products).where(eq(products.id, id));
  await deleteProductImageDirectory(id);

  return { ok: true };
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

const countProductsByBrandId = async (brandId: string): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.brandId, brandId));

  return result?.total ?? 0;
};

export {
  countProductsByBrandId,
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
  ProductWithCategoryAndBrand,
  ProductSort,
  DeleteProductResult,
};
