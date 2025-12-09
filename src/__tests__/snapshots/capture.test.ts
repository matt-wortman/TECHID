/**
 * @jest-environment node
 */
/* eslint-disable no-var */
import { SnapshotType, TechStage, TechStatus } from '@prisma/client'
import type { CaptureSnapshotOptions } from '@/lib/snapshots/types'
import type { BindingMetadata } from '@/lib/technology/service'

// Define mock types upfront
type PrismaMocks = {
  formTemplateFindUnique: jest.Mock
  technologyFindUnique: jest.Mock
  submissionSnapshotCreate: jest.Mock
}

var prismaMocks: PrismaMocks

// Mock logger first to avoid side effects
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const { logger: mockLogger } = jest.requireMock('@/lib/logger') as {
  logger: {
    info: jest.Mock
    warn: jest.Mock
    error: jest.Mock
  }
}

// Mock Prisma client
jest.mock('@/lib/prisma', () => {
  prismaMocks = {
    formTemplateFindUnique: jest.fn(),
    technologyFindUnique: jest.fn(),
    submissionSnapshotCreate: jest.fn(),
  }

  return {
    prisma: {
      formTemplate: {
        findUnique: prismaMocks.formTemplateFindUnique,
      },
      technology: {
        findUnique: prismaMocks.technologyFindUnique,
      },
      submissionSnapshot: {
        create: prismaMocks.submissionSnapshotCreate,
      },
    },
  }
})

// Import after mocks are set up
import { captureSubmissionSnapshot } from '@/lib/snapshots/capture'

