# Technology Multi-Form Master Plan

**Purpose:** Unify the technology lifecycle architecture into a single blueprint that covers schema design, reusable question catalog, migration, governance, personas, and rollout strategy. This merges the content of `TECHNOLOGY_LIFECYCLE_ARCHITECTURE.md` and `MULTI_FORM_REUSABLE_ARCHITECTURE.md`, filling gaps around migration detail, APIs, testing, and operations.

**Last Updated:** 2025-10-09

---

## 0. Executive Summary

- `Technology` aggregate is the single source of truth keyed by Tech ID.
- Stage supplements (`TriageStage`, `ViabilityStage`, …) extend Technology without duplicating shared fields.
- A versioned Question Catalog drives every form; templates reference catalog entries and bind to data sources.
- Persona-aware views filter the same data, not copies.
- Migration plan, audit strategy, concurrency safeguards, API design, testing, and rollout are included.

---

## Progress Log

| Date (EST) | Update |
|------------|--------|
| 2025-10-09 | Added Technology core tables, stage supplements, audit history, persona/user models, and catalog scaffolding to Prisma schema (migration `20251009162649_technology_foundation`). |
| 2025-10-09 | Seeded initial question dictionary entries and added `npm run catalog:validate` script to enforce binding paths against registry. |

---

## 1. Domain Architecture

### 1.1 Prisma Schema (Core)

```prisma
model Technology {
  id                String   @id @default(cuid())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  rowVersion        Int      @default(1)

  techId            String   @unique
  technologyName    String
  shortDescription  String?
  inventorName      String
  inventorTitle     String?
  inventorDept      String?
  reviewerName      String
  domainAssetClass  String

  currentStage      TechStage @default(TRIAGE)
  status            TechStatus @default(ACTIVE)
  lastStageTouched  TechStage?
  lastModifiedBy    String?
  lastModifiedAt    DateTime?

  triageStage       TriageStage?
  viabilityStage    ViabilityStage?
  attachments       Attachment[]
  auditLog          TechnologyAuditLog[]

  @@map("technologies")
  @@index([techId])
  @@index([currentStage])
}

enum TechStage { TRIAGE VIABILITY COMMERCIAL MARKET_READY ARCHIVED }
enum TechStatus { ACTIVE ON_HOLD ABANDONED COMPLETED }

model TriageStage {
  id            String   @id @default(cuid())
  technologyId  String   @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  rowVersion    Int      @default(1)

  technologyOverview      String
  missionAlignmentText    String
  missionAlignmentScore   Int    @default(0)
  unmetNeedText           String
  unmetNeedScore          Int    @default(0)
  stateOfArtText          String
  stateOfArtScore         Int    @default(0)
  marketOverview          String
  marketScore             Int    @default(0)
  impactScore             Float  @default(0)
  valueScore              Float  @default(0)
  recommendation          String @default("")

  technology        Technology @relation(fields: [technologyId], references: [id], onDelete: Cascade)
  competitors       TriageCompetitor[]
  experts           TriageSME[]

  @@map("triage_stages")
  @@index([technologyId])
}

model ViabilityStage {
  id            String   @id @default(cuid())
  technologyId  String   @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  rowVersion    Int      @default(1)

  technicalFeasibility    String
  regulatoryPathway       String
  costAnalysis            String
  timeToMarket            Int?
  resourceRequirements    String
  riskAssessment          String
  technicalScore          Float @default(0)
  commercialScore         Float @default(0)
  overallViability        String @default("")

  technology        Technology @relation(fields: [technologyId], references: [id], onDelete: Cascade)

  @@map("viability_stages")
  @@index([technologyId])
}
```

> Future stages follow the same pattern (CommercialStage, MarketStage, etc.).

### 1.2 Shared Audit Metadata
- Technology and stage tables include `updatedAt`/`updatedBy`.
- `TechnologyAuditLog` records each change (field path, old/new values, stage, persona).
- Stage-specific history stored in `StageHistory` (append-only).

