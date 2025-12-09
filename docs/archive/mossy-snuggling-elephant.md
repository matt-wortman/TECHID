# Plan: Complete Form Snapshots + PDF Export

## Goal
Enhance submission snapshots to capture the **complete form structure** (not just answers) so PDFs can be regenerated from snapshots alone, even if the template changes or is deleted.

## Current State
- Snapshots capture: `responses`, `repeatGroups`, `questionRevisions`, `calculatedScores`, `technologyMeta`
- Snapshots **do NOT capture**: sections, questions, options, validation rules, conditional logic
- PDF generation requires a live template lookup from the database

## Target State
- Snapshots capture the **entire form definition** as it existed at submission time
- PDFs can be regenerated from snapshots without database template lookup
- PDF is generated and saved to local filesystem on submit

---

## Implementation Steps

### Step 1: Extend Snapshot Types
**File:** `src/lib/snapshots/types.ts`

Add new interfaces:
```typescript
export interface SnapshotQuestionOption {
  value: string
  label: string
  order: number
}

export interface SnapshotScoringConfig {
  minScore: number
  maxScore: number
  weight: number
  criteria?: unknown
}

export interface SnapshotQuestion {
  id: string
  dictionaryKey: string
  label: string
  type: string  // FieldType enum value
  helpText?: string
  placeholder?: string
  order: number
  isRequired: boolean
  validation?: unknown
  conditional?: unknown
  repeatableConfig?: unknown
  options?: SnapshotQuestionOption[]
  scoringConfig?: SnapshotScoringConfig
}

export interface SnapshotSection {
  id: string
  title: string
  description?: string
  order: number
  questions: SnapshotQuestion[]
}

export interface SnapshotFormStructure {
  templateId: string
  templateName: string
  templateVersion: string
  templateDescription?: string
  sections: SnapshotSection[]
}

// Update existing interface
export interface SnapshotFormAnswers {
  responses: Record<string, unknown>
  repeatGroups: Record<string, Record<string, unknown>[]>
  questionRevisions: Record<string, string | null>
  formStructure: SnapshotFormStructure  // NEW
}
```

### Step 2: Update Snapshot Capture
**File:** `src/lib/snapshots/capture.ts`

Modify `captureSubmissionSnapshot()`:
1. Fetch complete template with sections → questions → options, scoringConfig
2. Serialize the form structure into `SnapshotFormStructure`
3. Include in `formAnswers.formStructure`

Add helper function:
```typescript
async function buildFormStructure(templateId: string): Promise<SnapshotFormStructure>
```

### Step 3: Add PDF Generation on Submit
**Files:**
- `src/lib/snapshots/pdf-export.ts` (new)
- `src/lib/snapshots/capture.ts` (modify)

Create function:
```typescript
export async function generateSnapshotPdf(
  snapshotId: string,
  formAnswers: SnapshotFormAnswers,
  options: { outputDir: string }
): Promise<{ success: boolean; filePath?: string; error?: string }>
```

Flow:
1. Convert `SnapshotFormStructure` → `PrintableFormData` (adapt from serialize.ts)
2. Render using existing `FormPdfDocument`
3. Save to local filesystem: `{outputDir}/{snapshotId}.pdf`

### Step 4: Integrate PDF Export into Submit Flow
**File:** `src/app/dynamic-form/actions.ts`

After `captureSubmissionSnapshot()` succeeds:
1. Call `generateSnapshotPdf()` with the captured snapshot data
2. Store the PDF path in the snapshot record (optional) or just log success
3. Non-blocking: if PDF generation fails, submission still succeeds

### Step 5: Add Snapshot PDF Viewer
**File:** `src/app/dynamic-form/submissions/[submissionId]/snapshot/page.tsx`

Update to:
1. Load snapshot from database
2. Render PDF from `formAnswers.formStructure` (not from live template)
3. Add download link for stored PDF file

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/snapshots/types.ts` | Add SnapshotFormStructure, SnapshotSection, SnapshotQuestion interfaces |
| `src/lib/snapshots/capture.ts` | Add buildFormStructure(), update captureSubmissionSnapshot() |
| `src/lib/snapshots/pdf-export.ts` | NEW: generateSnapshotPdf() function |
| `src/app/dynamic-form/actions.ts` | Call PDF generation after snapshot capture |
| `src/lib/form-engine/pdf/serialize.ts` | Add variant that accepts SnapshotFormStructure (optional refactor) |

---

## Data Size Estimate
- Typical form: 5-10 sections, 30-50 questions
- Serialized JSON: ~50-150 KB per snapshot
- PDF file: ~100-500 KB depending on content

---

## Future Enhancements (Not in this PR)
1. Azure Blob Storage for PDFs (currently local filesystem)
2. Remove section `code` field from schema and UI
3. Snapshot comparison/diff view

---

## Testing Strategy
1. Submit a form, verify snapshot includes `formStructure`
2. Modify the template (rename section, change question)
3. Verify old snapshot still renders correct PDF with original structure
4. Delete template entirely, verify snapshot PDF still works
