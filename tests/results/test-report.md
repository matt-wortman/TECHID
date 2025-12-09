# Test Results Report

**Generated:** Monday, December 8, 2025 at 06:15 PM

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Status** | ⚠️ PASSING (with skipped tests) |
| **Pass Rate** | 94.4% |
| **Total Tests** | 447 |
| **Passed** | 422 |
| **Failed** | 0 |
| **Skipped** | 25 |
| **Test Suites** | 28/32 passing |

**Summary:** All executed tests pass, but 25 test(s) are skipped.

---

## Health Assessment

### Test Coverage by Area

| Area | Tests | Status | What It Tests |
|------|-------|--------|---------------|
| Technology Service | 29/29 | ✅ | Data binding, hydration, and technology lifecycle management |
| API Routes | 25/25 | ✅ | HTTP endpoints for form templates, submissions, and exports |
| Integration Tests | 0/8 | ⚠️ | End-to-end workflows across multiple components |
| Database | 7/7 | ✅ | Database seeding and data integrity |
| Snapshots | 22/22 | ✅ | Point-in-time form state capture for audit trails |
| Other Tests | 85/91 | ⚠️ | Miscellaneous test coverage |
| Server Actions | 67/67 | ✅ | Form submission, draft saving, and data persistence |
| Conditional Logic | 18/18 | ✅ | Show/hide rules and field visibility based on form responses |
| Form Validation | 21/25 | ⚠️ | Input validation rules, required fields, and format checking |
| PDF Export | 79/79 | ✅ | Form data serialization for PDF report generation |
| Performance | 0/7 | ⚠️ | Performance benchmarks and baseline metrics |
| Scoring & Calculations | 49/49 | ✅ | Business logic for technology evaluation scores and recommendations |
| Form Rendering | 11/11 | ✅ | React component rendering for dynamic forms |
| Form Navigation | 9/9 | ✅ | Section navigation and form controls |

---

## What Each Test Suite Validates

### ✅ Service.hydration

**File:** `src/lib/technology/service.hydration.test.ts`

**Purpose:** Verifies form template loading and pre-filling with existing technology data

**What it tests:**

- **technology service hydration helpers**
  - ✓ Raises an error when no active template is available
  - ✓ Returns template and metadata when no techId is provided
  - ✓ Hydrates responses and repeat groups when technology exists
  - ✓ Returns empty prefill data when technology lookup fails
  - ✓ Fetches template by id with binding metadata
  - ✓ Raises an error when fetching a template by id that does not exist
  - ✓ Collects binding metadata only for questions with loaded dictionaries
  - ✓ Constructs submission metadata for scalar and repeatable answers
  - ✓ Resolves binding values for technology and supplements

### ✅ Route

**File:** `src/app/api/form-templates/route.test.ts`

**Purpose:** Tests HTTP API endpoints for form templates, submissions, feedback, and exports

**What it tests:**

- **GET /api/form-templates**
  - ✓ Returns hydrated template data with query params forwarded to the service
  - ✓ Returns 404 when no active template is available
  - ✓ Returns "500" when given unexpected errors

### ✅ Service.helpers

**File:** `src/lib/technology/service.helpers.test.ts`

**Purpose:** Tests utility functions for data binding, field extraction, and extended data handling

**What it tests:**

- **technology service helpers**
  - ✓ Extracts binding values and partitions them by source
  - ✓ Constructs extended data updates with answeredAt timestamps
  - ✓ Sanitizes technology payloads and Determines inventor metadata
  - ✓ Summarizes inventor rows and Properly handles missing values
  - ✓ Extracts strings and flattens arrays into semicolon lists
  - ✓ Applies extended data patches and prunes deleted entries
  - ✓ Identifies missing required technology fields
  - ✓ Sanitizes triage and viability stage inputs
  - ✓ Constructs stage create/update payloads with defaults
  - ✓ Converts values into strings and numbers

### ⚠️ Dynamic Form Drafts

**File:** `tests/integration/dynamic-form-drafts.test.ts`

**Purpose:** Integration test for draft persistence, loading, and optimistic locking

**What it tests:**

- **dynamic form draft integration**
  - ○ Persists drafts and reConstructs answer metadata after hydration
  - ○ Surfaces optimistic locking conflicts when stale row versions are provided
  - ○ Updates an existing draft in place when saveDraftResponse receives a draft id
  - ○ Submits an existing draft and records calculated scores
  - ○ Blocks submitFormResponse when row versions drift between autosave and submit

### ✅ Route

