import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormEngineProvider, DynamicFormRenderer, useFormEngine } from './renderer';
import { FieldType, FormTemplateWithSections } from './types';
import { buildQuestion, buildSection, buildTemplate } from './test-utils';
import { validateField } from '../validation/form-schemas';

jest.mock('./fields/FieldAdapters', () => {
  // Use dictionaryKey as primary identifier
  const MockField = ({ question, value, onChange }: { question: { dictionaryKey: string; label: string }; value?: string | number | null; onChange: (val: string | number) => void }) => (
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

  const MockMultiSelect = ({ question, value, onChange }: { question: { dictionaryKey: string; label: string }; value?: string[] | null; onChange: (val: string[]) => void }) => {
    const serialized = Array.isArray(value) ? value.join(',') : '';
    return (
      <div>
        <label htmlFor={`field-${question.dictionaryKey}`}>{question.label}</label>
        <input
          id={`field-${question.dictionaryKey}`}
          data-testid={`field-${question.dictionaryKey}`}
          value={serialized}
          onChange={(event) => {
            const tokens = event.target.value
              .split(',')
              .map((token) => token.trim())
              .filter((token) => token.length > 0);
            onChange(tokens);
          }}
        />
      </div>
    );
  };

  const MockRepeatable = ({ question, value = [], onChange }: { question: { dictionaryKey: string; label: string }; value?: Array<Record<string, unknown>>; onChange: (rows: Array<Record<string, unknown>>) => void }) => {
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
    MULTI_SELECT: MockMultiSelect,
    CHECKBOX_GROUP: MockMultiSelect,
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
  extractScoringInputs: jest.fn().mockReturnValue({}),
  calculateAllScores: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedValidateField = validateField as jest.MockedFunction<typeof validateField>;

describe('FormEngine conditional scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reveals nested fields only after each controlling condition is satisfied', async () => {
    const template = buildScenarioTemplate();
    const user = userEvent.setup();

    renderScenario(template);

    expect(screen.queryByTestId('field-test.visibility_alpha')).toBeNull();
    expect(screen.queryByTestId('field-test.visibility_beta')).toBeNull();

    await user.type(screen.getByTestId('field-test.control_stage'), 'ready');
    expect(await screen.findByTestId('field-test.visibility_alpha')).toBeInTheDocument();

    await user.type(screen.getByTestId('field-test.visibility_alpha'), 'unlock');
    expect(await screen.findByTestId('field-test.visibility_beta')).toBeInTheDocument();

    await user.type(screen.getByTestId('field-test.visibility_beta'), 'assign');
    expect(await screen.findByTestId('field-test.follow_up_owner')).toBeInTheDocument();
  });

  it('hides fields when a hide action matches and restores their prior state afterward', async () => {
    const template = buildScenarioTemplate();
    const user = userEvent.setup();

    renderScenario(template);

    const notesField = screen.getByTestId('field-test.escalation_notes') as HTMLInputElement;
    await user.type(notesField, 'Needs follow-up');

    await user.type(screen.getByTestId('field-test.control_stage'), 'skip');
    expect(screen.queryByTestId('field-test.escalation_notes')).toBeNull();

    await user.clear(screen.getByTestId('field-test.control_stage'));
    await user.type(screen.getByTestId('field-test.control_stage'), 'ready');

    const restoredField = await screen.findByTestId('field-test.escalation_notes');
    expect((restoredField as HTMLInputElement).value).toBe('Needs follow-up');
  });

  it('marks dependent fields required based on conditional require rules', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const template = buildScenarioTemplate();

    renderScenario(template);

    await user.type(screen.getByTestId('field-test.control_stage'), 'ready');
    await user.type(await screen.findByTestId('field-test.visibility_alpha'), 'unlock');
    await user.type(await screen.findByTestId('field-test.visibility_beta'), 'assign');

    const ownerField = (await screen.findByTestId('field-test.follow_up_owner')) as HTMLInputElement;
    await user.type(ownerField, 'Dr. Owner');

    jest.runOnlyPendingTimers();

    const lastCall = mockedValidateField.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('test.follow_up_owner'); // dictionaryKey
    expect(lastCall?.[3]).toBe(true);

    jest.useRealTimers();
  });

  it('evaluates multi-select conditional visibility and requirement rules', async () => {
    jest.useFakeTimers();
    const template = buildMultiSelectTemplate();

    renderScenario(template);

    expect(screen.queryByTestId('field-test.multi_dependent')).toBeNull();

    const control = screen.getByTestId('field-test.control_multi');
    fireEvent.change(control, { target: { value: 'triage, follow-up' } });

    const dependent = await screen.findByTestId('field-test.multi_dependent');
    fireEvent.change(dependent, { target: { value: 'Detailed plan' } });

    jest.runOnlyPendingTimers();

    const multiCall = [...mockedValidateField.mock.calls].reverse().find((call) => call[0] === 'test.multi_dependent');
    expect(multiCall?.[3]).toBe(true);

    fireEvent.change(control, { target: { value: '' } });
    expect(screen.queryByTestId('field-test.multi_dependent')).toBeNull();

    jest.useRealTimers();
  });

  it('invokes onSaveDraft with the latest responses when autosave fires silently', async () => {
    const template = buildScenarioTemplate();
    const onSaveDraft = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderScenario(template, {
      onSaveDraft,
      children: <AutosaveButton silent />,
    });

    await user.type(screen.getByTestId('field-test.control_stage'), 'ready');

    await user.click(screen.getByTestId('autosave-trigger'));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalled();
    });

    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        responses: expect.objectContaining({ 'test.control_stage': 'ready' }),
      }),
      { silent: true }
    );
  });
});

