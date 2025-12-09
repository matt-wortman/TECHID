/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server';
import { SubmissionStatus } from '@prisma/client';
import { GET, POST, PUT } from './route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    formSubmission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    calculatedScore: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    technologyAnswer: {
      findMany: jest.fn(),
    },
    formTemplate: {
      findUnique: jest.fn(),
    },
  },
}));

const mockFormSubmissionCreate = prisma.formSubmission.create as jest.Mock;
const mockFormSubmissionFindUnique = prisma.formSubmission.findUnique as jest.Mock;
const mockFormSubmissionFindMany = prisma.formSubmission.findMany as jest.Mock;
const mockFormSubmissionUpdate = prisma.formSubmission.update as jest.Mock;
const mockCalculatedScoreCreateMany = prisma.calculatedScore.createMany as jest.Mock;
const mockCalculatedScoreDeleteMany = prisma.calculatedScore.deleteMany as jest.Mock;
const mockTechnologyAnswerFindMany = prisma.technologyAnswer.findMany as jest.Mock;
const mockFormTemplateFindUnique = prisma.formTemplate.findUnique as jest.Mock;

const createJsonRequest = (body: unknown) =>
  ({
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest);

const createGetRequest = (query = '') =>
  ({
    url: `https://example.com/api/form-submissions${query}`,
  } as NextRequest);

describe('/api/form-submissions — POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates submissions and only writes calculated scores', async () => {
    mockFormSubmissionCreate.mockResolvedValue({
      id: 'sub-123',
      status: SubmissionStatus.SUBMITTED,
    });

    const request = createJsonRequest({
      templateId: 'tpl-456',
      submittedBy: 'tester',
      status: SubmissionStatus.SUBMITTED,
      responses: {
        Q1: 'yes',
        Q2: 42,
      },
      repeatGroups: {
        RG1: [
          { field: 'value' },
        ],
      },
      calculatedScores: {
        viability: 0.92,
        invalid: 'skip-me',
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(payload).toEqual({
      success: true,
      submissionId: 'sub-123',
      status: SubmissionStatus.SUBMITTED,
    });

    expect(mockFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        templateId: 'tpl-456',
        submittedBy: 'tester',
        status: SubmissionStatus.SUBMITTED,
      }),
    });
    // Note: Answer data is now written via applyBindingWrites() to TechnologyAnswer
    // This API route only handles CalculatedScores
    expect(mockCalculatedScoreCreateMany).toHaveBeenCalledWith({
      data: [
        {
          submissionId: 'sub-123',
          scoreType: 'viability',
          value: 0.92,
        },
      ],
    });
  });

  it('returns 400 when schema validation fails', async () => {
    const request = createJsonRequest({ templateId: '' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(mockFormSubmissionCreate).not.toHaveBeenCalled();
  });

  it('returns 500 when persistence throws', async () => {
    mockFormSubmissionCreate.mockRejectedValue(new Error('db down'));

    const request = createJsonRequest({
      templateId: 'tpl-123',
      responses: {},
      repeatGroups: {},
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to save form submission');
  });
});

describe('/api/form-submissions — GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a single submission with hydrated responses from TechnologyAnswer when id is provided', async () => {
    const now = new Date('2025-11-06T10:00:00Z');
    mockFormSubmissionFindUnique.mockResolvedValue({
      id: 'sub-1',
      templateId: 'tpl-1',
      technologyId: 'tech-1',
      status: SubmissionStatus.DRAFT,
      submittedBy: 'tester',
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      scores: [
        { scoreType: 'viability', value: 0.9 },
      ],
    });

    mockTechnologyAnswerFindMany.mockResolvedValue([
      { questionKey: 'Q1', value: 'hello' },
      { questionKey: 'RG', value: [{ row: 1 }] },
    ]);

    mockFormTemplateFindUnique.mockResolvedValue({
      id: 'tpl-1',
      sections: [
        {
          questions: [
            { dictionaryKey: 'Q1', type: 'SHORT_TEXT' },
            { dictionaryKey: 'RG', type: 'REPEATABLE_GROUP' },
          ],
        },
      ],
    });

    const response = await GET(createGetRequest('?id=sub-1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.submission.responses).toEqual({ Q1: 'hello' });
    expect(payload.submission.repeatGroups.RG).toEqual([{ row: 1 }]);
    expect(payload.submission.calculatedScores).toEqual({ viability: 0.9 });
  });

  it('returns empty responses when submission has no technologyId', async () => {
    const now = new Date('2025-11-06T10:00:00Z');
    mockFormSubmissionFindUnique.mockResolvedValue({
      id: 'sub-1',
      templateId: 'tpl-1',
      technologyId: null,
      status: SubmissionStatus.DRAFT,
      submittedBy: 'tester',
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      scores: [],
    });

    const response = await GET(createGetRequest('?id=sub-1'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.submission.responses).toEqual({});
    expect(payload.submission.repeatGroups).toEqual({});
  });

  it('returns 404 when submission is missing', async () => {
    mockFormSubmissionFindUnique.mockResolvedValue(null);

    const response = await GET(createGetRequest('?id=missing'));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Submission not found');
  });

  it('lists recent submissions when no id is provided', async () => {
    const now = new Date('2025-11-06T09:00:00Z');
    mockFormSubmissionFindMany.mockResolvedValue([
      {
        id: 'sub-1',
        templateId: 'tpl-1',
        status: SubmissionStatus.DRAFT,
        submittedBy: 'tester',
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
      },
    ]);

    const response = await GET(createGetRequest('?templateId=tpl-1&submittedBy=tester'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockFormSubmissionFindMany).toHaveBeenCalledWith({
      where: { templateId: 'tpl-1', submittedBy: 'tester' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        templateId: true,
        status: true,
        submittedBy: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
      },
    });
    expect(payload.submissions).toHaveLength(1);
  });

  it('returns 500 when query fails', async () => {
    mockFormSubmissionFindMany.mockRejectedValue(new Error('offline'));

    const response = await GET(createGetRequest());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to fetch form submissions');
  });
});

describe('/api/form-submissions — PUT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates submissions and rewrites calculated scores only', async () => {
    mockFormSubmissionUpdate.mockResolvedValue({
      id: 'sub-9',
      status: SubmissionStatus.SUBMITTED,
    });

    const request = createJsonRequest({
      templateId: 'tpl-9',
      submissionId: 'sub-9',
      status: SubmissionStatus.SUBMITTED,
      responses: { Q1: 'updated' },
      repeatGroups: { RG: [{ row: 1 }] },
      calculatedScores: { viability: 1 },
    });

    const response = await PUT(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      submissionId: 'sub-9',
      status: SubmissionStatus.SUBMITTED,
    });
    expect(mockFormSubmissionUpdate).toHaveBeenCalledWith({
      where: { id: 'sub-9' },
      data: expect.objectContaining({ status: SubmissionStatus.SUBMITTED }),
    });
    // Note: Answer data is now written via applyBindingWrites() to TechnologyAnswer
    // This API route only handles CalculatedScores
    expect(mockCalculatedScoreDeleteMany).toHaveBeenCalledWith({ where: { submissionId: 'sub-9' } });
    expect(mockCalculatedScoreCreateMany).toHaveBeenLastCalledWith({
      data: [{ submissionId: 'sub-9', scoreType: 'viability', value: 1 }],
    });
  });

  it('returns 400 when schema validation fails', async () => {
    const request = createJsonRequest({ submissionId: '' });

    const response = await PUT(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(mockFormSubmissionUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when update throws', async () => {
    mockFormSubmissionUpdate.mockRejectedValue(new Error('db error'));

    const request = createJsonRequest({
      templateId: 'tpl-9',
      submissionId: 'sub-9',
      responses: {},
      repeatGroups: {},
      calculatedScores: {},
    });

    const response = await PUT(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to update form submission');
  });
});