**File:** `src/app/api/feedback/route.test.ts`

**Purpose:** Tests HTTP API endpoints for form templates, submissions, feedback, and exports

**What it tests:**

- **POST /api/feedback**
  - ✓ Persists valid feedback and returns success response
  - ✓ Strips optional fields when only whitespace is provided
  - ✓ Returns 400 when request JSON parsing fails
  - ✓ Returns 400 when schema validation fails
  - ✓ Returns 500 when persistence fails

### ✅ Apply Binding Writes

**File:** `src/__tests__/technology/applyBindingWrites.test.ts`

**Purpose:** Tests the core data persistence logic that writes form responses to database tables

**What it tests:**

- **applyBindingWrites**
  - ✓ Updates existing technology and triage stage fields
  - ✓ Creates a technology record when required fields are present
  - ✓ Returns empty result when techId is missing
  - ✓ Skips create when allowCreateWhenIncomplete=false and required fields missing
  - ✓ Creates or updates viability stage values when provided
  - ✓ Raises an error when triage stage optimistic locking fails

### ✅ Demo Seeding

**File:** `src/__tests__/database/demo-seeding.test.ts`

**Purpose:** Tests database seeding for development and demo environments

**What it tests:**

- **seedDemoSubmissions**
  - ✓ Clear existing demo submissions before creating new ones
  - ✓ Create submissions with correct status distribution
  - ✓ Create calculated scores for submitted forms
  - ✓ Not create calculated scores for draft submissions
- **verifyDemoData**
  - ✓ Return correct submission counts
  - ✓ Properly handles empty database correctly
- **Integration with environment variables**
  - ✓ Be testable in CI without actual database

### ✅ Capture

**File:** `src/__tests__/snapshots/capture.test.ts`

**Purpose:** Verifies snapshot capture for audit trails and point-in-time form state

**What it tests:**

- **Happy Path Scenarios**
  - ✓ Successfully capture snapshot with all data (responses, repeatGroups, calculatedScores)
  - ✓ Capture snapshot without technologyId when not bound to technology
  - ✓ Uses default value snapshotType to SUBMISSION when not specified
  - ✓ Constructs questionRevisions from bindingMetadata
  - ✓ Properly handles empty bindingMetadata gracefully
  - ✓ Properly handles missing bindingMetadata gracefully
- **Technology Metadata Capture**
  - ✓ Capture technology metadata when technologyId is provided
  - ✓ Capture triage stage data when present
  - ✓ Capture viability stage data when present
  - ✓ Capture both triage and viability stages when both present
  - ✓ Return empty technologyMeta when technology is not found
  - ✓ Properly handles optional technology fields correctly
- **Error Handling - Non-blocking Behavior**
  - ✓ Return error result when template is not found
  - ✓ Return error result (not throw) when database create fails
  - ✓ Properly handles non-Error thrown values gracefully
  - ✓ Continue successfully even if technology lookup fails
- **Edge Cases**
  - ✓ Properly handles empty responses object
  - ✓ Properly handles empty repeatGroups object
  - ✓ Properly handles missing calculatedScores
  - ✓ Properly handles empty technologyId
  - ✓ Properly handles viabilityStage with empty timeToMarket
  - ✓ Properly handles triageStage with empty recommendationNotes

### ✅ Route

**File:** `src/app/api/form-exports/route.test.ts`

**Purpose:** Tests HTTP API endpoints for form templates, submissions, feedback, and exports

**What it tests:**

- **POST /api/form-exports**
  - ✓ Returns a PDF using provided templateId and normalized payloads
  - ✓ Hydrates payloads using submissionId when templateId is omitted
  - ✓ Returns 404 when submission lookup fails
  - ✓ Returns 404 when template cannot be found
  - ✓ Returns 400 when neither templateId nor submissionId is provided
  - ✓ Returns 400 when JSON parsing fails

### ✅ Middleware

**File:** `middleware.test.ts`

**Purpose:** Tests functionality in this module

**What it tests:**

- **authentication configuration**
  - ✓ Returns 500 when BASIC_AUTH_USERNAME is missing
  - ✓ Returns 500 when BASIC_AUTH_PASSWORD is missing
  - ✓ Returns 500 when both credentials are missing
- **valid credentials**
  - ✓ Allows access with valid Basic auth credentials
  - ✓ Allows access with credentials containing special characters
  - ✓ Properly handles password containing colons correctly
- **invalid credentials**
  - ✓ Blocks access with wrong username
  - ✓ Blocks access with wrong password
  - ✓ Blocks access with empty credentials
