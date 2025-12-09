# Refactoring Status: Shared Answer Architecture

## Current State Summary

The project is transitioning to a **Shared Answer Architecture** where answers belong to technologies, not form submissions.

**Core principle:** One technology, many forms, shared answers.

---

## ✅ What's DONE

### Phase 1: Legacy Cleanup & Performance ✅ COMPLETE (Dec 2, 2025)

**Migration Applied:** `20251202_cleanup_legacy_add_indexes`

**Legacy Tables Dropped:**
- `TriageForm` - ✅ Removed
- `Competitor` - ✅ Removed
- `SubjectMatterExpert` - ✅ Removed

**Performance Indexes Added (8 total):**
- `FormSection`: `@@index([templateId])`
- `FormQuestion`: `@@index([sectionId])`, `@@index([fieldCode])`, `@@index([dictionaryKey])`
- `QuestionResponse`: `@@index([submissionId])`, `@@index([questionCode])`, `@@index([questionRevisionId])`
- `RepeatableGroupResponse`: `@@index([submissionId])`

**CI Enhancement:** `npm run catalog:validate` in pipeline

**Schema Impact:** 21 models, 468 lines (down from 24 models, 545 lines)

---

## 🚧 Phase 2: Shared Answer Architecture (CURRENT)

### Goal
Answers are stored as **(techID + questionKey) = value**, not per form submission.

When a user answers "What color is it?" → "Red" for TECH-2025-042, that answer appears in ALL forms containing that question when viewing TECH-2025-042.

### Architecture Document
See: `docs/architecture/shared-answer-architecture.md`

### Schema Changes Required

#### Step 2.1: Add TechnologyAnswer Model
```prisma
model TechnologyAnswer {
  id           String   @id @default(cuid())
  technologyId String
  questionKey  String   // References QuestionDictionary.key
  value        Json     // Flexible storage for any response type
  answeredAt   DateTime @default(now())
  answeredBy   String
  revisionId   String?  // Which QuestionRevision was active when answered

  technology Technology         @relation(fields: [technologyId], references: [id], onDelete: Cascade)
  dictionary QuestionDictionary @relation(fields: [questionKey], references: [key])
  revision   QuestionRevision?  @relation(fields: [revisionId], references: [id], onDelete: SetNull)

  @@unique([technologyId, questionKey])  // One answer per question per technology
  @@index([technologyId])
  @@index([questionKey])
  @@map("technology_answers")
}
```

#### Step 2.2: Link FormSubmission to Technology
```prisma
model FormSubmission {
  // ... existing fields ...
  technologyId String?  // Optional during transition, required later

  technology Technology? @relation(fields: [technologyId], references: [id])
}
```

#### Step 2.3: Update Relations
- Add `answers TechnologyAnswer[]` to `Technology`
- Add `answers TechnologyAnswer[]` to `QuestionDictionary`
- Add `answers TechnologyAnswer[]` to `QuestionRevision`
- Add `submissions FormSubmission[]` to `Technology`

### Implementation Steps

1. **Schema migration** - Add new models/fields (non-breaking)
2. **Make dictionaryKey required** - All FormQuestion must have a key
3. **Data migration** - Convert existing QuestionResponse to TechnologyAnswer
4. **Application update** - Form runtime reads/writes TechnologyAnswer
5. **Pre-population** - Forms show existing answers for the techID

### Backward Compatibility
- Keep `QuestionResponse` during transition
- `FormSubmission.technologyId` starts optional
- Gradual migration of existing data

---

## 📋 Phase 3: Question Library UI (NOT STARTED)

Depends on Phase 2 completion.

- Question picker in form builder
- Stale detection UI banner
- "Import from history" drawer
- Pre-populated answers across forms

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Schema | `prisma/schema.prisma` |
| Architecture doc | `docs/architecture/shared-answer-architecture.md` |
| Session handoff | `docs/SESSION_HANDOFF_2025-12-02.md` |
| Attach keys script | `scripts/util/attach-dictionary-keys.ts` |
| Stale detection | `src/lib/technology/answer-status.ts` |
| CI workflow | `.github/workflows/ci.yml` |

---

## Risk Assessment

### Phase 2 Risks
- **Medium risk**: Schema changes affect core data model
- **Mitigation**: Non-breaking additions first, then gradual migration
- **Rollback**: Can keep both models running in parallel

### Data Migration Risks
- **Medium risk**: Determining technologyId for existing responses
- **Mitigation**: Use binding metadata where available, manual mapping otherwise
- **Validation**: Compare counts before/after migration
