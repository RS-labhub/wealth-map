import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse the notes to get the report content
    const notes = report.notes ? JSON.parse(report.notes) : { properties: [], fields: [] };
    
    // Generate content based on report type
    let content = '';
    let mimeType = '';
    let fileExtension = '';

    switch (report.reportType.toLowerCase()) {
      case 'csv':
        content = generateCSVContent(notes);
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'json':
        content = JSON.stringify(notes, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      default:
        content = JSON.stringify(notes, null, 2);
        mimeType = 'text/plain';
        fileExtension = 'txt';
    }

    // Create the response with the file content
    const response = new NextResponse(content);
    
    // Set appropriate headers
    response.headers.set('Content-Type', mimeType);
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="${report.title}.${fileExtension}"`
    );

    return response;
  } catch (error) {
    console.error("Error downloading report:", error);
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    );
  }
}

function generateCSVContent(notes: any): string {
  const { properties, fields } = notes;
  
  // Create header row
  const headers = fields.map((field: string) => field).join(',');
  
  // Create data rows
  const rows = properties.map((property: any) => {
    return fields.map((field: string) => {
      const value = property[field];
      // Handle values that might contain commas
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
} 