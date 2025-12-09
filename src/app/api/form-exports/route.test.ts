/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server';
import { SubmissionStatus } from '@prisma/client';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { buildPrintableForm } from '@/lib/form-engine/pdf/serialize';

jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    formTemplate: {
      findUnique: jest.fn(),
    },
    formSubmission: {
      findUnique: jest.fn(),
    },
    technologyAnswer: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/form-engine/pdf/serialize', () => ({
  buildPrintableForm: jest.fn(),
}));

jest.mock('@/lib/form-engine/pdf/FormPdfDocument', () => ({
  FormPdfDocument: ({ data }: { data: unknown }) => ({ mockComponent: true, data }),
}));

const mockRenderToBuffer = renderToBuffer as jest.MockedFunction<typeof renderToBuffer>;
const mockFormTemplateFindUnique = prisma.formTemplate.findUnique as jest.Mock;
const mockFormSubmissionFindUnique = prisma.formSubmission.findUnique as jest.Mock;
const mockTechnologyAnswerFindMany = prisma.technologyAnswer.findMany as jest.Mock;
const mockBuildPrintableForm = buildPrintableForm as jest.MockedFunction<typeof buildPrintableForm>;

const createJsonRequest = (body: unknown) =>
  ({
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest);

const createInvalidJsonRequest = () =>
  ({
    json: jest.fn().mockRejectedValue(new Error('invalid json')),
  } as unknown as NextRequest);

describe('POST /api/form-exports', () => {
  const pdfBuffer = Buffer.from('%PDF-mock%');
  const template = {
    id: 'tpl-1',
    name: 'Test Template',
    sections: [],
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-06T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderToBuffer.mockResolvedValue(pdfBuffer);
    mockFormTemplateFindUnique.mockResolvedValue(template);
    mockBuildPrintableForm.mockReturnValue({ printable: true } as unknown as ReturnType<typeof buildPrintableForm>);
  });

  it('returns a PDF using provided templateId and normalized payloads', async () => {
    const request = createJsonRequest({
      templateId: 'tpl-1',
      responses: { Q1: 'hello', techId: 'TECH-500' },
      repeatGroups: { RG1: [{ field: 'value' }] },
      calculatedScores: { viability: 0.7 },
      metadata: { submittedBy: 'owner', submittedAt: '2025-11-05T00:00:00Z' },
      status: 'IN_PROGRESS',
    });

    const response = await POST(request);
    const buffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="test-template-in_progress-20251106T120000.pdf"'
    );
    expect(buffer).toEqual(pdfBuffer);

    expect(mockBuildPrintableForm).toHaveBeenCalledWith({
      template,
      responses: { Q1: 'hello', techId: 'TECH-500' },
      repeatGroups: { RG1: [{ field: 'value' }] },
      calculatedScores: { viability: 0.7 },
      status: 'IN_PROGRESS',
      submissionId: undefined,
      submittedAt: '2025-11-05T00:00:00Z',
      submittedBy: 'owner',
      techId: 'TECH-500',
      notes: null,
    });
    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
  });

  it('hydrates payloads using submissionId when templateId is omitted', async () => {
    // Mock submission with technologyId (required for loading answers from TechnologyAnswer)
    mockFormSubmissionFindUnique.mockResolvedValue({
      id: 'sub-77',
      templateId: 'tpl-1',
      technologyId: 'tech-77',
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date('2025-11-01T12:00:00Z'),
      submittedBy: 'system',
      scores: [
        { scoreType: 'viability', value: 0.8 },
      ],
    });

    // Mock template with section info for repeat group detection
    mockFormTemplateFindUnique.mockResolvedValue({
      ...template,
      sections: [
        {
          questions: [
            { dictionaryKey: 'F0.1', type: 'SHORT_TEXT' },
            { dictionaryKey: 'RG1', type: 'REPEATABLE_GROUP' },
          ],
        },
      ],
    });

    // Mock TechnologyAnswer data
    mockTechnologyAnswerFindMany.mockResolvedValue([
      { questionKey: 'F0.1', value: 'TECH-77' },
      { questionKey: 'RG1', value: [{ foo: 'bar' }] },
    ]);

    const response = await POST(
      createJsonRequest({
        submissionId: 'sub-77',
        metadata: { notes: 'Manual override' },
      })
    );

    expect(response.status).toBe(200);
    expect(mockFormSubmissionFindUnique).toHaveBeenCalledWith({
      where: { id: 'sub-77' },
      include: {
        scores: true,
      },
    });
    expect(mockBuildPrintableForm).toHaveBeenCalledWith({
      template: expect.objectContaining({ id: 'tpl-1' }),
      responses: { 'F0.1': 'TECH-77' },
      repeatGroups: { RG1: [{ foo: 'bar' }] },
      calculatedScores: { viability: 0.8 },
      status: SubmissionStatus.SUBMITTED,
      submissionId: 'sub-77',
      submittedAt: '2025-11-01T12:00:00.000Z',
      submittedBy: 'system',
      techId: 'TECH-77',
      notes: 'Manual override',
    });
  });

  it('returns 404 when submission lookup fails', async () => {
    mockFormSubmissionFindUnique.mockResolvedValue(null);

    const response = await POST(createJsonRequest({ submissionId: 'missing' }));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Submission not found');
  });

  it('returns 404 when template cannot be found', async () => {
    mockFormTemplateFindUnique.mockResolvedValue(null);

    const response = await POST(createJsonRequest({ templateId: 'missing' }));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Form template not found');
  });

  it('returns 400 when neither templateId nor submissionId is provided', async () => {
    const response = await POST(createJsonRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('templateId is required');
  });

  it('returns 400 when JSON parsing fails', async () => {
    const response = await POST(createInvalidJsonRequest());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid JSON payload');
  });
});
