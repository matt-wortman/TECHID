import { prisma } from '@/lib/prisma';
import {
  DataSource,
  FieldType,
  Prisma,
  Technology,
  TechnologyAnswer,
  TriageStage,
  ViabilityStage,
} from '@prisma/client';
import {
  FormTemplateWithSections,
  FormQuestionWithDetails,
} from '@/lib/form-engine/types';
import {
  TECHNOLOGY_BINDABLE_FIELDS,
  REQUIRED_TECH_FIELDS_FOR_CREATE,
  TRIAGE_STAGE_BINDABLE_FIELDS,
  VIABILITY_STAGE_BINDABLE_FIELDS,
} from './constants';
import {
  AnswerStatusDetail,
  VersionedAnswer,
  RowVersionSnapshot,
  TechnologyContext,
  OptimisticLockError,
} from '@/lib/technology/types';
import {
  getAnswerStatus,
  mergeVersionedAnswerMaps,
  parseVersionedAnswerMap,
  hasMeaningfulValue,
  VersionedAnswerMap,
} from './answer-status';

export interface BindingMetadata {
  questionId: string;
  dictionaryKey: string;
  bindingPath: string;
  dataSource: DataSource;
  dictionaryId?: string;
  currentRevisionId?: string | null;
  currentVersion?: number | null;
}

export interface TemplateHydrationResult {
  template: FormTemplateWithSections;
  bindingMetadata: Record<string, BindingMetadata>;
  initialResponses: Record<string, unknown>;
  initialRepeatGroups: Record<string, Record<string, unknown>[]>;
  answerMetadata: Record<string, AnswerStatusDetail>;
  technologyContext: TechnologyContext | null;
  rowVersions: RowVersionSnapshot;
}

export type TechnologyWithSupplements = Technology & {
  triageStage: TriageStage | null;
  viabilityStage: ViabilityStage | null;
};

const TEMPLATE_WITH_BINDINGS_INCLUDE = {
  sections: {
    orderBy: { order: 'asc' as const },
    include: {
      questions: {
        orderBy: { order: 'asc' as const },
        include: {
          options: { orderBy: { order: 'asc' as const } },
          scoringConfig: true,
          dictionary: true,
        },
      },
    },
  },
} satisfies Prisma.FormTemplateInclude;

interface LoadTemplateOptions {
  techId?: string;
}

export interface BindingWriteOptions {
  userId?: string;
  allowCreateWhenIncomplete?: boolean;
  expectedVersions?: RowVersionSnapshot;
}

/**
 * Load the active form template along with binding metadata and (optional) prefilled responses.
 */
export async function loadTemplateWithBindings(
  options: LoadTemplateOptions = {}
): Promise<TemplateHydrationResult> {
  const { techId } = options;

  const template = await prisma.formTemplate.findFirst({
    where: { isActive: true },
    include: TEMPLATE_WITH_BINDINGS_INCLUDE,
  });

  if (!template) {
    throw new Error('No active form template found');
  }

  const bindingMetadata = collectBindingMetadata(template);

  if (!techId) {
    return {
      template,
      bindingMetadata,
      initialResponses: {},
      initialRepeatGroups: {},
      answerMetadata: {},
      technologyContext: null,
      rowVersions: {},
    };
  }

  const technology = await prisma.technology.findUnique({
    where: { techId },
    include: {
      triageStage: true,
      viabilityStage: true,
    },
  });

  if (!technology) {
    return {
      template,
      bindingMetadata,
      initialResponses: {},
      initialRepeatGroups: {},
      answerMetadata: {},
      technologyContext: null,
      rowVersions: {},
    };
  }

  const technologyAnswers = await prisma.technologyAnswer.findMany({
    where: { technologyId: technology.id },
  });

  const { responses: initialResponses, repeatGroups: initialRepeatGroups, answerMetadata } =
    buildInitialValues(
      technology,
      template.sections.flatMap((section) => section.questions),
      technologyAnswers
    );

  return {
    template,
    bindingMetadata,
    initialResponses,
    initialRepeatGroups,
    answerMetadata,
    technologyContext: {
      id: technology.id,
      techId: technology.techId,
      hasTriageStage: Boolean(technology.triageStage),
      hasViabilityStage: Boolean(technology.viabilityStage),
      technologyRowVersion: technology.rowVersion,
      triageStageRowVersion: technology.triageStage?.rowVersion,
      viabilityStageRowVersion: technology.viabilityStage?.rowVersion,
    },
    rowVersions: {
      technologyRowVersion: technology.rowVersion,
      triageStageRowVersion: technology.triageStage?.rowVersion,
      viabilityStageRowVersion: technology.viabilityStage?.rowVersion,
    },
  };
}

