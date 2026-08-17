import { and, desc, eq } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  products,
  reviews,
  users,
  type Review,
} from "../schema";

type ReviewUserSummary = {
  id: string;
  name: string;
};

type ReviewView = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: ReviewUserSummary;
};

type CreateReviewInput = {
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
};

type UpdateReviewInput = {
  rating?: number;
  comment?: string;
};

const mapReviewView = (row: {
  review: Review;
  user: ReviewUserSummary;
}): ReviewView => ({
  id: row.review.id,
  rating: row.review.rating,
  comment: row.review.comment,
  createdAt: row.review.createdAt,
  updatedAt: row.review.updatedAt,
  user: row.user,
});

const loadReviewViewById = async (
  reviewId: string,
): Promise<ReviewView | null> => {
  const db = getPostgresDatabase();

  const [row] = await db
    .select({
      review: reviews,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.id, reviewId))
    .limit(1);

  return row ? mapReviewView(row) : null;
};

const syncProductRating = async (
  tx: ReturnType<typeof getPostgresDatabase>,
  productId: string,
): Promise<void> => {
  const rows = await tx
    .select({
      rating: reviews.rating,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId));

  const ratingsCount = rows.length;
  const ratingAverage =
    ratingsCount === 0
      ? 0
      : rows.reduce((total, row) => total + row.rating, 0) / ratingsCount;

  await tx
    .update(products)
    .set({
      ratingAverage,
      ratingsCount,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
};

const listReviewsByProductId = async (
  productId: string,
): Promise<ReviewView[]> => {
  const db = getPostgresDatabase();

  const rows = await db
    .select({
      review: reviews,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));

  return rows.map(mapReviewView);
};

const findReviewByUserAndProduct = async (
  userId: string,
  productId: string,
): Promise<Review | null> => {
  const db = getPostgresDatabase();

  const [review] = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, userId),
        eq(reviews.productId, productId),
      ),
    )
    .limit(1);

  return review ?? null;
};

const createReview = async (
  input: CreateReviewInput,
): Promise<ReviewView> => {
  const db = getPostgresDatabase();

  const created = await db.transaction(async (tx) => {
    const [review] = await tx
      .insert(reviews)
      .values({
        userId: input.userId,
        productId: input.productId,
        rating: input.rating,
        comment: input.comment,
      })
      .returning();

    if (!review) {
      throw new Error("Failed to create review");
    }

    await syncProductRating(tx, input.productId);

    return review;
  });

  const review = await loadReviewViewById(created.id);

  if (!review) {
    throw new Error("Failed to load created review");
  }

  return review;
};

const updateReviewByUserAndProduct = async (
  userId: string,
  productId: string,
  input: UpdateReviewInput,
): Promise<ReviewView | null> => {
  const existing = await findReviewByUserAndProduct(userId, productId);

  if (!existing) {
    return null;
  }

  const db = getPostgresDatabase();

  await db.transaction(async (tx) => {
    const updateValues: Partial<typeof reviews.$inferInsert> & {
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (input.rating !== undefined) {
      updateValues.rating = input.rating;
    }

    if (input.comment !== undefined) {
      updateValues.comment = input.comment;
    }

    await tx
      .update(reviews)
      .set(updateValues)
      .where(eq(reviews.id, existing.id));

    await syncProductRating(tx, productId);
  });

  return loadReviewViewById(existing.id);
};

export {
  listReviewsByProductId,
  findReviewByUserAndProduct,
  createReview,
  updateReviewByUserAndProduct,
};

export type {
  ReviewView,
  CreateReviewInput,
  UpdateReviewInput,
};
