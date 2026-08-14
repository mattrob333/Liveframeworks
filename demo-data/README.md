# Demo datasets

Test and demo fixtures for the intake buckets. Three verticals, each pairing a **real
best-in-class company profiled from public data only** with a **fictional up-and-comer**
that carries the full interview/call/org pack.

## The rule these follow

Fictional companies carry the invented material; real companies carry only sourced public
claims. Never attach invented facts, transcripts, org charts, or weaknesses to a real
business — in demo material or anywhere else (the Driftline rule, per the Instinct design
repo). Every fictional file says so in its first line and uses a `.example` domain.

For the marketing motion — sending reports to real companies — run their **public data**
through the research pipeline (URL + public record, everything `unverified` with sources)
and let the report's gaps be the pitch: "here's what the public record shows; the
interview fills the rest." That is both the honest version and the stronger one.

## The verticals

| Vertical | Fictional up-and-comer (full intake pack) | Real BIC (public data, sourced) |
|---|---|---|
| Specialty coffee roasting | **Driftline Coffee Roasters** (`coffee/`) — the Instinct demo company | Counter Culture Coffee — anchor: their published transparency reports |
| Residential garage doors | **Ironwood Door Co.** (`garage-doors/`) — Phoenix, 2nd-gen family shop | A1 Garage Door Service — anchor: Tommy Mello's published numbers and playbooks |
| Small-team B2B SaaS | **Quartermast** (`saas/`) — field-service scheduling, bootstrapped | 37signals (Basecamp/HEY) — anchor: decades of published doctrine and stated numbers |

## What's in each pack

Per fictional company, formatted to paste directly into the matching intake bucket
(templates per `lib/frameworks.js` INTAKE):

- `*-biz.md` → **Business description & URL** bucket
- `*-leadership-interviews.md` → **Leadership interviews** bucket — two leaders who
  deliberately disagree on ≥3 answers (the tool treats disagreement as data)
- `*-calls.md` → **Call transcripts** bucket — five calls incl. discovery, lost-deal, churn
- `*-org.md` → **Org chart & roles** bucket — consistent with the seeded constraint

Each pack seeds one findable constraint story: Driftline (wholesale has no owner —
samples, quotes, and reorders all bottleneck through the founder), Ironwood (demand
exists, call-booking capacity is the choke), Quartermast (month-3 churn from failed data
migration at onboarding). A good demo run should surface these without being told. In
every pack one leader misdiagnoses the constraint as marketing/leads — reconciling that
disagreement is part of the demo.

Per real BIC, one `bic-*.md` benchmark profile: nine BMC sections, each with verified
claims (source URL + confidence, self-reported labeled as such), delta questions to ask an
up-and-comer, and a closing table of verified benchmark variables.

## Using them

1. Note the `.example` URLs: live web research will find nothing for the fictional
   companies — by design. The auto-draw-from-URL wow moment is best demoed on a real
   company via the public-data path; these packs demo the *interview-fed* waterfall.
2. Paste buckets in any order; the biz bucket is the one that gates the BMC.
3. The BIC profiles are also the first fixtures for benchmark/delta features: their
   "Benchmark variables" tables are typed units ready for a future comparison surface.
