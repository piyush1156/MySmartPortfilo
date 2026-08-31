export type VisitorRole =
  | "recruiter"
  | "client"
  | "developer"
  | "student"
  | "explorer"
  | null;

export interface VisitorProfile {
  name: string;
  role: VisitorRole;
  company?: string;
  interests: string[];
  sessionId: string;
  startedAt: string;
  consent: boolean;
  onboardingComplete: boolean;
}

export function createVisitorProfile(
  name: string,
  role: VisitorRole = null,
  sessionId: string
): VisitorProfile {
  return {
    name,
    role,
    company: undefined,
    interests: [],
    sessionId,
    startedAt: new Date().toISOString(),
    consent: true,
    onboardingComplete: false,
  };
}

export function getPersonalizationConfig(role: VisitorRole) {
  switch (role) {
    case "recruiter":
      return {
        welcomeMessage:
          "Since you're here as a recruiter, I'll focus on Piyush's professional experience and strongest technical projects.",
        prioritySections: [
          "about",
          "skills",
          "experience",
          "projects",
          "resume",
          "contact",
        ],
        highlightProjects: true,
        showResume: true,
        showServices: false,
        suggestedQuestions: [
          "Show me Piyush's resume",
          "What are his strongest skills?",
          "Tell me about his AI projects",
          "How can I contact him?",
        ],
      };
    case "client":
      return {
        welcomeMessage:
          "Let's focus on what Piyush can build for your requirements.",
        prioritySections: [
          "services",
          "projects",
          "contact",
          "about",
          "skills",
        ],
        highlightProjects: false,
        showResume: false,
        showServices: true,
        suggestedQuestions: [
          "What services does Piyush offer?",
          "Show me relevant case studies",
          "I want to discuss a project",
          "How does Piyush approach AI automation?",
        ],
      };
    case "developer":
      return {
        welcomeMessage:
          "Great to meet a fellow developer! Let me show you the technical side of Piyush's work.",
        prioritySections: [
          "skills",
          "projects",
          "about",
          "resume",
          "experience",
        ],
        highlightProjects: true,
        showResume: false,
        showServices: false,
        suggestedQuestions: [
          "What's Piyush's tech stack?",
          "Show me his GitHub projects",
          "Tell me about his AI architecture",
          "What tools does he use?",
        ],
      };
    case "student":
      return {
        welcomeMessage:
          "Awesome! Piyush loves helping students. Let me show you his learning journey and experiments.",
        prioritySections: [
          "about",
          "projects",
          "skills",
          "experience",
        ],
        highlightProjects: true,
        showResume: false,
        showServices: false,
        suggestedQuestions: [
          "How did Piyush learn AI?",
          "Show me his projects",
          "What technologies should I learn?",
          "Any advice for beginners?",
        ],
      };
    case "explorer":
    default:
      return {
        welcomeMessage:
          "Welcome! Let me give you a quick tour of Piyush's digital workspace.",
        prioritySections: [
          "about",
          "projects",
          "skills",
          "services",
        ],
        highlightProjects: true,
        showResume: false,
        showServices: true,
        suggestedQuestions: [
          "Give me a quick tour",
          "Who is Piyush?",
          "Show me something cool",
          "What can I find here?",
        ],
      };
  }
}
