import { FieldType } from '@prisma/client';

export interface PrintableFormMetadata {
  templateName: string;
  templateVersion: string;
  templateDescription?: string | null;
  exportedAt: string;
  statusLabel: string;
  submissionId?: string;
  submittedAt?: string | null;
  submittedBy?: string | null;
  techId?: string | null;
  notes?: string | null;
}

export interface PrintableRepeatGroupRowValue {
  field: string;
  value: string;
}

export interface PrintableRepeatGroupRow {
  index: number;
  values: PrintableRepeatGroupRowValue[];
}

export interface PrintableQuestionAnswer {
  questionKey: string;
  label: string;
  helpText?: string | null;
  isRequired: boolean;
  type: FieldType;
  answerText?: string;
  repeatGroupRows?: PrintableRepeatGroupRow[];
}

export interface PrintableSection {
  id: string;
  title: string;
  description?: string | null;
  questions: PrintableQuestionAnswer[];
}

export interface PrintableScoreRow {
  type: 'header' | 'criterion' | 'subcriterion' | 'summary';
  label: string;
  score?: string;
  weight?: string;
  total?: string;
  category?: 'IMPACT' | 'VALUE';
  icon?: 'impact' | 'value' | 'bullet';
}

export interface PrintableScoreSection {
  key: 'IMPACT' | 'VALUE';
  title: string;
  accentColor: string; // e.g. header background
  headerTextColor: string;
  rowBackground: string;
  rows: PrintableScoreRow[];
  summaryLabel: string;
  summaryValue: string;
}

export interface PrintableScoringMatrix {
  sections: PrintableScoreSection[];
  marketSubCriteria: PrintableScoreRow[];
  impactScore: string;
  valueScore: string;
  overallScore: string;
  marketScore: string;
}

export interface PrintableImpactValueMatrix {
  impactScore: number;
  valueScore: number;
  recommendation: string;
  recommendationText: string;
  dotPosition: {
    x: number; // 0-1 range relative to chart width
    y: number; // 0-1 range relative to chart height (0 bottom, 1 top)
  };
}

export interface PrintableFormData {
  metadata: PrintableFormMetadata;
  sections: PrintableSection[];
  calculatedScores?: Record<string, number>;
  scoringMatrix?: PrintableScoringMatrix;
  impactValueMatrix?: PrintableImpactValueMatrix;
}
