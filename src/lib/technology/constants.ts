import { Technology, TriageStage, ViabilityStage } from '@prisma/client';

export const TECHNOLOGY_BINDABLE_FIELDS = new Set<
  keyof Technology
>([
  'techId',
  'technologyName',
  'shortDescription',
  'inventorName',
  'inventorTitle',
  'inventorDept',
  'reviewerName',
  'domainAssetClass',
  'currentStage',
  'status',
  'lastStageTouched',
  'lastModifiedBy',
  'lastModifiedAt',
]);

export const REQUIRED_TECH_FIELDS_FOR_CREATE: Array<keyof Technology> = [
  'technologyName',
  'inventorName',
  'reviewerName',
  'domainAssetClass',
];

export const TRIAGE_STAGE_BINDABLE_FIELDS = new Set<keyof TriageStage>([
  'technologyOverview',
  'missionAlignmentText',
  'missionAlignmentScore',
  'recommendation',
  'recommendationNotes',
  'unmetNeedText',
  'unmetNeedScore',
  'stateOfArtText',
  'stateOfArtScore',
  'marketOverview',
  'marketScore',
  'impactScore',
  'valueScore',
]);

export const VIABILITY_STAGE_BINDABLE_FIELDS = new Set<keyof ViabilityStage>([
  'technicalFeasibility',
  'regulatoryPathway',
  'costAnalysis',
  'timeToMarket',
  'resourceRequirements',
  'riskAssessment',
  'technicalScore',
  'commercialScore',
  'overallViability',
]);
