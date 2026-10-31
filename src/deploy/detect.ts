// Deploy readiness: what Velora can tell about deploying a project from the files that are loaded.
// It reads only those files (at most 12, so usually not the whole project) and says so; it never
// deploys, uploads or contacts a provider. See docs/DEPLOYMENT_ARCHITECTURE.md for the plan.

import type { SourceFile } from "../../shared/types";

export type ProjectKind = "static" | "frontend" | "fullstack" | "server" | "python" | "unknown";
export type Support = "supported" | "unsupported" | "unknown";

export interface EnvVar {
  name: string;
  /** Bundled into browser code (VITE_, NEXT_PUBLIC_, REACT_APP_, PUBLIC_), so never a secret. */
  public: boolean;
  /** Its name suggests a secret (key, token, password…). */
  secretLike: boolean;
  files: string[];
}

export interface Issue {
  level: "blocker" | "warning" | "info";
  text: string;
}

export interface DeployReport {
  kind: ProjectKind;
  framework: string | null;
  install: string | null;
  build: string | null;
  output: string | null;
  env: EnvVar[];
  issues: Issue[];
  providers: { vercel: Support; netlify: Support };
  /** How many files the report is based on. */
  basis: number;
}

interface Framework {
  dep: string;
  name: string;
  kind: ProjectKind;
  output: string;
}

/** Checked in order: the first match wins (Next before React, SvelteKit before Svelte…). */
const FRAMEWORKS: Framework[] = [
  { dep: "next", name: "Next.js", kind: "fullstack", output: ".next" },
  { dep: "nuxt", name: "Nuxt", kind: "fullstack", output: ".output" },
  { dep: "@sveltejs/kit", name: "SvelteKit", kind: "fullstack", output: "build (adapter-dependent)" },
  { dep: "@remix-run/react", name: "Remix", kind: "fullstack", output: "build" },
  { dep: "astro", name: "Astro", kind: "frontend", output: "dist" },
  { dep: "gatsby", name: "Gatsby", kind: "frontend", output: "public" },
  { dep: "@angular/core", name: "Angular", kind: "frontend", output: "dist/<project>" },
  { dep: "react-scripts", name: "Create React App", kind: "frontend", output: "build" },
  { dep: "vite", name: "Vite", kind: "frontend", output: "dist" },
  { dep: "express", name: "Express", kind: "server", output: "—" },
  { dep: "fastify", name: "Fastify", kind: "server", output: "—" },
];

const PUBLIC_PREFIX = /^(VITE_|NEXT_PUBLIC_|REACT_APP_|PUBLIC_|NUXT_PUBLIC_|GATSBY_)/;
const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|API_?KEY|SERVICE_ROLE|CLIENT_SECRET|_KEY$)/i;

