import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { propertyId: string, userId: string } }
) {
  try {
    const { propertyId,userId } = params;
    // Increment the view count atomically
    const property = await prisma.view.create({
     
      data: { propertyId:propertyId,userId:userId },
    });
    return NextResponse.json({ status: 200, headers: {
        'Cache-Control': 's-maxage=259200, stale-while-revalidate=60', // 3 days cache, 1 min stale
        'Content-Type': 'application/json',
      } });
  } catch (error) {
    console.error("Error incrementing property views:", error);
    return NextResponse.json({ error: "Failed to increment views" }, { status: 500 });
  }
} 