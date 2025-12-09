import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerStatusDetail } from '@/lib/technology/types';
import { FormEngineProvider, DynamicFormRenderer, useFormEngine } from './renderer';
import {
  FieldType,
  FormTemplateWithSections,
  FormQuestionWithDetails,
  FormResponse,
  RepeatableGroupData,
} from './types';
import { buildQuestion, buildSection, buildTemplate } from './test-utils';
import { validateField } from '../validation/form-schemas';
import { extractScoringInputs, calculateAllScores } from '../scoring/calculations';

type MockFieldProps = {
  question: FormQuestionWithDetails;
  value?: string | number | null;
  onChange: (nextValue: string | number) => void;
};

type MockRepeatableProps = {
  question: FormQuestionWithDetails;
  value?: Array<Record<string, unknown>>;
  onChange: (rows: Array<Record<string, unknown>>) => void;
};

jest.mock('./fields/FieldAdapters', () => {
  // Use dictionaryKey as primary identifier
  const MockField = ({ question, value, onChange }: MockFieldProps) => (
    <div>
      <label htmlFor={`field-${question.dictionaryKey}`}>{question.label}</label>
      <input
        id={`field-${question.dictionaryKey}`}
        data-testid={`field-${question.dictionaryKey}`}
        value={(value ?? '') as string | number}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );

  const MockRepeatable = ({ question, value = [], onChange }: MockRepeatableProps) => {
    const rows = value ?? [];

    return (
      <div data-testid={`repeat-${question.dictionaryKey}`}>
        <button type="button" onClick={() => onChange([...rows, { row: rows.length }])}>
          Add Row
        </button>
        <span data-testid={`repeat-count-${question.dictionaryKey}`}>{rows.length}</span>
      </div>
    );
  };

  const FieldComponents = {
    SHORT_TEXT: MockField,
    LONG_TEXT: MockField,
    INTEGER: MockField,
    SINGLE_SELECT: MockField,
    MULTI_SELECT: MockField,
    CHECKBOX_GROUP: MockField,
    DATE: MockField,
    SCORING_0_3: MockField,
    SCORING_MATRIX: MockField,
    REPEATABLE_GROUP: MockRepeatable,
    DATA_TABLE_SELECTOR: MockRepeatable,
  };

  return { FieldComponents };
});

jest.mock('../validation/form-schemas', () => ({
  validateField: jest.fn().mockReturnValue({ isValid: true }),
}));