```prisma
model StageHistory {
  id            String    @id @default(cuid())
  technologyId  String
  stage         TechStage
  changeType    String    // CREATED, UPDATED, SUBMITTED, PROMOTED, OVERRIDDEN
  snapshot      Json
  changedBy     String
  changedAt     DateTime  @default(now())

  technology    Technology @relation(fields: [technologyId], references: [id], onDelete: Cascade)

  @@index([technologyId, stage])
}

model TechnologyAuditLog {
  id            String   @id @default(cuid())
  technologyId  String
  fieldPath     String
  oldValue      Json?
  newValue      Json?
  stage         TechStage?
  persona       String?
  changedBy     String
  changedAt     DateTime @default(now())

  technology    Technology @relation(fields: [technologyId], references: [id], onDelete: Cascade)

  @@index([technologyId, changedAt])
}
```

### 1.3 User & Persona Relationship

```prisma
model User {
  id         String   @id @default(cuid())
  email      String   @unique
  name       String?
  personas   UserPersona[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Persona {
  id         String   @id @default(cuid())
  code       String   @unique   // tech_manager, inventor, executive, etc.
  label      String
  description String?
  createdAt  DateTime @default(now())
}

model UserPersona {
  id         String   @id @default(cuid())
  userId     String
  personaId  String
  primary    Boolean  @default(false)

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  persona    Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)

  @@unique([userId, personaId])
}
```

- Users may hold multiple personas; `primary` flags the default context.
- Persona assignments drive server-side authorization and template visibility.

---

## 2. Question Catalog & Template System

### 2.1 Dictionary Schema
```prisma
model QuestionDictionary {
  id             String   @id @default(cuid())
  version        String
  key            String   @unique
  label          String
  helpText       String?
  options        Json?
  validation     Json?
  bindingPath    String   // e.g. "technology.inventorName"
  dataSource     DataSource
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum DataSource { TECHNOLOGY STAGE_SUPPLEMENT CALCULATED }
```

- Versioning allows you to freeze catalog entries for existing forms.
- `bindingPath` maps a question to a precise field; stage supplements use paths like `triageStage.marketScore`.

### 2.2 Form Templates
```prisma
model FormTemplate {
  id                String   @id @default(cuid())
  name              String
  stage             TechStage
  version           String
  baseTemplateId    String?  // inheritance
  visibleToPersonas String[]
  personaConfig     Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  questions         FormQuestion[]
}

model FormQuestion {
  id             String   @id @default(cuid())
  templateId     String
  order          Int
  catalogId      String
  dataSource     DataSource
  bindingPath    String
  readOnly       Boolean @default(false)
  section        String?
  personaConfig  Json?
}
```

- Templates can inherit a base (shared) template and append stage-specific questions.
- Persona configs define field visibility/editability per role.

### 2.3 Rendering & Submission
1. Fetch template + dictionary entries; prefill values from `Technology` or supplement via `bindingPath`.
2. Respect `readOnly` and persona rules when presenting fields.
3. On submission:
   - Validate using dictionary rules.
   - Persist stage fields to supplement table.
   - Persist shared fields to `Technology`.
   - Update audit logs and calculated metrics.
   - Apply optimistic locking.

---

### 2.4 Binding Path Validation
- Maintain a registry of allowed binding paths generated from Prisma schema (script checks field existence and type compatibility).
- On catalog creation/update, validate `bindingPath` against registry; reject invalid entries.
- Unit tests cover common paths; CI fails if catalog contains unknown bindings.
- Provide tooling (`npm run catalog:lint`) to validate catalog JSON/CSV before deployment.

---

## 3. Persona Strategy

- Personas (initial set): `tech_manager`, `inventor`, `executive`, `legal`, `finance`.
- Access matrix stored in `personaConfig` (per template) + server-side permissions.
- API layer enforces persona claims; UI relies on metadata for hiding/locking fields.
- Persona dashboards query Technology + supplements; no data duplication.

---

## 4. Workflow Governance

- **Field Locking:** After a stage is submitted, shared fields become read-only in later stages unless an admin override is recorded.
- **Stage Promotion:** Technology cannot advance to next `TechStage` until current stage is submitted/approved.
- **Audit Requirements:** Every update writes a `TechnologyAuditLog` row (who, when, stage, old/new). Retain 7+ years.
- **Override Process:** Admin override requires reason code stored in audit log.

---

## 5. Migration & Backfill Plan

