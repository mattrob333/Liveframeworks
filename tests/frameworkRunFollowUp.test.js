import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ANSOFF_IGNORE_ANSWER_DIRECTION,
  clientDirectionFromInstruction,
  instructionIgnoresQuestions,
  isSameQuestionLoop,
  normalizeQuestions,
  priorQuestionsFromContext,
  priorQuestionsFromContextJson,
  resolveNeedsInputDecision,
} from "../lib/frameworkRunFollowUp.js";

const FIRST_QUESTIONS = [
  "What is current market share in the beachhead segment?",
  "What capacity is available for a penetration push?",
];

test("first empty run may ask — missing content plus questions is needs_input", () => {
  const decision = resolveNeedsInputDecision({
    instruction: "",
    priorQuestions: [],
    nextQuestions: FIRST_QUESTIONS,
    missingContent: true,
  });

  assert.equal(decision.status, "needs_input");
  assert.deepEqual(decision.questions, FIRST_QUESTIONS);
  assert.equal(decision.reason, null);
});

test("second run with the ignore-answer direction does not repeat the identical question loop", () => {
  const decision = resolveNeedsInputDecision({
    instruction: ANSOFF_IGNORE_ANSWER_DIRECTION,
    priorQuestions: FIRST_QUESTIONS,
    nextQuestions: [...FIRST_QUESTIONS].reverse(),
    missingContent: true,
  });

  assert.equal(decision.status, "invalid");
  assert.deepEqual(decision.questions, []);
  assert.match(decision.reason, /not to ask again/i);
  assert.equal(isSameQuestionLoop(FIRST_QUESTIONS, FIRST_QUESTIONS), true);
});

test("the wrapped pipeline instruction still counts as ignore-answer", () => {
  const wrapped = `Read the saved context, research the company, and create the Ansoff Matrix.\n\nAdditional direction: ${ANSOFF_IGNORE_ANSWER_DIRECTION}`;
  assert.equal(clientDirectionFromInstruction(wrapped), ANSOFF_IGNORE_ANSWER_DIRECTION);
  assert.equal(instructionIgnoresQuestions(wrapped), true);

  const decision = resolveNeedsInputDecision({
    instruction: wrapped,
    priorQuestions: FIRST_QUESTIONS,
    nextQuestions: FIRST_QUESTIONS,
    missingContent: true,
  });
  assert.equal(decision.status, "invalid");
  assert.notEqual(decision.reason, null);
});

test("a drawn matrix is complete even if leftover questions remain", () => {
  const decision = resolveNeedsInputDecision({
    instruction: ANSOFF_IGNORE_ANSWER_DIRECTION,
    priorQuestions: FIRST_QUESTIONS,
    nextQuestions: FIRST_QUESTIONS,
    missingContent: false,
  });

  assert.equal(decision.status, "complete");
  assert.deepEqual(decision.questions, FIRST_QUESTIONS);
  assert.equal(decision.reason, null);
});

test("after a first needs_input ask, a directed follow-up with new questions is not needs_input", () => {
  const wrapped = `Read the saved context, research the company, and create the Ansoff Matrix.\n\nAdditional direction: ${ANSOFF_IGNORE_ANSWER_DIRECTION}`;
  const decision = resolveNeedsInputDecision({
    instruction: wrapped,
    priorQuestions: FIRST_QUESTIONS,
    nextQuestions: [
      "Once the sample-to-quote process is fixed, what wholesale account growth rate (accounts/month) is realistic given packing capacity capped at two packers?",
      "If Driftline evaluates an off-the-shelf wholesale portal, which specific plan/tier matches its actual volume (26 accounts, ~40-60 lb/account/month) rather than generic vendor pricing tiers?",
      "Should subscription growth toward 500 subscribers proceed in parallel with the wholesale process fix, or wait until wholesale throughput is resolved, given shared production/packing capacity?",
    ],
    missingContent: true,
  });

  assert.notEqual(decision.status, "needs_input");
  assert.equal(decision.status, "invalid");
  assert.deepEqual(decision.questions, []);
  assert.notEqual(decision.reason, null);
  assert.match(decision.reason, /not to ask again/i);
});

test("an empty rerun without ignore-answer may ask the same questions again", () => {
  const decision = resolveNeedsInputDecision({
    instruction: "",
    priorQuestions: FIRST_QUESTIONS,
    nextQuestions: FIRST_QUESTIONS,
    missingContent: true,
  });

  assert.equal(decision.status, "needs_input");
  assert.deepEqual(decision.questions, FIRST_QUESTIONS);
});

test("framework synthesis applies the ignore-answer follow-up to needs_input", () => {
  const source = readFileSync("lib/server/frameworkRun.js", "utf8");
  assert.match(source, /resolveNeedsInputDecision/);
  assert.match(source, /priorQuestionsFromContextJson/);
  assert.match(source, /finalizeArtifact\(parsed, frameworkId, now, \{ instruction, priorQuestions \}\)/);
  assert.match(source, /PRIOR QUESTIONS FROM THE LAST RUN/);
  assert.match(source, /new questions still count as asking/);
});

test("prior questions read from the engagement context snapshot", () => {
  const context = { priorQuestions: ["  Share?  ", "", "Capacity?"] };
  assert.deepEqual(priorQuestionsFromContext(context), ["Share?", "Capacity?"]);
  assert.deepEqual(priorQuestionsFromContextJson(JSON.stringify(context)), ["Share?", "Capacity?"]);
  assert.deepEqual(priorQuestionsFromContextJson("not-json"), []);
  assert.deepEqual(normalizeQuestions(["  a  ", " ", "b"]), ["a", "b"]);
});
