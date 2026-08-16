# The Constraint Intelligence Engine — specification

> **Source:** authored by Matt with an outside AI collaborator, delivered as
> `LiveFrameworks_Constraint_Intelligence_Engine_Spec.docx` (2026-08-17) and converted
> to markdown here. Table layouts were flattened by the conversion — field/meaning pairs
> read sequentially; the original `.docx` is the typeset copy.
>
> **Status:** ACCEPTED as the basis of THE ENGINE PHASE (see PRODUCT.md). This document
> is the reasoning and the contracts; PRODUCT.md carries the ordered work and the
> done-criteria. Where the two disagree, PRODUCT.md is the work order and this is the
> argument behind it.
>
> **Why it was accepted:** it names a real hole — the code has no constraint algorithm
> between "many true findings" and "THE constraint," and the validator checks structure
> and grounding, not causal correctness. It also catches us: the demo packs contain
> near-explicit answer language, so the celebrated "two unprompted diagnoses" tested
> synthesis of a visible story, not discovery of a hidden constraint. The blind-fixture
> suite is the control we skipped. In Instinct's canon this fills the Gap service — the
> Component Register's oldest ownerless row.

---


LIVEFRAMEWORKS / PRODUCT EVOLUTION
# Constraint Intelligence Engine
Product and Technical Specification for evolving the 16-framework waterfall into a measurable, falsifiable constraint-diagnosis and intervention system.
One-sentence product direction
Keep the existing 16-framework evidence waterfall, but replace the final leap from “many findings” to “THE constraint” with a formal candidate, falsification, counterfactual, measurement, and re-measurement engine.

Audience: Coding agent, technical lead, product owner
Primary repository: mattrob333/Liveframeworks
Status: Implementation-ready design direction
Core principle: A signed constraint must be proven by evidence and testable by throughput movement, not merely stated by an LLM.

# Contents
1. Executive summary
2. Current-state assessment
3. Product objective and non-goals
4. Target system architecture
5. Living operational model
6. Constraint Intelligence Engine
7. Dynamic measurement and benchmark architecture
8. Intervention and delegation engine
9. Continuous validation loop
10. Repo-level implementation plan
11. Data contracts and state models
12. Test strategy and blind diagnosis suite
13. Phased build plan
14. Definition of done
15. Coding-agent handoff prompt
Implementation stance
Do not add a 17th classic framework or break the existing canon. The new components are product infrastructure around Theory of Constraints and RACI: operational-model compiler, constraint engine, measurement architecture, intervention plan, and continuous review.


# 1. Executive summary
LiveFrameworks already has the hard part of a diagnostic product: a structured evidence funnel. The 16 frameworks progressively create artifacts, preserve disagreements, ground claims, and culminate in Theory of Constraints (ToC). The weakness is the last mile. Today the system gives Claude a large evidence package and asks it to produce the ToC artifact. There is no deterministic or falsifiable constraint-selection mechanism between “many true findings” and “this is THE constraint.”
This specification upgrades that last mile without throwing away the existing architecture. The proposed system compiles upstream artifacts into a living operational model, generates multiple candidate constraints, ranks and falsifies them, requires a counterfactual throughput argument, produces a signed constraint only when evidence is sufficient, derives a measurement plan tied to that constraint, routes interventions through humans/agents/tools, and re-measures the business to confirm whether throughput actually moved.
Target product promise
Not “AI gives you a strategy report.” The stronger promise is: “The system identifies the business’s current binding constraint, shows the causal evidence, prescribes the smallest intervention that should move throughput, and proves whether it worked.”

Today
Target state
16 frameworks create grounded findings
16 frameworks also compile into a shared operational model
ToC synthesis chooses a constraint
Constraint engine generates, tests, falsifies, and signs a constraint hypothesis
Confidence is model-authored metadata
Confidence is partly computed from evidence strength and falsification results
BSC/OKRs are strategic outputs
Constraint-specific Measurement Architecture defines proof-of-change metrics
RACI routes work
RACI receives intervention + metric contracts and routes measurable work
Engagement ends with an export
Engagement becomes a loop: diagnose, intervene, measure, re-diagnose

