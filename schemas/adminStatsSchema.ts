import { z } from "zod";

const dateOnlySchema = z
  .string({
    error: "Date must be a string",
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    error: "Date must be YYYY-MM-DD",
  });

const supportedTimeZones = new Set(Intl.supportedValuesOf("timeZone"));

const calendarDaysInclusive = (from: string, to: string): number => {
  const fromUtc = Date.parse(`${from}T00:00:00Z`);
  const toUtc = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((toUtc - fromUtc) / 86_400_000) + 1;
};

const getOverviewQuerySchema = z
  .strictObject({
    range: z
      .enum(["7d", "30d", "90d"], {
        error: "Invalid range",
      })
      .default("30d"),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    timezone: z
      .string({
        error: "Timezone must be a string",
      })
      .trim()
      .min(1, {
        error: "Timezone is required",
      })
      .default("Asia/Riyadh")
      .refine((value) => supportedTimeZones.has(value), {
        error: "Invalid timezone",
      }),
    lowStockThreshold: z.coerce
      .number({
        error: "lowStockThreshold must be a number",
      })
      .int({
        error: "lowStockThreshold must be an integer",
      })
      .min(0, {
        error: "lowStockThreshold cannot be negative",
      })
      .max(1000, {
        error: "lowStockThreshold must not exceed 1000",
      })
      .default(5),
    topLimit: z.coerce
      .number({
        error: "topLimit must be a number",
      })
      .int({
        error: "topLimit must be an integer",
      })
      .min(1, {
        error: "topLimit must be at least 1",
      })
      .max(20, {
        error: "topLimit must not exceed 20",
      })
      .default(5),
  })
  .superRefine((data, ctx) => {
    if (
      (data.from === undefined && data.to !== undefined) ||
      (data.from !== undefined && data.to === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "from and to are required together",
        path: data.from === undefined ? ["from"] : ["to"],
      });
      return;
    }

    if (data.from === undefined || data.to === undefined) {
      return;
    }

    if (data.from > data.to) {
      ctx.addIssue({
        code: "custom",
        message: "from must be less than or equal to to",
        path: ["to"],
      });
      return;
    }

    if (calendarDaysInclusive(data.from, data.to) > 366) {
      ctx.addIssue({
        code: "custom",
        message: "Date window must not exceed 366 days",
        path: ["to"],
      });
    }
  });

const getOverviewRequestSchema = z.object({
  query: getOverviewQuerySchema,
});

type GetOverviewRequest = z.infer<typeof getOverviewRequestSchema>;

export { getOverviewRequestSchema };

export type { GetOverviewRequest };