- **missing or malformed authorization**
  - ✓ Blocks access when authorization header is missing
  - ✓ Blocks access with Bearer token instead of Basic
  - ✓ Blocks access with malformed Basic auth (no space)
  - ✓ Blocks access with empty authorization header
  - ✓ Blocks access when base64 decodes to string without colon
- **401 response format**
  - ✓ Returns proper WWW-Authenticate header with realm
  - ✓ Returns "Authentication required" message body
- **case sensitivity**
  - ✓ Accepts "basic" scheme in lowercase
  - ✓ Accepts "BASIC" scheme in uppercase
  - ✓ Treats username as case-sensitive
  - ✓ Treats password as case-sensitive
- **middleware matcher config**
  - ✓ Exports a matcher that excludes health endpoint
  - ✓ Exports a matcher that excludes static assets

### ⚠️ Form Submit Export

**File:** `tests/integration/form-submit-export.test.ts`

**Purpose:** Integration test for the full draft → submit → export workflow

**What it tests:**

- **form submission + export integration**
  - ○ Submits a draft, reuses it for submitFormResponse, and exports a PDF via submissionId
  - ○ Enforces optimistic locking on submitFormResponse and succeeds after retry with fresh row versions
  - ○ Exports directly from live payloads using templateId without persisting a submission

### ✅ Answer Status

**File:** `src/__tests__/technology/answer-status.test.ts`

**Purpose:** Validates answer freshness tracking to detect stale responses vs question revisions

**What it tests:**

- **getAnswerStatus**
  - ✓ Returns MISSING when no answer is present
  - ✓ Returns UNKNOWN when answer lacks revision metadata
  - ✓ Returns FRESH when revision id matches current
  - ✓ Returns STALE when revision id differs

### ✅ Actions

**File:** `src/app/dynamic-form/builder/actions.test.ts`

**Purpose:** Validates server-side form operations including saving drafts, submitting forms, and loading responses

**What it tests:**

- **getTemplates**
  - ✓ Returns list of templates with counts
- **getTemplateDetail**
  - ✓ Returns template with all nested relations
- **createSection**
  - ✓ Creates a new section with correct order
  - ✓ Returns "error" when given invalid input
- **updateSection**
  - ✓ Updates section with new values
- **deleteSection**
  - ✓ Deletes section and revalidates
  - ✓ Returns error when delete fails
- **moveSection**
  - ✓ Swaps order with adjacent section when moving up
  - ✓ Returns success when no adjacent section exists
  - ✓ Returns error when section not found
- **reorderSections**
  - ✓ Updates order for all sections
  - ✓ Returns "success" when given empty array
- **createField**
  - ✓ Creates field with correct dictionaryKey
  - ✓ Returns error when section not found
  - ✓ Creates repeatable group with Uses default value config
- **updateField**
  - ✓ Updates field with new values
  - ✓ Properly handles options for selection field types
  - ✓ Returns error when field not found
- **deleteField**
  - ✓ Deletes field and revalidates
- **moveField**
  - ✓ Swaps order with adjacent field
  - ✓ Returns error when field not found
- **duplicateField**
  - ✓ Creates a copy of the field
  - ✓ Returns error when field not found
- **publishTemplate**
  - ✓ Sets template as active when validation passes
  - ✓ Returns error when template has no sections
  - ✓ Returns error when section has no questions
  - ✓ Returns error when template not found
- **saveTemplateAsDraft**
  - ✓ Sets template as inactive
- **updateTemplateMetadata**
  - ✓ Updates template name, version, and description
  - ✓ Returns "error" when given invalid input

### ✅ Route

**File:** `src/app/api/form-submissions/route.test.ts`

**Purpose:** Tests HTTP API endpoints for form templates, submissions, feedback, and exports

**What it tests:**

- **/api/form-submissions — POST**
  - ✓ Creates submissions and only writes calculated scores
  - ✓ Returns 400 when schema validation fails
  - ✓ Returns 500 when persistence throws
- **/api/form-submissions — GET**
  - ✓ Returns a single submission with hydrated responses from TechnologyAnswer when id is provided
  - ✓ Returns empty responses when submission has no technologyId
  - ✓ Returns 404 when submission is missing
  - ✓ Lists recent submissions when no id is provided
  - ✓ Returns 500 when query fails
- **/api/form-submissions — PUT**
  - ✓ Updates submissions and rewrites calculated scores only
  - ✓ Returns 400 when schema validation fails
  - ✓ Returns 500 when update throws

### ✅ Actions

