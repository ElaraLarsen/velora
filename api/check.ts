import { handle } from "./_handler.js";

export function POST(request: Request) {
  return handle(request, "/api/check");
}
