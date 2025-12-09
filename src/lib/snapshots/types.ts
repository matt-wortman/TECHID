import { TechStage, TechStatus, SnapshotType } from '@prisma/client'
import { RowVersionSnapshot } from '@/lib/technology/types'

/**
 * Frozen form answers captured at submission time
 */
export interface SnapshotFormAnswers {
  /** All question responses keyed by dictionaryKey */
  responses: Record<string, unknown>
  /** All repeatable group/data table responses keyed by dictionaryKey */
  repeatGroups: Record<string, Record<string, unknown>[]>
  /** Question revision IDs at time of capture (for audit trail) */
  questionRevisions: Record<string, string | null>
}

/**
 * Frozen TriageStage data captured at submission time
 */
export interface SnapshotTriageStage {
  missionAlignmentScore: number
  missionAlignmentText: string
  unmetNeedScore: number
  unmetNeedText: string
  stateOfArtScore: number
  stateOfArtText: string
  marketScore: number
  marketOverview: string
  impactScore: number
  valueScore: number
  recommendation: string
  recommendationNotes?: string
}

/**
 * Frozen ViabilityStage data captured at submission time
 */
export interface SnapshotViabilityStage {
  technicalFeasibility: string
  regulatoryPathway: string
  costAnalysis: string
  timeToMarket?: number
  resourceRequirements: string
  riskAssessment: string
  technicalScore: number
  commercialScore: number
  overallViability: string
}

/**
 * Frozen Technology metadata captured at submission time
 */
export interface SnapshotTechnologyMeta {
  /** Technology ID (internal) */
  id: string
  /** Human-readable tech ID (e.g., "TECH-2025-042") */
  techId: string
  technologyName: string
  shortDescription?: string
  inventorName: string
  inventorTitle?: string
  inventorDept?: string
  reviewerName: string
  domainAssetClass: string
  currentStage: TechStage
  status: TechStatus
  /** Row versions at capture time for audit trail */
  rowVersions: RowVersionSnapshot
  /** Frozen triage stage data (if available) */
  triageStage?: SnapshotTriageStage
  /** Frozen viability stage data (if available) */
  viabilityStage?: SnapshotViabilityStage
}

/**
 * Frozen calculated scores at submission time
 */
export interface SnapshotCalculatedScores {
  impactScore?: number
  valueScore?: number
  marketScore?: number
  overallScore?: number
  recommendation?: string
  [key: string]: unknown // Allow additional score types
}

/**
 * Options for capturing a submission snapshot
 */
export interface CaptureSnapshotOptions {
  submissionId: string
  templateId: string
  responses: Record<string, unknown>
  repeatGroups: Record<string, unknown>
  calculatedScores?: Record<string, unknown>
  technologyId?: string | null
  capturedBy: string
  snapshotType?: SnapshotType
}

/**
 * Result from snapshot capture operation
 */
export interface CaptureSnapshotResult {
  success: boolean
  snapshotId?: string
  error?: string
}

/**
 * Full snapshot data for viewing
 */
export interface SnapshotDetailData {
  snapshotId: string
  capturedAt: Date
  capturedBy: string
  snapshotType: SnapshotType
  templateId: string
  templateVersion: string
  formAnswers: SnapshotFormAnswers
  technologyMeta: SnapshotTechnologyMeta | null
  calculatedScores: SnapshotCalculatedScores | null
  submission: {
    id: string
    status: string
    submittedAt: Date | null
    submittedBy: string
  }
}

/**
 * Summary info for listing snapshots
 */
export interface SnapshotSummary {
  id: string
  capturedAt: Date
  capturedBy: string
  snapshotType: SnapshotType
  templateVersion: string
}