export async function fetchTemplateWithBindingsById(templateId: string) {
  const template = await prisma.formTemplate.findUnique({
    where: { id: templateId },
    include: TEMPLATE_WITH_BINDINGS_INCLUDE,
  });

  if (!template) {
    throw new Error(`Form template not found for id ${templateId}`);
  }

  return {
    template,
    bindingMetadata: collectBindingMetadata(template),
  };
}

export function collectBindingMetadata(
  template: FormTemplateWithSections
): Record<string, BindingMetadata> {
  const bindings: Record<string, BindingMetadata> = {};

  for (const section of template.sections) {
    for (const question of section.questions) {
      if (!question.dictionary || !question.dictionaryKey) {
        continue;
      }

      bindings[question.dictionaryKey] = {
        questionId: question.id,
        dictionaryKey: question.dictionaryKey,
        bindingPath: question.dictionary.bindingPath,
        dataSource: question.dictionary.dataSource,
        dictionaryId: question.dictionary.id,
        currentRevisionId: question.dictionary.currentRevisionId,
        currentVersion: question.dictionary.currentVersion,
      };
    }
  }

  return bindings;
}

function buildInitialValues(
  technology: TechnologyWithSupplements,
  questions: FormQuestionWithDetails[],
  technologyAnswers: TechnologyAnswer[] = []
): {
  responses: Record<string, unknown>;
  repeatGroups: Record<string, Record<string, unknown>[]>;
  answerMetadata: Record<string, AnswerStatusDetail>;
} {
  const responses: Record<string, unknown> = {};
  const repeatGroups: Record<string, Record<string, unknown>[]> = {};
  const answerMetadata: Record<string, AnswerStatusDetail> = {};

  const technologyAnswerMap = new Map<string, TechnologyAnswer>();
  for (const answer of technologyAnswers) {
    technologyAnswerMap.set(answer.questionKey, answer);
  }

  const triageExtended: VersionedAnswerMap = parseVersionedAnswerMap(
    technology.triageStage?.extendedData ?? undefined,
    'triageStage'
  );
  const viabilityExtended: VersionedAnswerMap = parseVersionedAnswerMap(
    technology.viabilityStage?.extendedData ?? undefined,
    'viabilityStage'
  );

  for (const question of questions) {
    // Use dictionaryKey as the canonical key for all lookups
    const questionKey = question.dictionaryKey;
    if (!questionKey || !question.dictionary) {
      // Skip questions without dictionaryKey - they can't be properly keyed
      continue;
    }

    const savedAnswer = technologyAnswerMap.get(questionKey);
    if (savedAnswer) {
      const normalized = normalizeValueForField(question, savedAnswer.value);

      if (question.type === FieldType.REPEATABLE_GROUP) {
        if (normalized !== undefined) {
          repeatGroups[questionKey] = normalized as Record<string, unknown>[];
        }
      } else if (normalized !== undefined) {
        responses[questionKey] = normalized;
      } else {
        responses[questionKey] = savedAnswer.value as unknown;
      }

      const answeredAtIso =
        savedAnswer.answeredAt instanceof Date
          ? savedAnswer.answeredAt.toISOString()
          : typeof (savedAnswer.answeredAt as unknown) === 'string'
          ? (savedAnswer.answeredAt as unknown as string)
          : null;

      answerMetadata[questionKey] = getAnswerStatus(question, {
        value: savedAnswer.value,
        questionRevisionId: savedAnswer.revisionId ?? null,
        answeredAt: answeredAtIso,
        source: 'technologyAnswer',
      });

      continue;
    }

    const bindingPath = question.dictionary.bindingPath;
    const dictionaryKey = question.dictionary.key;
    const rawValue = resolveBindingValue(bindingPath, technology);
    if (rawValue === undefined || rawValue === null) {
      answerMetadata[questionKey] = getAnswerStatus(question, null);
      continue;
    }

    const normalized = normalizeValueForField(question, rawValue);
    if (normalized === undefined) {
      answerMetadata[questionKey] = getAnswerStatus(question, null);
      continue;
    }

    if (question.type === FieldType.REPEATABLE_GROUP) {
      repeatGroups[questionKey] = normalized as Record<string, unknown>[];
      continue;
    }

    responses[questionKey] = normalized;

    const [root] = bindingPath.split('.');
    let versioned: VersionedAnswer | null = null;

    if (dictionaryKey) {
      if (root === 'triageStage') {
        versioned = triageExtended[dictionaryKey] ?? null;
      } else if (root === 'viabilityStage') {
        versioned = viabilityExtended[dictionaryKey] ?? null;
      }
    }

    if (!versioned && hasMeaningfulValue(rawValue)) {
      versioned = {
        value: rawValue,
        questionRevisionId: undefined,
        answeredAt: null,
        source: root === 'triageStage' || root === 'viabilityStage' ? (root as VersionedAnswer['source']) : 'technology',
      };
    }

    answerMetadata[questionKey] = getAnswerStatus(question, versioned);
  }

  return { responses, repeatGroups, answerMetadata };
}

