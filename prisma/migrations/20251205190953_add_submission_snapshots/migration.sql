-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('SUBMISSION', 'STAGE_GATE');

-- CreateTable
CREATE TABLE "submission_snapshots" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "technologyId" TEXT,
    "snapshotType" "SnapshotType" NOT NULL DEFAULT 'SUBMISSION',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedBy" TEXT NOT NULL,
    "formAnswers" JSONB NOT NULL,
    "technologyMeta" JSONB,
    "calculatedScores" JSONB,
    "templateId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,

    CONSTRAINT "submission_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_snapshots_submissionId_idx" ON "submission_snapshots"("submissionId");

-- CreateIndex
CREATE INDEX "submission_snapshots_technologyId_idx" ON "submission_snapshots"("technologyId");

-- CreateIndex
CREATE INDEX "submission_snapshots_capturedAt_idx" ON "submission_snapshots"("capturedAt");

-- AddForeignKey
ALTER TABLE "submission_snapshots" ADD CONSTRAINT "submission_snapshots_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_snapshots" ADD CONSTRAINT "submission_snapshots_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
