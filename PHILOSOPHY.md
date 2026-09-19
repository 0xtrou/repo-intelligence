# repo-intelligence — Philosophy

**What this is:** a meta-layer toolkit that provides *architect intelligence* and *benchmark intelligence* for any repo or harness. It understands repos, prescribes tooling, defines the metrics that matter, captures measurements into a permanent time series, and derives insights. It is the "business intelligence function" for codebases.

**What this is NOT (the boundary rule):** it never does implementation work *for* the target repo. It does not author Maestro flows, Playwright specs, Lighthouse configs, or any test/tooling code for the target — that is the target's own job. It *decides and measures*: "this app needs Maestro for e2e user-journeys because X, and must track metrics A, B, C with thresholds Y." It chooses the weapon and justifies the choice; it does not swing the weapon. If you find yourself writing target-specific test code while running this toolkit, you have crossed the boundary — stop.

---

## The four-layer model

A business must first understand its business model, then choose directions and define what success means, then measure, and only then build intelligence. Measuring before defining direction means measuring the wrong things; defining direction without understanding means fantasy targets. Repos work the same way.

| # | Layer | Business analogy | Question it answers | Artifact | Command |
|---|---|---|---|---|---|
| 1 | **Understand** | business model canvas | "What is this repo — inside, boundary, outside?" | `RepoProfile` | `npm run profile -- <target>` |
| 2 | **Define good** | strategy & KPIs | "What does good mean here — which tools, which metrics, which thresholds?" | `MeasurementPlan` | `npm run plan -- <profile.json>` |
| 3 | **Measure** | business metrics | "Where are we today?" | `RunRecord`s (append-only time series) | `npm run measure -- <target> <record.json>` |
| 4 | **Intelligence** | BI & decisions | "What do we do next? Which wisdom wins?" | insight report | `npm run insight -- <target>` |

The layers are strictly ordered. A profile you skipped makes every threshold a guess; a plan you skipped makes every number uninterpretable; measurements without intelligence are dead weight; intelligence without history is opinion.

**Layer 2 is where the architect lives.** The `plan` step turns a profile into a *prescription*: which tools the harness needs (e2e runner, visual regression, a11y, performance — with rationale), and which metrics A, B, C it must track, each with a unit, a threshold, and a collection source. A plan is always a **draft until the user confirms it** — the architect advises, the human decides.

---

## The Inside–Outside model

A business measures its internal operations *and* its market: what it sells, what it depends on, and how the market sees it. Repos are the same. Every target has **two worlds and three measurement zones**:

| Zone | Question it forces | Covers | How numbers arrive |
|---|---|---|---|
| **INSIDE** (ops) | "What is it, internally?" | stack, LOC, routes, tests, gates, CI | `profile` scans (generic inventory) |
| **BOUNDARY** (exchange) | "What crosses the line?" | *exposes*: endpoints, contracts, packages · *consumes*: services, deps, env | the target **declares** → architect prescribes `external.*` → `measure` ingests |
| **OUTSIDE** (perception) | "How does the world see it?" | GitHub, npm, dependency health, docs surface | the world **reports** (`gh api`, registries) → `measure` ingests `perception.*` |

**The one-line rule:** *profile scans INSIDE only; BOUNDARY and OUTSIDE numbers arrive through `measure` from sources that exist. The meta names the zones; the meta does not go exploring.*

**Why this model exists (the miss it prevents):** the first cut of this toolkit measured only INSIDE, and nobody noticed — because the vocabulary *is* the agent's checklist, and a checklist without an "outside" section guarantees the outside gets skipped. Agents do not miss things at random; they miss exactly what the taxonomy never asks them to name. Naming all three zones is the miss-prevention mechanism.

**What stays meta:** the toolkit defines the outward *vocabulary* (`external.*`, `perception.*`), prescribes those metrics when applicable, and ingests their numbers like any other metric. It never parses the target's frameworks to discover its endpoints, and never bakes target-specific extraction into its code — declaring the boundary surface is the target's own job.

---

## The fractal ladder

The Inside–Outside model applies at every scale, and the scales stack. A repo serves a business model; a business model serves a philosophy of serving humans. The same four questions and the same three zones run at every rung:

| Rung | Question | Numbers come from |
|---|---|---|
| **REPO** (artifact) | what is it, what crosses its line, how is it seen | `profile` scans, world tools, the target's own gates |
| **BUSINESS MODEL** | what value is exchanged, with whom | business analytics of the target / user interview (`business.*`) |
| **HUMANITY / PHILOSOPHY** | which humans it serves, at what cost, with what respect | audits and judgment (`philosophy.*`) |

**Meaning flows down, evidence flows up.** A code-level number becomes a principle-level fact through the ladder (`a11y.violations = 0` *is* "inclusion"; `transferBytes` *is* an energy cost), and a principle sets the threshold a code metric must meet. Higher-scale metrics are first-class records in the same machinery — never a separate process.

**Suggest, don't decide.** The toolkit names the rungs, lists candidate children, and proposes phases; the agent decides how deep to recurse and when to ascend, and the user signs every direction change. Depth is judgment, not configuration.

**The matrix closes on itself.** Every intelligence round ends in a signed rebalancing decision: coverage gaps (what the plan demands but history lacks), phase diagnosis (`exploration | growth | profit | repair`), and rebalance actions. A harness that can name its own blind spots is the only kind that fills them.

---

## Principles

**1. Context is the constraint.** An agent (or a new teammate) is only as good as the context it can see, and every repo boundary loses context. Understanding must be an *artifact* (`RepoProfile`), not tribal knowledge in someone's head — any session that starts from the artifact starts from the same truth.

**2. Evidence or it didn't happen.** Every measurement cites its tool and `capturedAt`; every insight cites its records. A claim without a record row is gossip, and gossip does not enter this repo.

**3. Ground truth: live capture > spec > memory.** A fresh capture of the running thing beats any document about the thing. Docs are cross-checks, never sources.

**4. Append-only history.** A measurement that overwrites itself is not a measurement. `runs/` only grows: every record is kept, timestamped, and immutable. The baseline must remain visible forever, because "how far we've come" and "are we regressing" are both comparisons against history. (The append-only JSONL lives on the machine that measures and is deliberately gitignored — per-target run data must not pollute the shared toolkit repo.)

**5. Canonical single source.** Each fact has exactly one home: the profile owns inventory, the plan owns thresholds, runs own numbers. Never duplicate a definition — the duplicate is how agents (and humans) get led astray when one copy goes stale.

**6. Additive, versioned schema.** Every record carries `schemaVersion`. The schema evolves additively only: new fields, never renamed fields (deprecate + add instead). Old records must stay readable forever — history that expires with a refactor is not history.

**7. One-command verifiability.** Every artifact is produced by one command from this toolkit (`profile`, `plan`, `measure`, `insight`). If producing an artifact requires tribal steps, it will not survive.

**8. Gates exist to be red sometimes.** A gate that never fails is not testing. The toolkit also measures gate *health* — pass rates, runtimes, flakiness — because a permanently-green gate and a permanently-red gate are both broken instruments.

**9. Wisdom comparison requires normalized fixtures.** Comparing models ("wisdoms") or workflow variants is only valid when target and fixtures are held constant and exactly one variable changes. Every comparable record therefore carries `wisdom` and `fixtures` labels. A comparison without normalization is marketing.

**10. Prescribe, don't implement.** The boundary rule, restated as a principle: this toolkit's output is decisions, definitions, and measurements — never target-specific implementation. This keeps it applicable to *any* harness without growing target-specific baggage.

**11. Depth is suggested; direction is signed.** The toolkit proposes children, rungs, and phases; the agent decides how deep to recurse and when to ascend the ladder; the user signs every rebalance. Automating the mechanics without human sign-off invites drift; requiring sign-off on everything kills autonomy — this is the split.

**12. The matrix closes on itself.** Coverage gaps and phase signals are computed, not felt. Every round, the harness names its own blind spots — unmeasured metrics, unprofiled children, missing wisdom comparisons — and proposes what to rebalance before anything else gets measured.

---

## Self-application

This repo is its own first target: `npm run profile -- .` must always work on it. Eat your own cooking before serving it.

## Non-goals

Not a test runner. Not CI. Not an observability platform or a dashboard. It produces artifacts and reports; humans and agents make the decisions. It collects numbers from tools that exist (including the target's own gates); it does not replace them.