# 2. Current-state assessment
## 2.1 What is already strong
The framework DAG forces analysis to mature before ToC runs. This is far stronger than asking a general-purpose model for “the biggest problem.”
Artifacts are structured, evidence-grounded, and validated. Claims carry basis, confidence, and evidence references.
Raw intake, completed upstream artifacts, and user clarifications are carried into later runs. This preserves first-party corrections and prevents frameworks from operating as isolated reports.
Stale propagation is the right product behavior. If upstream evidence changes, downstream conclusions can be invalidated and re-run.
The existing ToC artifact already has the right broad shape: constraint, focusing steps, and ranked interventions.
The product already understands that ToC is the punchline and RACI is the delegation layer. The new engine should strengthen that spine, not replace it.
## 2.2 Core limitation
The code does not currently execute a constraint algorithm. The framework metadata names conceptual tools such as locate_constraint() and rank_by_throughput_effect(), but these are descriptive strings, not implemented functions. The actual server workflow performs research and asks the model to synthesize a schema-valid artifact. The validator checks structure and grounding, not causal correctness.
Why this matters
A severe problem is not necessarily the system constraint. A valid ToC diagnosis should answer a stricter question: if this candidate were relieved, would global throughput materially rise, while relieving competing candidates would not?

## 2.3 Demo-data caution
The Driftline and Ironwood demos are useful, but they are not blind diagnosis tests. Their evidence contains unusually explicit language about bottlenecks, throughput, founder routing, missed calls, and capacity. The system is therefore being tested on whether it can synthesize and prioritize a visible causal story, not whether it can discover a hidden constraint from ambiguous evidence. The new test suite must deliberately remove answer words and obvious labels.
# 3. Product objective and non-goals
## 3.1 Objective
Build a Constraint Intelligence Engine that converts the existing framework waterfall into a defensible causal diagnosis, a measurable intervention plan, and a repeatable operating loop.
## 3.2 Required outcomes
Generate multiple plausible constraint candidates before selecting one.
Tie every candidate to the business flow, resource/policy/system location, throughput unit, evidence, and predicted effect.
Require explicit alternative rejection and counterfactual reasoning.
Return “constraint hypothesis” or “insufficient evidence” when the diagnosis cannot be signed responsibly.
Derive KPIs dynamically from the actual business flow and selected constraint, rather than relying on a universal KPI catalog.
Define baselines, targets, data sources, owners, cadence, and success thresholds without inventing missing numbers.
Map the intervention to humans, AI agents, software, vendors/services, and approval gates.
Re-measure actual results and trigger the next constraint search when the system moves.
## 3.3 Non-goals for the first build
Do not add more classic strategy frameworks.
Do not claim a universal numeric constraint formula that works equally well for every business.
Do not require a massive one-time executive questionnaire before the system can function.
Do not invent industry benchmarks or targets when evidence is missing.
Do not turn the operational model into a second source of truth that can drift from the framework artifacts. It should be a compiled, inspectable derivative of evidence and signed artifacts.
Do not build a marketplace in the first implementation. Design the intervention schema so marketplaces/connectors can attach later.
# 4. Target system architecture
The recommended architecture preserves the 16-framework canon and adds five product-layer components around the current ToC/RACI path.
Layer
Responsibility
Action
A. Evidence + framework waterfall
Existing intake buckets, chats, web research, and 16 validated framework artifacts.
Keep
B. Operational Model Compiler
Compiles evidence and artifacts into flows, stages, resources, policies, queues, metrics, actors, systems, and uncertainties.
New
C. Constraint Intelligence Engine
Generates candidates, scores evidence, runs falsification and counterfactual tests, selects/suspends diagnosis.
New
D. Measurement Architecture
Derives proof-of-change metrics, baselines, targets, data sources, cadence, owner, and decision thresholds.
New
E. Intervention Engine
Converts focusing steps into executable work packets mapped to humans, agents, tools, vendors, and approval gates.
New / enrich RACI
F. Continuous Validation Loop
Compares actual movement to predicted movement and triggers re-diagnosis or next-constraint search.
New

