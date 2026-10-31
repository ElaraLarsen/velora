import type { SourceFile } from "../../shared/types";

/**
 * A short fingerprint of a file set (names, order and contents), used to tell which files a result
 * was produced from. FNV-1a over UTF-16 code units: fast and synchronous. It identifies, it does
 * not protect: never use it for anything security-related.
 */
export function filesDigest(files: SourceFile[]): string {
  let h = 0x811c9dc5;
  const add = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    // A separator no file name or content can fake by concatenation.
    h ^= 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  for (const f of files) {
    add(f.name);
    add(String(f.content.length));
    add(f.content);
  }
  return `${files.length}-${h.toString(16).padStart(8, "0")}`;
}
