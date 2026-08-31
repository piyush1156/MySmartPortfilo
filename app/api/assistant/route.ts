import { NextRequest, NextResponse } from "next/server";
import { AIService, OpenAICompatibleProvider } from "@/lib/ai";
import { generateSystemPrompt } from "@/lib/personalization";
import { VisitorProfile } from "@/lib/visitor";

// POST /api/assistant
// Body: { message: string, visitor: VisitorProfile }
export async function POST(request: NextRequest) {
  try {
    const { message, visitor } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Create a provider based on environment config
    const apiUrl = process.env.AI_API_URL || process.env.NEXT_PUBLIC_AI_API_URL || "";
    const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || "";
    const model = process.env.AI_MODEL || process.env.NEXT_PUBLIC_AI_MODEL || "gpt-3.5-turbo";

    let provider;
    if (apiUrl && apiKey) {
      provider = new OpenAICompatibleProvider({ apiUrl, apiKey, model });
    }

    const aiService = new AIService(provider);

    // Set visitor profile for personalization
    if (visitor) {
      aiService.setVisitor(visitor as VisitorProfile);
    }

    const response = await aiService.sendMessage(message);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Assistant API error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