Key architectural decision
Compile the operational model from existing artifacts instead of asking every framework to mutate a new global object directly. This reduces coupling, keeps provenance clear, and lets the compiler be re-run deterministically whenever evidence or artifacts change.

# 5. Living operational model
The operational model is the bridge between “framework outputs” and “causal business system.” It should be machine-readable, evidence-backed, and derived. Think of it as a map of how demand becomes throughput and where work can wait, fail, or be throttled.
## 5.1 Core entities
Entity
Meaning
Flow
A value stream or demand path, such as inbound repair call -&gt; booked job -&gt; dispatch -&gt; repair -&gt; invoice.
Stage
A step in a flow with input/output units, dependencies, cycle-time observations, and capacity clues.
Resource
Human, machine, crew, system, inventory pool, or scarce capability that can limit a stage.
Policy
Approval, routing, pricing, scheduling, prioritization, or governance rule that can become a non-physical constraint.
Queue / buffer
Observed or inferred waiting work: backlog, unanswered calls, quote lag, WIP, approval queue, waitlist.
Metric
Observed or proposed measurement linked to a flow/stage/resource/policy.
Actor
Person, team, role, agent, vendor, or customer segment participating in the flow.
System
Software/tooling that stores, routes, or transforms work.
Evidence
Traceable intake, upstream artifact, chat clarification, or web evidence supporting a model claim.
Uncertainty
Missing, conflicting, stale, or low-confidence fact that affects diagnosis quality.

## 5.2 Compiler behavior
Run after any framework artifact becomes complete or stale.
Extract only claims that can be traced to existing evidence references or explicit inference.
Preserve conflicts. Do not flatten two executives who disagree about the constraint into a single “average” belief.
Link the same entity across frameworks where possible, e.g. “Maya approval,” “founder pricing approval,” and “wholesale quote approval” may resolve to one policy node with multiple evidence sources.
Emit a compiler report containing unresolved merges and missing throughput units so the diagnosis engine knows where evidence is weak.
# 6. Constraint Intelligence Engine
This is the core new reasoning layer. It should not attempt to replace LLM reasoning with a brittle formula. Instead, codify the process by which reasoning must occur. Use scoring to organize candidates, then use falsification and counterfactual tests to decide whether a candidate is signable.
## 6.1 Candidate generation
Candidate generation should scan the operational model for constraint signatures. A candidate can be physical capacity, market/demand, policy, skill, system, information, supply, or other.
Queues or growing backlog upstream of a stage.
Downstream idle time caused by missing upstream work.
Demand exceeding capacity, response coverage, or approval bandwidth.
Repeated cycle-time delay around one resource, person, system, or policy.
Lost deals, churn, errors, or missed service tied to the same stage.
A single point of failure with no buffer or backup.
A policy that forces work through one approval/routing path.
High utilization plus starvation/blockage elsewhere.
Leadership belief that conflicts with observed flow evidence.
External demand generation proposed while existing demand is already leaking.
## 6.2 Candidate ledger
Field
Required meaning
candidateId
Stable ID for the hypothesis.
type
market | capacity | policy | skill | system | information | supply | other | unknown
location
Exact stage/resource/policy where the candidate binds.
gatedFlowIds
Which value flows the candidate can throttle.
throughputUnit
What output unit would move if relieved, e.g. jobs/week, quotes/day, cases/hour, activated customers/month.
evidenceRefs
Independent evidence supporting the candidate.
pressureSignals
Queue, utilization, delays, lost demand, WIP, churn, missed SLAs, etc.
counterfactualPrediction
What should measurably improve if the candidate is relieved.
alternativeExplanation
The strongest competing story.
disconfirmingEvidence
Evidence that weakens this candidate.
status
candidate | leading | rejected | constraint_hypothesis | signed_constraint

