# Test Improvement Action Plan

## Priority Matrix

| Priority | Risk Level | Effort | When |
|----------|------------|--------|------|
| P0 - Critical | Production blockers | Quick wins | This week |
| P1 - High | Data loss / Security | 1-2 days each | Next 2 weeks |
| P2 - Medium | User-facing bugs | 2-4 days each | This month |
| P3 - Low | Technical debt | Ongoing | Next quarter |

---

## Phase 0: Quick Wins (Day 1)
**Time: 2-4 hours | Impact: Immediate protection**

### 0.1 Raise Coverage Thresholds
Stop the bleeding - prevent new untested code from merging.

```javascript
// jest.config.mjs - Change from:
coverageThreshold: {
  global: {
    statements: 30,
    branches: 25,
    functions: 20,
    lines: 30,
  },
}

// To:
coverageThreshold: {
  global: {
    statements: 50,  // Raise gradually: 50 → 60 → 70
    branches: 45,
    functions: 40,
    lines: 50,
  },
}
```

### 0.2 Fix Pre-existing Test Errors
```bash
# These type errors in actions.test.ts need fixing:
src/__tests__/dynamic-form/actions.test.ts(134,5): error TS1117: duplicate properties
src/__tests__/dynamic-form/actions.test.ts(142,5): error TS1117: duplicate properties
src/__tests__/dynamic-form/actions.test.ts(502,17): error TS1117: duplicate properties
```

### 0.3 Add Pre-commit Hook
```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["npm run type-check", "npm test -- --findRelatedTests --passWithNoTests"]
}
```

---

## Phase 1: Critical Security & Data (Week 1)
**Time: 16-24 hours | Risk: Security breach, data loss**

### 1.1 Authentication Middleware Tests (P0)
**File to create:** `middleware.test.ts`
**Time:** 2-3 hours

Test cases needed:
- [ ] Allows access with valid credentials
- [ ] Blocks access with invalid credentials
- [ ] Blocks access with missing credentials
- [ ] Excludes `/api/health` from auth
- [ ] Returns proper 401 response format

### 1.2 Main Form Page Tests (P0)
**File to create:** `src/app/dynamic-form/page.test.tsx`
**Time:** 8-12 hours

This 453-line component needs tests for:
- [ ] Loads template successfully
- [ ] Handles template load failure gracefully
- [ ] Loads existing draft when draftId provided
- [ ] Handles draft load failure
- [ ] Shows loading state while fetching
- [ ] Detects and displays version conflicts
- [ ] Navigates to drafts page after save
- [ ] Navigates to submissions page after submit

### 1.3 Draft Persistence Integration Test (P0)
**File:** `tests/integration/draft-lifecycle.test.ts`
**Time:** 4-6 hours

Test the complete draft lifecycle:
- [ ] Create new draft → verify saved
- [ ] Load draft → verify data matches
- [ ] Update draft → verify changes persisted
- [ ] Submit draft → verify status changes
- [ ] Concurrent edit detection works

---

## Phase 2: User-Facing Features (Week 2-3)
**Time: 24-32 hours | Risk: Broken UI, invalid data**

### 2.1 Field Adapters Tests (P1)
**File to create:** `src/lib/form-engine/fields/FieldAdapters.test.tsx`
**Time:** 8-10 hours

Every field type needs basic tests:
- [ ] SHORT_TEXT renders and captures input
- [ ] LONG_TEXT renders and captures input
- [ ] INTEGER validates numeric input
- [ ] SINGLE_SELECT shows options, captures selection
- [ ] MULTI_SELECT allows multiple selections
- [ ] CHECKBOX_GROUP renders all options
- [ ] DATE renders date picker, formats correctly
- [ ] SCORING_0_3 renders scale, captures value
- [ ] REPEATABLE_GROUP adds/removes rows
- [ ] DATA_TABLE_SELECTOR loads and displays data

### 2.2 PDF Export Verification (P1)
**File to create:** `src/lib/form-engine/pdf/pdf-output.test.ts`
**Time:** 4-6 hours

Remove mock, test real output:
- [ ] PDF contains all section titles
- [ ] PDF contains all question labels
- [ ] PDF contains all answer values
- [ ] PDF handles empty sections correctly
- [ ] PDF handles special characters
- [ ] Scoring matrix renders correctly

### 2.3 Form Validation UI Tests (P1)
**File to create:** `src/components/form/FormValidation.test.tsx`
**Time:** 4-6 hours

- [ ] Required field shows error when empty
- [ ] Error clears when field is filled
- [ ] Multiple errors display correctly
- [ ] Error scrolls field into view
- [ ] Submit blocked until errors resolved

### 2.4 Builder Actions Tests (P2)
**File to create:** `src/app/dynamic-form/builder/actions.test.ts`
**Time:** 4-6 hours

- [ ] Create new template
- [ ] Add section to template
- [ ] Add question to section
- [ ] Reorder questions
- [ ] Delete question
- [ ] Publish template

