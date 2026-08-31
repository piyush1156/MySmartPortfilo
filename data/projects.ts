export interface Project {
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
}

export const projects: Project[] = [
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
    technologies: [
      "PHP",
      "MySQL",
      "JavaScript",
      "HTML5",
      "CSS3",
      "REST API",
      "Trello",
    ],
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
    technologies: [
      "JavaScript",
      "CSS3",
      "HTML5",
      "REST API",
      "Responsive Design",
    ],
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
    technologies: [
      "JavaScript",
      "HTML5",
      "CSS3",
      "PHP",
      "YOLO",
      "REST API",
    ],
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
  },
];
