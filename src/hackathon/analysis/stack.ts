// Tech Stack Inspector: what the uploaded files show, line by line. Deterministic, no AI.
// Only uploaded files are read; anything named only in the user's setup text is an assumption.

import type { SourceFile } from "../../../shared/types";

/** A line cut from an uploaded file. `line` is 1-based; absent when the whole file is the evidence. */
export interface EvidenceRef {
  file: string;
  line?: number;
  text?: string;
}

export type StackKind = "language" | "framework" | "library" | "integration" | "data" | "config" | "runtime";

export interface StackItem {
  name: string;
  kind: StackKind;
  /** detected: seen in an uploaded file. assumption: only named in the setup description. */
  basis: "detected" | "assumption";
  how: string;
  evidence: EvidenceRef[];
}

export interface StackReport {
  items: StackItem[];
  files: string[];
}

const LANGUAGES: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript (JSX)", js: "JavaScript", jsx: "JavaScript (JSX)", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", rb: "Ruby", go: "Go", java: "Java", kt: "Kotlin", swift: "Swift", php: "PHP", cs: "C#", rs: "Rust",
  sql: "SQL", vue: "Vue single-file components", svelte: "Svelte components", html: "HTML", css: "CSS", scss: "SCSS",
  prisma: "Prisma schema", graphql: "GraphQL",
};

/** Known packages and modules. Anything else imported is listed as a dependency, unclassified. */
const KNOWN: Record<string, { name: string; kind: StackKind }> = {
  react: { name: "React", kind: "framework" }, "react-dom": { name: "React", kind: "framework" },
  next: { name: "Next.js", kind: "framework" }, vue: { name: "Vue", kind: "framework" }, svelte: { name: "Svelte", kind: "framework" },
  "@sveltejs/kit": { name: "SvelteKit", kind: "framework" }, express: { name: "Express", kind: "framework" },
  fastify: { name: "Fastify", kind: "framework" }, hono: { name: "Hono", kind: "framework" },
  django: { name: "Django", kind: "framework" }, flask: { name: "Flask", kind: "framework" }, fastapi: { name: "FastAPI", kind: "framework" },
  "@supabase/supabase-js": { name: "Supabase", kind: "integration" }, "@supabase/ssr": { name: "Supabase", kind: "integration" },
  supabase: { name: "Supabase", kind: "integration" }, firebase: { name: "Firebase", kind: "integration" },
  "firebase-admin": { name: "Firebase", kind: "integration" }, stripe: { name: "Stripe", kind: "integration" },
  openai: { name: "OpenAI API", kind: "integration" }, "@anthropic-ai/sdk": { name: "Anthropic API", kind: "integration" },
  "@google/genai": { name: "Google Gemini API", kind: "integration" }, "@google/generative-ai": { name: "Google Gemini API", kind: "integration" },
  resend: { name: "Resend (email)", kind: "integration" }, nodemailer: { name: "Nodemailer (email)", kind: "integration" },
  twilio: { name: "Twilio", kind: "integration" }, "next-auth": { name: "NextAuth", kind: "integration" },
  "@clerk/nextjs": { name: "Clerk", kind: "integration" }, "@clerk/clerk-react": { name: "Clerk", kind: "integration" },
  "@aws-sdk/client-s3": { name: "AWS S3", kind: "integration" }, "aws-sdk": { name: "AWS SDK", kind: "integration" },
  "@prisma/client": { name: "Prisma", kind: "data" }, prisma: { name: "Prisma", kind: "data" }, mongoose: { name: "MongoDB (Mongoose)", kind: "data" },
  mongodb: { name: "MongoDB", kind: "data" }, pg: { name: "PostgreSQL client", kind: "data" }, mysql2: { name: "MySQL client", kind: "data" },
  redis: { name: "Redis", kind: "data" }, ioredis: { name: "Redis", kind: "data" }, sqlalchemy: { name: "SQLAlchemy", kind: "data" },
  "drizzle-orm": { name: "Drizzle ORM", kind: "data" }, axios: { name: "Axios", kind: "library" }, zod: { name: "Zod", kind: "library" },
  requests: { name: "Requests", kind: "library" }, tailwindcss: { name: "Tailwind CSS", kind: "library" }, vite: { name: "Vite", kind: "library" },
};