1. **Preparation**
   - Backup production database.
   - Implement Prisma migrations for new tables and fields.
   - Seed QuestionDictionary with existing questions.
2. **Data Extraction**
   - Export current Triage forms; choose authoritative submission per Tech ID.
   - Generate Technology records; populate TriageStage.
   - Map existing FormQuestion entries to dictionary `catalogId` and `bindingPath`.
3. **Collision Handling**
   - Detect conflicting values for shared fields; produce reconciliation report.
   - Resolve manually or apply precedence rules (latest submission wins).
4. **Dry Run**
   - Run migration script on staging; verify counts, sample records, persona views.
   - Run snapshot tests on API responses.
5. **Cutover**
   - Freeze writes (if needed) or enable feature flag to prevent new submissions.
   - Run migrations + scripts.
   - Deploy updated services and UI.
   - Unfreeze writes; monitor logs and health.
6. **Rollback Plan**
   - Restore DB backup and redeploy previous build if anomalies detected.

---

## 6. Service & API Layer

- Implement `TechnologyService` to encapsulate:
  - Creating/updating Technology and supplements.
  - Loading templates with prefills.
  - Applying optimistic locking and audit logging.
  - Recomputing calculated metrics.
- REST/GraphQL endpoints:
  - `GET /technologies/:techId` → core + supplements + metrics.
  - `GET /technologies/:techId/forms/:stage` → template + hydrated answers.
  - `POST /technologies/:techId/forms/:stage` → submit/update stage.
  - Persona claim included in auth token; endpoints enforce edit permissions.
- Non-form data ingestion (documents, metrics) also goes through TechnologyService to maintain consistency.

---

## 7. Calculated & Derived Fields

- Store metric definitions in `CalculatedMetric` table with expressions referencing binding paths.
- Recompute on submission or via background job when dependencies change.
- Cache results in supplement table with `calculatedAt`; audit changes.
- Expression engine: use deterministic DSL (e.g., JSONata-lite or custom evaluator) with static validation of dependencies.
- If dependencies missing, metric evaluates to `null` and logs warning; submission still succeeds.
- Background job re-evaluates metrics nightly to catch external data updates.

---

## 8. Error Handling & Failure Modes

- **Optimistic locking conflict**: respond with HTTP 409, return latest record + diff so UI can merge or refresh.
- **Binding validation failure**: respond with HTTP 400 specifying offending `bindingPath`.
- **Calculated metric error**: log structured error, set metric to `null`, notify monitoring; do not block submission.
- **Partial persistence**: wrap submissions in a transaction; roll back if any write fails to keep Technology and stage tables in sync.
- **Migration script failures**: checkpoint progress, log to file, allow rerun from last checkpoint.
- **External service outages** (e.g., file storage): queue attachment references and retry asynchronously.

---

## 9. Concurrency & Conflict Handling

- Add `rowVersion` (integer) to Technology and stage tables.
- Submission includes `rowVersion`; service rejects stale updates and returns latest values for merge/refresh.
- Optional `StageLock` table for active edits (user, persona, expiration).
- UI warns when another persona is editing the same stage.

---

## 10. Performance & Scalability

- **Indexes**: `Technology.techId`, `Technology.currentStage`, `StageHistory.technologyId`, `QuestionDictionary.key`, `FormQuestion.templateId`.
- **Caching**: cache QuestionDictionary and templates in memory/Redis with version-based invalidation.
- **Batching**: use dataloader pattern for fetching supplements when rendering dashboards.
- **Targets**: initial SLA of <200 ms API response for hydration endpoints, 95th percentile submission under 500 ms.
- **Capacity planning**: estimate growth (technologies/year) and set alert thresholds on DB CPU >70%, storage >80%.
- **Archival**: plan quarterly archival job to move StageHistory older than 3 years into cold storage if required.

---

## 11. Security & Compliance

- Shared fields editable only by roles in persona matrix; enforce server-side.
- Audit log + StageHistory provide traceability.
- Consider migrating secrets (DB passwords, API keys) to Key Vault with managed identity when available.
- Log personally identifiable information (PII) access per compliance standards.

---

## 12. Testing & Quality

