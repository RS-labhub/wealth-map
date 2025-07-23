import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { Resend } from 'resend';
import crypto from 'crypto';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();

    // Get user's organization
    const userOrg = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!userOrg || userOrg.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        organizationId: userOrg.organizationId,
        invitedBy: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send invitation email
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL as string,
      to: email,
      subject: `Join ${userOrg.organization.name}`,
      html: `
        <h1>You've been invited to join ${userOrg.organization.name}</h1>
        <p>Click the link below to accept the invitation:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${token}">
          Accept Invitation
        </a>
        <p>This invitation will expire in 7 days.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invitation error:', error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
} 