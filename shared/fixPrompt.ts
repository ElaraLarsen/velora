import type { CheckedVerdict, ConfirmedClaim } from "./types.js";

export interface FixPromptInput {
  claim: ConfirmedClaim;
  verdict: CheckedVerdict;
  observation: string;
}

/**
 * Builds a prompt to paste into an AI app builder. Plain template, no AI call:
 * every fact in it comes from the user's claim, the verified quote and the user's own test notes.
 */
export function buildFixPrompt({ claim, verdict, observation }: FixPromptInput): string {
  const lines: string[] = [];
  lines.push("I tested my app and found a behaviour that doesn't match what I intended.");
  lines.push("");
  lines.push(`What I intended: ${claim.text}`);
  lines.push("");
  const note = observation.trim();
  lines.push(`What actually happened when I tested it: ${note || "(I confirmed the mismatch but did not write notes.)"}`);

  if (verdict.evidence.length > 0) {
    lines.push("");
    lines.push("The code that causes it:");
    for (const q of verdict.evidence) {
      const loc = q.location!;
      const range = loc.lineStart === loc.lineEnd ? `line ${loc.lineStart}` : `lines ${loc.lineStart}-${loc.lineEnd}`;
      lines.push("");
      lines.push(`${loc.file}, ${range}:`);
      lines.push("```");
      lines.push(q.linesText!);
      lines.push("```");
    }
  }

  lines.push("");
  lines.push("Please:");
  lines.push(`1. Change the app so that this is true: ${claim.text}`);
  lines.push("2. Tell me which files you changed and why, in plain language.");
  lines.push("3. Tell me exactly how I can test that it now works.");
  lines.push("Don't change unrelated features.");
  return lines.join("\n");
}
