import { describe, expect, it } from "vitest";
import { buildFixPrompt } from "../shared/fixPrompt";
import { LIMITS, countLines, validateSourceFiles } from "../shared/sourceFiles";
import { applyVerdictRules } from "../shared/verdictRules";

describe("validateSourceFiles", () => {
  it("accepts a normal upload", () => {
    expect(validateSourceFiles([{ name: "src/app.tsx", content: "export {}" }])).toEqual([]);
  });

  it("rejects empty uploads, binaries, unsupported types, duplicates and oversize files", () => {
    expect(validateSourceFiles([])).toHaveLength(1);
    expect(validateSourceFiles([{ name: "a.png", content: "x" }])[0]!.message).toMatch(/supported/);
    expect(validateSourceFiles([{ name: "a.ts", content: "ab\u0000cd" }])[0]!.message).toMatch(/binary/);
    expect(validateSourceFiles([{ name: "a.ts", content: "x" }, { name: "a.ts", content: "y" }])[0]!.message).toMatch(/same name/);
    expect(validateSourceFiles([{ name: "a.ts", content: "x".repeat(LIMITS.maxFileBytes + 1) }]).some((p) => /150 KB/.test(p.message))).toBe(true);
    expect(validateSourceFiles([{ name: "a.ts", content: "  \n " }])[0]!.message).toMatch(/empty/);
  });

  it("rejects too many files and too much total size", () => {
    const many = Array.from({ length: 13 }, (_, i) => ({ name: `f${i}.ts`, content: "x" }));
    expect(validateSourceFiles(many).some((p) => /at most 12/.test(p.message))).toBe(true);
    const big = Array.from({ length: 3 }, (_, i) => ({ name: `f${i}.ts`, content: "x".repeat(90_000) }));
    expect(validateSourceFiles(big).some((p) => /250 KB/.test(p.message))).toBe(true);
  });

  it("accepts the measured MedBridge sizes and rejects one byte over each limit", () => {
    // index.html is 144,135 bytes; the largest feature set (i18n.js + app.js + index.html) is 244,052 bytes.
    const set = [
      { name: "index.html", content: "x".repeat(144_135) },
      { name: "js/app.js", content: "x".repeat(78_425) },
      { name: "js/i18n.js", content: "x".repeat(21_492) },
    ];
    expect(validateSourceFiles(set)).toEqual([]);
    expect(validateSourceFiles([{ name: "a.html", content: "x".repeat(LIMITS.maxFileBytes) }])).toEqual([]);
    expect(validateSourceFiles([{ name: "a.html", content: "x".repeat(LIMITS.maxFileBytes + 1) }])).toHaveLength(1);
    const atTotal = [
      { name: "a.html", content: "x".repeat(LIMITS.maxFileBytes) },
      { name: "b.js", content: "x".repeat(LIMITS.maxTotalBytes - LIMITS.maxFileBytes) },
    ];
    expect(validateSourceFiles(atTotal)).toEqual([]);
    atTotal[1]!.content += "x";
    expect(validateSourceFiles(atTotal).map((p) => p.message)).toEqual([expect.stringMatching(/250 KB/)]);
  });

  it("counts UTF-8 bytes, not characters, for multi-byte scripts", () => {
    // Tamil letters are 3 bytes each in UTF-8: 50,001 of them exceed 150 KB though they are only 50,001 characters.
    expect(validateSourceFiles([{ name: "i18n.js", content: "த".repeat(50_001) }]).some((p) => /150 KB/.test(p.message))).toBe(true);
  });

  it("counts lines across line-ending styles", () => {
    expect(countLines("a\r\nb\nc")).toBe(3);
    expect(countLines("")).toBe(0);
  });
});

describe("buildFixPrompt", () => {
  const files = [{ name: "save.ts", content: "export function save(note) {\n  db.insert(note);\n  toast('Saved!');\n}\n" }];
  const claim = { id: "c1", text: "If saving fails, the user sees an error", category: "failure" as const };

  it("uses only the verified source text and the user's own observation", () => {
    const [verdict] = applyVerdictRules(
      [claim],
      [
        {
          claimId: "c1",
          verdict: "CONTRADICTED",
          explanation: "AI wording that must not leak into the prompt",
          quotes: [
            { file: "save.ts", text: "db.insert(note);\ntoast('Saved!');" },
            { file: "save.ts", text: "this line was invented by the model" },
          ],
          alternativeInterpretation: "",
          missingContext: "",
          consequence: "MEDIUM",
          manualTest: { steps: ["Go offline", "Save"], expected: "Error" },
        },
      ],
      files,
    );
    const prompt = buildFixPrompt({ claim, verdict: verdict!, observation: "Offline save still said Saved!" });
    expect(prompt).toContain("What I intended: If saving fails, the user sees an error");
    expect(prompt).toContain("Offline save still said Saved!");
    expect(prompt).toContain("save.ts, lines 2-3:");
    expect(prompt).toContain("  db.insert(note);\n  toast('Saved!');");
    expect(prompt).not.toContain("invented by the model");
    expect(prompt).not.toContain("AI wording");
  });

  it("says so when the user left no notes", () => {
    const [verdict] = applyVerdictRules([claim], [], files);
    expect(buildFixPrompt({ claim, verdict: verdict!, observation: "  " })).toContain("did not write notes");
  });
});
