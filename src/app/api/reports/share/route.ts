import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{}> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId, email } = await request.json();

    // Check if user has access to the report
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { user: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check if user is the owner of the report
    if (report.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Find user by email
    const userToShare = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToShare) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create share record
    const share = await prisma.sharedProperty.create({
      data: {
        id: crypto.randomUUID(),
        reportId,
        userId: userToShare.id,
      },
    });

    return NextResponse.json(share);
  } catch (error) {
    console.error("Error sharing report:", error);
    return NextResponse.json(
      { error: "Failed to share report" },
      { status: 500 }
    );
  }
} 