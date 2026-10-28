
import { describe, expect, it } from "vitest";
import { lineAt, spanInText, verifyQuote } from "../shared/quoteVerifier";
import type { SourceFile } from "../shared/types";

const files: SourceFile[] = [
  {
    name: "src/notes.ts",
    content: [
      "import { supabase } from './client';",
      "",
      "export async function listNotes() {",
      "  const { data } = await supabase.from('notes').select('*');",
      "  return data;",
      "}",
      "",
      "export async function listNotesAgain() {",
      "  const { data } = await supabase.from('notes').select('*');",
      "  return data;",
      "}",
    ].join("\n"),
  },
  {
    name: "supabase/policy.sql",
    content: 'create policy "read notes" on notes\r\n  for select using (true);\r\n',
  },
];

describe("verifyQuote", () => {
  it("verifies an exact quote and computes line numbers in code", () => {
    const r = verifyQuote(
      "export async function listNotes() {",
      "src/notes.ts",
      files,
    );

    expect(r.status).toBe("verified");
    expect(r.match).toBe("exact");
    expect(r.location).toEqual({
      file: "src/notes.ts",
      lineStart: 3,
      lineEnd: 3,
    });
    expect(r.sourceText).toBe("export async function listNotes() {");
  });

  it("reports duplicate occurrences without selecting an ambiguous location", () => {
    const r = verifyQuote(
      "const { data } = await supabase.from('notes').select('*');",
      "src/notes.ts",
      files,
    );

    expect(r.status).toBe("verified");
    expect(r.occurrences.map((o) => o.lineStart)).toEqual([4, 9]);
    expect(r.location).toBeUndefined();
    expect(r.sourceText).toBeUndefined();
    expect(r.linesText).toBeUndefined();
  });

  it("verifies a multi-line quote and its line range", () => {
    const quote =
      "export async function listNotes() {\n" +
      "  const { data } = await supabase.from('notes').select('*');\n" +
      "  return data;";

    const r = verifyQuote(quote, "src/notes.ts", files);

    expect(r.status).toBe("verified");
    expect(r.location).toMatchObject({ lineStart: 3, lineEnd: 5 });
  });

  it("matches across CRLF line endings", () => {
    const r = verifyQuote(
      'create policy "read notes" on notes\n  for select using (true);',
      "supabase/policy.sql",
      files,
    );

    expect(r.status).toBe("verified");
    expect(r.location).toMatchObject({ lineStart: 1, lineEnd: 2 });
  });

  it("tolerates re-indentation but displays the file's own text", () => {
    const r = verifyQuote(
      "export async function listNotes() {\n" +
      "const { data }   = await supabase.from('notes').select('*');",
      "src/notes.ts",
      files,
    );

    expect(r.status).toBe("verified");
    expect(r.match).toBe("whitespace");
    expect(r.sourceText).toBe(
      "export async function listNotes() {\n" +
      "  const { data } = await supabase.from('notes').select('*');",
    );
  });

  it("returns complete source lines for a uniquely located quote", () => {
    const r = verifyQuote(
      "export async function listNotes() {",
      "src/notes.ts",
      files,
    );

    expect(r.status).toBe("verified");
    expect(r.linesText).toBe("export async function listNotes() {");
  });

  it("rejects a fabricated quote", () => {
    const r = verifyQuote(
      "const key = process.env.OPENAI_API_KEY;",
      "src/notes.ts",
      files,
    );

    expect(r.status).toBe("not_found");
    expect(r.sourceText).toBeUndefined();
    expect(r.location).toBeUndefined();
  });

  it("rejects a quote that differs by one character", () => {
    const r = verifyQuote(
      "export async function listNote() {",
      "src/notes.ts",
      files,
    );

    expect(r.status).toBe("not_found");
  });

  it("rejects a real quote attributed to the wrong file", () => {
    const r = verifyQuote("for select using (true);", "src/notes.ts", files);

    expect(r.status).toBe("wrong_file");
    expect(r.sourceText).toBeUndefined();
  });

  it("rejects a quote citing a file that was never uploaded", () => {
    const r = verifyQuote(
      "export async function listNotes() {",
      "src/missing.ts",
      files,
    );

    expect(r.status).toBe("wrong_file");
  });

  it("rejects quotes too short to be evidence", () => {
    expect(verifyQuote("return data;", "src/notes.ts", files).status).toBe(
      "too_short",
    );
    expect(verifyQuote("   }   ", "src/notes.ts", files).status).toBe(
      "too_short",
    );
  });

  it("is not fooled by regex characters in the quote", () => {
    const r = verifyQuote("select('*')); .* (", "src/notes.ts", files);

    expect(r.status).toBe("not_found");
  });
});

describe("lineAt", () => {
  it("counts lines from 1", () => {
    expect(lineAt("a\nb\nc", 0)).toBe(1);
    expect(lineAt("a\nb\nc", 2)).toBe(2);
    expect(lineAt("a\nb\nc", 4)).toBe(3);
  });
});

describe("spanInText", () => {
  const explanation =
    "When I save a note it goes to Supabase. Only I can see my notes, I think.";

  it("accepts spans from the explanation regardless of case and spacing", () => {
    expect(spanInText("only I can see   my notes", explanation)).toBe(true);
  });

  it("rejects spans the user never said", () => {
    expect(spanInText("notes are encrypted", explanation)).toBe(false);
    expect(spanInText("   ", explanation)).toBe(false);
  });
});
