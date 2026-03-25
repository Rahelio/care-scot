import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400, headers: CORS }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
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

    if (!user?.passwordHash || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: CORS }
      );
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: CORS }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      organisationId: user.organisationId,
      staffMemberId: user.staffMemberId ?? null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organisationId: user.organisationId,
          staffMemberId: user.staffMemberId ?? null,
        },
      },
      { headers: CORS }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS }
    );
  }
}
