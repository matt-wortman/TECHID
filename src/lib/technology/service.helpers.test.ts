/**
 * @jest-environment node
 */
import { DataSource, Prisma } from '@prisma/client'
import type { VersionedAnswer } from '@/lib/technology/types'
import type { BindingMetadata } from '@/lib/technology/service'
import {
  extractBindingValues,
  partitionBindingValues,
  buildExtendedDataUpdates,
  sanitizeTechnologyData,
  summarizeInventorRows,
  extractFirstString,
  flattenArrayValue,
  applyExtendedDataPatch,
  getMissingRequiredTechnologyFields,
  sanitizeTriageStageData,
  sanitizeViabilityStageData,
  buildTriageStageCreateData,
  buildTriageStageUpdateManyData,
  buildViabilityStageCreateData,
  buildViabilityStageUpdateManyData,
  coerceString,
  coerceNumber,
} from '@/lib/technology/service'

const makeBinding = (overrides: Partial<BindingMetadata>): BindingMetadata => ({
  questionId: overrides.questionId ?? 'question-id',
  dictionaryKey: overrides.dictionaryKey ?? 'dict-key',
  bindingPath: overrides.bindingPath ?? 'technology.field',
  dataSource: overrides.dataSource ?? DataSource.TECHNOLOGY,
  dictionaryId: overrides.dictionaryId ?? 'dictionary-id',
  currentRevisionId: overrides.currentRevisionId ?? 'rev-1',
  currentVersion: overrides.currentVersion ?? 1,
})

