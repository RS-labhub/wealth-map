import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/company-admin/roles
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const userOrg = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!userOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all roles (system and custom) for the organization
    const [systemRoles, customRoles] = await Promise.all([
      prisma.role.findMany({
        where: { isSystem: true },
        include: {
          permissions: {
            select: {
              id: true,
              name: true,
              category: true,
              description: true,
            },
          },
        },
      }),
      prisma.customRole.findMany({
        where: { organizationId: userOrg.organizationId },
        include: {
          permissions: {
            select: {
              id: true,
              name: true,
              category: true,
              description: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json([...systemRoles, ...customRoles]);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

// POST /api/company-admin/roles
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const userOrg = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!userOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, permissions } = await req.json();

    // Create custom role
    const role = await prisma.customRole.create({
      data: {
        name,
        description,
        organizationId: userOrg.organizationId,
        baseRole: "custom", // This will be used to determine the base permissions
        permissions: {
          connect: permissions.map((permissionId: string) => ({ id: permissionId })),
        },
      },
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}

// DELETE /api/company-admin/roles/[roleId]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = await context.params;

    // Delete the role
    await prisma.role.delete({
      where: {
        id: roleId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
} 