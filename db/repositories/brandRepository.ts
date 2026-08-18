import { count, desc, eq } from "drizzle-orm";
import slugify from "slugify";
import { getPostgresDatabase } from "../../config/postgres";
import { brands, products, type Brand } from "../schema";

type CreateBrandInput = {
  name: string;
  logo?: string;
};

type UpdateBrandInput = {
  name?: string;
  logo?: string;
};

type FindAllBrandsParams = {
  page: number;
  limit: number;
};

type FindAllBrandsResult = {
  brands: Brand[];
  total: number;
};

const buildSlug = (name: string): string =>
  slugify(name, {
    lower: true,
    strict: true,
  });

const createBrand = async (input: CreateBrandInput): Promise<Brand> => {
  const db = getPostgresDatabase();

  const [brand] = await db
    .insert(brands)
    .values({
      name: input.name,
      slug: buildSlug(input.name),
      logo: input.logo,
    })
    .returning();

  if (!brand) {
    throw new Error("Failed to create brand");
  }

  return brand;
};

const findAllBrands = async ({
  page,
  limit,
}: FindAllBrandsParams): Promise<FindAllBrandsResult> => {
  const db = getPostgresDatabase();
  const offset = (page - 1) * limit;

  const [totalResult] = await db
    .select({ total: count() })
    .from(brands);

  const rows = await db
    .select()
    .from(brands)
    .orderBy(desc(brands.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    brands: rows,
    total: totalResult?.total ?? 0,
  };
};

const findBrandById = async (id: string): Promise<Brand | null> => {
  const db = getPostgresDatabase();

  const [brand] = await db
    .select()
    .from(brands)
    .where(eq(brands.id, id))
    .limit(1);

  return brand ?? null;
};

const updateBrandById = async (
  id: string,
  input: UpdateBrandInput,
): Promise<Brand | null> => {
  const db = getPostgresDatabase();

  const updateValues: Partial<typeof brands.$inferInsert> & {
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateValues.name = input.name;
    updateValues.slug = buildSlug(input.name);
  }

  if (input.logo !== undefined) {
    updateValues.logo = input.logo;
  }

  const [brand] = await db
    .update(brands)
    .set(updateValues)
    .where(eq(brands.id, id))
    .returning();

  return brand ?? null;
};

const deleteBrandById = async (id: string): Promise<Brand | null> => {
  const db = getPostgresDatabase();

  const [brand] = await db
    .delete(brands)
    .where(eq(brands.id, id))
    .returning();

  return brand ?? null;
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
  createBrand,
  deleteBrandById,
  findAllBrands,
  findBrandById,
  updateBrandById,
};

export type {
  CreateBrandInput,
  UpdateBrandInput,
  FindAllBrandsParams,
  FindAllBrandsResult,
};
