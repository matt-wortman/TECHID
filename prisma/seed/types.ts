import { FieldType } from '@prisma/client';

export type QuestionOptionSeed = {
  value: string;
  label: string;
  order: number;
};

export type QuestionValidationSeed = Record<string, unknown>;

export type QuestionConditionalSeed = {
  rules?: Array<Record<string, unknown>>;
  logic?: string;
  showIf?: Array<Record<string, unknown>>;
} & Record<string, unknown>;

export type QuestionScoringCriteriaSeed = Record<string, unknown>;

export type QuestionScoringConfigSeed = {
  minScore: number;
  maxScore: number;
  weight: number;
  criteria: QuestionScoringCriteriaSeed;
};

export type FormQuestionSeed = {
  dictionaryKey: string;
  label: string;
  type: FieldType;
  helpText?: string;
  placeholder?: string;
  order: number;
  isRequired: boolean;
  validation?: QuestionValidationSeed;
  conditional?: QuestionConditionalSeed;
  options?: QuestionOptionSeed[];
  scoringConfig?: QuestionScoringConfigSeed;
  repeatableConfig?: Record<string, unknown>;
};

export type FormSectionSeed = {
  code: string;
  title: string;
  description?: string;
  order: number;
  isRequired: boolean;
  questions: FormQuestionSeed[];
};

export type FormTemplateSeed = {
  name: string;
  version: string;
  description?: string;
  isActive: boolean;
  sections: FormSectionSeed[];
};
