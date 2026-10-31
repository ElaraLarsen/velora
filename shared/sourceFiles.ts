import type { SourceFile } from "./types.js";

// TEMPORARY for the MedBridge kill test (2026-10-28): raised from 100_000 / 200_000.
// Largest need measured: index.html 144,135 bytes; feature 3 set 244,052 bytes.
// Request-body caps (vite.config.ts, api/_handler.ts) stay at 300,000, above the 260,284-byte worst case.
export const LIMITS = {
  maxFiles: 12,
  maxFileBytes: 150_000,
  maxTotalBytes: 250_000,
} as const;

export const ALLOWED_EXTENSIONS = [
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "sql", "py", "rb", "go", "java", "kt", "swift",
  "php", "cs", "rs", "vue", "svelte", "html", "css", "scss", "yaml", "yml", "toml", "prisma", "graphql",
  "md", "txt", "env.example", "rules",
] as const;

export function extensionOf(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".env.example")) return "env.example";
  const dot = lower.lastIndexOf(".");
  return dot === -1 ? "" : lower.slice(dot + 1);
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export interface FileProblem {
  file?: string;
  message: string;
}

/** Validates an upload. Used in the browser before sending and again on the server. */
export function validateSourceFiles(files: SourceFile[]): FileProblem[] {
  const problems: FileProblem[] = [];
  if (files.length === 0) problems.push({ message: "Add at least one source file." });
  if (files.length > LIMITS.maxFiles) problems.push({ message: `Use at most ${LIMITS.maxFiles} files for one feature.` });

  const seen = new Set<string>();
  let total = 0;
  for (const f of files) {
    if (seen.has(f.name)) problems.push({ file: f.name, message: "Two files have the same name." });
    seen.add(f.name);
    const ext = extensionOf(f.name);
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      problems.push({ file: f.name, message: "Not a supported source or text file." });
    }
    if (f.content.includes("\u0000")) problems.push({ file: f.name, message: "Looks like a binary file." });
    const size = byteLength(f.content);
    if (size > LIMITS.maxFileBytes) problems.push({ file: f.name, message: `Larger than ${LIMITS.maxFileBytes / 1000} KB.` });
    if (size === 0 || f.content.trim() === "") problems.push({ file: f.name, message: "File is empty." });
    total += size;
  }
  if (total > LIMITS.maxTotalBytes) {
    problems.push({ message: `Files add up to more than ${LIMITS.maxTotalBytes / 1000} KB. Upload only the files for one feature.` });
  }
  return problems;
}

export function countLines(text: string): number {
  if (text.length === 0) return 0;
  return text.replace(/\r\n?/g, "\n").split("\n").length;
}
