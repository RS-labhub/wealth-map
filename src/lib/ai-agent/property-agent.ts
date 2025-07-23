import { PrismaClient } from "@/generated/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";
import axios from "axios";

const prisma = new PrismaClient();

// Initialize AI models
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// Available models configuration
const AVAILABLE_MODELS = {
  GROQ: [
    "llama3-70b-8192",
    "llama3-8b-8192",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct"
  ],
  GEMINI: ["gemini-pro"]
};

// Debug logging function
const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AI Agent Debug] ${message}`, data ? data : '');
  }
};

interface PropertyQuery {
  query: string;
  userId?: string;
}

interface PropertyData {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  price: number;
  area: number;
  type: string;
  owners: {
    name: string;
    email: string | null;
    phoneNumber: string | null;
  }[];
}

interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
}

export class PropertyAgent {
  private async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        }
      });
      return response.data.data.map((model: any) => model.id);
    } catch (error) {
      debugLog('Error fetching available models:', error);
      return [];
    }
  }

  private async selectModel(): Promise<'GROQ' | 'GEMINI'> {
    if (process.env.GOOGLE_API_KEY) {
      debugLog('Using Gemini model as primary');
      return 'GEMINI';
    }

    if (process.env.GROQ_API_KEY) {
      try {
        const availableModels = await this.getAvailableModels();
        debugLog('Available Groq models:', availableModels);

        // Try to find a supported model
        const supportedModel = AVAILABLE_MODELS.GROQ.find(model => 
          availableModels.includes(model)
        );

        if (supportedModel) {
          debugLog(`Using Groq model: ${supportedModel}`);
          return 'GROQ';
        }
      } catch (error) {
        debugLog('Error checking Groq models:', error);
      }
    }

    debugLog('No supported models available');
    throw new Error('No supported AI models available');
  }

  private async fetchPropertyData(query: string): Promise<PropertyData[]> {
    // Search properties based on the query
    const properties = await prisma.property.findMany({
      where: {
        AND: [
          {
            country: 'US',
            state: { not: '' },
            city: { not: '' },
            zipCode: { not: '' }
          },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { city: { contains: query, mode: 'insensitive' } },
              { state: { contains: query, mode: 'insensitive' } },
              { zipCode: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      include: {
        owners: {
          include: {
            owner: true
          }
        },
        views: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return properties.map(property => ({
      ...property,
      price: Number(property.price),
      address: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
      owners: property.owners.map(po => ({
        name: po.owner.name,
        email: po.owner.email,
        phoneNumber: po.owner.phoneNumber
      }))
    }));
  }

  private async searchWebForAdditionalInfo(query: string): Promise<string> {
    try {
      // Use Serper.dev API for web search
      const response = await axios.post(
        'https://google.serper.dev/search',
        {
          q: query,
          num: 5, // Number of results to return
        },
        {
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      // Extract and format search results
      const results: WebSearchResult[] = response.data.organic.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
      }));

      // Format results into a readable string
      return results
        .map(
          (result) =>
            `Title: ${result.title}\nSnippet: ${result.snippet}\nSource: ${result.link}\n`
        )
        .join('\n');
    } catch (error) {
      console.error("Error fetching web data:", error);
      return "";
    }
  }

  private async generateResponse(
    propertyData: PropertyData[],
    webData: string,
    userQuery: string
  ): Promise<string> {
    const prompt = `
      You are a knowledgeable US real estate assistant specializing in property analysis and market insights. 
      Based on the following property data and web search results, provide a helpful response to the user's query.
      
      User Query: ${userQuery}
      
      Property Data:
      ${JSON.stringify(propertyData, null, 2)}
      
      Additional Web Information:
      ${webData}
      
      Guidelines for your response:
      1. Focus exclusively on US real estate market and properties
      2. Use US-specific terminology and formats:
         - Prices in USD
         - Addresses in US format (City, State ZIP)
         - Property sizes in square feet
         - Market trends specific to US regions
      3. Provide a friendly, conversational response that:
         - Directly answers the user's question
         - Includes relevant property details
         - Adds market insights from the web data
         - Uses natural, engaging language
         - Cites sources naturally within the conversation
      4. If no US properties are found, explain that and suggest:
         - Refining the search to a specific US location
         - Looking at similar properties in nearby areas
         - Checking other US markets
      
      Remember to:
      - Keep responses concise and engaging
      - Use contractions (I'm, you're, that's)
      - Maintain a helpful, professional tone
      - Focus on US real estate context
    `;

    try {
      const selectedModel = await this.selectModel();
      debugLog(`Selected model type: ${selectedModel}`);

      if (selectedModel === 'GEMINI') {
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
      } else {
        // Try each available Groq model until one works
        for (const model of AVAILABLE_MODELS.GROQ) {
          try {
            debugLog(`Attempting to use Groq model: ${model}`);
            const completion = await groq.chat.completions.create({
              messages: [{ role: "user", content: prompt }],
              model: model,
            });
            return completion.choices[0]?.message?.content || "No response generated";
          } catch (error) {
            debugLog(`Failed to use Groq model ${model}:`, error);
            continue;
          }
        }
        throw new Error('All Groq models failed');
      }
    } catch (error) {
      debugLog('Error generating AI response:', error);
      return "I apologize, but I encountered an error while processing your request. Please try again.";
    }
  }

  public async processQuery({ query, userId }: PropertyQuery): Promise<string> {
    try {
      // Fetch property data from database
      const propertyData = await this.fetchPropertyData(query);
      
      // Search web for additional information
      const webData = await this.searchWebForAdditionalInfo(query);
      
      // Generate response using AI
      const response = await this.generateResponse(propertyData, webData, query);
      
      // Log the interaction if userId is provided
      if (userId) {
        await prisma.report.create({
          data: {
            title: `Property Query: ${query} - ${new Date().toISOString()}`,
            description: response,
            userId,
            reportType: "AI_QUERY",
          },
        });
      }
      
      return response;
    } catch (error) {
      console.error("Error processing property query:", error);
      return "I apologize, but I encountered an error while processing your request.";
    }
  }
}

export const propertyAgent = new PropertyAgent(); 