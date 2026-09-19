# AGENTS.md — repo-intelligence

**What this repo is:** architect & benchmark intelligence for any repo/harness. It understands repos
(`profile`), prescribes tooling and defines metrics with thresholds (`plan`), captures measurements
into an append-only time series (`measure`), and derives insights including AI-model/workflow-variant
comparisons (`insight`). It is a **meta-layer**: it prescribes and measures — it never implements the
target repo's own test/tooling code (no Maestro flows, no Playwright specs for targets). The
**Inside–Outside model** (PHILOSOPHY.md) covers three zones: INSIDE (scanned), BOUNDARY (declared +
prescribed as `external.*`), OUTSIDE (world-reported as `perception.*`) — the meta names the zones,
the meta does not go exploring. The **fractal ladder** extends the same loop across scales
(repo → business model → humanity, via `business.*`/`philosophy.*`) and down through child targets
(hierarchical target ids, `insight --rollup`); the toolkit suggests depth, the agent decides it, the
user signs direction changes. Every intelligence round ends in a signed rebalance: coverage gaps,
phase diagnosis (`exploration|growth|profit|repair`), rebalanced priorities.

**Start here if you are an agent:** `skills/repo-intelligence/SKILL.md` (capability map + rules),
then `skills/repo-intelligence/references/recipes.md` (step-by-step scenarios).

## Commands

| Command | Purpose |
|---|---|
| `npm run profile -- <repo-path> [--json] [--out f]` | Scan any repo → RepoProfile (inside + declared boundary + child-target suggestions) |
| `npm run plan -- <profile.json> [--confirm] [--phase p] [--out f]` | Draft/confirm MeasurementPlan → `plans/<target>.plan.json` |
| `npm run measure -- <target> <record.json> --tool <t> [--wisdom w] [--fixtures f]` | Validate + append RunRecord → `runs/<target>.jsonl` (hierarchical ids nest) |
| `npm run insight -- <target> [--rollup] [--wisdom w] [--json]` | Baseline deltas, threshold verdicts, coverage gaps, wisdom comparison, child×metric roll-up |
| `npm run typecheck` / `npm test` | Dev gates (pre-commit runs both) |

## Layout

```
PHILOSOPHY.md    constitution — 4-layer model, 10 principles, boundary rule
METRICS.md       canonical metric vocabulary (additive-only evolution)
schema/          JSON Schemas: RunRecord, MeasurementPlan
src/             profile|plan|measure|insight CLIs (thin) + lib/ logic (unit-tested)
runs/            append-only measurement history — gitignored, stays local, never edited
plans/           MeasurementPlans per target — draft until user-confirmed (gitignored)
skills/          agent skills (canonical; .zcode/skills holds a discovery stub)
docs/assets/     README diagram
```

## Hard rules for agents working in this repo

1. **Append-only `runs/`:** never edit, reorder, or delete lines in any `runs/*.jsonl`.
2. **Canonical single source:** metric ids/units → `METRICS.md`; thresholds → plan files; numbers → runs. Never duplicate a definition; docs and code must not drift.
3. **Additive-only schema evolution:** never rename or repurpose a metric id or schema field (deprecate + add).
4. **Nothing target-specific gets hard-coded here** — the toolkit must stay generic. The profile records only *declared* boundary surface (manifests, git remote); never parse the target's frameworks to discover endpoints or consume-source URLs.
5. **Plans are user-signed:** never flip a plan to `confirmed` without explicit user approval; never judge records against an unconfirmed plan.
6. **Every number cites its tool** (`--tool`); fake or placeholder numbers are never recorded.
7. **Conventional Commits enforced** (commitlint + husky): pre-commit runs `typecheck` + `test`; the commit message must be `feat|fix|docs|refactor|test|chore|build|ci|style|perf|revert: …`.
8. **Tests:** node:test built-in, in `src/lib/*.test.ts`; new logic gets tests; tests sandbox storage via `RI_DATA_DIR` and must never touch real `runs/`.
9. **Self-application:** `npm run profile -- . --json > /dev/null` must always succeed (CI enforces it).

## Wisdom comparisons

Records tagged `--wisdom` (model/variant) and `--fixtures` (fixture set) are comparable only when
target + fixtures are identical and exactly one variable changes. Mixed fixture sets invalidate the
comparison — `insight` warns; treat the warning as a hard stop.
