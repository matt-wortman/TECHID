# Developer Onboarding Guide

Welcome to the Tech Triage Platform! This guide will help you get up and running quickly.

## Prerequisites

Before you start, ensure you have:

- **Node.js 18+** - Check with `node --version`
- **npm 9+** - Check with `npm --version`
- **PostgreSQL** - Local instance running on ports 51213-51215
- **Git** - For version control

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd tech-triage-platform

# Install dependencies
npm install
```

## Step 2: Environment Setup

The project uses two environment files:

| File | Purpose |
|------|---------|
| `.env.prisma-dev` | Development database (primary) |
| `.env` | Production/default configuration |

Ensure `.env.prisma-dev` has the correct database URL:
```
DATABASE_URL="prisma+postgres://localhost:51213/?api_key=..."
```

## Step 3: Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Seed the database with initial data
npm run db:seed:dev
```

## Step 4: Start Development Environment

**You need TWO terminals:**

### Terminal 1: Database Proxy
```bash
npx prisma dev
```

Keep this running. It starts the Prisma Platform local proxy on port 51213.

### Terminal 2: Dev Server
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

> **Important:** If you see "fetch failed" errors, check that Terminal 1 is still running `npx prisma dev`.

## Step 5: Verify Setup

1. Open [http://localhost:3000](http://localhost:3000)
2. You should see the home page
3. Navigate to Dynamic Form to test the form system
4. Check the Drafts page to see saved drafts

## Project Structure Overview

```
src/
├── app/                      # Next.js app router
│   ├── api/                  # REST API endpoints
│   │   ├── form-templates/   # Template loading
│   │   ├── form-submissions/ # Submission CRUD
│   │   ├── feedback/         # User feedback
│   │   └── health/           # Health check
│   └── dynamic-form/         # Form pages
│       ├── page.tsx          # Form entry point
│       ├── actions.ts        # Server Actions (primary API)
│       ├── builder/          # Form builder UI
│       ├── drafts/           # Draft management
│       ├── submissions/      # Submission history
│       └── library/          # Question library
│
├── components/               # React components
│   ├── form/                # Form display components
│   ├── form-builder/        # Builder UI components
│   └── ui/                  # shadcn/ui base components
│
├── lib/                      # Core libraries
│   ├── form-engine/         # Form rendering engine
│   │   ├── types.ts         # Type definitions
│   │   ├── renderer.tsx     # Form renderer
│   │   ├── validation.ts    # Field validation
│   │   └── conditional-logic.ts
│   │
│   ├── technology/          # Technology service
│   │   ├── service.ts       # Main service (bindings, writes)
│   │   ├── types.ts         # Type definitions
│   │   └── constants.ts     # Bindable field whitelists
│   │
│   └── snapshots/           # Submission snapshots
│
└── __tests__/               # Test utilities

prisma/
├── schema.prisma            # Database schema
├── migrations/              # Migration history
└── seed/                    # Seed data
    ├── index.ts             # Main seed script
    └── question-dictionary.ts  # Question → binding mappings
```

## Key Concepts to Understand

### 1. "Forms Are Virtual"

The most important concept: **answers belong to Technologies, not to form submissions**.

```
Technology (techId: "TECH-001")
├── TechnologyAnswer (questionKey: "tech.name", value: "My Tech")
├── TechnologyAnswer (questionKey: "triage.score", value: 85)
└── FormSubmission[] (just metadata - status, timestamps)
```

This means:
- The same answer can appear on multiple forms
- Forms are just "views" that assemble questions
- Pre-filling works automatically

### 2. Question Dictionary

Form fields don't directly map to database columns. Instead:

```
Form Field → Dictionary Key → Binding Path → Database

"Technology Name" → "tech.name" → "technology.name" → Technology.name
"Mission Score" → "triage.missionAlignmentScore" → "triageStage.missionAlignmentScore"
```

See `prisma/seed/question-dictionary.ts` for all mappings.

### 3. Server Actions vs API Routes

- **Server Actions** (`src/app/dynamic-form/actions.ts`) - Primary interface for form operations
- **API Routes** (`src/app/api/`) - REST endpoints for external access

Most form operations go through Server Actions, which handle answer storage via `applyBindingWrites()`.

### 4. Technology Lifecycle

```
TRIAGE → VIABILITY → COMMERCIAL → MARKET_READY
```

Each stage has:
- Dedicated database table (TriageStage, ViabilityStage)
- Stage-specific form questions
- Extended data in JSON columns

## Common Development Tasks

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- --testPathPattern="validation"

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Type Checking

```bash
npm run type-check
```

Run this before committing!

### Database Operations

```bash
# View/edit data
npm run studio

# Create migration after schema changes
npx prisma migrate dev --name descriptive-name

# Reset database (DESTRUCTIVE)
npx prisma migrate reset

# Re-seed data
npm run db:seed:dev
```

### Adding a New Form Field

1. Add to `FieldType` enum in `src/lib/form-engine/types.ts`
2. Add validation in `src/lib/form-engine/validation.ts`
3. Add component in `src/lib/form-engine/field-mappings-simple.ts`
4. Write tests

### Adding to Question Dictionary

1. Edit `prisma/seed/question-dictionary.ts`
2. Add entry with semantic key and binding path
3. Run `npm run db:seed:dev`

## Debugging Tips

### Check Database Connection

```bash
# Health check
curl http://localhost:3000/api/health
```

### View Server Logs

Terminal 2 (dev server) shows:
- API request logs
- Server Action execution
- Prisma queries (in dev mode)

### Browser DevTools

- Network tab: See API calls
- Console: Client-side errors
- React DevTools: Component state

### Prisma Studio

```bash
npm run studio
```

Opens a GUI to browse/edit database records.

## Getting Help

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
2. Read [TECHNICAL-MANUAL.md](../TECHNICAL-MANUAL.md) for deep dives
3. Check [CLAUDE.md](../CLAUDE.md) for AI assistant context
4. Ask in the team channel

## Next Steps

After completing setup:

1. **Explore the UI** - Navigate through all pages
2. **Create a draft** - Fill out a form and save as draft
3. **Read the architecture docs** - Understand the "why"
4. **Run the tests** - See how testing works
5. **Make a small change** - Get comfortable with the workflow

Welcome to the team!
