# Documentation Index

Welcome to the Tech Triage Platform documentation. This index helps you find the right doc for your needs.

## Start Here

| If you are... | Read this |
|---------------|-----------|
| New to the project | [PLAIN-ENGLISH-GUIDE.md](onboarding/PLAIN-ENGLISH-GUIDE.md) |
| Setting up for development | [DEVELOPER_ONBOARDING.md](onboarding/DEVELOPER_ONBOARDING.md) |
| An AI agent (Claude Code) | [AI-AGENTS-READ-ME-FIRST.md](../AI-AGENTS-READ-ME-FIRST.md) |
| Making architectural changes | [shared-answer-architecture.md](architecture/2-shared-answer-architecture.md) |

## Documentation by Category

### Onboarding (`docs/onboarding/`)

For newcomers to the project, whether technical or non-technical.

| Document | Description |
|----------|-------------|
| [PLAIN-ENGLISH-GUIDE.md](onboarding/PLAIN-ENGLISH-GUIDE.md) | Non-technical explanation of the system |
| [DEVELOPER_ONBOARDING.md](onboarding/DEVELOPER_ONBOARDING.md) | Developer setup guide |
| [tech-lifecycle-onboarding.md](onboarding/tech-lifecycle-onboarding.md) | Understanding the technology lifecycle stages |
| [tech-multi-form-master-plan-plain-english.md](onboarding/tech-multi-form-master-plan-plain-english.md) | Plain-language explanation of the multi-form architecture |

### Architecture (`docs/architecture/`)

Core design documents. **Read these before making architectural changes.**

| Document | Description |
|----------|-------------|
| [1-ARCHITECTURE_ROADMAP.md](architecture/1-ARCHITECTURE_ROADMAP.md) | Current state, in-flight work, and future vision |
| [2-shared-answer-architecture.md](architecture/2-shared-answer-architecture.md) | Core philosophy: "One technology, many forms, shared answers" |
| [3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md](architecture/3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md) | Complete blueprint for the Technology aggregate |
| [TECHNICAL-MANUAL.md](architecture/TECHNICAL-MANUAL.md) | Comprehensive technical documentation |

**Key Principle:** Read documents 1-3 in order - they build on each other.

### Operations (`docs/ops/`)

Day-to-day operational guidance and troubleshooting.

| Document | Description |
|----------|-------------|
| [TROUBLESHOOTING.md](ops/TROUBLESHOOTING.md) | Common issues and solutions |

### Testing (`docs/testing/`)

Test coverage and improvement planning.

| Document | Description |
|----------|-------------|
| [TEST-COVERAGE-REPORT.md](testing/TEST-COVERAGE-REPORT.md) | Current test coverage analysis |
| [TEST-IMPROVEMENT-PLAN.md](testing/TEST-IMPROVEMENT-PLAN.md) | Planned testing improvements |

### API (`docs/api/`)

API endpoint documentation.

| Document | Description |
|----------|-------------|
| [API_REFERENCE.md](api/API_REFERENCE.md) | Complete API endpoint reference |

## Root-Level Documents

These stay at the repository root by convention:

| Document | Description |
|----------|-------------|
| [README.md](../README.md) | Project overview and quick start |
| [CLAUDE.md](../CLAUDE.md) | AI assistant context (Claude Code) |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution guidelines |
| [AI-AGENTS-READ-ME-FIRST.md](../AI-AGENTS-READ-ME-FIRST.md) | Quick setup reference for AI agents |

## Folder Structure

```
docs/
├── README.md           # This index
├── onboarding/         # Newcomer guides
├── architecture/       # Design documents (read in numbered order)
├── ops/                # Operational runbooks
├── testing/            # Test coverage & plans
└── api/                # API documentation
```