**File:** `src/__tests__/dynamic-form/actions.test.ts`

**Purpose:** Validates server-side form operations including saving drafts, submitting forms, and loading responses

**What it tests:**

- **dynamic form actions**
  - ✓ Persists repeatable group rows when saving a new draft
  - ✓ Hydrates repeatable rows when loading a draft from TechnologyAnswer
  - ✓ Returns conflict when optimistic lock fails
  - ✓ Reuses an existing draft during submitFormResponse and writes calculated scores
  - ✓ Creates a new submission when no draft id is provided
  - ✓ Returns conflict when submitFormResponse encounters an optimistic lock error
  - ✓ Returns error when loadDraftResponse cannot find the draft
  - ✓ Deletes a draft when deleteDraftResponse succeeds
  - ✓ Logs a warning when deleteDraftResponse cannot find the draft
  - ✓ Filters drafts by user scope and Determines template names from linked technology
  - ✓ Returns submission detail with repeat groups and scores
  - ✓ Returns error when submission detail is missing

### ✅ Actions

**File:** `src/app/dynamic-form/library/actions.test.ts`

**Purpose:** Validates server-side form operations including saving drafts, submitting forms, and loading responses

**What it tests:**

- **getQuestionDictionary**
  - ✓ Returns all questions ordered by key
  - ✓ Returns empty array when no questions exist
  - ✓ Properly handles database error gracefully
- **getQuestionByKey**
  - ✓ Returns question when found
  - ✓ Returns error when question not found
  - ✓ Properly handles database error gracefully
- **createQuestion**
  - ✓ Creates question with initial revision
  - ✓ Rejects invalid key Formats - missing dot
  - ✓ Rejects invalid key Formats - uppercase prefix
  - ✓ Rejects invalid key Formats - special characters
  - ✓ Accepts valid key formats
  - ✓ Rejects duplicate key
  - ✓ Properly handles empty helpText and options
  - ✓ Properly handles database error gracefully
- **updateQuestion**
  - ✓ Updates label and creates new revision
  - ✓ Updates multiple fields and tracks changes
  - ✓ Marks options change as significant
  - ✓ Does not create revision when nothing changed
  - ✓ Returns error when question not found
  - ✓ Properly handles clearing helpText to empty
  - ✓ Properly handles database error gracefully
- **deleteQuestion**
  - ✓ Deletes unreferenced question
  - ✓ Prevents deletion when question is referenced
  - ✓ Returns error when question not found
  - ✓ Properly handles database error gracefully

### ✅ Conditional Logic

**File:** `src/lib/form-engine/conditional-logic.test.ts`

**Purpose:** Verifies that form fields show/hide correctly based on user responses and conditional rules

**What it tests:**

- **evaluateRule**
  - ✓ Properly handles equals operator
  - ✓ Properly handles not_equals operator
  - ✓ Properly handles contains array operator
  - ✓ Properly handles contains string operator
  - ✓ Properly handles greater_than operator
  - ✓ Properly handles less_than operator
  - ✓ Properly handles exists operator
  - ✓ Properly handles not_exists operator
  - ✓ Properly handles not_empty array operator
- **conditional-logic utilities**
  - ✓ Evaluates AND/OR logic correctly
  - ✓ Exposes builder helpers for composable configs
- **shouldShowField**
  - ✓ Uses show actions to gate visibility
  - ✓ Uses hide actions to invert the result
- **shouldRequireField**
  - ✓ Forces required when condition matches require action
  - ✓ Marks optional when optional action matches
- **parseConditionalConfig**
  - ✓ Parses JSON strings with valid rules
  - ✓ Returns "empty" when given invalid payloads
  - ✓ Supports legacy showIf format

### ✅ Form Schemas

**File:** `src/lib/validation/form-schemas.test.ts`

**Purpose:** Validates Zod schemas for form submission payload structure

**What it tests:**

- **form-schemas validation helpers**
  - ✓ Applies specific field schemas such as tech.techId
  - ✓ Validates repeatable group overrides for known dictionaryKeys
  - ✓ Enforces data table selector rules for selection and notes
  - ✓ ValidateFormData returns aggregated errors for responses and repeat groups
  - ✓ UseFieldValidation mirrors validateField results

### ✅ Serialize

**File:** `src/lib/form-engine/pdf/serialize.test.ts`

**Purpose:** Tests the PDF export system that transforms form data into printable reports

**What it tests:**