export type SubmissionResponseRecord = {
  questionCode: string;
  value: unknown;
  questionRevisionId: string | null;
};

export type SubmissionRepeatGroupRecord = {
  questionCode: string;
  rowIndex: number;
  data: unknown;
  questionRevisionId: string | null;
};

export function buildSubmissionAnswerMetadata(
  template: FormTemplateWithSections,
  responses: SubmissionResponseRecord[],
  repeatGroups: SubmissionRepeatGroupRecord[],
  options: { answeredAt?: Date | string | null } = {}
): Record<string, AnswerStatusDetail> {
  const result: Record<string, AnswerStatusDetail> = {};
  const responseMap = new Map<string, SubmissionResponseRecord>();
  const repeatGroupMap = new Map<string, SubmissionRepeatGroupRecord[]>();

  for (const response of responses) {
    responseMap.set(response.questionCode, response);
  }

  for (const group of repeatGroups) {
    if (!repeatGroupMap.has(group.questionCode)) {
      repeatGroupMap.set(group.questionCode, []);
    }
    repeatGroupMap.get(group.questionCode)!.push(group);
  }

  const answeredAtIso =
    options.answeredAt instanceof Date
      ? options.answeredAt.toISOString()
      : typeof options.answeredAt === 'string'
      ? options.answeredAt
      : null;

  for (const section of template.sections) {
    for (const question of section.questions) {
      // Use dictionaryKey as the canonical key
      const questionKey = question.dictionaryKey;
      if (!questionKey || !question.dictionary) {
        // Skip questions without dictionaryKey
        continue;
      }

      let versioned: VersionedAnswer | null = null;

      if (question.type === FieldType.REPEATABLE_GROUP) {
        const rows = repeatGroupMap.get(questionKey) ?? [];
        if (rows.length > 0) {
          const sortedRows = [...rows].sort((a, b) => a.rowIndex - b.rowIndex);
          versioned = {
            value: sortedRows.map((row) => row.data),
            questionRevisionId: sortedRows[0]?.questionRevisionId ?? null,
            answeredAt: answeredAtIso,
            source: 'submission',
          };
        }

        result[questionKey] = getAnswerStatus(question, versioned);
        continue;
      }

      const response = responseMap.get(questionKey);
      if (response && hasMeaningfulValue(response.value)) {
        versioned = {
          value: response.value,
          questionRevisionId: response.questionRevisionId ?? null,
          answeredAt: answeredAtIso,
          source: 'submission',
        };
      }

      result[questionKey] = getAnswerStatus(question, versioned);
    }
  }

  return result;
}

export function resolveBindingValue(
  bindingPath: string,
  technology: TechnologyWithSupplements | null
): unknown {
  if (!technology) {
    return undefined;
  }

  const [root, ...rest] = bindingPath.split('.');
  if (!root || rest.length === 0) {
    return undefined;
  }

  const field = rest.join('.');

  switch (root) {
    case 'technology':
      return (technology as Record<string, unknown>)[field];
    case 'triageStage':
      return technology.triageStage
        ? (technology.triageStage as Record<string, unknown>)[field]
        : undefined;
    case 'viabilityStage':
      return technology.viabilityStage
        ? (technology.viabilityStage as Record<string, unknown>)[field]
        : undefined;
    default:
      return undefined;
  }
}

function normalizeValueForField(
  question: FormQuestionWithDetails,
  value: unknown
): unknown {
  switch (question.type) {
    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX_GROUP: {
      if (Array.isArray(value)) {
        return value.map((entry) => String(entry));
      }
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
      }
      return undefined;
    }

    case FieldType.SCORING_0_3:
    case FieldType.INTEGER: {
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    }

    case FieldType.DATE: {
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
      if (typeof value === 'string') {
        return value;
      }
      return undefined;
    }

    case FieldType.REPEATABLE_GROUP: {
      if (Array.isArray(value)) {
        const rows = value
          .map((entry) =>
            entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null
          )
          .filter((entry): entry is Record<string, unknown> => entry !== null);
        return rows.length > 0 ? rows : undefined;
      }
      return undefined;
    }

    default:
      return value;
  }
}

