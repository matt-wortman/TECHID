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

See [docs/README.md](docs/README.md) for a complete documentation index.

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | AI assistant context and project overview |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to this project |

### Quick Links

| Category | Key Documents |
|----------|---------------|
| **Onboarding** | [PLAIN-ENGLISH-GUIDE.md](docs/onboarding/PLAIN-ENGLISH-GUIDE.md), [DEVELOPER_ONBOARDING.md](docs/onboarding/DEVELOPER_ONBOARDING.md) |
| **Architecture** | [shared-answer-architecture.md](docs/architecture/2-shared-answer-architecture.md), [TECHNICAL-MANUAL.md](docs/architecture/TECHNICAL-MANUAL.md) |
| **Ops** | [TROUBLESHOOTING.md](docs/ops/TROUBLESHOOTING.md) |
| **API** | [API_REFERENCE.md](docs/api/API_REFERENCE.md) |

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
