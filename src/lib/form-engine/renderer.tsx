import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import {
  FormTemplateWithSections,
  FormSectionWithQuestions,
  FormQuestionWithDetails,
  FormState,
  FormAction,
  FormContext,
  FormResponse,
  RepeatableGroupData,
  CalculatedScores,
  FieldType,
  ValidationConfig
} from './types';
import { shouldShowField, shouldRequireField, parseConditionalConfig } from './conditional-logic';
import { getDefaultValue } from './field-mappings-simple';
import { FieldComponents } from './fields/FieldAdapters';
import { validateField } from '../validation/form-schemas';
import { extractScoringInputs, calculateAllScores } from '../scoring/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/logger';
import { isInfoBoxMetadata, parseValidationMetadata } from './json-utils';
import { AnswerStatusDetail } from '@/lib/technology/types';
import { AlertTriangle } from 'lucide-react';

const QUESTION_REVISIONS_ENABLED = (() => {
  const raw = (process.env.NEXT_PUBLIC_FEATURE_QUESTION_REVISIONS ?? process.env.FEATURE_QUESTION_REVISIONS ?? 'off').toString().toLowerCase();
  return raw === 'on' || raw === 'true' || raw === '1';
})();

// Form state reducer
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_TEMPLATE':
      return {
        ...state,
        template: action.payload,
        responses: state.responses,        // ✅ PRESERVE existing data
        repeatGroups: state.repeatGroups, // ✅ PRESERVE existing data
        currentSection: state.currentSection, // ✅ PRESERVE navigation state
        errors: state.errors,              // ✅ PRESERVE validation state
        calculatedScores: state.calculatedScores, // ✅ PRESERVE calculated scores
        answerMetadata: state.answerMetadata,
      };

    case 'SET_RESPONSE': {
      const nextAnswerMetadata = { ...state.answerMetadata };
      if (nextAnswerMetadata[action.payload.questionKey]) {
        delete nextAnswerMetadata[action.payload.questionKey];
      }
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.questionKey]: action.payload.value
        },
        answerMetadata: nextAnswerMetadata,
        isDirty: true
      };
    }

    case 'SET_REPEAT_GROUP': {
      const nextGroupMetadata = { ...state.answerMetadata };
      if (nextGroupMetadata[action.payload.questionKey]) {
        delete nextGroupMetadata[action.payload.questionKey];
      }
      return {
        ...state,
        repeatGroups: {
          ...state.repeatGroups,
          [action.payload.questionKey]: action.payload.data
        },
        answerMetadata: nextGroupMetadata,
        isDirty: true
      };
    }

    case 'SET_CURRENT_SECTION':
      return {
        ...state,
        currentSection: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.questionKey]: action.payload.error
        }
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {}
      };

    case 'SET_CALCULATED_SCORES':
      return {
        ...state,
        calculatedScores: action.payload
      };

    case 'HYDRATE_INITIAL_DATA':
      return {
        ...state,
        responses: action.payload.responses ?? {},
        repeatGroups: action.payload.repeatGroups ?? {},
        isDirty: false,
        errors: {},
        answerMetadata: action.payload.answerMetadata ?? {},
      };

    case 'RESET_FORM':
      return {
        template: null,
        responses: {},
        repeatGroups: {},
        currentSection: 0,
        isLoading: false,
        isDirty: false,
        errors: {},
        calculatedScores: null,
        answerMetadata: {},
      };

    default:
      return state;
  }
}

// Form context
const FormEngineContext = createContext<FormContext | null>(null);

// Hook to use form context
function useFormEngine(): FormContext {
  const context = useContext(FormEngineContext);
  if (!context) {
    throw new Error('useFormEngine must be used within a FormEngineProvider');
  }
  return context;
}

