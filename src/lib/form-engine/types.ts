import { FieldType, FormTemplate, FormSection, FormQuestion, QuestionOption, ScoringConfig, Prisma, QuestionDictionary } from '@prisma/client';
import { AnswerStatusDetail } from '@/lib/technology/types';

// Extended types with relationships for the form engine
export type FormTemplateWithSections = FormTemplate & {
  sections: FormSectionWithQuestions[];
};

export type FormSectionWithQuestions = FormSection & {
  questions: FormQuestionWithDetails[];
};

export type RepeatableFieldConfig = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox';
  required?: boolean;
  requiredWhenSelected?: boolean;
};

export interface RepeatablePredefinedRow {
  id: string;
  label: string;
  description?: string;
}

export type RepeatableGroupMode = 'user' | 'predefined';

export type RepeatableGroupConfig = {
  columns: RepeatableFieldConfig[];
  minRows?: number;
  maxRows?: number;
  mode?: RepeatableGroupMode;
  rowLabel?: string;
  rows?: RepeatablePredefinedRow[];
  selectorColumnKey?: string;
  requireOnSelect?: string[];
};

export type FormQuestionWithDetails = Omit<FormQuestion, 'repeatableConfig'> & {
  repeatableConfig: Prisma.JsonValue | null;
  options: QuestionOption[];
  scoringConfig: ScoringConfig | null;
  dictionary: QuestionDictionary | null;
};

// Form response types - keyed by dictionaryKey (e.g., 'triage.missionAlignmentScore')
export interface FormResponse {
  [questionKey: string]: string | number | boolean | string[] | Record<string, unknown>;
}

export interface RepeatableGroupData {
  [questionKey: string]: Array<Record<string, unknown>>;
}

export interface FormSubmissionData {
  templateId: string;
  submittedBy: string;
  responses: FormResponse;
  repeatGroups: RepeatableGroupData;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'ARCHIVED';
}

// Conditional logic types
export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'not_empty';
  value: string | number | boolean | null;
  action: 'show' | 'hide' | 'require' | 'optional';
}

export interface ConditionalConfig {
  rules: ConditionalRule[];
  logic: 'AND' | 'OR'; // How to combine multiple rules
}

// Validation types
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom' | 'email' | 'url' | 'number';
  value?: string | number;
  message: string;
}

export interface ValidationConfig {
  rules: ValidationRule[];
}

// Field rendering types
export interface FieldProps {
  question: FormQuestionWithDetails;
  value: string | number | boolean | string[] | Record<string, unknown> | Record<string, unknown>[];
  onChange: (value: string | number | boolean | string[] | Record<string, unknown> | Record<string, unknown>[]) => void;
  error?: string;
  disabled?: boolean;
}

export interface ScoringFieldProps extends FieldProps {
  onScoreChange?: (score: number) => void;
}

export interface RepeatableGroupProps extends FieldProps {
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, data: Record<string, unknown>) => void;
}

// Form renderer context
export interface FormContext {
  template: FormTemplateWithSections;
  responses: FormResponse;
  repeatGroups: RepeatableGroupData;
  currentSection: number;
  isLoading: boolean;
  calculatedScores: CalculatedScores | null;
  answerMetadata: Record<string, AnswerStatusDetail>;
  errors: { [questionKey: string]: string };
  setResponse: (questionKey: string, value: string | number | boolean | string[] | Record<string, unknown>) => void;
  setRepeatGroupData: (questionKey: string, data: Record<string, unknown>[]) => void;
  setError: (questionKey: string, error: string) => void;
  nextSection: () => void;
  previousSection: () => void;
  submitForm: () => Promise<void>;
  saveDraft: (options?: { silent?: boolean }) => Promise<void>;
}

// Component mapping
export type FieldComponent = React.ComponentType<FieldProps>;
export type ScoringComponent = React.ComponentType<ScoringFieldProps>;
export type RepeatableComponent = React.ComponentType<RepeatableGroupProps>;

export interface FieldTypeMapping {
  [FieldType.SHORT_TEXT]: FieldComponent;
  [FieldType.LONG_TEXT]: FieldComponent;
  [FieldType.INTEGER]: FieldComponent;
  [FieldType.SINGLE_SELECT]: FieldComponent;
  [FieldType.MULTI_SELECT]: FieldComponent;
  [FieldType.CHECKBOX_GROUP]: FieldComponent;
  [FieldType.DATE]: FieldComponent;
  [FieldType.REPEATABLE_GROUP]: RepeatableComponent;
  [FieldType.SCORING_0_3]: ScoringComponent;
  [FieldType.SCORING_MATRIX]: ScoringComponent;
}

// Scoring calculation types
export interface ScoreConfig {
  questionKey: string;
  weight: number;
  groupType: 'impact' | 'value' | 'market';
}

export interface CalculatedScores {
  impactScore: number;
  valueScore: number;
  marketScore: number;
  recommendation: string;
  recommendationText: string;
}

// Form state management
export interface FormState {
  template: FormTemplateWithSections | null;
  responses: FormResponse;
  repeatGroups: RepeatableGroupData;
  currentSection: number;
  isLoading: boolean;
  isDirty: boolean;
  errors: { [questionKey: string]: string };
  calculatedScores: CalculatedScores | null;
  answerMetadata: Record<string, AnswerStatusDetail>;
}

export type FormAction =
  | { type: 'SET_TEMPLATE'; payload: FormTemplateWithSections }
  | { type: 'SET_RESPONSE'; payload: { questionKey: string; value: string | number | boolean | string[] | Record<string, unknown> } }
  | { type: 'SET_REPEAT_GROUP'; payload: { questionKey: string; data: Record<string, unknown>[] } }
  | { type: 'SET_CURRENT_SECTION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { questionKey: string; error: string } }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_CALCULATED_SCORES'; payload: CalculatedScores }
  | { type: 'HYDRATE_INITIAL_DATA'; payload: { responses?: FormResponse; repeatGroups?: RepeatableGroupData; answerMetadata?: Record<string, AnswerStatusDetail> } }
  | { type: 'RESET_FORM' };

export { FieldType };
