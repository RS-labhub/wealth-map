import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { status } = await request.json();

    // Check if user is an admin of the organization
    const member = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: id,
        role: "admin",
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update organization status
    const organization = await prisma.organization.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error updating organization status:", error);
    return NextResponse.json(
      { error: "Failed to update organization status" },
      { status: 500 }
    );
  }
} 