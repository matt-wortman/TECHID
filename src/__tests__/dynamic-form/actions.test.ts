/**
 * @jest-environment node
 */
/* eslint-disable no-var */
import {
  saveDraftResponse,
  loadDraftResponse,
  submitFormResponse,
  deleteDraftResponse,
  getUserDrafts,
  getSubmissionDetail,
} from '@/app/dynamic-form/actions';
import type { Prisma } from '@prisma/client';
import { DataSource, SubmissionStatus } from '@prisma/client';
import { OptimisticLockError } from '@/lib/technology/types';
import type { FormTemplateWithSections } from '@/lib/form-engine/types';

type PrismaMocks = {
  formSubmissionCreate: jest.Mock;
  formSubmissionFindFirst: jest.Mock;
  formSubmissionFindMany: jest.Mock;
  formSubmissionFindUnique: jest.Mock;
  formSubmissionUpdate: jest.Mock;
  formSubmissionDelete: jest.Mock;
  calculatedScoreCreateMany: jest.Mock;
  calculatedScoreDeleteMany: jest.Mock;
  technologyAnswerFindMany: jest.Mock;
};

var prismaMocks: PrismaMocks;
var mockApplyBindingWrites: jest.Mock;
var mockFetchTemplateWithBindingsById: jest.Mock;

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { logger: mockLogger } = jest.requireMock('@/lib/logger') as {
  logger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
};

jest.mock('@/lib/prisma', () => {
  prismaMocks = {
    formSubmissionCreate: jest.fn(),
    formSubmissionFindFirst: jest.fn(),
    formSubmissionFindMany: jest.fn(),
    formSubmissionFindUnique: jest.fn(),
    formSubmissionUpdate: jest.fn(),
    formSubmissionDelete: jest.fn(),
    calculatedScoreCreateMany: jest.fn(),
    calculatedScoreDeleteMany: jest.fn(),
    technologyAnswerFindMany: jest.fn(),
  };

  const baseClient = {
    formSubmission: {
      create: prismaMocks.formSubmissionCreate,
      findFirst: prismaMocks.formSubmissionFindFirst,
      findMany: prismaMocks.formSubmissionFindMany,
      findUnique: prismaMocks.formSubmissionFindUnique,
      update: prismaMocks.formSubmissionUpdate,
      delete: prismaMocks.formSubmissionDelete,
    },
    calculatedScore: {
      createMany: prismaMocks.calculatedScoreCreateMany,
      deleteMany: prismaMocks.calculatedScoreDeleteMany,
    },
    technologyAnswer: {
      findMany: prismaMocks.technologyAnswerFindMany,
    },
  };

  const transaction = async <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
    fn(baseClient as unknown as Prisma.TransactionClient);

  return {
    prisma: {
      ...baseClient,
      $transaction: transaction,
    },
  };
});

jest.mock('@/lib/technology/service', () => {
  const actualModule = jest.requireActual('@/lib/technology/service');
  return {
    ...actualModule,
    fetchTemplateWithBindingsById: (...args: unknown[]) => {
      if (!mockFetchTemplateWithBindingsById) {
        mockFetchTemplateWithBindingsById = jest.fn();
      }
      return mockFetchTemplateWithBindingsById(...args);
    },
    applyBindingWrites: (...args: unknown[]) => {
      if (!mockApplyBindingWrites) {
        mockApplyBindingWrites = jest.fn();
      }
      return mockApplyBindingWrites(...args);
    },
  };
});

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const TEMPLATE_ID = 'template-1';
const DRAFT_ID = 'draft-1';

// Binding metadata is keyed by dictionaryKey
const bindingMetadata = {
  'tech.techId': {
    dictionaryKey: 'tech.techId',
    questionId: 'question-tech-id',
    bindingPath: 'technology.techId',
    dataSource: DataSource.TECHNOLOGY,
    currentRevisionId: 'rev-tech-id-1',
  },
  'tech.inventorName': {
    dictionaryKey: 'tech.inventorName',
    questionId: 'question-inventor-info',
    bindingPath: 'technology.inventorName',
    dataSource: DataSource.TECHNOLOGY,
    currentRevisionId: 'rev-inventor-1',
  },
} as const;