### 10.1 Automated Tests
- Unit: dictionary binding resolution, optimistic locking, calculated metrics.
- Integration: Full triage submission flow → viability flow → persona read.
- Regression: Compare API responses pre/post migration for sampled Tech IDs.
- UI: Snapshot tests for stage forms by persona.

### 10.2 Seed & Fixtures
- Seed script to create representative Technology with triage/viability data and attachments.
- Provide persona demo accounts for QA (shared auth until SSO available).

### 10.3 Monitoring
- Add application metrics (submission counts, audit entries, error rates).
- Log diff errors or migration anomalies to observability stack.

### 10.4 Coverage Targets
- Unit test coverage ≥ 80% for catalog binding utilities and service layer.
- Integration tests covering at least one full happy-path and failure-path per stage.
- UI automated tests covering all persona permutations for core sections.
- Performance smoke tests run nightly with sample load to ensure SLA compliance.

---

## 13. UI/UX Guidelines

- **Visual Indicators**: lock icon + muted style for read-only fields; badge (“From Triage”) for prefilled shared values.
- **Conflict Messaging**: show diff modal when 409 received; allow user to accept server version or reapply edits.
- **Edit Warnings**: banner when `StageLock` indicates another editor; show editor name and time acquired.
- **Autosave**: save drafts every 30 seconds and on navigation; display timestamp of last save.
- **Hidden Sections**: persona-invisible sections are not rendered (security through absence, not disabling).
- **Error Feedback**: toast + inline errors describing binding validation or metric problems with support link.
- **Override Workflow**: provide “Request override” button on locked shared fields to trigger admin workflow.

---

## 14. Implementation Roadmap

1. **Foundation**
   - Create tables, catalog, binding fields.
   - Write migration + seeding scripts; dry-run in staging.
2. **Form Engine Refinement**
   - Update renderer & submission pipeline with binding paths, optimistic locking, prefill.
   - Convert triage template to dictionary-based form.
3. **Persona Enablement**
   - Define persona matrix, update API auth, configure UI visibility.
   - Build persona dashboards.
4. **Stage Expansion**
   - Implement Viability template with prefilled triage data.
   - Provide “Create Viability from Tech ID” flow.
5. **Enhancements**
   - Calculated metrics service.
   - Admin tools for audit review and overrides.
   - Documentation + runbooks.

---

## 15. Governance & Future Enhancements

- **Workflow engine**: eventually replace manual stage locking with state machine.
- **Notifications**: email/Teams alerts on stage progression, overdue reviews.
- **Bulk import/export**: Excel uploads, integration with patent/market systems.
- **SSO/NextAuth**: move from shared basic auth to enterprise authentication.
- **Reporting**: integrate with BI layer for dashboards across technologies.

---

## 16. Open Decisions

- Finalize persona taxonomy (codes, display names) and owner for persona lifecycle.
- Select catalog versioning scheme (semantic `v1.1` vs. timestamp hash) and change management process.
- Choose expression engine/library for calculated metrics (evaluate JSONata, expr-eval, custom DSL).
- Confirm production hosting approach for StageLock (DB table vs. Redis).
- Establish SSO/identity timeline (NextAuth prototype vs. direct Entra ID integration).
- Plan Key Vault rollout and managed identity usage for secrets.

---

## 17. Appendices

### 14.1 Migration Checklist (Detailed)
- **Pre**: backup, staging dry-run, downtime communication.
- **During**: run schema migration, data script, verification queries.
- **Post**: smoke tests, monitor logs 48h, document outcomes.

### 14.2 Sample Persona Config
```json
{
  "tech_manager": { "canEditShared": true, "canEditStage": true },
  "inventor":     { "canEditShared": false, "canEditStage": true, "sections": ["technical"] },
  "executive":    { "canEditShared": false, "sections": ["summary", "scores"], "readOnly": true }
}
```

### 14.3 Sample Calculated Metric Definition
```json
{
  "key": "overallScore",
  "expression": "average(triageStage.impactScore, viabilityStage.technicalScore)",
  "dependsOn": [
    "triageStage.impactScore",
    "viabilityStage.technicalScore"
  ]
}
```

---

With this master plan, engineering can split the work into actionable epics: schema migration, catalog tooling, form engine updates, persona enforcement, and rollout. It consolidates the original architecture vision and the reusable-form strategy while closing operational gaps.
