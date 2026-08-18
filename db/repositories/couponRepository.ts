import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import * as categoryRepository from "./categoryRepository";
import {
  categories,
  couponCategories,
  couponProducts,
  couponUsages,
  coupons,
  products,
  type Coupon,
  type CouponScope,
  type DiscountType,
} from "../schema";

type DatabaseClient = ReturnType<typeof getPostgresDatabase>;

type CartLineItem = {
  productId: string;
  categoryId: string;
  lineTotal: number;
};

type CouponSummary = {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
};

type CouponView = Coupon & {
  categoryIds: string[];
  productIds: string[];
};

type CouponValidationReason =
  | "not_found"
  | "inactive"
  | "not_yet_active"
  | "expired"
  | "usage_limit_reached"
  | "per_user_limit_reached"
  | "min_order_not_met"
  | "no_eligible_items";

type ValidateCouponResult =
  | {
      ok: true;
      coupon: CouponSummary;
      discountAmount: number;
      eligibleSubtotal: number;
      subtotal: number;
      total: number;
    }
  | {
      ok: false;
      reason: CouponValidationReason;
    };

type CreateCouponInput = {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive?: boolean;
  usageLimit?: number;
  usageLimitPerUser?: number;
  scope: CouponScope;
  categoryIds?: string[];
  productIds?: string[];
};

type UpdateCouponInput = Partial<CreateCouponInput>;

type ListCouponsParams = {
  page: number;
  limit: number;
  isActive?: boolean;
};

type ListCouponsResult = {
  coupons: CouponView[];
  total: number;
};

type DeleteCouponResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "in_use" };

const normalizeCouponCode = (code: string): string =>
  code.trim().toUpperCase();

const mapCouponSummary = (coupon: Coupon): CouponSummary => ({
  id: coupon.id,
  code: coupon.code,
  name: coupon.name,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
});

const loadScopeIds = async (
  db: DatabaseClient,
  couponId: string,
): Promise<{ categoryIds: string[]; productIds: string[] }> => {
  const categoryRows = await db
    .select({
      categoryId: couponCategories.categoryId,
    })
    .from(couponCategories)
    .where(eq(couponCategories.couponId, couponId));

  const productRows = await db
    .select({
      productId: couponProducts.productId,
    })
    .from(couponProducts)
    .where(eq(couponProducts.couponId, couponId));

  return {
    categoryIds: categoryRows.map((row) => row.categoryId),
    productIds: productRows.map((row) => row.productId),
  };
};

const mapCouponView = async (
  db: DatabaseClient,
  coupon: Coupon,
): Promise<CouponView> => {
  const scopeIds = await loadScopeIds(db, coupon.id);

  return {
    ...coupon,
    ...scopeIds,
  };
};

const calculateEligibleSubtotal = (
  coupon: Coupon,
  cartLineItems: CartLineItem[],
  categoryIds: string[],
  productIds: string[],
): number => {
  if (coupon.scope === "all") {
    return cartLineItems.reduce(
      (total, item) => total + item.lineTotal,
      0,
    );
  }

  if (coupon.scope === "category") {
    const allowedCategoryIds = new Set(categoryIds);

    return cartLineItems.reduce((total, item) => {
      if (allowedCategoryIds.has(item.categoryId)) {
        return total + item.lineTotal;
      }

      return total;
    }, 0);
  }

  const allowedProductIds = new Set(productIds);

  return cartLineItems.reduce((total, item) => {
    if (allowedProductIds.has(item.productId)) {
      return total + item.lineTotal;
    }

    return total;
  }, 0);
};

const calculateDiscountAmount = (
  coupon: Coupon,
  eligibleSubtotal: number,
): number => {
  if (eligibleSubtotal <= 0) {
    return 0;
  }

  if (coupon.discountType === "fixed_amount") {
    return Math.min(coupon.discountValue, eligibleSubtotal);
  }

  const rawDiscount = Math.floor(
    (eligibleSubtotal * coupon.discountValue) / 100,
  );
  const cappedDiscount =
    coupon.maxDiscountAmount === null ||
    coupon.maxDiscountAmount === undefined
      ? rawDiscount
      : Math.min(rawDiscount, coupon.maxDiscountAmount);

  return Math.min(cappedDiscount, eligibleSubtotal);
};