- **buildPrintableForm**
  - ✓ Returns "printable" when givenm with metadata
  - ✓ Removes empty sections
  - ✓ Orders sections by order field
  - ✓ Passes through submission metadata
  - ✓ Includes scoring matrix with valid responses
  - ✓ Includes impact value matrix
  - ✓ Normalizes calculated scores to only numeric values
  - ✓ Returns "empty" when given empty calculated scores
- **section and question building**
  - ✓ Orders questions by order field within sections
  - ✓ Removes info box fields questions
  - ✓ Removes hidden conditional questions with no content
  - ✓ Includes hidden conditional question if it has content
  - ✓ Displays "—" placeholder for questions without answers
- **answer formatting**
  - ✓ Formats SHORT_TEXT answers
  - ✓ Formats multi-select answers with option labels
  - ✓ Formats single-select answers with option label
  - ✓ Falls back to raw value when option label not found
  - ✓ Formats boolean values as Yes/No
  - ✓ Formats numeric values as strings
  - ✓ Properly handles invalid numbers and Infinity as empty strings
  - ✓ Formats array values as comma-separated
  - ✓ Formats object values as key-value pairs
- **repeatable groups**
  - ✓ Constructs repeat group rows with 1-based indexing
  - ✓ Returns "missing" when given empty repeat groups
  - ✓ Formats repeat group values correctly
- **DATA_TABLE_SELECTOR handling**
  - ✓ Filters to selected rows only
  - ✓ Resolves row labels from config
- **scoring matrix construction**
  - ✓ Constructs IMPACT section with 50% weights
  - ✓ Constructs VALUE section with market sub-criteria
  - ✓ Includes overall and market scores
- **score clamping**
  - ✓ Limits negative scores to 0
  - ✓ Limits scores above 3 to 3
  - ✓ Properly handles invalid numbers scores as 0
- **impact value matrix dot position**
  - ✓ Correctly calculates dot position as ratio of score to max (3)
  - ✓ Limits dot position to 0-1 range
  - ✓ Properly handles invalid numbers in dot position calculation
- **status label derivation**
  - ✓ Determines DRAFT status as "Draft"
  - ✓ Determines SUBMITTED status as "Submitted"
  - ✓ Determines REVIEWED status as "Reviewed"
  - ✓ Determines ARCHIVED status as "Archived"
  - ✓ Determines BLANK status as "Blank Form"
  - ✓ Determines IN_PROGRESS status as "In Progress"

### ✅ Custom Validation

**File:** `src/__tests__/validation/custom-validation.test.ts`

**Purpose:** Ensures form fields are properly validated with required checks, min/max constraints, and format validation

**What it tests:**

- **custom validation rules**
  - ✓ Enforces minimum length for text fields
  - ✓ Allows optional text fields to remain empty when min rule is present
  - ✓ Enforces numeric minimum for numeric fields
  - ✓ Enforces email Formats when rule is provided
  - ✓ Accepts valid email when email rule is provided

### ✅ Validation

**File:** `src/lib/form-engine/validation.test.ts`

**Purpose:** Ensures form fields are properly validated with required checks, min/max constraints, and format validation

**What it tests:**

- **validateRule**
  - ✓ Enforces required values
  - ✓ Applies min/max constraints for strings and numbers
  - ✓ Validates pattern and email formats
- **form-engine validation utilities**
  - ✓ ValidateField stops at the first failing rule
  - ✓ ValidateQuestion composes required and type-specific rules
  - ✓ ValidateFormSubmission collects per-field errors
- **parseValidationConfig**
  - ✓ Parses JSON strings into validation configs
  - ✓ Returns "empty" when given invalid payloads

### ⚠️ Performance Baselinex

**File:** `src/__tests__/performance-baseline.test.tsx`

**Purpose:** Establishes performance benchmarks for form operations

**What it tests:**

- **Performance Baseline Tests**
  - ○ Measures template loading performance with small form (10 questions)
  - ○ Measures template loading performance with medium form (50 questions)
  - ○ Measures template loading performance with large form (100 questions)
  - ○ Measures form field interaction performance
  - ○ Measures navigation performance between sections
  - ○ Measures validation performance with many fields
  - ○ Measures memory usage during extended form interaction

### ✅ Calculations

**File:** `src/lib/scoring/calculations.test.ts`

**Purpose:** Validates the business-critical scoring logic that determines technology recommendations (Proceed/Consider/Close)

**What it tests:**

- **calculateMarketScore**
  - ✓ Returns "0" when given minimum boundary inputs
  - ✓ Returns "3" when given maximum boundary inputs
  - ✓ Correctly calculates average correctly
  - ✓ Rounds to 2 decimal places
  - ✓ Properly handles uniform values
  - ✓ Properly handles decimal inputs
