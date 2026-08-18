import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  orderItems,
  productOptionValues,
  productOptions,
  productVariantValues,
  productVariants,
  products,
  type ProductOption,
  type ProductOptionValue,
  type ProductVariant,
} from "../schema";

type DatabaseClient = ReturnType<typeof getPostgresDatabase>;

type OptionInput = {
  name: string;
  values: string[];
};

type VariantOptionMap = Record<string, string>;

type VariantInput = {
  optionValues: VariantOptionMap;
  priceInMinorUnits: number;
  stock: number;
  sku?: string;
  isActive?: boolean;
};

type OptionSummary = {
  name: string;
  values: string[];
};

type OptionView = {
  id: string;
  name: string;
  position: number;
  values: Array<{
    id: string;
    value: string;
    position: number;
  }>;
};

type VariantView = {
  id: string;
  sku: string | null;
  priceInMinorUnits: number;
  stock: number;
  isActive: boolean;
  label: string;
  optionValues: VariantOptionMap;
};

type ProductOptionsAndVariants = {
  options: OptionView[];
  optionSummaries: OptionSummary[];
  variants: VariantView[];
};

type VariantWriteResult =
  | { ok: true; variant: VariantView }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_variable"
        | "invalid_options"
        | "duplicate_combination"
        | "duplicate_sku"
        | "last_variant"
        | "in_use"
        | "limit_reached";
    };

const MAX_VARIANTS_PER_PRODUCT = 100;

const isUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;

  for (let index = 0; index < 5 && current; index += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }

    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : undefined;
  }

  return false;
};

const normalizeSku = (sku?: string): string | null => {
  const trimmed = sku?.trim();
  return trimmed ? trimmed : null;
};

const combinationKey = (optionValues: VariantOptionMap): string =>
  Object.keys(optionValues)
    .sort()
    .map((name) => `${name}=${optionValues[name]}`)
    .join("|");

const loadProductOptions = async (
  db: DatabaseClient,
  productId: string,
): Promise<Array<{ option: ProductOption; values: ProductOptionValue[] }>> => {
  const options = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(asc(productOptions.position), asc(productOptions.id));

  if (options.length === 0) {
    return [];
  }

  const optionIds = options.map((option) => option.id);
  const values = await db
    .select()
    .from(productOptionValues)
    .where(inArray(productOptionValues.optionId, optionIds))
    .orderBy(asc(productOptionValues.position), asc(productOptionValues.id));

  const valuesByOptionId = new Map<string, ProductOptionValue[]>();

  for (const value of values) {
    const existing = valuesByOptionId.get(value.optionId) ?? [];
    existing.push(value);
    valuesByOptionId.set(value.optionId, existing);
  }

  return options.map((option) => ({
    option,
    values: valuesByOptionId.get(option.id) ?? [],
  }));
};

const loadVariantsForProduct = async (
  db: DatabaseClient,
  productId: string,
  optionRows: Array<{ option: ProductOption; values: ProductOptionValue[] }>,
): Promise<VariantView[]> => {
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(asc(productVariants.createdAt), asc(productVariants.id));

  if (variants.length === 0) {
    return [];
  }

  const valueById = new Map<string, { optionName: string; value: string }>();

  for (const row of optionRows) {
    for (const value of row.values) {
      valueById.set(value.id, {
        optionName: row.option.name,
        value: value.value,
      });
    }
  }

  const variantIds = variants.map((variant) => variant.id);
  const links = await db
    .select()
    .from(productVariantValues)
    .where(inArray(productVariantValues.variantId, variantIds));

  const optionValuesByVariantId = new Map<string, VariantOptionMap>();

  for (const link of links) {
    const mapped = valueById.get(link.optionValueId);

    if (!mapped) {
      continue;
    }

    const existing = optionValuesByVariantId.get(link.variantId) ?? {};
    existing[mapped.optionName] = mapped.value;
    optionValuesByVariantId.set(link.variantId, existing);
  }

  return variants.map((variant) => {
    const optionValues = optionValuesByVariantId.get(variant.id) ?? {};
    const label = optionRows
      .map((row) => optionValues[row.option.name])
      .filter(Boolean)
      .join(" / ");

    return {
      id: variant.id,
      sku: variant.sku,
      priceInMinorUnits: variant.priceInMinorUnits,
      stock: variant.stock,
      isActive: variant.isActive,
      label,
      optionValues,
    };
  });
};

const loadOptionsAndVariants = async (
  productId: string,
  db: DatabaseClient = getPostgresDatabase(),
): Promise<ProductOptionsAndVariants> => {
  const optionRows = await loadProductOptions(db, productId);
  const variants = await loadVariantsForProduct(db, productId, optionRows);

  const options: OptionView[] = optionRows.map((row) => ({
    id: row.option.id,
    name: row.option.name,
    position: row.option.position,
    values: row.values.map((value) => ({
      id: value.id,
      value: value.value,
      position: value.position,
    })),
  }));

  return {
    options,
    optionSummaries: options.map((option) => ({
      name: option.name,
      values: option.values.map((value) => value.value),
    })),
    variants,
  };
};