const countCouponUsages = async (
  db: DatabaseClient,
  couponId: string,
  userId?: string,
): Promise<number> => {
  const filters: SQL[] = [eq(couponUsages.couponId, couponId)];

  if (userId) {
    filters.push(eq(couponUsages.userId, userId));
  }

  const [result] = await db
    .select({
      total: count(),
    })
    .from(couponUsages)
    .where(and(...filters));

  return result?.total ?? 0;
};

const validateCouponRecord = async (
  db: DatabaseClient,
  coupon: Coupon,
  input: {
    userId: string;
    cartLineItems: CartLineItem[];
  },
): Promise<ValidateCouponResult> => {
  if (!coupon.isActive) {
    return { ok: false, reason: "inactive" };
  }

  const now = new Date();

  if (coupon.startsAt && now < coupon.startsAt) {
    return { ok: false, reason: "not_yet_active" };
  }

  if (coupon.endsAt && now > coupon.endsAt) {
    return { ok: false, reason: "expired" };
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined
  ) {
    const totalUsageCount = await countCouponUsages(db, coupon.id);

    if (totalUsageCount >= coupon.usageLimit) {
      return { ok: false, reason: "usage_limit_reached" };
    }
  }

  if (coupon.usageLimitPerUser !== null && coupon.usageLimitPerUser !== undefined) {
    const userUsageCount = await countCouponUsages(
      db,
      coupon.id,
      input.userId,
    );

    if (userUsageCount >= coupon.usageLimitPerUser) {
      return { ok: false, reason: "per_user_limit_reached" };
    }
  }

  const scopeIds = await loadScopeIds(db, coupon.id);
  const expandedCategoryIds =
    coupon.scope === "category"
      ? await categoryRepository.expandCategoryIdsWithDescendants(
          scopeIds.categoryIds,
        )
      : scopeIds.categoryIds;
  const subtotal = input.cartLineItems.reduce(
    (total, item) => total + item.lineTotal,
    0,
  );
  const eligibleSubtotal = calculateEligibleSubtotal(
    coupon,
    input.cartLineItems,
    expandedCategoryIds,
    scopeIds.productIds,
  );

  if (eligibleSubtotal <= 0) {
    return { ok: false, reason: "no_eligible_items" };
  }

  if (
    coupon.minOrderAmount !== null &&
    coupon.minOrderAmount !== undefined &&
    eligibleSubtotal < coupon.minOrderAmount
  ) {
    return { ok: false, reason: "min_order_not_met" };
  }

  const discountAmount = calculateDiscountAmount(
    coupon,
    eligibleSubtotal,
  );

  if (discountAmount < 1) {
    return { ok: false, reason: "no_eligible_items" };
  }

  return {
    ok: true,
    coupon: mapCouponSummary(coupon),
    discountAmount,
    eligibleSubtotal,
    subtotal,
    total: subtotal - discountAmount,
  };
};

const validateCouponForCart = async (
  input: {
    userId: string;
    code: string;
    cartLineItems: CartLineItem[];
  },
  db: DatabaseClient = getPostgresDatabase(),
): Promise<ValidateCouponResult> => {
  const normalizedCode = normalizeCouponCode(input.code);

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalizedCode))
    .limit(1);

  if (!coupon) {
    return { ok: false, reason: "not_found" };
  }

  return validateCouponRecord(db, coupon, input);
};

const validateLockedCouponForCart = async (
  db: DatabaseClient,
  coupon: Coupon,
  input: {
    userId: string;
    cartLineItems: CartLineItem[];
  },
): Promise<ValidateCouponResult> => {
  if (!coupon.isActive) {
    return { ok: false, reason: "inactive" };
  }

  return validateCouponRecord(db, coupon, input);
};

const lockCouponByCode = async (
  db: DatabaseClient,
  code: string,
): Promise<Coupon | null> => {
  const normalizedCode = normalizeCouponCode(code);

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalizedCode))
    .for("update")
    .limit(1);

  return coupon ?? null;
};

