import { FieldType, FormQuestionWithDetails, FormSectionWithQuestions, FormTemplateWithSections } from './types';

let templateCount = 0;
let sectionCount = 0;
let questionCount = 0;

function buildQuestion(overrides: Partial<FormQuestionWithDetails> = {}): FormQuestionWithDetails {
  const count = ++questionCount;
  const sectionId = overrides.sectionId ?? `section-${sectionCount || 1}`;
  const dictionaryKey = overrides.dictionaryKey ?? `test.q${count}`;

  return {
    id: overrides.id ?? `question-${count}`,
    sectionId,
    label: overrides.label ?? `Question ${count}`,
    type: overrides.type ?? FieldType.SHORT_TEXT,
    helpText: overrides.helpText ?? null,
    placeholder: overrides.placeholder ?? '',
    validation: overrides.validation ?? null,
    conditional: overrides.conditional ?? null,
    repeatableConfig: overrides.repeatableConfig ?? null,
    order: overrides.order ?? count,
    isRequired: overrides.isRequired ?? false,
    dictionaryKey,
    options: overrides.options ?? [],
    scoringConfig: overrides.scoringConfig ?? null,
    dictionary: overrides.dictionary ?? null,
  };
}

function buildSection(
  overrides: Partial<FormSectionWithQuestions> & { questions?: FormQuestionWithDetails[] } = {}
): FormSectionWithQuestions {
  const count = ++sectionCount;
  const templateId = overrides.templateId ?? `template-${templateCount || 1}`;
  const sectionId = overrides.id ?? `section-${count}`;

  const questions = overrides.questions
    ? overrides.questions.map((question) => ({ ...question, sectionId: question.sectionId ?? sectionId }))
    : [buildQuestion({ sectionId })];

  return {
    id: sectionId,
    templateId,
    code: overrides.code ?? `S${count}`,
    title: overrides.title ?? `Section ${count}`,
    description: overrides.description ?? null,
    order: overrides.order ?? count - 1,
    isRequired: overrides.isRequired ?? true,
    questions,
  };
}

function buildTemplate(
  overrides: Partial<FormTemplateWithSections> & { sections?: FormSectionWithQuestions[] } = {}
): FormTemplateWithSections {
  const templateId = overrides.id ?? `template-${++templateCount}`;
  const sections = overrides.sections
    ? overrides.sections.map((section, index) => ({
        ...section,
        templateId: section.templateId ?? templateId,
        order: section.order ?? index,
      }))
    : [buildSection({ templateId })];

  return {
    id: templateId,
    name: overrides.name ?? 'Test Template',
    version: overrides.version ?? '1',
    description: overrides.description ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    sections,
  };
}

export { buildQuestion, buildSection, buildTemplate };
