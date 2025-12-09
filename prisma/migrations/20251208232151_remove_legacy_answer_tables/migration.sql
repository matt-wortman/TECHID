/*
  Warnings:

  - You are about to drop the `question_responses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `repeatable_group_responses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "question_responses" DROP CONSTRAINT "question_responses_questionRevisionId_fkey";

-- DropForeignKey
ALTER TABLE "question_responses" DROP CONSTRAINT "question_responses_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "repeatable_group_responses" DROP CONSTRAINT "repeatable_group_responses_questionRevisionId_fkey";

-- DropForeignKey
ALTER TABLE "repeatable_group_responses" DROP CONSTRAINT "repeatable_group_responses_submissionId_fkey";

-- DropTable
DROP TABLE "question_responses";

-- DropTable
DROP TABLE "repeatable_group_responses";
