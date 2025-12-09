/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveDraftResponse, submitFormResponse } from '@/app/dynamic-form/actions';
import { fetchTemplateWithBindingsById } from '@/lib/technology/service';
import { POST as exportForm } from '@/app/api/form-exports/route';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  buildSubmissionPayload,
  createBindingLookup,
  type BindingLookup,
} from './fixtures/formSubmission';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@react-pdf/renderer', () => {
  const noopComponent = () => null;
  return {
    Document: noopComponent,
    Page: noopComponent,
    View: noopComponent,
    Text: noopComponent,
    StyleSheet: { create: (styles: unknown) => styles },
    renderToBuffer: jest.fn(),
  };
});

const shouldRunIntegration = (() => {
  const flag = (process.env.RUN_INTEGRATION_TESTS ?? '').toString().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on';
})();

const describeIntegration = shouldRunIntegration ? describe : describe.skip;
const TEST_USER = 'integration-tester@tech-triage';
const mockRenderToBuffer = renderToBuffer as jest.MockedFunction<typeof renderToBuffer>;

jest.setTimeout(120_000);

describeIntegration('form submission + export integration', () => {
  let templateId: string;
  let bindingLookup: BindingLookup;

  beforeAll(async () => {
    const template = await prisma.formTemplate.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!template) {
      throw new Error('Expected an active form template seeded for integration tests');
    }

    templateId = template.id;
    const { bindingMetadata } = await fetchTemplateWithBindingsById(templateId);
    bindingLookup = createBindingLookup(bindingMetadata);
  });

  beforeEach(async () => {
    mockRenderToBuffer.mockReset();
    mockRenderToBuffer.mockResolvedValue(Buffer.from('%PDF-INTEG%'));
    await prisma.formSubmission.deleteMany();
    await prisma.technology.deleteMany();
  });

  afterAll(async () => {
    await prisma.formSubmission.deleteMany();
    await prisma.technology.deleteMany();
    await prisma.$disconnect();
  });

  it('submits a draft, reuses it for submitFormResponse, and exports a PDF via submissionId', async () => {
    const techId = 'TECH-EXPORT-001';
    const payload = buildSubmissionPayload(templateId, bindingLookup, techId, {
      calculatedScores: {
        impactScore: 4,
        valueScore: 3,
      },
    });

    const draft = await saveDraftResponse(payload, TEST_USER);
    expect(draft.success).toBe(true);

    const submissionPayload = { ...payload, rowVersions: draft.rowVersions };
    const submission = await submitFormResponse(submissionPayload, TEST_USER, draft.submissionId);
    expect(submission.success).toBe(true);
    expect(submission.submissionId).toBe(draft.submissionId);

    const response = await exportForm(createExportRequest({ submissionId: submission.submissionId }));
    const buffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(buffer.toString()).toBe('%PDF-INTEG%');

    const stored = await prisma.formSubmission.findUnique({
      where: { id: submission.submissionId as string },
      include: { scores: true },
    });

    expect(stored?.status).toBe('SUBMITTED');
    expect(stored?.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scoreType: 'impactScore', value: 4 }),
        expect.objectContaining({ scoreType: 'valueScore', value: 3 }),
      ])
    );

    const pdfElement = mockRenderToBuffer.mock.calls[0]?.[0] as { props?: { data?: Record<string, unknown> } };
    expect(pdfElement?.props?.data?.calculatedScores).toEqual(
      expect.objectContaining({ impactScore: 4, valueScore: 3 })
    );
    expect(pdfElement?.props?.data?.metadata).toMatchObject({
      statusLabel: 'Submitted',
      techId,
      submittedBy: TEST_USER,
      submissionId: submission.submissionId,
    });
    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
  });

  it('enforces optimistic locking on submitFormResponse and succeeds after retry with fresh row versions', async () => {
    const techId = 'TECH-EXPORT-STALE';
    const payload = buildSubmissionPayload(templateId, bindingLookup, techId);

    const draft = await saveDraftResponse(payload, TEST_USER);
    expect(draft.success).toBe(true);

    await prisma.technology.update({
      where: { techId },
      data: {
        technologyName: 'Parallel submit edit',
        rowVersion: { increment: 1 },
      },
    });

    const staleAttempt = await submitFormResponse(
      { ...payload, rowVersions: draft.rowVersions },
      TEST_USER,
      draft.submissionId
    );
    expect(staleAttempt.success).toBe(false);
    expect(staleAttempt.error).toBe('conflict');

    const latestTech = await prisma.technology.findUnique({
      where: { techId },
      select: { rowVersion: true },
    });

    const retryPayload = buildSubmissionPayload(templateId, bindingLookup, techId, {
      rowVersions: {
        technologyRowVersion: latestTech?.rowVersion,
      },
    });

    const retry = await submitFormResponse(retryPayload, TEST_USER, draft.submissionId);
    expect(retry.success).toBe(true);

    const afterSubmitTech = await prisma.technology.findUnique({
      where: { techId },
      select: { rowVersion: true },
    });

    expect(afterSubmitTech?.rowVersion).toBeGreaterThan(latestTech?.rowVersion ?? 0);
  });

  it('exports directly from live payloads using templateId without persisting a submission', async () => {
    const techId = 'TECH-EXPORT-LIVE';
    const livePayload = buildSubmissionPayload(templateId, bindingLookup, techId, {
      calculatedScores: { missionAlignment: 2 },
    });

    const response = await exportForm(
      createExportRequest({
        templateId,
        responses: livePayload.responses,
        repeatGroups: livePayload.repeatGroups,
        calculatedScores: livePayload.calculatedScores,
        status: 'IN_PROGRESS',
        metadata: {
          submittedBy: 'Preview User',
          notes: 'Live preview',
        },
      })
    );

    expect(response.status).toBe(200);
    const pdfFromLive = mockRenderToBuffer.mock.calls[0]?.[0] as { props?: { data?: Record<string, unknown> } };
    expect(pdfFromLive?.props?.data?.metadata).toMatchObject({
      statusLabel: 'In Progress',
      techId,
      submittedBy: 'Preview User',
      notes: 'Live preview',
    });
  });
});

function createExportRequest(body: unknown) {
  return new NextRequest(
    new Request('http://localhost/api/form-exports', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
