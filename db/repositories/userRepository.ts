import { eq, sql } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import { users, type User } from "../schema";

type PublicUser = Omit<User, "passwordHash">;

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

type UpdateUserInput = {
  name?: string;
  email?: string;
  passwordHash?: string;
};

const toPublicUser = (user: User): PublicUser => {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
};

const createUser = async (
  input: CreateUserInput,
): Promise<User> => {
  const db = getPostgresDatabase();

  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
};

const findUserByEmail = async (
  email: string,
): Promise<User | null> => {
  const db = getPostgresDatabase();
  const normalizedEmail = email.toLowerCase();

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  return user ?? null;
};

const findUserById = async (
  id: string,
): Promise<User | null> => {
  const db = getPostgresDatabase();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
};

const updateUserById = async (
  id: string,
  input: UpdateUserInput,
): Promise<User | null> => {
  const db = getPostgresDatabase();

  const updateValues: Partial<typeof users.$inferInsert> & {
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateValues.name = input.name;
  }

  if (input.email !== undefined) {
    updateValues.email = input.email;
  }

  if (input.passwordHash !== undefined) {
    updateValues.passwordHash = input.passwordHash;
  }

  const [user] = await db
    .update(users)
    .set(updateValues)
    .where(eq(users.id, id))
    .returning();

  return user ?? null;
};

const deleteUserById = async (
  id: string,
): Promise<User | null> => {
  const db = getPostgresDatabase();

  const [user] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning();

  return user ?? null;
};

export {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
  deleteUserById,
  toPublicUser,
};

export type {
  CreateUserInput,
  UpdateUserInput,
  PublicUser,
};
