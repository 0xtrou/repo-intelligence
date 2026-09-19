# skills/

Dedicated agent skills for this repo — plain markdown, no tool-specific lock-in.

| Path | What it is |
|---|---|
| [`repo-intelligence/SKILL.md`](repo-intelligence/SKILL.md) | The canonical skill: capability map, four-phase loop, hard rules, extension protocol, report format |
| [`repo-intelligence/references/recipes.md`](repo-intelligence/references/recipes.md) | Step-by-step recipes: first benchmark, baseline rounds, recording tool output, wisdom comparisons, adding metrics, editing the toolkit |
| [`intelligence-output/SKILL.md`](intelligence-output/SKILL.md) | The per-project publishing contract: every project gets a committed `intelligence/` folder — MODEL.md (loops, expansions, blind spots), PROFILE.md, PLAN.md, append-only insights/, DECISIONS.md |

## How agents load these

- **ZCode (working inside this repo):** discovered automatically via `.zcode/skills/repo-intelligence/SKILL.md`, which is a loader stub pointing here (single source of truth).
- **ZCode (any other workspace):** a user-level install lives at `~/.agents/skills/repo-intelligence/SKILL.md`.
- **Any other tool** (Claude Code, Cursor, …): copy the `repo-intelligence/` folder into your tool's skills directory. The skill is plain markdown with relative links — nothing to build.
- **Skill discovery contract:** frontmatter is `name` + `description` only; the description carries the trigger phrases. Keep it under 1024 chars when editing.

## Editing rules

- `skills/repo-intelligence/SKILL.md` is the canonical skill. The `.zcode/skills` stub and the user-level install must stay thin pointers/copies — real changes happen here.
- The skill must never duplicate `PHILOSOPHY.md` or `METRICS.md` content — it routes to them (canonical single-source, principle 5).
