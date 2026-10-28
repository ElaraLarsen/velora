import { handle } from "./_handler";

export function POST(request: Request) {
  return handle(request, "/api/extract");
}