## 6.3 Evidence ranking, not truth-by-score
A heuristic score is useful for deciding which candidates deserve deeper tests. It should not be the final truth function. Recommended score dimensions, each normalized to 0-5:
Dimension
Question
Gating strength
Does this candidate sit on the critical flow before the desired throughput outcome?
Pressure
Is there a queue, overload, wait, leakage, or demand/capacity imbalance around it?
Causal coverage
How many meaningful downstream outcomes are blocked by it?
Independent corroboration
How many independent first-party or observed sources support the same causal location?
Observed loss
Are there lost deals, churn, late delivery, missed calls, errors, or idle capacity attributable to it?
Counterfactual lift
If relieved, is there a plausible direct path to greater global throughput?
Measurability
Can the predicted movement be observed within a useful period?
Contradiction penalty
How much strong evidence suggests a different binding location?

Implementation note: weights may be configurable, but avoid pretending the final weighted sum is a scientifically universal measure. The ranking narrows attention; the falsification pass earns the signature.
## 6.4 Falsification protocol
Take the top 2-5 candidates, not only the top-scoring one.
For each candidate, ask: if we increased this resource/capability tomorrow, what would still prevent the business from producing more of the desired throughput unit?
Look for evidence that a downstream or upstream stage would immediately remain binding.
Ask whether the candidate explains multiple observed symptoms with one causal mechanism, rather than merely correlating with them.
Require the engine to articulate the strongest case against its preferred candidate.
Reject candidates that improve a local metric but do not plausibly increase system throughput.
If two candidates cannot be distinguished with current evidence, return a targeted measurement or executive question rather than forcing a false winner.
## 6.5 Signing criteria
A candidate should be promoted to signed_constraint only when all minimum criteria are met:
It gates at least one business-critical flow tied to a declared throughput outcome.
There is direct pressure evidence at or immediately around the candidate.
At least two independent evidence sources support the causal story, unless one source is a strong observed system metric.
A counterfactual predicts measurable global throughput improvement if relieved.
The leading alternative has been explicitly tested and rejected or shown to be secondary.
The measurement architecture can define a near-term way to prove or disprove the diagnosis.
No unresolved contradiction would materially reverse the diagnosis.
Honest fallback states
The engine must be allowed to say “constraint hypothesis” or “insufficient evidence.” A false high-confidence answer is worse than a precise request for the one missing measurement that would separate two candidates.

# 7. Dynamic measurement and benchmark architecture
There is no universal KPI list that works across every business. The codifiable asset is the procedure for deriving the right metrics from the business model, flow, selected constraint, and intended intervention. The LLM can reason dynamically, but it should reason inside a strict metric contract.
## 7.1 Measurement Architecture output
Metric class
Purpose
Outcome metric
The global business result that should improve if the constraint moves. Example: completed jobs/week, retained ARR, shipped cases/week.
Throughput metric
The system flow unit closest to ToC throughput. It must be explicit and business-specific.
Constraint leading metric
Fast signal at the binding stage, e.g. live-answer rate, quote cycle time, approvals/day.
Queue/buffer metric
Backlog, wait time, WIP, unanswered calls, open quotes, blocked tickets.
Quality/reliability metric
Error/rework/SLA/late-delivery measure ensuring throughput is not “improved” by degrading quality.
Capacity metric
Available versus used capacity at the candidate and likely constraint-in-waiting.
Economic metric
Revenue, margin, cost-to-throughput, or avoided loss when data is available.

## 7.2 Metric contract
Field
Rule
metricId / name
Stable, human-readable identity.
decisionQuestion
What decision does this metric inform?
formula
Exact numerator/denominator or event definition.
unit
Calls, jobs, dollars, cases, days, %, etc.
source
CRM, ledger, calendar, inbox, call recorder, spreadsheet, manual sample, etc.
owner
Human/team/system responsible for data quality.
cadence
Realtime, daily, weekly, monthly, per batch, per opportunity.
baseline
Observed current value or explicitly missing.
target
Evidence-based target or “TBD pending baseline.”
targetBasis
historical | peer benchmark | contractual SLA | capacity model | expert heuristic | experiment
successWindow
How long before the intervention should have produced detectable movement?
guardrail
Metric that must not deteriorate while the target improves.
evidenceRefs
Why this is the right metric for this constraint.

