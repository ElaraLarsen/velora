import { handleCheck, handleExtract, modeInfo, type ApiResult } from "./handlers.js";
import { selectProvider, type ServerEnv } from "./providers.js";
import { RateLimiter } from "./rateLimit.js";

// 30 AI calls per IP per 10 minutes. Module-level so it survives between requests on a warm instance.
const limiter = new RateLimiter(30, 10 * 60_000);

/** Framework-agnostic entry point used by the Vite dev server and the deployed functions. */
export async function route(path: string, method: string, body: unknown, ip: string, env: ServerEnv): Promise<ApiResult> {
  const provider = selectProvider(env);
  const deps = { provider, limiter, ip };

  if (path === "/api/status" && method === "GET") return { status: 200, body: modeInfo(provider) };
  if (path === "/api/extract" && method === "POST") return handleExtract(body, deps);
  if (path === "/api/check" && method === "POST") return handleCheck(body, deps);
  if (["/api/status", "/api/extract", "/api/check"].includes(path)) {
    return { status: 405, body: { error: "method_not_allowed", message: `${method} is not supported here.` } };
  }
  return { status: 404, body: { error: "not_found", message: "Unknown endpoint." } };
}
