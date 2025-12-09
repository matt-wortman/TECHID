import {
  calculateMarketScore,
  calculateImpactScore,
  calculateValueScore,
  calculateOverallScore,
  calculateRecommendation,
  calculateAllScores,
  extractScoringInputs,
  getRecommendationColor,
  ScoringInputs,
} from './calculations';

describe('scoring calculations', () => {
  describe('calculateMarketScore', () => {
    it('returns 0 for minimum boundary inputs', () => {
      expect(calculateMarketScore(0, 0, 0)).toBe(0);
    });

    it('returns 3 for maximum boundary inputs', () => {
      expect(calculateMarketScore(3, 3, 3)).toBe(3);
    });

    it('calculates average correctly', () => {
      expect(calculateMarketScore(1, 2, 3)).toBe(2);
    });

    it('rounds to 2 decimal places', () => {
      // (1 + 1 + 2) / 3 = 1.333...
      expect(calculateMarketScore(1, 1, 2)).toBe(1.33);
    });

    it('handles uniform values', () => {
      expect(calculateMarketScore(1, 1, 1)).toBe(1);
      expect(calculateMarketScore(2, 2, 2)).toBe(2);
    });

    it('handles decimal inputs', () => {
      // (1.5 + 1.5 + 1.5) / 3 = 1.5
      expect(calculateMarketScore(1.5, 1.5, 1.5)).toBe(1.5);
    });
  });

  describe('calculateImpactScore', () => {
    it('calculates 50/50 weighted blend correctly', () => {
      // (2 * 0.5) + (2 * 0.5) = 2
      expect(calculateImpactScore(2, 2)).toBe(2);
    });

    it('returns max score for max inputs', () => {
      expect(calculateImpactScore(3, 3)).toBe(3);
    });

    it('returns 0 for zero inputs', () => {
      expect(calculateImpactScore(0, 0)).toBe(0);
    });

    it('handles asymmetric inputs', () => {
      // (0 * 0.5) + (3 * 0.5) = 1.5
      expect(calculateImpactScore(0, 3)).toBe(1.5);
      // (3 * 0.5) + (0 * 0.5) = 1.5
      expect(calculateImpactScore(3, 0)).toBe(1.5);
    });

    it('rounds to 2 decimal places', () => {
      // (1 * 0.5) + (2 * 0.5) = 1.5
      expect(calculateImpactScore(1, 2)).toBe(1.5);
    });
  });

  describe('calculateValueScore', () => {
    it('calculates 50/50 weighted blend correctly', () => {
      // (2 * 0.5) + (2 * 0.5) = 2
      expect(calculateValueScore(2, 2)).toBe(2);
    });

    it('returns max score for max inputs', () => {
      expect(calculateValueScore(3, 3)).toBe(3);
    });

    it('returns 0 for zero inputs', () => {
      expect(calculateValueScore(0, 0)).toBe(0);
    });

    it('handles asymmetric inputs', () => {
      // (0 * 0.5) + (3 * 0.5) = 1.5
      expect(calculateValueScore(0, 3)).toBe(1.5);
      // (3 * 0.5) + (0 * 0.5) = 1.5
      expect(calculateValueScore(3, 0)).toBe(1.5);
    });

    it('rounds to 2 decimal places', () => {
      // (1.5 * 0.5) + (2.5 * 0.5) = 2
      expect(calculateValueScore(1.5, 2.5)).toBe(2);
    });
  });

  describe('calculateOverallScore', () => {
    it('calculates average of impact and value', () => {
      // (2 + 2) / 2 = 2
      expect(calculateOverallScore(2, 2)).toBe(2);
    });

    it('returns max score for max inputs', () => {
      expect(calculateOverallScore(3, 3)).toBe(3);
    });

    it('returns 0 for zero inputs', () => {
      expect(calculateOverallScore(0, 0)).toBe(0);
    });

    it('handles asymmetric inputs', () => {
      // (0 + 3) / 2 = 1.5
      expect(calculateOverallScore(0, 3)).toBe(1.5);
      expect(calculateOverallScore(3, 0)).toBe(1.5);
    });

    it('rounds to 2 decimal places', () => {
      // (1 + 2) / 2 = 1.5
      expect(calculateOverallScore(1, 2)).toBe(1.5);
    });
  });

  describe('calculateRecommendation', () => {
    describe('Proceed recommendations', () => {
      it('returns Proceed for high impact and high value (>67%)', () => {
        // 2.5/3 = 83.3% > 67%
        expect(calculateRecommendation(2.5, 2.5)).toBe('Proceed');
        expect(calculateRecommendation(3, 3)).toBe('Proceed');
      });

      it('returns Proceed for high impact (>67%) and medium value (33-67%)', () => {
        // Impact: 2.5/3 = 83.3% > 67%
        // Value: 1.5/3 = 50% (33-67%)
        expect(calculateRecommendation(2.5, 1.5)).toBe('Proceed');
      });

      it('returns Proceed for medium impact (33-67%) and high value (>67%)', () => {
        // Impact: 1.5/3 = 50% (33-67%)
        // Value: 2.5/3 = 83.3% > 67%
        expect(calculateRecommendation(1.5, 2.5)).toBe('Proceed');
      });
    });

    describe('Consider Alternative Pathway recommendations', () => {
      it('returns Consider Alternative Pathway for medium impact and medium value', () => {
        // Both: 1.5/3 = 50% (33-67%)
        expect(calculateRecommendation(1.5, 1.5)).toBe('Consider Alternative Pathway');
      });

      it('returns Consider Alternative Pathway for low impact with any value', () => {
        // Impact: 0.8/3 = 26.7% < 33%
        // Value: 2.5/3 = 83.3% (high)
        expect(calculateRecommendation(0.8, 2.5)).toBe('Consider Alternative Pathway');
      });

      it('returns Consider Alternative Pathway for any impact with low value', () => {
        // Impact: 2.5/3 = 83.3% (high)
        // Value: 0.8/3 = 26.7% < 33%
        expect(calculateRecommendation(2.5, 0.8)).toBe('Consider Alternative Pathway');
      });
    });

    describe('Close recommendations', () => {
      it('returns Close for very low impact (<20%)', () => {
        // Impact: 0.5/3 = 16.7% < 20%
        expect(calculateRecommendation(0.5, 2.5)).toBe('Close');
      });

      it('returns Close for very low value (<20%)', () => {
        // Value: 0.5/3 = 16.7% < 20%
        expect(calculateRecommendation(2.5, 0.5)).toBe('Close');
      });

      it('returns Close for very low impact and value', () => {
        // Both: 0.3/3 = 10% < 20%
        expect(calculateRecommendation(0.3, 0.3)).toBe('Close');
      });

      it('returns Close for zero inputs', () => {
        expect(calculateRecommendation(0, 0)).toBe('Close');
      });
    });

    describe('boundary value tests', () => {
      it('handles exact 67% boundary for high threshold', () => {
        // 2.01/3 = 67% exactly at boundary
        const exactBoundary = 2.01;
        // Score at exactly 67% should be considered medium (<=67), not high (>67)
        expect(calculateRecommendation(exactBoundary, exactBoundary)).toBe('Consider Alternative Pathway');
      });

      it('handles just above 67% boundary', () => {
        // 2.02/3 = 67.3% just above 67%
        const justAbove = 2.02;
        expect(calculateRecommendation(justAbove, justAbove)).toBe('Proceed');
      });

      it('handles exact 33% boundary for medium threshold', () => {
        // 0.99/3 = 33% exactly at boundary
        const exactBoundary = 0.99;
        // Score at exactly 33% should be considered medium (>=33), not low (<33)
        expect(calculateRecommendation(exactBoundary, exactBoundary)).toBe('Consider Alternative Pathway');
      });

      it('handles exact 20% boundary for close threshold', () => {
        // 0.6/3 = 20% exactly at boundary
        const exactBoundary = 0.6;
        // Score at exactly 20% should NOT trigger Close (requires <20%)
        expect(calculateRecommendation(exactBoundary, exactBoundary)).toBe('Consider Alternative Pathway');
      });

      it('handles just below 20% boundary', () => {
        // 0.59/3 = 19.7% just below 20%
        const justBelow = 0.59;
        expect(calculateRecommendation(justBelow, 2.5)).toBe('Close');
      });
    });
  });

  describe('calculateAllScores', () => {
    it('calculates all scores from inputs', () => {
      const inputs: ScoringInputs = {
        missionAlignmentScore: 3,
        unmetNeedScore: 3,
        ipStrengthScore: 3,
        marketSizeScore: 3,
        patientPopulationScore: 3,
        competitorsScore: 3,
      };

      const result = calculateAllScores(inputs);

      expect(result.marketScore).toBe(3);
      expect(result.impactScore).toBe(3);
      expect(result.valueScore).toBe(3);
      expect(result.overallScore).toBe(3);
      expect(result.recommendation).toBe('Proceed');
      expect(result.recommendationText).toContain('Impact Score: 3');
      expect(result.recommendationText).toContain('Value Score: 3');
    });

    it('handles zero inputs', () => {
      const inputs: ScoringInputs = {
        missionAlignmentScore: 0,
        unmetNeedScore: 0,
        ipStrengthScore: 0,
        marketSizeScore: 0,
        patientPopulationScore: 0,
        competitorsScore: 0,
      };

      const result = calculateAllScores(inputs);

      expect(result.marketScore).toBe(0);
      expect(result.impactScore).toBe(0);
      expect(result.valueScore).toBe(0);
      expect(result.overallScore).toBe(0);
      expect(result.recommendation).toBe('Close');
    });

    it('calculates correctly with mixed inputs', () => {
      const inputs: ScoringInputs = {
        missionAlignmentScore: 2,
        unmetNeedScore: 3,
        ipStrengthScore: 2,
        marketSizeScore: 1,
        patientPopulationScore: 2,
        competitorsScore: 3,
      };

      const result = calculateAllScores(inputs);

      // Market: (1 + 2 + 3) / 3 = 2
      expect(result.marketScore).toBe(2);
      // Impact: (2 * 0.5) + (3 * 0.5) = 2.5
      expect(result.impactScore).toBe(2.5);
      // Value: (2 * 0.5) + (2 * 0.5) = 2
      expect(result.valueScore).toBe(2);
      // Overall: (2.5 + 2) / 2 = 2.25
      expect(result.overallScore).toBe(2.25);
    });
  });

  describe('extractScoringInputs', () => {
    it('extracts values from responses using dictionary keys', () => {
      const responses = {
        'triage.missionAlignmentScore': 3,
        'triage.unmetNeedScore': 2,
        'triage.stateOfArtScore': 2.5,
        'triage.marketScore': 1,
        'triage.reimbursementPath': 2,
        'triage.regulatoryPath': 3,
      };

      const result = extractScoringInputs(responses);

      expect(result.missionAlignmentScore).toBe(3);
      expect(result.unmetNeedScore).toBe(2);
      expect(result.ipStrengthScore).toBe(2.5);
      expect(result.marketSizeScore).toBe(1);
      expect(result.patientPopulationScore).toBe(2);
      expect(result.competitorsScore).toBe(3);
    });

    it('defaults missing keys to 0', () => {
      const responses = {
        'triage.missionAlignmentScore': 2,
      };

      const result = extractScoringInputs(responses);

      expect(result.missionAlignmentScore).toBe(2);
      expect(result.unmetNeedScore).toBe(0);
      expect(result.ipStrengthScore).toBe(0);
      expect(result.marketSizeScore).toBe(0);
      expect(result.patientPopulationScore).toBe(0);
      expect(result.competitorsScore).toBe(0);
    });

    it('coerces string values to numbers', () => {
      const responses = {
        'triage.missionAlignmentScore': '3' as unknown,
        'triage.unmetNeedScore': '2.5' as unknown,
      };

      const result = extractScoringInputs(responses as Record<string, unknown>);

      expect(result.missionAlignmentScore).toBe(3);
      expect(result.unmetNeedScore).toBe(2.5);
    });

    it('handles non-numeric values by defaulting to 0', () => {
      const responses = {
        'triage.missionAlignmentScore': 'invalid',
        'triage.unmetNeedScore': null,
        'triage.stateOfArtScore': undefined,
      };

      const result = extractScoringInputs(responses as Record<string, unknown>);

      expect(result.missionAlignmentScore).toBe(0); // NaN from Number('invalid') || 0
      expect(result.unmetNeedScore).toBe(0);
      expect(result.ipStrengthScore).toBe(0);
    });

    it('handles empty response object', () => {
      const result = extractScoringInputs({});

      expect(result.missionAlignmentScore).toBe(0);
      expect(result.unmetNeedScore).toBe(0);
      expect(result.ipStrengthScore).toBe(0);
      expect(result.marketSizeScore).toBe(0);
      expect(result.patientPopulationScore).toBe(0);
      expect(result.competitorsScore).toBe(0);
    });
  });

  describe('getRecommendationColor', () => {
    it('returns green classes for Proceed', () => {
      const result = getRecommendationColor('Proceed');
      expect(result).toBe('text-green-600 bg-green-100');
    });

    it('returns yellow classes for Consider Alternative Pathway', () => {
      const result = getRecommendationColor('Consider Alternative Pathway');
      expect(result).toBe('text-yellow-600 bg-yellow-100');
    });

    it('returns red classes for Close', () => {
      const result = getRecommendationColor('Close');
      expect(result).toBe('text-red-600 bg-red-100');
    });

    it('returns gray classes for unknown recommendations', () => {
      const result = getRecommendationColor('Unknown');
      expect(result).toBe('text-gray-600 bg-gray-100');
    });

    it('returns gray classes for empty string', () => {
      const result = getRecommendationColor('');
      expect(result).toBe('text-gray-600 bg-gray-100');
    });
  });
});