## 7.3 Benchmark hierarchy
Targets should be chosen using the strongest available evidence tier. Never jump straight to an industry benchmark simply because one exists.
Priority
Use
1. Internal observed baseline
Best source. Use the company’s own recent distribution, not a single anecdote.
2. Internal historical best
Useful when the business has previously performed better under comparable conditions.
3. Contractual/customer requirement
A hard SLA, promised turnaround, delivery window, regulatory limit, or buyer requirement.
4. Capacity/physics model
Derived from known resource rates, staffing, machine speed, cycle time, or queue math.
5. External peer benchmark
Use only if source quality, comparability, geography, scale, and business model are credible.
6. Expert heuristic
Allowed as a provisional target with explicit basis and low/medium confidence.
7. Measurement-first target
When nothing reliable exists: establish baseline first, then set improvement target after 2-4 measurement cycles.

## 7.4 Handling subjective or hard-to-measure businesses
Some businesses have less obvious units than manufacturing or call centers. The engine should derive a measurable proxy chain instead of pretending the work is unmeasurable. Examples:
Professional services: accepted deliverables/week, billable value delivered, cycle time from intake to client acceptance, rework %, utilization as a guardrail rather than the primary outcome.
Consulting: qualified engagements moved to decision, proposal-to-close cycle time, client milestone acceptance, margin per delivery team, decision latency.
Creative/agency: briefs accepted, production cycle time, revision loops, on-time delivery, client retention, contribution margin.
Software/SaaS: activated accounts, time-to-value, retained expansion revenue, support backlog, release lead time, critical incident burden.
Healthcare/service operations: completed appointments/procedures, wait time, no-show rate, room/provider utilization, quality/safety guardrails.
R&amp;D/innovation: validated experiments, learning cycle time, decision-ready evidence packages, milestone throughput. Avoid vanity counts such as ideas generated.
Important rule for the executive interview
Do not make one giant executive interview the sole source of KPI truth. Let the upstream frameworks and operational model derive the measurement architecture. Use targeted executive questions only to close specific gaps such as “What counts as throughput here?”, “Where is this currently measured?”, or “What service level is actually promised?”

# 8. Intervention and delegation engine
The output of a constraint diagnosis should be an executable intervention, not a paragraph. The intervention engine translates ToC focusing steps into bounded work packets and then enriches the existing RACI/capability layer.
## 8.1 Intervention contract
Field
Meaning
interventionId
Stable ID linked to the signed constraint.
hypothesis
If we change X at the constraint, Y throughput metric should move by Z/within a defined window.
tocStep
exploit | subordinate | elevate | repeat
actions
Smallest concrete actions required.
executorType
human | agent | software | vendor/service | mixed
owner
Accountable owner.
approvals
Budget, pricing, security, operational or leadership gates.
inputs
Systems/data/evidence required.
successMetrics
Metric IDs from Measurement Architecture.
guardrails
What cannot deteriorate.
reviewAt
Date/event/window for evidence review.
stopConditions
When to abort, reverse, or escalate.