describe('captureSubmissionSnapshot', () => {
  const TEMPLATE_ID = 'template-123'
  const SUBMISSION_ID = 'submission-456'
  const TECHNOLOGY_ID = 'tech-789'
  const USER_ID = 'user-test'

  const baseOptions: CaptureSnapshotOptions = {
    submissionId: SUBMISSION_ID,
    templateId: TEMPLATE_ID,
    responses: {
      'tech.techId': 'TECH-2025-001',
      'tech.technologyName': 'AI Diagnostic Tool',
      'triage.missionAlignmentScore': 3,
    },
    repeatGroups: {
      'team.inventors': [
        { name: 'Dr. Smith', department: 'Oncology' },
        { name: 'Dr. Jones', department: 'Research' },
      ],
    },
    calculatedScores: {
      impactScore: 2.5,
      valueScore: 2.0,
    },
    capturedBy: USER_ID,
    snapshotType: SnapshotType.SUBMISSION,
  }

  const mockTemplate = {
    id: TEMPLATE_ID,
    version: '1.0.0',
  }

  const mockTechnology = {
    id: TECHNOLOGY_ID,
    techId: 'TECH-2025-001',
    technologyName: 'AI Diagnostic Tool',
    shortDescription: 'AI-powered diagnostic assistance',
    inventorName: 'Dr. Smith',
    inventorTitle: 'Chief Scientist',
    inventorDept: 'Research',
    reviewerName: 'Dr. Johnson',
    domainAssetClass: 'Medical Device',
    currentStage: TechStage.TRIAGE,
    status: TechStatus.ACTIVE,
    rowVersion: 5,
    triageStage: null,
    viabilityStage: null,
  }

  const mockTriageStage = {
    id: 'triage-123',
    rowVersion: 3,
    missionAlignmentScore: 3,
    missionAlignmentText: 'Highly aligned with mission',
    unmetNeedScore: 2,
    unmetNeedText: 'Moderate unmet need',
    stateOfArtScore: 3,
    stateOfArtText: 'Advances state of art',
    marketScore: 2,
    marketOverview: 'Growing market',
    impactScore: 2.5,
    valueScore: 2.5,
    recommendation: 'PROCEED',
    recommendationNotes: 'Promising technology',
  }

  const mockViabilityStage = {
    id: 'viability-456',
    rowVersion: 2,
    technicalFeasibility: 'High feasibility',
    regulatoryPathway: 'FDA 510(k)',
    costAnalysis: 'Moderate investment required',
    timeToMarket: 24,
    resourceRequirements: 'Team of 5',
    riskAssessment: 'Low to moderate risk',
    technicalScore: 4.2,
    commercialScore: 3.8,
    overallViability: 'Viable',
  }

  const bindingMetadata: Record<string, BindingMetadata> = {
    'tech.techId': {
      questionId: 'q-1',
      dictionaryKey: 'tech.techId',
      bindingPath: 'technology.techId',
      dataSource: 'TECHNOLOGY' as const,
      currentRevisionId: 'rev-001',
    },
    'tech.technologyName': {
      questionId: 'q-2',
      dictionaryKey: 'tech.technologyName',
      bindingPath: 'technology.technologyName',
      dataSource: 'TECHNOLOGY' as const,
      currentRevisionId: 'rev-002',
    },
    'triage.missionAlignmentScore': {
      questionId: 'q-3',
      dictionaryKey: 'triage.missionAlignmentScore',
      bindingPath: 'triageStage.missionAlignmentScore',
      dataSource: 'STAGE_SUPPLEMENT' as const,
      currentRevisionId: null,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    Object.values(mockLogger).forEach((fn) => fn.mockReset())

    // Reset mocks with default behavior
    prismaMocks.formTemplateFindUnique.mockResolvedValue(mockTemplate)
    prismaMocks.technologyFindUnique.mockResolvedValue(mockTechnology)
    prismaMocks.submissionSnapshotCreate.mockResolvedValue({
      id: 'snapshot-new-123',
    })
  })

  describe('Happy Path Scenarios', () => {
    it('should successfully capture snapshot with all data (responses, repeatGroups, calculatedScores)', async () => {
      // Act
      const result = await captureSubmissionSnapshot(baseOptions, bindingMetadata)

      // Assert
      expect(result.success).toBe(true)
      expect(result.snapshotId).toBe('snapshot-new-123')
      expect(result.error).toBeUndefined()

      // Verify snapshot was created with correct data
      expect(prismaMocks.submissionSnapshotCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          submissionId: SUBMISSION_ID,
          templateId: TEMPLATE_ID,
          templateVersion: '1.0.0',
          capturedBy: USER_ID,
          snapshotType: SnapshotType.SUBMISSION,
          formAnswers: expect.objectContaining({
            responses: baseOptions.responses,
            repeatGroups: baseOptions.repeatGroups,
            questionRevisions: {
              'tech.techId': 'rev-001',
              'tech.technologyName': 'rev-002',
              'triage.missionAlignmentScore': null,
            },
          }),
          calculatedScores: baseOptions.calculatedScores,
        }),
      })

      // Verify success was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Snapshot captured successfully',
        expect.objectContaining({
          snapshotId: 'snapshot-new-123',
          submissionId: SUBMISSION_ID,
        })
      )
    })

    it('should capture snapshot without technologyId when not bound to technology', async () => {
      const optionsWithoutTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: undefined,
      }

      const result = await captureSubmissionSnapshot(optionsWithoutTech, bindingMetadata)

      expect(result.success).toBe(true)
      expect(prismaMocks.technologyFindUnique).not.toHaveBeenCalled()

      // When no technologyId is provided, technologyMeta should be null (not undefined)
      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta).toBeNull()
      expect(createCall.data.technologyId).toBeUndefined()
    })

    it('should default snapshotType to SUBMISSION when not specified', async () => {
      const optionsWithoutType: CaptureSnapshotOptions = {
        ...baseOptions,
        snapshotType: undefined,
      }

      const result = await captureSubmissionSnapshot(optionsWithoutType, bindingMetadata)

      expect(result.success).toBe(true)
      expect(prismaMocks.submissionSnapshotCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          snapshotType: SnapshotType.SUBMISSION,
        }),
      })
    })

    it('should build questionRevisions from bindingMetadata', async () => {
      const result = await captureSubmissionSnapshot(baseOptions, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      const formAnswers = createCall.data.formAnswers

      expect(formAnswers.questionRevisions).toEqual({
        'tech.techId': 'rev-001',
        'tech.technologyName': 'rev-002',
        'triage.missionAlignmentScore': null,
      })
    })

    it('should handle empty bindingMetadata gracefully', async () => {
      const result = await captureSubmissionSnapshot(baseOptions, {})

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.formAnswers.questionRevisions).toEqual({})
    })

    it('should handle undefined bindingMetadata gracefully', async () => {
      const result = await captureSubmissionSnapshot(baseOptions, undefined)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.formAnswers.questionRevisions).toEqual({})
    })
  })

  describe('Technology Metadata Capture', () => {
    it('should capture technology metadata when technologyId is provided', async () => {
      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)
      expect(prismaMocks.technologyFindUnique).toHaveBeenCalledWith({
        where: { id: TECHNOLOGY_ID },
        include: {
          triageStage: true,
          viabilityStage: true,
        },
      })

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta).toEqual(
        expect.objectContaining({
          id: TECHNOLOGY_ID,
          techId: 'TECH-2025-001',
          technologyName: 'AI Diagnostic Tool',
          inventorName: 'Dr. Smith',
          reviewerName: 'Dr. Johnson',
          currentStage: TechStage.TRIAGE,
          status: TechStatus.ACTIVE,
          rowVersions: expect.objectContaining({
            technologyRowVersion: 5,
          }),
        })
      )
    })

    it('should capture triage stage data when present', async () => {
      const techWithTriage = {
        ...mockTechnology,
        triageStage: mockTriageStage,
      }
      prismaMocks.technologyFindUnique.mockResolvedValue(techWithTriage)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta.triageStage).toEqual({
        missionAlignmentScore: 3,
        missionAlignmentText: 'Highly aligned with mission',
        unmetNeedScore: 2,
        unmetNeedText: 'Moderate unmet need',
        stateOfArtScore: 3,
        stateOfArtText: 'Advances state of art',
        marketScore: 2,
        marketOverview: 'Growing market',
        impactScore: 2.5,
        valueScore: 2.5,
        recommendation: 'PROCEED',
        recommendationNotes: 'Promising technology',
      })
      expect(createCall.data.technologyMeta.rowVersions.triageStageRowVersion).toBe(3)
    })

    it('should capture viability stage data when present', async () => {
      const techWithViability = {
        ...mockTechnology,
        viabilityStage: mockViabilityStage,
      }
      prismaMocks.technologyFindUnique.mockResolvedValue(techWithViability)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta.viabilityStage).toEqual({
        technicalFeasibility: 'High feasibility',
        regulatoryPathway: 'FDA 510(k)',
        costAnalysis: 'Moderate investment required',
        timeToMarket: 24,
        resourceRequirements: 'Team of 5',
        riskAssessment: 'Low to moderate risk',
        technicalScore: 4.2,
        commercialScore: 3.8,
        overallViability: 'Viable',
      })
      expect(createCall.data.technologyMeta.rowVersions.viabilityStageRowVersion).toBe(2)
    })

    it('should capture both triage and viability stages when both present', async () => {
      const techWithBoth = {
        ...mockTechnology,
        triageStage: mockTriageStage,
        viabilityStage: mockViabilityStage,
      }
      prismaMocks.technologyFindUnique.mockResolvedValue(techWithBoth)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta.triageStage).toBeDefined()
      expect(createCall.data.technologyMeta.viabilityStage).toBeDefined()
      expect(createCall.data.technologyMeta.rowVersions).toEqual({
        technologyRowVersion: 5,
        triageStageRowVersion: 3,
        viabilityStageRowVersion: 2,
      })
    })

    it('should return null technologyMeta when technology is not found', async () => {
      prismaMocks.technologyFindUnique.mockResolvedValue(null)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta).toBeNull()

      // Should log warning about missing technology
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Technology not found for snapshot metadata',
        { technologyId: TECHNOLOGY_ID }
      )
    })

    it('should handle optional technology fields correctly', async () => {
      const techMinimalFields = {
        id: TECHNOLOGY_ID,
        techId: 'TECH-2025-001',
        technologyName: 'Minimal Tech',
        shortDescription: null,
        inventorName: 'Dr. Minimal',
        inventorTitle: null,
        inventorDept: null,
        reviewerName: 'Reviewer',
        domainAssetClass: 'Device',
        currentStage: TechStage.TRIAGE,
        status: TechStatus.ACTIVE,
        rowVersion: 1,
        triageStage: null,
        viabilityStage: null,
      }
      prismaMocks.technologyFindUnique.mockResolvedValue(techMinimalFields)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      const meta = createCall.data.technologyMeta
      expect(meta.shortDescription).toBeUndefined()
      expect(meta.inventorTitle).toBeUndefined()
      expect(meta.inventorDept).toBeUndefined()
      expect(meta.triageStage).toBeUndefined()
      expect(meta.viabilityStage).toBeUndefined()
    })
  })

  describe('Error Handling - Non-blocking Behavior', () => {
    it('should return error result when template is not found', async () => {
      prismaMocks.formTemplateFindUnique.mockResolvedValue(null)

      const result = await captureSubmissionSnapshot(baseOptions, bindingMetadata)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Template not found')
      expect(result.snapshotId).toBeUndefined()

      // Should not attempt to create snapshot
      expect(prismaMocks.submissionSnapshotCreate).not.toHaveBeenCalled()

      // Should log warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Template not found for snapshot capture',
        { templateId: TEMPLATE_ID, submissionId: SUBMISSION_ID }
      )
    })

    it('should return error result (not throw) when database create fails', async () => {
      const dbError = new Error('Database connection failed')
      prismaMocks.submissionSnapshotCreate.mockRejectedValue(dbError)

      const result = await captureSubmissionSnapshot(baseOptions, bindingMetadata)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
      expect(result.snapshotId).toBeUndefined()

      // Should log error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to capture submission snapshot',
        expect.objectContaining({
          error: 'Database connection failed',
          submissionId: SUBMISSION_ID,
          templateId: TEMPLATE_ID,
        })
      )
    })

    it('should handle non-Error thrown values gracefully', async () => {
      prismaMocks.submissionSnapshotCreate.mockRejectedValue('String error')

      const result = await captureSubmissionSnapshot(baseOptions, bindingMetadata)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error during snapshot capture')
    })

    it('should continue successfully even if technology lookup fails', async () => {
      const techError = new Error('Technology fetch failed')
      prismaMocks.technologyFindUnique.mockRejectedValue(techError)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      // The function should still catch the error and return failure
      expect(result.success).toBe(false)
      expect(result.error).toContain('Technology fetch failed')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty responses object', async () => {
      const optionsEmptyResponses: CaptureSnapshotOptions = {
        ...baseOptions,
        responses: {},
      }

      const result = await captureSubmissionSnapshot(optionsEmptyResponses, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.formAnswers.responses).toEqual({})
    })

    it('should handle empty repeatGroups object', async () => {
      const optionsEmptyRepeat: CaptureSnapshotOptions = {
        ...baseOptions,
        repeatGroups: {},
      }

      const result = await captureSubmissionSnapshot(optionsEmptyRepeat, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.formAnswers.repeatGroups).toEqual({})
    })

    it('should handle undefined calculatedScores', async () => {
      const optionsNoScores: CaptureSnapshotOptions = {
        ...baseOptions,
        calculatedScores: undefined,
      }

      const result = await captureSubmissionSnapshot(optionsNoScores, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.calculatedScores).toBeUndefined()
    })

    it('should handle null technologyId', async () => {
      const optionsNullTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: null,
      }

      const result = await captureSubmissionSnapshot(optionsNullTech, bindingMetadata)

      expect(result.success).toBe(true)
      expect(prismaMocks.technologyFindUnique).not.toHaveBeenCalled()
    })

    it('should handle viabilityStage with null timeToMarket', async () => {
      const viabilityNoTime = {
        ...mockViabilityStage,
        timeToMarket: null,
      }
      const techWithViability = {
        ...mockTechnology,
        viabilityStage: viabilityNoTime,
      }
      prismaMocks.technologyFindUnique.mockResolvedValue(techWithViability)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta.viabilityStage.timeToMarket).toBeUndefined()
    })

    it('should handle triageStage with null recommendationNotes', async () => {
      const triageNoNotes = {
        ...mockTriageStage,
        recommendationNotes: null,
      }
      const techWithTriage = {
        ...mockTechnology,
        triageStage: triageNoNotes,
      }
      prismaMocks.technologyFindUnique.mockResolvedValue(techWithTriage)

      const optionsWithTech: CaptureSnapshotOptions = {
        ...baseOptions,
        technologyId: TECHNOLOGY_ID,
      }

      const result = await captureSubmissionSnapshot(optionsWithTech, bindingMetadata)

      expect(result.success).toBe(true)

      const createCall = prismaMocks.submissionSnapshotCreate.mock.calls[0][0]
      expect(createCall.data.technologyMeta.triageStage.recommendationNotes).toBeUndefined()
    })
  })
})
