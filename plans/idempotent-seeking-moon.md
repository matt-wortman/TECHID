# Question Library Management Page - Implementation Plan

## Overview
Create a new page at `/dynamic-form/library` to view, manage, and add questions in the QuestionDictionary. **Reuses existing form builder components** for visual editing.

## User Requirements
- ✅ Full CRUD from start (create, edit, delete)
- ✅ Visual form builder for options/validation (reuse `FieldConfigModal`)
- ✅ Track revisions with QuestionRevision on edits
- ✅ Main nav bar placement

## Existing Components to Reuse

### From Form Builder
| Component | File | Reuse For |
|-----------|------|-----------|
| `FieldConfigModal` | `src/components/form-builder/FieldConfigModal.tsx` | Edit question options, validation, repeatable config |
| `FieldSelectorModal` | `src/components/form-builder/FieldSelectorModal.tsx` | Select field type when creating new question |
| `FIELD_TYPE_CONFIG` | `src/lib/form-builder/field-type-config.ts` | Field type metadata and icons |
| `slugify`, `newOption` | `FieldConfigModal.tsx` | Generate value slugs from labels |

### Design System (match existing pages)
- **Background:** `#e0e5ec` (neumorphic light)
- **Inner card:** `bg-white border-0 rounded-3xl [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)]`
- **Max width:** `max-w-5xl`

## QuestionDictionary Fields

| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| `key` | String | Create-only | Semantic identifier (e.g., `triage.missionAlignmentScore`) |
| `label` | String | Yes | Display label |
| `helpText` | String? | Yes | Optional guidance |
| `options` | JSON? | Yes | For select/multi-select types (via FieldConfigModal) |
| `validation` | JSON? | Yes | Validation rules |
| `bindingPath` | String | Yes | Entity field path |
| `dataSource` | Enum | Yes | TECHNOLOGY, STAGE_SUPPLEMENT, CALCULATED |

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Nav: Home | New Form | Builder | Submissions | Library  │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Question Library                                     │ │
│ │ Manage canonical questions for form templates        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Search...] [Filter: DataSource ▼] [+ Add Question] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Table: Key | Label | Type | DataSource | Actions    │ │
│ │ ─────────────────────────────────────────────────── │ │
│ │ tech.techId | Technology ID | TEXT | TECH | Edit ❌ │ │
│ │ triage.score | Mission Score | SCORE | STAGE | ...  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

### New Files
```
src/app/dynamic-form/library/
├── page.tsx              # Main page with table and search
├── actions.ts            # Server actions for CRUD + revision tracking
└── components/
    ├── QuestionTable.tsx      # Data table with actions
    ├── QuestionCreateModal.tsx # Wraps FieldSelectorModal + metadata form
    └── QuestionEditModal.tsx   # Wraps FieldConfigModal + metadata form
```

### Modified Files
```
src/app/dynamic-form/page.tsx           # Add "Library" nav button
src/app/dynamic-form/submissions/page.tsx
src/app/dynamic-form/drafts/page.tsx
src/app/dynamic-form/builder/page.tsx
src/app/dynamic-form/builder/[templateId]/page.tsx
```

## Server Actions

```typescript
// src/app/dynamic-form/library/actions.ts
'use server'

// List all dictionary entries with usage count
export async function getQuestionDictionary(): Promise<{
  success: boolean;
  questions?: QuestionDictionaryWithUsage[];
  error?: string;
}>

// Get single entry by key
export async function getQuestionByKey(key: string): Promise<{
  success: boolean;
  question?: QuestionDictionaryEntry;
  error?: string;
}>

// Create new dictionary entry (creates initial revision)
export async function createQuestion(data: {
  key: string;           // e.g., "triage.newField"
  label: string;
  helpText?: string;
  bindingPath: string;   // e.g., "triageStage.newField"
  dataSource: DataSource;
  fieldType: FieldType;  // Determines if options are needed
  options?: Array<{ label: string; value: string }>;
  validation?: object;
}): Promise<{ success: boolean; error?: string }>

// Update entry (creates new revision, increments version)
export async function updateQuestion(
  key: string,
  data: Partial<CreateQuestionInput>
): Promise<{ success: boolean; error?: string }>

// Delete entry (only if not referenced by any FormQuestion)
export async function deleteQuestion(key: string): Promise<{
  success: boolean;
  error?: string;
}>
```

## Implementation Steps

### Step 1: Create page route and layout
- Create `src/app/dynamic-form/library/page.tsx`
- Add nav structure matching other pages
- Implement loading/error states

### Step 2: Implement server actions
- `getQuestionDictionary()` with usage count via `_count`
- `createQuestion()` with initial QuestionRevision
- `updateQuestion()` with new QuestionRevision + version bump
- `deleteQuestion()` with usage check

### Step 3: Build QuestionTable component
- Columns: Key, Label, Type (with icon), DataSource badge, Actions
- Search filter on key/label
- DataSource dropdown filter
- Edit/Delete action buttons

### Step 4: Build QuestionCreateModal
- Step 1: Select field type (reuse FieldSelectorModal)
- Step 2: Enter metadata (key, bindingPath, dataSource)
- Step 3: Configure options/validation (reuse FieldConfigModal patterns)

### Step 5: Build QuestionEditModal
- Embed FieldConfigModal for options/validation editing
- Add metadata fields (label, helpText, bindingPath, dataSource)
- Key is read-only after creation

### Step 6: Add nav links to all pages
- Add "Library" button with BookOpen icon to nav bars

### Step 7: Type-check and test
- Run `npm run type-check`
- Manual testing of CRUD operations
- Verify revision creation on edits

## Key Patterns from Existing Code

### Options Management (from FieldConfigModal)
```typescript
const [options, setOptions] = useState<OptionState[]>([])

const handleAddOption = () => {
  setOptions((prev) => [...prev, {
    label: '',
    value: '',
    key: crypto.randomUUID()
  }])
}

const handleOptionChange = (index: number, key: keyof OptionState, value: string) => {
  setOptions((prev) => {
    const next = [...prev]
    const item = { ...next[index] }
    if (key === 'label') {
      item.label = value
      item.value = slugify(value)  // Auto-generate
    }
    next[index] = item
    return next
  })
}
```

### Revision Creation Pattern
```typescript
// On update, create new revision and link to dictionary
const revision = await prisma.questionRevision.create({
  data: {
    dictionaryId: dictionary.id,
    questionKey: dictionary.key,
    versionNumber: dictionary.currentVersion + 1,
    label: data.label,
    helpText: data.helpText,
    options: data.options,
    validation: data.validation,
  },
})

await prisma.questionDictionary.update({
  where: { key },
  data: {
    ...updates,
    currentVersion: { increment: 1 },
    currentRevisionId: revision.id,
  },
})
```

---

**Status:** READY FOR IMPLEMENTATION
