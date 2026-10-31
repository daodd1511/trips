# trips

Self-hosted trip planner: places, stays, and spending per trip. Plan and design live
in `docs/specs/place-manager/`.

## Spec-Driven Execution Workflow
<!-- spec-workflow v1 -->

Specs live in `docs/specs/<feature-slug>/`. Flow: `/grill-me` → `PLAN.md` →
`/spec-plan` → `EXECUTION.md` → `/spec-phase` per phase.

A grill session that lands a plan writes it to `docs/specs/<feature-slug>/PLAN.md` —
never to the repo root. Create the directory if it doesn't exist yet.

Doing spec work? Read `docs/specs/RULEBOOK.md` first — the state model
(`done-with-debt`, `[~]`, verification debt), gate tiers, branch model, checkpoints, and
capability baseline are defined there, not here. Don't improvise substitutes for those
terms from this summary.