function renderScenario(
  template: FormTemplateWithSections,
  options: {
    onSaveDraft?: jest.Mock;
    children?: React.ReactNode;
  } = {}
) {
  return render(
    <FormEngineProvider template={template} onSaveDraft={options.onSaveDraft}>
      {options.children}
      <DynamicFormRenderer />
    </FormEngineProvider>
  );
}

function buildScenarioTemplate(): FormTemplateWithSections {
  const control = buildQuestion({
    dictionaryKey: 'test.control_stage',
    label: 'Control Stage',
    type: FieldType.SHORT_TEXT,
  });

  const visibilityAlpha = buildQuestion({
    dictionaryKey: 'test.visibility_alpha',
    label: 'Visibility Alpha',
    type: FieldType.SHORT_TEXT,
    conditional: {
      logic: 'AND',
      rules: [
        { field: 'test.control_stage', operator: 'equals', value: 'ready', action: 'show' },
      ],
    },
  });

  const visibilityBeta = buildQuestion({
    dictionaryKey: 'test.visibility_beta',
    label: 'Visibility Beta',
    type: FieldType.SHORT_TEXT,
    conditional: {
      logic: 'AND',
      rules: [
        { field: 'test.control_stage', operator: 'equals', value: 'ready', action: 'show' },
        { field: 'test.visibility_alpha', operator: 'equals', value: 'unlock', action: 'show' },
      ],
    },
  });

  const hideWhenSkip = buildQuestion({
    dictionaryKey: 'test.escalation_notes',
    label: 'Escalation Notes',
    type: FieldType.LONG_TEXT,
    conditional: {
      logic: 'OR',
      rules: [
        { field: 'test.control_stage', operator: 'equals', value: 'skip', action: 'hide' },
      ],
    },
  });

  const followUpOwner = buildQuestion({
    dictionaryKey: 'test.follow_up_owner',
    label: 'Follow Up Owner',
    type: FieldType.SHORT_TEXT,
    isRequired: false,
    conditional: {
      logic: 'AND',
      rules: [
        { field: 'test.visibility_beta', operator: 'equals', value: 'assign', action: 'show' },
        { field: 'test.visibility_beta', operator: 'equals', value: 'assign', action: 'require' },
      ],
    },
  });

  return buildTemplate({
    sections: [
      buildSection({
        questions: [control, visibilityAlpha, visibilityBeta, hideWhenSkip, followUpOwner],
      }),
    ],
  });
}

function buildMultiSelectTemplate(): FormTemplateWithSections {
  const control = buildQuestion({
    dictionaryKey: 'test.control_multi',
    label: 'Escalation Tags',
    type: FieldType.MULTI_SELECT,
  });

  const dependent = buildQuestion({
    dictionaryKey: 'test.multi_dependent',
    label: 'Escalation Summary',
    type: FieldType.LONG_TEXT,
    conditional: {
      logic: 'OR',
      rules: [
        { field: 'test.control_multi', operator: 'contains', value: 'triage', action: 'show' },
        { field: 'test.control_multi', operator: 'contains', value: 'triage', action: 'require' },
      ],
    },
  });

  return buildTemplate({
    sections: [
      buildSection({
        questions: [control, dependent],
      }),
    ],
  });
}

function AutosaveButton({ silent = false }: { silent?: boolean }) {
  const { saveDraft } = useFormEngine();
  return (
    <button type="button" data-testid="autosave-trigger" onClick={() => saveDraft({ silent })}>
      Autosave
    </button>
  );
}
