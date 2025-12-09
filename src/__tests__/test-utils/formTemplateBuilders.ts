import { FieldType } from '@prisma/client';
import {
  FormQuestionWithDetails,
  FormSectionWithQuestions,
  FormTemplateWithSections,
} from '@/lib/form-engine/types';

export function createMockQuestion(
  overrides: Partial<FormQuestionWithDetails> = {}
): FormQuestionWithDetails {
  const sectionId = overrides.sectionId ?? 'section-1';
  const id = overrides.id ?? 'question-1';
  // dictionaryKey is now required - generate from id if not provided
  const dictionaryKey = overrides.dictionaryKey ?? `test.${id}`;

  return {
    id,
    sectionId,
    label: overrides.label ?? 'Question Label',
    type: overrides.type ?? FieldType.SHORT_TEXT,
    helpText: overrides.helpText ?? null,
    placeholder: overrides.placeholder ?? null,
    validation: overrides.validation ?? null,
    conditional: overrides.conditional ?? null,
    order: overrides.order ?? 0,
    isRequired: overrides.isRequired ?? false,
    repeatableConfig: overrides.repeatableConfig ?? null,
    options: overrides.options ?? [],
    scoringConfig: overrides.scoringConfig ?? null,
    dictionaryKey,
    dictionary: overrides.dictionary ?? null,
  };
}

export function createMockSection(
  overrides: Partial<FormSectionWithQuestions> = {}
): FormSectionWithQuestions {
  const id = overrides.id ?? 'section-1';
  const templateId = overrides.templateId ?? 'template-1';

  return {
    id,
    templateId,
    code: overrides.code ?? `S${(overrides.order ?? 0) + 1}`,
    title: overrides.title ?? 'Section Title',
    description: overrides.description ?? null,
    order: overrides.order ?? 0,
    isRequired: overrides.isRequired ?? true,
    questions:
      overrides.questions?.map((question, index) => ({
        ...question,
        sectionId: question.sectionId ?? id,
        order: question.order ?? index,
      })) ?? [createMockQuestion({ sectionId: id })],
  };
}

export function createMockTemplate(
  overrides: Partial<FormTemplateWithSections> = {}
): FormTemplateWithSections {
  const id = overrides.id ?? 'template-1';

  const sections =
    overrides.sections?.map((section, index) =>
      createMockSection({
        ...section,
        templateId: section.templateId ?? id,
        order: section.order ?? index,
        code: section.code ?? `S${index + 1}`,
      })
    ) ?? [createMockSection({ templateId: id, code: 'S1', order: 0 })];

  return {
    id,
    name: overrides.name ?? 'Mock Template',
    version: overrides.version ?? '1.0.0',
    description: overrides.description ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    sections,
  };
}