## 8.2 Human vs. agent vs. software routing
Use an agent for bounded, repetitive information work with clear inputs/outputs and reversible actions.
Use software/tooling where the constraint is routing, visibility, scheduling, data capture, or repeated coordination that should not depend on judgment each time.
Use a human where judgment, accountability, relationship ownership, physical execution, or exception authority is binding.
Use a vendor/service when the fastest elevation path is external capacity, such as answering service, BPO, specialized implementation, or fractional expertise.
Use mixed interventions when an agent or system can exploit the constraint immediately while a human-capacity elevation is being implemented.
# 9. Continuous validation loop
The system becomes materially more defensible when the diagnosis is treated as a prediction. The intervention predicts a measurable throughput effect. The product then checks whether reality agrees.
Step
System behavior
1. Diagnose
Generate and sign the current constraint or hold a hypothesis.
2. Instrument
Create the minimum measurement plan needed to detect movement.
3. Intervene
Exploit/subordinate/elevate through bounded work packets.
4. Observe
Collect metrics through the success window.
5. Compare
Expected vs. actual movement, including guardrails.
6. Decide
Confirmed, partially confirmed, falsified, or inconclusive.
7. Re-sequence
If confirmed and relieved, search for the next constraint. If falsified, reopen candidate ledger and assumptions.

Product transition
This loop changes LiveFrameworks from a one-time diagnostic/export product into a living operating system for “what limits throughput now?” The business can have a different constraint next quarter, and the system should expect that.

# 10. Repo-level implementation plan
The file names below are recommended implementation targets based on the current repository structure. Exact module boundaries can change during coding, but the responsibilities should remain distinct.
File / area
Responsibility
NEW: lib/operationalModel.js
Compile completed artifacts + intake + clarifications into the derived operational model. Expose compileOperationalModel(), validateOperationalModel(), and provenance helpers.
NEW: lib/constraintEngine.js
Generate candidate ledger, calculate heuristic evidence scores, run deterministic prechecks, build falsification payloads, and evaluate signing criteria.
NEW: lib/measurementArchitecture.js
Derive metric contracts, benchmark basis, baseline/target states, and evidence sufficiency.
NEW: lib/interventionEngine.js
Normalize ToC focusing steps into intervention contracts and executor routing hints.
MOD: lib/agentContext.js
For ToC, include operational model + candidate ledger + full relevant findings rather than relying on summaries alone. For RACI, include signed constraint, measurement plan, and interventions.
MOD: lib/server/frameworkRun.js
Add a ToC-specific research/synthesis protocol. Run candidate/falsification stages before final ToC synthesis. Add progress events for candidate generation, falsification, measurement planning.
MOD: lib/frameworkArtifacts.js
Expand ToC payload or add companion diagnostic fields for candidate ledger, rejected alternatives, causal chain, counterfactual, constraint-in-waiting, signing state, and measurementPlanRef.
MOD: lib/frameworkRunClient.js
Handle new progress phases and persist auxiliary diagnostic artifacts with the run archive.
MOD: lib/exportBrief.js + UI
Client brief shows signed constraint, concise proof chain, intervention thesis, and measurement proof without exposing internal scoring chrome.
NEW: tests/constraintEngine.test.js
Pure logic tests for candidate generation, ranking inputs, signing rules, ambiguity, and rejected alternatives.
NEW: tests/measurementArchitecture.test.js
Metric derivation, missing baseline behavior, benchmark hierarchy, guardrails, and no-invented-target rules.
NEW: tests/constraintBlindDiagnosis.test.js
End-to-end fixtures where explicit answer language is removed. Test that the correct candidate still wins or the engine asks for the discriminating evidence.

## 10.1 Recommended execution sequence inside a ToC run
1.  Build current context snapshot as today.
2.  Compile operational model.
3.  Generate candidate ledger deterministically + LLM-assisted extraction where needed.
4.  Run candidate evidence scoring and prechecks.
5.  Send top candidates to a ToC-specific falsification prompt.
6.  Evaluate signing criteria in code.
7.  If insufficient: return needs_input with one or more discriminating questions/measurements.
8.  If signable: synthesize final ToC artifact using the signed candidate and rejected alternatives.
9.  Generate Measurement Architecture companion artifact.
10.  Generate intervention contracts.
11.  Pass signed constraint + interventions + metrics to RACI context.
# 11. Data contracts and state models
## 11.1 Suggested diagnostic state
diagnosticState = {  operationalModel: {...},  candidates: [...],  selectedCandidateId: "candidate:dispatch",  diagnosisStatus: "signed_constraint",  falsification: {    testedCandidateIds: [...],    rejected: [...],    unresolved: [...]  },  measurementPlan: {...},  interventions: [...],  generatedAt: "...",  sourceArtifactRevisions: {...}}
## 11.2 Diagnosis statuses
Status
Meaning
insufficient_evidence
Cannot separate plausible candidates. Ask for a targeted measurement or clarification.
constraint_hypothesis
One candidate leads, but signing criteria are not fully met.
signed_constraint
Candidate meets evidence, falsification, counterfactual, and measurement criteria.
constraint_relieved
Post-intervention evidence shows the constraint moved or was materially relieved.
diagnosis_falsified
Predicted throughput movement did not occur and the hypothesis must be reopened.

