-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'INTEGER', 'SINGLE_SELECT', 'MULTI_SELECT', 'CHECKBOX_GROUP', 'DATE', 'REPEATABLE_GROUP', 'SCORING_0_3', 'SCORING_MATRIX', 'DATA_TABLE_SELECTOR');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TechStage" AS ENUM ('TRIAGE', 'VIABILITY', 'COMMERCIAL', 'MARKET_READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TechStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'ABANDONED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('TECHNOLOGY', 'STAGE_SUPPLEMENT', 'CALCULATED');

-- CreateTable
CREATE TABLE "triage_competitors" (
    "id" TEXT NOT NULL,
    "triageStageId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "product" TEXT,
    "revenue" TEXT,
    "notes" TEXT,

    CONSTRAINT "triage_competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_smes" (
    "id" TEXT NOT NULL,
    "triageStageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "organization" TEXT,
    "contactInfo" TEXT,
    "expertise" TEXT,
    "recommendation" TEXT,

    CONSTRAINT "triage_smes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "form_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_questions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "helpText" TEXT,
    "placeholder" TEXT,
    "validation" JSONB,
    "conditional" JSONB,
    "repeatableConfig" JSONB,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "dictionaryKey" TEXT NOT NULL,

    CONSTRAINT "form_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_configs" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 3,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "criteria" JSONB NOT NULL,

    CONSTRAINT "scoring_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "technologyId" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_responses" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionCode" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "questionRevisionId" TEXT,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repeatable_group_responses" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionCode" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "questionRevisionId" TEXT,

    CONSTRAINT "repeatable_group_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculated_scores" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "scoreType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculated_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "techId" TEXT NOT NULL,
    "technologyName" TEXT NOT NULL,
    "shortDescription" TEXT,
    "inventorName" TEXT NOT NULL,
    "inventorTitle" TEXT,
    "inventorDept" TEXT,
    "reviewerName" TEXT NOT NULL,
    "domainAssetClass" TEXT NOT NULL,
    "currentStage" "TechStage" NOT NULL DEFAULT 'TRIAGE',
    "status" "TechStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastStageTouched" "TechStage",
    "lastModifiedBy" TEXT,
    "lastModifiedAt" TIMESTAMP(3),

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_stages" (
    "id" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "extendedData" JSONB,
    "technologyOverview" TEXT NOT NULL,
    "missionAlignmentText" TEXT NOT NULL,
    "missionAlignmentScore" INTEGER NOT NULL DEFAULT 0,
    "unmetNeedText" TEXT NOT NULL,
    "unmetNeedScore" INTEGER NOT NULL DEFAULT 0,
    "stateOfArtText" TEXT NOT NULL,
    "stateOfArtScore" INTEGER NOT NULL DEFAULT 0,
    "marketOverview" TEXT NOT NULL,
    "marketScore" INTEGER NOT NULL DEFAULT 0,
    "impactScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valueScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendation" TEXT NOT NULL DEFAULT '',
    "recommendationNotes" TEXT,

    CONSTRAINT "triage_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viability_stages" (
    "id" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "extendedData" JSONB,
    "technicalFeasibility" TEXT NOT NULL,
    "regulatoryPathway" TEXT NOT NULL,
    "costAnalysis" TEXT NOT NULL,
    "timeToMarket" INTEGER,
    "resourceRequirements" TEXT NOT NULL,
    "riskAssessment" TEXT NOT NULL,
    "technicalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commercialScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallViability" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "viability_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_history" (
    "id" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "stage" "TechStage" NOT NULL,
    "changeType" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technology_audit_log" (
    "id" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "stage" "TechStage",
    "persona" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technology_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculated_metrics" (
    "id" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "expression" TEXT NOT NULL,
    "dependsOn" TEXT[],
    "calculatedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,

    CONSTRAINT "calculated_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_revisions" (
    "id" TEXT NOT NULL,
    "dictionaryId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "changeReason" TEXT,
    "significantChange" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "question_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_dictionary" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "currentRevisionId" TEXT,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "bindingPath" TEXT NOT NULL,
    "dataSource" "DataSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_dictionary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technology_answers" (
    "id" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredBy" TEXT NOT NULL,
    "revisionId" TEXT,

    CONSTRAINT "technology_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_personas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contactInfo" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "triage_competitors_triageStageId_idx" ON "triage_competitors"("triageStageId");

-- CreateIndex
CREATE INDEX "triage_smes_triageStageId_idx" ON "triage_smes"("triageStageId");

-- CreateIndex
CREATE INDEX "form_sections_templateId_idx" ON "form_sections"("templateId");

-- CreateIndex
CREATE INDEX "form_questions_sectionId_idx" ON "form_questions"("sectionId");

-- CreateIndex
CREATE INDEX "form_questions_dictionaryKey_idx" ON "form_questions"("dictionaryKey");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_configs_questionId_key" ON "scoring_configs"("questionId");

-- CreateIndex
CREATE INDEX "form_submissions_technologyId_idx" ON "form_submissions"("technologyId");

-- CreateIndex
CREATE INDEX "question_responses_submissionId_idx" ON "question_responses"("submissionId");

-- CreateIndex
CREATE INDEX "question_responses_questionCode_idx" ON "question_responses"("questionCode");

-- CreateIndex
CREATE INDEX "question_responses_questionRevisionId_idx" ON "question_responses"("questionRevisionId");

-- CreateIndex
CREATE INDEX "repeatable_group_responses_submissionId_idx" ON "repeatable_group_responses"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_techId_key" ON "technologies"("techId");

-- CreateIndex
CREATE INDEX "technologies_techId_idx" ON "technologies"("techId");

-- CreateIndex
CREATE INDEX "technologies_currentStage_idx" ON "technologies"("currentStage");

-- CreateIndex
CREATE UNIQUE INDEX "triage_stages_technologyId_key" ON "triage_stages"("technologyId");

-- CreateIndex
CREATE UNIQUE INDEX "viability_stages_technologyId_key" ON "viability_stages"("technologyId");

-- CreateIndex
CREATE INDEX "stage_history_technologyId_stage_idx" ON "stage_history"("technologyId", "stage");

-- CreateIndex
CREATE INDEX "technology_audit_log_technologyId_changedAt_idx" ON "technology_audit_log"("technologyId", "changedAt");

-- CreateIndex
CREATE INDEX "attachments_technologyId_idx" ON "attachments"("technologyId");

-- CreateIndex
CREATE INDEX "calculated_metrics_technology_key_idx" ON "calculated_metrics"("technologyId", "key");

-- CreateIndex
CREATE INDEX "question_revisions_dictionaryId_idx" ON "question_revisions"("dictionaryId");

-- CreateIndex
CREATE UNIQUE INDEX "question_revisions_questionKey_versionNumber_key" ON "question_revisions"("questionKey", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "question_dictionary_key_key" ON "question_dictionary"("key");

-- CreateIndex
CREATE UNIQUE INDEX "question_dictionary_currentRevisionId_key" ON "question_dictionary"("currentRevisionId");

-- CreateIndex
CREATE INDEX "question_dictionary_version_idx" ON "question_dictionary"("version");

-- CreateIndex
CREATE INDEX "technology_answers_technologyId_idx" ON "technology_answers"("technologyId");

-- CreateIndex
CREATE INDEX "technology_answers_questionKey_idx" ON "technology_answers"("questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "technology_answers_technologyId_questionKey_key" ON "technology_answers"("technologyId", "questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "personas_code_key" ON "personas"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_personas_userId_personaId_key" ON "user_personas"("userId", "personaId");

-- AddForeignKey
ALTER TABLE "triage_competitors" ADD CONSTRAINT "triage_competitors_triageStageId_fkey" FOREIGN KEY ("triageStageId") REFERENCES "triage_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_smes" ADD CONSTRAINT "triage_smes_triageStageId_fkey" FOREIGN KEY ("triageStageId") REFERENCES "triage_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "form_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_dictionaryKey_fkey" FOREIGN KEY ("dictionaryKey") REFERENCES "question_dictionary"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_configs" ADD CONSTRAINT "scoring_configs_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_questionRevisionId_fkey" FOREIGN KEY ("questionRevisionId") REFERENCES "question_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repeatable_group_responses" ADD CONSTRAINT "repeatable_group_responses_questionRevisionId_fkey" FOREIGN KEY ("questionRevisionId") REFERENCES "question_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repeatable_group_responses" ADD CONSTRAINT "repeatable_group_responses_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculated_scores" ADD CONSTRAINT "calculated_scores_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_stages" ADD CONSTRAINT "triage_stages_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viability_stages" ADD CONSTRAINT "viability_stages_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_history" ADD CONSTRAINT "stage_history_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_audit_log" ADD CONSTRAINT "technology_audit_log_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculated_metrics" ADD CONSTRAINT "calculated_metrics_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_dictionaryId_fkey" FOREIGN KEY ("dictionaryId") REFERENCES "question_dictionary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_dictionary" ADD CONSTRAINT "question_dictionary_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "question_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_answers" ADD CONSTRAINT "technology_answers_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_answers" ADD CONSTRAINT "technology_answers_questionKey_fkey" FOREIGN KEY ("questionKey") REFERENCES "question_dictionary"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_answers" ADD CONSTRAINT "technology_answers_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "question_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_personas" ADD CONSTRAINT "user_personas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_personas" ADD CONSTRAINT "user_personas_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
