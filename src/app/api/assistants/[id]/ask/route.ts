import { defaultAskDeps, launchAsk } from "@/lib/assistants/ask";
import { isAssistantId } from "@/lib/assistants/ids";
import { refuseForeign } from "@/lib/lifecycle/request-guard";
import { failure, readJson } from "@/lib/meeting-db/http";
import type { IdRouteContext } from "../../../types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_000_000;

export async function POST(
  request: Request,
  { params }: IdRouteContext,
): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isAssistantId(id)) return failure("unknown-assistant", 404);
  const parsed = await readJson(request, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const prompt = (parsed.value as { prompt?: unknown } | undefined)?.prompt;
  if (typeof prompt !== "string") return failure("prompt-required", 400);
  const result = await launchAsk(id, prompt, defaultAskDeps());
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
