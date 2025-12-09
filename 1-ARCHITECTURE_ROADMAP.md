# Architecture Roadmap

_Last updated: 2025-10-10_

## Current Architecture Snapshot
- **Technology aggregate** holds canonical data keyed by `techId`; stage supplements (`TriageStage`, `ViabilityStage` scaffolded) extend without duplication.
- **Question Dictionary + Templates** provide a versioned catalog of fields (`bindingPath`, validation, persona config) used by the dynamic form renderer.
- **Dynamic Form Engine**
  - Hydrates templates from `/api/form-templates` with `initialResponses` and repeat groups.
  - UI merges prefills with draft data and listens for `HYDRATE_INITIAL_DATA`.
  - Backend normalizes values (arrays, repeat groups, scores, ISO dates) ready for write-back.
- **Audit & Safety**
  - `TechnologyAuditLog` + `StageHistory` capture changes.
  - Safety env toggles prevent destructive seeding/imports by default.
  - Export CLI + Windows automation ensure off-platform backups.
- **Export Surface**
  - `scripts/export-forms.ts` builds Excel workbooks via ExcelJS.
  - Destinations: Blob (legacy), Local (current automation workflow).

## In-Flight Work
1. **Binding Write-Back (High Priority)**
   - Server actions must apply bindings to persist Technology + Triage fields.
   - Regression tests for multi-selects, scores, repeatable groups.
2. **Optimistic Locking**
   - Introduce `rowVersion` checks across API, UI, and schema.
   - Surface conflict resolution UI for end users.
3. **Dictionary & Validator Expansion**
   - Add Viability and calculated metrics to catalog.
   - Automate `scripts/util/attach-dictionary-keys.ts` in CI/deployment.
4. **Persona Enforcement**
   - Finalize persona taxonomy and integrate into template visibility and API guards.

## Near-Term Architectural Enhancements
- **Calculated Metrics Service**
  - Pure functions for metrics (e.g., overall score).
  - Background job/nightly recompute support.
- **Stage Locking & Concurrency**
  - Optional `StageLock` table or Redis-based lease for edit warnings.
  - UI banners and diff views on conflict.
- **Refactor Milestones**
  - Shared form schema module (Zod) – foundation for validation and server actions.
  - `useTriageForm` hook/provider – centralize navigation, autosave, dirty tracking.
  - Modular sections – competitor tables, scoring widgets as reusable components.
  - Scoring utilities – pure functions consumable by UI, exports, APIs.
  - Server actions – integrate schema validation, typed results, better error surfaces.

See detailed steps in [Refactor Execution – Incremental Steps](./architecture/refactor/triage-form-refactor-incremental-plan.md).

## Future-State Vision
- **Multi-Stage Coverage** – Triage + Viability live, Commercial ready to add via templates.
- **Persona Dashboards** – Filtered read/write surfaces backed by the same Technology aggregate.
- **Automated Analytics** – Calculated metrics drive dashboards and alerts (export/BI integration).
- **Managed Secrets** – Key Vault + managed identity once RBAC clears.
- **Workflow Automation** – Stage transitions enforced via state machine; notifications on events.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Binding write-back complexity introduces regressions | Add automated tests; deploy behind feature flag if needed |
| Persona enforcement delayed by auth gaps | Keep feature toggled until NextAuth/SSO timeline confirmed |
| Catalog drift from manual edits | Enforce validator in CI, attach script as deployment prerequisite |
| Backup automation fails silently | Windows task logs; future alerting (export count checks) |

## Reference Docs
- [Technology Multi-Form Master Plan](./TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md)
- [Refactor Plan (technical)](./architecture/refactor/triage-form-refactor-plan.md)
- [Refactor Overview (plain English)](./architecture/refactor/triage-form-refactor-plain-english.md)
- [Technology Multi-Form Test Results](./TECHNOLOGY_MULTI_FORM_TEST_RESULTS.md)
