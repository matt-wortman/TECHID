# Technology Multi-Form Master Plan — Plain English

_Last updated: 2025-12-08_

## 1) What this project is for
Give every invention/technology a single, trustworthy home for its facts, while letting multiple forms and roles collect and view those facts without duplicates.

## 2) The big idea in one line
One technology record (keyed by a `techId`) feeds many forms and personas. Questions are reusable, answers are shared, stages add only their unique fields.

## 3) Where we are now
- **Data shelves built:** We already have a main shelf for each technology, an extra shelf for Triage details, a half-built shelf for Viability, and bins for history/audit and user roles. A question library and form layouts also exist.
- **Tools that work today:** The form screen can pull questions from the library and prefill answers; we can export data; there are on/off switches to keep risky changes behind a safety valve.
- **Still to finish:**
  - One shared answer box for each question + technology (so every form sees the same answer)
  - Saving answers through the shared box for all field types (lists, repeatables, scores, dates)
  - Protection against two people overwriting each other (version checks and friendly conflict messages)
  - Enforcing role rules everywhere, not just in the UI
  - Automatic scores/calculations service
  - Filling out the question library for the Viability stage and for calculated scores

## 4) Key concepts (plain language)
- **techId:** Case number for a technology (e.g., `TECH-2025-042`).
- **Technology record:** The core facts (name, inventor, status, etc.).
- **Stage supplements:** Add stage-only data (Triage, Viability, later Commercial) without copying shared fields.
- **Question Catalog:** Library of reusable questions with a permanent `questionKey` and a `bindingPath` that points to the exact field to save to.
- **Form Template:** A curated list of catalog questions for a stage/persona; templates do not store answers.
- **Shared answers:** Stored as `(techId, questionKey)` so the same answer appears wherever the question is asked.
- **Personas:** Role rules (tech manager, inventor, executive, legal, finance) controlling who can see/edit which fields.
- **Optimistic locking:** Version number on records to prevent silent overwrites.

## 5) How forms should work (end state)
1. Load template + catalog entries for a techId.
2. Prefill values from Technology/stage/shared answers using `bindingPath`.
3. Enforce persona rules (hide/lock fields).
4. On save: validate, write to Technology/stage/shared store, log changes, recompute metrics, and check version for conflicts.

## 6) What needs to be built next (and why)
1. **Shared answers + migration** — create `TechnologyAnswer`, link `FormSubmission` to `technologyId`, migrate legacy responses. Eliminates duplicate entry.
2. **Reliable write-back** — normalize arrays/repeatables/scores/dates; add regression tests. Avoids data loss.
3. **Optimistic locking UX** — enforce `rowVersion`; show conflict/diff; optional edit banner (StageLock). Prevents clobbering.
4. **Catalog governance** — auto-generate allowed `bindingPath` list from Prisma; lint in CI; expand catalog for Viability and metrics. Stops bad bindings.
5. **Persona enforcement** — finalize matrix; enforce server-side; renderer hides/locks. Ensures least-privilege editing.
6. **Calculated metrics** — pure-function evaluator; recompute on save + nightly; log errors without blocking. Keeps scores consistent.
7. **Safe rollout** — backup, staging dry-run, conflict report, feature-flag cutover, rollback plan, then retire legacy responses.
8. **Testing backbone** — unit (bindings, locking, metrics), integration (triage→viability flow), UI (persona visibility/read-only, hydrated templates).

## 7) Suggested delivery order
1) Schema + binding registry
2) Migration + conflict report
3) Runtime switch to shared answers + normalization tests
4) Locking end-to-end (API + UI)
5) Catalog expansion + persona enforcement
6) Metrics engine + nightly job
7) Flagged rollout to prod; then remove legacy writes

## 8) Safety, audit, and operations
- Every update writes audit entries; history kept for stages.
- Feature flags allow quick rollback during migration.
- Backups and dry-runs precede cutover; rollback plan documented.
- Performance targets: fast hydrate (<200 ms) and save (<500 ms p95) once caching/indexing are in place.

## 9) Open decisions to close early
- Final persona codes/names and owner of persona lifecycle.
- Catalog versioning scheme (semantic vs timestamp) and change process.
- Expression engine choice for metrics (JSONata / expr-eval / custom DSL).
- StageLock store (DB vs Redis) and SSO timeline.

## 10) Success criteria
- A question answered once shows the same value in Triage and Viability for that techId.
- Stale saves return a conflict instead of overwriting.
- Catalog lint blocks invalid binding paths in CI.
- Persona with read-only rights cannot modify shared fields (enforced server-side).
- Calculated metrics recompute on save/nightly and log failures without blocking users.

## 11) Quick start for new contributors
- Read: `3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md`, `1-ARCHITECTURE_ROADMAP.md`, `2-shared-answer-architecture.md` (in that order).
- Skim the Prisma schema to see binding targets.
- Run catalog lint/validation scripts to see current expectations.
- Walk the Triage form locally to observe current (legacy) answer writes vs the target shared store.
