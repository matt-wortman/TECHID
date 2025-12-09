/**
 * @jest-environment node
 */
import { DataSource, FieldType, QuestionDictionary } from '@prisma/client'
import type { FormTemplateWithSections } from '@/lib/form-engine/types'
import { buildQuestion, buildSection, buildTemplate } from '@/lib/form-engine/test-utils'
import type { TechnologyWithSupplements } from '@/lib/technology/service'
import {
  loadTemplateWithBindings,
  fetchTemplateWithBindingsById,
  collectBindingMetadata,
  buildSubmissionAnswerMetadata,
  resolveBindingValue,
  SubmissionRepeatGroupRecord,
} from '@/lib/technology/service'
import type { SubmissionResponseRecord } from '@/lib/technology/service'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    formTemplate: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    technology: {
      findUnique: jest.fn(),
    },
    technologyAnswer: {
      findMany: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as unknown as {
  formTemplate: { findFirst: jest.Mock; findUnique: jest.Mock }
  technology: { findUnique: jest.Mock }
  technologyAnswer: { findMany: jest.Mock }
}

function buildDictionary(overrides: {
  id: string
  key: string
  bindingPath: string
  dataSource: DataSource
  currentRevisionId: string
}): QuestionDictionary {
  return {
    id: overrides.id,
    version: '1',
    key: overrides.key,
    currentVersion: 1,
    currentRevisionId: overrides.currentRevisionId,
    label: overrides.key,
    helpText: null,
    options: null,
    validation: null,
    bindingPath: overrides.bindingPath,
    dataSource: overrides.dataSource,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  } as QuestionDictionary
}

function buildTemplateFixture(): FormTemplateWithSections {
  const technologyDictionary = buildDictionary({
    id: 'dict-tech-name',
    key: 'technologyName',
    bindingPath: 'technology.technologyName',
    dataSource: DataSource.TECHNOLOGY,
    currentRevisionId: 'rev-tech-name',
  })

  const triageDictionary = buildDictionary({
    id: 'dict-triage-notes',
    key: 'triageNotes',
    bindingPath: 'triageStage.notes',
    dataSource: DataSource.STAGE_SUPPLEMENT,
    currentRevisionId: 'rev-triage',
  })

  const repeatDictionary = buildDictionary({
    id: 'dict-team',
    key: 'teamMembers',
    bindingPath: 'technology.teamMembers',
    dataSource: DataSource.TECHNOLOGY,
    currentRevisionId: 'rev-team',
  })

  return buildTemplate({
    id: 'tpl-hydration',
    sections: [
      buildSection({
        id: 'section-basics',
        templateId: 'tpl-hydration',
        order: 0,
        questions: [
          buildQuestion({
            id: 'q-tech-name',
            sectionId: 'section-basics',
            label: 'Technology Name',
            type: FieldType.SHORT_TEXT,
            isRequired: true,
            dictionaryKey: 'technologyName',
            dictionary: technologyDictionary,
          }),
          buildQuestion({
            id: 'q-triage-notes',
            sectionId: 'section-basics',
            label: 'Triage Notes',
            type: FieldType.LONG_TEXT,
            isRequired: false,
            dictionaryKey: 'triageNotes',
            dictionary: triageDictionary,
          }),
          buildQuestion({
            id: 'q-team',
            sectionId: 'section-basics',
            label: 'Team Members',
            type: FieldType.REPEATABLE_GROUP,
            dictionaryKey: 'teamMembers',
            dictionary: repeatDictionary,
          }),
          buildQuestion({
            id: 'q-internal-note',
            sectionId: 'section-basics',
            label: 'Internal Note',
            type: FieldType.SHORT_TEXT,
            dictionaryKey: 'internalNote',
            dictionary: null, // Simulates unloaded dictionary - will be skipped in binding metadata
          }),
        ],
      }),
    ],
  })
}

const technologyFixture: TechnologyWithSupplements = {
  id: 'tech-123',
  techId: 'D25-0001',
  technologyName: 'Hydration Patch',
  technologyOverview: 'Existing overview',
  teamMembers: [],
  rowVersion: 5,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
  triageStageId: 'triage-123',
  viabilityStageId: null,
  inventorName: null,
  reviewerName: null,
  domainAssetClass: null,
  triageStage: {
    id: 'triage-123',
    technologyId: 'tech-123',
    rowVersion: 2,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z'),
    notes: 'Important considerations',
    technologyOverview: 'Existing overview',
    missionAlignmentScore: 3,
    extendedData: {
      triageNotes: {
        value: 'Important considerations',
        questionRevisionId: 'rev-triage',
        answeredAt: '2025-01-01T10:00:00Z',
        source: 'triageStage',
      },
    },
  },
  viabilityStage: null,
} as unknown as TechnologyWithSupplements

describe('technology service hydration helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws when no active template is available', async () => {
    mockPrisma.formTemplate.findFirst.mockResolvedValue(null)

    await expect(loadTemplateWithBindings()).rejects.toThrow('No active form template found')
  })

  it('returns template and metadata when no techId is provided', async () => {
    const template = buildTemplateFixture()
    mockPrisma.formTemplate.findFirst.mockResolvedValue(template)

    const result = await loadTemplateWithBindings()

    expect(result.template.id).toBe('tpl-hydration')
    // Binding metadata is keyed by dictionaryKey
    expect(result.bindingMetadata.technologyName.bindingPath).toBe('technology.technologyName')
    expect(result.initialResponses).toEqual({})
    expect(result.technologyContext).toBeNull()
  })

  it('hydrates responses and repeat groups when technology exists', async () => {
    const template = buildTemplateFixture()
    const techRecord = {
      ...technologyFixture,
      technologyName: 'Hydration Patch',
      teamMembers: [
        { name: 'Dr. Chen', role: 'PI' },
        { name: 'Dr. Rivera', role: 'Engineer' },
      ],
    }

    mockPrisma.formTemplate.findFirst.mockResolvedValue(template)
    mockPrisma.technology.findUnique.mockResolvedValue(techRecord)
    mockPrisma.technologyAnswer.findMany.mockResolvedValue([])

    const result = await loadTemplateWithBindings({ techId: 'D25-0001' })

    // Response keys use dictionaryKey
    expect(result.initialResponses).toMatchObject({ technologyName: 'Hydration Patch' })
    expect(result.initialRepeatGroups.teamMembers).toHaveLength(2)
    expect(result.answerMetadata.triageNotes.status).toBe('FRESH')
    // internalNote has no loaded dictionary (dictionary: null) - skipped from binding metadata
    expect(result.answerMetadata).not.toHaveProperty('internalNote')
    expect(result.technologyContext).toMatchObject({
      id: 'tech-123',
      techId: 'D25-0001',
      hasTriageStage: true,
      hasViabilityStage: false,
    })
    expect(result.rowVersions.technologyRowVersion).toBe(5)
  })

  it('returns null prefill data when technology lookup fails', async () => {
    const template = buildTemplateFixture()
    mockPrisma.formTemplate.findFirst.mockResolvedValue(template)
    mockPrisma.technology.findUnique.mockResolvedValue(null)

    const result = await loadTemplateWithBindings({ techId: 'unknown' })

    expect(result.initialResponses).toEqual({})
    expect(result.answerMetadata).toEqual({})
  })

  it('fetches template by id with binding metadata', async () => {
    const template = buildTemplateFixture()
    mockPrisma.formTemplate.findUnique.mockResolvedValue(template)

    const result = await fetchTemplateWithBindingsById('tpl-hydration')

    expect(result.template.id).toBe('tpl-hydration')
    // Binding metadata is keyed by dictionaryKey
    expect(result.bindingMetadata.technologyName.dictionaryKey).toBe('technologyName')
  })

  it('throws when fetching a template by id that does not exist', async () => {
    mockPrisma.formTemplate.findUnique.mockResolvedValue(null)

    await expect(fetchTemplateWithBindingsById('missing')).rejects.toThrow(
      'Form template not found for id missing'
    )
  })

  it('collects binding metadata only for questions with loaded dictionaries', () => {
    const template = buildTemplateFixture()
    const metadata = collectBindingMetadata(template)

    // Only includes questions with loaded dictionary (dictionary: object), excludes unloaded (dictionary: null)
    expect(Object.keys(metadata)).toEqual(['technologyName', 'triageNotes', 'teamMembers'])
    expect(metadata.technologyName.bindingPath).toBe('technology.technologyName')
  })

  it('builds submission metadata for scalar and repeatable answers', () => {
    const template = buildTemplateFixture()
    // Use dictionaryKey values for questionCode
    const responses: SubmissionResponseRecord[] = [
      {
        questionCode: 'technologyName',
        value: 'Updated Patch',
        questionRevisionId: 'rev-tech-name',
      },
    ]
    const repeatGroups: SubmissionRepeatGroupRecord[] = [
      {
        questionCode: 'teamMembers',
        rowIndex: 1,
        data: { name: 'Dr. Chen' },
        questionRevisionId: 'rev-team',
      },
      {
        questionCode: 'teamMembers',
        rowIndex: 0,
        data: { name: 'Dr. Rivera' },
        questionRevisionId: 'rev-team',
      },
    ]

    const metadata = buildSubmissionAnswerMetadata(
      template,
      responses,
      repeatGroups,
      { answeredAt: '2025-11-07T12:00:00Z' }
    )

    // Keys are dictionaryKey values
    expect(metadata.technologyName.status).toBe('FRESH')
    expect(metadata.technologyName.answeredAt).toBe('2025-11-07T12:00:00Z')
    expect(metadata.teamMembers.status).toBe('FRESH')
    expect(metadata.teamMembers.dictionaryKey).toBe('teamMembers')
  })

  it('resolves binding values for technology and supplements', () => {
    const techRecord = {
      technologyName: 'Hydration Patch',
      triageStage: { notes: 'Stage notes' },
      viabilityStage: { risk: 'Medium' },
    } as unknown as TechnologyWithSupplements

    expect(resolveBindingValue('technology.technologyName', techRecord)).toBe('Hydration Patch')
    expect(resolveBindingValue('triageStage.notes', techRecord)).toBe('Stage notes')
    expect(resolveBindingValue('viabilityStage.risk', techRecord)).toBe('Medium')
    expect(resolveBindingValue('unknown.field', techRecord)).toBeUndefined()
    expect(resolveBindingValue('technology', techRecord)).toBeUndefined()
  })
})
