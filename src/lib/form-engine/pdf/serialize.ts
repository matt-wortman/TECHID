import { FieldType, SubmissionStatus } from '@prisma/client';
import {
  FormTemplateWithSections,
  FormResponse,
  RepeatableGroupData,
  FormQuestionWithDetails,
  FormSectionWithQuestions,
} from '../types';
import {
  PrintableFormData,
  PrintableImpactValueMatrix,
  PrintableQuestionAnswer,
  PrintableRepeatGroupRow,
  PrintableScoreRow,
  PrintableScoreSection,
  PrintableScoringMatrix,
  PrintableSection,
} from './types';
import { parseConditionalConfig } from '../conditional-logic';
import { shouldShowField } from '../conditional-logic';
import { parseValidationMetadata, isInfoBoxMetadata, parseRepeatableGroupConfig } from '../json-utils';
import {
  extractScoringInputs,
  calculateAllScores,
} from '@/lib/scoring/calculations';

export interface BuildPrintableFormParams {
  template: FormTemplateWithSections;
  responses?: FormResponse;
  repeatGroups?: RepeatableGroupData;
  calculatedScores?: Record<string, unknown> | null;
  status?: SubmissionStatus | 'BLANK' | 'IN_PROGRESS';
  submissionId?: string;
  submittedAt?: string | null;
  submittedBy?: string | null;
  techId?: string | null;
  notes?: string | null;
  exportedAt?: Date;
}

export function buildPrintableForm({
  template,
  responses = {},
  repeatGroups = {},
  calculatedScores,
  status = 'IN_PROGRESS',
  submissionId,
  submittedAt,
  submittedBy,
  techId,
  notes,
  exportedAt = new Date(),
}: BuildPrintableFormParams): PrintableFormData {
  const sections = template.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => buildPrintableSection(section, responses, repeatGroups))
    .filter((section) => section.questions.length > 0);

  const numericScores = normalizeScores(calculatedScores);

  const scoringMatrix = buildScoringMatrix(responses);
  const impactValueMatrix = buildImpactValueMatrix(responses);

  return {
    metadata: {
      templateName: template.name,
      templateVersion: template.version,
      templateDescription: template.description,
      exportedAt: exportedAt.toISOString(),
      statusLabel: deriveStatusLabel(status),
      submissionId,
      submittedAt,
      submittedBy,
      techId,
      notes,
    },
    sections,
    calculatedScores: numericScores ?? undefined,
    scoringMatrix,
    impactValueMatrix,
  };
}

function buildPrintableSection(
  section: FormSectionWithQuestions,
  responses: FormResponse,
  repeatGroups: RepeatableGroupData
): PrintableSection {
  const questions = section.questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((question) => buildPrintableQuestion(question, responses, repeatGroups))
    .filter((question): question is PrintableQuestionAnswer => question !== null);

  return {
    id: section.id,
    title: section.title,
    description: section.description,
    questions,
  };
}

function buildPrintableQuestion(
  question: FormQuestionWithDetails,
  responses: FormResponse,
  repeatGroups: RepeatableGroupData
): PrintableQuestionAnswer | null {
  const conditional = parseConditionalConfig(question.conditional);
  const isVisible = shouldShowField(conditional, responses);

  const validationMetadata = parseValidationMetadata(question.validation);
  if (isInfoBoxMetadata(validationMetadata)) {
    return null;
  }

  let repeatGroupRows: PrintableRepeatGroupRow[] | undefined;
  let answerText: string | undefined;

  // Use dictionaryKey for data lookups (now required)
  const questionKey = question.dictionaryKey;

  if (question.type === FieldType.REPEATABLE_GROUP) {
    repeatGroupRows = buildRepeatGroupRows(questionKey, repeatGroups);
  } else if (question.type === FieldType.DATA_TABLE_SELECTOR) {
    repeatGroupRows = buildSelectorRows(question, questionKey, repeatGroups);
  } else {
    answerText = formatAnswer(question, responses[questionKey]);
  }

  const hasContent = repeatGroupRows
    ? (repeatGroupRows.length ?? 0) > 0
    : Boolean(answerText && answerText.trim().length > 0);

  if (!isVisible && !hasContent) {
    return null;
  }

  return {
    questionKey: question.dictionaryKey,
    label: question.label,
    helpText: question.helpText,
    isRequired: question.isRequired,
    type: question.type,
    answerText: repeatGroupRows ? undefined : answerText || '—',
    repeatGroupRows,
  };
}