export async function applyBindingWrites(
  tx: Prisma.TransactionClient,
  bindingMetadata: Record<string, BindingMetadata>,
  responses: Record<string, unknown>,
  options: BindingWriteOptions = {}
): Promise<{ technologyId?: string; techId?: string; rowVersions?: RowVersionSnapshot }> {
  if (!Object.keys(bindingMetadata).length) {
    return {};
  }

  const bindingValues = extractBindingValues(bindingMetadata, responses);
  if (!Object.keys(bindingValues).length) {
    return {};
  }

  const partitions = partitionBindingValues(bindingValues);
  const extendedDataUpdates = buildExtendedDataUpdates(bindingMetadata, responses);
  const rawTechId = partitions.technology.techId;
  const resolvedTechId =
    typeof rawTechId === 'string' && rawTechId.trim().length > 0
      ? rawTechId.trim()
      : undefined;

  if (!resolvedTechId) {
    return {};
  }

  const expected = options.expectedVersions ?? {};

  let technologyRecord = await tx.technology.findUnique({
    where: { techId: resolvedTechId },
    include: {
      triageStage: true,
      viabilityStage: true,
    },
  });

  const technologyData = sanitizeTechnologyData(
    partitions.technology,
    resolvedTechId,
    options.userId
  );

  let technologyRowVersion = technologyRecord?.rowVersion;

  if (technologyRecord) {
    if (Object.keys(technologyData).length > 0) {
      if (expected.technologyRowVersion !== undefined) {
        const result = await tx.technology.updateMany({
          where: {
            id: technologyRecord.id,
            rowVersion: expected.technologyRowVersion,
          },
          data: {
            ...technologyData,
            rowVersion: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new OptimisticLockError('Technology record was modified by another user.');
        }
      } else {
        await tx.technology.update({
          where: { id: technologyRecord.id },
          data: {
            ...technologyData,
            rowVersion: { increment: 1 },
          },
        });
      }

      technologyRecord = await tx.technology.findUnique({
        where: { id: technologyRecord.id },
        include: {
          triageStage: true,
          viabilityStage: true,
        },
      });

      if (!technologyRecord) {
        throw new Error('Unable to reload technology record after update.');
      }

      technologyRowVersion = technologyRecord.rowVersion;
    }
  } else {
    const missingFields = getMissingRequiredTechnologyFields(technologyData);
    if (missingFields.length > 0) {
      if (options.allowCreateWhenIncomplete) {
        throw new Error(
          `Missing required technology fields: ${missingFields.join(', ')}`
        );
      }
      return {};
    }

    technologyRecord = await tx.technology.create({
      data: technologyData as Prisma.TechnologyCreateInput,
      include: {
        triageStage: true,
        viabilityStage: true,
      },
    });

    technologyRowVersion = technologyRecord.rowVersion;
  }

  if (!technologyRecord) {
    return {};
  }

  const triageStageRowVersion = await upsertTriageStage(
    tx,
    technologyRecord.id,
    technologyRecord.triageStage,
    partitions.triageStage,
    extendedDataUpdates.triageStage,
    expected.triageStageRowVersion
  );

  const viabilityStageRowVersion = await upsertViabilityStage(
    tx,
    technologyRecord.id,
    technologyRecord.viabilityStage,
    partitions.viabilityStage,
    extendedDataUpdates.viabilityStage,
    expected.viabilityStageRowVersion
  );

  await upsertTechnologyAnswers(
    tx,
    technologyRecord.id,
    bindingMetadata,
    responses,
    options.userId
  );

  return {
    technologyId: technologyRecord.id,
    techId: resolvedTechId,
    rowVersions: {
      technologyRowVersion,
      triageStageRowVersion,
      viabilityStageRowVersion,
    },
  };
}

export function extractBindingValues(
  bindingMetadata: Record<string, BindingMetadata>,
  responses: Record<string, unknown>
) {
  const values: Record<string, unknown> = {};

  for (const meta of Object.values(bindingMetadata)) {
    // Use dictionaryKey to look up responses (responses are keyed by dictionaryKey)
    if (Object.prototype.hasOwnProperty.call(responses, meta.dictionaryKey)) {
      values[meta.bindingPath] = responses[meta.dictionaryKey];
    }
  }

  return values;
}

export function partitionBindingValues(values: Record<string, unknown>) {
  const partitions: Record<
    'technology' | 'triageStage' | 'viabilityStage',
    Record<string, unknown>
  > = {
    technology: {},
    triageStage: {},
    viabilityStage: {},
  };

  for (const [bindingPath, value] of Object.entries(values)) {
    const [root, ...rest] = bindingPath.split('.');
    if (!root || rest.length === 0) {
      continue;
    }

    const field = rest.join('.');

    if (root === 'technology') {
      partitions.technology[field] = value;
    } else if (root === 'triageStage') {
      partitions.triageStage[field] = value;
    } else if (root === 'viabilityStage') {
      partitions.viabilityStage[field] = value;
    }
  }

  return partitions;
}

type StageExtendedDataUpdates = Record<string, VersionedAnswer | null>;

export function buildExtendedDataUpdates(
  bindingMetadata: Record<string, BindingMetadata>,
  responses: Record<string, unknown>
): {
  triageStage: StageExtendedDataUpdates;
  viabilityStage: StageExtendedDataUpdates;
} {
  const updates = {
    triageStage: {} as StageExtendedDataUpdates,
    viabilityStage: {} as StageExtendedDataUpdates,
  };

  const answeredAt = new Date().toISOString();

  for (const meta of Object.values(bindingMetadata)) {
    if (!meta.dictionaryKey || !meta.bindingPath) {
      continue;
    }

    // Use dictionaryKey to look up responses (responses are keyed by dictionaryKey)
    if (!Object.prototype.hasOwnProperty.call(responses, meta.dictionaryKey)) {
      continue;
    }

    const rawValue = responses[meta.dictionaryKey];
    const [root] = meta.bindingPath.split('.');

    let entry: VersionedAnswer | null = null;
    if (hasMeaningfulValue(rawValue)) {
      entry = {
        value: rawValue,
        questionRevisionId: meta.currentRevisionId ?? null,
        answeredAt,
        source: root === 'triageStage' || root === 'viabilityStage'
          ? (root as VersionedAnswer['source'])
          : undefined,
      };
    } else {
      entry = null;
    }

    if (root === 'triageStage') {
      updates.triageStage[meta.dictionaryKey] = entry;
    } else if (root === 'viabilityStage') {
      updates.viabilityStage[meta.dictionaryKey] = entry;
    }
  }

  return updates;
}

async function upsertTechnologyAnswers(
  tx: Prisma.TransactionClient,
  technologyId: string,
  bindingMetadata: Record<string, BindingMetadata>,
  responses: Record<string, unknown>,
  userId?: string
) {
  if (!Object.keys(responses).length) {
    return;
  }

  const answeredAt = new Date();
  const answeredBy = userId && userId.trim().length > 0 ? userId.trim() : 'shared-user';

  for (const [dictionaryKey, value] of Object.entries(responses)) {
    if (!hasMeaningfulValue(value)) {
      continue;
    }

    const meta = bindingMetadata[dictionaryKey];

    await tx.technologyAnswer.upsert({
      where: {
        technologyId_questionKey: {
          technologyId,
          questionKey: dictionaryKey,
        },
      },
      update: {
        value: value as Prisma.InputJsonValue,
        answeredAt,
        answeredBy,
        revisionId: meta?.currentRevisionId ?? null,
      },
      create: {
        technologyId,
        questionKey: dictionaryKey,
        value: value as Prisma.InputJsonValue,
        answeredAt,
        answeredBy,
        revisionId: meta?.currentRevisionId ?? null,
      },
    });
  }
}

export function sanitizeTechnologyData(
  raw: Record<string, unknown>,
  techId: string,
  userId?: string
): Partial<Technology> {
  const data: Partial<Technology> = {
    techId,
  };
  const target = data as Record<string, unknown>;

  const inventorRows = Array.isArray(raw.inventorName)
    ? (raw.inventorName as Record<string, unknown>[])
    : null;

  if (inventorRows) {
    const { summary, departments, titles } = summarizeInventorRows(inventorRows);
    if (summary) {
      target.inventorName = summary;
    }
    if (departments) {
      target.inventorDept = departments;
    }
    if (titles) {
      target.inventorTitle = titles;
    }
  }

  for (const [field, value] of Object.entries(raw)) {
    if (field === 'techId') {
      continue;
    }

    if (!TECHNOLOGY_BINDABLE_FIELDS.has(field as keyof Technology)) {
      continue;
    }

    if (field === 'inventorName' && inventorRows) {
      // Already handled above to preserve formatting / derived fields.
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      const flattened = flattenArrayValue(value);
      if (flattened) {
        target[field] = flattened;
      }
      continue;
    }

    target[field] = typeof value === 'string' ? value.trim() : value;
  }

  if (userId) {
    data.lastModifiedBy = userId;
  }
  data.lastModifiedAt = new Date();

  return data;
}

export function summarizeInventorRows(rows: Record<string, unknown>[]): {
  summary?: string;
  departments?: string;
  titles?: string;
} {
  if (!rows.length) {
    return {};
  }

  const summaryLines: string[] = [];
  const departmentSet = new Set<string>();
  const titleSet = new Set<string>();

  rows.forEach((row) => {
    const name = extractFirstString(row, ['name', 'inventorName', 'value']);
    const title = extractFirstString(row, ['title', 'inventorTitle']);
    const department = extractFirstString(row, ['department', 'dept', 'departmentName']);
    const email = extractFirstString(row, ['email', 'contact']);

    if (name) {
      const parts = [name];
      if (title) {
        parts.push(title);
        titleSet.add(title);
      }
      if (department) {
        parts.push(department);
        departmentSet.add(department);
      }
      if (email) {
        parts.push(email);
      }
      summaryLines.push(parts.join(' | '));
    }
  });

  return {
    summary: summaryLines.length > 0 ? summaryLines.join('\n') : undefined,
    departments: departmentSet.size > 0 ? Array.from(departmentSet).join('; ') : undefined,
    titles: titleSet.size > 0 ? Array.from(titleSet).join('; ') : undefined,
  };
}

export function extractFirstString(
  row: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function flattenArrayValue(value: unknown[]): string | undefined {
  const parts = value
    .map((item) => {
      if (item === null || item === undefined) {
        return null;
      }
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      if (typeof item === 'number' || typeof item === 'boolean') {
        return String(item);
      }
      if (typeof item === 'object') {
        try {
          return JSON.stringify(item);
        } catch {
          return null;
        }
      }
      return null;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join('; ') : undefined;
}

export function applyExtendedDataPatch(
  existing: Prisma.JsonValue | null | undefined,
  updates: StageExtendedDataUpdates | undefined,
  source: VersionedAnswer['source']
): Prisma.JsonValue | null | undefined {
  if (!updates || Object.keys(updates).length === 0) {
    return undefined;
  }

  const base = parseVersionedAnswerMap(existing ?? undefined, source ?? 'triageStage');
  const merged = mergeVersionedAnswerMaps(base, updates);

  if (Object.keys(merged).length === 0) {
    return null;
  }

  return merged as unknown as Prisma.JsonValue;
}

export function getMissingRequiredTechnologyFields(
  data: Partial<Technology>
) {
  return REQUIRED_TECH_FIELDS_FOR_CREATE.filter((field) => {
    const value = data[field];
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === 'string' && value.trim().length === 0) {
      return true;
    }

    return false;
  });
}

async function upsertTriageStage(
  tx: Prisma.TransactionClient,
  technologyId: string,
  existingStage: TriageStage | null,
  raw: Record<string, unknown>,
  extendedDataUpdates: StageExtendedDataUpdates,
  expectedRowVersion?: number
): Promise<number | undefined> {
  const data = sanitizeTriageStageData(raw);
  const extendedDataPatch = applyExtendedDataPatch(
    existingStage?.extendedData ?? undefined,
    extendedDataUpdates,
    'triageStage'
  );

  if (extendedDataPatch !== undefined) {
    data.extendedData = extendedDataPatch;
  }

  if (!Object.keys(data).length) {
    return existingStage?.rowVersion;
  }
  const updateManyData = buildTriageStageUpdateManyData(data);
  const updateData = buildTriageStageUpdateData(data);

  if (existingStage) {
    if (expectedRowVersion !== undefined) {
      const result = await tx.triageStage.updateMany({
        where: { id: existingStage.id, rowVersion: expectedRowVersion },
        data: {
          ...updateManyData,
          rowVersion: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new OptimisticLockError('Triage stage was modified by another user.');
      }
    } else {
      await tx.triageStage.update({
        where: { id: existingStage.id },
        data: {
          ...updateData,
          rowVersion: { increment: 1 },
        },
      });
    }

    const updated = await tx.triageStage.findUnique({ where: { id: existingStage.id } });
    return updated?.rowVersion;
  }

  const created = await tx.triageStage.create({
    data: buildTriageStageCreateData(technologyId, data),
  });
  return created.rowVersion;
}

async function upsertViabilityStage(
  tx: Prisma.TransactionClient,
  technologyId: string,
  existingStage: ViabilityStage | null,
  raw: Record<string, unknown>,
  extendedDataUpdates: StageExtendedDataUpdates,
  expectedRowVersion?: number
): Promise<number | undefined> {
  const data = sanitizeViabilityStageData(raw);
  const extendedDataPatch = applyExtendedDataPatch(
    existingStage?.extendedData ?? undefined,
    extendedDataUpdates,
    'viabilityStage'
  );
  if (extendedDataPatch !== undefined) {
    data.extendedData = extendedDataPatch;
  }

  if (!Object.keys(data).length) {
    return existingStage?.rowVersion;
  }
  const updateManyData = buildViabilityStageUpdateManyData(data);
  const updateData = buildViabilityStageUpdateData(data);

  if (existingStage) {
    if (expectedRowVersion !== undefined) {
      const result = await tx.viabilityStage.updateMany({
        where: { id: existingStage.id, rowVersion: expectedRowVersion },
        data: {
          ...updateManyData,
          rowVersion: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new OptimisticLockError('Viability stage was modified by another user.');
      }
    } else {
      await tx.viabilityStage.update({
        where: { id: existingStage.id },
        data: {
          ...updateData,
          rowVersion: { increment: 1 },
        },
      });
    }

    const updated = await tx.viabilityStage.findUnique({ where: { id: existingStage.id } });
    return updated?.rowVersion;
  }

  const created = await tx.viabilityStage.create({
    data: buildViabilityStageCreateData(technologyId, data),
  });
  return created.rowVersion;
}

export function sanitizeTriageStageData(
  raw: Record<string, unknown>
): Partial<TriageStage> {
  const data: Partial<TriageStage> = {};

  for (const [field, value] of Object.entries(raw)) {
    if (!TRIAGE_STAGE_BINDABLE_FIELDS.has(field as keyof TriageStage)) {
      continue;
    }

    switch (field) {
      case 'technologyOverview': {
        const str = coerceString(value);
        if (str !== undefined) {
          data.technologyOverview = str;
        }
        break;
      }
      case 'missionAlignmentText': {
        const str = coerceString(value);
        if (str !== undefined) {
          data.missionAlignmentText = str;
        }
        break;
      }
      case 'missionAlignmentScore': {
        const num = coerceNumber(value);
        if (num !== undefined) {
          data.missionAlignmentScore = num;
        }
        break;
      }
      case 'unmetNeedText': {
        const str = coerceString(value);
        if (str !== undefined) {
          data.unmetNeedText = str;
        }
        break;
      }
      case 'unmetNeedScore': {
        const num = coerceNumber(value);
        if (num !== undefined) {
          data.unmetNeedScore = num;
        }
        break;
      }
      case 'stateOfArtText': {
        const str = coerceString(value);
        if (str !== undefined) {
          data.stateOfArtText = str;
        }
        break;
      }
      case 'stateOfArtScore': {
        const num = coerceNumber(value);
        if (num !== undefined) {
          data.stateOfArtScore = num;
        }
        break;
      }
      case 'marketOverview': {
        const str = coerceString(value);
        if (str !== undefined) {
          data.marketOverview = str;
        }
        break;
      }
      case 'marketScore': {
        const num = coerceNumber(value);
        if (num !== undefined) {
          data.marketScore = num;
        }
        break;
      }
      case 'recommendation': {
        const str = coerceString(value);
        if (str !== undefined) {
          data.recommendation = str;
        }
        break;
      }
      case 'recommendationNotes': {
        const str = coerceString(value);
        if (str !== undefined) {
          data.recommendationNotes = str;
        }
        break;
      }
      default: {
        const str = coerceString(value);
        if (str !== undefined) {
          (data as Record<string, unknown>)[field] = str;
        }
      }
    }
  }

  return data;
}

export function sanitizeViabilityStageData(
  raw: Record<string, unknown>
): Partial<ViabilityStage> {
  const data: Partial<ViabilityStage> = {};

  for (const [field, value] of Object.entries(raw)) {
    if (!VIABILITY_STAGE_BINDABLE_FIELDS.has(field as keyof ViabilityStage)) {
      continue;
    }

    if (field === 'technicalFeasibility') {
      const str = coerceString(value);
      if (str !== undefined) {
        data.technicalFeasibility = str;
      }
    }
  }

  return data;
}

export function buildTriageStageCreateData(
  technologyId: string,
  data: Partial<TriageStage>
): Prisma.TriageStageCreateInput {
  return {
    technology: {
      connect: { id: technologyId },
    },
    technologyOverview: data.technologyOverview ?? '',
    missionAlignmentText: data.missionAlignmentText ?? '',
    missionAlignmentScore: data.missionAlignmentScore ?? 0,
    unmetNeedText: data.unmetNeedText ?? '',
    unmetNeedScore: data.unmetNeedScore ?? 0,
    stateOfArtText: data.stateOfArtText ?? '',
    stateOfArtScore: data.stateOfArtScore ?? 0,
    marketOverview: data.marketOverview ?? '',
    marketScore: data.marketScore ?? 0,
    impactScore: data.impactScore ?? 0,
    valueScore: data.valueScore ?? 0,
    recommendation: data.recommendation ?? '',
    recommendationNotes: data.recommendationNotes ?? undefined,
    ...(data.extendedData !== undefined
      ? {
          extendedData: data.extendedData === null ? Prisma.JsonNull : data.extendedData,
        }
      : {}),
  };
}

export function buildTriageStageUpdateManyData(
  data: Partial<TriageStage>
): Prisma.TriageStageUpdateManyMutationInput {
  const update: Prisma.TriageStageUpdateManyMutationInput = {};

  if (data.technologyOverview !== undefined) update.technologyOverview = data.technologyOverview;
  if (data.missionAlignmentText !== undefined) update.missionAlignmentText = data.missionAlignmentText;
  if (data.missionAlignmentScore !== undefined) update.missionAlignmentScore = data.missionAlignmentScore;
  if (data.unmetNeedText !== undefined) update.unmetNeedText = data.unmetNeedText;
  if (data.unmetNeedScore !== undefined) update.unmetNeedScore = data.unmetNeedScore;
  if (data.stateOfArtText !== undefined) update.stateOfArtText = data.stateOfArtText;
  if (data.stateOfArtScore !== undefined) update.stateOfArtScore = data.stateOfArtScore;
  if (data.marketOverview !== undefined) update.marketOverview = data.marketOverview;
  if (data.marketScore !== undefined) update.marketScore = data.marketScore;
  if (data.impactScore !== undefined) update.impactScore = data.impactScore;
  if (data.valueScore !== undefined) update.valueScore = data.valueScore;
  if (data.recommendation !== undefined) update.recommendation = data.recommendation;
  if (data.recommendationNotes !== undefined) update.recommendationNotes = data.recommendationNotes;
  if (data.extendedData !== undefined) {
    update.extendedData =
      data.extendedData === null ? Prisma.JsonNull : (data.extendedData as Prisma.InputJsonValue);
  }

  return update;
}

function buildTriageStageUpdateData(data: Partial<TriageStage>): Prisma.TriageStageUpdateInput {
  return buildTriageStageUpdateManyData(data) as Prisma.TriageStageUpdateInput;
}

export function buildViabilityStageCreateData(
  technologyId: string,
  data: Partial<ViabilityStage>
): Prisma.ViabilityStageCreateInput {
  return {
    technology: {
      connect: { id: technologyId },
    },
    technicalFeasibility: data.technicalFeasibility ?? '',
    regulatoryPathway: '',
    costAnalysis: '',
    resourceRequirements: '',
    riskAssessment: '',
    overallViability: '',
    technicalScore: data.technicalScore ?? 0,
    commercialScore: data.commercialScore ?? 0,
    ...(data.extendedData !== undefined
      ? {
          extendedData: data.extendedData === null ? Prisma.JsonNull : data.extendedData,
        }
      : {}),
  };
}

export function buildViabilityStageUpdateManyData(
  data: Partial<ViabilityStage>
): Prisma.ViabilityStageUpdateManyMutationInput {
  const update: Prisma.ViabilityStageUpdateManyMutationInput = {};

  if (data.technicalFeasibility !== undefined) update.technicalFeasibility = data.technicalFeasibility;
  if (data.regulatoryPathway !== undefined) update.regulatoryPathway = data.regulatoryPathway;
  if (data.costAnalysis !== undefined) update.costAnalysis = data.costAnalysis;
  if (data.timeToMarket !== undefined) update.timeToMarket = data.timeToMarket;
  if (data.resourceRequirements !== undefined) update.resourceRequirements = data.resourceRequirements;
  if (data.riskAssessment !== undefined) update.riskAssessment = data.riskAssessment;
  if (data.technicalScore !== undefined) update.technicalScore = data.technicalScore;
  if (data.commercialScore !== undefined) update.commercialScore = data.commercialScore;
  if (data.overallViability !== undefined) update.overallViability = data.overallViability;
  if (data.extendedData !== undefined) {
    update.extendedData =
      data.extendedData === null ? Prisma.JsonNull : (data.extendedData as Prisma.InputJsonValue);
  }

  return update;
}

function buildViabilityStageUpdateData(data: Partial<ViabilityStage>): Prisma.ViabilityStageUpdateInput {
  return buildViabilityStageUpdateManyData(data) as Prisma.ViabilityStageUpdateInput;
}

export function coerceString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

export function coerceNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(num)) {
    return Math.round(num);
  }

  return undefined;
}
