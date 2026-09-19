# Metric taxonomy — v0

This is the canonical metric vocabulary. The `plan` step picks a subset of these (with thresholds) into a target's `MeasurementPlan`; the `measure` step records numbers against these ids; the `insight` step aggregates them. To add a metric, extend this file first (it is the single source), then the code.

## Record anatomy

Every `RunRecord` (see `schema/run-record.schema.json`) carries:

| Field | Required | Meaning |
|---|---|---|
| `schemaVersion` | yes | schema version, set by `measure` |
| `target` | yes | the repo/harness being measured (kebab-case id) |
| `tool` | yes | what produced the numbers (e.g. `audit:browser`, `lighthouse`, `manual`) |
| `capturedAt` | yes | ISO timestamp, set by `measure` — never trust a hand-written one |
| `wisdom` | no | which model/variant produced this run — required for comparisons |
| `fixtures` | no | fixture-set label — required when comparing wisdoms |
| `runId` | no | correlation id grouping records from one run |
| `metrics` | yes | map of metric id → number or boolean |
| `notes` | no | free text |

## Layer A — RepoProfile (static inventory)

Not measured over time; re-profiled when the target changes. See `src/profile.ts` output and `RepoProfile` in `src/lib/types.ts`: stack, LOC by extension, routes, test files, deps, workflow docs (AGENTS.md/CLAUDE.md), CI workflows, gate-like scripts.

## Layer B — Workflow metrics (agentic performance)

| Metric id | Unit | Description | Suggested threshold | Typical source |
|---|---|---|---|---|
| `workflow.task.durationMs` | ms | wall-clock per completed task | informational | task log / manual |
| `workflow.task.tokens` | count | tokens consumed per task | informational | agent telemetry |
| `workflow.gate.passRate` | ratio 0–1 | fraction of gate runs green | ≥ 0.95 | gate history |
| `workflow.gate.durationMs` | ms | gate runtime (battery cost) | informational, watch for growth | gate timing |
| `workflow.rework.loops` | count | fix-verify loops per task | ≤ 2 | task log |
| `workflow.conflicts` | count | file-ownership conflicts detected | = 0 | conflict audit |
| `workflow.hardening.count` | count | gates strengthened after a miss ("missed-by" closures) | ≥ 1 per retro | ledger |

## Layer C — Runtime / site metrics (website & app performance)

| Metric id | Unit | Description | Suggested threshold | Typical source |
|---|---|---|---|---|
| `runtime.lcpMs` | ms | Largest Contentful Paint | ≤ 2500 | Lighthouse / CWV |
| `runtime.cls` | score | Cumulative Layout Shift | ≤ 0.1 | Lighthouse / CWV |
| `runtime.inpMs` | ms | Interaction to Next Paint | ≤ 200 | CWV (field) |
| `runtime.ttfbMs` | ms | Time to First Byte | ≤ 800 | Lighthouse / server |
| `runtime.transferBytes` | bytes | page weight (transfer) | informational | Lighthouse / HAR |
| `a11y.violations` | count | axe violations (scoped ruleset) | = 0 | axe run |
| `build.sizeBytes` | bytes | build artifact size | informational | build output |
| `visual.matchScore` | ratio 0–1 | visual-regression match | ≥ 0.95 | visual runner |

Note: most harnesses today measure correctness (functional/a11y/visual) well and performance not at all. Layer C is the dimension `plan` is instructed to always check for — absence of a perf instrument is itself a finding.

## Layer D — Derived (computed, never measured directly)

Produced by `insight` from B+C records: per-metric stats (first/latest/min/max), delta vs baseline, trends, threshold pass rates, per-`wisdom` comparison. Layer D values are never stored as records — recomputing them from history is the point.

## Extension rules

1. **Additive only.** New metric ids are added; existing ids are never renamed or repurposed (deprecate + add instead). Old records must stay interpretable.
2. **Dot notation:** `domain.name[.qualifier]` — lowercase domains, camelCase segments allowed (e.g. `workflow.gate.passRate`, `runtime.lcpMs`).
3. **Units are mandatory** in this file and in the plan's `MetricDefinition.unit`. A number without a unit is noise.
4. **Thresholds live in the MeasurementPlan, not in records.** Records are facts; plans are judgments. Never bake a pass/fail into a record.
5. **Booleans allowed only for binary facts** (e.g. a gate passed). Anything gradable is a number.