function buildRepeatGroupRows(questionKey: string, repeatGroups: RepeatableGroupData): PrintableRepeatGroupRow[] | undefined {
  const rows = repeatGroups[questionKey];
  if (!Array.isArray(rows) || rows.length === 0) {
    return undefined;
  }

  return rows.map((row, index) => ({
    index: index + 1,
    values: Object.entries(row ?? {}).map(([key, value]) => ({
      field: key,
      value: formatStructuredValue(value),
    })),
  }));
}

function buildSelectorRows(
  question: FormQuestionWithDetails,
  questionKey: string,
  repeatGroups: RepeatableGroupData
): PrintableRepeatGroupRow[] | undefined {
  const rows = repeatGroups[questionKey];
  if (!Array.isArray(rows) || rows.length === 0) {
    return undefined;
  }

  const config = parseRepeatableGroupConfig(question.repeatableConfig);
  const selectorKey = config?.selectorColumnKey || 'include';
  const noteColumn = config?.columns.find((column) => column.key !== selectorKey);
  const noteKey = noteColumn?.key || 'benefit';
  const rowLabelHeader = config?.rowLabel ?? question.label;
  const rowsMap = new Map(config?.rows?.map((row) => [row.id, row.label]));

  const selectedRows = rows.filter((row) => Boolean((row as Record<string, unknown>)[selectorKey]));
  if (selectedRows.length === 0) {
    return undefined;
  }

  return selectedRows.map((row, index) => {
    const data = row as Record<string, unknown>;
    const identifier = (data.__rowId as string) || (data.rowId as string);
    const stakeholderLabel =
      typeof data.rowLabel === 'string'
        ? data.rowLabel
        : (identifier && rowsMap.get(identifier)) || identifier || rowLabelHeader;
    const benefit = typeof data[noteKey] === 'string' ? data[noteKey] : '';

    return {
      index: index + 1,
      values: [
        { field: rowLabelHeader, value: formatStructuredValue(stakeholderLabel) },
        { field: noteColumn?.label ?? 'Notes', value: formatStructuredValue(benefit) },
      ],
    };
  });
}

function formatAnswer(question: FormQuestionWithDetails, value: FormResponse[string]): string {
  if (value === undefined || value === null) {
    return '';
  }

  switch (question.type) {
    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX_GROUP: {
      const values = Array.isArray(value) ? value : [value];
      const labels = values
        .map((current) => resolveOptionLabel(question, current))
        .filter((label): label is string => Boolean(label));
      if (labels.length > 0) {
        return labels.join(', ');
      }
      return values.map((item) => formatStructuredValue(item)).join(', ');
    }
    case FieldType.SINGLE_SELECT: {
      const label = resolveOptionLabel(question, value);
      return label ?? formatStructuredValue(value);
    }
    case FieldType.SCORING_MATRIX:
    case FieldType.SCORING_0_3:
      return formatStructuredValue(value);
    default:
      return formatStructuredValue(value);
  }
}

function resolveOptionLabel(question: FormQuestionWithDetails, value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return question.options.find((option) => option.value === value)?.label;
}

function formatStructuredValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatStructuredValue(item))
      .filter((item) => item.length > 0)
      .join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${formatStructuredValue(entryValue)}`)
      .join('\n');
  }

  return '';
}

function deriveStatusLabel(status: SubmissionStatus | 'BLANK' | 'IN_PROGRESS'): string {
  switch (status) {
    case SubmissionStatus.DRAFT:
      return 'Draft';
    case SubmissionStatus.SUBMITTED:
      return 'Submitted';
    case SubmissionStatus.REVIEWED:
      return 'Reviewed';
    case SubmissionStatus.ARCHIVED:
      return 'Archived';
    case 'BLANK':
      return 'Blank Form';
    default:
      return 'In Progress';
  }
}

function normalizeScores(scores?: Record<string, unknown> | null): Record<string, number> | null {
  if (!scores || typeof scores !== 'object') {
    return null;
  }

  const entries = Object.entries(scores)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([key, value]) => [key, Number(value) as number]);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function buildScoringMatrix(responses: FormResponse): PrintableScoringMatrix | undefined {
  const inputs = extractScoringInputs(responses);
  const calculated = calculateAllScores(inputs);

  const formatScore = (value: number) => clampScore(value).toFixed(2);
  const weight = '50%';
  const weightMultiplier = 0.5;

  const impactRows: PrintableScoreRow[] = [
    {
      type: 'criterion',
      label: 'Mission Alignment',
      score: formatScore(inputs.missionAlignmentScore),
      weight,
      total: (clampScore(inputs.missionAlignmentScore) * weightMultiplier).toFixed(2),
      category: 'IMPACT',
    },
    {
      type: 'criterion',
      label: 'Unmet Need',
      score: formatScore(inputs.unmetNeedScore),
      weight,
      total: (clampScore(inputs.unmetNeedScore) * weightMultiplier).toFixed(2),
      category: 'IMPACT',
    },
  ];

  const valueRows: PrintableScoreRow[] = [
    {
      type: 'criterion',
      label: 'IP Strength and Protectability',
      score: formatScore(inputs.ipStrengthScore),
      weight,
      total: (clampScore(inputs.ipStrengthScore) * weightMultiplier).toFixed(2),
      category: 'VALUE',
    },
    {
      type: 'criterion',
      label: 'Market',
      score: formatScore(calculated.marketScore),
      weight,
      total: (clampScore(calculated.marketScore) * weightMultiplier).toFixed(2),
      category: 'VALUE',
    },
  ];

  const marketSubCriteria: PrintableScoreRow[] = [
    {
      type: 'subcriterion',
      label: 'Market Size – Revenue (TAM)',
      score: formatScore(inputs.marketSizeScore),
      icon: 'bullet',
    },
    {
      type: 'subcriterion',
      label: 'Patient Population or Procedural Volume',
      score: formatScore(inputs.patientPopulationScore),
      icon: 'bullet',
    },
    {
      type: 'subcriterion',
      label: '# of Direct/Indirect Competitors',
      score: formatScore(inputs.competitorsScore),
      icon: 'bullet',
    },
  ];

  const impactSection: PrintableScoreSection = {
    key: 'IMPACT',
    title: 'IMPACT',
    accentColor: '#dbeafe',
    headerTextColor: '#1d4ed8',
    rowBackground: '#eff6ff',
    rows: impactRows,
    summaryLabel: 'Impact Score',
    summaryValue: formatScore(calculated.impactScore),
  };

  const valueSection: PrintableScoreSection = {
    key: 'VALUE',
    title: 'VALUE',
    accentColor: '#dcfce7',
    headerTextColor: '#047857',
    rowBackground: '#ecfdf5',
    rows: valueRows,
    summaryLabel: 'Value Score',
    summaryValue: formatScore(calculated.valueScore),
  };

  return {
    sections: [impactSection, valueSection],
    marketSubCriteria,
    impactScore: formatScore(calculated.impactScore),
    valueScore: formatScore(calculated.valueScore),
    marketScore: formatScore(calculated.marketScore),
    overallScore: formatScore(calculated.overallScore),
  };
}

function buildImpactValueMatrix(responses: FormResponse): PrintableImpactValueMatrix | undefined {
  const inputs = extractScoringInputs(responses);
  const calculated = calculateAllScores(inputs);

  const impactRatio = clampScore(calculated.impactScore) / 3;
  const valueRatio = clampScore(calculated.valueScore) / 3;

  return {
    impactScore: calculated.impactScore,
    valueScore: calculated.valueScore,
    recommendation: calculated.recommendation,
    recommendationText: calculated.recommendationText,
    dotPosition: {
      x: Number.isFinite(impactRatio) ? Math.min(Math.max(impactRatio, 0), 1) : 0,
      y: Number.isFinite(valueRatio) ? Math.min(Math.max(valueRatio, 0), 1) : 0,
    },
  };
}

function clampScore(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 3) return 3;
  return value;
}
