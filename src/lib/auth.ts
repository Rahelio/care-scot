import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            organisationId: true,
            isActive: true,
            staffMemberId: true,
          },
        });

        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          organisationId: user.organisationId,
          staffMemberId: user.staffMemberId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.organisationId = user.organisationId;
        token.staffMemberId = user.staffMemberId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as import("@prisma/client").UserRole;
      session.user.organisationId = token.organisationId as string;
      session.user.staffMemberId = (token.staffMemberId as string | null) ?? null;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    // Session expires after 30 minutes of inactivity.
    // updateAge: 60 means the JWT is refreshed on each request made >60s
    // after the last refresh, rolling the 30-minute window forward.
    maxAge: 30 * 60,
    updateAge: 60,
  },
  pages: {
    signIn: "/login",
  },
});
