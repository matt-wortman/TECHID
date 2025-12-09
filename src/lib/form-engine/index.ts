// Main form engine exports
export {
  FormEngineProvider,
  DynamicFormRenderer,
  DynamicSection,
  DynamicQuestion,
  useFormEngine
} from './renderer';

// Type exports
export type {
  FormTemplateWithSections,
  FormSectionWithQuestions,
  FormQuestionWithDetails,
  FormResponse,
  RepeatableGroupData,
  FormSubmissionData,
  ConditionalRule,
  ConditionalConfig,
  ValidationRule,
  ValidationConfig,
  FieldProps,
  ScoringFieldProps,
  RepeatableGroupProps,
  FormContext,
  FormState,
  FormAction,
  FieldTypeMapping,
  ScoreConfig,
  CalculatedScores
} from './types';

// Utility exports
export {
  evaluateRule,
  evaluateConditional,
  shouldShowField,
  shouldRequireField,
  ConditionalHelpers,
  parseConditionalConfig
} from './conditional-logic';

export {
  validateRule,
  validateField,
  validateQuestion,
  validateFormSubmission,
  ValidationHelpers,
  parseValidationConfig,
  createValidationSchema
} from './validation';

export {
  fieldTypeComponentMap,
  getFieldComponentName,
  isMultiValueField,
  isNumericField,
  getDefaultValue,
  validateFieldType
} from './field-mappings-simple';

// Re-export FieldType enum
export { FieldType } from './types';