- **calculateImpactScore**
  - ✓ Correctly calculates 50/50 weighted blend correctly
  - ✓ Returns max score for max inputs
  - ✓ Returns "0" when given zero inputs
  - ✓ Properly handles asymmetric inputs
  - ✓ Rounds to 2 decimal places
- **calculateValueScore**
  - ✓ Correctly calculates 50/50 weighted blend correctly
  - ✓ Returns max score for max inputs
  - ✓ Returns "0" when given zero inputs
  - ✓ Properly handles asymmetric inputs
  - ✓ Rounds to 2 decimal places
- **calculateOverallScore**
  - ✓ Correctly calculates average of impact and value
  - ✓ Returns max score for max inputs
  - ✓ Returns "0" when given zero inputs
  - ✓ Properly handles asymmetric inputs
  - ✓ Rounds to 2 decimal places
- **Proceed recommendations**
  - ✓ Returns "Proceed" when given high impact and high value (>67%)
  - ✓ Returns "Proceed" when given high impact (>67%) and medium value (33-67%)
  - ✓ Returns "Proceed" when given medium impact (33-67%) and high value (>67%)
- **Consider Alternative Pathway recommendations**
  - ✓ Returns Consider Alternative Pathway for medium impact and medium value
  - ✓ Returns Consider Alternative Pathway for low impact with any value
  - ✓ Returns Consider Alternative Pathway for any impact with low value
- **Close recommendations**
  - ✓ Returns "Close" when given very low impact (<20%)
  - ✓ Returns "Close" when given very low value (<20%)
  - ✓ Returns "Close" when given very low impact and value
  - ✓ Returns "Close" when given zero inputs
- **boundary value tests**
  - ✓ Properly handles exact 67% boundary for high threshold
  - ✓ Properly handles just above 67% boundary
  - ✓ Properly handles exact 33% boundary for medium threshold
  - ✓ Properly handles exact 20% boundary for close threshold
  - ✓ Properly handles just below 20% boundary
- **calculateAllScores**
  - ✓ Correctly calculates all scores from inputs
  - ✓ Properly handles zero inputs
  - ✓ Correctly calculates correctly with mixed inputs
- **extractScoringInputs**
  - ✓ Extracts values from responses using dictionary keys
  - ✓ Uses default value missing keys to 0
  - ✓ Converts string values to numbers
  - ✓ Properly handles non-numeric values by defaulting to 0
  - ✓ Properly handles empty response object
- **getRecommendationColor**
  - ✓ Returns green classes for Proceed
  - ✓ Returns yellow classes for Consider Alternative Pathway
  - ✓ Returns red classes for Close
  - ✓ Returns gray classes for unknown recommendations
  - ✓ Returns gray classes for empty string

### ✅ Feedback Validation

**File:** `src/__tests__/feedback-validation.test.ts`

**Purpose:** Ensures form fields are properly validated with required checks, min/max constraints, and format validation

**What it tests:**

- **feedbackRequestSchema**
  - ✓ Accepts valid feedback payloads
  - ✓ Rejects feedback messages that are too short
  - ✓ Rejects contact info over the character limit

### ⚠️ Validation Enforcementx

**File:** `src/__tests__/validation-enforcement.test.tsx`

**Purpose:** Ensures form fields are properly validated with required checks, min/max constraints, and format validation

**What it tests:**

- **Validation Enforcement Bug**
  - ○ Block navigation when required fields are empty - THIS TEST SHOULD FAIL
  - ○ Allow navigation when all required fields are valid
  - ○ Block navigation with specific validation errors
  - ○ Clear validation errors when fixed

### ✅ Field Adaptersx

**File:** `src/lib/form-engine/fields/FieldAdapters.test.tsx`

**Purpose:** Tests functionality in this module

**What it tests:**

- **SHORT_TEXT**
  - ✓ Renders input with value
  - ✓ Calls onChange when input changes
  - ✓ Shows error styling when error provided
  - ✓ Disables input when disabled prop is true
  - ✓ Renders info box fields when validation has isInfoBox flag
  - ✓ Properly handles missing values value correctly
- **LONG_TEXT**
  - ✓ Renders textarea with value
  - ✓ Calls onChange when textarea changes
  - ✓ Shows error styling
- **INTEGER**
  - ✓ Renders number input with value
  - ✓ Parses input as integer
  - ✓ Properly handles negative numbers
