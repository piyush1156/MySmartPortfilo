import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { verifySession } from "@/lib/admin-auth";

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    || request.cookies.get("admin_token")?.value;
  return token ? verifySession(token) : false;
}

const DATA_FILE = join(process.cwd(), "data", "projects-db.json");

export interface ProjectEntry {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  technologies: string[];
  features: string[];
  architecture: string;
  liveDemo?: string;
  github?: string;
  image?: string;
  category: "ai" | "web" | "automation" | "fullstack";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PROJECTS: ProjectEntry[] = [
  {
    id: "hospital-management",
    name: "Hospital Management System",
    shortDescription: "Full-stack hospital management with real-time appointments",
    description:
      "A comprehensive hospital management system built as team lead, managing a 3-member team through the full build cycle — requirements, design, development, testing, and deployment.",
    problem:
      "Hospitals need a digital system to manage patients, doctors, schedules, appointments, and billing efficiently. Manual tracking leads to errors and delays.",
    solution:
      "Designed a normalized MySQL schema across 5 modules: patients, doctors, schedules, appointments, and billing. Built PHP REST API endpoints with a JavaScript frontend for real-time appointment updates. Used Trello for sprint tracking.",
    technologies: ["PHP", "MySQL", "JavaScript", "HTML5", "CSS3", "REST API", "Trello"],
    features: [
      "Patient management module",
      "Doctor scheduling system",
      "Real-time appointment updates",
      "Billing and invoice generation",
      "Normalized MySQL schema (5 modules)",
      "REST API integration",
    ],
    architecture:
      "PHP backend with MySQL database, JavaScript frontend, REST API for real-time communication between modules.",
    category: "fullstack",
    featured: true,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "solar-weather",
    name: "Solar System Weather Forecast",
    shortDescription: "Animated weather app with live API integration",
    description:
      "An animated, solar-system-themed weather forecast app that integrates a live third-party weather API into a visually engaging interface.",
    problem:
      "Weather apps are functional but lack engaging visual experiences. Users want weather data presented in a more interactive and memorable way.",
    solution:
      "Integrated a live weather API into an animated solar system interface using vanilla JavaScript and CSS3. Built fully responsive layouts tested across Chrome, Firefox, and Edge, and across mobile/tablet/desktop breakpoints.",
    technologies: ["JavaScript", "CSS3", "HTML5", "REST API", "Responsive Design"],
    features: [
      "Live weather data integration",
      "Animated solar system interface",
      "Fully responsive layout",
      "Cross-browser compatibility",
      "Mobile/tablet/desktop breakpoints",
      "Real-time weather updates",
    ],
    architecture:
      "Vanilla JavaScript frontend with CSS3 animations, third-party weather API integration, responsive CSS Grid/Flexbox layout.",
    category: "web",
    featured: true,
    createdAt: "2024-02-10T00:00:00Z",
    updatedAt: "2024-05-20T00:00:00Z",
  },
  {
    id: "visionguard",
    name: "VisionGuard",
    shortDescription: "Real-time object detection web app with YOLO",
    description:
      "A web interface for uploading images/video and running them through YOLO for real-time object and weapon detection, with PHP handling the inference pipeline.",
    problem:
      "Real-time object detection tools are often complex and inaccessible. Users need a simple web interface to upload media and get instant detection results.",
    solution:
      "Built a web interface for uploading images/video and running them through YOLO via API for real-time detection. Designed the upload/streaming UI for fast feedback and clear detection results, optimizing for low-latency rendering and bounding-box overlay accuracy.",
    technologies: ["JavaScript", "HTML5", "CSS3", "PHP", "YOLO", "REST API"],
    features: [
      "Image upload and detection",
      "Video/stream processing",
      "YOLO object detection",
      "Bounding box overlay",
      "Real-time inference results",
      "Low-latency rendering",
    ],
    architecture:
      "JavaScript frontend for upload/streaming UI, PHP backend for file intake, YOLO API for inference pipeline, bounding-box rendering on canvas.",
    category: "ai",
    featured: true,
    createdAt: "2024-05-01T00:00:00Z",
    updatedAt: "2024-07-05T00:00:00Z",
  },
  {
    id: "aria-portfolio",
    name: "ARIA Portfolio",
    shortDescription: "Interactive 3D MacBook portfolio with AI assistant",
    description:
      "A premium, cinematic 3D MacBook portfolio experience with an AI assistant (ARIA) that guides visitors through the portfolio using voice and text interaction.",
    problem:
      "Traditional portfolios are static and forgettable. Visitors need a way to explore skills, projects, and experience interactively.",
    solution:
      "Built a 3D MacBook scene with Three.js, React Three Fiber, and Framer Motion. ARIA assistant provides personalized onboarding, voice input/output, multi-language support, and AI-controlled UI navigation.",
    technologies: ["Next.js", "React", "TypeScript", "Three.js", "Framer Motion", "Tailwind CSS"],
    features: [
      "3D MacBook opening animation",
      "AI assistant with voice interaction",
      "Multi-language STT/TTS support",
      "Personalized visitor onboarding",
      "Dynamic project cards",
      "Admin dashboard with OTP auth",
    ],
    architecture:
      "Next.js app with React Three Fiber for 3D, Framer Motion for UI animations, Web Speech API for voice, file-based JSON databases for visitor tracking and project management.",
    category: "fullstack",
    featured: true,
    createdAt: "2024-08-01T00:00:00Z",
    updatedAt: "2024-08-30T00:00:00Z",
  },
];

function readProjects(): ProjectEntry[] {
  try {
    if (!existsSync(DATA_FILE)) {
      writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_PROJECTS, null, 2), "utf-8");
      return DEFAULT_PROJECTS;
    }
    const raw = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROJECTS;
  }
}

function writeProjects(projects: ProjectEntry[]) {
  writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

// GET /api/projects-db — Retrieve all projects
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");

  let projects = readProjects();

  if (id) {
    const project = projects.find((p) => p.id === id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  }

  if (category) {
    projects = projects.filter((p) => p.category === category);
  }

  if (featured === "true") {
    projects = projects.filter((p) => p.featured);
  }

  return NextResponse.json({
    total: projects.length,
    projects,
  });
}

// POST /api/projects-db — Create a new project (requires auth)
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      name,
      shortDescription,
      description,
      problem,
      solution,
      technologies,
      features,
      architecture,
      liveDemo,
      github,
      image,
      category,
      featured,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const projects = readProjects();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check for duplicate
    if (projects.find((p) => p.id === id)) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 409 }
      );
    }

    const newProject: ProjectEntry = {
      id,
      name,
      shortDescription: shortDescription || "",
      description: description || "",
      problem: problem || "",
      solution: solution || "",
      technologies: technologies || [],
      features: features || [],
      architecture: architecture || "",
      liveDemo,
      github,
      image,
      category,
      featured: featured || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects.push(newProject);
    writeProjects(projects);

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

// PUT /api/projects-db — Update a project
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const projects = readProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    projects[index] = {
      ...projects[index],
      ...updates,
      id, // Ensure id doesn't change
      updatedAt: new Date().toISOString(),
    };

    writeProjects(projects);
    return NextResponse.json({ success: true, project: projects[index] });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects-db?id=xxx — Delete a project
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const projects = readProjects();
    const filtered = projects.filter((p) => p.id !== id);

    if (filtered.length === projects.length) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    writeProjects(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