# 12. Test strategy and blind diagnosis suite
The most important testing change is to stop testing only whether ToC artifacts render. The product needs diagnosis-quality tests.
## 12.1 Unit tests
Candidate generation detects queues, single points of failure, policy gates, and demand/capacity conflicts from normalized operational-model fixtures.
Scoring does not sign a constraint by itself.
Signing criteria reject a candidate with unresolved strong contradictions.
Two equally plausible candidates produce insufficient_evidence rather than arbitrary selection.
Measurement plan refuses to invent baseline/target values.
External benchmark cannot override a stronger internal observed baseline without explicit rationale.
Constraint-specific metrics always include at least one throughput outcome and one leading metric when signable.
RACI/intervention routing preserves approval gates and human accountability.
## 12.2 Blind end-to-end fixtures
Create sanitized versions of Driftline and Ironwood that remove explicit phrases such as “bottleneck,” “constraint,” “throughput problem,” “THE thing holding us back,” and direct statements naming the answer. Preserve the causal facts: delays, ownership, queues, lost deals, capacity, missed calls, customer timing, and conflicting executive beliefs.
Pass criteria:
Driftline should still surface founder-mediated wholesale approval/process as the leading policy constraint, or request one genuinely discriminating metric if the sanitized evidence becomes ambiguous.
Ironwood should still surface inbound phone/dispatch capacity as the leading constraint ahead of marketing spend and second install-crew capacity.
The diagnosis explanation must cite causal evidence rather than answer-language artifacts.
At least one adversarial fixture should deliberately make the founder’s preferred diagnosis sound persuasive while operational evidence points elsewhere.
At least one fixture should have no signable constraint and must correctly return insufficient_evidence.
## 12.3 Counterfactual regression tests
For each signed fixture, encode expected counterfactuals. Example: “If marketing spend doubles while live-answer coverage remains unchanged, throughput should not materially increase because demand already leaks before scheduling.” The engine should reject local-optimization interventions that do not clear the binding stage.
# 13. Phased build plan
Phase
Build
Value
Phase 1: Model + candidate ledger
Operational-model compiler; candidate schema; deterministic extraction; provenance; unit tests.
Makes the business flow inspectable and creates all plausible hypotheses.
Phase 2: ToC falsification
ToC-specific prompts; top-candidate tests; rejected alternatives; signing criteria; new statuses.
Turns ToC from freeform synthesis into structured diagnosis.
Phase 3: Measurement Architecture
Metric contracts; benchmark hierarchy; evidence sufficiency; baseline/target rules.
Makes every diagnosis testable.
Phase 4: Intervention contracts
Exploit/subordinate/elevate work packets; executor types; success windows; guardrails; enrich RACI.
Turns diagnosis into executable work.
Phase 5: Continuous loop
Persist observations, compare predicted vs actual, confirm/falsify, next-constraint rerun.
Turns the product into an operating loop.
Phase 6: Pattern library
Anonymized reusable templates for common business models, throughput units, metrics, constraint signatures.
Improves speed and benchmark quality without hardcoding one KPI set.

Recommended MVP boundary
Phases 1-3 are the minimum meaningful upgrade. If candidate falsification is added without measurement architecture, the system can argue better but still cannot prove the diagnosis. Measurement closes the loop between reasoning and reality.