- **SINGLE_SELECT**
  - ✓ Renders select with options
  - ✓ Calls onChange when option selected
- **MULTI_SELECT**
  - ✓ Renders checkboxes for each option
  - ✓ Shows checked state for selected values
  - ✓ Adds value when checkbox checked
  - ✓ Removes value when checkbox unchecked
  - ✓ Shows error styling
- **CHECKBOX_GROUP**
  - ✓ Renders checkbox group similar to multi-select
  - ✓ Properly handles add and remove correctly
- **DATE**
  - ✓ Renders date input
  - ✓ Calls onChange with date string
- **SCORING_0_3**
  - ✓ Renders ScoringComponent with Uses default value criteria
  - ✓ Uses custom criteria from scoringConfig
  - ✓ Calls onChange when score selected
  - ✓ Shows error styling
- **SCORING_MATRIX**
  - ✓ Renders DynamicScoringMatrix component
  - ✓ Passes disabled prop to matrix
  - ✓ Passes error to matrix
  - ✓ Calls onChange when matrix updates
- **REPEATABLE_GROUP**
  - ✓ Renders empty state with add button
  - ✓ Adds row when add button clicked
  - ✓ Renders table with existing rows
  - ✓ Removes row when delete clicked
  - ✓ Uses legacy columns for known dictionaryKeys
  - ✓ Respects maxRows limit
  - ✓ Respects minRows limit
  - ✓ Updates row value on input change
- **DATA_TABLE_SELECTOR**
  - ✓ Renders predefined rows with checkboxes
  - ✓ Shows placeholder when no rows configured
  - ✓ Toggles row selection
- **FieldComponents exports**
  - ✓ Exports all field types
  - ✓ DATA_TABLE_SELECTOR uses same component as REPEATABLE_GROUP

### ✅ Data Persistencex

**File:** `src/__tests__/data-persistence.test.tsx`

**Purpose:** Validates that form data persists correctly across sessions

**What it tests:**

- **Data Persistence Bug**
  - ✓ Preserve form data when template loads - THIS TEST SHOULD FAIL
  - ✓ Preserve existing section navigation when template loads
  - ✓ Retains responses when subsequent initial data is missing

### ⚠️ Pagex

**File:** `src/app/dynamic-form/page.test.tsx`

**Purpose:** Tests functionality in this module

**What it tests:**

- **loading state**
  - ✓ Shows loading spinner while fetching template
  - ✓ Shows "Loading draft..." when draftId is provided
- **successful template load**
  - ✓ Renders the form template after successful load
  - ✓ Renders navigation links
  - ✓ Renders form fields
- **template load failure**
  - ✓ Displays error message when fetch fails
  - ✓ Displays generic error when no error message provided
  - ✓ Displays error when fetch throws
- **no template found**
  - ✓ Displays message when no template returned
- **draft loading**
  - ✓ Loads existing draft when draftId is provided
  - ✓ Shows Draft Mode badge when draft is loaded
  - ✓ Redirects to /dynamic-form when draft load fails
  - ✓ Shows error toast when draft load fails
- **form submission**
  - ○ Navigates to submissions page after successful submit
  - ○ Shows error toast when submission fails
- **version conflict handling**
  - ○ Shows conflict error and reloads when submission has conflict
  - ○ Shows conflict error and reloads when draft save has conflict
- **draft saving**
  - ○ Updates URL with draft ID after first save
  - ○ Shows error toast when draft save fails
- **techId parameter**
  - ✓ Includes techId in API request when provided
  - ✓ Trims whitespace from techId parameter
  - ✓ Ignores empty techId parameter

### ✅ Form Pdf Documentx

**File:** `src/lib/form-engine/pdf/FormPdfDocument.test.tsx`

**Purpose:** Tests functionality in this module

**What it tests:**

- **basic rendering**
  - ✓ Renders without throwing
  - ✓ Renders with empty sections array
  - ✓ Renders template name and version
  - ✓ Renders template description when provided
  - ✓ Renders status label
- **metadata fields**
  - ✓ Renders techId when provided
  - ✓ Renders submissionId when provided
  - ✓ Renders submittedBy when provided
  - ✓ Renders notes when provided
  - ✓ Does not render optional fields when empty
- **sections rendering**
  - ✓ Renders section title
  - ✓ Renders section description when provided
  - ✓ Renders multiple sections
- **questions rendering**
  - ✓ Renders question label with number
  - ✓ Numbers questions sequentially across sections
  - ✓ Renders answer text
  - ✓ Renders "—" placeholder for empty answers
