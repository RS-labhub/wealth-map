import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@/generated/prisma";
import { PropertyAgent } from "@/lib/ai-agent/property-agent";

const prisma = new PrismaClient();
const propertyAgent = new PropertyAgent();

// List of general greetings and non-property queries
const generalGreetings = [
  "hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening",
  "how are you", "how's it going", "what's up", "howdy"
];

// Check if query is a general greeting
function isGeneralGreeting(query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  return generalGreetings.some(greeting => normalizedQuery.includes(greeting));
}

// Get response for general greetings
function getGeneralResponse(): string {
  const responses = [
    "Hello! I'm your property assistant. How can I help you with property information today?",
    "Hi there! I can help you find information about properties and their owners. What would you like to know?",
    "Greetings! I'm here to assist you with property-related queries. What can I help you with?",
    "Hello! I can help you explore property details, market trends, and owner information. What would you like to know?"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to search properties
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        roles: {
          include: {
            permissions: true,
          },
        },
      },
    });

    const hasPermission = user?.roles.some(role =>
      role.permissions.some(p => p.name === "property:search" || p.name === "property:*")
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You don't have permission to search properties" },
        { status: 403 }
      );
    }

    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    let aiResponse: string;

    // Handle general greetings separately
    if (isGeneralGreeting(query)) {
      aiResponse = getGeneralResponse();
    } else {
      // Use PropertyAgent for property-related queries
      aiResponse = await propertyAgent.processQuery({
        query,
        userId: session.user.id,
      });
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Error processing property query:", error);
    return NextResponse.json(
      { error: "Error processing query" },
      { status: 500 }
    );
  }
} 