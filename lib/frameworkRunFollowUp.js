// A finished needs_input run may ask once. A directed follow-up that says
// "do not ask again" / "draw the matrix" must not return another needs_input
// ask — same questions or new ones. First empty runs are unchanged.

export const ANSOFF_IGNORE_ANSWER_DIRECTION =
  "UNKNOWN for any missing numbers. Use market penetration. Do not ask again. Draw the matrix from the existing Five Forces, SWOT, and VRIO artifacts.";

const IGNORED_ASK_REASON =
  "The client already directed this run not to ask again. Draw the matrix from the saved upstream artifacts, or name a different blocker.";

export function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map(question => String(question || "").trim()).filter(Boolean);
}

function questionLoopKey(questions) {
  return normalizeQuestions(questions)
    .map(question => question.toLowerCase())
    .sort()
    .join("\n");
}

export function isSameQuestionLoop(priorQuestions, nextQuestions) {
  const prior = questionLoopKey(priorQuestions);
  const next = questionLoopKey(nextQuestions);
  return Boolean(prior) && prior === next;
}

export function clientDirectionFromInstruction(instruction) {
  const text = String(instruction || "").trim();
  if (!text) return "";
  const marker = "Additional direction:";
  const index = text.indexOf(marker);
  if (index >= 0) return text.slice(index + marker.length).trim();
  if (/^Read the saved context, research the company/.test(text)) return "";
  return text;
}

export function instructionIgnoresQuestions(instruction) {
  const direction = clientDirectionFromInstruction(instruction).replace(/\s+/g, " ").trim();
  if (!direction) return false;
  const compact = direction.toLowerCase();
  if (compact.includes(ANSOFF_IGNORE_ANSWER_DIRECTION.toLowerCase())) return true;
  return /do not ask again/.test(compact)
    && /draw the matrix/.test(compact)
    && /market penetration/.test(compact);
}

export function priorQuestionsFromContext(context) {
  if (!context || typeof context !== "object") return [];
  return normalizeQuestions(context.priorQuestions);
}

export function priorQuestionsFromContextJson(contextJson) {
  if (typeof contextJson !== "string" || !contextJson.trim()) return [];
  try {
    return priorQuestionsFromContext(JSON.parse(contextJson));
  } catch {
    return [];
  }
}

// First empty run: missing content + questions → needs_input (allowed).
// Directed ignore-answer + any questions → not needs_input. Missing
// content becomes a distinct invalid reason so repair can draw, or fail
// with a clear blocker instead of asking again. New questions count.
export function resolveNeedsInputDecision({
  instruction = "",
  priorQuestions = [],
  nextQuestions = [],
  missingContent = false,
} = {}) {
  const questions = normalizeQuestions(nextQuestions);

  if (!missingContent || !questions.length) {
    return { status: missingContent ? "invalid" : "complete", questions, reason: null };
  }

  if (instructionIgnoresQuestions(instruction)) {
    return { status: "invalid", questions: [], reason: IGNORED_ASK_REASON };
  }

  return { status: "needs_input", questions, reason: null };
}
