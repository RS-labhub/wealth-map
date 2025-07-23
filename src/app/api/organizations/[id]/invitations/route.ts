import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Resend } from 'resend';
import crypto from "crypto";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const invitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { email, role } = await request.json();

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if user is already a member
      const existingMember = await prisma.member.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: id,
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member" },
          { status: 400 }
        );
      }
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        email,
        organizationId: id,
        role: role || "member",
        status: "pending",
        inviterId: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send invitation email
    const organization = await prisma.organization.findUnique({
      where: { id: id },
    });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL as string,
      to: email,
      subject: `Invitation to join ${organization?.name}`,
      html: `
        <p>You have been invited to join ${organization?.name}.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/invitations/${invitation.id}">
          Accept Invitation
        </a>
        <p>This invitation will expire in 7 days.</p>
      `,
    });

    return NextResponse.json(invitation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

// Get all invitations for an organization
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Get invitations for organization
    const invitations = await prisma.invitation.findMany({
      where: { organizationId: id },
      orderBy: { expiresAt: "desc" },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
