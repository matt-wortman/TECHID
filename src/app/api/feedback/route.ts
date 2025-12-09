import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { feedbackRequestSchema } from '@/lib/validation/feedback';

const isDev = process.env.NODE_ENV !== 'production';

const normalizeOptional = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload.',
        },
        { status: 400 },
      );
    }

    const parseResult = feedbackRequestSchema.safeParse(payload);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid feedback payload.',
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { pageUrl, message, contactInfo, userId } = parseResult.data;
    const fallbackPageUrl = request.headers.get('referer') ?? 'unknown';
    const userAgent = normalizeOptional(request.headers.get('user-agent'));

    const feedback = await prisma.feedback.create({
      data: {
        pageUrl: pageUrl || fallbackPageUrl,
        message,
        contactInfo: normalizeOptional(contactInfo),
        userId: normalizeOptional(userId),
        userAgent,
      },
    });

    if (isDev) {
      console.log('Feedback created', {
        feedbackId: feedback.id,
        pageUrl: feedback.pageUrl,
      });
    }

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error('Failed to submit feedback', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save feedback.',
      },
      { status: 500 },
    );
  }
}
