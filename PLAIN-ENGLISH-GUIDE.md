# Tech Triage Platform - Plain English Guide

**Version:** 1.0
**Last Updated:** December 8, 2025
**Audience:** Non-technical stakeholders, business users, managers, executives
**Companion Document:** For technical details, see [TECHNICAL-MANUAL.md](./TECHNICAL-MANUAL.md)

---

## How to Use This Guide

This guide explains the Tech Triage Platform in everyday language. Each section includes:

- **Why This Matters** - The business value in plain terms
- **What It Does** - How the system works, explained with analogies
- **Why We Built It This Way** - The reasoning behind key decisions

Technical terms appear in parentheses (like `this`) so you can cross-reference the technical manual if needed.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Data Binding System](#data-binding-system)
5. [Technology Lifecycle Management](#technology-lifecycle-management)
6. [Form Engine Architecture](#form-engine-architecture)
7. [Database Schema & Models](#database-schema--models)
8. [Server Actions & Data Flow](#server-actions--data-flow)
9. [Snapshot System](#snapshot-system)
10. [Answer Status & Versioning](#answer-status--versioning)
11. [Validation & Conditional Logic](#validation--conditional-logic)
12. [Optimistic Locking](#optimistic-locking)
13. [Development Workflow](#development-workflow)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Architecture](#deployment-architecture)
16. [Troubleshooting Guide](#troubleshooting-guide)
17. [Glossary](#glossary)

---

## Executive Summary

### Why This Matters

The Tech Triage Platform helps organizations evaluate new technologies systematically. Instead of scattered emails and spreadsheets, all technology assessments live in one place with a clear audit trail of who said what and when.

### What It Does

The platform guides technologies through a structured evaluation process with four stages:

1. **Triage** - Initial screening: Is this worth looking at?
2. **Viability** - Deep dive: Can we actually build/use this?
3. **Commercial** - Business planning: How do we make money?
4. **Market Ready** - Final checks: Are we ready to launch?

At each stage, reviewers fill out assessment forms. The system captures their answers, calculates scores, and creates permanent records for compliance and audit purposes.

### Key Business Benefits

| Benefit | How It Works |
|---------|--------------|
| **Single Source of Truth** | All answers about a technology are stored in one place, not scattered across multiple forms |
| **Audit Trail** | Every change is recorded with timestamps and user information |
| **Answer Reuse** | If you answered a question once, it automatically appears in other forms that ask the same thing |
| **Safe Updates** | When two people edit the same record, the system prevents one person from accidentally overwriting the other's work |
| **Gradual Improvements** | New features can be tested with safety switches that let us roll back instantly if problems occur |

### Who Uses This System

- **Technology Reviewers** - Fill out assessment forms at each stage
- **Program Managers** - Track technologies through the evaluation pipeline
- **Compliance Officers** - Access audit trails and historical records
- **Executives** - View portfolio dashboards and summary scores

---

## System Architecture Overview

### Why This Matters

Understanding the system's structure helps stakeholders know where their data lives, how it flows, and why the system behaves the way it does.

### What It Does

Think of the platform as a modern office building with different floors:

**Top Floor - The User Interface**
This is what people see and interact with: forms, buttons, navigation. When a reviewer opens a technology assessment, they see a clean form interface built with modern web technologies.

**Middle Floors - The Business Logic**
Behind the scenes, the system processes form submissions, calculates scores, and enforces rules. For example:
- "Don't let someone submit a form with missing required fields"
- "Calculate the Impact Score based on these five questions"
- "If Mission Alignment is below 2, show a warning"

**Ground Floor - Data Storage**
All information is stored in a database - a highly organized digital filing system. The database keeps track of:
- Every technology being evaluated
- Every answer given on every form
- Every user who made changes
- Historical snapshots for audit purposes

**The Elevator - Data Flow**
When a reviewer clicks "Submit," information travels from the top floor (user interface) through the middle floors (business logic) to the ground floor (database), with each floor doing its job along the way.

### Why We Built It This Way

**Separation of Concerns**: Each "floor" has one job. The user interface doesn't know how data is stored. The database doesn't know how forms are displayed. This makes the system easier to maintain and update - you can renovate one floor without disrupting the others.

**Modern Technology Stack**: We use industry-standard tools (`Next.js`, `React`, `PostgreSQL`, `Prisma`) that are well-documented, widely supported, and attract skilled developers. This reduces long-term risk and maintenance costs.

---

## Core Concepts

### Why This Matters

Three fundamental ideas shape how the entire system works. Understanding these concepts explains why the platform behaves the way it does.

### Concept 1: "Forms Are Virtual" - Answers Belong to Technologies

**The Old Way (What We Avoided)**

Imagine a filing cabinet where each form submission gets its own folder. If someone fills out Form A and answers "What is the target market?", that answer lives in the Form A folder. Later, when they fill out Form B (which asks the same question), they have to answer it again - and now there are two copies of the same answer in different folders.

Problems with this approach:
- Duplicate data that can get out of sync
- No single source of truth
- Hard to see all answers about one technology

**The New Way (What We Built)**

Instead, think of each **technology** as the folder. All answers about that technology go into its folder, regardless of which form collected them.

When someone fills out a form:
1. The system looks at each question
2. It saves the answer in the technology's folder under a standardized label
3. If that answer already exists (from a previous form), it updates it

**Real-World Example:**

Dr. Smith evaluates "AI Diagnostic Tool" (Technology #47):
- On the Triage Form, she answers "Target Market = Healthcare providers"
- This gets saved to Technology #47's folder under the label "Target Market"
- Later, on the Viability Form, the "Target Market" question appears pre-filled with "Healthcare providers"
- If she updates it to "Healthcare providers and payers," only one record changes

**Why This Matters for the Business:**
- One answer per question per technology (no duplicates)
- Forms can share questions without duplicating data
- Easy to see everything known about a technology in one place
- Historical accuracy - the answer for a question is always the latest answer

### Concept 2: The Question Dictionary - Standardized Labels

**The Problem We Solved**

Forms change over time. Question IDs change when forms are rebuilt. If we stored answers by question ID, we'd lose the connection between old answers and new forms.

**The Solution**

Every question has a permanent, human-readable label called a "dictionary key" (`dictionaryKey`). For example:
- `triage.missionAlignmentScore` - The mission alignment score from the triage stage
- `tech.inventorName` - The inventor's name
- `viability.technicalFeasibility` - The technical feasibility assessment

These labels never change, even if forms are redesigned. They're like Social Security numbers for questions - a permanent identifier that follows the question throughout its life.

**Why This Matters for the Business:**
- Forms can be updated without losing historical data
- Multiple forms can reference the same underlying question
- Reports can query by question meaning, not by arbitrary form IDs

### Concept 3: Safety Switches for Gradual Changes

**The Challenge**

When we improve the system, we need to avoid breaking existing functionality. It's like renovating a hospital - you can't just shut everything down.

**The Solution: Feature Flags**

The system has "safety switches" (`feature flags`) that control which version of a feature is active:

| Switch | What It Controls |
|--------|-----------------|
| `useTechnologyAnswerPrimary` | Where to **read** answers from (new location vs. old location) |
| `skipLegacyQuestionResponseWrites` | Whether to **write** to the old location (safety backup) |

**Current State:**
- Reading from: New location (switched ON)
- Writing to: Both locations (safety backup still active)

This means:
- Users get the benefits of the new system
- If problems appear, we flip one switch and instantly revert to the old behavior
- No data is lost because we're still backing up to the old location

**Why This Matters for the Business:**
- Zero-downtime upgrades - improvements roll out without service interruptions
- Instant rollback capability - if something goes wrong, recovery takes seconds, not hours
- Risk mitigation - new features can be tested on a small scale before full deployment

---

## Data Binding System

### Why This Matters

This is the "plumbing" that connects form fields to database storage. It ensures that when someone fills out a form, the right information ends up in the right place.

### What It Does

**The Journey of an Answer**

When a reviewer enters "3" for Mission Alignment Score:

1. **Collection**: The form interface captures the answer
2. **Labeling**: The system looks up the question's dictionary key: `triage.missionAlignmentScore`
3. **Routing**: The system determines where this answer should be stored: "This goes in the Triage Stage table, in the Mission Alignment Score column"
4. **Storage**: The answer is written to the database in the correct location
5. **Backup**: The answer is also saved in the Technology's answer collection (for the "Forms Are Virtual" benefit)

**Where Different Answers Live**

| Type of Information | Where It's Stored | Examples |
|--------------------|-------------------|----------|
| Core technology info | Technology table | Name, inventor, reviewer, current stage |
| Triage evaluation data | Triage Stage table | Mission alignment score, market overview |
| Viability assessment data | Viability Stage table | Technical feasibility, commercial score |
| Dynamic/flexible fields | Extended Data (JSON) | Custom fields that don't have dedicated columns |
| All answers (canonical) | Technology Answer table | Every answer, labeled by dictionary key |

### Why We Built It This Way

**Structured vs. Flexible Storage**

Some fields are queried frequently and need to be fast to search (like "show me all technologies with Mission Alignment > 2"). These get their own dedicated columns in the database.

Other fields are rarely queried but need to be stored. These go into a flexible "extended data" area that can hold any kind of information without requiring database changes.

This hybrid approach gives us:
- **Performance** for common queries (structured columns)
- **Flexibility** for evolving requirements (extended data)
- **Simplicity** for developers (one system handles both)

**The Canonical Source**

Every answer also gets saved to the Technology Answer table (`TechnologyAnswer`). This serves as the single source of truth - if there's ever a question about what the current answer is, this table has the authoritative answer.

---

## Technology Lifecycle Management

### Why This Matters

Technologies don't just appear fully evaluated. They go through a journey from "interesting idea" to "ready for market." The system tracks this journey and ensures nothing falls through the cracks.

### What It Does

**The Four Stages**

```
TRIAGE → VIABILITY → COMMERCIAL → MARKET READY
```

**Stage 1: Triage (Initial Screening)**

*Purpose:* Quick assessment - is this worth investing more time?

*Key Questions:*
- Does this align with our mission?
- Is there an unmet need?
- What's the competitive landscape?
- What's the potential impact?

*Output:* A recommendation to proceed, hold, or reject

**Stage 2: Viability (Deep Technical Assessment)**

*Purpose:* Thorough evaluation - can we actually do this?

*Key Questions:*
- Is it technically feasible?
- What are the development risks?
- What resources are required?
- What's the timeline?

*Output:* Technical readiness score and development plan

**Stage 3: Commercial (Business Planning)**

*Purpose:* Business case development - how do we make money?

*Key Questions:*
- What's the market size?
- What's the pricing strategy?
- Who are the target customers?
- What's the go-to-market plan?

*Output:* Business case and commercialization strategy

**Stage 4: Market Ready (Final Checks)**

*Purpose:* Launch readiness - are all the pieces in place?

*Key Questions:*
- Is regulatory approval complete?
- Is the sales team trained?
- Is marketing collateral ready?
- Are support systems in place?

*Output:* Go/no-go decision for market launch

**How Data Flows Through Stages**

Each stage has its own dedicated storage area (table) in the database. When a technology advances from Triage to Viability:

1. The Triage data remains intact (historical record)
2. A new Viability storage area is created
3. Some answers from Triage are automatically available in Viability forms
4. The technology's "current stage" indicator (`currentStage`) updates

### Why We Built It This Way

**Stage Persistence**: Data from earlier stages is never deleted. If someone asks "what did we think about this technology during Triage?", that information is always available.

**Independent Progress**: Each stage can be worked on independently. Multiple reviewers can contribute to different stages without interfering with each other.

**Clear Milestones**: The explicit stage model creates natural checkpoints for management review and decision-making.

---

## Form Engine Architecture

### Why This Matters

The forms are the primary interface for data collection. How they're built determines the user experience and data quality.

### What It Does

**Form Structure**

Every form is organized as:

```
Form Template (e.g., "Triage Assessment v2.0")
├── Section 1: "Basic Information"
│   ├── Question: Technology Name
│   ├── Question: Inventor Name
│   └── Question: Department
├── Section 2: "Mission Alignment"
│   ├── Question: Mission Alignment Score (0-3)
│   └── Question: Mission Alignment Notes
└── Section 3: "Market Assessment"
    ├── Question: Target Market
    └── Question: Competitive Landscape
```

**Question Types**

| Type | What Users See | Example |
|------|---------------|---------|
| Short Text | Single-line text box | "Technology Name" |
| Long Text | Multi-line text area | "Describe the innovation" |
| Number | Numeric input | "Estimated market size (millions)" |
| Single Select | Dropdown menu | "Development Stage: [Early/Mid/Late]" |
| Multi Select | Checkboxes | "Target sectors: [Healthcare] [Defense] [Commercial]" |
| Scoring (0-3) | Score selector with criteria | "Mission Alignment: 0=None, 1=Low, 2=Medium, 3=High" |
| Repeatable Group | Add multiple rows | "Team Members: [Name] [Role] [+ Add Another]" |
| Date | Date picker | "Expected completion date" |

**Pre-filling (Hydration)**

When someone opens a form for an existing technology:

1. The system looks up the technology's stored answers
2. For each question on the form, it checks: "Do we already have an answer for this?"
3. If yes, the answer appears pre-filled in the form
4. The user can accept, modify, or clear the pre-filled answer

This saves time and ensures consistency - users don't have to re-enter information that's already known.

### Why We Built It This Way

**Flexibility**: New question types can be added without redesigning the whole system. The form engine is designed to accommodate future needs.

**Consistency**: All forms use the same underlying engine, ensuring consistent behavior across the platform. A dropdown works the same way whether it's on the Triage form or the Viability form.

**Reusability**: Forms are built from reusable components. If we improve how dropdowns work, every dropdown in every form gets the improvement automatically.

---

## Database Schema & Models

### Why This Matters

Understanding how information is organized helps stakeholders know what data is available for reporting and where to look for specific information.

### What It Does

**The Main Filing Cabinets (Tables)**

Think of the database as a room full of filing cabinets, each dedicated to a specific type of information:

**Cabinet 1: Technologies**
Contains one folder per technology being evaluated. Each folder has:
- Basic info (name, ID, inventor)
- Current status (which stage, active/archived)
- When it was last modified and by whom

**Cabinet 2: Triage Stages**
Contains detailed triage evaluation data for each technology. One folder per technology (if it has triage data).

**Cabinet 3: Viability Stages**
Contains detailed viability assessment data. One folder per technology (if it has viability data).

**Cabinet 4: Technology Answers**
The master answer file - contains every answer for every technology, organized by the question's dictionary key. This is the "single source of truth" for all answers.

**Cabinet 5: Form Templates**
Contains the blueprints for all forms - what sections they have, what questions are in each section, what options are available.

**Cabinet 6: Question Dictionary**
The master list of all possible questions, with their standardized labels (dictionary keys) and where their answers should be stored.

**Cabinet 7: Snapshots**
Frozen-in-time copies of form submissions for audit purposes. When someone submits a form, a snapshot captures exactly what was submitted at that moment.

**How They Connect**

```
Technology
    │
    ├── has one → Triage Stage (if evaluated at triage)
    ├── has one → Viability Stage (if evaluated at viability)
    ├── has many → Technology Answers (all answers for this technology)
    ├── has many → Form Submissions (forms filled out for this technology)
    └── has many → Snapshots (historical records)

Form Template
    │
    ├── has many → Sections
    │                  │
    │                  └── has many → Questions
    │                                    │
    │                                    └── links to → Question Dictionary
```

### Why We Built It This Way

**Normalization**: Information is stored once and referenced elsewhere. The technology name isn't copied into every form submission - instead, submissions reference the technology record. This prevents inconsistencies and reduces storage.

**Relationships**: The structure mirrors real-world relationships. A technology HAS a triage evaluation. A form template CONTAINS sections. This makes the system intuitive to query and maintain.

**Audit Trail**: The structure supports full historical tracking. We can always answer "what did this record look like at a specific point in time?"

---

## Server Actions & Data Flow

### Why This Matters

When users click "Save" or "Submit," a series of steps happen behind the scenes to ensure data is properly validated, stored, and tracked.

### What It Does

**The Submit Journey**

When a reviewer clicks "Submit Form":

**Step 1: Validation**
The system checks: Are all required fields filled in? Are the values valid (e.g., scores between 0-3)?

If something is wrong → Show error messages, don't proceed

**Step 2: Prepare the Data**
The system organizes the answers:
- Which answers go to the Technology table?
- Which go to the Triage Stage table?
- Which go to Extended Data?
- All of them also go to Technology Answers

**Step 3: Start a Transaction**
A "transaction" is like a sealed envelope for database changes. Either ALL changes succeed, or NONE of them happen. This prevents partial updates where some data saves but other data doesn't.

**Step 4: Check for Conflicts**
Before saving, the system verifies: "Has someone else modified this record while you were working on it?" (More on this in the Optimistic Locking section)

**Step 5: Save the Data**
All the organized data is written to the appropriate locations in the database.

**Step 6: Create Snapshot**
A frozen copy of exactly what was submitted is created for audit purposes.

**Step 7: Confirm Success**
The user sees a success message, and the screen updates to reflect the saved data.

**The Draft Save Journey**

When a reviewer clicks "Save Draft":

The process is similar but simpler:
- Less strict validation (partial data is OK)
- No snapshot is created
- The submission is marked as "Draft" (not final)
- Users can return and continue editing later

### Why We Built It This Way

**Atomicity**: The transaction model ensures data integrity. If the system crashes mid-save, we don't end up with half-saved data. It's all or nothing.

**Separation of Drafts and Submissions**: Users can work on forms over multiple sessions without worrying about losing work. Drafts are explicitly different from final submissions.

**Non-Blocking Snapshots**: Snapshot creation happens after the main save. If snapshot creation fails (rare), the user's data is still saved. We log the snapshot failure for investigation but don't burden the user with it.

---

## Snapshot System

### Why This Matters

For compliance, audit, and historical analysis, organizations need to know exactly what was submitted at specific points in time - even if the data has changed since then.

### What It Does

**What Is a Snapshot?**

A snapshot is a "photograph" of a form submission at the moment it was submitted. It captures:

- **All answers** exactly as they were entered
- **All calculated scores** at that moment
- **Technology metadata** (name, stage, status at submission time)
- **Who** submitted it and **when**
- **Which version** of the form was used

**Why Snapshots Are Different from Current Data**

Current data can change:
- A reviewer might update an answer next week
- Calculated scores might change if formulas are updated
- The technology might progress to a new stage

Snapshots never change:
- They record exactly what was true at submission time
- Even if current data changes, the snapshot remains identical
- This creates a permanent audit trail

**Real-World Example**

Dr. Smith submits a Triage form for "AI Diagnostic Tool" on January 15:
- Mission Alignment Score: 3
- Impact Score: 8.5
- Recommendation: "Proceed to Viability"

A snapshot captures all of this.

On February 1, Dr. Jones updates the Mission Alignment Score to 2 after new information emerges.

The current data now shows Score: 2, but the January 15 snapshot still shows Score: 3.

If an auditor asks "what did you recommend in January?", we can show them the exact snapshot - unchanged and authoritative.

### Why We Built It This Way

**Compliance Requirements**: Many organizations have regulatory requirements to maintain historical records. Snapshots satisfy these requirements without complex version-tracking logic.

**Dispute Resolution**: If there's ever a question about "what was actually submitted," snapshots provide an indisputable record.

**Non-Blocking**: Snapshot creation doesn't slow down form submission. If snapshot creation fails, users aren't impacted - the submission succeeds and snapshot failures are logged for follow-up.

**Immutability**: Snapshots cannot be edited. This isn't a limitation - it's a feature. The inability to modify snapshots is what makes them trustworthy for audit purposes.

---

## Answer Status & Versioning

### Why This Matters

Questions evolve over time. When a question changes significantly (new wording, new options), users should know if their previous answers might need review.

### What It Does

**Question Revisions**

When a question is significantly updated, the system creates a new "revision" (`QuestionRevision`). Each revision records:
- The question text at that point in time
- The available options (if applicable)
- When the change was made
- Whether the change was "significant" (meaning old answers might need review)

**Answer Freshness**

Every saved answer remembers which version of the question it was answering. When someone opens a form, the system compares:
- The version of the question the answer was saved against
- The current version of the question

This comparison produces a "freshness status":

| Status | What It Means | Visual Indicator |
|--------|---------------|------------------|
| **Fresh** | Answer was given to the current version of the question | Green checkmark |
| **Stale** | Question has changed since this answer was saved - review recommended | Yellow warning |
| **Missing** | No answer has been provided | Gray/empty |
| **Unknown** | System can't determine freshness (legacy data) | Gray question mark |

**Real-World Example**

The "Target Market" question originally had options:
- Healthcare
- Defense
- Commercial

Later, we added a new option:
- Education

Someone who answered "Healthcare" before this change has a "Stale" answer - not because it's wrong, but because they should see the new option and confirm their answer is still appropriate.

### Why We Built It This Way

**Data Quality**: Stale indicators prompt users to review their answers when questions change, improving overall data quality.

**Transparency**: Users understand why they're being asked to review certain answers. The system explains "this question was updated since you last answered."

**Non-Disruptive**: Stale answers aren't automatically cleared or flagged as errors. They still work; the indicator is informational, not blocking.

**Audit Trail**: The revision history shows how questions have evolved, which is valuable for understanding historical data in context.

---

## Validation & Conditional Logic

### Why This Matters

Good data quality starts with good data entry. Validation prevents errors; conditional logic reduces clutter by showing only relevant questions.

### What It Does

**Validation: Catching Errors Early**

Before data is saved, the system checks:

| Rule | What It Checks | Example |
|------|---------------|---------|
| Required | Field must have a value | "Technology Name is required" |
| Minimum | Value must be at least X | "Budget must be at least $1,000" |
| Maximum | Value must be at most X | "Score must be at most 3" |
| Pattern | Value must match a format | "Email must be a valid email address" |
| Number | Value must be numeric | "Year must be a number" |

When validation fails, users see clear error messages explaining what needs to be fixed. The form cannot be submitted until all validation errors are resolved.

**Conditional Logic: Showing Only What's Relevant**

Some questions only make sense in certain contexts. For example:
- "Describe your FDA approval strategy" - only relevant if "Requires FDA Approval" is Yes
- "Team size for Phase 2" - only relevant if "Proceeding to Phase 2" is Yes

The system can hide or show questions based on other answers:

| Condition | Action |
|-----------|--------|
| If "Requires FDA Approval" = Yes | Show "FDA Strategy" question |
| If "Development Stage" = "Clinical Trials" | Require "Regulatory Path" question |
| If "Mission Alignment" < 2 | Show warning message |

This keeps forms clean and focused - users only see questions that apply to their situation.

### Why We Built It This Way

**User Experience**: Long forms with irrelevant questions are frustrating. Conditional logic creates a personalized experience where users only see what matters to them.

**Data Quality**: Validation at entry time is much more effective than cleaning data after the fact. Catching errors immediately gives users a chance to fix them with context still fresh.

**Flexibility**: Validation rules and conditional logic are configurable per question, not hard-coded. This means form administrators can adjust behavior without developer involvement.

---

## Optimistic Locking

### Why This Matters

When multiple people can edit the same record, there's a risk of "lost updates" - one person's changes silently overwriting another's work.

### What It Does

**The Problem We Prevent**

Imagine this scenario without protection:

| Time | Alice | Bob |
|------|-------|-----|
| 9:00 AM | Opens Technology #47 for editing | |
| 9:05 AM | | Opens Technology #47 for editing |
| 9:10 AM | Changes Mission Score from 2 to 3 | |
| 9:15 AM | Saves (Score is now 3) | |
| 9:20 AM | | Changes Market Score from 5 to 7 |
| 9:25 AM | | Saves... |

Without protection, Bob's save would overwrite Alice's Mission Score change (setting it back to 2, the value when Bob opened the form). Alice's work is silently lost.

**How We Prevent It**

Every record has a "version number" (`rowVersion`) that increases with each save:

| Time | Alice | Bob | Version |
|------|-------|-----|---------|
| 9:00 AM | Opens form (sees version 1) | | 1 |
| 9:05 AM | | Opens form (sees version 1) | 1 |
| 9:15 AM | Saves with "I had version 1" → Success! | | 2 |
| 9:25 AM | | Saves with "I had version 1" → **CONFLICT!** | 2 |

When Bob tries to save, the system notices: "You're trying to update version 1, but the record is now version 2. Someone else made changes."

Bob sees a message: "This record was modified by another user. Please refresh and try again."

Bob refreshes, sees Alice's changes, and can then make his updates with the full picture.

### Why We Built It This Way

**No Lost Work**: Users are always warned when their changes might conflict with someone else's. No one loses 20 minutes of work due to an invisible overwrite.

**No Locking Delays**: Unlike "pessimistic locking" (where editing is blocked while someone else has the record open), optimistic locking doesn't create bottlenecks. Multiple people can work simultaneously; conflicts are only detected at save time.

**Clear Resolution Path**: The error message tells users exactly what happened and what to do (refresh and try again). This is much better than silent data loss.

---

## Development Workflow

### Why This Matters

Understanding how the development team works helps stakeholders set realistic expectations for changes and improvements.

### What It Does

**The Development Environment**

Developers work on their own copies of the system (local development environments) that connect to test databases - not real production data. This allows them to experiment, make mistakes, and test changes without affecting actual users.

**Making Changes**

When a change is needed (bug fix, new feature):

1. **Plan**: Developer understands the requirement and designs a solution
2. **Develop**: Changes are made in the local environment
3. **Test**: Automated tests verify the change works correctly
4. **Review**: Another developer reviews the code for quality and security
5. **Deploy**: The change is moved to production

**Key Commands (What They Mean)**

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Starts the development server for testing |
| `npm run type-check` | Verifies all code is correctly structured |
| `npm test` | Runs automated tests to catch bugs |
| `npm run studio` | Opens a visual tool for inspecting database contents |

### Why We Built It This Way

**Isolation**: Development and testing happen separately from production. This prevents experiments from affecting real users.

**Automation**: Automated tests catch many bugs before they reach production. This reduces the risk of deploying broken code.

**Peer Review**: Another set of eyes catches issues the original developer might miss. This improves code quality and knowledge sharing.

---

## Testing Strategy

### Why This Matters

Testing is how we ensure the system works correctly and continues to work correctly as changes are made.

### What It Does

**Types of Testing**

| Type | What It Tests | When It Runs |
|------|--------------|--------------|
| Unit Tests | Individual functions in isolation | Every code change |
| Integration Tests | Multiple components working together | Before deployment |
| Manual Testing | User experience and edge cases | Before major releases |

**What Gets Tested**

- **Validation logic**: Does it correctly identify invalid data?
- **Calculations**: Are scores computed correctly?
- **Data storage**: Does information save and retrieve accurately?
- **Conditional logic**: Do questions show/hide appropriately?
- **Conflict detection**: Does optimistic locking catch concurrent edits?

**Test Coverage**

We track what percentage of the code is tested. Higher coverage means more confidence that changes won't break existing functionality.

### Why We Built It This Way

**Confidence**: Tests give developers confidence to make changes. Without tests, every change carries risk of breaking something else.

**Documentation**: Tests serve as examples of how features should work. New developers can read tests to understand expected behavior.

**Regression Prevention**: Once a bug is fixed, a test ensures it doesn't come back. The automated test catches it immediately if the bug reappears.

---

## Deployment Architecture

### Why This Matters

Understanding how the system runs in production helps stakeholders understand reliability, performance, and disaster recovery capabilities.

### What It Does

**Production Environment**

The live system runs on cloud infrastructure:

- **Web Server**: Handles user requests, renders pages, processes forms
- **Database Server**: Stores all persistent data with automatic backups
- **Load Balancer**: Distributes traffic and provides redundancy

**Reliability Features**

| Feature | What It Does |
|---------|--------------|
| Automatic Backups | Database is backed up regularly; can restore to any point in time |
| Health Monitoring | System continuously checks itself and alerts if problems occur |
| Redundancy | Multiple servers ensure the system stays up even if one fails |

**Security Measures**

- All connections are encrypted (HTTPS)
- Users must authenticate to access the system
- Database access is restricted to the application only
- All user input is validated to prevent attacks

### Why We Built It This Way

**Availability**: Cloud infrastructure provides high uptime. The system is designed to stay running even when individual components fail.

**Scalability**: If usage grows, we can add more servers without redesigning the system.

**Security**: Defense in depth - multiple layers of security protect sensitive data.

---

## Troubleshooting Guide

### Why This Matters

When issues occur, stakeholders should understand what's happening and what resolution to expect.

### Common Issues and What They Mean

**"This record was modified by another user"**

*What happened:* Someone else saved changes to the same technology while you were editing.

*What to do:* Refresh the page to see their changes, then make your updates.

*Why this happens:* The system prevents accidental overwrites of other people's work.

**"Required field missing"**

*What happened:* You tried to submit a form without filling in a required field.

*What to do:* Look for fields marked with asterisks (*) or highlighted in red, and fill them in.

**Form data not appearing**

*What happened:* Pre-filled data isn't showing up when you open a form.

*What to do:* Check that you're editing the correct technology. If the issue persists, contact support.

**"No active form template found"**

*What happened:* The system can't find an active form configuration.

*What to do:* Contact a system administrator. This is a configuration issue, not a user error.

### When to Contact Support

Contact support if you encounter:
- Error messages that don't make sense
- Data that appears incorrect or missing
- Performance issues (slow loading)
- Access problems (can't log in, can't see expected data)

---

## Glossary

| Term | Plain English Definition | Technical Term |
|------|-------------------------|----------------|
| **Answer** | A response to a form question | `TechnologyAnswer` |
| **Binding** | The connection between a form field and its storage location | `bindingPath` |
| **Dictionary Key** | A permanent, human-readable label for a question | `dictionaryKey` |
| **Draft** | A saved but not submitted form | `FormSubmission` with status `DRAFT` |
| **Extended Data** | Flexible storage for fields that don't have dedicated columns | `extendedData` JSON |
| **Feature Flag** | A safety switch that can turn features on or off | Feature flag, e.g., `useTechnologyAnswerPrimary` |
| **Fresh** | An answer that was given to the current version of a question | Answer status `FRESH` |
| **Hydration** | Pre-filling a form with existing data | Template hydration |
| **Optimistic Locking** | A system that detects conflicting edits at save time | `rowVersion` comparison |
| **Question Revision** | A version of a question's definition | `QuestionRevision` |
| **Snapshot** | A frozen copy of a form submission for audit purposes | `SubmissionSnapshot` |
| **Stage** | A phase in the technology evaluation process (Triage, Viability, etc.) | `TechStage` enum |
| **Stale** | An answer that may need review because its question changed | Answer status `STALE` |
| **Technology** | A product, innovation, or idea being evaluated | `Technology` entity |
| **Transaction** | A group of database changes that succeed or fail together | Database transaction |
| **Validation** | Rules that check if form data is correct | Validation rules |
| **Version Number** | A counter that increases each time a record is saved | `rowVersion` |
| **Virtual Form** | The concept that forms are just interfaces; answers belong to technologies | "Forms Are Virtual" architecture |

---

## Conclusion

The Tech Triage Platform is designed around three core principles:

1. **Answers belong to technologies, not forms** - This eliminates duplicate data and creates a single source of truth for each technology under evaluation.

2. **History matters** - Every change is tracked, snapshots preserve point-in-time records, and question versioning ensures data quality over time.

3. **Safety first** - Feature flags allow gradual rollout of improvements, optimistic locking prevents lost work, and validation catches errors early.

For technical implementation details, please refer to the [Technical Manual](./TECHNICAL-MANUAL.md).

---

**Document Version:** 1.0
**Last Updated:** December 8, 2025
**Maintained By:** Development Team
