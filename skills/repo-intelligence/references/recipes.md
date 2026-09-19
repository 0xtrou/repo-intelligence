# Recipes — concrete scenarios for repo-intelligence agents

Every recipe assumes commands run from **TOOLKIT** (the repo-intelligence root) and that you have
read [SKILL.md](../SKILL.md). `/tmp` paths are scratch only — durable artifacts live in TOOLKIT
(`plans/`, `runs/`).

## Recipe 1 — First-time benchmark of a new repo (the full loop)

1. `npm run profile -- /path/to/target --out /tmp/ri-profile.json`
2. Read `/tmp/ri-profile.json`. Then read the target's own `AGENTS.md`, CI workflows, and gate
   scripts (they are listed in the profile's `workflow` block) — the profile tells you where to look.
3. `npm run plan -- /tmp/ri-profile.json`
4. Present the draft to the user: tooling prescriptions (which are `present`, which are
   `PRESCRIBE`), the metric list with units + suggested thresholds. Ask for confirmation
   (and any threshold adjustments).
5. On confirmation: `npm run plan -- /tmp/ri-profile.json --confirm`
6. Go to Recipe 2 for the first measurement round.

Acceptance: plan file exists with `status: "confirmed"`, user saw and approved the prescriptions.

## Recipe 2 — Capture a baseline round (measure → insight)

1. Identify numbers you can cite a source for: a gate command's result, an existing tool's output
   (audit script, Lighthouse, axe run), or direct observation (`--tool manual`).
2. Write a record file:
   ```json
   {"metrics": {"workflow.gate.passRate": 0.9, "workflow.gate.durationMs": 1520000}}
   ```
3. `npm run measure -- <target> /tmp/record.json --tool <gate-or-tool-name> --note "baseline round"`
4. Repeat per source — one record per source keeps provenance clean.
5. `npm run insight -- <target>` → report baseline stats; the first record per metric **is** the baseline.

Acceptance: every appended number has a real tool citation; insight report delivered with a recommendation.

## Recipe 3 — Record an existing tool's output (mapping, not codegen)

You have a results file from the target's own tooling (e.g. an audit `results.json`, a Lighthouse
report). Map its fields onto canonical metric ids **by hand or with a throwaway mapping in /tmp** —
never commit a target-specific parser into this toolkit (boundary rule).

1. Read the tool output; identify values matching METRICS.md ids (e.g. LCP → `runtime.lcpMs`).
2. Emit a small record JSON in /tmp with only the values you can defend.
3. Measure it with `--tool <the tool's name>` (cite the tool, not yourself).
4. Metrics not in the plan produce a `note:` warning — that's visibility, not a blocker;
   if the metric is genuinely valuable, go to Recipe 5.

## Recipe 4 — Wisdom comparison (model A vs model B)

Prerequisite: both wisdoms ran **the same target with the same fixtures**; only the wisdom differs.

1. During each run, tag records: `npm run measure -- <target> ... --wisdom glm --fixtures base-v1`
   and `--wisdom claude --fixtures base-v1`.
2. `npm run insight -- <target>` → the per-wisdom table appears when ≥2 wisdoms exist.
3. Report means per wisdom with the caveat about sample size (counts are in the report).
4. If `insight` warns about mixed fixture sets: **do not compare** — re-run the missing fixture set first.

Acceptance: comparison table delivered, or an explicit statement of why comparison was invalid.

## Recipe 5 — Add a new metric to the vocabulary

1. Propose to the user: id (dot notation, camelCase segments), unit, description, threshold guidance, source.
2. After approval, edit `METRICS.md` (the canonical vocabulary) — additive only, never rename an id.
3. If `plan` should prescribe it by default for new targets, add it to `buildMetrics()` in `src/lib/planLib.ts`
   (and `buildTooling()` if a new tool prescription is needed).
4. `npm run typecheck && npm test` — pre-commit runs this anyway; commitlint requires a conventional
   message, e.g. `feat(metrics): add runtime.inpMs interaction metric`.

## Recipe 6 — Re-confirm or adjust a plan

1. Edit `plans/<target>.plan.json` only through deliberate change: regenerate the draft with `plan`
   and adjust thresholds the user requested, or edit the confirmed file directly (git tracks history).
2. Status transitions: `draft` → `--confirm` re-run → `confirmed`. Never flip to `confirmed`
   without the user's explicit sign-off in the conversation.
3. `measure` warns when records contain metrics missing from the plan — treat repeated warnings as a
   signal to update the plan (Recipe 5 for new vocabulary).

## Recipe 7 — Edit this toolkit itself (dev gates)

1. `npm run typecheck && npm test` before committing (the husky pre-commit hook runs both; commitlint
   enforces conventional commits — see README §Commit convention).
2. Tests live next to the code they cover (`src/lib/*.test.ts`, node:test built-in). Add tests for
   new logic; keep the CLI files thin (parsing/printing only) and logic in `src/lib/`.
3. Tests sandbox storage via `RI_DATA_DIR` — never let a test touch real `runs/`.
4. Self-application: `npm run profile -- . --json > /dev/null` must always succeed (CI enforces it).

## Recipe 8 — The final report (every loop ends here)

Deliver to the user, in this order:

1. **Prescription/measurement summary** — one paragraph, what and why.
2. **Plan status** — `draft` (what you need from the user) or `confirmed` (signed off when).
3. **Records** — `runs/<target>.jsonl` + record numbers appended this round.
4. **Verdicts** — table: metric | first | latest | Δ | threshold | PASS/FAIL; wisdom table if applicable.
5. **Recommendation** — the single most valuable next optimization, grounded in cited numbers.
6. **Deviations/unknowns** — anything you could not measure and why (e.g. instrument missing).

No verdict without a record; no record without a tool citation.