describe('technology service helpers', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('extracts binding values and partitions them by source', () => {
    // Binding metadata is keyed by dictionaryKey
    const metadata = {
      technologyName: makeBinding({ dictionaryKey: 'technologyName', bindingPath: 'technology.technologyName' }),
      triageNotes: makeBinding({
        dictionaryKey: 'triageNotes',
        bindingPath: 'triageStage.notes',
        dataSource: DataSource.STAGE_SUPPLEMENT,
      }),
      viabilityFeasibility: makeBinding({
        dictionaryKey: 'viabilityFeasibility',
        bindingPath: 'viabilityStage.technicalFeasibility',
        dataSource: DataSource.STAGE_SUPPLEMENT,
      }),
    }

    // Responses are keyed by dictionaryKey
    const responses = {
      technologyName: 'Hydration Patch',
      triageNotes: 'Ready for pilot',
      viabilityFeasibility: 'Feasible',
      extraField: 'ignored',
    }

    const extracted = extractBindingValues(metadata, responses)
    expect(extracted).toEqual({
      'technology.technologyName': 'Hydration Patch',
      'triageStage.notes': 'Ready for pilot',
      'viabilityStage.technicalFeasibility': 'Feasible',
    })

    const partitions = partitionBindingValues(extracted)
    expect(partitions.technology).toEqual({ technologyName: 'Hydration Patch' })
    expect(partitions.triageStage).toEqual({ notes: 'Ready for pilot' })
    expect(partitions.viabilityStage).toEqual({ technicalFeasibility: 'Feasible' })
  })

  it('builds extended data updates with answeredAt timestamps', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-11-07T12:34:56Z'))
    // Binding metadata is keyed by dictionaryKey
    const metadata = {
      triageNotes: makeBinding({
        bindingPath: 'triageStage.notes',
        dictionaryKey: 'triageNotes',
        currentRevisionId: 'triage-rev',
      }),
      viabilityScore: makeBinding({
        bindingPath: 'viabilityStage.technicalScore',
        dictionaryKey: 'viabilityScore',
        currentRevisionId: 'viability-rev',
      }),
    }
    // Responses are keyed by dictionaryKey
    const responses = {
      triageNotes: 'Ready for review',
      viabilityScore: '',
    }

    const updates = buildExtendedDataUpdates(metadata, responses)

    expect(updates.triageStage.triageNotes).toMatchObject({
      value: 'Ready for review',
      questionRevisionId: 'triage-rev',
      answeredAt: '2025-11-07T12:34:56.000Z',
      source: 'triageStage',
    })
    expect(updates.viabilityStage.viabilityScore).toBeNull()
  })

  it('sanitizes technology payloads and derives inventor metadata', () => {
    const rows = [
      {
        name: '  Dr. Chen  ',
        title: 'PI',
        department: 'Cardiology',
        email: 'chen@example.com',
      },
      {
        inventorName: 'Dr. Rivera',
        inventorTitle: 'Engineer',
        dept: 'Cardiology',
      },
    ]

    const sanitized = sanitizeTechnologyData(
      {
        techId: 'ignored',
        technologyName: '  Hydration Patch  ',
        domainAssetClass: ['Digital', ' Health '],
        inventorName: rows,
        reviewerName: '  Alex ',
        unknownField: 'skip',
      },
      'D25-0005',
      'tester'
    )

    expect(sanitized.techId).toBe('D25-0005')
    expect(sanitized.technologyName).toBe('Hydration Patch')
    expect(sanitized.domainAssetClass).toBe('Digital; Health')
    expect(sanitized.inventorName).toContain('Dr. Chen')
    expect(sanitized.inventorDept).toBe('Cardiology')
    expect(sanitized.inventorTitle).toBe('PI; Engineer')
    expect(sanitized.lastModifiedBy).toBe('tester')
    expect(sanitized.lastModifiedAt).toBeInstanceOf(Date)
  })

  it('summarizes inventor rows and handles missing values', () => {
    const summary = summarizeInventorRows([
      { name: ' Dr. Lee ', departmentName: 'Oncology' },
      { dept: 'Oncology' },
    ])

    expect(summary.summary).toContain('Dr. Lee')
    expect(summary.departments).toBe('Oncology')
    expect(summary.titles).toBeUndefined()
    expect(summarizeInventorRows([])).toEqual({})
  })

  it('extracts strings and flattens arrays into semicolon lists', () => {
    expect(
      extractFirstString(
        { title: '  Engineer ', other: 'value' },
        ['missing', 'title']
      )
    ).toBe('Engineer')

    expect(flattenArrayValue(['alpha', ' ', 3, true, { nested: 'x' }])).toBe(
      'alpha; 3; true; {"nested":"x"}'
    )
    expect(flattenArrayValue([null, undefined])).toBeUndefined()
  })

  it('applies extended data patches and prunes deleted entries', () => {
    const existing = {
      keep: {
        value: 'existing',
        questionRevisionId: 'rev-existing',
        answeredAt: '2025-01-01T00:00:00Z',
        source: 'triageStage',
      },
    } as unknown as Prisma.JsonValue

    const updates: Record<string, VersionedAnswer | null> = {
      keep: {
        value: 'updated',
        questionRevisionId: 'rev-existing',
        answeredAt: '2025-02-02T00:00:00Z',
        source: 'triageStage',
      },
      drop: null,
    }

    const patched = applyExtendedDataPatch(existing, updates, 'triageStage')
    expect(patched).toMatchObject({
      keep: expect.objectContaining({ value: 'updated' }),
    })
    expect('drop' in (patched as Record<string, unknown>)).toBe(false)
    expect(applyExtendedDataPatch(existing, undefined, 'triageStage')).toBeUndefined()
  })

  it('identifies missing required technology fields', () => {
    const missing = getMissingRequiredTechnologyFields({ technologyName: 'Device' })
    expect(missing).toEqual(['inventorName', 'reviewerName', 'domainAssetClass'])
  })

  it('sanitizes triage and viability stage inputs', () => {
    const triage = sanitizeTriageStageData({
      technologyOverview: '  Overview ',
      missionAlignmentScore: '3',
      marketScore: 2.6,
      unmetNeedScore: 'not-a-number',
      unknownField: 'ignore',
    })
    expect(triage).toMatchObject({
      technologyOverview: 'Overview',
      missionAlignmentScore: 3,
      marketScore: 3,
    })
    expect(triage).not.toHaveProperty('unknownField')

    const viability = sanitizeViabilityStageData({
      technicalFeasibility: '  Strong ',
      regulatoryPathway: 'FDA',
    })
    expect(viability).toEqual({ technicalFeasibility: 'Strong' })
  })

  it('builds stage create/update payloads with defaults', () => {
    const triageCreate = buildTriageStageCreateData('tech-1', {
      technologyOverview: 'Overview',
      missionAlignmentScore: 2,
      extendedData: Prisma.JsonNull as unknown as Prisma.JsonValue,
    })
    expect(triageCreate.technology.connect).toEqual({ id: 'tech-1' })
    expect(triageCreate.technologyOverview).toBe('Overview')
    expect(triageCreate.extendedData).toBe(Prisma.JsonNull)

    const triageUpdate = buildTriageStageUpdateManyData({
      marketScore: 3,
      extendedData: null,
    })
    expect(triageUpdate.marketScore).toBe(3)
    expect(triageUpdate.extendedData).toBe(Prisma.JsonNull)

    const viabilityCreate = buildViabilityStageCreateData('tech-1', {
      technicalFeasibility: 'Solid',
      technicalScore: 4,
    })
    expect(viabilityCreate.technicalFeasibility).toBe('Solid')

    const viabilityUpdate = buildViabilityStageUpdateManyData({
      technicalScore: 4,
      resourceRequirements: 'High',
      extendedData: { detail: 'value' },
    })
    expect(viabilityUpdate.resourceRequirements).toBe('High')
    expect(viabilityUpdate.extendedData).toEqual({ detail: 'value' })
  })

  it('coerces values into strings and numbers', () => {
    expect(coerceString(42)).toBe('42')
    expect(coerceString(undefined)).toBeUndefined()
    expect(coerceNumber('5.7')).toBe(6)
    expect(coerceNumber('nan')).toBeUndefined()
  })
})
