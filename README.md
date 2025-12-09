# Tech Triage Platform

A Next.js 15 application for evaluating and tracking technology commercialization through a multi-stage workflow.

## Overview

Technologies progress through lifecycle stages:
```
TRIAGE → VIABILITY → COMMERCIAL → MARKET_READY
```

Each stage captures assessment data through dynamic forms, with all answers stored centrally against the Technology entity.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (local instance on ports 51213-51215)

### Development Setup

**Two terminals required:**

```bash
# Terminal 1: Start Prisma local database proxy (MUST run first)
npx prisma dev

# Terminal 2: Start Next.js dev server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

> **Note:** The project uses Prisma Platform's local development setup. The dev server will fail with "fetch failed" errors if `npx prisma dev` is not running.

### First-Time Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Seed the database (optional)
npm run db:seed:dev
```

## Technology Stack

- **Framework:** Next.js 15 with Turbopack
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Testing:** Jest with React Testing Library
- **Validation:** Zod

## Key Concepts

### "Forms Are Virtual" Architecture

Answers belong to technologies, not form submissions. This enables:
- **Answer reuse** across multiple forms
- **Pre-filling** any form with existing technology data
- **Audit trails** per technology, not per submission

Storage pattern: `(techId + questionKey) = value`

### Question Dictionary

Form fields bind to database entities via semantic keys:
- `triage.missionAlignmentScore` → `triageStage.missionAlignmentScore`
- `tech.name` → `technology.name`

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   └── dynamic-form/      # Form pages & builder
├── components/            # React components
│   ├── form/             # Form display components
│   ├── form-builder/     # Form builder UI
│   └── ui/               # shadcn/ui components
└── lib/                   # Core libraries
    ├── form-engine/      # Form rendering & validation
    ├── technology/       # Technology service & types
    └── snapshots/        # Submission snapshots

prisma/
├── schema.prisma         # Database schema
└── seed/                 # Seed data & Question Dictionary
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run type-check       # TypeScript validation
npm run lint             # ESLint

# Testing
npm test                 # Run all tests
npm run test:coverage    # Coverage report

# Database
npx prisma dev           # Start local database proxy
npm run studio           # Prisma Studio
npx prisma generate      # Regenerate client after schema changes
npx prisma migrate dev   # Create/apply migrations
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | AI assistant context and project overview |
| [TECHNICAL-MANUAL.md](TECHNICAL-MANUAL.md) | Comprehensive technical documentation |
| [PLAIN-ENGLISH-GUIDE.md](PLAIN-ENGLISH-GUIDE.md) | Non-technical explanation of the system |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to this project |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |

### Architecture Documents

| Document | Description |
|----------|-------------|
| [1-ARCHITECTURE_ROADMAP.md](1-ARCHITECTURE_ROADMAP.md) | Current state and future vision |
| [2-shared-answer-architecture.md](2-shared-answer-architecture.md) | Core philosophy: "One technology, many forms, shared answers" |
| [3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md](3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md) | Complete blueprint for the Technology aggregate |

## Environment Variables

Key environment files:
- `.env.prisma-dev` - Development database configuration
- `.env` - Production configuration

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BASIC_AUTH_USERNAME` - Auth username
- `BASIC_AUTH_PASSWORD` - Auth password

## License

Private - All rights reserved.
