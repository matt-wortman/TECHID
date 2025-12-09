# API Reference

## Overview

The Tech Triage Platform exposes REST API endpoints and Next.js Server Actions for form operations.

**Base URL:** `http://localhost:3000` (development)

---

## REST API Endpoints

### Health Check

#### `GET /api/health`

Check application and database health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "connected"
}
```

**Error Response (503):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "disconnected",
  "error": "Connection refused"
}
```

---

### Form Templates

#### `GET /api/form-templates`

Load the active form template with bindings and pre-filled data.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `techId` | string | Optional. Technology ID to pre-fill answers from |

**Response:**
```json
{
  "template": {
    "id": "uuid",
    "name": "Triage Form",
    "version": "1.0",
    "sections": [...]
  },
  "bindingMetadata": {
    "triage.missionAlignmentScore": {
      "source": "STAGE_SUPPLEMENT",
      "tableName": "TriageStage",
      "fieldPath": "missionAlignmentScore"
    }
  },
  "initialResponses": {
    "tech.name": "Example Technology"
  },
  "initialRepeatGroups": {},
  "answerMetadata": {
    "tech.name": {
      "status": "CURRENT",
      "lastUpdated": "2025-01-15T10:00:00.000Z"
    }
  },
  "technologyContext": {
    "id": "uuid",
    "techId": "TECH-001"
  },
  "rowVersions": {
    "technology": 1,
    "triageStage": 2
  }
}
```

**Error Response (404):**
```json
{
  "error": "No active form template found",
  "details": "No active form template found in database"
}
```

---

### Form Submissions

#### `POST /api/form-submissions`

Create a new form submission.

**Request Body:**
```json
{
  "templateId": "uuid",
  "submittedBy": "user-id",
  "status": "DRAFT",
  "calculatedScores": {
    "totalScore": 85
  }
}
```

> **Note:** Answer data (`responses`, `repeatGroups`) is NOT handled by this endpoint. Answers are written via Server Actions using `applyBindingWrites()` to the TechnologyAnswer table.

**Response:**
```json
{
  "success": true,
  "submissionId": "uuid",
  "status": "DRAFT"
}
```

---

#### `GET /api/form-submissions`

Retrieve form submissions.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Get specific submission by ID |
| `templateId` | string | Filter by template |
| `submittedBy` | string | Filter by user |

**Response (single submission):**
```json
{
  "success": true,
  "submission": {
    "id": "uuid",
    "templateId": "uuid",
    "status": "SUBMITTED",
    "submittedBy": "user-id",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "responses": {
      "tech.name": "Example Technology"
    },
    "repeatGroups": {},
    "calculatedScores": {
      "totalScore": 85
    }
  }
}
```

**Response (list):**
```json
{
  "success": true,
  "submissions": [
    {
      "id": "uuid",
      "templateId": "uuid",
      "status": "SUBMITTED",
      "submittedBy": "user-id",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "submittedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

#### `PUT /api/form-submissions`

Update an existing form submission.

**Request Body:**
```json
{
  "submissionId": "uuid",
  "status": "SUBMITTED",
  "calculatedScores": {
    "totalScore": 90
  }
}
```

**Response:**
```json
{
  "success": true,
  "submissionId": "uuid",
  "status": "SUBMITTED"
}
```

---

### Feedback

#### `POST /api/feedback`

Submit user feedback.

**Request Body:**
```json
{
  "message": "The form is confusing",
  "pageUrl": "/dynamic-form",
  "contactInfo": "user@example.com",
  "userId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "feedbackId": "uuid"
}
```

---

## Server Actions

Server Actions are the **primary interface** for form operations. They handle answer storage via `TechnologyAnswer`.

**Location:** `src/app/dynamic-form/actions.ts`

### `submitFormResponse()`

Submit a completed form. Writes answers to TechnologyAnswer and updates submission status.

```typescript
const result = await submitFormResponse(
  {
    templateId: "uuid",
    responses: { "tech.name": "Example" },
    repeatGroups: {},
    calculatedScores: { totalScore: 85 },
    rowVersions: { technology: 1 }
  },
  "session-id",
  "existing-draft-id" // optional
);

// Result
{
  success: true,
  submissionId: "uuid",
  rowVersions: { technology: 2, triageStage: 1 }
}
```

---

### `saveDraftResponse()`

Save form as draft. Creates or updates submission and writes answers.

```typescript
const result = await saveDraftResponse(
  {
    templateId: "uuid",
    responses: { "tech.name": "Example" },
    repeatGroups: {},
    calculatedScores: {},
    rowVersions: { technology: 1 }
  },
  "session-id",
  "existing-draft-id" // optional, for updates
);

// Result
{
  success: true,
  submissionId: "uuid",
  rowVersions: { technology: 2 }
}
```

---

### `loadDraftResponse()`

Load a draft submission with its answers from TechnologyAnswer.

```typescript
const result = await loadDraftResponse("draft-id", "session-id");

// Result
{
  success: true,
  submissionId: "draft-id",
  data: {
    responses: { "tech.name": "Example" },
    repeatGroups: { "tech.inventors": [...] },
    calculatedScores: { totalScore: 0 },
    answerMetadata: {
      "tech.name": { status: "CURRENT", lastUpdated: "..." }
    }
  }
}
```

---

### `getUserDrafts()`

Get all draft submissions for a user.

```typescript
const result = await getUserDrafts("session-id", "all");

// Result
{
  success: true,
  drafts: [
    {
      id: "uuid",
      templateName: "TECH-001",
      templateVersion: "1.0",
      createdAt: Date,
      updatedAt: Date,
      submittedBy: "user-id"
    }
  ]
}
```

---

### `deleteDraftResponse()`

Delete a draft submission.

```typescript
const result = await deleteDraftResponse("draft-id", "session-id");

// Result
{ success: true }
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical details or validation errors"
}
```

### Common Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad Request - Invalid payload |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Concurrent modification detected |
| 500 | Server Error - Internal failure |
| 503 | Service Unavailable - Database connection issue |

### Optimistic Locking (409 Conflict)

When `rowVersions` don't match, the server returns:
```json
{
  "success": false,
  "error": "conflict"
}
```

The client should reload the latest data and retry.

---

## Authentication

All endpoints (except `/api/health`) require Basic Authentication:

```
Authorization: Basic base64(username:password)
```

Configure via environment variables:
- `BASIC_AUTH_USERNAME`
- `BASIC_AUTH_PASSWORD`
