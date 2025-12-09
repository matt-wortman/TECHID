import { NextResponse } from 'next/server';
import { loadTemplateWithBindings } from '@/lib/technology/service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const techIdParam = url.searchParams.get('techId') || undefined;

    const {
      template,
      bindingMetadata,
      initialResponses,
      initialRepeatGroups,
      answerMetadata,
      technologyContext,
      rowVersions,
    } =
      await loadTemplateWithBindings({ techId: techIdParam });

    return NextResponse.json({
      template,
      bindingMetadata,
      initialResponses,
      initialRepeatGroups,
      answerMetadata,
      technologyContext,
      rowVersions,
    });
  } catch (error) {
    const err = error as Error;
    console.error('❌ API: Failed to load form template with bindings:', err);

    const status = err.message.includes('No active form template')
      ? 404
      : 500;

    return NextResponse.json(
      {
        error:
          status === 404
            ? 'No active form template found'
            : 'Failed to load form template',
        details: err.message ?? 'Unknown error',
      },
      { status }
    );
  }
}
