import type { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    organisationId: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      organisationId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organisationId: string;
  }
}
