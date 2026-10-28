import { route } from "../server/router";

/** Adapts a Web-standard Request (Vercel Functions) to the shared router. */
export async function handle(request: Request, path: string): Promise<Response> {
  let body: unknown = undefined;
  if (request.method === "POST") {
    const raw = await request.text();
    if (raw.length > 300_000) return Response.json({ error: "invalid_body", message: "Request too large." }, { status: 413 });
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      return Response.json({ error: "invalid_body", message: "Request body is not valid JSON." }, { status: 400 });
    }
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const result = await route(path, request.method, body, ip, process.env);
  return Response.json(result.body, { status: result.status });
}
