// Whitelisted commands that the AI can execute on the frontend
export type Command =
  | { type: "OPEN_APP"; app: AppName }
  | { type: "OPEN_PROJECT"; projectId: string }
  | { type: "SHOW_SKILLS" }
  | { type: "SHOW_ABOUT" }
  | { type: "SHOW_EXPERIENCE" }
  | { type: "SHOW_RESUME" }
  | { type: "SHOW_CONTACT" }
  | { type: "SHOW_SERVICES" }
  | { type: "SHOW_PROJECTS" }
  | { type: "START_TOUR" }
  | { type: "SCROLL_TO_SECTION"; section: string }
  | { type: "CLOSE_ALL_WINDOWS" }
  | { type: "MINIMIZE_ALL" };

export type AppName =
  | "assistant"
  | "about"
  | "projects"
  | "skills"
  | "resume"
  | "contact"
  | "services"
  | "admin"
  | "terminal";

// Validates that an AI-generated action is a known command
export function isValidCommand(action: unknown): action is Command {
  if (!action || typeof action !== "object") return false;
  const obj = action as Record<string, unknown>;
  if (!obj.type || typeof obj.type !== "string") return false;

  const validTypes = [
    "OPEN_APP",
    "OPEN_PROJECT",
    "SHOW_SKILLS",
    "SHOW_ABOUT",
    "SHOW_EXPERIENCE",
    "SHOW_RESUME",
    "SHOW_CONTACT",
    "SHOW_SERVICES",
    "SHOW_PROJECTS",
    "START_TOUR",
    "SCROLL_TO_SECTION",
    "CLOSE_ALL_WINDOWS",
    "MINIMIZE_ALL",
  ];

  return validTypes.includes(obj.type);
}

// Extracts commands from an AI response text (structured format)
export function extractCommands(response: string): {
  text: string;
  commands: Command[];
} {
  const commands: Command[] = [];
  let cleanText = response;

  // Look for command markers: [COMMAND:type] or [COMMAND:type:payload]
  const commandRegex = /\[COMMAND:([A-Z_]+)(?::([^\]]*))?\]/g;
  let match;

  while ((match = commandRegex.exec(response)) !== null) {
    const [, type, payload] = match;
    const command = buildCommand(type, payload);
    if (command) {
      commands.push(command);
    }
    cleanText = cleanText.replace(match[0], "").trim();
  }

  return { text: cleanText, commands };
}

function buildCommand(type: string, payload: string): Command | null {
  switch (type) {
    case "OPEN_APP":
      if (isValidAppName(payload)) return { type: "OPEN_APP", app: payload };
      return null;
    case "OPEN_PROJECT":
      return { type: "OPEN_PROJECT", projectId: payload };
    case "SHOW_SKILLS":
      return { type: "SHOW_SKILLS" };
    case "SHOW_ABOUT":
      return { type: "SHOW_ABOUT" };
    case "SHOW_EXPERIENCE":
      return { type: "SHOW_EXPERIENCE" };
    case "SHOW_RESUME":
      return { type: "SHOW_RESUME" };
    case "SHOW_CONTACT":
      return { type: "SHOW_CONTACT" };
    case "SHOW_SERVICES":
      return { type: "SHOW_SERVICES" };
    case "SHOW_PROJECTS":
      return { type: "SHOW_PROJECTS" };
    case "START_TOUR":
      return { type: "START_TOUR" };
    case "SCROLL_TO_SECTION":
      return { type: "SCROLL_TO_SECTION", section: payload };
    case "CLOSE_ALL_WINDOWS":
      return { type: "CLOSE_ALL_WINDOWS" };
    case "MINIMIZE_ALL":
      return { type: "MINIMIZE_ALL" };
    default:
      return null;
  }
}

function isValidAppName(name: string): name is AppName {
  const validNames: string[] = [
    "assistant",
    "about",
    "projects",
    "skills",
    "resume",
    "contact",
    "services",
    "admin",
    "terminal",
  ];
  return validNames.includes(name);
}