// Form provider component
interface FormEngineProviderProps {
  children: React.ReactNode;
  template: FormTemplateWithSections;
  onSubmit?: (data: {
    responses: FormResponse;
    repeatGroups: RepeatableGroupData;
    calculatedScores: CalculatedScores | null;
  }) => Promise<void>;
  onSaveDraft?: (data: {
    responses: FormResponse;
    repeatGroups: RepeatableGroupData;
    calculatedScores: CalculatedScores | null;
  }, options?: { silent?: boolean }) => Promise<void>;
  initialData?: {
    responses?: FormResponse;
    repeatGroups?: RepeatableGroupData;
    answerMetadata?: Record<string, AnswerStatusDetail>;
  };
}

function FormEngineProvider({
  children,
  template,
  onSubmit,
  onSaveDraft,
  initialData
}: FormEngineProviderProps) {
  const initialState: FormState = {
    template: null,
    responses: initialData?.responses || {},
    repeatGroups: initialData?.repeatGroups || {},
    currentSection: 0,
    isLoading: false,
    isDirty: false,
    errors: {},
    calculatedScores: null,
    answerMetadata: initialData?.answerMetadata || {},
  };

  const [state, dispatch] = useReducer(formReducer, initialState);
  const previousInitialData = useRef<FormEngineProviderProps['initialData']>(initialData);
  // Track a stable digest of initialData to avoid re-hydration unless contents change
  const initialDataDigestRef = useRef<string | null>(
    initialData
      ? JSON.stringify({
          responses: initialData.responses ?? {},
          repeatGroups: initialData.repeatGroups ?? {},
          answerMetadata: initialData.answerMetadata ?? {},
        })
      : null
  );

  // Initialize template
  useEffect(() => {
    if (template) {
      dispatch({ type: 'SET_TEMPLATE', payload: template });
    }
  }, [template]);

  // Hydrate with initial data only when the serialized contents change
  useEffect(() => {
    if (!initialData) {
      return; // Do not clear existing user input when initialData disappears
    }

    const newDigest = JSON.stringify({
      responses: initialData.responses ?? {},
      repeatGroups: initialData.repeatGroups ?? {},
      answerMetadata: initialData.answerMetadata ?? {},
    });

    const contentsChanged = newDigest !== initialDataDigestRef.current;
    if (contentsChanged) {
      initialDataDigestRef.current = newDigest;
      previousInitialData.current = initialData;
      dispatch({
        type: 'HYDRATE_INITIAL_DATA',
        payload: {
          responses: initialData.responses ?? {},
          repeatGroups: initialData.repeatGroups ?? {},
          answerMetadata: initialData.answerMetadata ?? {},
        },
      });
    }
  }, [initialData]);

  // Auto-calculate scores when responses change
  useEffect(() => {
    if (state.responses && Object.keys(state.responses).length > 0) {
      try {
        const scoringInputs = extractScoringInputs(state.responses);
        const calculatedScores = calculateAllScores(scoringInputs);
        dispatch({ type: 'SET_CALCULATED_SCORES', payload: calculatedScores });
      } catch (error) {
        logger.warn('Error calculating scores', error);
      }
    }
  }, [state.responses]);

  // Context methods
  const setResponse = (questionKey: string, value: string | number | boolean | string[] | Record<string, unknown>) => {
    dispatch({ type: 'SET_RESPONSE', payload: { questionKey, value } });

    // Clear any existing error for this field
    if (state.errors[questionKey]) {
      dispatch({ type: 'SET_ERROR', payload: { questionKey, error: '' } });
    }
  };

  const setRepeatGroupData = (questionKey: string, data: Record<string, unknown>[]) => {
    dispatch({ type: 'SET_REPEAT_GROUP', payload: { questionKey, data } });
  };

  const setError = (questionKey: string, error: string) => {
    dispatch({ type: 'SET_ERROR', payload: { questionKey, error } });
  };

  const nextSection = () => {
    if (state.template && state.currentSection < state.template.sections.length - 1) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: state.currentSection + 1 });
    }
  };

  const previousSection = () => {
    if (state.currentSection > 0) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: state.currentSection - 1 });
    }
  };

  const submitForm = async () => {
    if (!onSubmit) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await onSubmit({
        responses: state.responses,
        repeatGroups: state.repeatGroups,
        calculatedScores: state.calculatedScores
      });
    } catch (error) {
      logger.error('Form submission error', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveDraft = async (options?: { silent?: boolean }) => {
    if (!onSaveDraft) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await onSaveDraft({
        responses: state.responses,
        repeatGroups: state.repeatGroups,
        calculatedScores: state.calculatedScores
      }, options);
    } catch (error) {
      logger.error('Draft save error', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const contextValue: FormContext = {
    template: state.template!,
    responses: state.responses,
    repeatGroups: state.repeatGroups,
    currentSection: state.currentSection,
    isLoading: state.isLoading,
    calculatedScores: state.calculatedScores,
    answerMetadata: state.answerMetadata,
    errors: state.errors,
    setResponse,
    setRepeatGroupData,
    setError,
    nextSection,
    previousSection,
    submitForm,
    saveDraft
  };

  return (
    <FormEngineContext.Provider value={contextValue}>
      {children}
    </FormEngineContext.Provider>
  );
}

// Dynamic question renderer component
interface DynamicQuestionProps {
  question: FormQuestionWithDetails;
  className?: string;
}

function DynamicQuestion({ question, className = '' }: DynamicQuestionProps) {
  const { responses, repeatGroups, setResponse, setRepeatGroupData, setError, errors, answerMetadata } = useFormEngine();

  // ✅ ADD debounced validation to reduce validation calls
  const validationTimeout = useRef<NodeJS.Timeout | null>(null);

  const debouncedValidation = useCallback((
    questionKey: string,
    fieldType: FieldType,
    value: string | number | boolean | string[] | Record<string, unknown>,
    isRequired: boolean,
    validation: ValidationConfig | null
  ) => {
    // Clear existing timeout
    if (validationTimeout.current) {
      clearTimeout(validationTimeout.current);
    }

    // Set new timeout for validation
    validationTimeout.current = setTimeout(() => {
      const validationResult = validateField(questionKey, fieldType, value, isRequired, validation || undefined);

      if (!validationResult.isValid && validationResult.error) {
        setError(questionKey, validationResult.error);
      } else {
        if (errors[questionKey]) {
          setError(questionKey, '');
        }
      }
    }, 300); // ✅ 300ms debounce for validation
  }, [setError, errors]);

  // Check if question should be visible
  const conditionalConfig = parseConditionalConfig(question.conditional);
  const isVisible = shouldShowField(conditionalConfig, responses);

  if (!isVisible) {
    return null;
  }

  // Check if this is an info box
  const validationMetadata = parseValidationMetadata(question.validation);
  const isInfoBox = isInfoBoxMetadata(validationMetadata);

  // Debug logging for Key Alignment Areas
  if (question.dictionaryKey === 'triage.missionAlignmentInfo') {
    logger.info('Key alignment debug', {
      dictionaryKey: question.dictionaryKey,
      label: question.label,
      validation: question.validation,
      isInfoBox,
      type: question.type,
      conditional: question.conditional,
      conditionalConfig: conditionalConfig,
      isVisible: isVisible
    });
  }

  // Check if question should be required
  const isRequired = shouldRequireField(conditionalConfig, question.isRequired, responses);
  // Use dictionaryKey as primary identifier (required field)
  const questionKey = question.dictionaryKey;
  const metadata = answerMetadata[questionKey];
  const isStale = QUESTION_REVISIONS_ENABLED && metadata?.status === 'STALE';
  let staleTimestamp: string | null = null;
  if (metadata?.answeredAt) {
    const parsed = new Date(metadata.answeredAt);
    if (!Number.isNaN(parsed.getTime())) {
      staleTimestamp = parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }

  // Get field value - handle repeatable groups separately
  const usesRepeatGroup = question.type === FieldType.REPEATABLE_GROUP || question.type === FieldType.DATA_TABLE_SELECTOR;

  const value = usesRepeatGroup
    ? repeatGroups[questionKey] ?? []
    : responses[questionKey] ?? getDefaultValue(question.type);

  // Handle value changes - route arrays to repeatGroups, others to responses
  const handleChange = (newValue: string | number | boolean | string[] | Record<string, unknown> | Record<string, unknown>[]) => {
    // ✅ UPDATE state immediately for responsive UI
    if (usesRepeatGroup && Array.isArray(newValue)) {
      setRepeatGroupData(questionKey, newValue as Record<string, unknown>[]);
    } else {
      setResponse(questionKey, newValue as string | number | boolean | string[] | Record<string, unknown>);
    }

    // ✅ USE debounced validation to reduce validation calls
    debouncedValidation(
      questionKey,
      question.type,
      newValue as string | number | boolean | string[] | Record<string, unknown>,
      isRequired,
      question.validation as ValidationConfig | null
    );
  };

  // For info boxes, render without Card wrapper
  if (isInfoBox) {
    const FieldComponent = FieldComponents[question.type];
    if (!FieldComponent) {
      return null;
    }

    return (
      <div className={className} data-dictionary-key={questionKey}>
        <FieldComponent
          question={question}
          value={value as string | number | boolean | string[] | Record<string, unknown> | Record<string, unknown>[]}
          onChange={handleChange}
          error={errors[questionKey]}
          disabled={false}
        />
      </div>
    );
  }

  return (
    <Card
      data-dictionary-key={questionKey}
      className={`bg-white border-0 [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)] rounded-2xl ${className}`}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={questionKey} className="text-base font-medium text-[#353535]">
              {question.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.helpText && (
              <p className="text-sm text-[#6b7280]">{question.helpText}</p>
            )}
          </div>

          {isStale && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Answer needs review</p>
                <p>
                  This response was saved before the latest question update
                  {staleTimestamp ? ` on ${staleTimestamp}` : ''}. Please confirm it is still accurate before submitting.
                </p>
              </div>
            </div>
          )}

          {/* Dynamic field rendering using adapters */}
          {(() => {
            const FieldComponent = FieldComponents[question.type];
            if (!FieldComponent) {
              return (
                <div className="p-4 border rounded bg-red-50">
                  <p className="text-sm text-red-600">
                    Unsupported field type: {question.type}
                  </p>
                </div>
              );
            }

            return (
              <FieldComponent
                question={question}
                value={value as string | number | boolean | string[] | Record<string, unknown> | Record<string, unknown>[]}
                onChange={handleChange}
                error={errors[questionKey]}
                disabled={false}
              />
            );
          })()}

          {errors[questionKey] && (
            <p className="text-sm text-red-500">{errors[questionKey]}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Dynamic section renderer component
interface DynamicSectionProps {
  section: FormSectionWithQuestions;
  className?: string;
}

function DynamicSection({ section, className = '' }: DynamicSectionProps) {
  return (
    <Card className={`bg-[#e0e5ec] rounded-3xl shadow-none border-0 ${className}`}>
      <CardHeader>
        <CardTitle className="text-2xl text-[#353535]">{section.title}</CardTitle>
        {section.description && (
          <p className="text-sm text-[#6b7280]">{section.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {section.questions
            .sort((a, b) => a.order - b.order)
            .map((question) => (
              <DynamicQuestion
                key={question.id}
                question={question}
                className=""
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main dynamic form renderer component
interface DynamicFormRendererProps {
  className?: string;
}

function DynamicFormRenderer({ className = '' }: DynamicFormRendererProps) {
  const { template, currentSection } = useFormEngine();

  if (!template) {
    return <div>Loading form template...</div>;
  }

  const currentSectionData = template.sections
    .sort((a, b) => a.order - b.order)[currentSection];

  if (!currentSectionData) {
    return <div>Section not found</div>;
  }

  return (
    <div className={className}>
      <DynamicSection section={currentSectionData} />
    </div>
  );
}

// Export all components and hooks
export {
  FormEngineProvider,
  DynamicFormRenderer,
  DynamicSection,
  DynamicQuestion,
  useFormEngine
};