const recordCouponUsage = async (
  db: DatabaseClient,
  input: {
    couponId: string;
    userId: string;
    orderId: string;
    discountAmount: number;
  },
): Promise<void> => {
  await db.insert(couponUsages).values({
    couponId: input.couponId,
    userId: input.userId,
    orderId: input.orderId,
    discountAmount: input.discountAmount,
  });

  await db
    .update(coupons)
    .set({
      timesUsed: sql`${coupons.timesUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(coupons.id, input.couponId));
};

const releaseCouponUsageForOrder = async (
  db: DatabaseClient,
  orderId: string,
): Promise<void> => {
  const [usage] = await db
    .select()
    .from(couponUsages)
    .where(eq(couponUsages.orderId, orderId))
    .limit(1);

  if (!usage) {
    return;
  }

  await db
    .delete(couponUsages)
    .where(eq(couponUsages.id, usage.id));

  await db
    .update(coupons)
    .set({
      timesUsed: sql`${coupons.timesUsed} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(coupons.id, usage.couponId));
};

const assertScopeIdsExist = async (
  db: DatabaseClient,
  scope: CouponScope,
  categoryIds: string[],
  productIds: string[],
): Promise<void> => {
  if (scope === "category") {
    const rows = await db
      .select({
        id: categories.id,
      })
      .from(categories)
      .where(inArray(categories.id, categoryIds));

    if (rows.length !== categoryIds.length) {
      throw new Error("Category not found");
    }
  }

  if (scope === "product") {
    const rows = await db
      .select({
        id: products.id,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    if (rows.length !== productIds.length) {
      throw new Error("Product not found");
    }
  }
};

const replaceCouponScopeLinks = async (
  db: DatabaseClient,
  couponId: string,
  scope: CouponScope,
  categoryIds: string[],
  productIds: string[],
): Promise<void> => {
  await db
    .delete(couponCategories)
    .where(eq(couponCategories.couponId, couponId));

  await db
    .delete(couponProducts)
    .where(eq(couponProducts.couponId, couponId));

  if (scope === "category" && categoryIds.length > 0) {
    await db.insert(couponCategories).values(
      categoryIds.map((categoryId) => ({
        couponId,
        categoryId,
      })),
    );
  }

  if (scope === "product" && productIds.length > 0) {
    await db.insert(couponProducts).values(
      productIds.map((productId) => ({
        couponId,
        productId,
      })),
    );
  }
};

const resolveScopeIds = (
  scope: CouponScope,
  categoryIds?: string[],
  productIds?: string[],
): { categoryIds: string[]; productIds: string[] } => {
  if (scope === "all") {
    return {
      categoryIds: [],
      productIds: [],
    };
  }

  if (scope === "category") {
    return {
      categoryIds: categoryIds ?? [],
      productIds: [],
    };
  }

  return {
    categoryIds: [],
    productIds: productIds ?? [],
  };
};

const createCoupon = async (
  input: CreateCouponInput,
): Promise<CouponView> => {
  const db = getPostgresDatabase();
  const normalizedCode = normalizeCouponCode(input.code);
  const scopeIds = resolveScopeIds(
    input.scope,
    input.categoryIds,
    input.productIds,
  );

  await assertScopeIdsExist(
    db,
    input.scope,
    scopeIds.categoryIds,
    scopeIds.productIds,
  );

  const [coupon] = await db
    .insert(coupons)
    .values({
      code: normalizedCode,
      name: input.name,
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxDiscountAmount: input.maxDiscountAmount,
      minOrderAmount: input.minOrderAmount,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive ?? true,
      usageLimit: input.usageLimit,
      usageLimitPerUser: input.usageLimitPerUser,
      scope: input.scope,
    })
    .returning();

  if (!coupon) {
    throw new Error("Failed to create coupon");
  }

  await replaceCouponScopeLinks(
    db,
    coupon.id,
    input.scope,
    scopeIds.categoryIds,
    scopeIds.productIds,
  );

  return mapCouponView(db, coupon);
};

const listCoupons = async ({
  page,
  limit,
  isActive,
}: ListCouponsParams): Promise<ListCouponsResult> => {
  const db = getPostgresDatabase();
  const offset = (page - 1) * limit;
  const filters: SQL[] = [];

  if (isActive !== undefined) {
    filters.push(eq(coupons.isActive, isActive));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const [totalResult] = await db
    .select({
      total: count(),
    })
    .from(coupons)
    .where(whereClause);

  const rows = await db
    .select()
    .from(coupons)
    .where(whereClause)
    .orderBy(desc(coupons.createdAt), asc(coupons.id))
    .limit(limit)
    .offset(offset);

  const couponViews = await Promise.all(
    rows.map((coupon) => mapCouponView(db, coupon)),
  );

  return {
    coupons: couponViews,
    total: totalResult?.total ?? 0,
  };
};

const findCouponById = async (
  couponId: string,
): Promise<CouponView | null> => {
  const db = getPostgresDatabase();

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, couponId))
    .limit(1);

  if (!coupon) {
    return null;
  }

  return mapCouponView(db, coupon);
};

const updateCoupon = async (
  couponId: string,
  input: UpdateCouponInput,
): Promise<CouponView | null> => {
  const db = getPostgresDatabase();

  const existing = await findCouponById(couponId);

  if (!existing) {
    return null;
  }

  const nextScope = input.scope ?? existing.scope;
  const nextCategoryIds =
    input.categoryIds ??
    (input.scope !== undefined ? [] : existing.categoryIds);
  const nextProductIds =
    input.productIds ??
    (input.scope !== undefined ? [] : existing.productIds);
  const scopeIds = resolveScopeIds(
    nextScope,
    nextCategoryIds,
    nextProductIds,
  );

  await assertScopeIdsExist(
    db,
    nextScope,
    scopeIds.categoryIds,
    scopeIds.productIds,
  );

  const updateValues: Partial<Coupon> = {
    updatedAt: new Date(),
  };

  if (input.code !== undefined) {
    updateValues.code = normalizeCouponCode(input.code);
  }

  if (input.name !== undefined) {
    updateValues.name = input.name;
  }

  if (input.description !== undefined) {
    updateValues.description = input.description;
  }

  if (input.discountType !== undefined) {
    updateValues.discountType = input.discountType;
  }

  if (input.discountValue !== undefined) {
    updateValues.discountValue = input.discountValue;
  }

  if (input.maxDiscountAmount !== undefined) {
    updateValues.maxDiscountAmount = input.maxDiscountAmount;
  }

  if (input.minOrderAmount !== undefined) {
    updateValues.minOrderAmount = input.minOrderAmount;
  }

  if (input.startsAt !== undefined) {
    updateValues.startsAt = input.startsAt;
  }

  if (input.endsAt !== undefined) {
    updateValues.endsAt = input.endsAt;
  }

  if (input.isActive !== undefined) {
    updateValues.isActive = input.isActive;
  }

  if (input.usageLimit !== undefined) {
    updateValues.usageLimit = input.usageLimit;
  }

  if (input.usageLimitPerUser !== undefined) {
    updateValues.usageLimitPerUser = input.usageLimitPerUser;
  }

  if (input.scope !== undefined) {
    updateValues.scope = input.scope;
  }

  const [updated] = await db
    .update(coupons)
    .set(updateValues)
    .where(eq(coupons.id, couponId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update coupon");
  }

  if (
    input.scope !== undefined ||
    input.categoryIds !== undefined ||
    input.productIds !== undefined
  ) {
    await replaceCouponScopeLinks(
      db,
      couponId,
      nextScope,
      scopeIds.categoryIds,
      scopeIds.productIds,
    );
  }

  return mapCouponView(db, updated);
};

const deleteCoupon = async (
  couponId: string,
): Promise<DeleteCouponResult> => {
  const db = getPostgresDatabase();

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, couponId))
    .limit(1);

  if (!coupon) {
    return { ok: false, reason: "not_found" };
  }

  if (coupon.timesUsed > 0) {
    return { ok: false, reason: "in_use" };
  }

  await db.delete(coupons).where(eq(coupons.id, couponId));

  return { ok: true };
};

export {
  calculateDiscountAmount,
  calculateEligibleSubtotal,
  createCoupon,
  deleteCoupon,
  findCouponById,
  listCoupons,
  lockCouponByCode,
  normalizeCouponCode,
  recordCouponUsage,
  releaseCouponUsageForOrder,
  updateCoupon,
  validateCouponForCart,
  validateLockedCouponForCart,
};

export type {
  CartLineItem,
  CouponSummary,
  CouponValidationReason,
  CouponView,
  CreateCouponInput,
  DeleteCouponResult,
  ListCouponsParams,
  UpdateCouponInput,
  ValidateCouponResult,
};
