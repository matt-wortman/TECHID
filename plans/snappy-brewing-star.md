# TechnologyAnswer Migration Plan

## Executive Summary

Complete the migration from form-centric data storage (`QuestionResponse`) to technology-centric data storage (`TechnologyAnswer`) as described in the "Forms Are Virtual" architecture.

**Current State**: Dual-write (both `QuestionResponse` AND `TechnologyAnswer` are written on save)
**Target State**: Single source of truth (`TechnologyAnswer` only)

---

## Current State Analysis

### Data Models

| Model | Purpose | Current Usage |
|-------|---------|---------------|
| `QuestionResponse` | Stores answers tied to a form submission | Write: Yes, Read: Yes (loadDraftResponse) |
| `RepeatableGroupResponse` | Stores repeatable group data per submission | Write: Yes, Read: Yes |
| `TechnologyAnswer` | Stores answers tied to a technology | Write: Yes, Read: Yes (buildInitialValues) |

### Write Paths (Files That Write QuestionResponse)

1. **`src/app/dynamic-form/actions.ts`**
   - `submitFormResponse()` - lines 73, 231 (delete + create via `createSubmissionData`)
   - `saveDraftResponse()` - lines 315, 327 (delete + create via `createSubmissionData`)
   - `createSubmissionData()` - line 231 (`questionResponse.createMany`)

2. **`src/app/api/form-submissions/route.ts`**
   - `POST` - line 75 (`questionResponse.createMany`)
   - `PUT` - lines 246, 257 (delete + create)

### Write Paths (Files That Write TechnologyAnswer)

1. **`src/lib/technology/service.ts`**
   - `upsertTechnologyAnswers()` - line 764 (`technologyAnswer.upsert`)
   - Called from `applyBindingWrites()` - line 625

**KEY INSIGHT**: Both are already being called! `applyBindingWrites()` is called after `createSubmissionData()` in the actions.ts flow.

### Read Paths

1. **`src/lib/technology/service.ts:buildInitialValues()`** - Reads from `TechnologyAnswer` ✅
2. **`src/app/dynamic-form/actions.ts:loadDraftResponse()`** - Reads from `QuestionResponse` ❌ (needs migration)
3. **`src/app/api/form-submissions/route.ts:GET`** - Reads from `QuestionResponse` ❌ (needs migration)

---

## Migration Phases

### Phase 1: Preparation & Verification
**Goal**: Ensure schema and data are ready for migration

#### 1.1 Verify Schema Constraints
- [ ] Confirm `TechnologyAnswer` has unique constraint on `(technologyId, questionKey)`
- [ ] Confirm `TechnologyAnswer.value` is `Json` type (can store any data including arrays)

**Files**: `prisma/schema.prisma`
**Verification**: `npm run type-check && npx prisma validate`

#### 1.2 Create Data Audit Script
- [ ] Create script to compare QuestionResponse vs TechnologyAnswer data
- [ ] Identify any orphaned QuestionResponse records (no corresponding TechnologyAnswer)

**Files**: `scripts/audit-answer-migration.ts` (new)
**Verification**: Run script, review output

#### 1.3 Add Feature Flag
- [ ] Add `USE_TECHNOLOGY_ANSWER_PRIMARY` environment variable
- [ ] Default to `false` for backward compatibility

**Files**: `.env.example`, `src/lib/config.ts` (if exists, or create)

#### 1.4 Add TechnologyId Requirement Validation
- [ ] Update form submission to require `technologyId`
- [ ] Add validation error if attempting to create draft without technology context
- [ ] Create migration script to handle existing anonymous drafts

**Files**: `src/app/dynamic-form/actions.ts`, `src/lib/validation/form-submission.ts`

---

### Phase 2: Read Path Migration
**Goal**: Make all read paths use TechnologyAnswer

#### 2.1 Update loadDraftResponse
- [ ] Modify to read from `TechnologyAnswer` instead of `QuestionResponse`
- [ ] Handle case where technology doesn't exist yet (new draft)
- [ ] Maintain backward compatibility by falling back to QuestionResponse if needed

**Files**: `src/app/dynamic-form/actions.ts:loadDraftResponse()` (lines 414-494)

**Before**:
```typescript
const submission = await prisma.formSubmission.findFirst({
  include: { responses: true, repeatGroups: true, scores: true }
})
// ... builds responses from submission.responses
```

**After**:
```typescript
const submission = await prisma.formSubmission.findFirst({...})
if (submission.technologyId) {
  // Load from TechnologyAnswer
  const answers = await prisma.technologyAnswer.findMany({
    where: { technologyId: submission.technologyId }
  })
  // Build responses from answers
} else {
  // Fallback to QuestionResponse for legacy drafts
}
```

**Verification**:
- Run existing tests: `npm test -- --testPathPattern="actions"`
- Manual test: Load an existing draft

#### 2.2 Update API Route GET Handler
- [ ] Modify to read from TechnologyAnswer when technologyId is available
- [ ] Add backward compatibility for submissions without technologyId

**Files**: `src/app/api/form-submissions/route.ts:GET` (lines 119-210)

**Verification**: `npm test -- --testPathPattern="form-submissions"`

#### 2.3 Update getSubmissionDetail
- [ ] Modify to prefer TechnologyAnswer over QuestionResponse

**Files**: `src/app/dynamic-form/actions.ts:getSubmissionDetail()` (lines 732-806)

**Verification**: Manual test viewing submission details

---

### Phase 3: Write Path Simplification
**Goal**: Stop writing to QuestionResponse (or make it optional/audit-only)

