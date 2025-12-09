# Tech Lifecycle Project – Onboarding Brief

_Last updated: 2025-12-08_

## 1) Why this exists (goal in one sentence)
Build a single, consistent system to evaluate each invention/technology across multiple stages (Triage now, Viability next) without duplicate data entry, with clear audit, roles, and safe collaboration.

## 2) Glossary (plain English)
- **techId**: The unique case number for an invention/technology (e.g., `TECH-2025-042`). Everything we store hangs off this.
- **Technology**: Core record keyed by techId (name, inventor, summary, status).
- **Stage supplement**: Stage-specific table that extends Technology (e.g., `TriageStage`, `ViabilityStage`). No shared fields are duplicated here.
- **Question Catalog**: Library of reusable questions. Each has a stable `questionKey` and a `bindingPath` pointing to an exact field (e.g., `technology.inventorName`, `triageStage.marketScore`).
- **Form Template**: A stage/persona-specific layout that pulls questions from the catalog; templates don’t own data.
- **Shared answers**: Answers stored by `(techId, questionKey)` so any form containing that question shows the same value.
- **Persona**: Role code (tech manager, inventor, executive, etc.) that drives who can see/edit which fields.
- **Optimistic locking**: Version number on records; if your version is stale, the save is rejected with the latest data to avoid overwrites.

## 3) Current state (as of 2025-12-08)
- Prisma schema includes Technology, TriageStage, ViabilityStage scaffold, audit tables, persona models, QuestionDictionary/FormTemplate/FormQuestion scaffolding.
- Form engine can hydrate templates via binding paths; export tooling and safety toggles exist.
- Gaps:
  - Shared answers store (`TechnologyAnswer`) not yet implemented; still using per-submission responses.
  - Binding write-back not fully wired (arrays/repeatables/scores/dates need normalization + tests).
  - Optimistic locking not enforced end-to-end (API/UI).
  - Persona enforcement and catalog expansion for Viability + metrics incomplete.
  - Calculated metrics service not yet built.

## 4) What needs to be done (and why)
1. **Shared answers + migration**
   - Add `TechnologyAnswer` table; link `FormSubmission` to `technologyId`.
   - Migrate legacy `QuestionResponse` rows into the shared store; retire per-form answers.
   - Why: eliminate duplicate entry and ensure every form sees the same truth.

2. **Reliable write-back via bindings**
   - Server actions persist Technology + stage fields using `bindingPath`.
   - Normalize arrays/repeatables/scores/dates; add regression tests.
   - Why: prevent silent data loss and keep templates data-driven.

3. **Optimistic locking & collaboration UX**
   - Enforce `rowVersion` on writes; return 409 with latest payload for merge/refresh.
   - Optional `StageLock` banner when another editor is active.
   - Why: avoid clobbering teammates’ edits.

4. **Catalog governance**
   - Auto-generate allowed `bindingPath` registry from Prisma; run `catalog:lint/validate` in CI.
   - Expand catalog to Viability + calculated metrics; version entries.
   - Why: stop bad bindings and keep forms aligned with schema.

5. **Persona enforcement**
   - Finalize persona matrix; enforce on server; renderer hides/locks via personaConfig.
   - Add sample persona dashboards.
   - Why: least-privilege editing and correct views for each role.

6. **Calculated metrics**
   - Pure-function evaluator; recompute on save + nightly; log failures without blocking.
   - Start with overall score example from the master plan.
   - Why: consistent derived insights without manual recalculation.

7. **Safe rollout**
   - Backup, staging dry-run, conflict report for migrated answers.
   - Feature-flag cutover; rollback steps ready; remove legacy after stability.
   - Why: de-risk the transition.

8. **Testing backbone**
   - Unit: binding resolution, optimistic locking, metric functions.
   - Integration: triage→viability flow with shared answers.
   - UI: persona visibility/read-only, hydrated templates.
   - Why: guard the refactor against regressions.

## 5) Suggested execution sequence (pragmatic order)
1. Schema: add `TechnologyAnswer`, `technologyId` on submissions; generate binding registry.
2. Migration: backfill shared answers from `QuestionResponse`; emit conflict report.
3. Runtime switch: read/write via shared store; normalize tricky field types; add regression tests.
4. Locking: wire `rowVersion` through API + UI; show conflict handling; optional StageLock.
5. Catalog & personas: expand catalog, enforce lint in CI; finalize persona rules and enforce server-side; update renderer.
6. Metrics: implement evaluator + nightly job; add first metrics.
7. Rollout: staging dry-run, flag-guarded prod cutover, monitor, then retire legacy responses.

## 6) Design pillars (what not to break)
- Single source of truth per techId; no duplicated shared fields across stages.
- Templates are purely configuration; data lives in Technology/stage/TechnologyAnswer.
- Persona rules enforced server-side; UI is an aid, not the gate.
- Every write is auditable and concurrency-safe.

## 7) Key files to read
- High-level roadmap & risks: `1-ARCHITECTURE_ROADMAP.md`
- Shared answers target shape: `2-shared-answer-architecture.md`
- Full blueprint (schema, migration, personas, governance, testing): `3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md`

## 8) Quick orientation for new contributors
- Start by reading the three docs above (top to bottom).
- Run catalog lint/validation scripts to see binding expectations.
- Walk the Triage form flow locally; note where writes go today (per-submission) and where they will go (shared answers).
- Skim Prisma schema to see binding targets (Technology + stage supplements).

## 9) Open questions (to close early)
- Final persona taxonomy (codes, display names, owner of lifecycle).
- Catalog versioning scheme (semantic vs. timestamp) and change process.
- Expression engine choice for metrics (JSONata/expr-eval/custom DSL).
- StageLock backing store (DB vs. Redis) and SSO/identity timeline.

## 10) Success criteria (initial)
- One saved answer shows identically in Triage and Viability for the same techId.
- A stale save returns a conflict instead of overwriting.
- Catalog lint blocks any invalid binding path in CI.
- Persona with read-only rights cannot modify shared fields (enforced server-side).
- Calculated metric recomputes on save/nightly and logs failures without blocking.