const loadOptionSummariesByProductIds = async (
  productIds: string[],
): Promise<Map<string, OptionSummary[]>> => {
  const summaries = new Map<string, OptionSummary[]>();

  if (productIds.length === 0) {
    return summaries;
  }

  const db = getPostgresDatabase();
  const optionRows = await db
    .select()
    .from(productOptions)
    .where(inArray(productOptions.productId, productIds))
    .orderBy(asc(productOptions.position), asc(productOptions.id));

  if (optionRows.length === 0) {
    return summaries;
  }

  const values = await db
    .select()
    .from(productOptionValues)
    .where(
      inArray(
        productOptionValues.optionId,
        optionRows.map((option) => option.id),
      ),
    )
    .orderBy(asc(productOptionValues.position), asc(productOptionValues.id));

  const valuesByOptionId = new Map<string, string[]>();

  for (const value of values) {
    const existing = valuesByOptionId.get(value.optionId) ?? [];
    existing.push(value.value);
    valuesByOptionId.set(value.optionId, existing);
  }

  for (const option of optionRows) {
    const existing = summaries.get(option.productId) ?? [];
    existing.push({
      name: option.name,
      values: valuesByOptionId.get(option.id) ?? [],
    });
    summaries.set(option.productId, existing);
  }

  return summaries;
};

const loadMaxPricesByProductIds = async (
  productIds: string[],
): Promise<Map<string, number>> => {
  const maxPrices = new Map<string, number>();

  if (productIds.length === 0) {
    return maxPrices;
  }

  const db = getPostgresDatabase();
  const rows = await db
    .select({
      productId: productVariants.productId,
      maxPrice: sql<number>`max(${productVariants.priceInMinorUnits})`.mapWith(
        Number,
      ),
    })
    .from(productVariants)
    .where(
      and(
        inArray(productVariants.productId, productIds),
        eq(productVariants.isActive, true),
      ),
    )
    .groupBy(productVariants.productId);

  for (const row of rows) {
    maxPrices.set(row.productId, row.maxPrice);
  }

  return maxPrices;
};

const syncVariableProductCatalogCache = async (
  db: DatabaseClient,
  productId: string,
): Promise<void> => {
  const activeVariants = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.isActive, true),
      ),
    );

  const stock = activeVariants.reduce(
    (total, variant) => total + variant.stock,
    0,
  );
  const prices = activeVariants.map((variant) => variant.priceInMinorUnits);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 1;

  await db
    .update(products)
    .set({
      priceInMinorUnits: minPrice,
      stock,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
};

const resolveOptionValueIds = (
  optionRows: Array<{ option: ProductOption; values: ProductOptionValue[] }>,
  optionValues: VariantOptionMap,
): string[] | null => {
  if (Object.keys(optionValues).length !== optionRows.length) {
    return null;
  }

  const ids: string[] = [];

  for (const row of optionRows) {
    const selected = optionValues[row.option.name];
    const match = row.values.find((value) => value.value === selected);

    if (!selected || !match) {
      return null;
    }

    ids.push(match.id);
  }

  return ids;
};

const insertVariantRecord = async (
  db: DatabaseClient,
  productId: string,
  input: VariantInput,
  optionValueIds: string[],
): Promise<ProductVariant> => {
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId,
      sku: normalizeSku(input.sku),
      priceInMinorUnits: input.priceInMinorUnits,
      stock: input.stock,
      isActive: input.isActive ?? true,
    })
    .returning();

  if (!variant) {
    throw new Error("Failed to create variant");
  }

  await db.insert(productVariantValues).values(
    optionValueIds.map((optionValueId) => ({
      variantId: variant.id,
      optionValueId,
    })),
  );

  return variant;
};

const createOptionsAndVariants = async (
  db: DatabaseClient,
  productId: string,
  options: OptionInput[],
  variants: VariantInput[],
): Promise<void> => {
  const optionRows: Array<{ option: ProductOption; values: ProductOptionValue[] }> = [];

  for (const [optionIndex, optionInput] of options.entries()) {
    const [option] = await db
      .insert(productOptions)
      .values({
        productId,
        name: optionInput.name,
        position: optionIndex,
      })
      .returning();

    if (!option) {
      throw new Error("Failed to create product option");
    }

    const values: ProductOptionValue[] = [];

    for (const [valueIndex, value] of optionInput.values.entries()) {
      const [created] = await db
        .insert(productOptionValues)
        .values({
          optionId: option.id,
          value,
          position: valueIndex,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create option value");
      }

      values.push(created);
    }

    optionRows.push({ option, values });
  }

  const usedCombinations = new Set<string>();

  for (const variantInput of variants) {
    const key = combinationKey(variantInput.optionValues);

    if (usedCombinations.has(key)) {
      throw new Error("duplicate_combination");
    }

    usedCombinations.add(key);

    const optionValueIds = resolveOptionValueIds(
      optionRows,
      variantInput.optionValues,
    );

    if (!optionValueIds) {
      throw new Error("invalid_options");
    }

    try {
      await insertVariantRecord(db, productId, variantInput, optionValueIds);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("duplicate_sku");
      }

      throw error;
    }
  }

  await syncVariableProductCatalogCache(db, productId);
};

