import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  coupons,
  orderItems,
  orders,
  products,
} from "../schema";

type StatsRange = "7d" | "30d" | "90d";

type GetOverviewParams = {
  range: StatsRange;
  from?: string;
  to?: string;
  timezone: string;
  lowStockThreshold: number;
  topLimit: number;
};

type OverviewKpis = {
  revenue: number;
  ordersCount: number;
  cancelledOrdersCount: number;
  averageOrderValue: number;
  discountTotal: number;
  pendingOrdersCount: number;
  productsCount: number;
  inactiveProductsCount: number;
  lowStockCount: number;
  activeCouponsCount: number;
};

type SeriesPoint = {
  date: string;
  revenue: number;
  ordersCount: number;
  cancelledOrdersCount: number;
};

type StatusBreakdownItem = {
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  count: number;
};

type PaymentStatusBreakdownItem = {
  paymentStatus: "unpaid" | "paid";
  count: number;
};

type TopProduct = {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  ordersCount: number;
};

type TopCity = {
  city: string;
  ordersCount: number;
  revenue: number;
};

type TopCoupon = {
  couponId: string | null;
  code: string;
  ordersCount: number;
  discountTotal: number;
  revenue: number;
};

type LowStockProduct = {
  id: string;
  name: string;
  stock: number;
  isActive: boolean;
  productType: "simple" | "variable";
};

type OverviewResult = {
  from: string;
  to: string;
  timezone: string;
  range: StatsRange | null;
  granularity: "day" | "week";
  kpis: OverviewKpis;
  series: {
    granularity: "day" | "week";
    points: SeriesPoint[];
  };
  statusBreakdown: StatusBreakdownItem[];
  paymentStatusBreakdown: PaymentStatusBreakdownItem[];
  topProducts: TopProduct[];
  topCities: TopCity[];
  topCoupons: TopCoupon[];
  lowStockProducts: LowStockProduct[];
};

const RANGE_DAYS: Record<StatsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const ORDER_STATUSES: StatusBreakdownItem["status"][] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES: PaymentStatusBreakdownItem["paymentStatus"][] = [
  "unpaid",
  "paid",
];

const toInteger = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const queryRows = async <T>(query: ReturnType<typeof sql>): Promise<T[]> => {
  const db = getPostgresDatabase();
  const result = await db.execute(query);

  if (Array.isArray(result)) {
    return result as T[];
  }

  return (result as { rows: T[] }).rows;
};

const resolveWindow = async (params: GetOverviewParams): Promise<{
  from: Date;
  toExclusive: Date;
  range: StatsRange | null;
  timezone: string;
}> => {
  const { timezone } = params;

  if (params.from && params.to) {
    const [row] = await queryRows<{
      window_from: Date | string;
      window_to_exclusive: Date | string;
    }>(sql`
      SELECT
        (${params.from}::date::timestamp AT TIME ZONE ${timezone}) AS window_from,
        ((${params.to}::date + 1)::timestamp AT TIME ZONE ${timezone}) AS window_to_exclusive
    `);

    if (!row) {
      throw new Error("Failed to resolve custom stats window");
    }

    return {
      from: new Date(row.window_from),
      toExclusive: new Date(row.window_to_exclusive),
      range: null,
      timezone,
    };
  }

  const days = RANGE_DAYS[params.range];
  const [row] = await queryRows<{
    window_from: Date | string;
    window_to_exclusive: Date | string;
  }>(sql`
    SELECT
      (
        (date_trunc('day', now() AT TIME ZONE ${timezone})
          - (${days - 1} * interval '1 day'))
        AT TIME ZONE ${timezone}
      ) AS window_from,
      (
        (date_trunc('day', now() AT TIME ZONE ${timezone}) + interval '1 day')
        AT TIME ZONE ${timezone}
      ) AS window_to_exclusive
  `);

  if (!row) {
    throw new Error("Failed to resolve stats window");
  }

  return {
    from: new Date(row.window_from),
    toExclusive: new Date(row.window_to_exclusive),
    range: params.range,
    timezone,
  };
};

