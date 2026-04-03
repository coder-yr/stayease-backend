type UserRole = "user" | "admin" | "owner";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
