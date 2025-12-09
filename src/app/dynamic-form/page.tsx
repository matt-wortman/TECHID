"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Hammer, Home, ClipboardList, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { FormEngineProvider, DynamicFormRenderer } from '@/lib/form-engine/renderer';
import { DynamicFormNavigation } from '@/components/form/DynamicFormNavigation';
import {
  FormTemplateWithSections,
  FormResponse,
  RepeatableGroupData,
  CalculatedScores,
} from '@/lib/form-engine/types';
import { submitFormResponse, saveDraftResponse, loadDraftResponse } from './actions';
import { AnswerStatusDetail, RowVersionSnapshot } from '@/lib/technology/types';
import { getOrCreateSessionId, getClientLogger } from '@/lib/session';
import { toast } from 'sonner';

function DynamicFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const draftId = searchParams?.get('draft');

  const [template, setTemplate] = useState<FormTemplateWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [initialFormData, setInitialFormData] = useState<{
    responses: FormResponse;
    repeatGroups: RepeatableGroupData;
    calculatedScores: Record<string, unknown>;
    answerMetadata: Record<string, AnswerStatusDetail>;
  } | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [rowVersions, setRowVersions] = useState<RowVersionSnapshot | null>(null);

  const techIdParam = searchParams?.get('techId');
  const techId = techIdParam && techIdParam.trim().length > 0 ? techIdParam.trim() : null;

  // Memoize initial data so FormEngineProvider doesn't re-hydrate
  // on every parent re-render (which would wipe in-progress edits).
  const memoInitialData = useMemo(() => {
    return initialFormData
      ? {
          responses: initialFormData.responses,
          repeatGroups: initialFormData.repeatGroups,
          answerMetadata: initialFormData.answerMetadata,
        }
      : undefined;
  }, [initialFormData]);

  const loadTemplateAndDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsDraftLoaded(false);
    setCurrentDraftId(draftId ?? null);

    try {
      const query = techId ? `?techId=${encodeURIComponent(techId)}` : '';
      const response = await fetch(`/api/form-templates${query}`);
      const payload = await response.json();

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) ||
          'Failed to load form template';
        throw new Error(message);
      }

      setTemplate(payload.template);

      const prefilledResponses = (payload.initialResponses ?? {}) as FormResponse;
      const prefilledRepeatGroups = (payload.initialRepeatGroups ?? {}) as RepeatableGroupData;
      const prefilledMetadata = (payload.answerMetadata ?? {}) as Record<string, AnswerStatusDetail>;
      setRowVersions(payload.rowVersions ?? null);

      if (draftId) {
        const logger = getClientLogger();
        logger.info('Loading draft', draftId);
        const draftResult = await loadDraftResponse(draftId, getOrCreateSessionId());

        if (draftResult.success && draftResult.data) {
          logger.info('Draft loaded successfully');
          const mergedMetadata =
            draftResult.data.answerMetadata && Object.keys(draftResult.data.answerMetadata).length > 0
              ? { ...prefilledMetadata, ...draftResult.data.answerMetadata }
              : prefilledMetadata;
          setInitialFormData({
            responses: {
              ...prefilledResponses,
              ...draftResult.data.responses,
            },
            repeatGroups: {
              ...prefilledRepeatGroups,
              ...draftResult.data.repeatGroups,
            },
            calculatedScores: draftResult.data.calculatedScores,
            answerMetadata: mergedMetadata,
          });
          setCurrentDraftId(draftResult.submissionId || draftId);
          setIsDraftLoaded(true);
          toast.success('Draft loaded successfully!');
        } else {
          logger.error('Failed to load draft', draftResult.error);
          toast.error(draftResult.error || 'Failed to load draft');
          router.replace('/dynamic-form');
        }
      } else {
        setInitialFormData({
          responses: prefilledResponses,
          repeatGroups: prefilledRepeatGroups,
          calculatedScores: {},
          answerMetadata: prefilledMetadata,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [draftId, techId, router]);

  useEffect(() => {
    loadTemplateAndDraft();
  }, [loadTemplateAndDraft]);

  const handleSubmit = async (data: {
    responses: FormResponse;
    repeatGroups: RepeatableGroupData;
    calculatedScores: CalculatedScores | null;
  }) => {
    const logger = getClientLogger();
    logger.info('Submitting form');

    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    try {
      if (!template?.id) {
        toast.error('No form template found');
        setIsSubmitting(false);
        return;
      }

      const normalizedScores: Record<string, unknown> = data.calculatedScores
        ? { ...data.calculatedScores }
        : {};

      const result = await submitFormResponse(
        {
          templateId: template.id,
          responses: data.responses as Record<string, unknown>,
          repeatGroups: data.repeatGroups as Record<string, unknown>,
          calculatedScores: normalizedScores,
          rowVersions: rowVersions ?? undefined,
        },
        getOrCreateSessionId(),
        currentDraftId || undefined
      );

      if (result.success) {
        logger.info('Form submitted successfully', result.submissionId);
        toast.success('Form submitted successfully!');

        setRowVersions(result.rowVersions ?? null);

        // Clear the current draft ID since it's now submitted
        setCurrentDraftId(null);
        setInitialFormData(null);
        setIsDraftLoaded(false);

        // Redirect to submissions page with success message
        setTimeout(() => {
          router.push('/dynamic-form/submissions?submitted=true');
        }, 1500);
      } else {
        logger.error('Form submission failed', result.error);
        if (result.error === 'conflict') {
          toast.error('This record was updated elsewhere. Reloading latest data.');
          await loadTemplateAndDraft();
        } else {
          toast.error(result.error || 'Failed to submit form');
        }
      }
    } catch (error) {
      logger.error('Form submission error', error);
      toast.error('An unexpected error occurred while submitting the form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async (
    data: {
      responses: FormResponse;
      repeatGroups: RepeatableGroupData;
      calculatedScores: CalculatedScores | null;
    },
    options?: { silent?: boolean }
  ) => {
    const logger = getClientLogger();
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Saving draft');
    }

    if (isSavingDraft) return; // Prevent multiple save operations

    setIsSavingDraft(true);
    try {
      if (!template?.id) {
        toast.error('No form template found');
        setIsSavingDraft(false);
        return;
      }

      const normalizedScores: Record<string, unknown> = data.calculatedScores
        ? { ...data.calculatedScores }
        : {};

      const result = await saveDraftResponse(
        {
          templateId: template.id,
          responses: data.responses as Record<string, unknown>,
          repeatGroups: data.repeatGroups as Record<string, unknown>,
          calculatedScores: normalizedScores,
          rowVersions: rowVersions ?? undefined,
        },
        getOrCreateSessionId(),
        currentDraftId || undefined
      );

      if (result.success) {
        logger.info('Draft saved successfully', result.submissionId);

        setRowVersions(result.rowVersions ?? rowVersions);

        // Update current draft ID if this was a new draft
        if (!currentDraftId && result.submissionId) {
          setCurrentDraftId(result.submissionId);
          // Update URL to include draft ID for future saves
          router.replace(`/dynamic-form?draft=${result.submissionId}`, { scroll: false });
        }

        // Suppress success toasts to avoid distracting the user during data entry
      } else {
        logger.error('Draft save failed', result.error);
        if (result.error === 'conflict') {
          toast.error('Someone else updated this draft. Reloading latest data.');
          await loadTemplateAndDraft();
        } else {
          toast.error(result.error || 'Failed to save draft');
        }
      }
    } catch (error) {
      logger.error('Draft save error', error);
      toast.error('An unexpected error occurred while saving draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-[#6b7280]">
            {draftId ? 'Loading draft...' : 'Loading dynamic form...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Form</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#6b7280] mb-4">{error}</p>
            <Link href="/">
              <Button variant="outline">Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Form Template Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#6b7280] mb-4">No active form template was found in the database.</p>
            <Link href="/">
              <Button variant="outline">Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navButtonClass = 'h-10 px-5 rounded-full text-[15px] font-medium gap-2';

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <nav className="bg-[#e0e5ec] border-0 shadow-none">
        <div className="container mx-auto max-w-4xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 text-[#353535] font-semibold text-xl">
              <div className="text-primary text-2xl">✚</div>
              Technology Triage (Dynamic)
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              {currentDraftId && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 text-sm">
                  <FileText className="h-4 w-4" />
                  Draft Mode
                </Badge>
              )}
              <Button asChild className={navButtonClass}>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form">
                  <FileText className="h-4 w-4" />
                  Dynamic Form
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/builder">
                  <Hammer className="h-4 w-4" />
                  Builder
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/drafts">
                  <FileText className="h-4 w-4" />
                  Drafts
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/submissions">
                  <ClipboardList className="h-4 w-4" />
                  Submissions
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/library">
                  <BookOpen className="h-4 w-4" />
                  Library
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-[#e0e5ec] shadow-none border-0 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#353535]">{template.name}</h1>
                <p className="text-[#6b7280]">{template.description}</p>
                <p className="text-sm text-[#6b7280]">Version: {template.version}</p>
              </div>
              {isDraftLoaded && (
                <div className="text-right">
                  <Badge variant="outline" className="mb-2">
                    Draft Loaded
                  </Badge>
                  <p className="text-sm text-[#6b7280]">
                    Continuing previous work
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <FormEngineProvider
          template={template}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          initialData={memoInitialData}
        >
          <div className="space-y-8">
            <DynamicFormRenderer />

            {/* Dynamic Navigation */}
            <DynamicFormNavigation
              onSubmit={(formData) =>
                handleSubmit({
                  responses: formData.responses as FormResponse,
                  repeatGroups: formData.repeatGroups as RepeatableGroupData,
                  calculatedScores: formData.calculatedScores as CalculatedScores | null,
                })
              }
              onSaveDraft={(formData, options) =>
                handleSaveDraft({
                  responses: formData.responses as FormResponse,
                  repeatGroups: formData.repeatGroups as RepeatableGroupData,
                  calculatedScores: formData.calculatedScores as CalculatedScores | null,
                }, options)
              }
              isSubmitting={isSubmitting}
              isSavingDraft={isSavingDraft}
              submissionId={currentDraftId}
            />
          </div>
        </FormEngineProvider>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-[#6b7280]">Loading form...</p>
      </div>
    </div>
  );
}

export default function DynamicFormPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DynamicFormContent />
    </Suspense>
  );
}
