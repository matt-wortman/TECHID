# Project Directory Organization Proposal

Goal: make the repo easy to navigate for new devs by grouping docs, plans, and reports, while keeping the root focused on code and config. This is a proposal only—no files have been moved.

## Target layout (proposed)
- **Root (keep lean):** `README.md`, `CONTRIBUTING.md`, `package.json`, `tsconfig*`, `next.config.ts`, `docker-compose*.yml`, `tailwind.config.ts`, `postcss.config.mjs`, `jest*`, `playwright.mcp.config.json`, `components.json`, `Caddyfile.dev`, `Dockerfile`, `.env*` templates.
- **src/**, **tests/**, **prisma/**, **public/**, **scripts/** remain unchanged.
- **docs/** (all human-facing docs) with subfolders:
  - `docs/onboarding/` — newcomer guides.
  - `docs/architecture/` — roadmaps, plans, master plan, shared-answer design.
  - `docs/ops/` — troubleshooting/runbooks, environment notes.
  - `docs/testing/` — coverage reports, test improvement plans.
  - `docs/api/` — API reference or endpoints docs.
- **reports/** (optional) — generated outputs like coverage HTML, export snapshots.
- **plans/** — keep only if actively used for planning; otherwise fold into `docs/architecture/`.

## Where existing files would go
- Onboarding: `docs/tech-lifecycle-onboarding.md`, `docs/tech-multi-form-master-plan-plain-english.md`, `docs/DEVELOPER_ONBOARDING.md` → `docs/onboarding/`
- Architecture/Plans: `1-ARCHITECTURE_ROADMAP.md`, `2-shared-answer-architecture.md`, `3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md`, `TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md` (duplicate), `AI-AGENTS-READ-ME-FIRST.md`, any plan files in `plans/` → `docs/architecture/`
- Ops/Runbooks: `docs/TROUBLESHOOTING.md` → `docs/ops/`
- Testing: `TEST-COVERAGE-REPORT.md`, `TEST-IMPROVEMENT-PLAN.md`, `/coverage` reports → `docs/testing/` (HTML reports could move to `reports/coverage/`)
- API: `docs/API_REFERENCE.md` → `docs/api/`

## Quick actions to implement (if approved)
1) Create subfolders under `docs/`: `onboarding`, `architecture`, `ops`, `testing`, `api`.
2) Move the files listed above into their buckets; update intra-doc links and README references.
3) Add `docs/README.md` with a short index pointing to key docs for new devs.
4) (Optional) Move generated artifacts (`coverage/`) to `reports/` and update `.gitignore` if needed.
5) Update root `README.md` “Start Here” section to link onboarding + architecture overview.

## Notes
- No code changes required; this is purely organizational.
- We should confirm whether `TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md` and `3-TECHNOLOGY_MULTI_FORM_MASTER_PLAN.md` are both needed; if one is obsolete, archive it.
- If we keep `plans/`, add a brief `plans/README.md` describing how to use it, or fold its contents into `docs/architecture/`.
