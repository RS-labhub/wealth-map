import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      console.log("No session or user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const userOrg = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!userOrg) {
      console.log("No organization found for user:", session.user.id);
      return NextResponse.json({ error: "Unauthorized - No organization found" }, { status: 401 });
    }

    const { employeeId } = await context.params;
    const { role } = await request.json();
    console.log("Updating role for employee:", { employeeId: employeeId, newRole: role });

    // Check if the employee exists and belongs to the organization
    const employee = await prisma.member.findFirst({
      where: {
        id: employeeId,
        organizationId: userOrg.organizationId,
      },
    });

    if (!employee) {
      console.log("Employee not found:", employeeId);
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Update the employee's role
    const updatedEmployee = await prisma.member.update({
      where: {
        id: employee.id,
      },
      data: {
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            twoFactorEnabled: true,
          },
        },
      },
    });

    console.log("Employee role updated successfully:", updatedEmployee);
    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee role:", error);
    return NextResponse.json(
      { error: "Failed to update employee role", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 