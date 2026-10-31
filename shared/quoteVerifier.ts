
import type { QuoteCheck, QuoteLocation, SourceFile } from "./types.js";

/** Quotes with fewer non-whitespace characters than this can match almost anywhere, so they don't count as evidence. */
export const MIN_QUOTE_CHARS = 12;

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function nonWhitespaceLength(text: string): number {
  return text.replace(/\s+/g, "").length;
}

/** 1-based line number of a character offset. */
export function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

interface Span {
  start: number;
  end: number;
}

function findExact(haystack: string, needle: string): Span[] {
  const spans: Span[] = [];
  let from = 0;

  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;

    spans.push({ start: idx, end: idx + needle.length });
    from = idx + 1;
  }

  return spans;
}

/**
 * Finds text while treating runs of whitespace as equivalent.
 * Returned spans point to the real text in the file.
 */
function findWhitespaceInsensitive(
  haystack: string,
  needle: string,
): Span[] {
  const tokens = needle.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const escaped = tokens.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(escaped.join("\\s+"), "g");
  const spans: Span[] = [];
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(haystack)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length });
    pattern.lastIndex = m.index + 1;
  }

  return spans;
}

function locate(
  content: string,
  needle: string,
): { spans: Span[]; match: "exact" | "whitespace" } | null {
  const exact = findExact(content, needle);
  if (exact.length > 0) return { spans: exact, match: "exact" };

  const loose = findWhitespaceInsensitive(content, needle);
  if (loose.length > 0) return { spans: loose, match: "whitespace" };

  return null;
}

function toLocation(
  file: string,
  content: string,
  span: Span,
): QuoteLocation {
  // A span ending on a newline still belongs to the preceding line.
  const lastChar = Math.max(span.start, span.end - 1);

  return {
    file,
    lineStart: lineAt(content, span.start),
    lineEnd: lineAt(content, lastChar),
  };
}

/**
 * Verifies that a quote occurs in its attributed source file.
 *
 * If the quote occurs more than once, all locations are returned,
 * but no single location or source snippet is selected.
 */
export function verifyQuote(
  claimedText: string,
  claimedFile: string,
  files: SourceFile[],
): QuoteCheck {
  const base: QuoteCheck = {
    status: "not_found",
    claimedText,
    claimedFile,
    occurrences: [],
  };

  const needle = normalizeLineEndings(claimedText);

  if (nonWhitespaceLength(needle) < MIN_QUOTE_CHARS) {
    return { ...base, status: "too_short" };
  }

  const normalized = files.map((f) => ({
    name: f.name,
    content: normalizeLineEndings(f.content),
  }));

  const cited = normalized.find((f) => f.name === claimedFile);

  if (cited) {
    const found = locate(cited.content, needle);

    if (found) {
      const occurrences = found.spans.map((span) =>
        toLocation(cited.name, cited.content, span),
      );

      // A repeated quote is real evidence, but its exact location is ambiguous.
      if (found.spans.length > 1) {
        return {
          ...base,
          status: "verified",
          occurrences,
          match: found.match,
        };
      }

      // A unique match can safely provide its source location and snippet.
      const span = found.spans[0]!;
      const location = occurrences[0]!;

      return {
        ...base,
        status: "verified",
        sourceText: cited.content.slice(span.start, span.end),
        linesText: cited.content
          .split("\n")
          .slice(location.lineStart - 1, location.lineEnd)
          .join("\n"),
        location,
        occurrences,
        match: found.match,
      };
    }
  }

  for (const other of normalized) {
    if (other.name === claimedFile) continue;

    if (locate(other.content, needle)) {
      return { ...base, status: "wrong_file" };
    }
  }

  return base;
}

/** Checks that a claim's source span comes from the user's explanation. */
export function spanInText(span: string, text: string): boolean {
  const needle = normalizeLineEndings(span).toLowerCase().trim();
  if (needle.length === 0) return false;

  const hay = normalizeLineEndings(text).toLowerCase();

  return (
    findExact(hay, needle).length > 0 ||
    findWhitespaceInsensitive(hay, needle).length > 0
  );
}
