export interface SkillCategory {
  name: string;
  icon: string;
  skills: Skill[];
}

export interface Skill {
  name: string;
  level: number;
  description: string;
  yearsOfExperience?: number;
}

export const skillCategories: SkillCategory[] = [
  {
    name: "Frontend",
    icon: "🎨",
    skills: [
      {
        name: "React.js",
        level: 85,
        description: "Component-based UI with Hooks, Context API, and state management",
        yearsOfExperience: 2,
      },
      {
        name: "JavaScript (ES6+)",
        level: 88,
        description: "Modern JavaScript with ES6+ features, DOM manipulation, async/await",
        yearsOfExperience: 3,
      },
      {
        name: "HTML5",
        level: 90,
        description: "Semantic HTML5, accessibility, cross-browser compatibility",
        yearsOfExperience: 3,
      },
      {
        name: "CSS3",
        level: 85,
        description: "Responsive design, Flexbox, Grid, animations, Tailwind CSS",
        yearsOfExperience: 3,
      },
      {
        name: "Tailwind CSS",
        level: 82,
        description: "Utility-first CSS framework for rapid UI development",
        yearsOfExperience: 1,
      },
      {
        name: "Bootstrap",
        level: 80,
        description: "Responsive grid system and pre-built components",
        yearsOfExperience: 2,
      },
    ],
  },
  {
    name: "Languages",
    icon: "💻",
    skills: [
      {
        name: "JavaScript",
        level: 88,
        description: "Primary language for frontend and full-stack development",
        yearsOfExperience: 3,
      },
      {
        name: "HTML5",
        level: 90,
        description: "Markup language for web pages",
        yearsOfExperience: 3,
      },
      {
        name: "CSS3",
        level: 85,
        description: "Styling and layout for responsive web design",
        yearsOfExperience: 3,
      },
      {
        name: "PHP",
        level: 70,
        description: "Server-side scripting for backend APIs and file handling",
        yearsOfExperience: 2,
      },
      {
        name: "TypeScript",
        level: 55,
        description: "Basic TypeScript for type-safe JavaScript development",
        yearsOfExperience: 1,
      },
    ],
  },
  {
    name: "Backend & APIs",
    icon: "⚙️",
    skills: [
      {
        name: "REST APIs",
        level: 80,
        description: "API design, integration, and consumption with proper error handling",
        yearsOfExperience: 2,
      },
      {
        name: "Node.js",
        level: 55,
        description: "Basic server-side JavaScript runtime",
        yearsOfExperience: 1,
      },
      {
        name: "PHP",
        level: 70,
        description: "Backend API endpoints and file processing",
        yearsOfExperience: 2,
      },
      {
        name: "MySQL",
        level: 75,
        description: "Relational database design, normalized schemas, queries",
        yearsOfExperience: 2,
      },
    ],
  },
  {
    name: "Tools & Concepts",
    icon: "🛠️",
    skills: [
      {
        name: "Git & GitHub",
        level: 80,
        description: "Version control, branching, pull requests, collaboration",
        yearsOfExperience: 2,
      },
      {
        name: "VS Code",
        level: 90,
        description: "Primary IDE with extensions for productivity",
        yearsOfExperience: 3,
      },
      {
        name: "Postman",
        level: 78,
        description: "API testing and documentation",
        yearsOfExperience: 2,
      },
      {
        name: "Chrome DevTools",
        level: 82,
        description: "Debugging, performance profiling, network analysis",
        yearsOfExperience: 2,
      },
      {
        name: "Vercel/Netlify",
        level: 75,
        description: "Static site deployment and hosting",
        yearsOfExperience: 1,
      },
      {
        name: "Responsive Design",
        level: 85,
        description: "Mobile-first design, cross-browser testing, breakpoints",
        yearsOfExperience: 3,
      },
    ],
  },
  {
    name: "DSA & Problem Solving",
    icon: "🧮",
    skills: [
      {
        name: "Data Structures",
        level: 75,
        description: "Arrays, linked lists, trees, graphs, hash maps",
        yearsOfExperience: 2,
      },
      {
        name: "Algorithms",
        level: 72,
        description: "Sorting, searching, graph algorithms (Dijkstra, BFS/DFS, MST)",
        yearsOfExperience: 2,
      },
      {
        name: "Problem Solving",
        level: 80,
        description: "200+ DSA problems solved on competitive platforms",
        yearsOfExperience: 2,
      },
    ],
  },
];
