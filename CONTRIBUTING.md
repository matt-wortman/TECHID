# Contributing to Tech Triage Platform

## Development Setup

See [README.md](README.md) for quick start instructions.

### Required: Two Terminal Setup

```bash
# Terminal 1 - Database proxy (keep running)
npx prisma dev

# Terminal 2 - Dev server
npm run dev
```

## Code Standards

### TypeScript

- Strict mode enabled
- No `any` types without justification
- Run `npm run type-check` before committing

### Testing

- Unit tests co-located with source files (`*.test.ts`)
- Integration tests in `tests/integration/`
- Run `npm test` before committing

### Linting

```bash
npm run lint
```

## Architecture Principles

### Before Making Changes

1. Read [CLAUDE.md](CLAUDE.md) for project context
2. Read [2-shared-answer-architecture.md](2-shared-answer-architecture.md) for core philosophy
3. Understand the "Forms Are Virtual" pattern

### Key Principles

1. **`techId` is the anchor**: All data belongs to a Technology, keyed by `techId`
2. **Answers stored in TechnologyAnswer**: NOT in form submissions
3. **Forms are views**: They pull questions from the Question Dictionary
4. **No section-code organization**: Don't use section codes as primary keys

### Data Binding Pattern

Form responses use dictionary keys, not database column names:
```typescript
// Good - semantic key
responses['triage.missionAlignmentScore']

// Bad - direct column access
responses['missionAlignmentScore']
```

## Git Workflow

### Branching

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code improvements

### Commit Messages

Use conventional commits:
```
feat: add new form field type
fix: resolve draft loading issue
refactor: simplify binding write logic
docs: update API reference
test: add coverage for edge case
```

### Pull Requests

1. Ensure all tests pass: `npm test`
2. Ensure types check: `npm run type-check`
3. Ensure lint passes: `npm run lint`
4. Update documentation if needed
5. Request review

## Database Changes

### Schema Changes

1. Modify `prisma/schema.prisma`
2. Start the database proxy: `npx prisma dev`
3. Create migration: `npx prisma migrate dev --name descriptive-name`
4. Regenerate client: `npx prisma generate`
5. Update seed data if needed

### Question Dictionary Changes

The Question Dictionary (`prisma/seed/question-dictionary.ts`) maps form fields to database bindings. Changes here affect:
- Form field binding
- Pre-fill behavior
- Answer storage paths

## Testing Guidelines

### Unit Tests

```typescript
// Co-locate with source
src/lib/form-engine/validation.ts
src/lib/form-engine/validation.test.ts
```

### Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

## Common Tasks

### Adding a New Form Field Type

1. Add to `FieldType` enum in `src/lib/form-engine/types.ts`
2. Add validation in `src/lib/form-engine/validation.ts`
3. Add component mapping in `src/lib/form-engine/field-mappings-simple.ts`
4. Add tests for the new type

### Adding a New API Route

1. Create route file in `src/app/api/[route]/route.ts`
2. Add corresponding test file
3. Document in `docs/API_REFERENCE.md`

### Adding to Question Dictionary

1. Edit `prisma/seed/question-dictionary.ts`
2. Add entry with semantic key and binding path
3. Run seed: `npm run db:seed:dev`

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.

## Questions?

- Check existing documentation first
- Review recent commits for context
- Ask in the team channel
