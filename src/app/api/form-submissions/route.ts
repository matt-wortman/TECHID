import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SubmissionStatus, Prisma } from '@prisma/client';
import {
  formSubmissionRequestSchema,
  formSubmissionUpdateSchema,
} from '@/lib/validation/form-submission';

const isDev = process.env.NODE_ENV !== 'production';

function buildScoreEntries(
  submissionId: string,
  calculatedScores: Record<string, Prisma.JsonValue> | undefined
) {
  if (!calculatedScores) {
    return [];
  }

  return Object.entries(calculatedScores)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([scoreType, value]) => ({
      submissionId,
      scoreType,
      value: value as number,
    }));
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parseResult = formSubmissionRequestSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid form submission payload',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { templateId, submittedBy, status, responses, repeatGroups, calculatedScores } =
      parseResult.data;

    const actor = submittedBy ?? 'anonymous';
    const submissionStatus = status ?? SubmissionStatus.DRAFT;

    if (isDev) {
      console.log('Creating form submission', {
        templateId,
        submittedBy: actor,
        status: submissionStatus,
      });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        templateId,
        submittedBy: actor,
        status: submissionStatus,
        submittedAt:
          submissionStatus === SubmissionStatus.SUBMITTED ? new Date() : null,
      },
    });

    // Note: Answer data is written via applyBindingWrites() which writes to TechnologyAnswer
    // This API route only handles CalculatedScores
    const scoreEntries = buildScoreEntries(submission.id, calculatedScores);
    if (scoreEntries.length > 0) {
      await prisma.calculatedScore.createMany({ data: scoreEntries });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      status: submission.status,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating form submission:', err);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save form submission',
        details: err.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');
    const templateId = searchParams.get('templateId');
    const submittedBy = searchParams.get('submittedBy');

    if (submissionId) {
      const submission = await prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: {
          scores: true,
        },
      });

      if (!submission) {
        return NextResponse.json(
          { success: false, error: 'Submission not found' },
          { status: 404 }
        );
      }

      let responses: Record<string, Prisma.JsonValue> = {};
      let repeatable: Record<string, unknown[]> = {};

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
            repeatable[answer.questionKey] = answer.value as unknown[];
          } else {
            responses[answer.questionKey] = answer.value as Prisma.JsonValue;
          }
        }

        if (isDev) {
          console.log('GET submission: loaded from TechnologyAnswer', {
            submissionId,
            technologyId: submission.technologyId,
            answerCount: technologyAnswers.length,
          });
        }
      } else {
        if (isDev) {
          console.log('GET submission: no technologyId - returning empty responses', {
            submissionId,
          });
        }
      }

      const calculatedScores: Record<string, number> = {};
      submission.scores.forEach((score) => {
        calculatedScores[score.scoreType] = score.value;
      });

      return NextResponse.json({
        success: true,
        submission: {
          id: submission.id,
          templateId: submission.templateId,
          status: submission.status,
          submittedBy: submission.submittedBy,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          submittedAt: submission.submittedAt,
          responses,
          repeatGroups: repeatable,
          calculatedScores,
        },
      });
    }

    const where: { templateId?: string; submittedBy?: string } = {};
    if (templateId) where.templateId = templateId;
    if (submittedBy) where.submittedBy = submittedBy;

    const submissions = await prisma.formSubmission.findMany({
      where,
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

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching form submissions:', err);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch form submissions',
        details: err.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const json = await request.json();
    const parseResult = formSubmissionUpdateSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid form submission payload',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { submissionId, status, calculatedScores } = parseResult.data;
    // Note: responses and repeatGroups are no longer used here
    // Answer data is written via applyBindingWrites() which writes to TechnologyAnswer

    if (isDev) {
      console.log('Updating form submission', submissionId);
    }

    const submission = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: status ?? undefined,
        submittedAt:
          status === SubmissionStatus.SUBMITTED ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    // Update calculated scores
    await prisma.calculatedScore.deleteMany({ where: { submissionId } });

    const scoreEntries = buildScoreEntries(submissionId, calculatedScores);
    if (scoreEntries.length > 0) {
      await prisma.calculatedScore.createMany({ data: scoreEntries });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      status: submission.status,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating form submission:', err);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update form submission',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
