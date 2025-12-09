/**
 * @jest-environment node
 */
import { DataSource, FieldType } from '@prisma/client';
import { getAnswerStatus } from '@/lib/technology/answer-status';
import { VersionedAnswer } from '@/lib/technology/types';
import type { FormQuestionWithDetails } from '@/lib/form-engine/types';

function makeQuestion(overrides: Partial<FormQuestionWithDetails> = {}): FormQuestionWithDetails {
  const base: FormQuestionWithDetails = {
    id: 'q1',
    sectionId: 's1',
    label: 'Test Question',
    type: FieldType.SHORT_TEXT,
    helpText: null,
    placeholder: null,
    validation: null,
    conditional: null,
    repeatableConfig: null,
    order: 0,
    isRequired: false,
    dictionaryKey: 'tech.test',
    options: [],
    scoringConfig: null,
    dictionary: {
      id: 'dict1',
      key: 'tech.test',
      currentVersion: 1,
      currentRevisionId: 'rev-current',
      label: 'Test Question',
      helpText: null,
      options: null,
      validation: null,
      bindingPath: 'technology.testField',
      dataSource: DataSource.TECHNOLOGY,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1',
    },
  };

  return { ...base, ...overrides };
}

describe('getAnswerStatus', () => {
  it('returns MISSING when no answer is present', () => {
    const question = makeQuestion();
    const result = getAnswerStatus(question, null);

    expect(result.status).toBe('MISSING');
    expect(result.currentRevisionId).toBe('rev-current');
    expect(result.savedRevisionId).toBeNull();
  });

  it('returns UNKNOWN when answer lacks revision metadata', () => {
    const question = makeQuestion();
    const answer: VersionedAnswer = {
      value: 'Legacy value',
      questionRevisionId: undefined,
      answeredAt: '2025-10-29T14:00:00.000Z',
    };

    const result = getAnswerStatus(question, answer);

    expect(result.status).toBe('UNKNOWN');
    expect(result.savedRevisionId).toBeNull();
  });

  it('returns FRESH when revision id matches current', () => {
    const question = makeQuestion();
    const answer: VersionedAnswer = {
      value: 'Up-to-date',
      questionRevisionId: 'rev-current',
      answeredAt: '2025-10-30T09:15:00.000Z',
    };

    const result = getAnswerStatus(question, answer);

    expect(result.status).toBe('FRESH');
    expect(result.savedRevisionId).toBe('rev-current');
    expect(result.answeredAt).toBe('2025-10-30T09:15:00.000Z');
  });

  it('returns STALE when revision id differs', () => {
    const question = makeQuestion();
    const answer: VersionedAnswer = {
      value: 'Outdated',
      questionRevisionId: 'rev-old',
      answeredAt: '2025-10-01T12:00:00.000Z',
    };

    const result = getAnswerStatus(question, answer);

    expect(result.status).toBe('STALE');
    expect(result.savedRevisionId).toBe('rev-old');
    expect(result.currentRevisionId).toBe('rev-current');
  });
});
