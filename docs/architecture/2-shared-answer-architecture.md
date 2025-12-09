# Shared Answer Architecture

## Overarching Goal

**One technology, many forms, shared answers.**

When evaluating an invention (identified by `techID`), users fill out various form templates (Triage, Viability, etc.). Each form contains questions pulled from a central Question Library. Once a question is answered for a specific techID, that answer is **shared across all forms** that include the same question.

This eliminates duplicate data entry and ensures consistency: if "What color is it?" is answered "Red" for TECH-2025-042, every form containing that question shows "Red" when viewing TECH-2025-042.

---

## Core Concepts

### Technology (techID)
The **subject being evaluated** - an invention, medical device, or innovation. Identified by a unique `techID` (e.g., "TECH-2025-042"). This is the anchor for all collected facts.

### Question Library (QuestionDictionary)
A registry of **reusable questions**, each with a stable `key`:
- `color` - "What color is it?"
- `unmet_need` - "What unmet clinical need does this address?"
- `inventor_name` - "Who is the inventor?"

Questions have versions (QuestionRevision) for tracking changes over time.

### Form Templates
**Assembled views** that pull questions from the library. Different templates evaluate different aspects:
- Triage Form: 20 questions about initial assessment
- Viability Form: 30 questions about technical/commercial feasibility
- Some questions overlap across templates

### Answers
Stored as **(techID + questionKey) = value**, NOT per form submission.

When a user:
1. Opens a Triage form for TECH-2025-042
2. Answers "What color is it?" → "Red"

That answer is stored as: `(TECH-2025-042, color) = "Red"`

Any other form containing the `color` question, when opened for TECH-2025-042, shows "Red" pre-populated.

---

## Data Flow

```
User opens Form Template "Triage v2" for techID "TECH-2025-042"
                    ↓
System looks up: which questions are in "Triage v2"?
                    ↓
For each question, system queries:
    SELECT value FROM answers
    WHERE techId = "TECH-2025-042"
    AND questionKey = <this question's key>
                    ↓
Form renders with existing answers pre-populated
                    ↓
User modifies/adds answers → saves
                    ↓
System upserts: (techID, questionKey) → new value
```

---

## Key Architectural Decisions

### 1. Answers Belong to Technologies, Not Form Submissions
The current schema stores `QuestionResponse` under `FormSubmission`. The target architecture stores answers keyed by `(technologyId, questionKey)`.

### 2. Form Submissions Become Sessions/Views
A `FormSubmission` represents a **session** where a user worked on a particular form template for a particular technology. It tracks:
- Which template was used
- When it was accessed
- Who accessed it
- Submission status (draft/submitted/reviewed)

But the actual answers live in the shared answer pool.

### 3. Question Keys Are Stable Identifiers
The `dictionaryKey` (questionKey) is the canonical identifier that links:
- The question definition in `QuestionDictionary`
- The question instance in `FormQuestion`
- The answer in the shared answer pool

This key never changes, even if the question text is updated.

### 4. Stale Answer Detection
When a question's definition changes (new revision), existing answers are flagged as "stale" - they were answered under an older version. The UI can prompt users to review/update stale answers.

---

## Schema Evolution Required

### Current State
```
FormSubmission (1) ──→ (N) QuestionResponse
     │
     └── templateId, submittedBy, status
```

### Target State
```
Technology (1) ──→ (N) TechnologyAnswer
     │                      │
     │                      └── questionKey, value, answeredAt, answeredBy
     │
     └── techId, technologyName, ...

FormSubmission ──→ Technology (links session to subject)
     │
     └── templateId, technologyId, submittedBy, status
```

### Key Changes
1. **New model**: `TechnologyAnswer` - stores (technologyId, questionKey) → value
2. **Modified**: `FormSubmission` gains `technologyId` FK to link session to subject
3. **Deprecated**: `QuestionResponse.submissionId` - answers no longer belong to submissions
4. **Migration**: Existing `QuestionResponse` data migrates to `TechnologyAnswer`

---

## Benefits

1. **No duplicate entry** - Answer once, see everywhere
2. **Consistency** - Single source of truth for each fact about a technology
3. **Flexible form design** - Mix and match questions freely
4. **Historical tracking** - Know which revision of a question was active when answered
5. **Stale detection** - Alert users when questions have been updated since they answered

---

## Migration Strategy

### Phase 1: Schema Addition (Non-Breaking)
- Add `TechnologyAnswer` model
- Add `technologyId` to `FormSubmission`
- Keep existing `QuestionResponse` for backward compatibility

### Phase 2: Data Migration
- For each `QuestionResponse`, create corresponding `TechnologyAnswer`
- Determine `technologyId` from submission context or binding

### Phase 3: Application Update
- Update form runtime to read/write from `TechnologyAnswer`
- Update form rendering to pre-populate from shared answers
- Keep `QuestionResponse` as audit/history (optional)

### Phase 4: Cleanup
- Mark `QuestionResponse` as deprecated
- Consider archiving or dropping after transition period
