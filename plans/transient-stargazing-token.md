# Time-Lock Snapshot Implementation Plan

## Goal

Add immutable time-lock snapshots to form submissions. When a user clicks "Submit" at a stage gate (Triage, Viability), the system captures a frozen point-in-time record of all form answers and Technology metadata for historical reference.

## Architecture

```
Live Answers (TechnologyAnswer)    ←── Always the latest, evolving
         │
         │ User clicks Submit
         ▼
Frozen Snapshot (SubmissionSnapshot) ←── Immutable historical record
         │
         └── formAnswers: all responses at that moment
         └── technologyMeta: techId, reviewer, stage, scores
         └── calculatedScores: impact, value, recommendation
```

## Schema Changes

### New Model: `SubmissionSnapshot`

Add to `prisma/schema.prisma`:

```prisma
model SubmissionSnapshot {
  id             String       @id @default(cuid())
  submissionId   String
  technologyId   String?
  snapshotType   SnapshotType @default(SUBMISSION)
  capturedAt     DateTime     @default(now())
  capturedBy     String

  // Frozen data (denormalized for immutability)
  formAnswers      Json    // { responses, repeatGroups, questionRevisions }
  technologyMeta   Json?   // { techId, technologyName, reviewer, stage, scores, triageStage?, viabilityStage? }
  calculatedScores Json?   // { impactScore, valueScore, recommendation }

  // Template tracking
  templateId      String
  templateVersion String

  submission   FormSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  technology   Technology?    @relation(fields: [technologyId], references: [id], onDelete: SetNull)

  @@index([submissionId])
  @@index([technologyId])
  @@index([capturedAt])
  @@map("submission_snapshots")
}

enum SnapshotType {
  SUBMISSION   // Captured on Submit button
  STAGE_GATE   // Captured at stage transition (future)
}
```

### Add Relations

```prisma
// In FormSubmission model:
snapshots    SubmissionSnapshot[]

// In Technology model:
snapshots    SubmissionSnapshot[]
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/snapshots/types.ts` | TypeScript interfaces for snapshot data |
| `src/lib/snapshots/capture.ts` | `captureSubmissionSnapshot()` service function |
| `src/app/dynamic-form/submissions/[submissionId]/snapshot/page.tsx` | Read-only snapshot viewer |

---

## Files to Modify

### 1. `prisma/schema.prisma`
- Add `SubmissionSnapshot` model
- Add `SnapshotType` enum
- Add `snapshots` relation to `FormSubmission` and `Technology`

### 2. `src/app/dynamic-form/actions.ts`

**In `submitFormResponse()` (after line ~100):**
```typescript
// After binding writes succeed:
if (submission.status === SubmissionStatus.SUBMITTED) {
  await captureSubmissionSnapshot({
    submissionId: submission.id,
    templateId: payload.templateId,
    responses: payload.responses,
    repeatGroups: payload.repeatGroups,
    calculatedScores: payload.calculatedScores,
    technologyId: submission.technologyId,
    capturedBy: resolvedUser,
    bindingMetadata,
  });
}
```

**Add new server actions:**
- `getSnapshotDetail(snapshotId)` - fetch snapshot for viewing
- `getSubmissionSnapshots(submissionId)` - list snapshots for a submission

### 3. `src/app/dynamic-form/submissions/[submissionId]/page.tsx`
- Add "Snapshot History" section showing list of snapshots
- Link to snapshot viewer page

### 4. `src/app/dynamic-form/submissions/page.tsx` (optional)
- Show indicator if submission has a snapshot

---

## Implementation Sequence

1. **Schema migration** (~5 min)
   - Add SubmissionSnapshot model and enum to schema.prisma
   - Add relations to FormSubmission and Technology
   - Run `npx prisma migrate dev --name add_submission_snapshots`

2. **Type definitions** (~10 min)
   - Create `src/lib/snapshots/types.ts`
   - Define `SnapshotFormAnswers`, `SnapshotTechnologyMeta`, `SnapshotCalculatedScores`

3. **Capture service** (~25 min)
   - Create `src/lib/snapshots/capture.ts`
   - Implement `captureSubmissionSnapshot()` function
   - Fetch Technology + Stage data for metadata capture
   - Non-blocking (wrap in try/catch so submission succeeds even if snapshot fails)

4. **Integrate into submit flow** (~10 min)
   - Import capture function in actions.ts
   - Call after successful submission

5. **Server actions for retrieval** (~15 min)
   - Add `getSnapshotDetail()` to actions.ts
   - Add `getSubmissionSnapshots()` to actions.ts

6. **Snapshot viewer page** (~30 min)
   - Create read-only page at `submissions/[submissionId]/snapshot/page.tsx`
   - Reuse existing rendering components
   - Add "HISTORICAL SNAPSHOT - [date]" banner
   - Display technologyMeta in header

7. **Update submission detail** (~15 min)
   - Add snapshot history section to submission detail page
   - Show capturedAt, capturedBy, link to view

8. **Testing** (~20 min)
   - Submit a form, verify snapshot created
   - View snapshot, verify data matches
   - View old submission without snapshot (graceful handling)

---

## Key Design Decisions

1. **Snapshot is non-blocking**: If capture fails, submission still succeeds (log error)
2. **Denormalized storage**: JSON blobs for immutability and simple retrieval
3. **No migration required**: Existing submissions display "No snapshot available" message
4. **Reuse rendering**: Snapshot viewer uses same components as submission detail, read-only mode

---

## Data Captured in Snapshot

### `formAnswers` JSON
```typescript
{
  responses: Record<string, unknown>,      // All question responses
  repeatGroups: Record<string, unknown[]>, // All data tables
  questionRevisions: Record<string, string | null>  // Revision IDs at capture time
}
```

### `technologyMeta` JSON
```typescript
{
  techId: string,
  technologyName: string,
  inventorName: string,
  reviewerName: string,
  domainAssetClass: string,
  currentStage: TechStage,
  rowVersions: { technology, triageStage?, viabilityStage? },
  triageStage?: {
    missionAlignmentScore, missionAlignmentText,
    unmetNeedScore, unmetNeedText,
    impactScore, valueScore,
    recommendation, recommendationNotes
  },
  viabilityStage?: { ... }
}
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Submit fails mid-transaction | No snapshot (transaction rolls back) |
| Snapshot capture fails | Log error, submission succeeds |
| Technology deleted later | `technologyMeta` JSON preserved, relation nulled |
| Old submission without snapshot | Show "Historical snapshot unavailable" banner |
