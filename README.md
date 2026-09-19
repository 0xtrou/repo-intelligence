# repo-intelligence

**Architect & benchmark intelligence for any repo or harness.** Understand a repo, prescribe its tooling, define the metrics it must track, capture measurements into a permanent time series, and derive insights — including comparisons between AI models / workflow variants ("wisdoms").

This is a **meta-layer**: it decides and measures, it never implements the target's own test or tooling code. Read [PHILOSOPHY.md](PHILOSOPHY.md) first — it is the constitution.

## The four-layer model

```
1. UNDERSTAND   npm run profile -- <target-repo>     → RepoProfile        ("what is this repo?")
2. DEFINE GOOD  npm run plan -- <profile.json>       → MeasurementPlan    ("which tools, which metrics A/B/C, which thresholds?")
3. MEASURE      npm run measure -- <target> <record> → RunRecord (append-only runs/<target>.jsonl)
4. INTELLIGENCE npm run insight -- <target>          → stats, trends, deltas, wisdom comparison
```

Layer 2 output is always a **draft until the user confirms**. Metric vocabulary lives in [METRICS.md](METRICS.md) (canonical, additive-only).

## Quickstart

```bash
npm install

# 1. Profile any repo (works on this repo itself — self-application)
npm run profile -- . --json

# 2. Draft a measurement plan from a profile (architect step; ALWAYS user-confirms)
npm run profile -- /path/to/some/repo --out /tmp/profile.json
npm run plan -- /tmp/profile.json            # writes plans/<target>.plan.json (status: draft)

# 3. Record a measurement (validates, stamps capturedAt, appends — never overwrites)
npm run measure -- my-target /tmp/record.json --tool lighthouse --wisdom glm --fixtures base-v1

# 4. Derive insight (stats vs baseline, threshold checks, per-wisdom comparison)
npm run insight -- my-target
```

## Layout

```
PHILOSOPHY.md    the constitution — 4-layer model, principles, boundary rule
METRICS.md       canonical metric taxonomy v0 + extension rules
schema/          JSON Schemas for RunRecord and MeasurementPlan
src/
  profile.ts     Layer 1 — scan any repo → RepoProfile
  plan.ts        Layer 2 — architect: profile → MeasurementPlan draft (tooling + metrics)
  measure.ts     Layer 3 — validate + append RunRecord (append-only)
  insight.ts     Layer 4 — aggregate history → insight report
  lib/           shared types, JSONL store, tiny CLI parser
runs/            append-only measurement history (committed — history is the point)
plans/           MeasurementPlans, one file per target (confirmed plans are versioned by git)
```

## Applying it to a harness

1. `profile` the harness's repo. 2. `plan` and confirm the prescription with the team ("needs Maestro for e2e, tracks LCP/CLS/gate-pass-rate…"). 3. Feed records into `measure` — from the harness's existing gates, from external tools, or manually. 4. `insight` after every round. Nothing in the harness repo needs to change to start; making it change is the *prescription's* job, done by the harness's own agents/humans.

Compared wisdoms must share `fixtures` and differ in exactly one variable (principle 9).

## Related

- The companion ZCode skill (`~/.agents/skills/repo-intelligence/`) runs this loop automatically in agent sessions.
