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

## Get started — 5 minutes, on your own project

Requires Node ≥ 20. The toolkit is a CLI run from its own folder: it reads your project and
prescribes for it — it never modifies your code (that boundary is the whole point).

```bash
# one-time setup
git clone https://github.com/0xtrou/repo-intelligence.git
cd repo-intelligence && npm install

# 1. UNDERSTAND — scan YOUR repo → RepoProfile
npm run profile -- /path/to/your/repo --out /tmp/ri-profile.json
#    → human summary in the terminal + full JSON at /tmp/ri-profile.json

# 2. DEFINE GOOD — draft a MeasurementPlan: tooling prescriptions + metrics + thresholds
npm run plan -- /tmp/ri-profile.json
#    → plans/<your-repo>.plan.json (status: draft) + summary in the terminal

# 3. SIGN IT — read the draft, then confirm it and stamp the phase
npm run plan -- /tmp/ri-profile.json --confirm --phase exploration

# 4. MEASURE — record a real number from tools your project already has
echo '{"metrics": {"workflow.gate.durationMs": 32000}}' > /tmp/first-record.json  # ← your real measurement
npm run measure -- <your-repo-name> /tmp/first-record.json --tool "your gate command" --note "first record"
#    → runs/<your-repo-name>.jsonl, record #1

# 5. INTELLIGENCE — aggregate history: baseline, threshold verdicts, coverage gaps
npm run insight -- <your-repo-name>
```

That is the **entire loop**: understand → define good → measure → intelligence.
Everything else is depth on top of those five commands.

> `runs/` and `plans/` are **gitignored by design** — per-target data stays on the machine that
> measures, and history is append-only: nothing is ever rewritten.

### Next steps, once the loop runs

- **Publish the project's `intelligence/` folder** — MODEL.md, PROFILE.md, PLAN.md, append-only
  `insights/`, DECISIONS.md, committed in your repo. The contract lives in the
  [`intelligence-output`](skills/intelligence-output/SKILL.md) skill.
- **Recurse deliberately** — the profile lists child targets; `insight --rollup <target>` prints the
  child × metric matrix. One rung at a time, driven by whichever cells demand attention.
- **Compare wisdoms** — tag records with `--wisdom` + `--fixtures` to diff AI models / workflow
  variants on identical fixtures.
- **Walk the scenarios** — [recipes.md](skills/repo-intelligence/references/recipes.md) has the full
  paths: first benchmark, baseline rounds, recording tool output, adding metrics.

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
- **Self-application is the maintainers' business, not the onboarding path**: this repo is its own
  first target (we run our own loop on it — `runs/` and `plans/` here hold real self-measurements),
  but public users start on *their* projects, per the Get started above.
- Tests sandbox storage writes via the `RI_DATA_DIR` env var — real `runs/` history is never
  touched by the suite.

## Related

- The companion ZCode skills (`~/.agents/skills/repo-intelligence/`,
  `~/.agents/skills/intelligence-output/`) run this loop automatically in agent sessions.

## License

[MIT](LICENSE) © 2026 0xtrou
