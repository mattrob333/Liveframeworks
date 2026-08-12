import {
  createFrameworkRunIds,
  frameworkRunErrorResponse,
  parseFrameworkRunRequest,
  runFrameworkGeneration,
} from "@/lib/server/frameworkRun";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req) {
  const ids = createFrameworkRunIds();
  const requestId = ids.requestId;
  let runId = ids.runId;

  try {
    const input = await parseFrameworkRunRequest(req);
    runId = input.runId || runId;
    const result = await runFrameworkGeneration({
      ...input,
      clientSignal: req.signal,
      requestId,
      runId,
    });
    return Response.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    console.error("[api/framework-run] failed", {
      requestId,
      runId,
      code: error?.code || "framework_run_failed",
      status: error?.status || 500,
      message: error?.message || "Unknown error",
    });
    return frameworkRunErrorResponse(error, { requestId, runId });
  }
}