jest.mock('../scoring/calculations', () => ({
  extractScoringInputs: jest.fn().mockReturnValue({
    missionAlignmentScore: 0,
    unmetNeedScore: 0,
    ipStrengthScore: 0,
    marketSizeScore: 0,
    patientPopulationScore: 0,
    competitorsScore: 0,
  }),
  calculateAllScores: jest.fn().mockReturnValue({
    impactScore: 2,
    valueScore: 3,
    marketScore: 4,
    overallScore: 2.5,
    recommendation: 'REVIEW',
    recommendationText: 'Needs review',
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('./conditional-logic', () => ({
  shouldShowField: jest.fn().mockReturnValue(true),
  shouldRequireField: jest.fn((_config: unknown, baseRequired: boolean) => baseRequired),
  parseConditionalConfig: jest.fn().mockReturnValue(null),
}));

const mockedValidateField = validateField as jest.MockedFunction<typeof validateField>;
const mockedExtractScoringInputs = extractScoringInputs as jest.MockedFunction<typeof extractScoringInputs>;
const mockedCalculateAllScores = calculateAllScores as jest.MockedFunction<typeof calculateAllScores>;

function FormStateViewer() {
  const { responses, repeatGroups, answerMetadata, currentSection, nextSection, previousSection, calculatedScores } =
    useFormEngine();

  return (
    <div>
      <div data-testid="state-responses">{JSON.stringify(responses)}</div>
      <div data-testid="state-repeat-groups">{JSON.stringify(repeatGroups)}</div>
      <div data-testid="state-answer-metadata">{JSON.stringify(answerMetadata)}</div>
      <div data-testid="state-current-section">{currentSection}</div>
      <div data-testid="state-calculated-scores">{calculatedScores ? JSON.stringify(calculatedScores) : ''}</div>
      <button type="button" data-testid="state-next" onClick={() => nextSection()}>
        Advance
      </button>
      <button type="button" data-testid="state-prev" onClick={() => previousSection()}>
        Go Back
      </button>
    </div>
  );
}

function renderForm(
  template: FormTemplateWithSections,
  options: {
    initialData?: {
      responses?: FormResponse;
      repeatGroups?: RepeatableGroupData;
      answerMetadata?: Record<string, AnswerStatusDetail>;
    };
    children?: React.ReactNode;
  } = {}
) {
  return render(
    <FormEngineProvider template={template} initialData={options.initialData}>
      <FormStateViewer />
      <DynamicFormRenderer />
      {options.children}
    </FormEngineProvider>
  );
}

describe('FormEngineProvider + DynamicFormRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates initial data and clears answer metadata when fields change', async () => {
    const template = buildTemplate({
      sections: [
        buildSection({
          questions: [
            buildQuestion({ dictionaryKey: 'test.q1', label: 'First Question', isRequired: true }),
          ],
        }),
      ],
    });

    const initialData = {
      responses: { 'test.q1': 'prefill' },
      answerMetadata: {
        'test.q1': { status: 'STALE', answeredAt: '2025-11-01T10:00:00Z' } as AnswerStatusDetail,
      },
    };

    const user = userEvent.setup();
    renderForm(template, { initialData });

    const input = await screen.findByTestId('field-test.q1');
    await user.clear(input);
    await user.type(input, 'updated');

    const responses = JSON.parse(screen.getByTestId('state-responses').textContent || '{}');
    expect(responses['test.q1']).toBe('updated');

    const metadata = JSON.parse(screen.getByTestId('state-answer-metadata').textContent || '{}');
    expect(metadata).toEqual({});
  });

  it('updates repeatable group data through the repeat group adapter', async () => {
    const template = buildTemplate({
      sections: [
        buildSection({
          questions: [
            buildQuestion({ dictionaryKey: 'test.rg1', label: 'Repeat Group', type: FieldType.REPEATABLE_GROUP }),
          ],
        }),
      ],
    });

    renderForm(template);

    const addButton = await screen.findByText('Add Row');
    fireEvent.click(addButton);

    const repeatGroups = JSON.parse(screen.getByTestId('state-repeat-groups').textContent || '{}');
    expect(Array.isArray(repeatGroups['test.rg1'])).toBe(true);
    expect(repeatGroups['test.rg1']).toHaveLength(1);
  });

  it('navigates between sections without losing responses', () => {
    const sectionOne = buildSection({
      questions: [buildQuestion({ dictionaryKey: 'test.q1', label: 'Section 1 Question' })],
      order: 0,
    });
    const sectionTwo = buildSection({
      questions: [buildQuestion({ dictionaryKey: 'test.q2', label: 'Section 2 Question' })],
      order: 1,
    });

    const template = buildTemplate({ sections: [sectionOne, sectionTwo] });

    renderForm(template);

    expect(screen.getByTestId('field-test.q1')).toBeInTheDocument();
    expect(screen.queryByTestId('field-test.q2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('state-next'));

    expect(screen.getByTestId('field-test.q2')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('state-prev'));
    expect(screen.getByTestId('field-test.q1')).toBeInTheDocument();
  });

  it('only re-hydrates when initial data payload changes', () => {
    const template = buildTemplate({
      sections: [
        buildSection({
          questions: [buildQuestion({ dictionaryKey: 'test.q1', label: 'Name' })],
        }),
      ],
    });

    const initialData = { responses: { 'test.q1': 'server-value' } };
    const { rerender } = render(
      <FormEngineProvider template={template} initialData={initialData}>
        <FormStateViewer />
        <DynamicFormRenderer />
      </FormEngineProvider>
    );

    const input = screen.getByTestId('field-test.q1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'local-edit' } });

    let responses = JSON.parse(screen.getByTestId('state-responses').textContent || '{}');
    expect(responses['test.q1']).toBe('local-edit');

    rerender(
      <FormEngineProvider template={template} initialData={initialData}>
        <FormStateViewer />
        <DynamicFormRenderer />
      </FormEngineProvider>
    );

    responses = JSON.parse(screen.getByTestId('state-responses').textContent || '{}');
    expect(responses['test.q1']).toBe('local-edit');

    const nextInitialData = { responses: { 'test.q1': 'server-replacement' } };
    rerender(
      <FormEngineProvider template={template} initialData={nextInitialData}>
        <FormStateViewer />
        <DynamicFormRenderer />
      </FormEngineProvider>
    );

    responses = JSON.parse(screen.getByTestId('state-responses').textContent || '{}');
    expect(responses['test.q1']).toBe('server-replacement');
  });

  it('derives calculated scores when responses change', async () => {
    mockedExtractScoringInputs.mockReturnValueOnce({
      missionAlignmentScore: 0,
      unmetNeedScore: 0,
      ipStrengthScore: 0,
      marketSizeScore: 0,
      patientPopulationScore: 0,
      competitorsScore: 0,
    });
    const scorePayload = {
      impactScore: 1,
      valueScore: 2,
      marketScore: 3,
      overallScore: 2,
      recommendation: 'INVEST',
      recommendationText: 'Go',
    };
    mockedCalculateAllScores.mockReturnValueOnce(scorePayload);

    const template = buildTemplate({
      sections: [
        buildSection({
          questions: [buildQuestion({ dictionaryKey: 'test.q1', label: 'Score Field' })],
        }),
      ],
    });

    renderForm(template);

    fireEvent.change(screen.getByTestId('field-test.q1'), { target: { value: 'new value' } });

    await waitFor(() => {
      expect(mockedExtractScoringInputs).toHaveBeenCalledWith({ 'test.q1': 'new value' });
      expect(mockedCalculateAllScores).toHaveBeenCalledWith({
        missionAlignmentScore: 0,
        unmetNeedScore: 0,
        ipStrengthScore: 0,
        marketSizeScore: 0,
        patientPopulationScore: 0,
        competitorsScore: 0,
      });
      expect(screen.getByTestId('state-calculated-scores')).toHaveTextContent('INVEST');
    });
  });

  it('triggers debounced validation through validateField helper', async () => {
    mockedValidateField.mockReturnValueOnce({ isValid: false, error: 'Invalid' } as ReturnType<typeof validateField>);

    const template = buildTemplate({
      sections: [
        buildSection({
          questions: [buildQuestion({ dictionaryKey: 'test.q1', label: 'Needs Validation', isRequired: true })],
        }),
      ],
    });

    renderForm(template);

    fireEvent.change(screen.getByTestId('field-test.q1'), { target: { value: 'user input' } });

    await waitFor(() => {
      expect(mockedValidateField).toHaveBeenCalled();
    });
  });
});
