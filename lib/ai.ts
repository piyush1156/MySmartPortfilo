import { VisitorProfile } from "./visitor";
import { generateSystemPrompt } from "./personalization";
import { extractCommands, Command } from "./commands";
import { findCompany, getCompanyVerificationMessage } from "@/data/companies";

export interface AIResponse {
  text: string;
  commands: Command[];
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// AI Provider abstraction — swap implementations without changing frontend
export interface AIProvider {
  chat(messages: AIMessage[]): Promise<string>;
}

// OpenAI-compatible provider (works with OpenAI, OpenRouter, Ollama, etc.)
export class OpenAICompatibleProvider implements AIProvider {
  private apiUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: {
    apiUrl: string;
    apiKey: string;
    model: string;
  }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async chat(messages: AIMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 800,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "I'm having trouble responding right now.";
    } catch (error) {
      console.error("AI Provider error:", error);
      return "I'm having trouble connecting to my brain right now. Could you try again?";
    }
  }
}

// Fallback local provider — keyword-based responses when no API key is available
export class LocalProvider implements AIProvider {
  async chat(messages: AIMessage[]): Promise<string> {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const input = lastUserMessage?.content.toLowerCase() || "";

    const userMessages = messages.filter((m) => m.role === "user");
    const isFirstMessage = userMessages.length <= 1;

    // Check if ARIA has already introduced herself
    const hasIntroduced = messages.some(
      (m) => m.role === "assistant" && (
        m.content.includes("I'm ARIA") || m.content.includes("I am ARIA") || m.content.includes("Hey!")
      )
    );

    // ── Greetings: don't re-introduce ────────────────────────────
    if (input.match(/^(hi|hello|hey|hii|heyy|helo|hllo|yo|sup|namaste|namaskar)/i)) {
      if (hasIntroduced && !isFirstMessage) {
        const hour = new Date().getHours();
        let timeGreeting = "Hey";
        if (hour < 12) timeGreeting = "Good morning";
        else if (hour < 17) timeGreeting = "Good afternoon";
        else if (hour < 21) timeGreeting = "Good evening";
        else timeGreeting = "Good night";
        
        const responses = [
          `${timeGreeting}! What would you like to explore? I can show you projects, skills, experience, or anything about Piyush.`,
          `${timeGreeting}! Ask me about Piyush's projects, skills, or anything you'd like to know.`,
          `${timeGreeting}! How can I help? Try asking about his projects, skills, or resume.`,
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
      return "Hey! I'm ARIA — Piyush's personal AI assistant. I know about his frontend development work, React.js projects, and technical skills. What would you like to explore?";
    }

    // ── First message: introduce if not already ──────────────────
    if (isFirstMessage && !input.match(/project|skill|resume|contact|about|service|experience|tour|guide|show|work|tech|stack|hire|email|cv/i)) {
      if (!hasIntroduced) {
        return "I'm ARIA — Piyush's personal AI assistant. I know about his frontend development work, React.js projects, and technical skills. What would you like to explore?";
      }
    }

    // ── Projects: conversational intro + open ────────────────────
    if (input.includes("project") || input.includes("work")) {
      const projectIntros = [
        "Let me tell you about Piyush's projects! He's built some impressive work — from hospital management systems to real-time object detection. Let me open the Projects app.",
        "Great choice! Piyush has worked on 4 exciting projects. Let me walk you through them.",
        "Sure! Here are Piyush's projects — each one solves a real problem. Let me show you.",
      ];
      return "[COMMAND:SHOW_PROJECTS] " + projectIntros[Math.floor(Math.random() * projectIntros.length)];
    }

    // ── Skills: conversational intro + open ──────────────────────
    if (input.includes("skill") || input.includes("tech") || input.includes("stack")) {
      const skillIntros = [
        "Let me show you Piyush's tech stack! He's skilled in JavaScript, React.js, PHP, MySQL, and more. Let me open the Skills app.",
        "Here's Piyush's technical skill set — from frontend frameworks to backend APIs. Let me show you the details.",
        "Sure! Piyush works with a solid tech stack. Let me break it down for you.",
      ];
      return "[COMMAND:SHOW_SKILLS] " + skillIntros[Math.floor(Math.random() * skillIntros.length)];
    }

    // ── Resume ──────────────────────────────────────────────────
    if (input.includes("resume") || input.includes("cv")) {
      return "[COMMAND:SHOW_RESUME] Let me pull up Piyush's resume for you. You can view and download it from the Resume app.";
    }

    // ── Contact ─────────────────────────────────────────────────
    if (input.includes("contact") || input.includes("hire") || input.includes("email")) {
      return "[COMMAND:SHOW_CONTACT] Let me open the Contact app. You can reach Piyush at piyushsingh116677@gmail.com or +91 9058227713.";
    }

    // ── About ───────────────────────────────────────────────────
    if (input.includes("about") || input.includes("who")) {
      return "[COMMAND:SHOW_ABOUT] Let me tell you about Piyush! He's a Frontend Developer pursuing MCA at Graphic Era Hill University, specializing in React.js and JavaScript with 200+ DSA problems solved.";
    }

    // ── Services ────────────────────────────────────────────────
    if (input.includes("service") || input.includes("offer")) {
      return "[COMMAND:SHOW_SERVICES] Here are the services Piyush offers — Frontend Development, React.js Applications, REST API Integration, and Responsive Design. Let me show you.";
    }

    // ── HR/Recruiter company verification ─────────────────────────
    if (input.includes("company") || input.includes("hr") || input.includes("recruit")) {        // Try to find a company name in the input
      const companyNames = ["google", "microsoft", "amazon", "apple", "meta", "facebook", "netflix", "tesla", "adobe", "salesforce", "ibm", "oracle", "sap", "nvidia", "intel", "cisco", "uber", "airbnb", "spotify", "shopify", "atlassian", "tcs", "infosys", "wipro", "hcl", "flipkart", "zomato", "swiggy", "razorpay", "freshworks", "zoho", "mckinsey", "deloitte", "goldman", "jporgan", "jpmorgan", "pfizer", "johnson", "paypal", "linkedin", "zoom", "slack", "stripe", "figma", "canva", "notion", "vercel", "supabase", "datadog", "cloudflare", "mongodb", "snowflake", "databricks", "gitlab", "crowdstrike", "palantir", "dropbox", "twilio", "hashicorp", "snap", "pinterest", "byju", "unacademy", "ola", "phonepe", "paytm", "cred", "dream11", "nykaa", "policzbazaar", "makemytrip", "payu", "postman", "browserstack", "meesho", "zomato", "zerodha", "curefit", "practo", "alibaba", "tencent", "bytedance", "samsung", "sony", "grab", "coupang", "gojek", "huawei", "xiaomi", "siemens", "nokia", "ericsson", "nestle", "unilever", "loreal", "bmw", "volkswagen", "asml", "booking", "klarna", "wise", "revolut", "deliveroo", "adyen", "hsbc", "barclays", "citigroup", "pwc", "ey", "kpmg", "accenture", "capgemini", "roche", "novartis", "astrazeneca", "merck", "abbvie", "cipla", "reddys", "sunpharma", "sun pharma", "biocon", "toyota", "ford", "motors", "mercedes", "hyundai", "maruti", "tata motors", "mahindra", "bosch", "hul", "hindustan unilever", "itc", "dabur", "godrej", "britannia", "amul"];
      
      let foundCompany = companyNames.find(c => input.includes(c));
      
      if (foundCompany) {
        // Capitalize company name properly
        const companyName = foundCompany.charAt(0).toUpperCase() + foundCompany.slice(1);
        // Handle special cases
        const specialNames: Record<string, string> = {
          "facebook": "Meta",
          "tcs": "Tata Consultancy Services",
          "hcl": "HCL Technologies",
          "jpmorgan": "JPMorgan Chase",
        };
        const displayName = specialNames[foundCompany] || companyName;
        
        const genderTitle = "friend";
        return getCompanyVerificationMessage(displayName, genderTitle);
      }
      
      // Generic HR/Recruiter response
      const companyResponses = [
        "I understand you're from an HR or recruiting background! 🌟 Piyush has strong experience in frontend development with React.js and JavaScript. Would you like to see his resume or discuss specific technical skills?",
        "As an HR professional, you'll find Piyush's portfolio truly impressive! He has 3+ years of experience building web applications. Shall I show you his professional experience and achievements?",
        "Piyush is actively open to new opportunities! His strongest skills include React.js, JavaScript, and full-stack development. Would you like to discuss potential roles or see his contact information?",
      ];
      return companyResponses[Math.floor(Math.random() * companyResponses.length)];
    }

    // ── Experience ──────────────────────────────────────────────
    if (input.includes("experience")) {
      return "[COMMAND:SHOW_EXPERIENCE] Let me walk you through Piyush's experience — 3 years of building web apps, team leadership, and competitive achievements.";
    }

    // ── Tour ────────────────────────────────────────────────────
    if (input.includes("tour") || input.includes("guide")) {
      return "[COMMAND:START_TOUR] Let me give you a tour of Piyush's workspace! I'll walk you through his profile, projects, and skills.";
    }

    // ── Fallback ────────────────────────────────────────────────
    return "I can help you explore Piyush's portfolio. Try asking about his projects, skills, experience, resume, or contact info.";
  }
}

// Main AI Service
export class AIService {
  private provider: AIProvider;
  private conversationHistory: AIMessage[] = [];
  private visitor: VisitorProfile | null = null;

  constructor(provider?: AIProvider) {
    this.provider = provider || this.createDefaultProvider();
  }

  private createDefaultProvider(): AIProvider {
    const apiUrl = process.env.NEXT_PUBLIC_AI_API_URL || "";
    const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || "";
    const model = process.env.NEXT_PUBLIC_AI_MODEL || "gpt-3.5-turbo";

    if (apiUrl && apiKey) {
      return new OpenAICompatibleProvider({ apiUrl, apiKey, model });
    }

    // Fall back to local provider
    return new LocalProvider();
  }

  setVisitor(visitor: VisitorProfile) {
    this.visitor = visitor;
    // Reset conversation with updated system prompt
    this.conversationHistory = [
      { role: "system", content: generateSystemPrompt(visitor) },
    ];
  }

  async sendMessage(userMessage: string): Promise<AIResponse> {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const responseText = await this.provider.chat(this.conversationHistory);

    this.conversationHistory.push({
      role: "assistant",
      content: responseText,
    });

    // Extract any commands from the response
    const { text, commands } = extractCommands(responseText);

    return { text, commands };
  }

  // Generates the initial greeting based on visitor state
  getInitialGreeting(visitor: VisitorProfile | null): string {
    if (!visitor) {
      return "Hi! I'm Piyush's personal AI assistant, ARIA. Before we begin, what should I call you?";
    }
    if (!visitor.name) {
      return "Hi! I'm Piyush's personal AI assistant, ARIA. Before we begin, what should I call you?";
    }
    if (!visitor.role) {
      return `Nice to meet you, ${visitor.name}! What brings you here today?`;
    }
    const config =
      visitor.role === "recruiter" || visitor.role === "client"
        ? getPersonalizationConfig(visitor.role)
        : undefined;
    return config?.welcomeMessage || `Welcome back, ${visitor.name}! How can I help you explore Piyush's work?`;
  }

  getConversationHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  reset() {
    this.conversationHistory = this.visitor
      ? [{ role: "system", content: generateSystemPrompt(this.visitor) }]
      : [];
  }
}

import { getPersonalizationConfig } from "./visitor";

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
