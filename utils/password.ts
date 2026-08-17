import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

export {
  hashPassword,
  comparePassword,
};
