# Synthetic safeguard test report

**Date:** 2026-10-28 (re-run 07:08 UTC, 12:38 IST)
**Scope:** Handwave's deterministic safeguards only, on fabricated files and hand-written model responses. No AI, no network, no MedBridge source.

## Commands and results

```bash
npm test          # vitest run
npm run build     # tsc --noEmit && vite build
```

| Check | Result |
|---|---|
| Test files | 6 passed (6) |
| Tests | **81 passed (81)**, 0 failed |
| Production build (type check + bundle) | **Passed** |

| Test file | Tests |
|---|---|
| `tests/handlers.test.ts` | 20 |
| `tests/quoteVerifier.test.ts` | 15 |
| `tests/verdictRules.test.ts` | 10 |
| `tests/sourceAndPrompt.test.ts` | 8 |
| `tests/hedges.test.ts` | 6 |
| `tests/safeguards.synthetic.test.ts` (new) | 22 |

## What the synthetic suite covers

Fixtures: `tests/fixtures/synthetic/` (a made-up clinic photo-upload app and `check-responses.json`, hand-written adversarial model output).

- **Accepted quotes:** exact line; re-indented multi-line (display shows the file's own text); two-line contradiction; duplicated line (both occurrences); Tamil and Hindi lines; CRLF endings; a file within 100 bytes of the 150 KB limit with the quote at line 3,001.
- **Line numbers** checked against an independent oracle that shares no code with the verifier.
- **Rejected quotes:** invented, one character off, wrong file, file never uploaded, too short, regex characters. Each downgrades the verdict and carries no displayable text.
- **Verdict rules:** CONTRADICTED without quotes is downgraded; NOT VERIFIABLE is never upgraded; mixed real/invented quotes keep only the real one; unconfirmed claim ids ignored; first duplicate wins; missing verdict becomes NOT VERIFIABLE; summary counts.
- **Malformed output** (invalid JSON, bad enum, 5 quotes, missing field, wrong shape): one retry, then an error with no verdicts.
- **Browser re-verification** downgrades evidence missing from altered files.
- **Fix prompt** contains only the claim, the user's notes and verified lines.
- **Router in demo mode** judges nothing and makes no network call.
- **Network block:** `fetch`, `http.request/get`, `https.request/get` blocked and counted; the only blocked attempts were the test's own three probes.

One failure occurred while writing the suite: the near-limit fixture generated more than 150 KB of filler before padding. It was a test-setup error, fixed by reducing the filler; no assertion was weakened and no existing test changed.

## Integrity

- Production files (`shared/`, `server/`, `api/`, `src/`, `vite.config.ts`, `index.html`, `package.json`, `tsconfig.json`): unchanged, verified by SHA-1 against a pre-change snapshot.
- No MedBridge source was read by the suite or sent anywhere. No commits, no deployment.

## Limitations: what this does not validate

- Whether Handwave finds real, previously unknown gaps (the kill test's question). Problems here were planted.
- The PASS / FAIL / INCONCLUSIVE verdict and the 70% precision bar: there is no AI, so no accuracy or false-positive rate.
- Claim extraction from real speech, and evidence-check accuracy on real code.
- Real Wispr Flow input (hedges kept, mis-transcriptions).
- Live Gemini behaviour: responses, latency, free-tier quota at ~250 KB.
- The value of explaining first, or of speaking versus typing.
- The user's manual Confirmed / False alarm step on a real app.
- It cannot serve as the submission's "real result".
- **Known product limit:** the safeguards prove a quote exists in the file, not that it supports the verdict. A real line attached to a wrong conclusion passes every check; only the manual test catches it.