describe('dynamic form actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockLogger).forEach((fn) => (fn as jest.Mock).mockReset());

    if (prismaMocks) {
      Object.values(prismaMocks).forEach((mock) => mock.mockReset());
    }

    mockFetchTemplateWithBindingsById = jest.fn();
    mockApplyBindingWrites = jest.fn();

    mockFetchTemplateWithBindingsById.mockResolvedValue({
      template: { id: TEMPLATE_ID, sections: [] } as unknown as FormTemplateWithSections,
      bindingMetadata,
    });

    mockApplyBindingWrites.mockResolvedValue({
      techId: 'TECH-001',
      technologyId: 'tech-record-1',
      rowVersions: {
        technologyRowVersion: 2,
      },
    });

    prismaMocks.formSubmissionCreate.mockResolvedValue({ id: DRAFT_ID });
    prismaMocks.formSubmissionFindFirst.mockResolvedValue(null);
    prismaMocks.formSubmissionUpdate.mockResolvedValue({ id: DRAFT_ID });
    prismaMocks.formSubmissionFindMany.mockResolvedValue([]);
    prismaMocks.formSubmissionFindUnique.mockResolvedValue(null);
    prismaMocks.formSubmissionDelete.mockResolvedValue({ id: DRAFT_ID });
    prismaMocks.calculatedScoreDeleteMany.mockResolvedValue({ count: 0 });
    prismaMocks.technologyAnswerFindMany.mockResolvedValue([]);
  });

  it('persists repeatable group rows when saving a new draft', async () => {
    const result = await saveDraftResponse(
      {
        templateId: TEMPLATE_ID,
        // Responses are keyed by dictionaryKey
        responses: {
          'tech.techId': 'TECH-001',
        },
        repeatGroups: {
          'tech.inventorName': [
            { name: 'Dr. Jane Smith', title: 'MD', department: 'Oncology', email: 'jane@example.org' },
          ],
        },
        rowVersions: {
          technologyRowVersion: 1,
        },
      },
      'test-user'
    );

    if (!result.success) {
      throw new Error(result.error ?? 'saveDraftResponse returned success=false');
    }

    // Note: Legacy QuestionResponse/RepeatableGroupResponse writes have been removed.
    // All answer data is now written to TechnologyAnswer via applyBindingWrites.

    expect(mockApplyBindingWrites).toHaveBeenCalledWith(
      expect.anything(),
      bindingMetadata,
      expect.objectContaining({
        'tech.techId': 'TECH-001',
        'tech.inventorName': expect.arrayContaining([
          expect.objectContaining({ name: 'Dr. Jane Smith', department: 'Oncology' }),
        ]),
      }),
      expect.objectContaining({
        userId: 'test-user',
        expectedVersions: { technologyRowVersion: 1 },
      })
    );

    expect(result.rowVersions).toEqual({ technologyRowVersion: 2 });
  });

  it('hydrates repeatable rows when loading a draft from TechnologyAnswer', async () => {
    // Mock the submission lookup (with technologyId for TechnologyAnswer loading)
    prismaMocks.formSubmissionFindFirst.mockResolvedValueOnce({
      id: DRAFT_ID,
      templateId: TEMPLATE_ID,
      technologyId: 'tech-123',
      status: 'DRAFT',
      scores: [],
    });

    // Mock template with repeat group definition so code can identify repeat groups
    mockFetchTemplateWithBindingsById.mockResolvedValueOnce({
      template: {
        id: TEMPLATE_ID,
        sections: [
          {
            questions: [
              { dictionaryKey: 'tech.techId', type: 'SHORT_TEXT' },
              { dictionaryKey: 'tech.inventorName', type: 'REPEATABLE_GROUP' },
            ],
          },
        ],
      } as unknown as FormTemplateWithSections,
      bindingMetadata,
    });

    // Mock TechnologyAnswer data - this is now the primary answer source
    prismaMocks.technologyAnswerFindMany.mockResolvedValueOnce([
      { questionKey: 'tech.techId', value: 'TECH-001' },
      {
        questionKey: 'tech.inventorName',
        value: [
          { name: 'Dr. Jane Smith', department: 'Oncology' },
          { name: 'Alex Jordan', department: 'Bioinformatics' },
        ],
      },
    ]);

    const result = await loadDraftResponse(DRAFT_ID, 'test-user');

    expect(result.success).toBe(true);
    expect(result.data?.responses['tech.techId']).toBe('TECH-001');
    expect(result.data?.repeatGroups['tech.inventorName']).toEqual([
      { name: 'Dr. Jane Smith', department: 'Oncology' },
      { name: 'Alex Jordan', department: 'Bioinformatics' },
    ]);
  });

  it('returns conflict when optimistic lock fails', async () => {
    mockApplyBindingWrites.mockRejectedValue(new OptimisticLockError());

    const result = await saveDraftResponse(
      {
        templateId: TEMPLATE_ID,
        responses: {
          'tech.techId': 'TECH-002',
        },
        repeatGroups: { 'tech.inventorName': [] },
        rowVersions: {
          technologyRowVersion: 1,
        },
      },
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('conflict');
  });

  it('reuses an existing draft during submitFormResponse and writes calculated scores', async () => {
    prismaMocks.formSubmissionFindFirst.mockResolvedValueOnce({
      id: DRAFT_ID,
      status: SubmissionStatus.DRAFT,
    });
    prismaMocks.formSubmissionUpdate.mockResolvedValueOnce({
      id: DRAFT_ID,
    });

    const result = await submitFormResponse(
      {
        templateId: TEMPLATE_ID,
        responses: {
          'tech.techId': 'TECH-010',
        },
        repeatGroups: {},
        calculatedScores: { impactScore: 4, invalid: 'skip' },
        rowVersions: { technologyRowVersion: 5 },
      },
      ' submit-user ',
      DRAFT_ID
    );

    // Note: Legacy QuestionResponse/RepeatableGroupResponse deletes have been removed.
    // Only CalculatedScore cleanup remains for submission updates.
    expect(prismaMocks.calculatedScoreDeleteMany).toHaveBeenCalledWith({
      where: { submissionId: DRAFT_ID },
    });
    expect(prismaMocks.formSubmissionUpdate).toHaveBeenCalledWith({
      where: { id: DRAFT_ID },
      data: expect.objectContaining({
        status: SubmissionStatus.SUBMITTED,
        submittedBy: 'submit-user',
      }),
    });
    expect(prismaMocks.calculatedScoreCreateMany).toHaveBeenCalledWith({
      data: [
        {
          submissionId: DRAFT_ID,
          scoreType: 'impactScore',
          value: 4,
        },
      ],
    });
    expect(mockApplyBindingWrites).toHaveBeenCalledWith(
      expect.anything(),
      bindingMetadata,
      expect.objectContaining({ 'tech.techId': 'TECH-010' }),
      expect.objectContaining({
        userId: 'submit-user',
        allowCreateWhenIncomplete: true,
        expectedVersions: { technologyRowVersion: 5 },
      })
    );
    expect(result).toEqual({
      success: true,
      submissionId: DRAFT_ID,
      rowVersions: { technologyRowVersion: 2 },
    });
  });

  it('creates a new submission when no draft id is provided', async () => {
    prismaMocks.formSubmissionCreate.mockResolvedValueOnce({
      id: 'new-submission',
    });

    const result = await submitFormResponse(
      {
        templateId: TEMPLATE_ID,
        responses: { 'tech.techId': 'TECH-NEW' },
        repeatGroups: {
          'tech.inventorName': [{ name: 'Dr. Lee', department: 'Innovation' }],
        },
        rowVersions: {},
      },
      undefined
    );

    expect(prismaMocks.formSubmissionCreate).toHaveBeenCalled();
    // Note: Answer data (including repeat groups) is now written via applyBindingWrites
    // to TechnologyAnswer, not to legacy RepeatableGroupResponse table.
    expect(mockApplyBindingWrites).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        'tech.techId': 'TECH-NEW',
        'tech.inventorName': [{ name: 'Dr. Lee', department: 'Innovation' }],
      }),
      expect.anything()
    );
    expect(result.success).toBe(true);
    expect(result.submissionId).toBe('new-submission');
  });

  it('returns conflict when submitFormResponse encounters an optimistic lock error', async () => {
    mockApplyBindingWrites.mockRejectedValueOnce(new OptimisticLockError());

    const result = await submitFormResponse(
      {
        templateId: TEMPLATE_ID,
        responses: { 'tech.techId': 'TECH-LOCK' },
        repeatGroups: {},
        rowVersions: { technologyRowVersion: 1 },
      },
      'user-1'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('conflict');
  });

  it('returns error when loadDraftResponse cannot find the draft', async () => {
    const result = await loadDraftResponse('missing-draft', '  requestor ');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Draft not found');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ draftId: 'missing-draft', requestedBy: 'requestor' }),
      'Draft not found or access denied'
    );
  });

  it('deletes a draft when deleteDraftResponse succeeds', async () => {
    prismaMocks.formSubmissionFindFirst.mockResolvedValueOnce({
      id: DRAFT_ID,
      status: SubmissionStatus.DRAFT,
    });
    prismaMocks.formSubmissionDelete.mockResolvedValueOnce({ id: DRAFT_ID });

    const result = await deleteDraftResponse(DRAFT_ID, 'deleter');

    expect(result.success).toBe(true);
    expect(prismaMocks.formSubmissionDelete).toHaveBeenCalledWith({
      where: { id: DRAFT_ID },
    });
  });

  it('logs a warning when deleteDraftResponse cannot find the draft', async () => {
    const result = await deleteDraftResponse('missing', 'deleter');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Draft not found');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ draftId: 'missing', requestedBy: 'deleter' }),
      'Draft not found or access denied during delete'
    );
  });

  it('filters drafts by user scope and derives template names from linked technology', async () => {
    const draftRecord = {
      id: 'draft-789',
      template: {
        name: 'Default Template',
        version: '1.2.3',
      },
      // technology relation provides techId for display name
      technology: { techId: 'TECH-XYZ' },
      status: SubmissionStatus.DRAFT,
      createdAt: new Date('2025-11-07T10:00:00Z'),
      updatedAt: new Date('2025-11-07T10:05:00Z'),
      submittedAt: null,
      submittedBy: 'user@example.com',
    };
    prismaMocks.formSubmissionFindMany.mockResolvedValueOnce([draftRecord]);

    const result = await getUserDrafts('  user@example.com ', 'user');

    expect(prismaMocks.formSubmissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ submittedBy: 'user@example.com' }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.drafts?.[0]).toMatchObject({
      id: 'draft-789',
      templateName: 'TECH-XYZ',
      templateVersion: '1.2.3',
    });
  });

  it('returns submission detail with repeat groups and scores', async () => {
    prismaMocks.formSubmissionFindUnique.mockResolvedValueOnce({
      id: 'sub-1',
      technologyId: 'tech-1',
      templateId: 'tpl-1',
      template: {
        name: 'Full Template',
        version: '2.0',
        sections: [
          {
            order: 0,
            questions: [
              {
                dictionaryKey: 'tech.techId',
                label: 'Technology ID',
                type: 'SHORT_TEXT',
                options: [],
                scoringConfig: [],
              },
              {
                dictionaryKey: 'TEAM',
                label: 'Team Members',
                type: 'REPEATABLE_GROUP',
                options: [],
                scoringConfig: [],
              },
            ],
          },
        ],
      },
      scores: [{ scoreType: 'impactScore', value: 5 }],
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date('2025-11-07T09:00:00Z'),
      submittedBy: 'approver',
      createdAt: new Date('2025-11-07T08:00:00Z'),
      updatedAt: new Date('2025-11-07T08:30:00Z'),
    });

    // Mock TechnologyAnswer data - answers are now loaded from TechnologyAnswer
    prismaMocks.technologyAnswerFindMany.mockResolvedValueOnce([
      { questionKey: 'tech.techId', value: 'TECH-123' },
      { questionKey: 'TEAM', value: [{ name: 'Dr. Lee' }] },
    ]);

    const result = await getSubmissionDetail('sub-1');

    expect(result.success).toBe(true);
    // Responses are keyed by questionKey from TechnologyAnswer
    expect(result.data?.responses['tech.techId']).toBe('TECH-123');
    expect(result.data?.repeatGroups['TEAM']).toEqual([{ name: 'Dr. Lee' }]);
    expect(result.data?.calculatedScores).toEqual({ impactScore: 5 });
  });

  it('returns error when submission detail is missing', async () => {
    const result = await getSubmissionDetail('missing-sub');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Submission not found');
  });
});
