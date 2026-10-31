# Velora Deploy — architecture and current state (31 Oct 2026)

## What exists today

- **Deploy readiness** (`src/deploy/detect.ts`, shown in Hackathon → Submission):
  - It reads the loaded files and reports the framework, install and build commands, the output
    folder, the environment-variable *names* the code reads, and blocking issues.
  - Blocking issues include a missing package.json, a loaded `.env`, and secret-looking names with a
    public prefix.
  - It also reports whether Vercel and Netlify are a good fit.
  - It never reads values from a real `.env`, uploads nothing and contacts no provider. Tests are in
    `tests/focus.test.ts` ("deploy readiness").
- **Nothing deploys.** There is no provider connection, no token handling and no deployment
  endpoint. The UI says so in plain words.

## Why Velora can't deploy safely yet

1. **It doesn't hold the project.** Velora keeps at most 12 text files (250 KB) in memory, chosen for
   one feature's evidence check. A deployment needs the whole repository, or its built output.
2. **No place for credentials.**
   - The production API (`api/*.ts`, Vercel Functions) is stateless, with no user accounts or
     sessions.
   - It has no encrypted store where a provider token could live server-side.
   - A token in the browser would be exposed, which is not acceptable.
3. **No consent flow** for sending a user's private source to a third party.

## Smallest viable architecture: Git-based deploys through the user's own provider account

```
Browser (Velora)                 Velora server (api/deploy/*)            Provider
────────────────                 ────────────────────────────            ────────
Connect Vercel ───────────────▶  OAuth start (state + PKCE) ──────────▶  consent screen
                 ◀── redirect ── OAuth callback: exchange code ◀──────── code
                                 store token ENCRYPTED, keyed to session
Pick repo + branch ───────────▶  list repos (provider's Git integration)
Readiness report (detect.ts) ──▶ validate again server-side
"Deploy <repo>@<branch> to
 Vercel? Env var NAMES: …"  ───▶ create project / trigger deployment ──▶ build from the repo
Status (polling) ◀────────────── GET deployment status ◀──────────────── BUILDING / READY / ERROR
URL shown only when READY
```

- **Source of truth is the user's Git repository**, so Velora never uploads source files itself.
  The provider builds from the repo it is already authorised to read.
- **Vercel** (to verify against the current official API reference before implementing):
  - Create a deployment from a Git source through the Deployments API (`gitSource` with
    repository and ref).
  - Read its `readyState` until it is `READY` or `ERROR`.
  - Environment variables are set per project through the Projects API.
- **Netlify** (same caveat):
  - Create a site linked to the repository. This needs Netlify's GitHub App installed for that repo.
  - Alternatively, deploy a built folder by file digest.
  - Read the deploy `state` until it is `ready`.
- **GitHub** is only the repository host here. Velora doesn't push code, create repositories or
  change branches.

## Security requirements (all needed before the first real deployment)

- **Tokens:**
  - Only server-side, encrypted at rest, scoped as narrowly as the provider allows.
  - Never logged and never returned to the browser.
  - Revoked when the user disconnects.
- **OAuth:** a `state` parameter (and PKCE where supported) to prevent cross-site request forgery.
- **Consent before every deployment:** an explicit confirmation naming:
  - the provider, repository and branch;
  - the project name;
  - the environment-variable names.
- **Environment variables:**
  - Values are typed straight into the provider's settings, or sent once over TLS and never stored by
    Velora.
  - Real `.env` files are never deployed (detect.ts already blocks them).
- **Honest status:**
  - "Deployed" appears only when the provider reports the deployment ready, with the URL the
    provider returns.
  - Failure shows the provider's error.
- **Labels:** local preview, demo-mode sample and public deployment are always labelled differently.
- **Rate limiting:** reuse `server/rateLimit.ts` on every deploy endpoint.

## What has to be added (and who has to act)

| Piece | Notes |
|---|---|
| Velora user sessions | A signed, HTTP-only session cookie at minimum; accounts if deployments must outlive a browser |
| Encrypted secret store | For example a managed KV or Postgres with an application encryption key held in server env |
| OAuth app registrations | **The project owner** must register Velora with Vercel and Netlify (external accounts; needs explicit approval) |
| `api/deploy/*` endpoints | connect, callback, repos, validate, deploy, status, disconnect |
| UI | Connect, repository picker, confirmation dialog, status timeline, redeploy |
| Tests | Mocked provider responses for success, build failure, expired token, rate limit and revoked access; one real end-to-end deployment to a throwaway project, run by the owner |

## Delivery stages

1. Sessions and the secret store, with no provider yet. Covered by tests for token isolation.
2. Vercel connect and disconnect, and the repository list.
3. Deploy, status and redeploy for Vercel. Verified with one real deployment approved by the owner.
4. Netlify.
5. Studio entry point next to Prove, and the Hackathon "Working demo link" checklist item filled from
   a real deployment URL.

Public deployment counts as complete only after a real provider deployment has succeeded end to
end.
