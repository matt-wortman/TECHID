/**
 * @jest-environment node
 */
import { DataSource } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { applyBindingWrites, BindingMetadata } from '@/lib/technology/service';

const buildBindingMetadata = (
  overrides: Partial<BindingMetadata> & Pick<BindingMetadata, 'bindingPath'>
): BindingMetadata => ({
  questionId: overrides.questionId ?? `${overrides.bindingPath}-question`,
  dictionaryKey: overrides.dictionaryKey ?? `${overrides.bindingPath}-key`,
  dataSource: overrides.dataSource ?? DataSource.TECHNOLOGY,
  bindingPath: overrides.bindingPath,
  currentRevisionId: overrides.currentRevisionId ?? `${overrides.bindingPath}-rev`,
  currentVersion: overrides.currentVersion ?? 1,
});

describe('applyBindingWrites', () => {
  const technologyFindUnique = jest.fn();
  const technologyUpdate = jest.fn();
  const technologyUpdateMany = jest.fn();
  const technologyCreate = jest.fn();
  const triageStageUpdate = jest.fn();
  const triageStageUpdateMany = jest.fn();
  const triageStageCreate = jest.fn();
  const triageStageFindUnique = jest.fn();
  const viabilityStageUpdate = jest.fn();
  const viabilityStageUpdateMany = jest.fn();
  const viabilityStageCreate = jest.fn();
  const viabilityStageFindUnique = jest.fn();
  const technologyAnswerUpsert = jest.fn();

  const mockTx = {
    technology: {
      findUnique: technologyFindUnique,
      update: technologyUpdate,
      updateMany: technologyUpdateMany,
      create: technologyCreate,
    },
    triageStage: {
      update: triageStageUpdate,
      updateMany: triageStageUpdateMany,
      create: triageStageCreate,
      findUnique: triageStageFindUnique,
    },
    viabilityStage: {
      update: viabilityStageUpdate,
      updateMany: viabilityStageUpdateMany,
      create: viabilityStageCreate,
      findUnique: viabilityStageFindUnique,
    },
    technologyAnswer: {
      upsert: technologyAnswerUpsert,
    },
  } as unknown as Prisma.TransactionClient;

// Binding metadata is keyed by dictionaryKey
const baseBindings: Record<string, BindingMetadata> = {
  'tech.techId': buildBindingMetadata({
    dictionaryKey: 'tech.techId',
    bindingPath: 'technology.techId',
  }),
  'tech.name': buildBindingMetadata({
    dictionaryKey: 'tech.name',
    bindingPath: 'technology.technologyName',
  }),
  'triage.overview': buildBindingMetadata({
    dictionaryKey: 'triage.overview',
    bindingPath: 'triageStage.technologyOverview',
    dataSource: DataSource.STAGE_SUPPLEMENT,
  }),
  'triage.missionScore': buildBindingMetadata({
    dictionaryKey: 'triage.missionScore',
    bindingPath: 'triageStage.missionAlignmentScore',
    dataSource: DataSource.STAGE_SUPPLEMENT,
  }),
  'tech.inventorName': buildBindingMetadata({
    dictionaryKey: 'tech.inventorName',
    bindingPath: 'technology.inventorName',
  }),
  'tech.reviewerName': buildBindingMetadata({
    dictionaryKey: 'tech.reviewerName',
    bindingPath: 'technology.reviewerName',
  }),
  'tech.domainAssetClass': buildBindingMetadata({
    dictionaryKey: 'tech.domainAssetClass',
    bindingPath: 'technology.domainAssetClass',
  }),
  'viability.feasibility': buildBindingMetadata({
    dictionaryKey: 'viability.feasibility',
    bindingPath: 'viabilityStage.technicalFeasibility',
    dataSource: DataSource.STAGE_SUPPLEMENT,
  }),
};

  beforeEach(() => {
    jest.clearAllMocks();
    technologyUpdateMany.mockResolvedValue({ count: 1 });
    triageStageCreate.mockResolvedValue({ rowVersion: 1 });
    triageStageFindUnique.mockResolvedValue({ rowVersion: 2 });
    triageStageUpdateMany.mockResolvedValue({ count: 1 });
    viabilityStageCreate.mockResolvedValue({ rowVersion: 1 });
    viabilityStageFindUnique.mockResolvedValue({ rowVersion: 2 });
    viabilityStageUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('updates existing technology and triage stage fields', async () => {
    technologyFindUnique.mockResolvedValue({
      id: 'tech-1',
      techId: 'D25-0001',
      triageStage: { id: 'triage-1' },
      viabilityStage: null,
    });

    // Responses are keyed by dictionaryKey (matching baseBindings keys)
    const responses = {
      'tech.techId': 'D25-0001',
      'tech.name': 'Smart Patch',
      'triage.overview': 'Updated overview',
      'triage.missionScore': 3,
    };

    const result = await applyBindingWrites(mockTx, baseBindings, responses, {
      userId: 'tester',
    });

    expect(result).toMatchObject({ technologyId: 'tech-1', techId: 'D25-0001' });
    expect(technologyUpdate).toHaveBeenCalledWith({
      where: { id: 'tech-1' },
      data: expect.objectContaining({
        technologyName: 'Smart Patch',
        lastModifiedBy: 'tester',
        rowVersion: { increment: 1 },
      }),
    });
    expect(triageStageUpdate).toHaveBeenCalledWith({
      where: { id: 'triage-1' },
      data: expect.objectContaining({
        technologyOverview: 'Updated overview',
        missionAlignmentScore: 3,
        extendedData: expect.objectContaining({
          // extendedData is keyed by dictionaryKey
          'triage.overview': expect.objectContaining({
            value: 'Updated overview',
            questionRevisionId: 'triageStage.technologyOverview-rev',
          }),
          'triage.missionScore': expect.objectContaining({
            value: 3,
            questionRevisionId: 'triageStage.missionAlignmentScore-rev',
          }),
        }),
        rowVersion: { increment: 1 },
      }),
    });
    expect(triageStageCreate).not.toHaveBeenCalled();
  });

  it('creates a technology record when required fields are present', async () => {
    technologyFindUnique.mockResolvedValue(null);
    technologyCreate.mockResolvedValue({
      id: 'tech-2',
      techId: 'D25-0002',
      triageStage: null,
      viabilityStage: null,
    });

    // Responses are keyed by dictionaryKey (matching baseBindings keys)
    const responses = {
      'tech.techId': 'D25-0002',
      'tech.name': 'Glucose Monitor',
      'triage.overview': 'New tech overview',
      'triage.missionScore': 4,
      'tech.inventorName': 'Dr. Jane Smith',
      'tech.reviewerName': 'Alex Johnson',
      'tech.domainAssetClass': 'Digital Health',
    };

    const result = await applyBindingWrites(mockTx, baseBindings, responses, {
      userId: 'tester',
      allowCreateWhenIncomplete: true,
    });

    expect(result).toMatchObject({ technologyId: 'tech-2', techId: 'D25-0002' });
    expect(technologyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        techId: 'D25-0002',
        technologyName: 'Glucose Monitor',
        lastModifiedBy: 'tester',
      }),
      include: expect.any(Object),
    });
    expect(triageStageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        technology: { connect: { id: 'tech-2' } },
        technologyOverview: 'New tech overview',
      }),
    });
  });

  it('returns empty result when techId is missing', async () => {
    // Responses are keyed by dictionaryKey (matching baseBindings keys)
    const responses = {
      'tech.name': 'Missing ID',
      'triage.overview': 'No tech id provided',
    };

    const result = await applyBindingWrites(mockTx, baseBindings, responses, {});

    expect(result).toEqual({});
    expect(technologyFindUnique).not.toHaveBeenCalled();
  });

  it('skips create when allowCreateWhenIncomplete=false and required fields missing', async () => {
    technologyFindUnique.mockResolvedValue(null);

    // Responses are keyed by dictionaryKey (matching baseBindings keys)
    const responses = {
      'tech.techId': 'D25-0003',
      'triage.overview': 'Incomplete create payload',
    };

    const result = await applyBindingWrites(mockTx, baseBindings, responses, {
      allowCreateWhenIncomplete: false,
    });

    expect(result).toEqual({});
    expect(technologyCreate).not.toHaveBeenCalled();
  });

  it('creates or updates viability stage values when provided', async () => {
    technologyFindUnique.mockResolvedValue({
      id: 'tech-4',
      techId: 'D25-0004',
      triageStage: null,
      viabilityStage: { id: 'viability-1' },
    });

    // Responses are keyed by dictionaryKey (matching baseBindings keys)
    const responses = {
      'tech.techId': 'D25-0004',
      'tech.name': 'Nano Sensor',
      'viability.feasibility': 'Feasible with further testing',
    };

    await applyBindingWrites(mockTx, baseBindings, responses, {
      userId: 'tester',
    });

    expect(viabilityStageUpdate).toHaveBeenCalledWith({
      where: { id: 'viability-1' },
      data: expect.objectContaining({
        technicalFeasibility: 'Feasible with further testing',
        extendedData: expect.objectContaining({
          // extendedData is keyed by dictionaryKey
          'viability.feasibility': expect.objectContaining({
            value: 'Feasible with further testing',
            questionRevisionId: 'viabilityStage.technicalFeasibility-rev',
          }),
        }),
        rowVersion: { increment: 1 },
      }),
    });
    expect(viabilityStageCreate).not.toHaveBeenCalled();
  });

  it('throws when triage stage optimistic locking fails', async () => {
    technologyFindUnique.mockResolvedValue({
      id: 'tech-lock',
      techId: 'D25-0005',
      triageStage: { id: 'triage-lock', rowVersion: 1 },
      viabilityStage: null,
    });
    triageStageUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      applyBindingWrites(
        mockTx,
        baseBindings,
        {
          // Responses are keyed by dictionaryKey (matching baseBindings keys)
          'tech.techId': 'D25-0005',
          'triage.overview': 'Attempted update',
        },
        {
          expectedVersions: { triageStageRowVersion: 99 },
        }
      )
    ).rejects.toThrow('Triage stage was modified by another user');
  });
});
