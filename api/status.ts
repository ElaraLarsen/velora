import { handle } from "./_handler.js";

export function GET(request: Request) {
  return handle(request, "/api/status");
}
