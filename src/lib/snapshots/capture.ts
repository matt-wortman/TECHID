import { prisma } from '@/lib/prisma'
import { SnapshotType, Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { BindingMetadata } from '@/lib/technology/service'
import {
  CaptureSnapshotOptions,
  CaptureSnapshotResult,
  SnapshotFormAnswers,
  SnapshotTechnologyMeta,
  SnapshotTriageStage,
  SnapshotViabilityStage,
} from './types'

/**
 * Captures an immutable snapshot of form answers and technology metadata
 * at the time of submission. This creates a frozen point-in-time record
 * for historical reference.
 *
 * This function is designed to be non-blocking - if snapshot capture fails,
 * it logs the error but does not throw, allowing the submission to succeed.
 */
export async function captureSubmissionSnapshot(
  options: CaptureSnapshotOptions,
  bindingMetadata?: Record<string, BindingMetadata>
): Promise<CaptureSnapshotResult> {
  const {
    submissionId,
    templateId,
    responses,
    repeatGroups,
    calculatedScores,
    technologyId,
    capturedBy,
    snapshotType = SnapshotType.SUBMISSION,
  } = options

  try {
    // 1. Fetch template for version info
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      select: { version: true },
    })

    if (!template) {
      logger.warn('Template not found for snapshot capture', { templateId, submissionId })
      return { success: false, error: 'Template not found' }
    }

    // 2. Build question revision map from binding metadata
    const questionRevisions: Record<string, string | null> = {}
    if (bindingMetadata) {
      for (const [key, meta] of Object.entries(bindingMetadata)) {
        questionRevisions[key] = meta.currentRevisionId ?? null
      }
    }

    // 3. Build formAnswers payload
    const formAnswers: SnapshotFormAnswers = {
      responses: responses as Record<string, unknown>,
      repeatGroups: repeatGroups as Record<string, Record<string, unknown>[]>,
      questionRevisions,
    }

    // 4. Fetch and build technologyMeta (if bound to a technology)
    let technologyMeta: SnapshotTechnologyMeta | null = null
    if (technologyId) {
      technologyMeta = await buildTechnologyMeta(technologyId)
    }

    // 5. Create the snapshot record
    const snapshot = await prisma.submissionSnapshot.create({
      data: {
        submissionId,
        technologyId: technologyId ?? undefined,
        snapshotType,
        capturedBy,
        formAnswers: formAnswers as unknown as Prisma.InputJsonValue,
        technologyMeta: technologyMeta as unknown as Prisma.InputJsonValue | undefined,
        calculatedScores: calculatedScores as unknown as Prisma.InputJsonValue | undefined,
        templateId,
        templateVersion: template.version,
      },
    })

    logger.info('Snapshot captured successfully', {
      snapshotId: snapshot.id,
      submissionId,
      technologyId,
      snapshotType,
    })

    return { success: true, snapshotId: snapshot.id }
  } catch (error) {
    // Non-blocking: log error but don't throw
    logger.error('Failed to capture submission snapshot', {
      error: error instanceof Error ? error.message : String(error),
      submissionId,
      templateId,
      technologyId,
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during snapshot capture',
    }
  }
}

/**
 * Builds the technology metadata object for snapshot storage
 */
async function buildTechnologyMeta(technologyId: string): Promise<SnapshotTechnologyMeta | null> {
  const tech = await prisma.technology.findUnique({
    where: { id: technologyId },
    include: {
      triageStage: true,
      viabilityStage: true,
    },
  })

  if (!tech) {
    logger.warn('Technology not found for snapshot metadata', { technologyId })
    return null
  }

  // Build triage stage snapshot if present
  let triageStage: SnapshotTriageStage | undefined
  if (tech.triageStage) {
    triageStage = {
      missionAlignmentScore: tech.triageStage.missionAlignmentScore,
      missionAlignmentText: tech.triageStage.missionAlignmentText,
      unmetNeedScore: tech.triageStage.unmetNeedScore,
      unmetNeedText: tech.triageStage.unmetNeedText,
      stateOfArtScore: tech.triageStage.stateOfArtScore,
      stateOfArtText: tech.triageStage.stateOfArtText,
      marketScore: tech.triageStage.marketScore,
      marketOverview: tech.triageStage.marketOverview,
      impactScore: tech.triageStage.impactScore,
      valueScore: tech.triageStage.valueScore,
      recommendation: tech.triageStage.recommendation,
      recommendationNotes: tech.triageStage.recommendationNotes ?? undefined,
    }
  }

  // Build viability stage snapshot if present
  let viabilityStage: SnapshotViabilityStage | undefined
  if (tech.viabilityStage) {
    viabilityStage = {
      technicalFeasibility: tech.viabilityStage.technicalFeasibility,
      regulatoryPathway: tech.viabilityStage.regulatoryPathway,
      costAnalysis: tech.viabilityStage.costAnalysis,
      timeToMarket: tech.viabilityStage.timeToMarket ?? undefined,
      resourceRequirements: tech.viabilityStage.resourceRequirements,
      riskAssessment: tech.viabilityStage.riskAssessment,
      technicalScore: tech.viabilityStage.technicalScore,
      commercialScore: tech.viabilityStage.commercialScore,
      overallViability: tech.viabilityStage.overallViability,
    }
  }

  return {
    id: tech.id,
    techId: tech.techId,
    technologyName: tech.technologyName,
    shortDescription: tech.shortDescription ?? undefined,
    inventorName: tech.inventorName,
    inventorTitle: tech.inventorTitle ?? undefined,
    inventorDept: tech.inventorDept ?? undefined,
    reviewerName: tech.reviewerName,
    domainAssetClass: tech.domainAssetClass,
    currentStage: tech.currentStage,
    status: tech.status,
    rowVersions: {
      technologyRowVersion: tech.rowVersion,
      triageStageRowVersion: tech.triageStage?.rowVersion,
      viabilityStageRowVersion: tech.viabilityStage?.rowVersion,
    },
    triageStage,
    viabilityStage,
  }
}
