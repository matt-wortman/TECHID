import React from 'react';
import { render } from '@testing-library/react';
import { FieldType } from '@prisma/client';
import {
  PrintableFormData,
  PrintableSection,
  PrintableQuestionAnswer,
  PrintableScoringMatrix,
  PrintableImpactValueMatrix,
} from './types';

// Mock @react-pdf/renderer to avoid ESM issues
jest.mock('@react-pdf/renderer', () => {
  const MockComponent = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('div', { 'data-testid': 'pdf-mock', ...props }, children);

  return {
    Document: MockComponent,
    Page: MockComponent,
    View: MockComponent,
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('span', { 'data-testid': 'pdf-text' }, children),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
  };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (Number.isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return `Formatted: ${date.toISOString()} (${formatStr})`;
  }),
}));

// Import after mocks
import { FormPdfDocument } from './FormPdfDocument';

// Helper to create test data
function createTestMetadata(overrides: Partial<PrintableFormData['metadata']> = {}): PrintableFormData['metadata'] {
  return {
    templateName: 'Test Form',
    templateVersion: '1.0.0',
    exportedAt: '2025-01-15T10:00:00.000Z',
    statusLabel: 'Submitted',
    ...overrides,
  };
}

function createTestQuestion(overrides: Partial<PrintableQuestionAnswer> = {}): PrintableQuestionAnswer {
  return {
    questionKey: 'test.question',
    label: 'Test Question',
    isRequired: false,
    type: FieldType.SHORT_TEXT,
    answerText: 'Test Answer',
    ...overrides,
  };
}

function createTestSection(overrides: Partial<PrintableSection> = {}): PrintableSection {
  return {
    id: 'section-1',
    title: 'Test Section',
    questions: [createTestQuestion()],
    ...overrides,
  };
}

function createTestScoringMatrix(): PrintableScoringMatrix {
  return {
    sections: [
      {
        key: 'IMPACT',
        title: 'Impact Score',
        accentColor: '#dbeafe',
        headerTextColor: '#1e40af',
        rowBackground: '#f0f9ff',
        rows: [
          { type: 'criterion', label: 'Mission Alignment', score: '2.50', weight: '50%', total: '1.25' },
          { type: 'criterion', label: 'Unmet Need', score: '3.00', weight: '50%', total: '1.50' },
        ],
        summaryLabel: 'Impact Score',
        summaryValue: '2.75',
      },
      {
        key: 'VALUE',
        title: 'Value Score',
        accentColor: '#dcfce7',
        headerTextColor: '#166534',
        rowBackground: '#f0fdf4',
        rows: [
          { type: 'criterion', label: 'State of Art', score: '2.00', weight: '50%', total: '1.00' },
          { type: 'criterion', label: 'Market Score', score: '2.00', weight: '50%', total: '1.00' },
        ],
        summaryLabel: 'Value Score',
        summaryValue: '2.00',
      },
    ],
    marketSubCriteria: [
      { type: 'subcriterion', label: 'TAM/SAM', score: '2.00' },
      { type: 'subcriterion', label: 'Patient Population', score: '2.00' },
      { type: 'subcriterion', label: 'Competitors', score: '2.00' },
    ],
    impactScore: '2.75',
    valueScore: '2.00',
    overallScore: '2.38',
    marketScore: '2.00',
  };
}

function createTestImpactValueMatrix(): PrintableImpactValueMatrix {
  return {
    impactScore: 2.75,
    valueScore: 2.00,
    recommendation: 'Proceed',
    recommendationText: 'Strong recommendation to proceed',
    dotPosition: { x: 0.67, y: 0.92 },
  };
}

function createTestFormData(overrides: Partial<PrintableFormData> = {}): PrintableFormData {
  return {
    metadata: createTestMetadata(),
    sections: [createTestSection()],
    ...overrides,
  };
}

