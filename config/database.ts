import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const databaseUri = process.env.DATABASE_URI;
    if (!databaseUri) {
      throw new Error("DATABASE_URI is not defined");
    }

    const connection = await mongoose.connect(databaseUri);

    console.log(
      `MongoDB Connected: ${connection.connection.host}`,
    );
  } catch (error: unknown) {
    console.error("Error connecting to MongoDB", error);
    process.exit(1);
  }
};

export = connectDB;