/** Recognisable code patterns, read one line at a time. */
const PATTERNS: { re: RegExp; name: string; kind: StackKind; how: string; ext?: string[] }[] = [
  { re: /\bsupabase\s*\.\s*(from|auth|storage|rpc|channel)\b/, name: "Supabase", kind: "integration", how: "Supabase client calls" },
  { re: /\bauth\.(uid|users|jwt)\b/, name: "Supabase", kind: "integration", how: "Supabase auth schema in SQL", ext: ["sql"] },
  { re: /\bcreate\s+table\b/i, name: "SQL database schema", kind: "data", how: "CREATE TABLE statements", ext: ["sql"] },
  { re: /\b(enable\s+row\s+level\s+security|create\s+policy)\b/i, name: "Postgres row-level security", kind: "data", how: "Row-level security policies", ext: ["sql"] },
];

const DOC_FILES = /(^|\/)(readme|license|contributing)(\.[a-z]+)?$/i;

function ext(name: string): string {
  if (name.toLowerCase().endsWith(".env.example")) return "env.example";
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

function packageOf(spec: string): string | null {
  if (spec.startsWith(".") || spec.startsWith("/")) return null;
  if (spec.startsWith("node:")) return "node:";
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

const IMPORT_RES = [/\bfrom\s+["']([^"']+)["']/g, /\bimport\s+["']([^"']+)["']/g, /\brequire\(\s*["']([^"']+)["']\s*\)/g, /\bimport\(\s*["']([^"']+)["']\s*\)/g];
const PY_IMPORT = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/;
const ENV_RES = [/\bprocess\.env\.([A-Z][A-Z0-9_]*)/g, /\bimport\.meta\.env\.([A-Z][A-Z0-9_]*)/g, /\bos\.environ(?:\.get\(|\[)\s*["']([A-Z][A-Z0-9_]*)["']/g, /\bDeno\.env\.get\(\s*["']([A-Z][A-Z0-9_]*)["']/g];
const NODE_BUILTINS = new Set(["fs", "path", "http", "https", "crypto", "os", "url", "stream", "child_process", "util", "events", "zlib", "net"]);

/** Names the user may mention in their setup description, matched as whole words. */
const MENTIONS: { re: RegExp; name: string }[] = [
  { re: /\bsupabase\b/i, name: "Supabase" }, { re: /\bfirebase\b/i, name: "Firebase" }, { re: /\bstripe\b/i, name: "Stripe" },
  { re: /\bpostgres(ql)?\b/i, name: "PostgreSQL" }, { re: /\bmongo(db)?\b/i, name: "MongoDB" }, { re: /\bmysql\b/i, name: "MySQL" },
  { re: /\bredis\b/i, name: "Redis" }, { re: /\bopenai\b/i, name: "OpenAI API" }, { re: /\bgemini\b/i, name: "Google Gemini API" },
  { re: /\b(anthropic|claude)\b/i, name: "Anthropic API" }, { re: /\breact\b/i, name: "React" }, { re: /\bnext(\.js|js)?\b/i, name: "Next.js" },
  { re: /\bvue\b/i, name: "Vue" }, { re: /\bsvelte\b/i, name: "Svelte" }, { re: /\bexpress\b/i, name: "Express" },
  { re: /\bvercel\b/i, name: "Vercel" }, { re: /\bnetlify\b/i, name: "Netlify" }, { re: /\baws\b/i, name: "AWS" },
  { re: /\bdocker\b/i, name: "Docker" },
  { re: /\b(?:(?:email|password|google|github|oauth|magic[- ]link)\s+)?(?:log ?in|sign[- ]?in|sign[- ]?up|auth(?:entication)?)\b/i, name: "Authentication" },
];

export function inspectStack(files: SourceFile[], context: string): StackReport {
  const found = new Map<string, StackItem>();
  const add = (name: string, kind: StackKind, how: string, ev: EvidenceRef) => {
    const key = `${kind}:${name}`;
    const item = found.get(key) ?? { name, kind, basis: "detected" as const, how, evidence: [] };
    if (!item.how.includes(how)) item.how = `${item.how}; ${how}`;
    if (!item.evidence.some((e) => e.file === ev.file && e.line === ev.line)) item.evidence.push(ev);
    found.set(key, item);
  };

  // Languages by file type: the whole file is the evidence.
  for (const f of files) {
    const lang = LANGUAGES[ext(f.name)];
    if (lang) add(lang, "language", "File type", { file: f.name });
  }

  const envNames = new Set<string>();
  for (const f of files) {
    const e = ext(f.name);
    const lines = f.content.replace(/\r\n?/g, "\n").split("\n");

    if (f.name.split("/").pop()?.toLowerCase() === "package.json") {
      try {
        const pkg = JSON.parse(f.content) as Record<string, Record<string, string> | undefined>;
        for (const field of ["dependencies", "devDependencies"]) {
          for (const dep of Object.keys(pkg[field] ?? {})) {
            const line = lines.findIndex((l) => l.includes(`"${dep}"`));
            const known = KNOWN[dep];
            add(known?.name ?? dep, known?.kind ?? "library", `Listed in ${field}`, { file: f.name, line: line + 1, text: lines[line]?.trim() });
          }
        }
      } catch {
        // Not valid JSON: nothing is claimed from it.
      }
      continue;
    }

    lines.forEach((text, i) => {
      const ev = { file: f.name, line: i + 1, text: text.trim() };
      const specs: string[] = [];
      if (["ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte"].includes(e)) {
        for (const re of IMPORT_RES) for (const m of text.matchAll(re)) specs.push(m[1]!);
      } else if (e === "py") {
        const m = text.match(PY_IMPORT);
        if (m) specs.push((m[1] ?? m[2])!.split(".")[0]!);
      }
      for (const spec of specs) {
        const pkg = packageOf(spec);
        if (!pkg) continue;
        if (pkg === "node:" || NODE_BUILTINS.has(pkg)) add("Node.js runtime", "runtime", "Node.js built-in modules imported", ev);
        else {
          const known = KNOWN[pkg];
          add(known?.name ?? pkg, known?.kind ?? "library", "Imported", ev);
        }
      }
      for (const p of PATTERNS) if ((!p.ext || p.ext.includes(e)) && p.re.test(text)) add(p.name, p.kind, p.how, ev);
      for (const re of ENV_RES) for (const m of text.matchAll(re)) {
        envNames.add(m[1]!);
        add("Environment variables", "config", "Read from the environment", ev);
      }
    });
  }

  const env = found.get("config:Environment variables");
  if (env) env.how = `Read from the environment: ${[...envNames].sort().join(", ")} (names only; values are never shown)`;

  const detectedNames = new Set([...found.values()].map((i) => i.name.toLowerCase()));
  const items = [...found.values()];
  for (const m of MENTIONS) {
    const hit = context.match(m.re);
    if (!hit) continue;
    const name = m.name === "Authentication" ? `Authentication (“${hit[0].trim()}”)` : m.name;
    if (detectedNames.has(m.name.toLowerCase())) continue;
    if (items.some((i) => i.name === name)) continue;
    items.push({ name, kind: "integration", basis: "assumption", how: "Named in your setup description; not found in the uploaded files", evidence: [] });
  }

  const order: StackKind[] = ["language", "framework", "integration", "data", "runtime", "library", "config"];
  items.sort((a, b) => (a.basis === b.basis ? order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name) : a.basis === "detected" ? -1 : 1));
  return { items, files: files.map((f) => f.name) };
}

/** Whether any uploaded file is documentation (README, LICENSE, CONTRIBUTING). */
export function isDocFile(name: string): boolean {
  return DOC_FILES.test(name);
}
