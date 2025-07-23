import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@/generated/prisma";

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

    // Update employee status
    await prisma.user.update({
      where: { id },
      data: { currentRole: status },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating employee status:", error);
    return NextResponse.json(
      { error: "Failed to update employee status" },
      { status: 500 }
    );
  }
} 