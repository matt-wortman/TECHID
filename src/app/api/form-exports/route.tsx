import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { SubmissionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buildPrintableForm } from '@/lib/form-engine/pdf/serialize';
import { FormPdfDocument } from '@/lib/form-engine/pdf/FormPdfDocument';
import { FormResponse, RepeatableGroupData } from '@/lib/form-engine/types';

interface ExportRequestBody {
  templateId?: string;
  submissionId?: string;
  responses?: Record<string, unknown>;
  repeatGroups?: Record<string, unknown>;
  calculatedScores?: Record<string, unknown> | null;
  status?: SubmissionStatus | 'BLANK' | 'IN_PROGRESS';
  metadata?: {
    techId?: string | null;
    submittedAt?: string | null;
    submittedBy?: string | null;
    notes?: string | null;
  };
}

export async function POST(request: NextRequest) {
  let body: ExportRequestBody;

  try {
    body = (await request.json()) as ExportRequestBody;
  } catch (error) {
    console.error('❌ form-exports: Invalid JSON payload', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
  }

  let { templateId } = body;
  const {
    submissionId,
    responses: rawResponses,
    repeatGroups: rawRepeatGroups,
    calculatedScores,
    status,
    metadata,
  } = body;

  let normalizedResponses: FormResponse = normalizeResponses(rawResponses);
  let normalizedRepeatGroups: RepeatableGroupData = normalizeRepeatGroups(rawRepeatGroups);
  let normalizedScores = calculatedScores || null;
  let submissionStatus: SubmissionStatus | 'BLANK' | 'IN_PROGRESS' = status ?? 'IN_PROGRESS';

  let submissionMetadata: {
    techId?: string | null;
    submittedAt?: string | null;
    submittedBy?: string | null;
    notes?: string | null;
  } = { ...metadata };

  if (submissionId) {
    const submissionData = await fetchSubmissionData(submissionId);
    if (!submissionData) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    templateId ??= submissionData.templateId;
    normalizedResponses = submissionData.responses;
    normalizedRepeatGroups = submissionData.repeatGroups;
    normalizedScores = normalizedScores ?? submissionData.calculatedScores;
    submissionStatus = status ?? submissionData.status ?? submissionStatus;
    submissionMetadata = {
      techId: metadata?.techId ?? submissionData.techId ?? null,
      submittedAt: metadata?.submittedAt ?? submissionData.submittedAt ?? null,
      submittedBy: metadata?.submittedBy ?? submissionData.submittedBy ?? null,
      notes: metadata?.notes ?? null,
    };
  }

  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
  }

  const template = await prisma.formTemplate.findUnique({
    where: { id: templateId },
    include: {
      sections: {
        include: {
          questions: {
            include: {
              options: { orderBy: { order: 'asc' } },
              scoringConfig: true,
              dictionary: true,
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: 'Form template not found' }, { status: 404 });
  }

  if (!submissionMetadata.techId) {
    submissionMetadata.techId = extractTechnologyId(normalizedResponses);
  }

  const printableForm = buildPrintableForm({
    template,
    responses: normalizedResponses,
    repeatGroups: normalizedRepeatGroups,
    calculatedScores: normalizedScores ?? undefined,
    status: submissionStatus,
    submissionId,
    submittedAt: submissionMetadata.submittedAt ?? null,
    submittedBy: submissionMetadata.submittedBy ?? null,
    techId: submissionMetadata.techId ?? null,
    notes: submissionMetadata.notes ?? null,
  });

  const pdfBuffer = await renderToBuffer(<FormPdfDocument data={printableForm} />);
  const filename = buildFilename(template.name, submissionStatus);

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}

type SubmissionData = {
  templateId: string;
  responses: FormResponse;
  repeatGroups: RepeatableGroupData;
  calculatedScores: Record<string, number> | null;
  status: SubmissionStatus | null;
  submittedAt: string | null;
  submittedBy: string | null;
  techId: string | null;
};

async function fetchSubmissionData(submissionId: string): Promise<SubmissionData | null> {
  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        scores: true,
      },
    });

    if (!submission) {
      return null;
    }

    let responses: FormResponse = {};
    let repeatGroups: RepeatableGroupData = {};

    // Load answers from TechnologyAnswer if submission has a technologyId
    if (submission.technologyId) {
      const technologyAnswers = await prisma.technologyAnswer.findMany({
        where: { technologyId: submission.technologyId },
      });

      // Fetch template to determine which keys are repeat groups
      const template = await prisma.formTemplate.findUnique({
        where: { id: submission.templateId },
        include: {
          sections: {
            include: {
              questions: true,
            },
          },
        },
      });

      const repeatGroupKeys = new Set<string>();
      if (template) {
        for (const section of template.sections) {
          for (const question of section.questions) {
            if (question.type === 'REPEATABLE_GROUP' && question.dictionaryKey) {
              repeatGroupKeys.add(question.dictionaryKey);
            }
          }
        }
      }

      // Transform TechnologyAnswer to responses and repeatGroups
      for (const answer of technologyAnswers) {
        if (repeatGroupKeys.has(answer.questionKey)) {
          repeatGroups[answer.questionKey] = answer.value as Record<string, unknown>[];
        } else {
          responses[answer.questionKey] = answer.value as FormResponse[string];
        }
      }
    }

    const calculatedScores = submission.scores.reduce<Record<string, number>>((acc, score) => {
      acc[score.scoreType] = score.value;
      return acc;
    }, {});

    return {
      templateId: submission.templateId,
      responses,
      repeatGroups,
      calculatedScores: Object.keys(calculatedScores).length > 0 ? calculatedScores : null,
      status: submission.status ?? null,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      submittedBy: submission.submittedBy ?? null,
      techId: extractTechnologyId(responses),
    };
  } catch (error) {
    console.error('❌ form-exports: Failed to load submission data', error);
    throw error;
  }
}

function normalizeResponses(raw: Record<string, unknown> | undefined): FormResponse {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return Object.entries(raw).reduce<FormResponse>((acc, [key, value]) => {
    acc[key] = value as FormResponse[string];
    return acc;
  }, {});
}

function normalizeRepeatGroups(raw: Record<string, unknown> | undefined): RepeatableGroupData {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return Object.entries(raw).reduce<RepeatableGroupData>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.map((row) => (typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {}));
    }
    return acc;
  }, {});
}

function extractTechnologyId(responses: FormResponse): string | null {
  const techIdCandidates = ['F0.1', 'technologyId', 'techId'];
  for (const field of techIdCandidates) {
    const value = responses[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function buildFilename(templateName: string, status: SubmissionStatus | 'BLANK' | 'IN_PROGRESS'): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0];
  const slug = templateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'form';
  const statusLabel = status?.toString().toLowerCase() ?? 'export';
  return `${slug}-${statusLabel}-${timestamp}.pdf`;
}
