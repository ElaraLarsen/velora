import { handle } from "./_handler";

export function GET(request: Request) {
  return handle(request, "/api/status");
}
