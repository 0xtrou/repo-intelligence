---
name: repo-intelligence
description: Architect and benchmark intelligence for any repo/harness — profile repos, prescribe tooling ("this app needs Maestro"), define metrics A/B/C with thresholds, append-only measurement history, wisdom comparison (AI models / workflow variants), and evidence-backed reports. Use whenever the user asks to benchmark a repo, capture a baseline, measure repo or workflow quality, define quality metrics, build a repo health/insight report, architect a measurement strategy, compare harness/model runs, or record metrics — even if they don't say "benchmark".
---

# repo-intelligence — agent skill

**TOOLKIT** = this repository (the one containing `skills/`). Commands run from its root.
Canonical docs, do not duplicate: [PHILOSOPHY.md](../../PHILOSOPHY.md) (constitution) ·
[METRICS.md](../../METRICS.md) (metric vocabulary) · [schema/](../../schema/) (record/plan contracts).

## The boundary (hard rule — read before anything else)

This toolkit **prescribes and measures — it never implements the target repo's own test/tooling code**.
Do not write Maestro flows, Playwright specs, Lighthouse configs, or any target-specific harness code.
Concluding *"this app needs Maestro for e2e because X, and must track metrics A, B, C with thresholds Y"*
is your job here; writing the YAML flows is the target repo's job. If you catch yourself authoring
target-repo test code, you have crossed the boundary — stop and go back to prescribing.

## Capability map (everything this toolkit can do)

| Command (run from TOOLKIT) | Layer | What it does | Key flags |
|---|---|---|---|
| `npm run profile -- <repo-path>` | 1 Understand | Scan ANY repo → `RepoProfile`: INSIDE inventory (stack, LOC, routes, tests, workflow, CI) + **declared BOUNDARY** (`outward.declares`, `contractFiles`, `gitRemote`) | `--json` (machine-readable), `--out <file>` |
| `npm run plan -- <profile.json>` | 2 Define good | Draft `MeasurementPlan`: tooling prescriptions + metric definitions with thresholds — Layer B/C **and Layer E** (`external.*`, `perception.*`) → `plans/<target>.plan.json` | `--confirm` (sign-off), `--out <file>` |
| `npm run measure -- <target> <record.json>` | 3 Measure | Validate + **append** `RunRecord` → `runs/<target>.jsonl` (append-only, never overwrites) | `--tool` (required), `--wisdom`, `--fixtures`, `--runId`, `--note`, `--capturedAt <iso>` (backfill) |
| `npm run insight -- <target>` | 4 Intelligence | Aggregate history: baseline→latest Δ, threshold verdicts, gate health, per-wisdom comparison | `--wisdom <w>` (filter), `--json` (machine-readable) |
| `npm run typecheck` / `npm test` | dev gates | Only when editing this toolkit itself | — |

Record-file shapes accepted by `measure`: `{"metrics": {"runtime.lcpMs": 1200}}` or a bare metric map.
Metric ids must exist in METRICS.md and use dot notation with camelCase segments (`workflow.gate.passRate`).
Values must be finite numbers or booleans — invalid records are rejected and **nothing is appended**.

## The four-phase loop (run in order — skipping a phase makes the next one guesswork)

**Phase 1 — Understand.** `npm run profile -- <target-repo-path> --out /tmp/ri-profile.json`, then read
the JSON together with the target's own docs (AGENTS.md, CI, gates). Read-only on the target. The
profile covers the **Inside–Outside model** (PHILOSOPHY.md): INSIDE (ops) + declared BOUNDARY. While
reading, form answers to the three zone questions — *what is it internally, what crosses the line,
how does the world see it* — and note anything the target should be declaring. Do not parse the
target's frameworks to discover endpoints; the boundary surface is the target's declaration.

**Phase 2 — Define good.** `npm run plan -- /tmp/ri-profile.json` → drafts `plans/<target>.plan.json`.
The draft includes Layer E prescriptions (`external.*` for the exchange health, `perception.*` for the
world's view) whenever the target has a world-facing surface (web routes, contracts, bins, public
package, public remote) — each marked `instrumentMissing` with a source that exists (`gh api`, npm
registry, target monitors). **Hard gate:** present the draft (tooling prescriptions + metrics +
thresholds, inside AND outside) to the user and wait for explicit confirmation; only then re-run with
`--confirm`. Never judge records against an unconfirmed plan. Thresholds are suggestions — if the user
adjusts them, edit the plan file values before confirming.

**Phase 3 — Measure.** One record per gate run / tool run / task, via
`npm run measure -- <target> <record.json> --tool <source>`. Every number cites its tool. For backfilling
an older run pass `--capturedAt <iso>`; otherwise the step stamps the current time.

**Phase 4 — Intelligence.** `npm run insight -- <target>` → report to the user (format below), ending
with a recommendation: what to optimize next. Use `--json` when another tool will consume the result.

## Wisdom comparison (models / workflow variants)

Every comparable run carries `--wisdom <label>` (model or variant id) and `--fixtures <set>` (fixture id).
Comparison is valid **only** when target + fixtures are identical and exactly one variable changes.
`insight` prints the per-wisdom table and warns when fixture sets are mixed — treat mixed comparisons as invalid.

## Hard rules

1. **`runs/` is append-only.** Never edit, reorder, or delete lines in `runs/*.jsonl` — history is the point.
2. **Evidence or it didn't happen.** Every number cites `--tool`; every report cites record paths.
3. **Each fact has one home:** inventory → profile, thresholds → plan, numbers → runs. Never duplicate a definition.
4. **Thresholds live in the plan, never in records.** Records are facts; plans are judgments.
5. **Nothing target-specific gets hard-coded into this toolkit.** If it only makes sense for one target, it belongs to that target's repo.
6. **Never record fake or placeholder numbers.** Manual observations are fine (`--tool manual`) when honest.

## Extension protocol (adding a new metric)

1. Add the metric to `METRICS.md` first (it is the canonical vocabulary) — dot notation id, unit, description, threshold guidance, typical source.
2. Evolution is additive only: never rename or repurpose an existing id (deprecate + add instead).
3. If the architect (`plan`) should prescribe it by default, add it to `src/lib/planLib.ts` `buildMetrics()`.
4. Run `npm run typecheck && npm test` — the pre-commit hook enforces this; commitlint enforces conventional commits.

## Report format (what the user receives at the end of a run)

- What was prescribed/measured and why (one paragraph).
- Plan status: `draft` (waiting on user) or `confirmed` (by whom, when).
- Records appended: file path + record numbers.
- Insight verdicts: per-metric baseline → latest with Δ, PASS/FAIL vs thresholds, wisdom table if ≥2 wisdoms.
- **Recommendation:** what to optimize next, grounded in the numbers.

## When to read what

- Concrete step-by-step scenarios (first benchmark, baseline round, recording existing tool output, wisdom comparison, adding metrics, editing this toolkit) → [references/recipes.md](references/recipes.md) — read before your first run with this skill.
- Why a rule exists → [PHILOSOPHY.md](../../PHILOSOPHY.md). Exact metric ids/units → [METRICS.md](../../METRICS.md). Exact record/plan shape → [schema/](../../schema/).