const getOverview = async (
  params: GetOverviewParams,
): Promise<OverviewResult> => {
  const db = getPostgresDatabase();
  const window = await resolveWindow(params);
  const { from, toExclusive, timezone, range } = window;
  const dayCount =
    (toExclusive.getTime() - from.getTime()) / 86_400_000;
  const granularity: "day" | "week" = dayCount > 90 ? "week" : "day";
  const truncUnit = granularity;
  const stepInterval =
    granularity === "week" ? sql`interval '1 week'` : sql`interval '1 day'`;
  const inWindow = and(
    gte(orders.createdAt, from),
    lt(orders.createdAt, toExclusive),
  );

  const [
    [windowTotals],
    [pendingRow],
    [catalogRow],
    [couponRow],
    statusRows,
    paymentRows,
    topProductRows,
    topCityRows,
    topCouponRows,
    lowStockRows,
    seriesRows,
  ] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.total} else 0 end), 0)::int`,
        ordersCount: sql<number>`coalesce(count(*) filter (where ${orders.status} <> 'cancelled'), 0)::int`,
        cancelledOrdersCount: sql<number>`coalesce(count(*) filter (where ${orders.status} = 'cancelled'), 0)::int`,
        discountTotal: sql<number>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.discountAmount} else 0 end), 0)::int`,
      })
      .from(orders)
      .where(inWindow),
    db
      .select({
        total: count(),
      })
      .from(orders)
      .where(eq(orders.status, "pending")),
    db
      .select({
        productsCount: sql<number>`count(*)::int`,
        inactiveProductsCount: sql<number>`count(*) filter (where ${products.isActive} = false)::int`,
        lowStockCount: sql<number>`count(*) filter (where ${products.stock} <= ${params.lowStockThreshold})::int`,
      })
      .from(products),
    db
      .select({
        total: count(),
      })
      .from(coupons)
      .where(eq(coupons.isActive, true)),
    db
      .select({
        status: orders.status,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(inWindow)
      .groupBy(orders.status),
    db
      .select({
        paymentStatus: orders.paymentStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(inWindow)
      .groupBy(orders.paymentStatus),
    db
      .select({
        productId: orderItems.productId,
        productName: sql<string>`max(${orderItems.productName})`,
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::int`,
        ordersCount: sql<number>`count(distinct ${orderItems.orderId})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(inWindow, ne(orders.status, "cancelled")))
      .groupBy(orderItems.productId)
      .orderBy(
        desc(sql`sum(${orderItems.lineTotal})`),
        desc(sql`sum(${orderItems.quantity})`),
      )
      .limit(params.topLimit),
    db
      .select({
        city: orders.shippingCity,
        ordersCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      })
      .from(orders)
      .where(and(inWindow, ne(orders.status, "cancelled")))
      .groupBy(orders.shippingCity)
      .orderBy(desc(sql`sum(${orders.total})`), desc(sql`count(*)`))
      .limit(5),
    db
      .select({
        code: orders.couponCode,
        ordersCount: sql<number>`count(*)::int`,
        discountTotal: sql<number>`coalesce(sum(${orders.discountAmount}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          inWindow,
          ne(orders.status, "cancelled"),
          isNotNull(orders.couponCode),
        ),
      )
      .groupBy(orders.couponCode)
      .orderBy(desc(sql`count(*)`), desc(sql`sum(${orders.discountAmount})`))
      .limit(5),
    db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        isActive: products.isActive,
        productType: products.productType,
      })
      .from(products)
      .where(lte(products.stock, params.lowStockThreshold))
      .orderBy(asc(products.stock), asc(products.name), asc(products.id))
      .limit(10),
    queryRows<SeriesPoint>(sql`
      SELECT
        to_char(bucket, 'YYYY-MM-DD') AS date,
        coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.total} else 0 end), 0)::int AS revenue,
        coalesce(count(${orders.id}) filter (where ${orders.status} <> 'cancelled'), 0)::int AS "ordersCount",
        coalesce(count(${orders.id}) filter (where ${orders.status} = 'cancelled'), 0)::int AS "cancelledOrdersCount"
      FROM generate_series(
        date_trunc(${truncUnit}, ${from} AT TIME ZONE ${timezone}),
        date_trunc(${truncUnit}, (${toExclusive} AT TIME ZONE ${timezone}) - interval '1 millisecond'),
        ${stepInterval}
      ) AS bucket
      LEFT JOIN ${orders} ON
        date_trunc(${truncUnit}, ${orders.createdAt} AT TIME ZONE ${timezone}) = bucket
        AND ${orders.createdAt} >= ${from}
        AND ${orders.createdAt} < ${toExclusive}
      GROUP BY bucket
      ORDER BY bucket
    `),
  ]);

  const revenue = toInteger(windowTotals?.revenue);
  const ordersCount = toInteger(windowTotals?.ordersCount);
  const cancelledOrdersCount = toInteger(windowTotals?.cancelledOrdersCount);
  const discountTotal = toInteger(windowTotals?.discountTotal);
  const statusCounts = new Map(
    statusRows.map((row) => [row.status, toInteger(row.count)]),
  );
  const paymentCounts = new Map(
    paymentRows.map((row) => [row.paymentStatus, toInteger(row.count)]),
  );
  const couponCodes = topCouponRows
    .map((row) => row.code)
    .filter((code): code is string => Boolean(code));
  const couponIdByCode = new Map<string, string>();

  if (couponCodes.length > 0) {
    const couponMatches = await db
      .select({
        id: coupons.id,
        code: coupons.code,
      })
      .from(coupons)
      .where(inArray(coupons.code, couponCodes));

    for (const coupon of couponMatches) {
      couponIdByCode.set(coupon.code, coupon.id);
    }
  }

  return {
    from: from.toISOString(),
    to: new Date(toExclusive.getTime() - 1).toISOString(),
    timezone,
    range,
    granularity,
    kpis: {
      revenue,
      ordersCount,
      cancelledOrdersCount,
      averageOrderValue:
        ordersCount === 0 ? 0 : Math.round(revenue / ordersCount),
      discountTotal,
      pendingOrdersCount: toInteger(pendingRow?.total),
      productsCount: toInteger(catalogRow?.productsCount),
      inactiveProductsCount: toInteger(catalogRow?.inactiveProductsCount),
      lowStockCount: toInteger(catalogRow?.lowStockCount),
      activeCouponsCount: toInteger(couponRow?.total),
    },
    series: {
      granularity,
      points: seriesRows.map((row) => ({
        date: row.date,
        revenue: toInteger(row.revenue),
        ordersCount: toInteger(row.ordersCount),
        cancelledOrdersCount: toInteger(row.cancelledOrdersCount),
      })),
    },
    statusBreakdown: ORDER_STATUSES.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    paymentStatusBreakdown: PAYMENT_STATUSES.map((paymentStatus) => ({
      paymentStatus,
      count: paymentCounts.get(paymentStatus) ?? 0,
    })),
    topProducts: topProductRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      quantitySold: toInteger(row.quantitySold),
      revenue: toInteger(row.revenue),
      ordersCount: toInteger(row.ordersCount),
    })),
    topCities: topCityRows.map((row) => ({
      city: row.city,
      ordersCount: toInteger(row.ordersCount),
      revenue: toInteger(row.revenue),
    })),
    topCoupons: topCouponRows
      .filter((row): row is typeof row & { code: string } => row.code !== null)
      .map((row) => ({
        couponId: couponIdByCode.get(row.code) ?? null,
        code: row.code,
        ordersCount: toInteger(row.ordersCount),
        discountTotal: toInteger(row.discountTotal),
        revenue: toInteger(row.revenue),
      })),
    lowStockProducts: lowStockRows,
  };
};

export { getOverview };

export type { GetOverviewParams, OverviewResult };