### 2.5 Library Actions Tests (P2)
**File to create:** `src/app/dynamic-form/library/actions.test.ts`
**Time:** 4-6 hours

- [ ] List all questions
- [ ] Create new question
- [ ] Update question creates new revision
- [ ] Delete question (soft delete)
- [ ] Search/filter questions

---

## Phase 3: E2E Tests (Week 3-4)
**Time: 16-24 hours | Risk: Workflow breakage**

### 3.1 Install Playwright
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 3.2 Core Workflow E2E Tests
**File to create:** `e2e/form-submission.spec.ts`
**Time:** 8-12 hours

```typescript
test('complete form submission workflow', async ({ page }) => {
  // Login
  await page.goto('/dynamic-form');
  await page.fill('[name="username"]', 'testuser');
  await page.fill('[name="password"]', 'testpass');

  // Fill form
  await page.selectOption('[data-testid="template-select"]', 'triage');
  await page.fill('[data-dictionary-key="triage.technologyName"]', 'Test Tech');
  // ... fill required fields

  // Submit
  await page.click('button:has-text("Submit")');
  await expect(page).toHaveURL(/submissions/);

  // Verify in submissions list
  await expect(page.locator('text=Test Tech')).toBeVisible();
});
```

### 3.3 PDF Download E2E Test
**Time:** 4-6 hours

```typescript
test('export form to PDF', async ({ page }) => {
  // Navigate to completed submission
  // Click export
  // Verify PDF downloads
  // Verify PDF is valid (not corrupted)
});
```

### 3.4 Draft Recovery E2E Test
**Time:** 4-6 hours

```typescript
test('recovers draft after browser close', async ({ page, context }) => {
  // Start filling form
  // Close browser (simulate crash)
  // Reopen
  // Verify draft loads with data intact
});
```

---

## Phase 4: Infrastructure (Ongoing)
**Time: 8-12 hours | Risk: Regression creep**

### 4.1 GitHub Actions Workflow
**File to create:** `.github/workflows/test.yml`

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test -- --coverage --ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          fail_ci_if_error: true

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### 4.2 Coverage Tracking
- Set up Codecov or Coveralls
- Add coverage badge to README
- Configure coverage trend alerts

### 4.3 Test Database Isolation
```bash
# Create separate test database
# Add to .env.test
DATABASE_URL="postgresql://localhost:5432/techtriage_test"
```

```json
// package.json
"test:integration": "dotenv -e .env.test -- jest --config jest.integration.config.js"
```

---

## Execution Schedule

### Week 1 (16-20 hours)
| Day | Task | Hours |
|-----|------|-------|
| Mon | Phase 0: Quick wins | 3 |
| Mon | 1.1: Middleware tests | 3 |
| Tue-Wed | 1.2: Main page tests | 10 |
| Thu | 1.3: Draft integration | 4 |

### Week 2 (20-24 hours)
| Day | Task | Hours |
|-----|------|-------|
| Mon-Tue | 2.1: Field adapters | 10 |
| Wed | 2.2: PDF verification | 5 |
| Thu | 2.3: Validation UI | 5 |

### Week 3 (16-20 hours)
| Day | Task | Hours |
|-----|------|-------|
| Mon | 2.4: Builder actions | 5 |
| Tue | 2.5: Library actions | 5 |
| Wed-Thu | 3.1-3.2: E2E setup + core workflow | 10 |

### Week 4 (12-16 hours)
| Day | Task | Hours |
|-----|------|-------|
| Mon | 3.3-3.4: E2E edge cases | 8 |
| Tue-Wed | 4.1-4.3: CI/CD infrastructure | 8 |

---

## Success Metrics

### After Phase 1 (Week 1)
- [ ] Coverage thresholds at 50%
- [ ] No type errors in tests
- [ ] Auth middleware tested
- [ ] Main form page tested
- [ ] Pre-commit hook active

### After Phase 2 (Week 3)
- [ ] Coverage thresholds at 60%
- [ ] All field types tested
- [ ] PDF output verified
- [ ] Form validation tested
- [ ] Builder/library actions tested

### After Phase 3-4 (Week 4)
- [ ] Coverage thresholds at 70%
- [ ] 3+ E2E tests passing
- [ ] CI/CD pipeline active
- [ ] Coverage tracking enabled
- [ ] Test database isolated

---

## Commands Reference

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPatterns="middleware"

# Run integration tests (requires DB)
RUN_INTEGRATION_TESTS=true npm test

# Run E2E tests (after setup)
npm run test:e2e

# Type check
npm run type-check

# See plain english report
cat tests/results/test-report.md
```

---

## Notes

1. **Start with Phase 0** - the quick wins provide immediate value
2. **Don't skip Phase 1** - these are actual production risks
3. **Phase 2 can be parallelized** - different developers can work on different parts
4. **Phase 3-4 are ongoing** - add E2E tests as you build features

The goal is not 100% coverage, but **confidence in critical paths**.
