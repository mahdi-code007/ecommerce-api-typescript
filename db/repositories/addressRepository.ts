import { and, asc, count, desc, eq } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import { addresses, type Address } from "../schema";

type CreateAddressInput = {
  label?: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building?: string;
  notes?: string;
  isDefault: boolean;
};

type UpdateAddressInput = {
  label?: string | null;
  fullName?: string;
  phone?: string;
  city?: string;
  district?: string;
  street?: string;
  building?: string | null;
  notes?: string | null;
  isDefault?: boolean;
};

const clearDefaultForUser = async (
  tx: ReturnType<typeof getPostgresDatabase>,
  userId: string,
): Promise<void> => {
  await tx
    .update(addresses)
    .set({
      isDefault: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(addresses.userId, userId),
        eq(addresses.isDefault, true),
      ),
    );
};

const countAddressesByUserId = async (
  userId: string,
): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({
      total: count(),
    })
    .from(addresses)
    .where(eq(addresses.userId, userId));

  return result?.total ?? 0;
};

const findAddressByIdForUser = async (
  userId: string,
  addressId: string,
): Promise<Address | null> => {
  const db = getPostgresDatabase();

  const [address] = await db
    .select()
    .from(addresses)
    .where(
      and(
        eq(addresses.id, addressId),
        eq(addresses.userId, userId),
      ),
    )
    .limit(1);

  return address ?? null;
};

const listAddressesByUserId = async (
  userId: string,
): Promise<Address[]> => {
  const db = getPostgresDatabase();

  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
};

const createAddress = async (
  userId: string,
  input: CreateAddressInput,
): Promise<Address> => {
  const db = getPostgresDatabase();

  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await clearDefaultForUser(tx, userId);
    }

    const [address] = await tx
      .insert(addresses)
      .values({
        userId,
        label: input.label,
        fullName: input.fullName,
        phone: input.phone,
        city: input.city,
        district: input.district,
        street: input.street,
        building: input.building,
        notes: input.notes,
        isDefault: input.isDefault,
      })
      .returning();

    if (!address) {
      throw new Error("Failed to create address");
    }

    return address;
  });
};

const updateAddressByIdForUser = async (
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
): Promise<Address | null> => {
  const existing = await findAddressByIdForUser(userId, addressId);

  if (!existing) {
    return null;
  }

  const db = getPostgresDatabase();

  return db.transaction(async (tx) => {
    const shouldBecomeDefault = input.isDefault === true;

    if (shouldBecomeDefault) {
      await clearDefaultForUser(tx, userId);
    }

    const { isDefault: _ignoredIfFalse, ...fields } = input;

    const [address] = await tx
      .update(addresses)
      .set({
        ...fields,
        ...(shouldBecomeDefault
          ? {
              isDefault: true,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.userId, userId),
        ),
      )
      .returning();

    return address ?? null;
  });
};

const setDefaultAddressForUser = async (
  userId: string,
  addressId: string,
): Promise<Address | null> => {
  const existing = await findAddressByIdForUser(userId, addressId);

  if (!existing) {
    return null;
  }

  const db = getPostgresDatabase();

  return db.transaction(async (tx) => {
    await clearDefaultForUser(tx, userId);

    const [address] = await tx
      .update(addresses)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.userId, userId),
        ),
      )
      .returning();

    return address ?? null;
  });
};

const deleteAddressByIdForUser = async (
  userId: string,
  addressId: string,
): Promise<Address | null> => {
  const existing = await findAddressByIdForUser(userId, addressId);

  if (!existing) {
    return null;
  }

  const db = getPostgresDatabase();

  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.userId, userId),
        ),
      )
      .returning();

    if (!deleted) {
      return null;
    }

    if (deleted.isDefault) {
      const [oldestRemaining] = await tx
        .select()
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(asc(addresses.createdAt))
        .limit(1);

      if (oldestRemaining) {
        await tx
          .update(addresses)
          .set({
            isDefault: true,
            updatedAt: new Date(),
          })
          .where(eq(addresses.id, oldestRemaining.id));
      }
    }

    return deleted;
  });
};

export {
  countAddressesByUserId,
  findAddressByIdForUser,
  listAddressesByUserId,
  createAddress,
  updateAddressByIdForUser,
  setDefaultAddressForUser,
  deleteAddressByIdForUser,
};

export type {
  CreateAddressInput,
  UpdateAddressInput,
};
