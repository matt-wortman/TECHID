# Tech Triage Platform - Technical Manual

**Version:** 1.0
**Last Updated:** December 8, 2025
**Platform:** Next.js 15 with Turbopack, PostgreSQL, Prisma ORM

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Data Binding System](#data-binding-system)
5. [Technology Lifecycle Management](#technology-lifecycle-management)
6. [Form Engine Architecture](#form-engine-architecture)
7. [Database Schema & Models](#database-schema--models)
8. [Server Actions & Data Flow](#server-actions--data-flow)
9. [Snapshot System](#snapshot-system)
10. [Answer Status & Versioning](#answer-status--versioning)
11. [Validation & Conditional Logic](#validation--conditional-logic)
12. [Optimistic Locking](#optimistic-locking)
13. [Development Workflow](#development-workflow)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Architecture](#deployment-architecture)
16. [Troubleshooting Guide](#troubleshooting-guide)
17. [Appendices](#appendices)

---

## Executive Summary

The Tech Triage Platform is a Next.js 15 application designed to evaluate and track technology commercialization through a multi-stage workflow. Technologies progress through distinct lifecycle stages (TRIAGE → VIABILITY → COMMERCIAL → MARKET_READY), with each stage capturing stage-specific data through dynamic form-based assessments.

### Key Architectural Highlights

- **"Forms Are Virtual" Architecture**: Answers belong to technologies, not form submissions. Storage pattern: `(techId + questionKey) = value`
- **TechnologyAnswer as Single Source of Truth**: All form answers stored in `TechnologyAnswer` table, keyed by `(techId + questionKey)`
- **Question Dictionary Pattern**: Semantic keys (e.g., `triage.missionAlignmentScore`) bind form fields to database entities via binding paths (e.g., `triageStage.missionAlignmentScore`)
- **Stage-Specific Data Storage**: Dedicated tables (TriageStage, ViabilityStage) with JSON `extendedData` columns for dynamic fields
- **Versioned Answer Tracking**: All form responses linked to question revisions for audit trails and freshness detection
- **Immutable Snapshots**: Point-in-time captures of form submissions for historical reference
- **Optimistic Locking**: Row version fields prevent concurrent modification conflicts

### Target Audience

- **Backend Developers**: Understanding data flow and binding writes
- **Frontend Developers**: Form engine integration and component architecture
- **System Architects**: Overall system design and scaling considerations
- **DevOps Engineers**: Deployment, monitoring, and operational concerns

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Next.js 15 Application                      │
│                        (Turbopack + React 19)                        │
├─────────────────────────────────────────────────────────────────────┤
│  Presentation Layer                                                  │
│  ├─ Dynamic Form Renderer (src/lib/form-engine/renderer.tsx)        │
│  ├─ Form Builder UI (src/components/form-builder/)                  │
│  └─ Navigation & Workflow Components                                │
├─────────────────────────────────────────────────────────────────────┤
│  Server Actions Layer (Next.js Server Actions)                       │
│  ├─ submitFormResponse() - Form submission                          │
│  ├─ saveDraftResponse() - Draft persistence                         │
│  ├─ loadDraftResponse() - Draft retrieval                           │
│  └─ applyBindingWrites() - Core binding write logic                 │
├─────────────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                                │
│  ├─ Technology Service (src/lib/technology/service.ts)              │
│  │   ├─ loadTemplateWithBindings() - Template hydration             │
│  │   ├─ applyBindingWrites() - Write to Technology/Stage tables    │
│  │   └─ collectBindingMetadata() - Extract binding paths           │
│  ├─ Form Engine (src/lib/form-engine/)                              │
│  │   ├─ Validation (validation.ts)                                 │
│  │   ├─ Conditional Logic (conditional-logic.ts)                   │
│  │   └─ Field Mappings (field-mappings-simple.ts)                  │
│  └─ Snapshot System (src/lib/snapshots/capture.ts)                  │
├─────────────────────────────────────────────────────────────────────┤
│  Data Access Layer (Prisma ORM)                                      │
│  └─ src/lib/prisma.ts - Singleton Prisma client                     │
├─────────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                                 │
│  ├─ Technology Entities (Technology, TriageStage, ViabilityStage)   │
│  ├─ Form System (FormTemplate, FormQuestion)                        │
│  ├─ Answer Storage (TechnologyAnswer)                               │
│  ├─ Question Dictionary (QuestionDictionary, QuestionRevision)      │
│  └─ Snapshots (SubmissionSnapshot)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 + React 19 | Server-side rendering, routing |
| **Build Tool** | Turbopack | Fast development builds |
| **Styling** | Tailwind CSS v4 | Utility-first styling |
| **UI Components** | Radix UI | Accessible component primitives |
| **Forms** | React Hook Form + Zod | Client-side form state and validation |
| **Database** | PostgreSQL | Relational data storage |
| **ORM** | Prisma 6.x | Type-safe database access |
| **Authentication** | Basic Auth (middleware) | Simple HTTP authentication |
| **Runtime** | Node.js 20.18.x | Server runtime |

---

## Core Concepts

### 1. Question Dictionary Pattern

The Question Dictionary is the **central abstraction** that decouples form questions from database storage.

#### Problem Solved
- Forms need to evolve without breaking existing data
- Multiple forms may bind to the same underlying fields
- Database schema changes should not cascade to all forms

#### How It Works

```typescript
// Question Dictionary Entry (prisma/seed/question-dictionary.ts)
{
  key: "triage.missionAlignmentScore",        // Semantic identifier
  label: "Mission Alignment Score",
  helpText: "Numeric score representing mission alignment evaluation.",
  bindingPath: "triageStage.missionAlignmentScore",  // Database path
  dataSource: DataSource.STAGE_SUPPLEMENT      // Storage location
}
```

**Key Components:**
- **key**: Semantic identifier used throughout the application (e.g., `triage.missionAlignmentScore`)
- **bindingPath**: Dot-notation path to the database field (e.g., `triageStage.missionAlignmentScore`)
- **dataSource**: Where the data lives (`TECHNOLOGY`, `STAGE_SUPPLEMENT`, or `CALCULATED`)

#### Data Sources Explained

```typescript
enum DataSource {
  TECHNOLOGY       // Core Technology table fields
  STAGE_SUPPLEMENT // Stage-specific tables (TriageStage, ViabilityStage)
  CALCULATED       // Computed values not directly stored
}
```

**Example Binding Paths:**

| Dictionary Key | Binding Path | Data Source | Stored In |
|----------------|-------------|-------------|-----------|
| `tech.techId` | `technology.techId` | TECHNOLOGY | Technology.techId |
| `triage.missionAlignmentScore` | `triageStage.missionAlignmentScore` | STAGE_SUPPLEMENT | TriageStage.missionAlignmentScore |
| `triage.targetUsers` | `triageStage.extendedData.targetUsers` | STAGE_SUPPLEMENT | TriageStage.extendedData JSON |
| `triage.valueScore` | `triageStage.valueScore` | CALCULATED | TriageStage.valueScore (computed) |

### 2. Response Keying Strategy

**All form responses are keyed by `dictionaryKey`, never by question ID.**

```typescript
// ❌ WRONG - Don't key by question ID
const responses = {
  "question_abc123": "Some value"
};

// ✅ CORRECT - Key by dictionaryKey
const responses = {
  "triage.missionAlignmentScore": 3
};
```

**Why?**
- Question IDs change when forms are rebuilt
- Dictionary keys remain stable across form versions
- Enables form-agnostic data storage

### 3. Binding Metadata

At runtime, the system resolves dictionary entries to actual database fields:

```typescript
interface BindingMetadata {
  questionId: string;              // Form question ID
  dictionaryKey: string;           // Semantic key (e.g., "triage.missionAlignmentScore")
  bindingPath: string;             // Database path (e.g., "triageStage.missionAlignmentScore")
  dataSource: DataSource;          // Where data is stored
  dictionaryId?: string;           // Dictionary entry ID
  currentRevisionId?: string | null; // Current revision for versioning
  currentVersion?: number | null;  // Current version number
}
```

**Generated during template hydration:**

```typescript
// src/lib/technology/service.ts:188
export function collectBindingMetadata(
  template: FormTemplateWithSections
): Record<string, BindingMetadata> {
  const bindings: Record<string, BindingMetadata> = {};

  for (const section of template.sections) {
    for (const question of section.questions) {
      if (!question.dictionary || !question.dictionaryKey) {
        continue;
      }

      bindings[question.dictionaryKey] = {
        questionId: question.id,
        dictionaryKey: question.dictionaryKey,
        bindingPath: question.dictionary.bindingPath,
        dataSource: question.dictionary.dataSource,
        dictionaryId: question.dictionary.id,
        currentRevisionId: question.dictionary.currentRevisionId,
        currentVersion: question.dictionary.currentVersion,
      };
    }
  }

  return bindings;
}
```

---

## Data Binding System

The binding system is the **core mechanism** for writing form responses to database entities.

### Data Flow: Form Response → Database

```
┌─────────────────────┐
│ User fills out form │
│ (responses keyed by │
│  dictionaryKey)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ submitFormResponse()                │
│ - Validates payload                 │
│ - Fetches binding metadata          │
│ - Starts database transaction       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ applyBindingWrites()                │
│ 1. Extract binding values           │
│ 2. Partition by entity              │
│ 3. Build extended data updates      │
│ 4. Upsert Technology record         │
│ 5. Upsert TriageStage record        │
│ 6. Upsert ViabilityStage record     │
│ 7. Upsert TechnologyAnswer records  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ PostgreSQL Database                 │
│ - Technology table updated          │
│ - Stage tables updated              │
│ - TechnologyAnswer records created  │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ captureSubmissionSnapshot()         │
│ - Creates immutable snapshot        │
└─────────────────────────────────────┘
```

### Step 1: Extract Binding Values

```typescript
// src/lib/technology/service.ts:644
export function extractBindingValues(
  bindingMetadata: Record<string, BindingMetadata>,
  responses: Record<string, unknown>
) {
  const values: Record<string, unknown> = {};

  for (const meta of Object.values(bindingMetadata)) {
    // Use dictionaryKey to look up responses
    if (Object.prototype.hasOwnProperty.call(responses, meta.dictionaryKey)) {
      values[meta.bindingPath] = responses[meta.dictionaryKey];
    }
  }

  return values;
}
```

**Example:**

```typescript
// Input: responses
{
  "tech.techId": "TECH-001",
  "triage.missionAlignmentScore": 3
}

// Output: bindingValues
{
  "technology.techId": "TECH-001",
  "triageStage.missionAlignmentScore": 3
}
```

### Step 2: Partition by Entity

```typescript
// src/lib/technology/service.ts:660
export function partitionBindingValues(values: Record<string, unknown>) {
  const partitions: Record<
    'technology' | 'triageStage' | 'viabilityStage',
    Record<string, unknown>
  > = {
    technology: {},
    triageStage: {},
    viabilityStage: {},
  };

  for (const [bindingPath, value] of Object.entries(values)) {
    const [root, ...rest] = bindingPath.split('.');
    if (!root || rest.length === 0) {
      continue;
    }

    const field = rest.join('.');

    if (root === 'technology') {
      partitions.technology[field] = value;
    } else if (root === 'triageStage') {
      partitions.triageStage[field] = value;
    } else if (root === 'viabilityStage') {
      partitions.viabilityStage[field] = value;
    }
  }

  return partitions;
}
```

**Example:**

```typescript
// Input: bindingValues
{
  "technology.techId": "TECH-001",
  "technology.technologyName": "New Innovation",
  "triageStage.missionAlignmentScore": 3,
  "triageStage.missionAlignmentText": "Highly aligned"
}

// Output: partitions
{
  technology: {
    techId: "TECH-001",
    technologyName: "New Innovation"
  },
  triageStage: {
    missionAlignmentScore: 3,
    missionAlignmentText: "Highly aligned"
  },
  viabilityStage: {}
}
```

### Step 3: Build Extended Data Updates

Fields bound to `extendedData` are stored as JSON in stage tables:

```typescript
// src/lib/technology/service.ts:692
export function buildExtendedDataUpdates(
  bindingMetadata: Record<string, BindingMetadata>,
  responses: Record<string, unknown>
): {
  triageStage: StageExtendedDataUpdates;
  viabilityStage: StageExtendedDataUpdates;
} {
  const updates = {
    triageStage: {} as StageExtendedDataUpdates,
    viabilityStage: {} as StageExtendedDataUpdates,
  };

  const answeredAt = new Date().toISOString();

  for (const meta of Object.values(bindingMetadata)) {
    if (!meta.dictionaryKey || !meta.bindingPath) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(responses, meta.dictionaryKey)) {
      continue;
    }

    const rawValue = responses[meta.dictionaryKey];
    const [root] = meta.bindingPath.split('.');

    let entry: VersionedAnswer | null = null;
    if (hasMeaningfulValue(rawValue)) {
      entry = {
        value: rawValue,
        questionRevisionId: meta.currentRevisionId ?? null,
        answeredAt,
        source: root === 'triageStage' || root === 'viabilityStage'
          ? (root as VersionedAnswer['source'])
          : undefined,
      };
    } else {
      entry = null;
    }

    if (root === 'triageStage') {
      updates.triageStage[meta.dictionaryKey] = entry;
    } else if (root === 'viabilityStage') {
      updates.viabilityStage[meta.dictionaryKey] = entry;
    }
  }

  return updates;
}
```

**Extended Data Structure:**

```typescript
// TriageStage.extendedData JSON structure
{
  "triage.targetUsers": {
    value: "Healthcare providers",
    questionRevisionId: "rev_abc123",
    answeredAt: "2025-12-08T10:30:00.000Z",
    source: "triageStage"
  },
  "triage.howItWorks": {
    value: "Uses ML to detect anomalies",
    questionRevisionId: "rev_def456",
    answeredAt: "2025-12-08T10:30:00.000Z",
    source: "triageStage"
  }
}
```

### Step 4-6: Upsert Entity Records

```typescript
// src/lib/technology/service.ts:495
export async function applyBindingWrites(
  tx: Prisma.TransactionClient,
  bindingMetadata: Record<string, BindingMetadata>,
  responses: Record<string, unknown>,
  options: BindingWriteOptions = {}
): Promise<{ technologyId?: string; techId?: string; rowVersions?: RowVersionSnapshot }> {
  // ... extraction and partitioning ...

  // 4. Upsert Technology record
  let technologyRecord = await tx.technology.findUnique({
    where: { techId: resolvedTechId },
    include: { triageStage: true, viabilityStage: true },
  });

  if (technologyRecord) {
    // Update existing Technology
    if (expected.technologyRowVersion !== undefined) {
      const result = await tx.technology.updateMany({
        where: {
          id: technologyRecord.id,
          rowVersion: expected.technologyRowVersion,
        },
        data: {
          ...technologyData,
          rowVersion: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new OptimisticLockError('Technology record was modified by another user.');
      }
    } else {
      await tx.technology.update({
        where: { id: technologyRecord.id },
        data: {
          ...technologyData,
          rowVersion: { increment: 1 },
        },
      });
    }
  } else {
    // Create new Technology
    technologyRecord = await tx.technology.create({
      data: technologyData as Prisma.TechnologyCreateInput,
      include: { triageStage: true, viabilityStage: true },
    });
  }

  // 5. Upsert TriageStage
  const triageStageRowVersion = await upsertTriageStage(
    tx,
    technologyRecord.id,
    technologyRecord.triageStage,
    partitions.triageStage,
    extendedDataUpdates.triageStage,
    expected.triageStageRowVersion
  );

  // 6. Upsert ViabilityStage
  const viabilityStageRowVersion = await upsertViabilityStage(
    tx,
    technologyRecord.id,
    technologyRecord.viabilityStage,
    partitions.viabilityStage,
    extendedDataUpdates.viabilityStage,
    expected.viabilityStageRowVersion
  );

  // 7. Upsert TechnologyAnswer records
  await upsertTechnologyAnswers(
    tx,
    technologyRecord.id,
    bindingMetadata,
    responses,
    options.userId
  );

  return {
    technologyId: technologyRecord.id,
    techId: resolvedTechId,
    rowVersions: {
      technologyRowVersion,
      triageStageRowVersion,
      viabilityStageRowVersion,
    },
  };
}
```

### Bindable Field Whitelists

Not all fields can be written via bindings. Whitelists enforce this:

```typescript
// src/lib/technology/constants.ts
export const TECHNOLOGY_BINDABLE_FIELDS = new Set<keyof Technology>([
  'techId',
  'technologyName',
  'shortDescription',
  'inventorName',
  'inventorTitle',
  'inventorDept',
  'reviewerName',
  'domainAssetClass',
  'currentStage',
  'status',
  'lastStageTouched',
  'lastModifiedBy',
  'lastModifiedAt',
]);

export const TRIAGE_STAGE_BINDABLE_FIELDS = new Set<keyof TriageStage>([
  'technologyOverview',
  'missionAlignmentText',
  'missionAlignmentScore',
  'recommendation',
  'recommendationNotes',
  'unmetNeedText',
  'unmetNeedScore',
  'stateOfArtText',
  'stateOfArtScore',
  'marketOverview',
  'marketScore',
  'impactScore',
  'valueScore',
]);
```

---

## Technology Lifecycle Management

### Technology Entity Model

```
Technology (Core Entity)
├── id: string (cuid)
├── techId: string (unique identifier, user-facing)
├── technologyName: string
├── inventorName: string
├── currentStage: TechStage (enum)
├── status: TechStatus (enum)
├── rowVersion: int (optimistic locking)
│
├── TriageStage (1:1 relationship)
│   ├── missionAlignmentScore: int
│   ├── missionAlignmentText: string
│   ├── impactScore: float
│   ├── valueScore: float
│   ├── extendedData: JSON (dynamic fields)
│   └── rowVersion: int
│
├── ViabilityStage (1:1 relationship)
│   ├── technicalFeasibility: string
│   ├── technicalScore: float
│   ├── commercialScore: float
│   ├── extendedData: JSON (dynamic fields)
│   └── rowVersion: int
│
├── TechnologyAnswer[] (1:many)
│   ├── questionKey: string (dictionaryKey)
│   ├── value: JSON
│   ├── answeredAt: DateTime
│   ├── answeredBy: string
│   └── revisionId: string (QuestionRevision FK)
│
├── FormSubmission[] (1:many)
└── SubmissionSnapshot[] (1:many)
```

### Stage Progression

```
┌──────────┐    ┌────────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐
│ TRIAGE   │───▶│ VIABILITY  │───▶│ COMMERCIAL │───▶│ MARKET_READY │───▶│ ARCHIVED │
└──────────┘    └────────────┘    └────────────┘    └──────────────┘    └──────────┘
   Initial           Deep             Business         Ready for          Completed
  screening        technical          planning         market entry       or abandoned
  evaluation       assessment
```

**Stage Transitions:**
- Managed via `Technology.currentStage` field
- Stage data persists even after progression (historical record)
- `Technology.lastStageTouched` tracks most recently modified stage

### Stage-Specific Data Storage

Each stage has a dedicated table with both **structured fields** and **flexible JSON storage**:

```sql
-- Triage Stage Table
CREATE TABLE triage_stages (
  id TEXT PRIMARY KEY,
  technology_id TEXT UNIQUE REFERENCES technologies(id),

  -- Structured fields (queryable, indexed)
  mission_alignment_score INT DEFAULT 0,
  mission_alignment_text TEXT,
  unmet_need_score INT DEFAULT 0,
  impact_score FLOAT DEFAULT 0,
  value_score FLOAT DEFAULT 0,
  recommendation TEXT DEFAULT '',

  -- Dynamic fields (JSON storage)
  extended_data JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  row_version INT DEFAULT 1
);
```

**Design Rationale:**
- **Structured fields**: High-value fields that need indexing, aggregation, or complex queries
- **extendedData JSON**: Dynamic fields that may change frequently, don't require indexing

---

## Form Engine Architecture

### Form Template Structure

```
FormTemplate
├── id: string
├── name: string
├── version: string
├── isActive: boolean
│
└── FormSection[] (ordered)
    ├── code: string (e.g., "F0", "F1")
    ├── title: string
    ├── order: int
    │
    └── FormQuestion[] (ordered)
        ├── label: string
        ├── type: FieldType (enum)
        ├── dictionaryKey: string (semantic key)
        ├── helpText: string
        ├── placeholder: string
        ├── isRequired: boolean
        ├── order: int
        ├── validation: JSON
        ├── conditional: JSON
        ├── repeatableConfig: JSON
        │
        ├── QuestionOption[] (for select fields)
        ├── ScoringConfig (for scoring fields)
        └── QuestionDictionary (FK to dictionary)
```

### Field Types

```typescript
enum FieldType {
  SHORT_TEXT        // Single-line text input
  LONG_TEXT         // Multi-line textarea
  INTEGER           // Numeric input (whole numbers)
  SINGLE_SELECT     // Dropdown (single choice)
  MULTI_SELECT      // Dropdown (multiple choices)
  CHECKBOX_GROUP    // Multiple checkboxes
  DATE              // Date picker
  REPEATABLE_GROUP  // Dynamic row addition (e.g., team members)
  SCORING_0_3       // 0-3 scoring with criteria
  SCORING_MATRIX    // Multi-dimensional scoring
  DATA_TABLE_SELECTOR // Select from predefined rows
}
```

### Field Component Mapping

```typescript
// src/lib/form-engine/field-mappings-simple.ts
export const fieldTypeComponentMap = {
  [FieldType.SHORT_TEXT]: 'Input',
  [FieldType.LONG_TEXT]: 'Textarea',
  [FieldType.INTEGER]: 'NumberInput',
  [FieldType.SINGLE_SELECT]: 'Select',
  [FieldType.MULTI_SELECT]: 'MultiSelect',
  [FieldType.CHECKBOX_GROUP]: 'CheckboxGroup',
  [FieldType.DATE]: 'DateInput',
  [FieldType.REPEATABLE_GROUP]: 'RepeatableGroup',
  [FieldType.DATA_TABLE_SELECTOR]: 'DataTableSelector',
  [FieldType.SCORING_0_3]: 'ScoringComponent',
  [FieldType.SCORING_MATRIX]: 'ScoringMatrixComponent',
};
```

### Template Hydration

When loading a form for a specific technology, the system **hydrates** the template with existing data:

```typescript
// src/lib/technology/service.ts:90
export async function loadTemplateWithBindings(
  options: LoadTemplateOptions = {}
): Promise<TemplateHydrationResult> {
  const { techId } = options;

  // 1. Fetch active form template with all relationships
  const template = await prisma.formTemplate.findFirst({
    where: { isActive: true },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              options: { orderBy: { order: 'asc' } },
              scoringConfig: true,
              dictionary: true,
            },
          },
        },
      },
    },
  });

  // 2. Collect binding metadata
  const bindingMetadata = collectBindingMetadata(template);

  if (!techId) {
    // Return empty form for new technology
    return {
      template,
      bindingMetadata,
      initialResponses: {},
      initialRepeatGroups: {},
      answerMetadata: {},
      technologyContext: null,
      rowVersions: {},
    };
  }

  // 3. Fetch technology record with stage data
  const technology = await prisma.technology.findUnique({
    where: { techId },
    include: {
      triageStage: true,
      viabilityStage: true,
    },
  });

  if (!technology) {
    return { /* empty response */ };
  }

  // 4. Fetch TechnologyAnswer records
  const technologyAnswers = await prisma.technologyAnswer.findMany({
    where: { technologyId: technology.id },
  });

  // 5. Build initial values by resolving binding paths
  const { responses, repeatGroups, answerMetadata } = buildInitialValues(
    technology,
    template.sections.flatMap((section) => section.questions),
    technologyAnswers
  );

  // 6. Return hydrated result
  return {
    template,
    bindingMetadata,
    initialResponses: responses,
    initialRepeatGroups: repeatGroups,
    answerMetadata,
    technologyContext: {
      id: technology.id,
      techId: technology.techId,
      hasTriageStage: Boolean(technology.triageStage),
      hasViabilityStage: Boolean(technology.viabilityStage),
      technologyRowVersion: technology.rowVersion,
      triageStageRowVersion: technology.triageStage?.rowVersion,
      viabilityStageRowVersion: technology.viabilityStage?.rowVersion,
    },
    rowVersions: {
      technologyRowVersion: technology.rowVersion,
      triageStageRowVersion: technology.triageStage?.rowVersion,
      viabilityStageRowVersion: technology.viabilityStage?.rowVersion,
    },
  };
}
```

**Hydration Priority:**
1. **TechnologyAnswer** records (highest priority - most recent answers)
2. **Stage table fields** (structured fields like `missionAlignmentScore`)
3. **extendedData JSON** (dynamic fields with versioning metadata)

---

## Database Schema & Models

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FORM SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │FormTemplate  │1────n│FormSection   │1────n│FormQuestion  │          │
│  │--------------│      │--------------│      │--------------│          │
│  │id            │      │id            │      │id            │          │
│  │name          │      │code          │      │label         │          │
│  │version       │      │title         │      │type          │          │
│  │isActive      │      │order         │      │dictionaryKey*│          │
│  └──────────────┘      └──────────────┘      │validation    │          │
│                                               │conditional   │          │
│                                               │repeatableConf│          │
│                                               └──────┬───────┘          │
│                                                      │                  │
│                                                      │ FK               │
│                                                      ▼                  │
│                                       ┌──────────────────────────┐     │
│                                       │QuestionDictionary        │     │
│                                       │--------------------------|     │
│                                       │id                        │     │
│                                       │key* (semantic identifier)│     │
│                                       │bindingPath               │     │
│                                       │dataSource                │     │
│                                       │currentRevisionId         │     │
│                                       └─────┬────────────────────┘     │
│                                             │                          │
│                                             │1:n                       │
│                                             ▼                          │
│                                    ┌────────────────────┐              │
│                                    │QuestionRevision    │              │
│                                    │--------------------│              │
│                                    │id                  │              │
│                                    │dictionaryId (FK)   │              │
│                                    │versionNumber       │              │
│                                    │label               │              │
│                                    │createdAt           │              │
│                                    │significantChange   │              │
│                                    └────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐                                                        │
│  │Technology    │                                                        │
│  │--------------│                                                        │
│  │id            │                                                        │
│  │techId*       │                                                        │
│  │technologyName│                                                        │
│  │currentStage  │                                                        │
│  │status        │                                                        │
│  │rowVersion    │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ├──────1:1──────┐                                               │
│         │                │                                               │
│         ▼                ▼                                               │
│  ┌──────────────┐  ┌────────────────┐                                  │
│  │TriageStage   │  │ViabilityStage  │                                  │
│  │--------------│  │----------------│                                  │
│  │id            │  │id              │                                  │
│  │technologyId* │  │technologyId*   │                                  │
│  │missionAlign..│  │technicalFeas.. │                                  │
│  │impactScore   │  │technicalScore  │                                  │
│  │extendedData  │  │extendedData    │                                  │
│  │rowVersion    │  │rowVersion      │                                  │
│  └──────────────┘  └────────────────┘                                  │
│         │                                                                │
│         │1:n                                                             │
│         ▼                                                                │
│  ┌──────────────────────┐                                               │
│  │TechnologyAnswer      │                                               │
│  │----------------------│                                               │
│  │id                    │                                               │
│  │technologyId (FK)     │                                               │
│  │questionKey* (dict key)│                                              │
│  │value (JSON)          │                                               │
│  │answeredAt            │                                               │
│  │answeredBy            │                                               │
│  │revisionId (FK)       │                                               │
│  └──────────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      SUBMISSION & SNAPSHOTS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐                                                    │
│  │FormSubmission    │                                                    │
│  │------------------│                                                    │
│  │id                │                                                    │
│  │templateId (FK)   │                                                    │
│  │technologyId (FK) │                                                    │
│  │status            │                                                    │
│  │submittedBy       │                                                    │
│  │submittedAt       │                                                    │
│  └────────┬─────────┘                                                    │
│           │                                                              │
│           ├──────1:n──────┐                                             │
│           │                │                                             │
│           ▼                ▼                                             │
│  ┌─────────────────┐  ┌────────────────────────┐                       │
│  │QuestionResponse │  │RepeatableGroupResponse │                       │
│  │-----------------│  │------------------------│                       │
│  │submissionId (FK)│  │submissionId (FK)       │                       │
│  │questionCode*    │  │questionCode*           │                       │
│  │value (JSON)     │  │rowIndex                │                       │
│  │revisionId (FK)  │  │data (JSON)             │                       │
│  └─────────────────┘  │revisionId (FK)         │                       │
│                        └────────────────────────┘                       │
│           │                                                              │
│           │1:n                                                           │
│           ▼                                                              │
│  ┌──────────────────────────┐                                           │
│  │SubmissionSnapshot        │                                           │
│  │--------------------------│                                           │
│  │id                        │                                           │
│  │submissionId (FK)         │                                           │
│  │technologyId (FK)         │                                           │
│  │snapshotType              │                                           │
│  │capturedAt                │                                           │
│  │capturedBy                │                                           │
│  │formAnswers (JSON)        │ ← Frozen form data                       │
│  │technologyMeta (JSON)     │ ← Frozen tech data                       │
│  │calculatedScores (JSON)   │ ← Frozen scores                          │
│  │templateId                │                                           │
│  │templateVersion           │                                           │
│  └──────────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Database Models

#### 1. Technology (Core Entity)

```prisma
model Technology {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  rowVersion Int      @default(1)

  // Identity
  techId           String  @unique
  technologyName   String
  shortDescription String?

  // Team
  inventorName  String
  inventorTitle String?
  inventorDept  String?
  reviewerName  String

  // Classification
  domainAssetClass String

  // Lifecycle
  currentStage     TechStage  @default(TRIAGE)
  status           TechStatus @default(ACTIVE)
  lastStageTouched TechStage?
  lastModifiedBy   String?
  lastModifiedAt   DateTime?

  // Relationships
  triageStage      TriageStage?
  viabilityStage   ViabilityStage?
  answers          TechnologyAnswer[]
  submissions      FormSubmission[]
  snapshots        SubmissionSnapshot[]
  attachments      Attachment[]
  auditLog         TechnologyAuditLog[]
  stageHistory     StageHistory[]

  @@index([techId])
  @@index([currentStage])
  @@map("technologies")
}
```

#### 2. TriageStage

```prisma
model TriageStage {
  id           String   @id @default(cuid())
  technologyId String   @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  rowVersion   Int      @default(1)
  extendedData Json?    // Dynamic fields with versioning

  // Structured evaluation fields
  technologyOverview    String
  missionAlignmentText  String
  missionAlignmentScore Int     @default(0)
  unmetNeedText         String
  unmetNeedScore        Int     @default(0)
  stateOfArtText        String
  stateOfArtScore       Int     @default(0)
  marketOverview        String
  marketScore           Int     @default(0)

  // Calculated scores
  impactScore    Float   @default(0)
  valueScore     Float   @default(0)

  // Recommendations
  recommendation      String  @default("")
  recommendationNotes String?

  // Relationships
  technology  Technology         @relation(fields: [technologyId], references: [id], onDelete: Cascade)
  competitors TriageCompetitor[]
  experts     TriageSME[]

  @@map("triage_stages")
}
```

#### 3. QuestionDictionary

```prisma
model QuestionDictionary {
  id                String             @id @default(cuid())
  version           String
  key               String             @unique
  currentVersion    Int                @default(1)
  currentRevisionId String?            @unique
  label             String
  helpText          String?
  options           Json?
  validation        Json?
  bindingPath       String             // "triageStage.missionAlignmentScore"
  dataSource        DataSource         // TECHNOLOGY | STAGE_SUPPLEMENT | CALCULATED
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  formQuestions     FormQuestion[]
  currentRevision   QuestionRevision?  @relation("CurrentRevision", fields: [currentRevisionId], references: [id])
  revisions         QuestionRevision[] @relation("QuestionDictionaryRevisions")
  technologyAnswers TechnologyAnswer[]

  @@index([version])
  @@map("question_dictionary")
}
```

#### 4. TechnologyAnswer

```prisma
model TechnologyAnswer {
  id           String   @id @default(cuid())
  technologyId String
  questionKey  String   // dictionaryKey (e.g., "triage.missionAlignmentScore")
  value        Json     // Flexible storage
  answeredAt   DateTime @default(now())
  answeredBy   String
  revisionId   String?  // QuestionRevision FK

  technology Technology         @relation(fields: [technologyId], references: [id], onDelete: Cascade)
  question   QuestionDictionary @relation(fields: [questionKey], references: [key], onDelete: Restrict)
  revision   QuestionRevision?  @relation(fields: [revisionId], references: [id], onDelete: SetNull)

  @@unique([technologyId, questionKey])
  @@index([technologyId])
  @@index([questionKey])
  @@map("technology_answers")
}
```

#### 5. SubmissionSnapshot

```prisma
model SubmissionSnapshot {
  id           String       @id @default(cuid())
  submissionId String
  technologyId String?
  snapshotType SnapshotType @default(SUBMISSION)
  capturedAt   DateTime     @default(now())
  capturedBy   String

  // Frozen data (denormalized for immutability)
  formAnswers      Json  // { responses, repeatGroups, questionRevisions }
  technologyMeta   Json? // { techId, technologyName, reviewer, stage, scores, ... }
  calculatedScores Json? // { impactScore, valueScore, recommendation }

  // Template tracking
  templateId      String
  templateVersion String

  submission FormSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  technology Technology?    @relation(fields: [technologyId], references: [id], onDelete: SetNull)

  @@index([submissionId])
  @@index([technologyId])
  @@index([capturedAt])
  @@map("submission_snapshots")
}
```

---

## Server Actions & Data Flow

### Primary Server Actions

All server actions are defined in `/src/app/dynamic-form/actions.ts`.

#### 1. submitFormResponse()

**Purpose:** Submit a completed form and persist to database

```typescript
export async function submitFormResponse(
  data: FormSubmissionData,
  userId?: string,
  existingDraftId?: string
): Promise<FormSubmissionResult>
```

**Flow:**
1. Validate payload with Zod schema
2. Fetch binding metadata for template
3. Merge repeatGroup responses into main responses
4. Start database transaction
5. Reuse existing draft (if provided) or create new submission
6. Call `applyBindingWrites()` to persist to Technology/Stage/TechnologyAnswer tables
7. Link submission to technology record
8. Capture immutable snapshot (non-blocking)
9. Revalidate Next.js cache paths

**Error Handling:**
- Catches `OptimisticLockError` → returns `{ success: false, error: 'conflict' }`
- Other errors → returns `{ success: false, error: errorMessage }`

**Example:**

```typescript
const result = await submitFormResponse(
  {
    templateId: "template_abc123",
    responses: {
      "tech.techId": "TECH-001",
      "triage.missionAlignmentScore": 3
    },
    repeatGroups: {
      "tech.inventorName": [
        { name: "Dr. Smith", department: "Engineering" }
      ]
    },
    calculatedScores: {
      impactScore: 8.5,
      valueScore: 7.2
    },
    rowVersions: {
      technologyRowVersion: 1,
      triageStageRowVersion: 2
    }
  },
  "user@example.com",
  "draft_xyz789" // optional existing draft
);

if (result.success) {
  console.log("Submission ID:", result.submissionId);
  console.log("Updated row versions:", result.rowVersions);
}
```

#### 2. saveDraftResponse()

**Purpose:** Save form progress as a draft (allows partial data)

```typescript
export async function saveDraftResponse(
  data: FormSubmissionData,
  userId?: string,
  existingDraftId?: string
): Promise<FormSubmissionResult>
```

**Key Differences from submitFormResponse:**
- Status set to `DRAFT` instead of `SUBMITTED`
- `allowCreateWhenIncomplete: false` → won't create Technology if required fields missing
- No snapshot captured
- Can be updated multiple times

**Upsert Logic:**
1. If `existingDraftId` provided → delete existing responses and recreate
2. Otherwise → create new draft submission

#### 3. loadDraftResponse()

**Purpose:** Reload a saved draft for editing

```typescript
export async function loadDraftResponse(
  draftId: string,
  userId?: string
)
```

**Data Source:** Loads answers from `TechnologyAnswer` table when submission has a `technologyId`.

**Returns:**
- `template`: FormTemplate structure
- `responses`: Form responses keyed by dictionaryKey (from TechnologyAnswer)
- `repeatGroups`: Repeatable field data
- `calculatedScores`: Computed scores
- `answerMetadata`: Freshness status for each answer

#### 4. getUserDrafts() / getUserSubmissions()

**Purpose:** List all drafts/submissions for a user

```typescript
export async function getUserDrafts(
  userId?: string,
  scope: 'all' | 'user' = 'all'
)

export async function getUserSubmissions(
  userId?: string,
  scope: 'all' | 'user' = 'all'
)
```

**Scope Options:**
- `'all'`: Return all drafts/submissions (default)
- `'user'`: Filter by `userId`

---

## Snapshot System

### Purpose

Snapshots create **immutable point-in-time records** of form submissions for:
- Historical audit trails
- Compliance documentation
- Change tracking across revisions
- Recovering previous states

### When Snapshots Are Captured

```typescript
enum SnapshotType {
  SUBMISSION  // Captured on Submit button
  STAGE_GATE  // Captured at stage transition (future)
}
```

Currently, snapshots are captured:
1. **On form submission** (after successful database write)
2. **Non-blocking** - if snapshot fails, submission still succeeds

### Snapshot Data Structure

```typescript
interface SubmissionSnapshot {
  id: string;
  submissionId: string;
  technologyId: string | null;
  snapshotType: SnapshotType;
  capturedAt: DateTime;
  capturedBy: string;

  // Frozen form data
  formAnswers: {
    responses: Record<string, unknown>;
    repeatGroups: Record<string, Record<string, unknown>[]>;
    questionRevisions: Record<string, string | null>;
  };

  // Frozen technology metadata
  technologyMeta: {
    id: string;
    techId: string;
    technologyName: string;
    currentStage: TechStage;
    triageStage?: SnapshotTriageStage;
    viabilityStage?: SnapshotViabilityStage;
    rowVersions: RowVersionSnapshot;
  } | null;

  // Frozen calculated scores
  calculatedScores: {
    impactScore: number;
    valueScore: number;
    recommendation: string;
  } | null;

  // Template versioning
  templateId: string;
  templateVersion: string;
}
```

### Snapshot Capture Implementation

```typescript
// src/lib/snapshots/capture.ts:22
export async function captureSubmissionSnapshot(
  options: CaptureSnapshotOptions,
  bindingMetadata?: Record<string, BindingMetadata>
): Promise<CaptureSnapshotResult> {
  try {
    // 1. Fetch template for version info
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      select: { version: true },
    });

    // 2. Build question revision map
    const questionRevisions: Record<string, string | null> = {};
    if (bindingMetadata) {
      for (const [key, meta] of Object.entries(bindingMetadata)) {
        questionRevisions[key] = meta.currentRevisionId ?? null;
      }
    }

    // 3. Build formAnswers payload
    const formAnswers = {
      responses: responses as Record<string, unknown>,
      repeatGroups: repeatGroups as Record<string, Record<string, unknown>[]>,
      questionRevisions,
    };

    // 4. Fetch and build technologyMeta (if bound to technology)
    let technologyMeta: SnapshotTechnologyMeta | null = null;
    if (technologyId) {
      technologyMeta = await buildTechnologyMeta(technologyId);
    }

    // 5. Create snapshot record
    const snapshot = await prisma.submissionSnapshot.create({
      data: {
        submissionId,
        technologyId: technologyId ?? undefined,
        snapshotType,
        capturedBy,
        formAnswers: formAnswers as Prisma.InputJsonValue,
        technologyMeta: technologyMeta as Prisma.InputJsonValue | undefined,
        calculatedScores: calculatedScores as Prisma.InputJsonValue | undefined,
        templateId,
        templateVersion: template.version,
      },
    });

    return { success: true, snapshotId: snapshot.id };
  } catch (error) {
    // Non-blocking: log error but don't throw
    logger.error('Failed to capture submission snapshot', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Viewing Snapshots

```typescript
// Retrieve snapshot detail
const result = await getSnapshotDetail(snapshotId);

if (result.success) {
  const {
    snapshotId,
    capturedAt,
    capturedBy,
    template,
    responses,
    repeatGroups,
    questionRevisions,
    technologyMeta,
    calculatedScores,
  } = result.data;

  // Render read-only form with snapshot data
}
```

**UI Route:** `/dynamic-form/submissions/[submissionId]/snapshot/[snapshotId]`

---

## Answer Status & Versioning

### Question Revision System

When questions change significantly (e.g., label, options, validation), a new **QuestionRevision** is created:

```prisma
model QuestionRevision {
  id                String   @id @default(cuid())
  dictionaryId      String
  questionKey       String
  versionNumber     Int
  label             String
  helpText          String?
  options           Json?
  validation        Json?
  createdAt         DateTime @default(now())
  createdBy         String?
  changeReason      String?
  significantChange Boolean  @default(true)

  dictionary               QuestionDictionary        @relation("QuestionDictionaryRevisions", fields: [dictionaryId], references: [id])
  currentFor               QuestionDictionary?       @relation("CurrentRevision")
  questionResponses        QuestionResponse[]
  repeatableGroupResponses RepeatableGroupResponse[]
  technologyAnswers        TechnologyAnswer[]

  @@unique([questionKey, versionNumber])
  @@map("question_revisions")
}
```

### Answer Freshness Detection

Every saved answer tracks which `QuestionRevision` it was answered against:

```typescript
model TechnologyAnswer {
  id           String   @id
  technologyId String
  questionKey  String
  value        Json
  answeredAt   DateTime
  answeredBy   String
  revisionId   String?  // ← Links to QuestionRevision
}
```

**Answer Status:**

```typescript
export type AnswerStatus = 'MISSING' | 'FRESH' | 'STALE' | 'UNKNOWN';

export interface AnswerStatusDetail {
  status: AnswerStatus;
  dictionaryKey?: string;
  savedRevisionId?: string | null;    // Revision when answered
  currentRevisionId?: string | null;  // Current revision
  answeredAt?: string | null;
  source?: AnswerSource;
}
```

**Status Logic:**

```typescript
// src/lib/technology/answer-status.ts:120
export function getAnswerStatus(
  question: FormQuestionWithDetails,
  answer: VersionedAnswer | null | undefined
): AnswerStatusDetail {
  const dictionaryKey = question.dictionary?.key;
  const currentRevisionId = question.dictionary?.currentRevisionId ?? null;

  // No answer or empty value
  if (!answer || !hasMeaningfulValue(answer.value)) {
    return {
      status: 'MISSING',
      dictionaryKey,
      savedRevisionId: answer?.questionRevisionId ?? null,
      currentRevisionId,
    };
  }

  const savedRevisionId = answer.questionRevisionId ?? null;

  // Can't determine freshness without both IDs
  if (!currentRevisionId || !savedRevisionId) {
    return {
      status: 'UNKNOWN',
      dictionaryKey,
      savedRevisionId,
      currentRevisionId,
    };
  }

  // Compare revision IDs
  const status: AnswerStatus =
    savedRevisionId === currentRevisionId ? 'FRESH' : 'STALE';

  return {
    status,
    dictionaryKey,
    savedRevisionId,
    currentRevisionId,
    answeredAt: answer.answeredAt ?? null,
    source: answer.source,
  };
}
```

**UI Indicators:**

- 🟢 **FRESH**: Answer is up-to-date with current question
- 🟡 **STALE**: Question changed since answer was saved (review recommended)
- ⚪ **MISSING**: No answer provided
- ⚫ **UNKNOWN**: Can't determine freshness (missing revision metadata)

### Versioned Answer Format

Answers stored in `extendedData` JSON use a versioned format:

```typescript
interface VersionedAnswer {
  value: unknown;                 // Actual answer value
  questionRevisionId?: string | null;  // Revision when answered
  answeredAt?: string | null;     // ISO timestamp
  source?: AnswerSource;          // Where answer came from
}

type AnswerSource =
  | 'technology'       // Technology table
  | 'triageStage'      // TriageStage table
  | 'viabilityStage'   // ViabilityStage table
  | 'submission'       // FormSubmission
  | 'technologyAnswer' // TechnologyAnswer table
```

**Example `extendedData` JSON:**

```json
{
  "triage.targetUsers": {
    "value": "Healthcare providers and administrators",
    "questionRevisionId": "rev_abc123",
    "answeredAt": "2025-12-08T10:30:00.000Z",
    "source": "triageStage"
  },
  "triage.howItWorks": {
    "value": "Uses machine learning to detect anomalies in medical imaging",
    "questionRevisionId": "rev_def456",
    "answeredAt": "2025-12-08T10:32:15.000Z",
    "source": "triageStage"
  }
}
```

---

## Validation & Conditional Logic

### Validation System

#### Validation Rules

```typescript
interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'number' | 'custom';
  value?: string | number;
  message: string;
}

interface ValidationConfig {
  rules: ValidationRule[];
}
```

#### Field-Level Validation

```typescript
// src/lib/form-engine/validation.ts:113
export function validateQuestion(
  question: FormQuestionWithDetails,
  value: unknown,
  isRequired: boolean = false
): string | null {
  const validationConfig = parseValidationConfig(question.validation);

  const effectiveConfig: ValidationConfig = { rules: [] };

  // Add required rule if needed
  if (isRequired || question.isRequired) {
    effectiveConfig.rules.push({
      type: 'required',
      message: `${question.label} is required`
    });
  }

  // Add type-specific validations
  switch (question.type) {
    case 'INTEGER':
      effectiveConfig.rules.push({
        type: 'number',
        message: `${question.label} must be a valid number`
      });
      break;

    case 'SCORING_0_3':
      effectiveConfig.rules.push(
        { type: 'number', message: 'Must be a valid number' },
        { type: 'min', value: 0, message: 'Must be at least 0' },
        { type: 'max', value: 3, message: 'Must be at most 3' }
      );
      break;
  }

  // Add custom rules from database
  if (validationConfig && validationConfig.rules) {
    effectiveConfig.rules.push(...validationConfig.rules);
  }

  return validateField(effectiveConfig, value);
}
```

#### Form-Level Validation

```typescript
export function validateFormSubmission(
  questions: FormQuestionWithDetails[],
  responses: { [key: string]: unknown },
  requiredFields: Set<string> = new Set()
): { [key: string]: string } {
  const errors: { [key: string]: string } = {};

  for (const question of questions) {
    const questionKey = question.dictionaryKey;
    if (!questionKey) continue;

    const value = responses[questionKey];
    const isRequired = requiredFields.has(questionKey) || question.isRequired;

    const error = validateQuestion(question, value, isRequired);
    if (error) {
      errors[questionKey] = error;
    }
  }

  return errors;
}
```

### Conditional Logic

#### Conditional Rules

```typescript
interface ConditionalRule {
  field: string;  // dictionaryKey to check
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'not_empty';
  value: string | number | boolean | null;
  action: 'show' | 'hide' | 'require' | 'optional';
}

interface ConditionalConfig {
  rules: ConditionalRule[];
  logic: 'AND' | 'OR';  // How to combine rules
}
```

#### Rule Evaluation

```typescript
// src/lib/form-engine/conditional-logic.ts:7
export function evaluateRule(rule: ConditionalRule, responses: FormResponse): boolean {
  const fieldValue = responses[rule.field];

  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;

    case 'not_equals':
      return fieldValue !== rule.value;

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(item => String(item) === String(rule.value));
      }
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return fieldValue.includes(rule.value);
      }
      return false;

    case 'greater_than':
      return Number(fieldValue) > Number(rule.value);

    case 'less_than':
      return Number(fieldValue) < Number(rule.value);

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

    case 'not_exists':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';

    case 'not_empty':
      if (Array.isArray(fieldValue)) {
        return fieldValue.length > 0;
      }
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

    default:
      return false;
  }
}
```

#### Show/Hide Logic

```typescript
export function shouldShowField(
  conditionalConfig: ConditionalConfig | null,
  responses: FormResponse
): boolean {
  if (!conditionalConfig) {
    return true; // No conditions = always show
  }

  const conditionResult = evaluateConditional(conditionalConfig, responses);

  const hasShowAction = conditionalConfig.rules.some(rule => rule.action === 'show');
  const hasHideAction = conditionalConfig.rules.some(rule => rule.action === 'hide');

  if (hasShowAction && !hasHideAction) {
    // Only show actions - show if condition is true
    return conditionResult;
  } else if (hasHideAction && !hasShowAction) {
    // Only hide actions - hide if condition is true (so show if false)
    return !conditionResult;
  } else {
    // Mixed or no specific actions - default to showing
    return conditionResult;
  }
}
```

#### Example Conditional Configuration

**Scenario:** Show "Team Assessment" field only if "Business Model" equals "Startup"

```json
{
  "rules": [
    {
      "field": "triage.businessModel",
      "operator": "equals",
      "value": "Startup",
      "action": "show"
    }
  ],
  "logic": "AND"
}
```

**Scenario:** Require "Regulatory Path" if "Development Stage" is "Clinical Trials" OR "FDA Submission"

```json
{
  "rules": [
    {
      "field": "triage.developmentStage",
      "operator": "equals",
      "value": "Clinical Trials",
      "action": "require"
    },
    {
      "field": "triage.developmentStage",
      "operator": "equals",
      "value": "FDA Submission",
      "action": "require"
    }
  ],
  "logic": "OR"
}
```

---

## Optimistic Locking

### Problem

In multi-user environments, concurrent edits can cause **lost updates**:

```
Time  User A                  User B
----  ----------------------  ----------------------
T1    Read Tech (version 1)
T2                            Read Tech (version 1)
T3    Update Tech
T4                            Update Tech ← Overwrites User A's changes!
```

### Solution: Row Versioning

Each entity tracks a `rowVersion` field:

```typescript
model Technology {
  rowVersion Int @default(1)
  // ...
}

model TriageStage {
  rowVersion Int @default(1)
  // ...
}
```

**On every update:**
1. Client sends expected `rowVersion`
2. Server attempts update with `WHERE rowVersion = expectedVersion`
3. If no rows updated → version mismatch → throw `OptimisticLockError`

### Implementation

```typescript
// src/lib/technology/service.ts:542
if (expected.technologyRowVersion !== undefined) {
  const result = await tx.technology.updateMany({
    where: {
      id: technologyRecord.id,
      rowVersion: expected.technologyRowVersion,  // ← Optimistic lock check
    },
    data: {
      ...technologyData,
      rowVersion: { increment: 1 },  // ← Increment version
    },
  });

  if (result.count === 0) {
    throw new OptimisticLockError('Technology record was modified by another user.');
  }
}
```

### Client Handling

```typescript
// Client tracks row versions during form hydration
const { template, rowVersions } = await loadTemplateWithBindings({ techId: 'TECH-001' });

// Client includes row versions in submission
const result = await submitFormResponse(
  {
    templateId,
    responses,
    repeatGroups,
    rowVersions  // ← Include expected versions
  },
  userId
);

if (!result.success && result.error === 'conflict') {
  // Show conflict resolution UI
  alert('This technology was modified by another user. Please refresh and try again.');
}
```

### Row Version Snapshot

```typescript
interface RowVersionSnapshot {
  technologyRowVersion?: number;
  triageStageRowVersion?: number;
  viabilityStageRowVersion?: number;
}
```

**When returned:**
- After template hydration (initial load)
- After successful binding writes (submit/save draft)

**Why three versions?**
- Technology, TriageStage, and ViabilityStage can be updated independently
- Each needs its own version tracking

---

## Development Workflow

### Local Development Setup

#### 1. Prerequisites

- Node.js 20.18.x
- PostgreSQL 14+ running locally
- npm 10+

#### 2. Environment Setup

```bash
# Clone repository
git clone <repo-url>
cd minimal-copy

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Copy environment template
cp .env.example .env.prisma-dev

# Edit .env.prisma-dev with your local database credentials
```

**Example `.env.prisma-dev`:**

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/tech_triage_dev"
BASIC_AUTH_USERNAME="admin"
BASIC_AUTH_PASSWORD="secure-password"
```

#### 3. Database Initialization

```bash
# Push schema to database
dotenv -e .env.prisma-dev -- npx prisma db push

# Seed database with question dictionary and demo data
npm run db:seed:dev
```

#### 4. Start Development Server

```bash
# Start Next.js dev server with Turbopack
npm run dev

# Server runs at http://localhost:3000
# Login with credentials from .env.prisma-dev
```

### Common Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests (requires test database)
npm run test:integration

# Open Prisma Studio (dev database)
npm run studio

# Export forms to Excel/PDF
npm run export-forms
```

### Database Management

```bash
# View data with Prisma Studio
npm run studio

# Reset database (WARNING: Deletes all data)
dotenv -e .env.prisma-dev -- npx prisma db push --force-reset

# Re-seed after reset
npm run db:seed:dev

# Generate Prisma client after schema changes
npx prisma generate

# Create migration (production)
npx prisma migrate dev --name migration-name
```

### Adding a New Question to the Dictionary

1. **Edit the question dictionary seed:**

```typescript
// prisma/seed/question-dictionary.ts
const entries = [
  // ... existing entries ...
  {
    key: "triage.newField",
    label: "New Field Label",
    helpText: "Description of what this field captures.",
    bindingPath: "triageStage.extendedData.newField",  // Or direct field if added to schema
    dataSource: DataSource.STAGE_SUPPLEMENT,
  },
];
```

2. **If binding to a new database field (not extendedData), update schema:**

```prisma
// prisma/schema.prisma
model TriageStage {
  // ... existing fields ...
  newField String?  // Add new field
}
```

3. **Update bindable field whitelist:**

```typescript
// src/lib/technology/constants.ts
export const TRIAGE_STAGE_BINDABLE_FIELDS = new Set<keyof TriageStage>([
  // ... existing fields ...
  'newField',
]);
```

4. **Push schema and re-seed:**

```bash
dotenv -e .env.prisma-dev -- npx prisma db push
npm run db:seed:dev
```

5. **Add field to form template via Form Builder UI or seed script**

---

## Testing Strategy

### Testing Philosophy

The platform uses a **multi-layered testing approach**:

1. **Unit Tests**: Pure functions, utilities, validation logic
2. **Integration Tests**: Database interactions, server actions
3. **Component Tests**: React components with `@testing-library/react`
4. **E2E Tests**: (Future) Full workflow tests with Playwright

### Test Structure

```
src/
├── lib/
│   ├── form-engine/
│   │   ├── validation.ts
│   │   ├── validation.test.ts         ← Unit tests co-located
│   │   ├── conditional-logic.ts
│   │   └── conditional-logic.test.ts
│   └── technology/
│       ├── service.ts
│       ├── service.hydration.test.ts  ← Integration tests
│       └── service.helpers.test.ts
├── __tests__/
│   ├── dynamic-form/
│   │   └── actions.test.ts            ← Server action tests
│   └── test-utils/
│       └── formTemplateBuilders.ts    ← Test utilities
└── components/
    └── form/
        └── DynamicFormNavigation.test.tsx  ← Component tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- validation.test.ts

# Run tests matching pattern
npm test -- --testPathPattern="form-engine"
```

### Test Database Setup

Integration tests require a separate test database:

```bash
# .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/tech_triage_test"
TEST_USER_ID="test-user"
```

```bash
# Run integration tests
npm run test:integration
```

### Writing Tests

#### Unit Test Example

```typescript
// src/lib/form-engine/validation.test.ts
import { validateRule } from './validation';

describe('validateRule', () => {
  describe('required validation', () => {
    const rule = {
      type: 'required' as const,
      message: 'This field is required',
    };

    it('should return error for undefined value', () => {
      expect(validateRule(rule, undefined)).toBe('This field is required');
    });

    it('should return error for empty string', () => {
      expect(validateRule(rule, '')).toBe('This field is required');
    });

    it('should return null for valid value', () => {
      expect(validateRule(rule, 'Valid input')).toBeNull();
    });
  });
});
```

#### Integration Test Example

```typescript
// src/__tests__/dynamic-form/actions.test.ts
import { prisma } from '@/lib/prisma';
import { submitFormResponse } from '@/app/dynamic-form/actions';

describe('submitFormResponse', () => {
  beforeEach(async () => {
    // Seed test database
    await seedTestData(prisma);
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(prisma);
  });

  it('should create technology record from form submission', async () => {
    const result = await submitFormResponse(
      {
        templateId: 'test-template',
        responses: {
          'tech.techId': 'TECH-001',
          'tech.technologyName': 'Test Technology',
          'tech.inventorName': 'Dr. Smith',
          'tech.reviewerName': 'Reviewer',
          'tech.domainAssetClass': 'Medical Devices',
        },
        repeatGroups: {},
      },
      'test-user'
    );

    expect(result.success).toBe(true);
    expect(result.submissionId).toBeDefined();

    const tech = await prisma.technology.findUnique({
      where: { techId: 'TECH-001' },
    });

    expect(tech).toBeDefined();
    expect(tech?.technologyName).toBe('Test Technology');
  });
});
```

---

## Deployment Architecture

### Production Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Application                          │
│                 (Docker Container / Vercel)                      │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Server-Side Rendering (SSR)                             │    │
│  │ - Server Actions for mutations                          │    │
│  │ - React Server Components for data fetching            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Edge Middleware                                          │    │
│  │ - Basic Auth                                             │    │
│  │ - Rate limiting (future)                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                            │
│                   (Azure Database / RDS)                         │
│                                                                   │
│  - Connection pooling via Prisma                                 │
│  - Automated backups                                             │
│  - Point-in-time recovery                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables (Production)

```bash
# Database
DATABASE_URL="postgresql://user:password@prod-host:5432/tech_triage_prod"

# Authentication
BASIC_AUTH_USERNAME="admin"
BASIC_AUTH_PASSWORD="<secure-password>"

# Next.js
NODE_ENV="production"

# Optional: Azure Blob Storage (for exports)
AZURE_STORAGE_CONNECTION_STRING="<connection-string>"

# Optional: Monitoring
SENTRY_DSN="<sentry-dsn>"
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Production runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
```

### Docker Compose (Local Production Testing)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/tech_triage
      - BASIC_AUTH_USERNAME=admin
      - BASIC_AUTH_PASSWORD=secure-password
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=tech_triage
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Database Migrations (Production)

```bash
# 1. Generate migration from schema changes
npx prisma migrate dev --name add-new-field

# 2. Review migration SQL in prisma/migrations/

# 3. Apply migration in production
npx prisma migrate deploy

# 4. Verify migration status
npx prisma migrate status
```

### Health Checks

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
```

**Health check endpoint:** `GET /api/health` (bypasses auth)

---

## Troubleshooting Guide

### Common Issues

#### 1. "No active form template found"

**Symptom:** Error when accessing `/dynamic-form`

**Cause:** No form template marked as active in database

**Solution:**

```bash
# Open Prisma Studio
npm run studio

# Navigate to FormTemplate table
# Set isActive = true for the desired template
```

Or via SQL:

```sql
UPDATE form_templates SET "isActive" = true WHERE id = 'your-template-id';
UPDATE form_templates SET "isActive" = false WHERE id != 'your-template-id';
```

#### 2. "Optimistic lock error" on form submission

**Symptom:** Form submission fails with conflict error

**Cause:** Technology/Stage record modified by another user or session

**Solution:**

```typescript
// Client should reload form data and prompt user to retry
const result = await submitFormResponse(data, userId);

if (!result.success && result.error === 'conflict') {
  // Reload form with fresh data
  const hydrated = await loadTemplateWithBindings({ techId });

  // Show user-friendly message
  toast.error('This technology was modified by another user. Please review changes and resubmit.');
}
```

#### 3. "Missing required technology fields" error

**Symptom:** Form submission fails with missing fields error

**Cause:** Required fields not populated (techId, technologyName, inventorName, reviewerName, domainAssetClass)

**Solution:**

Check `src/lib/technology/constants.ts:21`:

```typescript
export const REQUIRED_TECH_FIELDS_FOR_CREATE: Array<keyof Technology> = [
  'technologyName',
  'inventorName',
  'reviewerName',
  'domainAssetClass',
];
```

Ensure form includes questions bound to these fields.

#### 4. Binding path validation errors

**Symptom:** Seed script fails due to binding path mismatch

**Cause:** Dictionary entry binding path doesn't match schema

**Solution:**

Review and fix any mismatches in `prisma/seed/question-dictionary.ts` and ensure binding paths match the Prisma schema.

**Common mistakes:**
- `technology.techId` vs `technology.technologyId` (correct: `techId`)
- `triageStage.extendedData` without `.fieldName` suffix
- Binding to non-bindable fields (check whitelists in `constants.ts`)

#### 5. Type errors after schema changes

**Symptom:** TypeScript errors after modifying Prisma schema

**Cause:** Prisma client not regenerated

**Solution:**

```bash
# Regenerate Prisma client
npx prisma generate

# Restart TypeScript server in editor
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

#### 6. extendedData parsing errors

**Symptom:** Runtime errors when reading extendedData fields

**Cause:** Invalid JSON or missing versioned answer structure

**Solution:**

Ensure extendedData follows versioned format:

```typescript
// Correct format
{
  "triage.targetUsers": {
    "value": "Healthcare providers",
    "questionRevisionId": "rev_abc123",
    "answeredAt": "2025-12-08T10:30:00.000Z",
    "source": "triageStage"
  }
}

// Incorrect format (missing versioning metadata)
{
  "triage.targetUsers": "Healthcare providers"  // ❌ Wrong
}
```

Use `buildExtendedDataUpdates()` function to ensure correct structure.

---

## Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Binding Path** | Dot-notation path to a database field (e.g., `triageStage.missionAlignmentScore`) |
| **Dictionary Key** | Semantic identifier for a question (e.g., `triage.missionAlignmentScore`) |
| **Data Source** | Where a field's data is stored (TECHNOLOGY, STAGE_SUPPLEMENT, CALCULATED) |
| **Extended Data** | JSON column for dynamic fields with versioning metadata |
| **Hydration** | Process of pre-populating form fields with existing data |
| **Optimistic Locking** | Concurrency control using row version fields |
| **Question Revision** | Versioned snapshot of a question's definition |
| **Snapshot** | Immutable point-in-time capture of a form submission |
| **Stage Supplement** | Stage-specific data table (TriageStage, ViabilityStage) |
| **Versioned Answer** | Answer stored with questionRevisionId for freshness tracking |

### Appendix B: File Reference

#### Key Source Files

| File Path | Purpose |
|-----------|---------|
| `/prisma/schema.prisma` | Database schema definition |
| `/prisma/seed/question-dictionary.ts` | Question dictionary seed data |
| `/src/lib/technology/service.ts` | Core binding write logic, TechnologyAnswer upserts |
| `/src/lib/technology/constants.ts` | Bindable field whitelists |
| `/src/lib/technology/answer-status.ts` | Answer freshness detection |
| `/src/lib/validation/form-submission.ts` | Form validation schemas, `TechnologyIdRequiredError` |
| `/src/app/dynamic-form/actions.ts` | Server actions with TechnologyAnswer read/write paths |
| `/src/app/api/form-submissions/route.ts` | API routes for form submissions |
| `/src/lib/form-engine/types.ts` | Form engine type definitions |
| `/src/lib/form-engine/validation.ts` | Validation logic |
| `/src/lib/form-engine/conditional-logic.ts` | Conditional show/hide logic |
| `/src/lib/snapshots/capture.ts` | Snapshot capture implementation |
| `/middleware.ts` | Basic auth middleware |

#### Configuration Files

| File Path | Purpose |
|-----------|---------|
| `/package.json` | Dependencies and scripts |
| `/.env.prisma-dev` | Development environment variables |
| `/next.config.ts` | Next.js configuration |
| `/tsconfig.json` | TypeScript configuration |
| `/tailwind.config.ts` | Tailwind CSS configuration |
| `/jest.config.mjs` | Jest test configuration |

### Appendix C: Database Indexes

**Performance-critical indexes:**

```sql
-- Technology lookups
CREATE INDEX idx_technologies_techid ON technologies(tech_id);
CREATE INDEX idx_technologies_current_stage ON technologies(current_stage);

-- Form question lookups
CREATE INDEX idx_form_questions_dictionary_key ON form_questions(dictionary_key);

-- Answer freshness queries
CREATE INDEX idx_technology_answers_technology_id ON technology_answers(technology_id);
CREATE INDEX idx_technology_answers_question_key ON technology_answers(question_key);

-- Submission queries
CREATE INDEX idx_submission_snapshots_submission_id ON submission_snapshots(submission_id);
CREATE INDEX idx_submission_snapshots_technology_id ON submission_snapshots(technology_id);
CREATE INDEX idx_submission_snapshots_captured_at ON submission_snapshots(captured_at);
```

### Appendix D: Question Dictionary Structure

**Complete dictionary entry specification:**

```typescript
interface QuestionDictionaryEntry {
  key: string;                  // Semantic identifier (e.g., "triage.missionAlignmentScore")
  label: string;                // Human-readable label
  helpText?: string;            // Tooltip/help text
  bindingPath: string;          // Database path (e.g., "triageStage.missionAlignmentScore")
  dataSource: DataSource;       // TECHNOLOGY | STAGE_SUPPLEMENT | CALCULATED
  version: string;              // Dictionary version (e.g., "1.0.0")
  currentVersion: number;       // Current revision number
  currentRevisionId?: string;   // FK to current QuestionRevision
  options?: Json;               // Select options (if applicable)
  validation?: Json;            // Validation rules (if applicable)
}
```

**Naming conventions:**

- **Technology fields**: `tech.<fieldName>` (e.g., `tech.techId`, `tech.technologyName`)
- **Triage fields**: `triage.<fieldName>` (e.g., `triage.missionAlignmentScore`)
- **Viability fields**: `viability.<fieldName>` (e.g., `viability.technicalFeasibility`)

**Binding path patterns:**

- **Technology core field**: `technology.<fieldName>`
- **Stage structured field**: `triageStage.<fieldName>` or `viabilityStage.<fieldName>`
- **Stage extended field**: `triageStage.extendedData.<fieldName>` or `viabilityStage.extendedData.<fieldName>`

### Appendix E: Performance Considerations

#### Database Query Optimization

1. **Use includeBindings only when needed**
   - Loading templates without technology data is faster
   - Fetch technology data only when editing existing records

2. **Batch TechnologyAnswer writes**
   - `upsertTechnologyAnswers()` uses single transaction
   - Avoid individual upserts in loops

3. **Limit extendedData size**
   - Store only dynamic fields in extendedData
   - Promote frequently-queried fields to structured columns

4. **Index strategy**
   - Primary lookups: techId, dictionaryKey
   - Avoid over-indexing JSON columns (slow writes)

#### Client-Side Performance

1. **Progressive form rendering**
   - Render sections on-demand
   - Use React.lazy() for large repeatable groups

2. **Debounce auto-save**
   - Don't save draft on every keystroke
   - Use 1-2 second debounce

3. **Memoize computed values**
   - Use useMemo() for calculated scores
   - Cache conditional logic results

### Appendix F: Security Considerations

#### Authentication & Authorization

- **Current:** Basic HTTP Auth via middleware
- **Future:** JWT-based auth with role-based access control (RBAC)

#### Input Validation

- **Client-side:** React Hook Form + Zod schemas
- **Server-side:** Zod validation in server actions
- **Database:** Prisma type safety + field constraints

#### SQL Injection Prevention

- ✅ All queries use Prisma ORM (parameterized queries)
- ❌ No raw SQL concatenation

#### XSS Prevention

- ✅ React auto-escapes rendered content
- ✅ All user input sanitized before storage

#### CSRF Protection

- ✅ Next.js Server Actions include built-in CSRF protection
- ✅ Same-origin policy enforced

### Appendix G: Future Enhancements

**Planned features:**

1. **Stage Transition Workflow**
   - Automated snapshots on stage progression
   - Approval gates for critical transitions
   - Email notifications

2. **Advanced Reporting**
   - Technology portfolio dashboards
   - Stage completion analytics
   - Comparative scoring visualizations

3. **Audit Trail UI**
   - Visual diff between snapshots
   - Change history timeline
   - User activity logs

4. **Calculated Metrics Engine**
   - Formula-based field computation
   - Dependency graph resolution
   - Real-time score updates

5. **Role-Based Access Control**
   - Persona-based permissions (Inventor, Reviewer, Admin)
   - Stage-specific edit restrictions
   - Field-level read/write controls

6. **Bulk Operations**
   - Batch technology import from Excel
   - Bulk stage transitions
   - Mass field updates

---

## Conclusion

The Tech Triage Platform implements a **"Forms Are Virtual"** architecture where answers belong to technologies, not form submissions. This enables answer reuse across multiple forms and provides a single source of truth per technology.

Key architectural decisions include:

- **Technology-centric storage**: Answers stored as `(techId + questionKey) = value` in `TechnologyAnswer` table
- **Semantic keying**: All responses keyed by stable `dictionaryKey`, not ephemeral question IDs
- **Multi-entity binding**: Single form submission writes to Technology, TriageStage, ViabilityStage, and TechnologyAnswer tables
- **Optimistic locking**: Row versioning prevents concurrent modification conflicts
- **Answer versioning**: Question revisions enable freshness detection and audit trails
- **Immutable snapshots**: Point-in-time captures for compliance and historical analysis

The system is designed for **maintainability**, **auditability**, and **scalability**, with clear separation between form structure, business logic, and data persistence.

For questions or contributions, refer to the [CLAUDE.md](file:///home/matt/code_projects/minimal-copy/CLAUDE.md) project guide.

---

**Document Version:** 1.0
**Last Updated:** December 8, 2025
**Maintained By:** Development Team