- **repeat group rows**
  - ✓ Renders repeat group rows
  - ✓ Renders "—" placeholder for empty field values
- **scoring matrix**
  - ✓ Renders scoring matrix when provided
  - ✓ Renders scoring matrix section headers
  - ✓ Renders market sub-criteria
  - ✓ Does not render scoring matrix when missing
- **impact value matrix**
  - ✓ Renders impact value matrix when provided
  - ✓ Renders scores
  - ✓ Renders recommendation
  - ✓ Renders "Consider Alternative Pathway" recommendation
  - ✓ Renders "Close" recommendation
  - ✓ Renders matrix quadrant labels
  - ✓ Does not render impact value matrix when missing
- **date formatting**
  - ✓ Formats exportedAt date
  - ✓ Properly handles invalid date gracefully
  - ✓ Properly handles empty date
- **complete form rendering**
  - ✓ Renders a complete form with all features
- **edge cases**
  - ✓ Properly handles empty strings in metadata
  - ✓ Properly handles very long text
  - ✓ Properly handles special characters

### ✅ Rendererx

**File:** `src/lib/form-engine/renderer.test.tsx`

**Purpose:** Validates React component rendering for different form field types

**What it tests:**

- **FormEngineProvider + DynamicFormRenderer**
  - ✓ Hydrates initial data and clears answer metadata when fields change
  - ✓ Updates repeatable group data through the repeat group adapter
  - ✓ Navigates between sections without losing responses
  - ✓ Only re-hydrates when initial data payload changes
  - ✓ Determines calculated scores when responses change
  - ✓ Triggers debounced validation through validateField helper

### ✅ Dynamic Form Navigationx

**File:** `src/components/form/DynamicFormNavigation.test.tsx`

**Purpose:** Tests functionality in this module

**What it tests:**

- **DynamicFormNavigation**
  - ✓ Updates the progress indicator when navigating sections
  - ✓ Auto-saves after field changes and surfaces the saved banner
  - ✓ Blocks submission when required fields are empty and shows a toast
- **validation UI behavior**
  - ✓ Displays multiple validation errors when multiple required fields are empty
  - ✓ Scrolls to the first invalid field on submit validation failure
  - ✓ Clears validation error when the field is filled
  - ✓ Validates fields across all sections on final submit
  - ✓ Shows contextual toast error with field name and section
  - ✓ Allows submission when all required fields are filled

### ✅ Renderer.scenariosx

**File:** `src/lib/form-engine/renderer.scenarios.test.tsx`

**Purpose:** Validates React component rendering for different form field types

**What it tests:**

- **FormEngine conditional scenarios**
  - ✓ Reveals nested fields only after each controlling condition is satisfied
  - ✓ Hides fields when a hide action matches and restores their prior state afterward
  - ✓ Marks dependent fields required based on conditional require rules
  - ✓ Evaluates multi-select conditional visibility and requirement rules
  - ✓ Invokes onSaveDraft with the latest responses when autosave fires silently

---

## ⚠️ Skipped Tests

The following tests are currently skipped:

**Dynamic Form Drafts:**
- persists drafts and rebuilds answer metadata after hydration
- surfaces optimistic locking conflicts when stale row versions are provided
- updates an existing draft in place when saveDraftResponse receives a draft id
- submits an existing draft and records calculated scores
- blocks submitFormResponse when row versions drift between autosave and submit

**Form Submit Export:**
- submits a draft, reuses it for submitFormResponse, and exports a PDF via submissionId
- enforces optimistic locking on submitFormResponse and succeeds after retry with fresh row versions
- exports directly from live payloads using templateId without persisting a submission

**Performance Baselinex:**
- measures template loading performance with small form (10 questions)
- measures template loading performance with medium form (50 questions)
- measures template loading performance with large form (100 questions)
- measures form field interaction performance
- measures navigation performance between sections
- measures validation performance with many fields
- measures memory usage during extended form interaction

**Validation Enforcementx:**
- should block navigation when required fields are empty - THIS TEST SHOULD FAIL
- should allow navigation when all required fields are valid
- should block navigation with specific validation errors
- should clear validation errors when fixed

**Pagex:**
- navigates to submissions page after successful submit
- shows error toast when submission fails
- shows conflict error and reloads when submission has conflict
- shows conflict error and reloads when draft save has conflict
- updates URL with draft ID after first save
- shows error toast when draft save fails

---

## Recommendations

### Deferred Items

- 25 test(s) are skipped - review if they should be re-enabled

---

*Report generated by Plain English Test Reporter*