const findVariantById = async (
  variantId: string,
): Promise<ProductVariant | null> => {
  const db = getPostgresDatabase();

  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  return variant ?? null;
};

const countOrderItemsByVariantId = async (
  variantId: string,
): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({ total: count() })
    .from(orderItems)
    .where(eq(orderItems.variantId, variantId));

  return result?.total ?? 0;
};

const addVariant = async (
  productId: string,
  input: VariantInput,
): Promise<VariantWriteResult> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  if (product.productType !== "variable") {
    return { ok: false, reason: "not_variable" };
  }

  const existing = await loadOptionsAndVariants(productId, db);

  if (existing.variants.length >= MAX_VARIANTS_PER_PRODUCT) {
    return { ok: false, reason: "limit_reached" };
  }

  const key = combinationKey(input.optionValues);

  if (existing.variants.some((variant) => combinationKey(variant.optionValues) === key)) {
    return { ok: false, reason: "duplicate_combination" };
  }

  const optionRows = await loadProductOptions(db, productId);
  const optionValueIds = resolveOptionValueIds(optionRows, input.optionValues);

  if (!optionValueIds) {
    return { ok: false, reason: "invalid_options" };
  }

  try {
    await insertVariantRecord(db, productId, input, optionValueIds);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "duplicate_sku" };
    }

    throw error;
  }

  await syncVariableProductCatalogCache(db, productId);

  const refreshed = await loadOptionsAndVariants(productId, db);
  const variant = refreshed.variants.find(
    (item) => combinationKey(item.optionValues) === key,
  );

  if (!variant) {
    throw new Error("Failed to load created variant");
  }

  return { ok: true, variant };
};

const updateVariant = async (
  productId: string,
  variantId: string,
  input: {
    priceInMinorUnits?: number;
    stock?: number;
    sku?: string | null;
    isActive?: boolean;
  },
): Promise<VariantWriteResult> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  if (product.productType !== "variable") {
    return { ok: false, reason: "not_variable" };
  }

  const [existing] = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  if (input.isActive === false) {
    const remainingActive = await db
      .select({ total: count() })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.isActive, true),
        ),
      );

    if ((remainingActive[0]?.total ?? 0) <= 1 && existing.isActive) {
      return { ok: false, reason: "last_variant" };
    }
  }

  const updateValues: Partial<typeof productVariants.$inferInsert> & {
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.priceInMinorUnits !== undefined) {
    updateValues.priceInMinorUnits = input.priceInMinorUnits;
  }

  if (input.stock !== undefined) {
    updateValues.stock = input.stock;
  }

  if (input.sku !== undefined) {
    updateValues.sku = input.sku === null ? null : normalizeSku(input.sku);
  }

  if (input.isActive !== undefined) {
    updateValues.isActive = input.isActive;
  }

  try {
    await db
      .update(productVariants)
      .set(updateValues)
      .where(eq(productVariants.id, variantId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "duplicate_sku" };
    }

    throw error;
  }

  await syncVariableProductCatalogCache(db, productId);

  const refreshed = await loadOptionsAndVariants(productId, db);
  const variant = refreshed.variants.find((item) => item.id === variantId);

  if (!variant) {
    throw new Error("Failed to load updated variant");
  }

  return { ok: true, variant };
};

const deleteVariant = async (
  productId: string,
  variantId: string,
): Promise<VariantWriteResult> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  if (product.productType !== "variable") {
    return { ok: false, reason: "not_variable" };
  }

  const [existing] = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  const variantCount = await db
    .select({ total: count() })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  if ((variantCount[0]?.total ?? 0) <= 1) {
    return { ok: false, reason: "last_variant" };
  }

  const usageCount = await countOrderItemsByVariantId(variantId);

  if (usageCount > 0) {
    return { ok: false, reason: "in_use" };
  }

  await db
    .delete(productVariants)
    .where(eq(productVariants.id, variantId));

  await syncVariableProductCatalogCache(db, productId);

  return {
    ok: true,
    variant: {
      id: existing.id,
      sku: existing.sku,
      priceInMinorUnits: existing.priceInMinorUnits,
      stock: existing.stock,
      isActive: existing.isActive,
      label: "",
      optionValues: {},
    },
  };
};

export {
  addVariant,
  createOptionsAndVariants,
  deleteVariant,
  findVariantById,
  loadMaxPricesByProductIds,
  loadOptionSummariesByProductIds,
  loadOptionsAndVariants,
  syncVariableProductCatalogCache,
  updateVariant,
};

export type {
  DatabaseClient,
  OptionInput,
  OptionSummary,
  OptionView,
  ProductOptionsAndVariants,
  VariantInput,
  VariantView,
  VariantWriteResult,
};