describe('FormPdfDocument', () => {
  describe('basic rendering', () => {
    it('renders without throwing', () => {
      const data = createTestFormData();
      expect(() => render(<FormPdfDocument data={data} />)).not.toThrow();
    });

    it('renders with empty sections array', () => {
      const data = createTestFormData({ sections: [] });
      expect(() => render(<FormPdfDocument data={data} />)).not.toThrow();
    });

    it('renders template name and version', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          templateName: 'My Test Form',
          templateVersion: '2.5.0',
        }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('My Test Form')).toBeInTheDocument();
      expect(getByText('Version 2.5.0')).toBeInTheDocument();
    });

    it('renders template description when provided', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          templateDescription: 'A detailed description of the form',
        }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('A detailed description of the form')).toBeInTheDocument();
    });

    it('renders status label', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({ statusLabel: 'Reviewed' }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Reviewed')).toBeInTheDocument();
    });
  });

  describe('metadata fields', () => {
    it('renders techId when provided', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({ techId: 'TECH-001' }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('TECH-001')).toBeInTheDocument();
    });

    it('renders submissionId when provided', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({ submissionId: 'sub-12345' }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('sub-12345')).toBeInTheDocument();
    });

    it('renders submittedBy when provided', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({ submittedBy: 'user@example.com' }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('user@example.com')).toBeInTheDocument();
    });

    it('renders notes when provided', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({ notes: 'Important notes about this submission' }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Important notes about this submission')).toBeInTheDocument();
    });

    it('does not render optional fields when null', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          techId: null,
          submissionId: undefined,
          submittedBy: null,
          notes: null,
        }),
      });
      const { queryByText } = render(<FormPdfDocument data={data} />);
      expect(queryByText('Technology ID')).not.toBeInTheDocument();
      expect(queryByText('Submission ID')).not.toBeInTheDocument();
      expect(queryByText('Submitted By')).not.toBeInTheDocument();
      expect(queryByText('Notes')).not.toBeInTheDocument();
    });
  });

  describe('sections rendering', () => {
    it('renders section title', () => {
      const data = createTestFormData({
        sections: [createTestSection({ title: 'Basic Information' })],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Basic Information')).toBeInTheDocument();
    });

    it('renders section description when provided', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({
            title: 'Section With Description',
            description: 'This section contains important questions.',
          }),
        ],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('This section contains important questions.')).toBeInTheDocument();
    });

    it('renders multiple sections', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({ id: 'sec-1', title: 'Section One' }),
          createTestSection({ id: 'sec-2', title: 'Section Two' }),
          createTestSection({ id: 'sec-3', title: 'Section Three' }),
        ],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Section One')).toBeInTheDocument();
      expect(getByText('Section Two')).toBeInTheDocument();
      expect(getByText('Section Three')).toBeInTheDocument();
    });
  });

  describe('questions rendering', () => {
    it('renders question label with number', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({
            questions: [createTestQuestion({ label: 'Technology Name' })],
          }),
        ],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('1. Technology Name')).toBeInTheDocument();
    });

    it('numbers questions sequentially across sections', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({
            id: 'sec-1',
            questions: [
              createTestQuestion({ questionKey: 'q1', label: 'First' }),
              createTestQuestion({ questionKey: 'q2', label: 'Second' }),
            ],
          }),
          createTestSection({
            id: 'sec-2',
            questions: [
              createTestQuestion({ questionKey: 'q3', label: 'Third' }),
            ],
          }),
        ],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('1. First')).toBeInTheDocument();
      expect(getByText('2. Second')).toBeInTheDocument();
      expect(getByText('3. Third')).toBeInTheDocument();
    });

    it('renders answer text', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({
            questions: [createTestQuestion({ answerText: 'My answer value' })],
          }),
        ],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('My answer value')).toBeInTheDocument();
    });

    it('renders em dash for empty answers', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({
            questions: [createTestQuestion({ answerText: '—' })],
          }),
        ],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('—')).toBeInTheDocument();
    });
  });

  describe('repeat group rows', () => {
    it('renders repeat group rows', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({
            questions: [
              createTestQuestion({
                questionKey: 'test.repeat',
                label: 'Inventors',
                type: FieldType.REPEATABLE_GROUP,
                repeatGroupRows: [
                  {
                    index: 1,
                    values: [
                      { field: 'Name', value: 'John Doe' },
                      { field: 'Email', value: 'john@example.com' },
                    ],
                  },
                  {
                    index: 2,
                    values: [
                      { field: 'Name', value: 'Jane Smith' },
                      { field: 'Email', value: 'jane@example.com' },
                    ],
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Row 1')).toBeInTheDocument();
      expect(getByText('Row 2')).toBeInTheDocument();
      expect(getByText('Name: John Doe')).toBeInTheDocument();
      expect(getByText('Email: john@example.com')).toBeInTheDocument();
    });

    it('renders em dash for empty field values', () => {
      const data = createTestFormData({
        sections: [
          createTestSection({
            questions: [
              createTestQuestion({
                repeatGroupRows: [
                  {
                    index: 1,
                    values: [{ field: 'Name', value: '' }],
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const { getAllByText } = render(<FormPdfDocument data={data} />);
      expect(getAllByText('Name: —').length).toBeGreaterThan(0);
    });
  });

  describe('scoring matrix', () => {
    it('renders scoring matrix when provided', () => {
      const data = createTestFormData({
        scoringMatrix: createTestScoringMatrix(),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Scoring Matrix')).toBeInTheDocument();
      expect(getByText('Mission Alignment')).toBeInTheDocument();
      expect(getByText('Unmet Need')).toBeInTheDocument();
    });

    it('renders scoring matrix section headers', () => {
      const data = createTestFormData({
        scoringMatrix: createTestScoringMatrix(),
      });
      const { getAllByText } = render(<FormPdfDocument data={data} />);
      // These texts appear in multiple places (matrix and summary sections)
      expect(getAllByText('Impact Score').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Value Score').length).toBeGreaterThanOrEqual(1);
    });

    it('renders market sub-criteria', () => {
      const data = createTestFormData({
        scoringMatrix: createTestScoringMatrix(),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('TAM/SAM')).toBeInTheDocument();
      expect(getByText('Patient Population')).toBeInTheDocument();
      expect(getByText('Competitors')).toBeInTheDocument();
    });

    it('does not render scoring matrix when undefined', () => {
      const data = createTestFormData({ scoringMatrix: undefined });
      const { queryByText } = render(<FormPdfDocument data={data} />);
      expect(queryByText('Scoring Matrix')).not.toBeInTheDocument();
    });
  });

  describe('impact value matrix', () => {
    it('renders impact value matrix when provided', () => {
      const data = createTestFormData({
        impactValueMatrix: createTestImpactValueMatrix(),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Impact vs Value Matrix')).toBeInTheDocument();
    });

    it('renders scores', () => {
      const data = createTestFormData({
        impactValueMatrix: createTestImpactValueMatrix(),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('2.75')).toBeInTheDocument(); // impactScore
      expect(getByText('2.00')).toBeInTheDocument(); // valueScore
    });

    it('renders recommendation', () => {
      const data = createTestFormData({
        impactValueMatrix: {
          ...createTestImpactValueMatrix(),
          recommendation: 'Proceed',
        },
      });
      const { getAllByText } = render(<FormPdfDocument data={data} />);
      // "Proceed" appears in both the matrix quadrant and the recommendation pill
      expect(getAllByText('Proceed').length).toBeGreaterThanOrEqual(2);
    });

    it('renders "Consider Alternative Pathway" recommendation', () => {
      const data = createTestFormData({
        impactValueMatrix: {
          ...createTestImpactValueMatrix(),
          recommendation: 'Consider Alternative Pathway',
        },
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Consider Alternative Pathway')).toBeInTheDocument();
    });

    it('renders "Close" recommendation', () => {
      const data = createTestFormData({
        impactValueMatrix: {
          ...createTestImpactValueMatrix(),
          recommendation: 'Close',
        },
      });
      const { getAllByText } = render(<FormPdfDocument data={data} />);
      // "Close" appears in both the matrix quadrant and the recommendation pill
      expect(getAllByText('Close').length).toBeGreaterThanOrEqual(2);
    });

    it('renders matrix quadrant labels', () => {
      const data = createTestFormData({
        impactValueMatrix: createTestImpactValueMatrix(),
      });
      const { getByText, getAllByText } = render(<FormPdfDocument data={data} />);
      expect(getAllByText('Proceed').length).toBeGreaterThan(0);
      expect(getAllByText('Close').length).toBeGreaterThan(0);
      expect(getByText('Alternative Pathway')).toBeInTheDocument();
      expect(getByText('N/A')).toBeInTheDocument();
    });

    it('does not render impact value matrix when undefined', () => {
      const data = createTestFormData({ impactValueMatrix: undefined });
      const { queryByText } = render(<FormPdfDocument data={data} />);
      expect(queryByText('Impact vs Value Matrix')).not.toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('formats exportedAt date', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          exportedAt: '2025-01-15T10:00:00.000Z',
        }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      // With our mock, format returns a predictable string
      expect(getByText(/Formatted:.*2025-01-15/)).toBeInTheDocument();
    });

    it('handles invalid date gracefully', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          exportedAt: 'not-a-date',
        }),
      });
      // Should render the raw value when date is invalid
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('not-a-date')).toBeInTheDocument();
    });

    it('handles empty date', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          submittedAt: null,
        }),
      });
      // Null dates should show em dash
      expect(() => render(<FormPdfDocument data={data} />)).not.toThrow();
    });
  });

  describe('complete form rendering', () => {
    it('renders a complete form with all features', () => {
      const data: PrintableFormData = {
        metadata: createTestMetadata({
          templateName: 'Complete Technology Triage Form',
          templateVersion: '3.0.0',
          templateDescription: 'Comprehensive evaluation of new technologies',
          statusLabel: 'Submitted',
          submissionId: 'sub-abc123',
          submittedAt: '2025-01-15T16:00:00.000Z',
          submittedBy: 'researcher@hospital.org',
          techId: 'TECH-2025-001',
          notes: 'Priority review requested',
        }),
        sections: [
          createTestSection({
            id: 'basic-info',
            title: 'Basic Information',
            description: 'General information about the technology',
            questions: [
              createTestQuestion({ questionKey: 'tech.name', label: 'Technology Name', answerText: 'AI Diagnostic Tool' }),
              createTestQuestion({ questionKey: 'tech.description', label: 'Description', answerText: 'An AI-powered tool', type: FieldType.LONG_TEXT }),
            ],
          }),
          createTestSection({
            id: 'evaluation',
            title: 'Evaluation Criteria',
            questions: [
              createTestQuestion({ questionKey: 'eval.q1', label: 'Mission Alignment Score', answerText: '3' }),
            ],
          }),
        ],
        calculatedScores: {
          impactScore: 2.75,
          valueScore: 2.25,
        },
        scoringMatrix: createTestScoringMatrix(),
        impactValueMatrix: createTestImpactValueMatrix(),
      };

      const { getByText } = render(<FormPdfDocument data={data} />);

      // Verify key content is present
      expect(getByText('Complete Technology Triage Form')).toBeInTheDocument();
      expect(getByText('Basic Information')).toBeInTheDocument();
      expect(getByText('AI Diagnostic Tool')).toBeInTheDocument();
      expect(getByText('Scoring Matrix')).toBeInTheDocument();
      expect(getByText('Impact vs Value Matrix')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty strings in metadata', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          templateName: '',
          templateVersion: '',
        }),
      });
      expect(() => render(<FormPdfDocument data={data} />)).not.toThrow();
    });

    it('handles very long text', () => {
      const longText = 'This is a very long answer that spans multiple lines. '.repeat(50);
      const data = createTestFormData({
        sections: [
          createTestSection({
            questions: [createTestQuestion({ answerText: longText })],
          }),
        ],
      });
      expect(() => render(<FormPdfDocument data={data} />)).not.toThrow();
    });

    it('handles special characters', () => {
      const data = createTestFormData({
        metadata: createTestMetadata({
          templateName: 'Form with "quotes" & <special> chars',
          notes: 'Notes with unicode: é, ñ, 中文',
        }),
      });
      const { getByText } = render(<FormPdfDocument data={data} />);
      expect(getByText('Form with "quotes" & <special> chars')).toBeInTheDocument();
      expect(getByText('Notes with unicode: é, ñ, 中文')).toBeInTheDocument();
    });
  });
});
