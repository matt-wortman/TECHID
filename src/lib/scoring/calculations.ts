// Scoring calculations based on the requirements from questions_broken_out.txt

export interface ScoringInputs {
  missionAlignmentScore: number; // triage.missionAlignmentScore (0-3)
  unmetNeedScore: number;        // triage.unmetNeedScore (0-3)
  ipStrengthScore: number;       // triage.stateOfArtScore (0-3)
  marketSizeScore: number;       // triage.marketScore (0-3)
  patientPopulationScore: number; // triage.reimbursementPath (0-3)
  competitorsScore: number;      // triage.regulatoryPath (0-3)
}

export interface CalculatedScores {
  impactScore: number;      // Mission Alignment 50% + Unmet Need 50%
  valueScore: number;       // IP Strength 50% + Market Score 50%
  marketScore: number;      // Average of (Market Size + Patient Population + Competitors)
  overallScore: number;     // Average of Impact + Value
  recommendation: string;
  recommendationText: string;
}

/**
 * Calculate Market Score as average of sub-criteria
 * Based on triage.marketScore, triage.reimbursementPath, triage.regulatoryPath
 */
export function calculateMarketScore(
  marketSize: number,
  patientPopulation: number,
  competitors: number
): number {
  // Average of the three market criteria
  const marketScore = (marketSize + patientPopulation + competitors) / 3;
  return Math.round(marketScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate Impact Score (Mission Alignment 50% + Unmet Need 50%)
 * Based on triage.missionAlignmentScore and triage.unmetNeedScore
 */
export function calculateImpactScore(
  missionAlignment: number,
  unmetNeed: number
): number {
  const impactScore = (missionAlignment * 0.5) + (unmetNeed * 0.5);
  return Math.round(impactScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate Value Score (IP Strength 50% + Market Score 50%)
 * Based on triage.stateOfArtScore and calculated market score
 */
export function calculateValueScore(
  ipStrength: number,
  marketScore: number
): number {
  const valueScore = (ipStrength * 0.5) + (marketScore * 0.5);
  return Math.round(valueScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate overall score (average of Impact and Value)
 */
export function calculateOverallScore(
  impactScore: number,
  valueScore: number
): number {
  const overallScore = (impactScore + valueScore) / 2;
  return Math.round(overallScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Determine recommendation based on Impact vs Value matrix
 * Uses the same logic as the original Excel scorecard
 */
export function calculateRecommendation(
  impactScore: number,
  valueScore: number
): 'Proceed' | 'Consider Alternative Pathway' | 'Close' {
  // Convert 0-3 scores to percentages for matrix evaluation
  const impactPercent = (impactScore / 3) * 100;
  const valuePercent = (valueScore / 3) * 100;

  // High Impact (>67%) + High Value (>67%) = Proceed
  if (impactPercent > 67 && valuePercent > 67) {
    return 'Proceed';
  }

  // High Impact (>67%) + Medium Value (33-67%) = Proceed
  if (impactPercent > 67 && valuePercent >= 33 && valuePercent <= 67) {
    return 'Proceed';
  }

  // Medium Impact (33-67%) + High Value (>67%) = Proceed
  if (impactPercent >= 33 && impactPercent <= 67 && valuePercent > 67) {
    return 'Proceed';
  }

  // Medium Impact + Medium Value = Consider Alternative Pathway
  if (impactPercent >= 33 && impactPercent <= 67 && valuePercent >= 33 && valuePercent <= 67) {
    return 'Consider Alternative Pathway';
  }

  // Low Impact (<33%) or Low Value (<33%) = Close or Consider Alternative
  if (impactPercent < 33 || valuePercent < 33) {
    // If one dimension is very low, recommend Close
    if (impactPercent < 20 || valuePercent < 20) {
      return 'Close';
    }
    return 'Consider Alternative Pathway';
  }

  // Default fallback
  return 'Consider Alternative Pathway';
}

/**
 * Calculate all scores based on individual criterion scores
 */
export function calculateAllScores(inputs: ScoringInputs): CalculatedScores {
  // Calculate market score from sub-criteria
  const marketScore = calculateMarketScore(
    inputs.marketSizeScore,
    inputs.patientPopulationScore,
    inputs.competitorsScore
  );

  // Calculate composite scores
  const impactScore = calculateImpactScore(
    inputs.missionAlignmentScore,
    inputs.unmetNeedScore
  );

  const valueScore = calculateValueScore(
    inputs.ipStrengthScore,
    marketScore
  );

  const overallScore = calculateOverallScore(impactScore, valueScore);

  // Determine recommendation
  const recommendation = calculateRecommendation(impactScore, valueScore);

  return {
    impactScore,
    valueScore,
    marketScore,
    overallScore,
    recommendation,
    recommendationText: `Based on Impact Score: ${impactScore} and Value Score: ${valueScore}`
  };
}

/**
 * Extract scoring inputs from form responses
 * Responses are keyed by dictionaryKey (e.g., 'triage.missionAlignmentScore')
 */
export function extractScoringInputs(
  responses: Record<string, unknown>
): ScoringInputs {
  return {
    missionAlignmentScore: Number(responses['triage.missionAlignmentScore']) || 0,
    unmetNeedScore: Number(responses['triage.unmetNeedScore']) || 0,
    ipStrengthScore: Number(responses['triage.stateOfArtScore']) || 0,
    marketSizeScore: Number(responses['triage.marketScore']) || 0,
    patientPopulationScore: Number(responses['triage.reimbursementPath']) || 0,
    competitorsScore: Number(responses['triage.regulatoryPath']) || 0,
  };
}

/**
 * Real-time score calculation hook for use in forms
 */
export function useScoreCalculation(responses: Record<string, unknown>): CalculatedScores {
  const inputs = extractScoringInputs(responses);
  return calculateAllScores(inputs);
}

/**
 * Scoring criteria descriptions for UI display
 */
export const scoringCriteria = {
  missionAlignment: {
    0: "Not aligned with institutional mission",
    1: "Aligns with one dimension of mission",
    2: "Aligns with two dimensions of mission",
    3: "Aligns with all dimensions of mission"
  },
  unmetNeed: {
    0: "No significant unmet need or many solutions exist",
    1: "Some unmet need with several competing solutions",
    2: "Clear unmet need with few competing solutions",
    3: "Significant unmet need with minimal competition"
  },
  ipStrength: {
    0: "Weak or no IP protection possible",
    1: "Some IP protection with limitations",
    2: "Good IP protection with moderate strength",
    3: "Strong IP protection with broad claims"
  },
  marketSize: {
    0: "Very small market (<$100M TAM)",
    1: "Small market ($100M-$500M TAM)",
    2: "Medium market ($500M-$2B TAM)",
    3: "Large market (>$2B TAM)"
  },
  patientPopulation: {
    0: "Very small population (<200k patients)",
    1: "Small population (200k-1M patients)",
    2: "Medium population (1M-2.5M patients)",
    3: "Large population (>2.5M patients)"
  },
  competitors: {
    0: "Many competitors (>15)",
    1: "Several competitors (11-15)",
    2: "Few competitors (5-10)",
    3: "Minimal competition (<5)"
  }
};

/**
 * Get recommendation color for UI styling
 */
export function getRecommendationColor(recommendation: string): string {
  switch (recommendation) {
    case 'Proceed':
      return 'text-green-600 bg-green-100';
    case 'Consider Alternative Pathway':
      return 'text-yellow-600 bg-yellow-100';
    case 'Close':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}