#### 3.1 Make QuestionResponse Writes Optional
- [ ] Add feature flag check before writing to QuestionResponse
- [ ] When flag enabled, skip QuestionResponse writes entirely

**Files**: `src/app/dynamic-form/actions.ts:createSubmissionData()` (lines 214-268)

**Before**:
```typescript
await tx.questionResponse.createMany({ data: responseEntries })
```

**After**:
```typescript
if (!config.skipLegacyQuestionResponseWrites) {
  await tx.questionResponse.createMany({ data: responseEntries })
}
```

**Verification**:
- Enable flag in test environment
- Submit form, verify TechnologyAnswer written but QuestionResponse skipped
- Load draft, verify data loads correctly from TechnologyAnswer

#### 3.2 Update API Route POST/PUT
- [ ] Add same feature flag check for QuestionResponse writes

**Files**: `src/app/api/form-submissions/route.ts` (lines 28-116, 213-299)

#### 3.3 Add Deprecation Comments
- [ ] Add JSDoc deprecation notices to QuestionResponse-related functions

**Files**:
- `src/app/dynamic-form/actions.ts`
- `src/app/api/form-submissions/route.ts`

---

### Phase 4: Test Updates
**Goal**: Ensure all tests pass with new architecture

#### 4.1 Update Unit Tests
- [ ] Update mocks to reflect new read/write patterns
- [ ] Add tests for TechnologyAnswer read path
- [ ] Add tests for feature flag behavior

**Files**:
- `src/app/dynamic-form/actions.test.ts` (if exists)
- `src/__tests__/dynamic-form/actions.test.ts`
- `src/app/api/form-submissions/route.test.ts`

#### 4.2 Create Integration Tests
- [ ] Test: Submit form → Load draft → Verify TechnologyAnswer used
- [ ] Test: Submit form without technologyId → Verify fallback works
- [ ] Test: Multiple forms, same technology → Verify shared answers

**Files**: `tests/integration/technology-answer-migration.test.ts` (new)

---

### Phase 5: Archive & Cleanup
**Goal**: Archive QuestionResponse data, then remove deprecated code

#### 5.1 Create Archive Table
- [ ] Create `QuestionResponseArchive` table with same schema + `archivedAt` timestamp
- [ ] Create migration to add archive table

**Files**: `prisma/schema.prisma`, `prisma/migrations/YYYYMMDD_create_archive_table/`

#### 5.2 Archive QuestionResponse Data
- [ ] Create script to copy QuestionResponse data to archive table
- [ ] Verify archive data integrity
- [ ] Run archive script in production

**Files**: `scripts/archive-question-responses.ts` (new)

#### 5.3 Remove Feature Flag
- [ ] Remove `skipLegacyQuestionResponseWrites` flag
- [ ] Make TechnologyAnswer the only write path

#### 5.4 Drop QuestionResponse Table (30-60 days after archive)
- [ ] Verify no code references QuestionResponse
- [ ] Create migration to drop `QuestionResponse` and `RepeatableGroupResponse` tables
- [ ] Keep archive table for historical reference

**Files**: `prisma/migrations/YYYYMMDD_drop_question_response/`

---

## Critical Files Reference

| File | Lines | Changes Required |
|------|-------|------------------|
| `src/app/dynamic-form/actions.ts` | 414-494, 214-268, 315-327 | Read/write path changes, technologyId validation |
| `src/lib/technology/service.ts` | 743-787 | Already writes TechnologyAnswer ✓ |
| `src/app/api/form-submissions/route.ts` | 75, 91, 246-257, 119-210 | Read/write path changes |
| `src/lib/validation/form-submission.ts` | - | Add technologyId requirement |
| `prisma/schema.prisma` | 175-189, 443-460 | Add archive table (Phase 5) |

### New Files to Create

| File | Purpose |
|------|---------|
| `scripts/audit-answer-migration.ts` | Compare QuestionResponse vs TechnologyAnswer data |
| `scripts/archive-question-responses.ts` | Archive QuestionResponse data before deletion |
| `tests/integration/technology-answer-migration.test.ts` | Integration tests for shared answers |
| `src/lib/config.ts` | Feature flag configuration (if doesn't exist) |

---

## Verification Commands

```bash
# After each phase:
npm run type-check        # TypeScript validation
npm run lint              # ESLint
npm test                  # All tests
npm run catalog:validate  # Binding validation

# Database verification:
npm run studio            # Inspect data manually
```

---

## Rollback Plan

If issues arise after Phase 3:
1. Set `USE_TECHNOLOGY_ANSWER_PRIMARY=false`
2. QuestionResponse writes will resume
3. Read paths will fall back to QuestionResponse

---

## Success Criteria

- [ ] All forms load answers from TechnologyAnswer
- [ ] Shared answers work across forms (same technology, different forms)
- [ ] No data loss during transition
- [ ] All existing tests pass
- [ ] New integration tests pass
- [ ] Type-check passes
- [ ] Lint passes

---

## Resolved Decisions

1. **QuestionResponse after migration**: Archive then delete
   - Archive QuestionResponse data to separate table after migration verified
   - Delete after transition period (suggest 30-60 days)

2. **Draft handling**: Require technologyId
   - All new drafts must have a technologyId
   - Add validation to prevent creating drafts without technology context
   - Existing anonymous drafts handled via migration script

3. **API route**: Internal only - migrate freely
   - `/api/form-submissions` is internal, can be modified without backward compatibility concerns
   - Update to use TechnologyAnswer directly
