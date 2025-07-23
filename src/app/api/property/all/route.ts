import { PrismaClient } from '@/generated/prisma';
import { NextResponse } from 'next/server';
import { getWealthConfidenceLevel } from '@/Models/models';
import { auth } from '@/lib/auth';

const CACHE_TTL = 60 * 60 * 24; // 24 hours
const CACHE_KEY = 'properties';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const properties = await prisma.property.findMany({
      include: { views: true, owners: true } 
    });
     
    // Add ownerType field to each property based on the first propertyOwner's ownerType (faster)
    const propertiesWithOwnerType = await Promise.all(properties.map(async (property: any) => {
      let ownerType = null;
      let confidenceLevel = "Low";
      let ownerId = null;
      if (property.owners && property.owners.length > 0 && property.owners[0]) {
        ownerType = property.owners[0].ownerType || null;
        ownerId = property.owners[0].ownerId || null;
        // Fetch the owner and compute confidenceLevel
        const owner = await prisma.owner.findUnique({
          where: { id: property.owners[0].ownerId },
          select: {
            stocksSecurities: true,
            businessInterests: true,
            cashSavings: true,
            otherAssets: true,
          },
        });
        if (owner) {
          confidenceLevel = getWealthConfidenceLevel(owner);
        }
      }
      const { owners, ...rest } = property;
      return { ...rest, ownerType, ownerId, confidence: confidenceLevel, views: property._count?.views ?? 0 };
    }));
     
    return NextResponse.json(propertiesWithOwnerType, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=259200, stale-while-revalidate=60', // 3 days cache, 1 min stale
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: 'Failed to fetch properties', details: error }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
