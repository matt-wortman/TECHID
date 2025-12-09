/**
 * @jest-environment node
 */
import { PrismaClient, SubmissionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { seedDemoSubmissions, verifyDemoData } from '../../../prisma/seed/demo-submissions';

describe('Demo Data Seeding', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;
  let formSubmissionDeleteManyMock: jest.Mock;
  let formSubmissionCreateMock: jest.Mock;
  let formSubmissionFindManyMock: jest.Mock;
  let calculatedScoreCreateManyMock: jest.Mock;

  beforeEach(() => {
    // Create a properly mocked PrismaClient with jest.fn() mocks
    mockPrisma = {
      formSubmission: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      calculatedScore: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      formTemplate: {
        create: jest.fn().mockResolvedValue({ id: 'template-id' }),
      },
      formSection: {
        create: jest.fn().mockResolvedValue({ id: 'section-id' }),
      },
      formQuestion: {
        create: jest.fn().mockResolvedValue({ id: 'question-id' }),
      },
      questionOption: {
        create: jest.fn().mockResolvedValue({ id: 'option-id' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $disconnect: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PrismaClient>;

    // Mock option lookups using dictionaryKey
    (mockPrisma.questionOption.findMany as jest.Mock).mockImplementation(async ({ where }) => {
      const dictionaryKey = where?.question?.dictionaryKey as string | undefined;
      const mappings: Record<string, { label: string; value: string }[]> = {
        'tech.domainAssetClass': [
          { label: 'Medical Device', value: 'medical_device' },
          { label: 'Digital Health', value: 'digital_health' },
          { label: 'Diagnostic', value: 'diagnostic' },
          { label: 'Therapeutic', value: 'therapeutic' },
          { label: 'Research Tool', value: 'research_tool' },
          { label: 'Other', value: 'other' },
        ],
        'triage.licensableAssetTypes': [
          { label: 'Device', value: 'device' },
          { label: 'Software Algorithm', value: 'software_algorithm' },
          { label: 'Database', value: 'database' },
          { label: 'Method', value: 'method' },
        ],
        'triage.developmentStage': [
          { label: 'Idea only', value: 'idea_only' },
          { label: 'Lab proof of concept', value: 'lab_proof' },
          { label: 'Prototype', value: 'prototype' },
          { label: 'Validated prototype', value: 'validated_prototype' },
          { label: 'Pilot in humans', value: 'pilot_humans' },
          { label: 'On market', value: 'on_market' },
        ],
        'triage.reducedToPractice': [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'Partially', value: 'partially' },
          { label: 'Unsure', value: 'unsure' },
        ],
        'triage.proofOfConcept': [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'In progress', value: 'in_progress' },
        ],
        'triage.workingPrototype': [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'In progress', value: 'in_progress' },
        ],
        'triage.manufacturingFeasibility': [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'Not applicable', value: 'not_applicable' },
        ],
      };

      return dictionaryKey ? mappings[dictionaryKey] ?? [] : [];
    });

    formSubmissionDeleteManyMock = mockPrisma.formSubmission.deleteMany as jest.Mock;
    formSubmissionCreateMock = mockPrisma.formSubmission.create as jest.Mock;
    formSubmissionFindManyMock = mockPrisma.formSubmission.findMany as jest.Mock;
    calculatedScoreCreateManyMock = mockPrisma.calculatedScore.createMany as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('seedDemoSubmissions', () => {
    it('should clear existing demo submissions before creating new ones', async () => {
      const mockTemplateId = 'test-template-id';

      // Mock successful deletion
      formSubmissionDeleteManyMock.mockResolvedValue({ count: 2 });

      // Mock successful submission creation
      formSubmissionCreateMock
        .mockResolvedValueOnce({ id: 'submission-1' })
        .mockResolvedValueOnce({ id: 'submission-2' })
        .mockResolvedValueOnce({ id: 'submission-3' })
        .mockResolvedValueOnce({ id: 'submission-4' });

      // Mock successful batch creates
      calculatedScoreCreateManyMock.mockResolvedValue({ count: 8 });

      await seedDemoSubmissions(mockTemplateId, mockPrisma);

      // Verify deletion was called with correct patterns
      expect(formSubmissionDeleteManyMock).toHaveBeenCalledWith({
        where: {
          submittedBy: {
            in: [
              'Dr. Jennifer Martinez',
              'Dr. Michael Thompson',
              'Dr. Lisa Chang',
              'Dr. Sarah Johnson'
            ]
          }
        }
      });

      // Verify 4 submissions were created (3 submitted + 1 draft)
      expect(formSubmissionCreateMock).toHaveBeenCalledTimes(4);
    });

    it('should create submissions with correct status distribution', async () => {
      const mockTemplateId = 'test-template-id';

      formSubmissionDeleteManyMock.mockResolvedValue({ count: 0 });
      formSubmissionCreateMock
        .mockResolvedValueOnce({ id: 'sub-1' })
        .mockResolvedValueOnce({ id: 'sub-2' })
        .mockResolvedValueOnce({ id: 'sub-3' })
        .mockResolvedValueOnce({ id: 'sub-4' });

      await seedDemoSubmissions(mockTemplateId, mockPrisma);

      const createCalls = formSubmissionCreateMock.mock.calls;

      // Check that we have 3 SUBMITTED and 1 DRAFT
      const submittedCount = createCalls.filter(call =>
        call[0].data.status === 'SUBMITTED'
      ).length;
      const draftCount = createCalls.filter(call =>
        call[0].data.status === 'DRAFT'
      ).length;

      expect(submittedCount).toBe(3);
      expect(draftCount).toBe(1);
    });

    it('should create calculated scores for submitted forms', async () => {
      const mockTemplateId = 'test-template-id';

      formSubmissionDeleteManyMock.mockResolvedValue({ count: 0 });
      formSubmissionCreateMock.mockResolvedValue({ id: 'test-submission' });

      await seedDemoSubmissions(mockTemplateId, mockPrisma);

      // For submitted forms, calculated scores should be created
      // Note: Question responses and repeat groups are no longer created
      // as TechnologyAnswer is now the primary storage (handled by form engine)
      expect(calculatedScoreCreateManyMock).toHaveBeenCalled();
    });

    it('should not create calculated scores for draft submissions', async () => {
      const mockTemplateId = 'test-template-id';

      formSubmissionDeleteManyMock.mockResolvedValue({ count: 0 });

      // Mock creation calls to track which submissions get scores
      const mockCalls: Prisma.FormSubmissionCreateArgs['data'][] = [];
      formSubmissionCreateMock.mockImplementation((args: Prisma.FormSubmissionCreateArgs) => {
        mockCalls.push(args.data);
        return Promise.resolve({ id: `sub-${mockCalls.length}` });
      });

      // Track calculated score calls
      const scoreCreateCalls: Prisma.CalculatedScoreCreateManyInput[][] = [];
      calculatedScoreCreateManyMock.mockImplementation((args: Prisma.CalculatedScoreCreateManyArgs) => {
        const data = Array.isArray(args.data) ? args.data : [args.data];
        scoreCreateCalls.push(data);
        return Promise.resolve({ count: data.length });
      });

      await seedDemoSubmissions(mockTemplateId, mockPrisma);

      // Should have 4 submissions but only 3 should get calculated scores
      // (the draft submission should not get scores)
      expect(formSubmissionCreateMock).toHaveBeenCalledTimes(4);
      expect(calculatedScoreCreateManyMock).toHaveBeenCalledTimes(3); // Only submitted forms
    });
  });

  describe('verifyDemoData', () => {
    it('should return correct submission counts', async () => {
      type MinimalSubmission = Prisma.FormSubmissionGetPayload<{ select: { id: true; status: true; submittedBy: true } }>;
      const mockSubmissions: MinimalSubmission[] = [
        {
          id: '1',
          status: SubmissionStatus.SUBMITTED,
          submittedBy: 'Dr. Jennifer Martinez',
        },
        {
          id: '2',
          status: SubmissionStatus.SUBMITTED,
          submittedBy: 'Dr. Michael Thompson',
        },
        {
          id: '3',
          status: SubmissionStatus.SUBMITTED,
          submittedBy: 'Dr. Lisa Chang',
        },
        {
          id: '4',
          status: SubmissionStatus.DRAFT,
          submittedBy: 'Dr. Sarah Johnson',
        },
      ];

      formSubmissionFindManyMock.mockResolvedValue(mockSubmissions);

      const result = await verifyDemoData(mockPrisma);

      expect(result).toEqual({
        total: 4,
        submitted: 3,
        drafts: 1,
      });

      expect(formSubmissionFindManyMock).toHaveBeenCalledWith({
        where: {
          submittedBy: {
            in: [
              'Dr. Jennifer Martinez',
              'Dr. Michael Thompson',
              'Dr. Lisa Chang',
              'Dr. Sarah Johnson'
            ]
          }
        },
        select: {
          id: true,
          status: true,
          submittedBy: true,
        }
      });
    });

    it('should handle empty database correctly', async () => {
      formSubmissionFindManyMock.mockResolvedValue([]);

      const result = await verifyDemoData(mockPrisma);

      expect(result).toEqual({
        total: 0,
        submitted: 0,
        drafts: 0,
      });
    });
  });

  describe('Integration with environment variables', () => {
    it('should be testable in CI without actual database', () => {
      // This test ensures our seeding functions can be mocked
      // and tested without requiring a real database connection
      expect(typeof seedDemoSubmissions).toBe('function');
      expect(typeof verifyDemoData).toBe('function');
    });
  });
});

// Export helper for other tests that might need to verify demo data
export { verifyDemoData };
