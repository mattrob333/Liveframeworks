import {
  createFrameworkRunIds,
  frameworkRunErrorPayload,
  frameworkRunErrorResponse,
  parseFrameworkRunRequest,
  runFrameworkGeneration,
} from "@/lib/server/frameworkRun";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// The run streams NDJSON progress events (phase, search_query, search_results,
// writing, research_complete) and ends with a {type:"result"} or {type:"error"}
// line. Request validation failures still return plain JSON with a 4xx status.
export async function POST(req) {
  const ids = createFrameworkRunIds();
  const requestId = ids.requestId;
  let runId = ids.runId;

  let input;
  try {
    input = await parseFrameworkRunRequest(req);
  } catch (error) {
    return frameworkRunErrorResponse(error, { requestId, runId });
  }
  runId = input.runId || runId;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = event => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The client went away; the run keeps its own abort signal.
        }
      };

      try {
        const result = await runFrameworkGeneration({
          ...input,
          clientSignal: req.signal,
          requestId,
          runId,
          onProgress: send,
        });
        send({ type: "result", ...result });
      } catch (error) {
        console.error("[api/framework-run] failed", {
          requestId,
          runId,
          code: error?.code || "framework_run_failed",
          status: error?.status || 500,
          message: error?.message || "Unknown error",
        });
        send({ type: "error", error: frameworkRunErrorPayload(error, { requestId, runId }) });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
}
