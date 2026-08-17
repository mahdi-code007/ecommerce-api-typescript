declare global {
  namespace Express {
    interface Request {
      validated?: unknown;
      user?: {
        id: string;
        name: string;
        email: string;
        role: "user" | "admin";
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

export {};
