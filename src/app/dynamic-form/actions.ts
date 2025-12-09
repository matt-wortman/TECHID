'use server'

import { prisma } from '@/lib/prisma'
import { SubmissionStatus, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { FormResponse, RepeatableGroupData, FormTemplateWithSections } from '@/lib/form-engine/types'
import {
  formSubmissionPayloadSchema,
  extractTechIdFromResponses,
  TechnologyIdRequiredError,
} from '@/lib/validation/form-submission'
import { sanitizeFormResponses } from '@/lib/validation/sanitize'
import { logger } from '@/lib/logger'
import { applyBindingWrites, fetchTemplateWithBindingsById, BindingMetadata, buildSubmissionAnswerMetadata } from '@/lib/technology/service'
import { RowVersionSnapshot, OptimisticLockError, AnswerStatusDetail } from '@/lib/technology/types'
import { captureSubmissionSnapshot } from '@/lib/snapshots/capture'

export interface FormSubmissionData {
  templateId: string
  responses: Record<string, unknown>
  repeatGroups: Record<string, unknown>
  calculatedScores?: Record<string, unknown>
  rowVersions?: RowVersionSnapshot
}

export interface FormSubmissionResult {
  success: boolean
  submissionId?: string
  error?: string
  rowVersions?: RowVersionSnapshot
}


const DEFAULT_SHARED_USER_ID =
  process.env.TEST_USER_ID || process.env.NEXT_PUBLIC_TEST_USER_ID || 'shared-user'

function resolveUserId(userId?: string) {
  if (userId && userId.trim().length > 0) {
    return userId.trim()
  }
  return DEFAULT_SHARED_USER_ID
}

/**
 * Submit a completed form response to the database
 */
export async function submitFormResponse(
  data: FormSubmissionData,
  userId?: string,
  existingDraftId?: string
): Promise<FormSubmissionResult> {
  try {
    const rawPayload = formSubmissionPayloadSchema.parse(data)

    // Sanitize user-provided form responses to prevent XSS
    const payload = {
      ...rawPayload,
      responses: sanitizeFormResponses(rawPayload.responses),
      repeatGroups: sanitizeFormResponses(rawPayload.repeatGroups),
    }

    const resolvedUser = resolveUserId(userId)
    const { bindingMetadata } = await fetchTemplateWithBindingsById(payload.templateId)

    // Validate that technologyId is provided (required for submission)
    const techId = extractTechIdFromResponses(payload.responses, bindingMetadata)
    if (!techId) {
      throw new TechnologyIdRequiredError(
        'Technology ID is required for submission. Please fill in the Technology ID field before submitting.'
      )
    }

    const bindingAwareResponses = mergeRepeatGroupBindings(
      payload.responses,
      payload.repeatGroups,
      bindingMetadata
    )

    let latestRowVersions: RowVersionSnapshot | undefined = payload.rowVersions

    // Start a database transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Attempt to reuse an existing draft if a draft ID is provided
      if (existingDraftId) {
        const draft = await tx.formSubmission.findFirst({
          where: {
            id: existingDraftId,
            status: SubmissionStatus.DRAFT,
          },
        })

        if (draft) {
          // Clear out any draft scores before reusing the submission record
          await tx.calculatedScore.deleteMany({
            where: { submissionId: draft.id },
          })

          const submission = await tx.formSubmission.update({
            where: { id: draft.id },
            data: {
              status: SubmissionStatus.SUBMITTED,
              submittedBy: resolvedUser,
              submittedAt: new Date(),
              updatedAt: new Date(),
            },
          })

          await createSubmissionData(tx, submission.id, payload, bindingMetadata)
          const bindingResult = await applyBindingWrites(tx, bindingMetadata, bindingAwareResponses, {
            userId: resolvedUser,
            allowCreateWhenIncomplete: true,
            expectedVersions: payload.rowVersions,
          })

          latestRowVersions = bindingResult.rowVersions ?? latestRowVersions

          if (bindingResult.technologyId) {
            await tx.formSubmission.update({
              where: { id: submission.id },
              data: { technologyId: bindingResult.technologyId },
            })
            submission.technologyId = bindingResult.technologyId
          }

          return submission
        }
      }

      // Create a new submission if no draft was reused
      const submission = await tx.formSubmission.create({
        data: {
          templateId: payload.templateId,
          submittedBy: resolvedUser,
          status: SubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      })

      await createSubmissionData(tx, submission.id, payload, bindingMetadata)
      const bindingResult = await applyBindingWrites(tx, bindingMetadata, bindingAwareResponses, {
        userId: resolvedUser,
        allowCreateWhenIncomplete: true,
        expectedVersions: payload.rowVersions,
      })

      latestRowVersions = bindingResult.rowVersions ?? latestRowVersions

      if (bindingResult.technologyId) {
        await tx.formSubmission.update({
          where: { id: submission.id },
          data: { technologyId: bindingResult.technologyId },
        })
        submission.technologyId = bindingResult.technologyId
      }

      return submission
    })

    // Capture time-lock snapshot after successful submission
    // This is non-blocking - if it fails, submission still succeeds
    await captureSubmissionSnapshot(
      {
        submissionId: result.id,
        templateId: payload.templateId,
        responses: payload.responses,
        repeatGroups: payload.repeatGroups,
        calculatedScores: payload.calculatedScores,
        technologyId: result.technologyId,
        capturedBy: resolvedUser,
      },
      bindingMetadata
    )

    // Revalidate pages to reflect changes
    revalidatePath('/dynamic-form/drafts')
    revalidatePath('/dynamic-form/submissions')

    return {
      success: true,
      submissionId: result.id,
      rowVersions: latestRowVersions,
    }
  } catch (error) {
    if (error instanceof OptimisticLockError) {
      return {
        success: false,
        error: 'conflict',
      }
    }
    if (error instanceof TechnologyIdRequiredError) {
      return {
        success: false,
        error: error.message,
      }
    }
    logger.error('Error submitting form', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

function mergeRepeatGroupBindings(
  responses: Record<string, unknown>,
  repeatGroups: Record<string, unknown>,
  bindingMetadata: Record<string, BindingMetadata>
): Record<string, unknown> {
  if (!repeatGroups || Object.keys(repeatGroups).length === 0) {
    return responses
  }

  let merged: Record<string, unknown> | null = null

  for (const [questionKey, rows] of Object.entries(repeatGroups)) {
    if (!bindingMetadata[questionKey]) {
      continue
    }
    if (!Array.isArray(rows)) {
      continue
    }

    if (!merged) {
      merged = { ...responses }
    }
    merged[questionKey] = rows
  }

  return merged ?? responses
}

/**
 * Create submission data entries (CalculatedScore)
 *
 * Answer data is stored in TechnologyAnswer via applyBindingWrites().
 */
async function createSubmissionData(
  tx: Prisma.TransactionClient,
  submissionId: string,
  payload: ReturnType<typeof formSubmissionPayloadSchema.parse>,
  _bindingMetadata: Record<string, BindingMetadata>
) {
  // CalculatedScore writes
  if (payload.calculatedScores && typeof payload.calculatedScores === 'object') {
    const scoreEntries = Object.entries(payload.calculatedScores)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .map(([scoreType, value]) => ({
        submissionId,
        scoreType,
        value: Number(value),
      }))

    if (scoreEntries.length > 0) {
      await tx.calculatedScore.createMany({
        data: scoreEntries,
      })
    }
  }
}

/**
 * Save a draft form response to the database
 */
export async function saveDraftResponse(
  data: FormSubmissionData,
  userId?: string,
  existingDraftId?: string
): Promise<FormSubmissionResult> {
  try {
    const rawPayload = formSubmissionPayloadSchema.parse(data)

    // Sanitize user-provided form responses to prevent XSS
    const payload = {
      ...rawPayload,
      responses: sanitizeFormResponses(rawPayload.responses),
      repeatGroups: sanitizeFormResponses(rawPayload.repeatGroups),
    }

    const resolvedUser = resolveUserId(userId)
    const { bindingMetadata } = await fetchTemplateWithBindingsById(payload.templateId)
    const trimmedUserId = userId && userId.trim().length > 0 ? userId.trim() : undefined
    const bindingAwareResponses = mergeRepeatGroupBindings(
      payload.responses,
      payload.repeatGroups,
      bindingMetadata
    )

    let latestRowVersions: RowVersionSnapshot | undefined = payload.rowVersions

    // Check if we're updating an existing draft
    if (existingDraftId) {
      const result = await prisma.$transaction(async (tx) => {
        const existingDraft = await tx.formSubmission.findFirst({
          where: {
            id: existingDraftId,
            status: SubmissionStatus.DRAFT,
          },
        })

        if (!existingDraft) {
          throw new Error('Draft not found or access denied')
        }

        // Update the existing submission
        const submission = await tx.formSubmission.update({
          where: { id: existingDraft.id },
          data: {
            updatedAt: new Date(),
          },
        })

        // Delete existing scores before recreating them
        await tx.calculatedScore.deleteMany({
          where: { submissionId: existingDraftId },
        })

        await createSubmissionData(tx, submission.id, payload, bindingMetadata)

        const bindingResult = await applyBindingWrites(tx, bindingMetadata, bindingAwareResponses, {
          userId: resolvedUser,
          allowCreateWhenIncomplete: false,
          expectedVersions: payload.rowVersions,
        })

        latestRowVersions = bindingResult.rowVersions ?? latestRowVersions

        if (bindingResult.technologyId) {
          await tx.formSubmission.update({
            where: { id: submission.id },
            data: { technologyId: bindingResult.technologyId },
          })
          submission.technologyId = bindingResult.technologyId
        }

        return submission
      })

      revalidatePath('/dynamic-form/drafts')

      return {
        success: true,
        submissionId: result.id,
        rowVersions: latestRowVersions,
      }
    } else {
      // Create new draft - require technologyId for new drafts
      const techId = extractTechIdFromResponses(payload.responses, bindingMetadata)
      if (!techId) {
        throw new TechnologyIdRequiredError(
          'Technology ID is required to save a draft. Please fill in the Technology ID field.'
        )
      }

      const result = await prisma.$transaction(async (tx) => {
        const submission = await tx.formSubmission.create({
          data: {
            templateId: payload.templateId,
            submittedBy: trimmedUserId ?? resolvedUser,
            status: SubmissionStatus.DRAFT,
          },
        })

        await createSubmissionData(tx, submission.id, payload, bindingMetadata)

        const bindingResult = await applyBindingWrites(tx, bindingMetadata, bindingAwareResponses, {
          userId: resolvedUser,
          allowCreateWhenIncomplete: false,
          expectedVersions: payload.rowVersions,
        })

        latestRowVersions = bindingResult.rowVersions ?? latestRowVersions

        if (bindingResult.technologyId) {
          await tx.formSubmission.update({
            where: { id: submission.id },
            data: { technologyId: bindingResult.technologyId },
          })
          submission.technologyId = bindingResult.technologyId
        }

        return submission
      })

      revalidatePath('/dynamic-form/drafts')

      return {
        success: true,
        submissionId: result.id,
        rowVersions: latestRowVersions,
      }
    }
  } catch (error) {
    if (error instanceof OptimisticLockError) {
      return {
        success: false,
        error: 'conflict',
      }
    }
    if (error instanceof TechnologyIdRequiredError) {
      return {
        success: false,
        error: error.message,
      }
    }
    logger.error('Error saving draft', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Load a draft form response from the database
 *
 * Answers are loaded from TechnologyAnswer (the source of truth).
 */
export async function loadDraftResponse(draftId: string, userId?: string) {
  try {
    const resolvedUser = resolveUserId(userId)
    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: draftId,
        status: SubmissionStatus.DRAFT,
      },
      include: {
        scores: true,
      },
    })

    if (!submission) {
      logger.warn({ draftId, requestedBy: resolvedUser }, 'Draft not found or access denied')
      return {
        success: false,
        error: 'Draft not found or access denied',
      }
    }

    const { template } = await fetchTemplateWithBindingsById(submission.templateId)

    // Build set of repeat group keys for this template
    const repeatGroupKeys = new Set<string>()
    for (const section of template.sections) {
      for (const question of section.questions) {
        if (question.type === 'REPEATABLE_GROUP' && question.dictionaryKey) {
          repeatGroupKeys.add(question.dictionaryKey)
        }
      }
    }

    const responses: FormResponse = {}
    const repeatGroups: RepeatableGroupData = {}
    let answerMetadata: Record<string, AnswerStatusDetail>

    // Load answers from TechnologyAnswer if submission has a technologyId
    if (submission.technologyId) {
      const technologyAnswers = await prisma.technologyAnswer.findMany({
        where: { technologyId: submission.technologyId },
      })

      // Transform TechnologyAnswer to responses and repeatGroups
      for (const answer of technologyAnswers) {
        if (repeatGroupKeys.has(answer.questionKey)) {
          repeatGroups[answer.questionKey] = answer.value as Record<string, unknown>[]
        } else {
          responses[answer.questionKey] = answer.value as string | number | boolean | string[] | Record<string, unknown>
        }
      }

      // Build answerMetadata from TechnologyAnswer data
      const responseRecords = technologyAnswers
        .filter((a) => !repeatGroupKeys.has(a.questionKey))
        .map((answer) => ({
          questionCode: answer.questionKey,
          value: answer.value,
          questionRevisionId: answer.revisionId ?? null,
        }))

      const repeatGroupRecords: { questionCode: string; rowIndex: number; data: unknown; questionRevisionId: string | null }[] = []
      for (const answer of technologyAnswers) {
        if (repeatGroupKeys.has(answer.questionKey)) {
          const rows = answer.value as Record<string, unknown>[]
          rows.forEach((row, index) => {
            repeatGroupRecords.push({
              questionCode: answer.questionKey,
              rowIndex: index,
              data: row,
              questionRevisionId: answer.revisionId ?? null,
            })
          })
        }
      }

      answerMetadata = buildSubmissionAnswerMetadata(
        template,
        responseRecords,
        repeatGroupRecords,
        { answeredAt: submission.updatedAt }
      )

      logger.info(
        { draftId, requestedBy: resolvedUser, technologyId: submission.technologyId },
        'Draft loaded from TechnologyAnswer'
      )
    } else {
      // No technologyId - return empty responses (draft hasn't been saved with binding writes yet)
      answerMetadata = buildSubmissionAnswerMetadata(template, [], [], { answeredAt: submission.updatedAt })
      logger.info({ draftId, requestedBy: resolvedUser }, 'Draft has no technologyId - returning empty responses')
    }

    const calculatedScores: Record<string, number> = {}
    submission.scores.forEach((score) => {
      calculatedScores[score.scoreType] = score.value
    })

    return {
      success: true,
      data: {
        templateId: submission.templateId,
        responses,
        repeatGroups,
        calculatedScores,
        answerMetadata,
      },
      submissionId: submission.id,
    }
  } catch (error) {
    logger.error('Error loading draft', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Delete a draft form response
 */
export async function deleteDraftResponse(draftId: string, userId?: string) {
  try {
    const resolvedUser = resolveUserId(userId)
    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: draftId,
        status: SubmissionStatus.DRAFT,
      },
    })

    if (!submission) {
      logger.warn({ draftId, requestedBy: resolvedUser }, 'Draft not found or access denied during delete')
      return {
        success: false,
        error: 'Draft not found or access denied',
      }
    }

    // Delete the submission (cascade will handle related records)
    await prisma.formSubmission.delete({
      where: { id: draftId },
    })

    revalidatePath('/dynamic-form/drafts')
    logger.info({ draftId, deletedBy: resolvedUser }, 'Draft deleted')

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Error deleting draft', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get all drafts for a user
 */
type ListScope = 'all' | 'user'

export async function getUserDrafts(userId?: string, scope: ListScope = 'all') {
  try {
    const where: Prisma.FormSubmissionWhereInput = {
      status: SubmissionStatus.DRAFT,
    }

    if (scope === 'user' && userId && userId.trim().length > 0) {
      where.submittedBy = userId.trim()
    }

    const drafts = await prisma.formSubmission.findMany({
      where,
      include: {
        template: {
          select: {
            name: true,
            version: true,
          },
        },
        technology: {
          select: {
            techId: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return {
      success: true,
      drafts: drafts.map((draft) => {
        // Use techId from linked technology as display name, fall back to template name
        const draftName = draft.technology?.techId

        return {
          id: draft.id,
          templateName: draftName && draftName.length > 0 ? draftName : draft.template.name,
          templateVersion: draft.template.version,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
          submittedBy: draft.submittedBy,
        }
      }),
    }
  } catch (error) {
    logger.error('Error fetching drafts', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get all non-draft submissions for a user
 */
export async function getUserSubmissions(userId?: string, scope: ListScope = 'all') {
  try {
    const where: Prisma.FormSubmissionWhereInput = {
      status: {
        in: [SubmissionStatus.SUBMITTED, SubmissionStatus.REVIEWED, SubmissionStatus.ARCHIVED],
      },
    }

    if (scope === 'user' && userId && userId.trim().length > 0) {
      where.submittedBy = userId.trim()
    }

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: {
        template: {
          select: {
            name: true,
            version: true,
          },
        },
        technology: {
          select: {
            techId: true,
          },
        },
      },
      orderBy: [
        { submittedAt: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return {
      success: true,
      submissions: submissions.map((submission) => {
        // Use techId from linked technology as display name, fall back to template name
        const submissionName = submission.technology?.techId

        return {
          id: submission.id,
          templateName: submissionName && submissionName.length > 0 ? submissionName : submission.template.name,
          templateVersion: submission.template.version,
          status: submission.status,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          submittedAt: submission.submittedAt,
          submittedBy: submission.submittedBy,
        }
      }),
    }
  } catch (error) {
    logger.error('Error fetching submissions', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function getSubmissionDetail(submissionId: string) {
  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        template: {
          include: {
            sections: {
              include: {
                questions: {
                  include: {
                    options: true,
                    scoringConfig: true,
                  },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        scores: true,
      },
    })

    if (!submission || !submission.template) {
      return {
        success: false,
        error: 'Submission not found',
      }
    }

    // Build set of repeat group keys for this template
    const repeatGroupKeys = new Set<string>()
    for (const section of submission.template.sections) {
      for (const question of section.questions) {
        if (question.type === 'REPEATABLE_GROUP' && question.dictionaryKey) {
          repeatGroupKeys.add(question.dictionaryKey)
        }
      }
    }

    const responses: FormResponse = {}
    const repeatGroups: RepeatableGroupData = {}

    // Load answers from TechnologyAnswer if submission has a technologyId
    if (submission.technologyId) {
      const technologyAnswers = await prisma.technologyAnswer.findMany({
        where: { technologyId: submission.technologyId },
      })

      // Transform TechnologyAnswer to responses and repeatGroups
      for (const answer of technologyAnswers) {
        if (repeatGroupKeys.has(answer.questionKey)) {
          repeatGroups[answer.questionKey] = answer.value as Record<string, unknown>[]
        } else {
          responses[answer.questionKey] = answer.value as FormResponse[string]
        }
      }

      logger.info(
        { submissionId, technologyId: submission.technologyId },
        'Submission detail loaded from TechnologyAnswer'
      )
    } else {
      logger.info({ submissionId }, 'Submission has no technologyId - returning empty responses')
    }

    const calculatedScores = submission.scores.reduce<Record<string, number>>((acc, score) => {
      acc[score.scoreType] = score.value
      return acc
    }, {})

    return {
      success: true,
      data: {
        template: submission.template as FormTemplateWithSections,
        submissionId: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        submittedBy: submission.submittedBy,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        responses,
        repeatGroups,
        calculatedScores,
      },
    }
  } catch (error) {
    logger.error('Error loading submission detail', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get all snapshots for a submission
 */
export async function getSubmissionSnapshots(submissionId: string) {
  try {
    const snapshots = await prisma.submissionSnapshot.findMany({
      where: { submissionId },
      orderBy: { capturedAt: 'desc' },
      select: {
        id: true,
        capturedAt: true,
        capturedBy: true,
        snapshotType: true,
        templateVersion: true,
      },
    })

    return {
      success: true,
      snapshots,
    }
  } catch (error) {
    logger.error('Error fetching submission snapshots', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get detailed snapshot data for viewing
 */
export async function getSnapshotDetail(snapshotId: string) {
  try {
    const snapshot = await prisma.submissionSnapshot.findUnique({
      where: { id: snapshotId },
      include: {
        submission: {
          include: {
            template: {
              include: {
                sections: {
                  include: {
                    questions: {
                      include: {
                        options: true,
                        scoringConfig: true,
                      },
                      orderBy: { order: 'asc' },
                    },
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!snapshot) {
      return {
        success: false,
        error: 'Snapshot not found',
      }
    }

    // Parse the JSON fields
    const formAnswers = snapshot.formAnswers as {
      responses: Record<string, unknown>
      repeatGroups: Record<string, Record<string, unknown>[]>
      questionRevisions: Record<string, string | null>
    }

    const technologyMeta = snapshot.technologyMeta as Record<string, unknown> | null
    const calculatedScores = snapshot.calculatedScores as Record<string, unknown> | null

    return {
      success: true,
      data: {
        snapshotId: snapshot.id,
        capturedAt: snapshot.capturedAt,
        capturedBy: snapshot.capturedBy,
        snapshotType: snapshot.snapshotType,
        templateId: snapshot.templateId,
        templateVersion: snapshot.templateVersion,
        template: snapshot.submission.template as FormTemplateWithSections,
        responses: formAnswers.responses,
        repeatGroups: formAnswers.repeatGroups,
        questionRevisions: formAnswers.questionRevisions,
        technologyMeta,
        calculatedScores,
        submission: {
          id: snapshot.submission.id,
          status: snapshot.submission.status,
          submittedAt: snapshot.submission.submittedAt,
          submittedBy: snapshot.submission.submittedBy,
        },
      },
    }
  } catch (error) {
    logger.error('Error loading snapshot detail', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
