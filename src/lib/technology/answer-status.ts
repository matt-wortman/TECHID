import { FormQuestionWithDetails } from '@/lib/form-engine/types';
import {
  AnswerSource,
  AnswerStatus,
  AnswerStatusDetail,
  VersionedAnswer,
} from './types';

export type VersionedAnswerMap = Record<string, VersionedAnswer>;

export function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return false;
}

export function normalizeVersionedAnswer(
  input: unknown,
  defaultSource?: AnswerSource
): VersionedAnswer | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const revisionValue = record.questionRevisionId;
  const questionRevisionId =
    typeof revisionValue === 'string'
      ? revisionValue
      : revisionValue === null
      ? null
      : undefined;

  const answeredAtRaw = record.answeredAt;
  const answeredAt =
    typeof answeredAtRaw === 'string' ? answeredAtRaw : null;

  const sourceCandidate = record.source;
  const source =
    typeof sourceCandidate === 'string'
      ? (sourceCandidate as AnswerSource)
      : defaultSource;

  return {
    value: record.value,
    questionRevisionId,
    answeredAt,
    source,
  };
}

export function parseVersionedAnswerMap(
  input: unknown,
  defaultSource: AnswerSource
): VersionedAnswerMap {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const entries = input as Record<string, unknown>;
  const result: VersionedAnswerMap = {};

  for (const [key, value] of Object.entries(entries)) {
    const normalized = normalizeVersionedAnswer(value, defaultSource);
    if (normalized) {
      result[key] = normalized;
    }
  }

  return result;
}

export function mergeVersionedAnswerMaps(
  base: VersionedAnswerMap,
  updates?: Record<string, VersionedAnswer | null>
): VersionedAnswerMap {
  if (!updates || Object.keys(updates).length === 0) {
    return base;
  }

  const next: VersionedAnswerMap = { ...base };

  for (const [key, update] of Object.entries(updates)) {
    if (update === null) {
      delete next[key];
      continue;
    }

    next[key] = {
      ...update,
      source: update.source ?? base[key]?.source,
    };
  }

  return next;
}

export function getAnswerStatus(
  question: FormQuestionWithDetails,
  answer: VersionedAnswer | null | undefined
): AnswerStatusDetail {
  const dictionaryKey = question.dictionary?.key;
  const currentRevisionId = question.dictionary?.currentRevisionId ?? null;

  if (!answer || !hasMeaningfulValue(answer.value)) {
    return {
      status: 'MISSING',
      dictionaryKey,
      savedRevisionId: answer?.questionRevisionId ?? null,
      currentRevisionId,
      answeredAt: answer?.answeredAt ?? null,
      source: answer?.source,
    };
  }

  const savedRevisionId = answer.questionRevisionId ?? null;

  if (!currentRevisionId) {
    return {
      status: 'UNKNOWN',
      dictionaryKey,
      savedRevisionId,
      currentRevisionId: null,
      answeredAt: answer.answeredAt ?? null,
      source: answer.source,
    };
  }

  if (!savedRevisionId) {
    return {
      status: 'UNKNOWN',
      dictionaryKey,
      savedRevisionId: null,
      currentRevisionId,
      answeredAt: answer.answeredAt ?? null,
      source: answer.source,
    };
  }

  const status: AnswerStatus = savedRevisionId === currentRevisionId ? 'FRESH' : 'STALE';

  return {
    status,
    dictionaryKey,
    savedRevisionId,
    currentRevisionId,
    answeredAt: answer.answeredAt ?? null,
    source: answer.source,
  };
}
