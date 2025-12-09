# Test Coverage Improvement Plan

## Scope: Critical Phases Only (1-2)
- Phase 1: Scoring calculations tests
- Phase 2: PDF serialization tests

---

## Current State Assessment

### Test Infrastructure
- **Framework:** Jest 30.1.3 with jsdom environment
- **Total test files:** 24
- **Coverage thresholds:** 30% statements, 25% branches, 20% functions, 30% lines
- **Test patterns:** Unit tests co-located with source, integration tests in `tests/integration/`

### Coverage Summary
| Category | Modules | Coverage | Priority |
|----------|---------|----------|----------|
| Core business logic | 4 | 75% | HIGH |
| Scoring/calculations | 1 | 0% | **CRITICAL** |
| PDF/export | 1 | 0% | **CRITICAL** |
| Validation | 3 | 100% | Good |
| Form engine | 6 | 50% | MEDIUM |
| API routes | 5 | 80% | Good |
| Server actions | 3 | 67% | MEDIUM |

---

## Critical Gaps Identified

### 1. CRITICAL: `src/lib/scoring/calculations.ts` (0% coverage)
- **Risk:** Business-critical scoring logic affects technology recommendations
- **Missing tests:**
  - `calculateMarketScore()` - no boundary tests
  - `calculateImpactScore()` - no weighted blend validation
  - `calculateValueScore()` - no edge case handling
  - `calculateOverallScore()` - no rounding behavior tests
  - `calculateRecommendation()` - no threshold boundary tests (2.0, 2.5, 2.99)

### 2. CRITICAL: `src/lib/form-engine/pdf/serialize.ts` (0% coverage)
- **Risk:** Complex PDF generation with no coverage
- **Missing tests:**
  - Empty sections handling
  - Conditional field hiding in exports
  - Repeatable group serialization
  - Scoring matrix rendering

### 3. HIGH: Form Builder Actions (no direct tests)
- `src/app/dynamic-form/builder/actions.ts`
- `src/app/dynamic-form/library/actions.ts`

### 4. MEDIUM: Integration Test Gaps
- No multi-stage workflow tests (TRIAGE → VIABILITY)
- No concurrent editing scenarios
- No error recovery tests

---

## Well-Covered Areas (No Action Needed)
- ✅ `src/lib/form-engine/validation.ts` - Comprehensive tests
- ✅ `src/lib/form-engine/conditional-logic.ts` - Good coverage
- ✅ `src/lib/technology/service.ts` - 3 test files covering core logic
- ✅ `src/lib/technology/answer-status.ts` - Core logic tested
- ✅ `src/app/dynamic-form/actions.ts` - Good unit test coverage

---

## Implementation Plan

### Phase 1: CRITICAL - Scoring Calculations Tests
**File:** `src/lib/scoring/calculations.test.ts` (co-located)
**Complexity:** Simple (pure functions, no mocking)
**Dependencies:** None

Test cases:
```
describe('calculateMarketScore')
  - Minimum boundary: (0, 0, 0) → 0
  - Maximum boundary: (3, 3, 3) → 3
  - Average calculation: (1, 2, 3) → 2
  - Rounding to 2 decimals: (1, 1, 2) → 1.33

describe('calculateImpactScore')
  - 50/50 weighting: (2, 2) → 2
  - Asymmetric: (0, 3) → 1.5
  - Max: (3, 3) → 3

describe('calculateValueScore')
  - 50/50 weighting with market score
  - Rounding behavior

describe('calculateRecommendation') [CRITICAL]
  - High-High (>67%): (2.5, 2.5) → "Proceed"
  - High-Medium: (2.5, 1.5) → "Proceed"
  - Medium-High: (1.5, 2.5) → "Proceed"
  - Medium-Medium: (1.5, 1.5) → "Consider Alternative Pathway"
  - Low-Any: (0.5, 2.5) → "Consider Alternative Pathway"
  - Very-Low: (0.3, 0.3) → "Close"
  - Boundary: (2.01, 2.01) → exact threshold test

describe('extractScoringInputs')
  - Maps dictionary keys correctly
  - Defaults missing keys to 0
  - Coerces non-numeric values

describe('getRecommendationColor')
  - Returns correct CSS classes for each recommendation
```

---

### Phase 2: CRITICAL - PDF Serialization Tests
**File:** `src/lib/form-engine/pdf/serialize.test.ts` (co-located)
**Complexity:** Medium (requires mock templates/responses)
**Dependencies:** Uses test-utils from `src/lib/form-engine/test-utils.ts`

Test cases:
```
describe('buildPrintableForm')
  - Filters empty sections
  - Orders sections by `order` field
  - Maps metadata correctly

describe('buildPrintableSection')
  - Orders questions by `order` field
  - Filters null questions (hidden/INFO_BOX)

describe('buildPrintableQuestion')
  - Returns null for INFO_BOX fields
  - Returns null for hidden conditional fields
  - Handles REPEATABLE_GROUP type
  - Handles DATA_TABLE_SELECTOR type
  - Formats standard fields

describe('formatAnswer')
  - MULTI_SELECT: joins with commas
  - SINGLE_SELECT: resolves option labels
  - null/undefined → empty string

describe('formatStructuredValue')
  - boolean → "Yes"/"No"
  - number → string (handles NaN/Infinity)
  - array → comma-joined
  - object → key: value pairs

describe('buildScoringMatrix')
  - Constructs IMPACT section with 50% weights
  - Constructs VALUE section with 50% weights
  - Includes market sub-criteria
  - Formats scores to 2 decimals

describe('clampScore')
  - Clamps negative → 0
  - Clamps >3 → 3
  - Handles NaN/undefined → 0
```

---

---

## Files to Create (In Scope)

| Priority | File Path | Lines Est. | Complexity |
|----------|-----------|------------|------------|
| 1 | `src/lib/scoring/calculations.test.ts` | ~200 | Simple |
| 2 | `src/lib/form-engine/pdf/serialize.test.ts` | ~350 | Medium |

## Expected Coverage Impact
- Critical business logic: **0% → 95%**
- `calculations.ts`: 0% → ~95% (220/232 lines)
- `serialize.ts`: 0% → ~90% (390/430 lines)

---

## Future Phases (Deferred)

| Phase | File | Status |
|-------|------|--------|
| 3 | `builder/actions.test.ts` | Deferred |
| 4 | `library/actions.test.ts` | Deferred |
| 5 | Integration tests | Deferred |

