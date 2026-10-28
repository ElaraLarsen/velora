/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage } from "node:http";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";

const MAX_BODY_BYTES = 300_000;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("too_large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Serves /api/* from server/router.ts during local development. Secrets come from .env and never reach the browser bundle. */
function handwaveApi(env: Record<string, string>): Plugin {
  const mount = (server: ViteDevServer | { middlewares: ViteDevServer["middlewares"] }, load: () => Promise<typeof import("./server/router")>) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ?? "";
      if (!url.startsWith("/api/")) return next();
      res.setHeader("Content-Type", "application/json");
      let body: unknown = undefined;
      if (req.method === "POST") {
        try {
          const raw = await readBody(req);
          body = raw ? JSON.parse(raw) : undefined;
        } catch (e) {
          res.statusCode = (e as Error).message === "too_large" ? 413 : 400;
          res.end(JSON.stringify({ error: "invalid_body", message: res.statusCode === 413 ? "Request too large." : "Request body is not valid JSON." }));
          return;
        }
      }
      try {
        const { route } = await load();
        const result = await route(url.split("?")[0]!, req.method ?? "GET", body, req.socket.remoteAddress ?? "local", env);
        res.statusCode = result.status;
        res.end(JSON.stringify(result.body));
      } catch (e) {
        console.error("[handwave api]", e);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "server_error", message: "Unexpected server error." }));
      }
    });
  };
  return {
    name: "handwave-api",
    configureServer(server) {
      mount(server, () => server.ssrLoadModule("/server/router.ts") as Promise<typeof import("./server/router")>);
    },
  };
}

export default defineConfig(({ mode }) => {
  // Empty prefix loads every variable for the server side only; Vite still exposes only VITE_* to the browser.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), handwaveApi(env)],
    server: { port: 5173 },
    test: { include: ["tests/**/*.test.ts"] },
  };
});
