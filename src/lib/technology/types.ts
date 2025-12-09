export interface RowVersionSnapshot {
  technologyRowVersion?: number;
  triageStageRowVersion?: number;
  viabilityStageRowVersion?: number;
}

export interface TechnologyContext {
  id: string;
  techId: string;
  hasTriageStage: boolean;
  hasViabilityStage: boolean;
  technologyRowVersion?: number;
  triageStageRowVersion?: number;
  viabilityStageRowVersion?: number;
}

export class OptimisticLockError extends Error {
  constructor(message = 'Row version mismatch') {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

export type AnswerSource =
  | 'technology'
  | 'triageStage'
  | 'viabilityStage'
  | 'submission'
  | 'technologyAnswer';

export interface VersionedAnswer {
  value: unknown;
  questionRevisionId?: string | null;
  answeredAt?: string | null;
  source?: AnswerSource;
}

export type AnswerStatus = 'MISSING' | 'FRESH' | 'STALE' | 'UNKNOWN';

export interface AnswerStatusDetail {
  status: AnswerStatus;
  dictionaryKey?: string;
  savedRevisionId?: string | null;
  currentRevisionId?: string | null;
  answeredAt?: string | null;
  source?: AnswerSource;
}
