# Handwave

Explain your AI-built app out loud. Handwave checks which of your beliefs the source code actually supports.

## The flow

1. **Load**: upload the files for one feature. They stay locked (names and line counts only).
2. **Explain**: answer one of five questions by talking through Wispr Flow into the text box.
3. **Claims**: an AI call that receives **only your explanation** turns it into claims. Hedge words are highlighted from a fixed list. You edit, delete or confirm each claim.
4. **Evidence**: a separate AI call receives the confirmed claims plus the files and proposes verdicts with quotes. Plain code then:
   - checks every quote word for word against the file it was attributed to (whitespace-tolerant, never content-tolerant),
   - computes line numbers itself,
   - shows only text cut from your files,
   - downgrades SUPPORTED/CONTRADICTED with no verified quote to NOT VERIFIABLE.
   The browser re-runs the same checks against the files it holds.
5. **Prove**: run the manual test in your app, write what happened, mark Confirmed or False alarm. Confirmed findings get a fix prompt built from a template (your claim, the verified lines, your notes; no AI wording).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # deterministic tests
npm run build      # type-check + production build
```

Without a key, Handwave runs in **demo mode** and says so everywhere. In demo mode, the bundled sample project replays pre-written responses through the real safeguards; any other code is not analysed (every claim comes back NOT VERIFIABLE).

To go live, copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Optionally set `GEMINI_MODEL` (default `gemini-3.5-flash-lite`; `gemini-2.5-flash` is closed to new API users).

## Layout

```
shared/   plain-code logic used by browser and server (quote verifier, hedges, verdict rules, fix prompt, schemas, sample)
server/   prompts, providers (Gemini, demo), handlers, router, rate limiter
api/      Vercel Functions entry points (extract, check, status)
src/      React UI (five steps)
tests/    Vitest: verifier, hedges, verdict rules, fix prompt, handler contracts with scripted providers
```

## Privacy

Uploaded source code is held in browser memory, sent to the server for the evidence check, and forwarded to the configured AI provider. It is not written to disk, a database or browser storage. On Gemini's free tier, Google states submitted content may be used to improve its products; the upload screen says so in live mode.
