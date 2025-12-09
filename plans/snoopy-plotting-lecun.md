# Migration Verification Test Plan

**Goal**: Prove to a senior engineer that the `fieldCode → dictionaryKey` migration and `TechnologyAnswer` shared answers architecture are complete and working.

---

## Test Execution Plan

### Tier 1: Core Migration Proof (4 tests)

```bash
npm test -- applyBindingWrites.test.ts
npm test -- service.hydration.test.ts
npm test -- service.helpers.test.ts
npm test -- answer-status.test.ts
```

**What these prove:**
- Binding writes use `dictionaryKey` as the key
- Template hydration loads binding metadata by `dictionaryKey`
- Data transformation utilities work with new schema
- Answer versioning tracks correctly

### Tier 2: Integration Proof (2 tests)

```bash
npm test -- actions.test.ts
npx tsx scripts/catalog/validate-binding-paths.ts
```

**What these prove:**
- Full form submission flow works end-to-end
- All QuestionDictionary entries have valid binding paths

### Tier 3: Type Safety & Full Suite

```bash
npm run type-check
npm test
```

**What these prove:**
- No type errors after `fieldCode` column removal
- No regressions across entire test suite (131+ tests)

---

## Success Criteria

| Check | Expected Result |
|-------|-----------------|
| Tier 1 tests | All 4 test files pass |
| Tier 2 tests | actions.test.ts passes, catalog validator reports 0 errors |
| Type-check | Exit code 0, no errors |
| Full test suite | All tests pass |

---

## Files Involved

- `src/__tests__/technology/applyBindingWrites.test.ts`
- `src/__tests__/technology/service.hydration.test.ts`
- `src/__tests__/technology/service.helpers.test.ts`
- `src/__tests__/technology/answer-status.test.ts`
- `src/__tests__/dynamic-form/actions.test.ts`
- `scripts/catalog/validate-binding-paths.ts`