const ENV_PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g,
  /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
  /os\.environ(?:\.get)?\(?\[?["']([A-Z][A-Z0-9_]*)["']/g,
  /os\.getenv\(["']([A-Z][A-Z0-9_]*)["']/g,
  /Deno\.env\.get\(["']([A-Z][A-Z0-9_]*)["']\)/g,
];
/** Set by the build tools themselves, not by the user. */
const BUILT_IN = new Set(["NODE_ENV", "MODE", "DEV", "PROD", "SSR", "BASE_URL", "PORT", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "NETLIFY", "CI"]);

const base = (name: string) => name.split("/").pop() ?? name;
const isExampleEnv = (name: string) => /^\.env\.(example|sample|template)$/i.test(base(name));
const isRealEnv = (name: string) => /^\.env(\..+)?$/i.test(base(name)) && !isExampleEnv(name);

function envVars(files: SourceFile[]): EnvVar[] {
  const found = new Map<string, Set<string>>();
  const add = (name: string, file: string) => {
    if (BUILT_IN.has(name)) return;
    if (!found.has(name)) found.set(name, new Set());
    found.get(name)!.add(file);
  };
  for (const f of files) {
    if (isRealEnv(f.name)) continue; // never read values from a real .env
    if (isExampleEnv(f.name)) {
      for (const line of f.content.split(/\r?\n/)) {
        const m = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/.exec(line);
        if (m) add(m[1]!, f.name);
      }
      continue;
    }
    for (const re of ENV_PATTERNS) for (const m of f.content.matchAll(re)) add(m[1]!, f.name);
  }
  return [...found.entries()]
    .map(([name, set]) => ({ name, public: PUBLIC_PREFIX.test(name), secretLike: SECRET_NAME.test(name.replace(PUBLIC_PREFIX, "")), files: [...set].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readPackage(files: SourceFile[]): { deps: Record<string, string>; scripts: Record<string, string> } | null | "invalid" {
  const pkg = files.find((f) => base(f.name) === "package.json" && !f.name.includes("node_modules"));
  if (!pkg) return null;
  try {
    const j = JSON.parse(pkg.content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> };
    return { deps: { ...j.dependencies, ...j.devDependencies }, scripts: j.scripts ?? {} };
  } catch {
    return "invalid";
  }
}

function installCommand(files: SourceFile[]): string {
  const names = new Set(files.map((f) => base(f.name)));
  if (names.has("pnpm-lock.yaml")) return "pnpm install";
  if (names.has("yarn.lock")) return "yarn install";
  if (names.has("bun.lockb") || names.has("bun.lock")) return "bun install";
  return "npm install";
}

export function inspectDeploy(files: SourceFile[]): DeployReport {
  const issues: Issue[] = [];
  const env = envVars(files);
  const names = files.map((f) => f.name);
  const pkg = readPackage(files);
  let kind: ProjectKind = "unknown";
  let framework: string | null = null;
  let build: string | null = null;
  let output: string | null = null;
  let install: string | null = null;

  if (pkg === "invalid") {
    issues.push({ level: "blocker", text: "package.json isn't valid JSON, so no provider could install or build the project." });
  } else if (pkg) {
    const fw = FRAMEWORKS.find((f) => f.dep in pkg.deps);
    install = installCommand(files);
    build = pkg.scripts.build ? "npm run build" : null;
    if (fw) {
      framework = fw.name;
      kind = fw.kind;
      output = fw.output;
    } else {
      kind = pkg.scripts.start ? "server" : "frontend";
    }
    if (!build && kind !== "server") issues.push({ level: "warning", text: 'package.json has no "build" script. Most hosts run one to produce the site.' });
    if (kind === "server") issues.push({ level: "warning", text: "This looks like a long-running Node server. Vercel and Netlify run serverless functions instead, so it would need adapting or a host that runs servers." });
  } else if (names.some((n) => base(n) === "index.html") && !names.some((n) => /\.(tsx?|jsx)$/.test(n))) {
    kind = "static";
    framework = "Static HTML";
    output = ".";
  } else if (names.some((n) => /(^|\/)(requirements\.txt|pyproject\.toml)$/.test(n) || n.endsWith(".py"))) {
    kind = "python";
    issues.push({ level: "info", text: "A Python project. Velora's planned providers (Vercel, Netlify) host Python only as serverless functions; a Flask or Django app usually needs a different host." });
  }

  if (pkg === null && kind === "unknown") {
    issues.push({
      level: "blocker",
      text: "package.json isn't among the loaded files, so the framework, build command and output folder can't be confirmed. Load it in Studio to check.",
    });
  }

  const realEnv = names.filter(isRealEnv);
  if (realEnv.length)
    issues.push({ level: "blocker", text: `${realEnv.join(", ")} is loaded. Secret files must never be deployed or committed; set the values in the host's environment settings instead.` });

  for (const v of env.filter((v) => v.public && v.secretLike))
    issues.push({ level: "warning", text: `${v.name} looks like a secret but its prefix makes it public: it would be bundled into the browser code anyone can read.` });

  const secrets = env.filter((v) => !v.public);
  if (secrets.length) issues.push({ level: "info", text: `${secrets.length} environment variable${secrets.length === 1 ? "" : "s"} must be set in the host's settings before the deployed app will work.` });

  const supportFor = (p: "vercel" | "netlify"): Support => {
    if (kind === "unknown") return "unknown";
    if (kind === "python") return p === "vercel" ? "unknown" : "unsupported";
    if (kind === "server") return "unsupported";
    return "supported";
  };

  return { kind, framework, install, build, output, env, issues, providers: { vercel: supportFor("vercel"), netlify: supportFor("netlify") }, basis: files.length };
}
