import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Download, Save, Send } from 'lucide-react';
import { useFormEngine } from '@/lib/form-engine/renderer';
import { shouldShowField, shouldRequireField, parseConditionalConfig } from '@/lib/form-engine/conditional-logic';
import { FieldType, ValidationRule } from '@/lib/form-engine/types';
import { parseValidationMetadata } from '@/lib/form-engine/json-utils';
import { toast } from 'sonner';
import { getClientLogger } from '@/lib/session';

type SubmissionStatusValue = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'ARCHIVED';

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_HEARTBEAT_MS = 30000;

interface DynamicFormNavigationProps {
  onSaveDraft?: (
    data: { responses: Record<string, unknown>; repeatGroups: Record<string, unknown>; calculatedScores: unknown },
    options?: { silent?: boolean }
  ) => void;
  onSubmit?: (data: { responses: Record<string, unknown>; repeatGroups: Record<string, unknown>; calculatedScores: unknown }) => void;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
  submissionId?: string | null;
  exportStatus?: SubmissionStatusValue | 'BLANK' | 'IN_PROGRESS';
}

export function DynamicFormNavigation({
  onSaveDraft,
  onSubmit,
  isSubmitting = false,
  isSavingDraft = false,
  submissionId = null,
  exportStatus,
}: DynamicFormNavigationProps) {
  const {
    template,
    currentSection,
    responses,
    repeatGroups,
    calculatedScores,
    nextSection,
    previousSection,
    submitForm,
    saveDraft,
    setError  // ✅ ADD setError to set validation errors in form state
  } = useFormEngine();

  const [isExporting, setIsExporting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutosaveAt, setLastAutosaveAt] = useState<Date | null>(null);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const latestDataRef = useRef<{
    responses: Record<string, unknown>;
    repeatGroups: Record<string, unknown>;
    calculatedScores: unknown;
  } | null>(null);
  const hasInitializedSnapshotRef = useRef(false);
  const lastAutosaveErrorRef = useRef<number | null>(null);

  const buildSnapshot = useCallback(() => {
    if (!latestDataRef.current) return '';
    return JSON.stringify({
      responses: latestDataRef.current.responses,
      repeatGroups: latestDataRef.current.repeatGroups,
      calculatedScores: latestDataRef.current.calculatedScores,
    });
  }, []);

  const performAutosave = useCallback(async () => {
    if (!onSaveDraft || !latestDataRef.current) return;
    if (isSavingDraft || isSubmitting) return;

    const currentSnapshot = buildSnapshot();
    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    setAutosaveStatus('saving');
    try {
      await Promise.resolve(
        onSaveDraft(
          {
            responses: latestDataRef.current.responses,
            repeatGroups: latestDataRef.current.repeatGroups,
            calculatedScores: latestDataRef.current.calculatedScores,
          },
          { silent: true }
        )
      );

      lastSavedSnapshotRef.current = currentSnapshot;
      setLastAutosaveAt(new Date());
      setAutosaveStatus('saved');
      lastAutosaveErrorRef.current = null;
    } catch (error) {
      getClientLogger().error('Autosave failed', error);
      setAutosaveStatus('error');
      const now = Date.now();
      if (!lastAutosaveErrorRef.current || now - lastAutosaveErrorRef.current > 30000) {
        toast.error('Autosave failed. Please check your connection.');
        lastAutosaveErrorRef.current = now;
      }
    }
  }, [buildSnapshot, isSavingDraft, isSubmitting, onSaveDraft]);

  useEffect(() => {
    latestDataRef.current = {
      responses,
      repeatGroups,
      calculatedScores,
    };
  }, [responses, repeatGroups, calculatedScores]);

  useEffect(() => {
    if (!hasInitializedSnapshotRef.current && latestDataRef.current) {
      lastSavedSnapshotRef.current = JSON.stringify({
        responses: latestDataRef.current.responses,
        repeatGroups: latestDataRef.current.repeatGroups,
        calculatedScores: latestDataRef.current.calculatedScores,
      });
      hasInitializedSnapshotRef.current = true;
    }
  }, [responses, repeatGroups, calculatedScores]);

  useEffect(() => {
    if (!onSaveDraft) return;
    if (!hasInitializedSnapshotRef.current || !latestDataRef.current) return;
    if (isSavingDraft || isSubmitting) return;

    const currentSnapshot = buildSnapshot();
    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    autosaveTimerRef.current = setTimeout(async () => {
      await performAutosave();
      autosaveTimerRef.current = null;
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [buildSnapshot, isSavingDraft, isSubmitting, onSaveDraft, performAutosave, responses, repeatGroups, calculatedScores]);

  // Heartbeat autosave to cover long typing sessions without idle pauses
  useEffect(() => {
    if (!onSaveDraft) return;
    const intervalId = setInterval(() => {
      performAutosave();
    }, AUTOSAVE_HEARTBEAT_MS);
    return () => clearInterval(intervalId);
  }, [onSaveDraft, performAutosave]);

  // Attempt to save when the tab is hidden (e.g., user switches tabs or closes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        performAutosave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [performAutosave]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const autosaveMessage = useMemo(() => {
    switch (autosaveStatus) {
      case 'saving':
        return 'Auto-saving…';
      case 'saved':
        return lastAutosaveAt
          ? `Last saved at ${lastAutosaveAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          : 'Saved';
      case 'error':
        return 'Autosave failed. Changes may not be saved.';
      default:
        return '';
    }
  }, [autosaveStatus, lastAutosaveAt]);

  if (!template) {
    return null;
  }

  const totalSections = template.sections.length;
  const isFirstSection = currentSection === 0;
  const isLastSection = currentSection === totalSections - 1;

  const hasResponses = hasResponseValues(responses, repeatGroups);

  const computedExportStatus: SubmissionStatusValue | 'BLANK' | 'IN_PROGRESS' = exportStatus
    ?? (submissionId ? 'DRAFT' : hasResponses ? 'IN_PROGRESS' : 'BLANK');

  const handleExport = async () => {
    if (!template) {
      toast.error('No form template available for export');
      return;
    }

    setIsExporting(true);
    try {
      const payload = {
        templateId: template.id,
        submissionId: submissionId ?? undefined,
        responses,
        repeatGroups,
        status: computedExportStatus,
      };

      const response = await fetch('/api/form-exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await safeReadJson(response);
        const message = errorData?.error ?? 'Failed to generate PDF export';
        toast.error(message);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const filename = extractFilename(response.headers.get('Content-Disposition'))
        ?? `${template.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'form'}-export.pdf`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('PDF export ready for download');
    } catch (error) {
      getClientLogger().error('Export PDF failed', error);
      toast.error('An unexpected error occurred while preparing the PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Always allow section navigation even when required fields are missing; final submission still validates.
  const skipSectionValidation = true;

  const scrollToField = (questionKey: string) => {
    if (typeof document === 'undefined') return;

    const escapedCode = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(questionKey)
      : questionKey.replace(/"/g, '\\"');

    const container = document.querySelector<HTMLElement>(`[data-dictionary-key="${escapedCode}"]`);
    if (!container) {
      return;
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const focusable = container.querySelector<HTMLElement>(
      'input, textarea, select, [role="combobox"], [contenteditable="true"], button, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable) {
      focusable.focus();
    }
  };

  const handleNext = () => {
    if (isLastSection) {
      return;
    }

    const validationResult = validateCurrentSection();

    if (validationResult.hasErrors) {
      validationResult.errors.forEach((error) => {
        setError(error.questionKey, error.message);
      });

      if (!skipSectionValidation) {
        getClientLogger().warn('Validation failed, blocking navigation', validationResult.errors);
        return;
      }

      getClientLogger().info('Validation failed but navigation allowed due to relaxed rules');
    }

    nextSection();
  };

  // ✅ ADD validation function for current section
  const validateSections = (sectionsToValidate: typeof template.sections) => {
    const errors: { questionKey: string; message: string; label: string; sectionTitle: string }[] = [];

    sectionsToValidate.forEach((section) => {
      const questions = [...section.questions].sort((a, b) => a.order - b.order);

      for (const question of questions) {
        // Use dictionaryKey for data lookups
        const questionKey = question.dictionaryKey;
        if (!questionKey) continue;

        const conditionalConfig = parseConditionalConfig(question.conditional);
        const isVisible = shouldShowField(conditionalConfig, responses);

        if (!isVisible) continue;

        const isRequired = shouldRequireField(conditionalConfig, question.isRequired, responses);
        const value =
          question.type === FieldType.REPEATABLE_GROUP || question.type === FieldType.DATA_TABLE_SELECTOR
            ? repeatGroups[questionKey]
            : responses[questionKey];

        const isEmptyValue =
          value === undefined ||
          value === null ||
          value === '' ||
          value === false ||
          (Array.isArray(value) && value.length === 0);

        if (isRequired && isEmptyValue) {
          let errorMessage = `${question.label} is required`;

          if (question.validation) {
            const validationMetadata = parseValidationMetadata(question.validation);
            const rules = Array.isArray(validationMetadata?.rules)
              ? (validationMetadata?.rules as ValidationRule[])
              : [];

            const requiredRule = rules.find((rule) => rule.type === 'required');
            if (requiredRule?.message) {
              errorMessage = requiredRule.message;
            }
          }

          errors.push({
            questionKey: questionKey,
            message: errorMessage,
            label: question.label,
            sectionTitle: section.title,
          });
        }
      }
    });

    return { hasErrors: errors.length > 0, errors };
  };

  const validateCurrentSection = () => {
    if (!template) return { hasErrors: false, errors: [] };

    const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
    const currentSectionData = sortedSections[currentSection];

    if (!currentSectionData) return { hasErrors: false, errors: [] };

    return validateSections([currentSectionData]);
  };

  const validateAllSections = () => {
    if (!template) return { hasErrors: false, errors: [] };

    const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
    return validateSections(sortedSections);
  };

  const handlePrevious = () => {
    if (!isFirstSection) {
      previousSection();
    }
  };

  const handleSaveDraft = async () => {
    const formData = {
      responses,
      repeatGroups,
      calculatedScores,
    };

    try {
      setAutosaveStatus('saving');
      if (onSaveDraft) {
        if (process.env.NODE_ENV !== 'production') {
          getClientLogger().info('Saving draft', { hasResponses: hasResponseValues(responses, repeatGroups) });
        }
        await Promise.resolve(onSaveDraft(formData, { silent: false }));
      } else {
        await saveDraft();
      }
      lastSavedSnapshotRef.current = JSON.stringify(formData);
      setLastAutosaveAt(new Date());
      setAutosaveStatus('saved');
      lastAutosaveErrorRef.current = null;
    } catch (error) {
      getClientLogger().error('Manual draft save failed', error);
      setAutosaveStatus('error');
      toast.error('Failed to save draft. Please try again.');
    }
  };

  const handleSubmit = () => {
    const formData = {
      responses,
      repeatGroups,
      calculatedScores,
    };

    const validationResult = validateAllSections();

    if (validationResult.hasErrors) {
      validationResult.errors.forEach((error) => {
        setError(error.questionKey, error.message);
      });

      const primaryError = validationResult.errors[0];
      if (primaryError) {
        toast.error(
          `Please complete "${primaryError.label}" in the "${primaryError.sectionTitle}" section before submitting.`
        );
        requestAnimationFrame(() => scrollToField(primaryError.questionKey));
      } else {
        toast.error('Please fill in all required fields before submitting.');
      }
      return;
    }

    if (onSubmit) {
      getClientLogger().info('Submitting form', { hasResponses: hasResponseValues(responses, repeatGroups) });
      onSubmit(formData);
    } else {
      submitForm();
    }
  };

  const progressValue = ((currentSection + 1) / totalSections) * 100;

  return (
    <Card className="bg-[#e0e5ec] shadow-none border-0">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7280]">
              Section {currentSection + 1} of {totalSections}
            </span>
            <span className="text-[#6b7280]">
                {Math.round(progressValue)}% Complete
              </span>
            </div>
            <div className="bg-[#e0e5ec] [box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full [box-shadow:2px_2px_4px_0px_rgba(59,130,246,0.5)]"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            {autosaveMessage && (
              <div
                className={`text-xs ${
                  autosaveStatus === 'error' ? 'text-red-500' : 'text-[#6b7280]'
                } text-right`}
              >
                {autosaveMessage}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            {/* Previous button */}
            <button
              onClick={handlePrevious}
              disabled={isFirstSection}
              className={`px-4 py-2 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all ${
                isFirstSection
                  ? 'opacity-50 cursor-not-allowed'
                  : '[box-shadow:5px_5px_10px_0px_#a3b1c6,-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]'
              }`}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            {/* Action buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`px-4 py-2 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all ${
                  isExporting
                    ? 'opacity-50 cursor-not-allowed'
                    : '[box-shadow:5px_5px_10px_0px_#a3b1c6,-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]'
                }`}
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? 'Preparing...' : 'Export PDF'}
              </button>
              {/* Next/Save Draft/Submit based on section */}
              {!isLastSection ? (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className={`px-4 py-2 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all ${
                      isSavingDraft
                        ? 'opacity-50 cursor-not-allowed'
                        : '[box-shadow:5px_5px_10px_0px_#a3b1c6,-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]'
                    }`}
                  >
                    {isSavingDraft ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={isSubmitting || isSavingDraft}
                    className={`px-4 py-2 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all ${
                      isSubmitting || isSavingDraft
                        ? 'opacity-50 cursor-not-allowed'
                        : '[box-shadow:5px_5px_10px_0px_#a3b1c6,-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isSubmitting}
                    className={`px-4 py-2 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all ${
                      isSavingDraft || isSubmitting
                        ? 'opacity-50 cursor-not-allowed'
                        : '[box-shadow:5px_5px_10px_0px_#a3b1c6,-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]'
                    }`}
                  >
                    {isSavingDraft ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSavingDraft}
                    className={`px-4 py-2 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all ${
                      isSubmitting || isSavingDraft
                        ? 'opacity-50 cursor-not-allowed'
                        : '[box-shadow:5px_5px_10px_0px_#a3b1c6,-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Submit Form'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/);
  return match ? match[1] : null;
}

function hasResponseValues(
  responses: Record<string, unknown>,
  repeatGroups: Record<string, unknown>
): boolean {
  const responseHasValue = Object.values(responses).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value as object).length > 0;
  });

  const repeatGroupHasValue = Object.values(repeatGroups).some(
    (groupRows) => Array.isArray(groupRows) && groupRows.length > 0
  );

  return responseHasValue || repeatGroupHasValue;
}