# 14. Definition of done
The Constraint Intelligence Engine v1 is done when all of the following are true:
A ToC run produces a visible candidate ledger with at least two plausible candidates when the evidence supports alternatives.
The final diagnosis contains explicit rejected alternatives and why they fail the system-throughput test.
The product distinguishes signed_constraint, constraint_hypothesis, and insufficient_evidence.
The selected constraint names a business-specific throughput unit or explicitly requests one if missing.
A Measurement Architecture artifact is generated with outcome, leading, queue/buffer, and guardrail metrics where applicable.
No numeric baseline or target is invented. Missing data remains missing and generates a concrete acquisition step.
RACI receives the actual intervention plan plus metrics and approval gates, not merely a prose constraint summary.
Blind Driftline and Ironwood fixtures pass without explicit answer language.
At least one ambiguous fixture returns insufficient evidence rather than hallucinating certainty.
At least one post-intervention simulation confirms a constraint moved; another falsifies a diagnosis and reopens the candidate ledger.
Existing 16-framework DAG, grounding validation, stale propagation, first-run flow, and exports do not regress.
# 15. Coding-agent handoff prompt
The following can be pasted into a coding agent as the top-level implementation instruction.
You are extending mattrob333/Liveframeworks. Preserve the existing 16-framework canon, evidence grounding, artifact validation, dependency DAG, stale propagation, first-run UX, and current ToC/RACI roles.Goal: build a Constraint Intelligence Engine around the existing Theory of Constraints run so LiveFrameworks no longer jumps directly from upstream findings to an LLM-authored constraint. The system must compile a living operational model, generate multiple candidate constraints, test and falsify alternatives, require a counterfactual throughput argument, sign only when evidence is sufficient, derive a constraint-specific measurement plan, and pass measurable interventions into RACI.Implement in phases:1. Add lib/operationalModel.js as a derived compiler from intake + completed artifacts + user clarifications. Preserve provenance and conflicts.2. Add lib/constraintEngine.js with candidate ledger, evidence features, ranking support, falsification inputs, and code-level signing criteria. Scoring ranks candidates but cannot alone sign the constraint.3. Modify ToC context/run logic in lib/agentContext.js and lib/server/frameworkRun.js to use the operational model and top candidates, run a ToC-specific falsification step, and return insufficient_evidence / constraint_hypothesis / signed_constraint honestly.4. Expand ToC schema or add companion diagnostic state in lib/frameworkArtifacts.js for candidates, rejected alternatives, causal chain, counterfactual prediction, constraint-in-waiting, and diagnosis status.5. Add lib/measurementArchitecture.js. Derive business-specific metrics from the selected constraint and flow. Every metric must define formula/event, unit, source, owner, cadence, baseline, target, target basis, success window, guardrail, and evidence refs. Never invent baselines or targets.6. Add lib/interventionEngine.js to convert ToC focusing steps into work packets with hypothesis, actions, executor type, owner, approvals, metrics, guardrails, review window, and stop conditions. Feed this into RACI.7. Add blind diagnosis tests. Create Driftline and Ironwood fixtures with explicit answer words removed. The engine should still recover the causal constraint or ask for the one measurement needed to distinguish candidates.8. Add at least one ambiguous case that must return insufficient_evidence, and one post-intervention case that falsifies the original diagnosis.Do not add a new classic framework or agent. Treat Measurement Architecture and the operational model as product infrastructure. Keep the client-facing brief concise: signed constraint, proof chain, intervention, and how success will be measured. Keep internal candidate scores/falsification detail available in expert/pipeline views.Definition of success: the product can say not only “this is the constraint,” but “here are the alternatives we rejected, here is the causal reason this one binds global throughput, here is what should move if we relieve it, here is how we will measure that, and here is what happens if reality proves us wrong.”
Final product thesis
LiveFrameworks already knows how to collect and structure strategic evidence. The next moat is not another framework. It is codifying how the system proves which limitation is binding, derives the smallest measurable intervention, and learns from whether throughput actually moved.

