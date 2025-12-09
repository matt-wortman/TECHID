/**
 * @jest-environment node
 */
import { prisma } from '@/lib/prisma';
import { saveDraftResponse, loadDraftResponse, submitFormResponse } from '@/app/dynamic-form/actions';
import { fetchTemplateWithBindingsById } from '@/lib/technology/service';
import { buildSubmissionPayload, createBindingLookup } from './fixtures/formSubmission';
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const shouldRunIntegration = (() => {
  const flag = (process.env.RUN_INTEGRATION_TESTS ?? '').toString().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on';
})();

const describeIntegration = shouldRunIntegration ? describe : describe.skip;

const TEST_USER = 'integration-tester@tech-triage';

jest.setTimeout(120_000);

describeIntegration('dynamic form draft integration', () => {
  let templateId: string;
  let bindingLookup: ReturnType<typeof createBindingLookup>;

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
    await prisma.formSubmission.deleteMany();
    await prisma.technology.deleteMany();
  });

  afterAll(async () => {
    await prisma.formSubmission.deleteMany();
    await prisma.technology.deleteMany();
    await prisma.$disconnect();
  });

  it('persists drafts and rebuilds answer metadata after hydration', async () => {
    const techId = 'TECH-INTEG-001';
    const payload = buildSubmissionPayload(templateId, bindingLookup, techId);

    const result = await saveDraftResponse(payload, TEST_USER);
    expect(result.success).toBe(true);
    expect(result.submissionId).toBeDefined();
    expect(result.rowVersions?.technologyRowVersion).toBeGreaterThan(0);

    const technologyRecord = await prisma.technology.findUnique({
      where: { techId },
      include: { triageStage: true },
    });

    expect(technologyRecord?.technologyName).toBe('Integration Harness Demo');
    expect(technologyRecord?.reviewerName).toBe('QA Reviewer');
    expect(technologyRecord?.triageStage?.missionAlignmentScore).toBe(3);

    const loaded = await loadDraftResponse(result.submissionId as string, TEST_USER);
    expect(loaded.success).toBe(true);
    expect(loaded.data?.responses[bindingLookup.dictionaryKeyFor('technology.techId')]).toBe(techId);

    const nameDictionaryKey = bindingLookup.dictionaryKeyFor('technology.technologyName');
    const metadata = loaded.data?.answerMetadata?.[nameDictionaryKey];
    expect(metadata?.status).toBe('FRESH');
    expect(metadata?.savedRevisionId).toBe(metadata?.currentRevisionId);
  });

  it('surfaces optimistic locking conflicts when stale row versions are provided', async () => {
    const techId = 'TECH-INTEG-LOCK';
    const payload = buildSubmissionPayload(templateId, bindingLookup, techId);

    const firstSave = await saveDraftResponse(payload, TEST_USER);
    expect(firstSave.success).toBe(true);
    expect(firstSave.rowVersions?.technologyRowVersion).toBeGreaterThan(0);

    // Simulate another user updating the technology in between saves
    await prisma.technology.update({
      where: { techId },
      data: {
        technologyName: 'Parallel Edit',
        rowVersion: { increment: 1 },
      },
    });

    const conflictResult = await saveDraftResponse(
      {
        ...payload,
        rowVersions: {
          technologyRowVersion: firstSave.rowVersions?.technologyRowVersion,
        },
      },
      TEST_USER
    );

    expect(conflictResult.success).toBe(false);
    expect(conflictResult.error).toBe('conflict');
  });

  it('updates an existing draft in place when saveDraftResponse receives a draft id', async () => {
    const techId = 'TECH-INTEG-REUSE';
    const payload = buildSubmissionPayload(templateId, bindingLookup, techId);

    const firstSave = await saveDraftResponse(payload, TEST_USER);
    expect(firstSave.success).toBe(true);

    const updatedName = 'Integration Harness Demo v2';
    const updatedPayload = buildSubmissionPayload(templateId, bindingLookup, techId, {
      responses: {
        [bindingLookup.dictionaryKeyFor('technology.technologyName')]: updatedName,
      },
    });

    const secondSave = await saveDraftResponse(updatedPayload, TEST_USER, firstSave.submissionId);
    expect(secondSave.success).toBe(true);
    expect(secondSave.submissionId).toBe(firstSave.submissionId);
    expect((secondSave.rowVersions?.technologyRowVersion ?? 0)).toBeGreaterThan(
      firstSave.rowVersions?.technologyRowVersion ?? 0
    );

    const stored = await prisma.formSubmission.findUnique({
      where: { id: firstSave.submissionId as string },
      include: { responses: true },
    });

    const nameField = bindingLookup.dictionaryKeyFor('technology.technologyName');
    const draftName = stored?.responses.find((response) => response.questionCode === nameField)?.value;
    expect(draftName).toBe(updatedName);
  });

  it('submits an existing draft and records calculated scores', async () => {
    const techId = 'TECH-INTEG-SUBMIT';
    const payload = buildSubmissionPayload(templateId, bindingLookup, techId, {
      calculatedScores: {
        impactScore: 4,
        valueScore: 3,
      },
    });

    const draft = await saveDraftResponse(payload, TEST_USER);
    expect(draft.success).toBe(true);

    const submission = await submitFormResponse(payload, TEST_USER, draft.submissionId);
    expect(submission.success).toBe(true);
    expect(submission.submissionId).toBeDefined();

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
  });

  it('blocks submitFormResponse when row versions drift between autosave and submit', async () => {
    const techId = 'TECH-INTEG-SUBMIT-CONFLICT';
    const payload = buildSubmissionPayload(templateId, bindingLookup, techId);

    const draft = await saveDraftResponse(payload, TEST_USER);
    expect(draft.success).toBe(true);

    await prisma.technology.update({
      where: { techId },
      data: {
        technologyName: 'Parallel Submit Edit',
        rowVersion: { increment: 1 },
      },
    });

    const conflictPayload = buildSubmissionPayload(templateId, bindingLookup, techId, {
      rowVersions: draft.rowVersions,
    });

    const conflict = await submitFormResponse(conflictPayload, TEST_USER, draft.submissionId);
    expect(conflict.success).toBe(false);
    expect(conflict.error).toBe('conflict');
  });
});
