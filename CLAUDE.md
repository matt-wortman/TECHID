# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tech Triage Platform - A Next.js 15 application for evaluating and tracking technology commercialization through a multi-stage workflow. Technologies progress through lifecycle stages (TRIAGE → VIABILITY → COMMERCIAL → MARKET_READY) with form-based assessments.

## Starting Development Environment

**Two terminals required:**

```bash
# Terminal 1: Start Prisma local database proxy (MUST run first)
npx prisma dev

# Terminal 2: Start Next.js dev server
npm run dev
```

The project uses Prisma Platform's local development setup (`prisma+postgres://` protocol). The `npx prisma dev` command starts a local proxy on port 51213 that connects to PostgreSQL on port 51214. **The dev server will fail with "fetch failed" errors if `npx prisma dev` is not running.**

## Common Commands

```bash
# Development
npm run dev                    # Start dev server (uses Turbopack + .env.prisma-dev)
npm run type-check             # TypeScript validation (tsc --noEmit)
npm run lint                   # ESLint

# Testing
npm test                       # Run Jest tests
npm test -- --testPathPattern="pattern"  # Run specific tests
npm run test:integration       # Integration tests (requires test database)
npm run test:coverage          # Coverage report

# Database
npx prisma dev                 # Start local database proxy (REQUIRED for dev)
npm run studio                 # Prisma Studio (dev environment)
npm run db:seed:dev            # Seed development database
npx prisma generate            # Regenerate Prisma client after schema changes
npx prisma migrate dev         # Create/apply migrations (requires npx prisma dev running)
```

## Architecture

### 🚨 Critical Architecture Documents (MUST READ)
Before making architectural changes, you MUST read these foundational documents:

1. **[shared-answer-architecture.md](shared-answer-architecture.md)** - Core philosophy: "One technology, many forms, shared answers." Explains that forms are **virtual representations** of question groups, and answers are keyed by `(techId, questionKey)` not per-submission.

2. **[TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md](TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md)** - Complete blueprint for Technology aggregate, stage supplements, Question Dictionary, binding paths, personas, and migration strategy.

3. **[ARCHITECTURE_ROADMAP.md](ARCHITECTURE_ROADMAP.md)** - Current state, in-flight work, and future vision. Technology aggregate holds canonical data keyed by `techId`.

**Key Principle:** `techId` is the business identifier that anchors ALL data. Forms are just assembled views that pull questions from the Question Dictionary. Section codes and form-specific identifiers should NOT be primary organizational concepts.

### Forms Are Virtual: Technology-Centric Data Storage

The application uses a **"Forms Are Virtual"** architecture where form submissions are ephemeral UI events, but answers are stored permanently against the Technology entity. This enables:

- **Technology-centric data**: All answers belong to a technology, not a form submission
- **Form independence**: The same answer can appear across multiple forms without duplication
- **Answer reuse**: Pre-fill any form with existing technology answers
- **Audit trail**: Track answer history per technology, not per submission

**Key Storage Pattern:**
- **TechnologyAnswer** table - `(techId + questionKey) = value` is the single source of truth for all form answers
- FormSubmission tracks metadata (status, timestamps, user) but answers live in TechnologyAnswer

### Data Binding System (Core Pattern)

The application uses a **Question Dictionary** pattern to bind form fields to database entities:

1. **QuestionDictionary** (`prisma/seed/question-dictionary.ts`) - Maps semantic keys like `triage.missionAlignmentScore` to database binding paths like `triageStage.missionAlignmentScore`
2. **BindingMetadata** (`src/lib/technology/service.ts`) - Runtime resolution of dictionary entries to actual database fields
3. **Data Sources**: `TECHNOLOGY` (core fields), `STAGE_SUPPLEMENT` (stage-specific data), `CALCULATED` (computed values)

Form responses are keyed by `dictionaryKey` (e.g., `triage.missionAlignmentScore`), not by question ID.

### Technology Lifecycle

```
Technology (core entity)
├── TriageStage (triage evaluation data + extendedData JSON)
├── ViabilityStage (viability assessment + extendedData JSON)
├── TechnologyAnswer[] (versioned answers linked to QuestionRevision)
└── FormSubmission[] (form responses with snapshots)
```

- Stage-specific data stored in dedicated tables (TriageStage, ViabilityStage)
- Extended/dynamic fields stored in `extendedData` JSON column
- **Optimistic Locking**: Uses `rowVersion` fields to detect concurrent modifications

### Form Engine (`src/lib/form-engine/`)

- **types.ts** - Core type definitions (FormTemplateWithSections, FieldType enum, etc.)
- **validation.ts** - Zod-based field validation
- **conditional-logic.ts** - Show/hide rules for form fields
- **field-mappings-simple.ts** - Maps FieldType enum to React components

### Server Actions (`src/app/dynamic-form/actions.ts`)

Primary entry points for form operations:
- `submitFormResponse()` - Submit completed form and write to TechnologyAnswer
- `saveDraftResponse()` - Save draft (with upsert logic)
- `loadDraftResponse()` - Reload draft with answer metadata from TechnologyAnswer
- `applyBindingWrites()` - Core function that writes form responses to Technology/Stage/TechnologyAnswer tables

### Snapshot System (`src/lib/snapshots/`)

Captures immutable point-in-time snapshots on form submission for audit trail.

## Key Files

- `prisma/schema.prisma` - Database schema with all models
- `src/lib/technology/service.ts` - Template hydration, binding writes, TechnologyAnswer upserts
- `src/lib/technology/answer-status.ts` - Tracks answer freshness vs question revisions
- `src/lib/technology/constants.ts` - Bindable field whitelists
- `src/app/dynamic-form/actions.ts` - Server actions with TechnologyAnswer read/write logic
- `src/lib/validation/form-submission.ts` - Includes TechnologyIdRequiredError
- `middleware.ts` - Basic auth protection (excludes `/api/health`)

## Testing Patterns

- Unit tests co-located with source (e.g., `validation.test.ts` next to `validation.ts`)
- Integration tests in `tests/integration/`
- Test utilities in `src/__tests__/test-utils/`
- Uses Jest with jsdom environment

## Environment Setup

Requires PostgreSQL. Key env files:
- `.env.prisma-dev` - Development database (used by `npm run dev`)
- `.env` - Production/default configuration

Auth: `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` environment variables.
