---
name: intelligence-output
description: Mandate the per-project `intelligence/` folder — when doing repo-intelligence work on any repo, the agent must create and maintain that project's intelligence/ folder with MODEL.md, PROFILE.md, PLAN.md, append-only insights/ and DECISIONS.md. Use whenever benchmarking or measuring a project, whenever the user mentions the intelligence folder or project intelligence reports or project model, and whenever an intelligence run completes and outputs must be published into the target repo — even if they don't say "intelligence" or "model".
---

# intelligence-output — the per-project publishing contract

The repo-intelligence toolkit is the engine; **the intelligence lives inside each project it serves**.
Whenever this toolkit is used on a project, the agent must create and maintain that project's
`intelligence/` folder — committed to the project's repo, readable by any agent or human who opens it.
Rule 0 still applies: the folder is created only after the conviction contract is confirmed.

## The folder contract

```
intelligence/
├── README.md       how to read this folder + Rule 0 + pointer to the toolkit   (created once)
├── MODEL.md        THE project's model: loops, expansions, ladder, blind spots  (living file)
├── PROFILE.md      Layer-1 digest: inside, boundary, child suggestions          (re-profiled)
├── PLAN.md         Layer-2 signed plan: phase, prescriptions, metrics           (signed changes only)
├── insights/       Layer-4 rounds, append-only: YYYY-MM-DD-round-N.md           (never rewritten)
└── DECISIONS.md    signed rebalance ledger: phase/priority changes + evidence   (append entries)
```

## What each artifact contains

**MODEL.md — the living model (most important file).** Every finding about how the intelligence model
applies to THIS project converges here, dated:

- **The loops** — recurring cycles discovered in the project (dev gate loop, sync/webhook loop,
  release loop, user-feedback loop, the agentic workflow loop itself). Per loop: trigger → steps →
  which metrics watch it. A loop nobody named is a loop nobody measures.
- **The expansions** — how the generic model extends here: child targets adopted (and which were
  deliberately not pursued), boundary surfaces in play, ladder rungs active (one-paragraph business
  model, philosophy commitments), planned wisdom comparisons.
- **Blind spots** — what the model does not yet cover for this project; each one feeds the coverage
  gaps in the next insight round.
- Updated in every phase when a new finding emerges, with a date stamp per section. Never deleted —
  superseded findings get struck through, not removed (history is the point).

**PROFILE.md** — rendered from `profile --json`: inside (stack, LOC, routes, tests, gates), declared
boundary (outward.*, gitRemote), child-target suggestions, profiledAt. Re-rendered when re-profiling.

**PLAN.md** — the confirmed MeasurementPlan: phase, tooling prescriptions, every metric with unit +
threshold + source, signed by whom and when. Raw plan JSON stays in the toolkit; this is the signed face.

**insights/YYYY-MM-DD-round-N.md** — one file per insight round, append-only: verdict table (baseline →
latest, Δ, PASS/FAIL), coverage gaps, wisdom comparison (or why invalid), roll-up summary for parents,
phase diagnosis, and the rebalance proposal as presented to the user.

**DECISIONS.md** — one append entry per signed rebalance: date, phase change (or "unchanged"),
priority changes, the evidence that drove it, who signed. A decision without a cited insight round
does not go in.

## Rules

1. **Committed in the target project** — `intelligence/` is the project's face; raw JSONL records stay
   local in the toolkit's `runs/` and are cited by path, never pasted wholesale into reports.
2. **Append-only insights/ and DECISIONS.md** — new rounds and decisions are added, history is never
   rewritten; MODEL.md sections are dated and superseded findings are struck through, not deleted.
3. **Rule 0 first** — folder and artifacts are created only after the conviction contract is confirmed
   with the user; creating the folder is not exempt from the mandate.
4. **One folder per target root** — child targets report through the parent's roll-up sections and
   their own insight rounds; do not scatter nested intelligence/ folders unless the child is its own
   standalone repo.
5. **Nothing lands without evidence** — every claim in MODEL.md and insights/ cites a toolkit command,
   a record path, or a user statement.
