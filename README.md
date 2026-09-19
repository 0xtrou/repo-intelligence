<div align="center">

# repo-intelligence

**Architect & benchmark intelligence for any repo or harness.**

Understand a repo, prescribe its tooling, define the metrics it must track, capture measurements
into a permanent time series, and derive insights — including comparisons between AI models and
workflow variants ("wisdoms").

This is a **meta-layer**: it decides and measures — it never implements the target's own test or
tooling code.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](package.json)
[![Tests](https://img.shields.io/badge/tests-node:test-3C873A?logo=node.js&logoColor=white)](package.json)
[![CI](https://github.com/0xtrou/repo-intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/0xtrou/repo-intelligence/actions/workflows/ci.yml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org)
[![Last commit](https://img.shields.io/github/last-commit/0xtrou/repo-intelligence/main)](https://github.com/0xtrou/repo-intelligence/commits/main)

<img src="docs/assets/four-layer-loop.svg" alt="The four-layer loop: understand → define good → measure → intelligence" width="920">

</div>

---

## Get started — 5 minutes, fully self-contained

No second repo needed: the toolkit profiles **itself** first (eat your own cooking).
Requires Node ≥ 20.

```bash
npm install

# 1. UNDERSTAND — scan this repo → RepoProfile
npm run profile -- . --out /tmp/ri-profile.json
#    → human summary in the terminal + full JSON at /tmp/ri-profile.json

# 2. DEFINE GOOD — draft a MeasurementPlan: tooling prescriptions + metrics + thresholds
npm run plan -- /tmp/ri-profile.json
#    → plans/repo-intelligence.plan.json (status: draft) + summary in the terminal

# 3. SIGN IT — read the draft, then confirm it and stamp the phase
npm run plan -- /tmp/ri-profile.json --confirm --phase exploration

# 4. MEASURE — record one real number (validated, stamped, appended — never overwritten)
echo '{"metrics": {"workflow.gate.durationMs": 32000}}' > /tmp/first-record.json
npm run measure -- my-first-target /tmp/first-record.json --tool manual --note "first record"
#    → runs/my-first-target.jsonl, record #1

# 5. INTELLIGENCE — aggregate history: baseline, threshold verdicts, coverage gaps
npm run insight -- my-first-target
```

That is the **entire loop**: understand → define good → measure → intelligence.
Everything else in this repo is depth on top of those five commands.

> `runs/` and `plans/` are **gitignored by design** — per-target data stays on the machine that
> measures, and history is append-only: nothing is ever rewritten.

## Apply it to your own project

1. **Profile it:** `npm run profile -- /path/to/your/repo --out /tmp/ri-profile.json` — read the
   summary; it lists child-target suggestions (recurse deliberately, one rung at a time).
2. **Plan it:** `npm run plan -- /tmp/ri-profile.json` → review the draft with your team → sign with
   `--confirm` (+ `--phase exploration|growth|profit|repair`).
3. **Measure it:** feed numbers from tools your project already has (gates, Lighthouse, axe, manual
   observation) — one JSON record per source, `--tool` cites where every number came from.
4. **Intelligence it:** `npm run insight -- your-target` after every round; `--rollup` for the
   child × metric matrix. And publish the project's `intelligence/` folder (MODEL.md, PROFILE.md,
   PLAN.md, insights/, DECISIONS.md) per the
   [`intelligence-output`](skills/intelligence-output/SKILL.md) skill.

## Understand it — reading order

| Order | Read | Why |
|---|---|---|
| 1 | [PHILOSOPHY.md](PHILOSOPHY.md) | the constitution: 4 layers, Inside–Outside model, fractal ladder, principles 0–12 |
| 2 | [METRICS.md](METRICS.md) | the metric vocabulary — A profile · B workflow · C runtime · E outward · S scales — plus phases |
| 3 | [recipes.md](skills/repo-intelligence/references/recipes.md) | concrete scenarios: first benchmark, baseline rounds, wisdom comparisons, adding metrics |
| 4 | [skills/](skills/README.md) | the agent skills, incl. the per-project `intelligence/` publishing contract |
| — | [AGENTS.md](AGENTS.md) | entry point for coding agents working in this repo |
| — | [schema/](schema/) | JSON Schemas for RunRecord and MeasurementPlan |

The core ideas in one breath: **Inside–Outside** (measure the repo's inner world AND how it
interacts with / is seen by the world), the **fractal ladder** (repo → business model → humanity —
the same loop at every scale, depth decided by the agent, direction signed by the user), and the
**self-balancing loop** (every intelligence round ends in a signed rebalance: coverage gaps, phase
diagnosis, rebalanced priorities).

## Layout

```
PHILOSOPHY.md    the constitution — 4-layer model, principles 0–12, boundary rule
METRICS.md       canonical metric taxonomy + extension rules
schema/          JSON Schemas for RunRecord and MeasurementPlan
src/
  profile.ts     Layer 1 — scan any repo → RepoProfile
  plan.ts        Layer 2 — architect: profile → MeasurementPlan draft (tooling + metrics)
  measure.ts     Layer 3 — validate + append RunRecord (append-only)
  insight.ts     Layer 4 — aggregate history → insight report, roll-ups, gaps
  lib/           shared types, JSONL store, CLI parser (unit-tested)
skills/          agent skills: repo-intelligence (the loop) + intelligence-output (publishing)
AGENTS.md        entry point for coding agents working in this repo
runs/            append-only measurement history (gitignored — lives where the measuring happens)
plans/           MeasurementPlans per target (gitignored — per-target working data)
docs/assets/     README diagram
```

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org) are **enforced**: `commitlint` runs on
every commit message via a husky `commit-msg` hook, and every commit must pass the pre-commit gate.

```
feat: add a measurable capability        fix: repair incorrect behavior
docs: documentation only                 refactor: restructure, no behavior change
test: add/adjust tests                   chore: tooling, deps, metadata
build · ci · style · perf · revert
```

Scope is optional: `feat(insight): compare wisdoms on numeric metrics`.

## Development

```bash
npm run typecheck   # tsc --noEmit, strict
npm test            # node:test unit suite (runs via ts-node, ~1s)
```

- Tests use Node's built-in `node:test` runner — zero additional test dependencies.
- The **pre-commit hook** runs `typecheck` + `test` on every commit; CI (Node 22 & 25) runs the
  same gates plus a self-application check (`profile` must always work on this repo).
- Tests sandbox storage writes via the `RI_DATA_DIR` env var — real `runs/` history is never
  touched by the suite.

## Related

- The companion ZCode skills (`~/.agents/skills/repo-intelligence/`,
  `~/.agents/skills/intelligence-output/`) run this loop automatically in agent sessions.

## License

[MIT](LICENSE) © 2026 0xtrou
