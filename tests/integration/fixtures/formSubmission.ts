import type { FormSubmissionData } from '@/app/dynamic-form/actions';
import type { BindingMetadata } from '@/lib/technology/service';

export type BindingLookup = ReturnType<typeof createBindingLookup>;

export interface BuildSubmissionOverrides {
  responses?: Record<string, unknown>;
  repeatGroups?: Record<string, Array<Record<string, unknown>>>;
  calculatedScores?: Record<string, unknown>;
  rowVersions?: FormSubmissionData['rowVersions'];
}

export function createBindingLookup(bindingMetadata: Record<string, BindingMetadata>) {
  const byPath = new Map<string, BindingMetadata>();

  Object.values(bindingMetadata).forEach((meta) => {
    if (meta.bindingPath) {
      byPath.set(meta.bindingPath, meta);
    }
  });

  return {
    dictionaryKeyFor(bindingPath: string) {
      const meta = byPath.get(bindingPath);
      if (!meta) {
        throw new Error(`Missing binding for ${bindingPath}`);
      }
      return meta.dictionaryKey;
    },
    metadataFor(bindingPath: string) {
      const meta = byPath.get(bindingPath);
      if (!meta) {
        throw new Error(`Missing binding for ${bindingPath}`);
      }
      return meta;
    },
  } as const;
}

export function buildSubmissionPayload(
  templateId: string,
  lookup: BindingLookup,
  techId: string,
  overrides: BuildSubmissionOverrides = {}
): FormSubmissionData {
  const baseResponses = buildBaseResponses(lookup, techId);
  const baseRepeatGroups = buildBaseRepeatGroups(lookup);

  return {
    templateId,
    responses: {
      ...baseResponses,
      ...(overrides.responses ?? {}),
    },
    repeatGroups: {
      ...baseRepeatGroups,
      ...(overrides.repeatGroups ?? {}),
    },
    calculatedScores: overrides.calculatedScores ?? {},
    rowVersions: overrides.rowVersions,
  };
}

function buildBaseResponses(lookup: BindingLookup, techId: string) {
  return {
    [lookup.dictionaryKeyFor('technology.techId')]: techId,
    [lookup.dictionaryKeyFor('technology.technologyName')]: 'Integration Harness Demo',
    [lookup.dictionaryKeyFor('technology.reviewerName')]: 'QA Reviewer',
    [lookup.dictionaryKeyFor('technology.domainAssetClass')]: 'Software',
    [lookup.dictionaryKeyFor('triageStage.technologyOverview')]: 'Integration scenario overview',
    [lookup.dictionaryKeyFor('triageStage.missionAlignmentText')]: 'Aligned with mission',
    [lookup.dictionaryKeyFor('triageStage.missionAlignmentScore')]: 3,
    [lookup.dictionaryKeyFor('triageStage.recommendation')]: 'REVIEW',
  } as Record<string, unknown>;
}

function buildBaseRepeatGroups(lookup: BindingLookup) {
  return {
    [lookup.dictionaryKeyFor('technology.inventorName')]: [
      {
        name: 'Dr. Integration',
        title: 'PI',
        department: 'Bioengineering',
        email: 'integration@example.org',
      },
    ],
  } as Record<string, Array<Record<string, unknown>>>;
}
