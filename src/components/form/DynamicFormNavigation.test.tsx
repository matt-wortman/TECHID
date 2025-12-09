import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormEngineProvider, DynamicFormRenderer, useFormEngine } from '@/lib/form-engine/renderer';
import { DynamicFormNavigation } from './DynamicFormNavigation';
import { buildQuestion, buildSection, buildTemplate } from '@/lib/form-engine/test-utils';
import { FormTemplateWithSections, FormQuestionWithDetails } from '@/lib/form-engine/types';
import { toast } from 'sonner';

type MockFieldProps = {
  question: FormQuestionWithDetails;
  value?: string | number | null;
  onChange: (nextValue: string | number) => void;
};

jest.mock('@/lib/form-engine/fields/FieldAdapters', () => {
  const MockField = ({ question, value, onChange }: MockFieldProps) => (
    <div data-dictionary-key={question.dictionaryKey}>
      <label>{question.label}</label>
      <input
        data-testid={`field-${question.dictionaryKey}`}
        value={(value ?? '') as string | number}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );

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
    REPEATABLE_GROUP: MockField,
    DATA_TABLE_SELECTOR: MockField,
  };

  return { FieldComponents };
});

jest.mock('@/lib/form-engine/conditional-logic', () => ({
  shouldShowField: jest.fn().mockReturnValue(true),
  shouldRequireField: jest.fn((_config: unknown, baseRequired: boolean) => baseRequired),
  parseConditionalConfig: jest.fn().mockReturnValue(null),
}));

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.mock('@/lib/session', () => ({
  getClientLogger: jest.fn(() => mockLogger),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

function ResponseSetter() {
  const { setResponse } = useFormEngine();
  return (
    <button type="button" data-testid="set-response" onClick={() => setResponse('test.q1', 'updated')}>
      Set Response
    </button>
  );
}

function renderNavigation(
  template: FormTemplateWithSections,
  props: React.ComponentProps<typeof DynamicFormNavigation> = {}
) {
  return render(
    <FormEngineProvider template={template}>
      <ResponseSetter />
      <DynamicFormRenderer />
      <DynamicFormNavigation {...props} />
    </FormEngineProvider>
  );
}

const defaultTemplate = buildTemplate({
  sections: [
    buildSection({
      order: 0,
      questions: [buildQuestion({ dictionaryKey: 'test.q1', label: 'First Question', isRequired: true })],
    }),
    buildSection({
      order: 1,
      questions: [buildQuestion({ dictionaryKey: 'test.q2', label: 'Second Question', isRequired: false })],
    }),
  ],
});

type GlobalWithTestPolyfills = typeof globalThis & {
  CSS?: typeof CSS;
};

beforeAll(() => {
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  }
  const globalWithCSS = globalThis as GlobalWithTestPolyfills;
  if (!globalWithCSS.CSS || typeof globalWithCSS.CSS.escape !== 'function') {
    const cssPolyfill = {
      ...(globalWithCSS.CSS ?? {}),
      escape: (value: string) => value,
    } as typeof CSS;
    globalWithCSS.CSS = cssPolyfill;
  }
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      setTimeout(() => cb(Date.now()), 0);
      return 0;
    };
  }
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('DynamicFormNavigation', () => {
  it('updates the progress indicator when navigating sections', () => {
    renderNavigation(defaultTemplate);

    expect(screen.getByText('Section 1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Section 2 of 2')).toBeInTheDocument();
  });

  it('auto-saves after field changes and surfaces the saved banner', async () => {
    jest.useFakeTimers();
    try {
      const onSaveDraft = jest.fn().mockResolvedValue(undefined);

      renderNavigation(defaultTemplate, { onSaveDraft });

      // Use fireEvent for more predictable behavior with fake timers
      fireEvent.click(screen.getByTestId('set-response'));
      fireEvent.click(screen.getByTestId('set-response'));

      expect(onSaveDraft).not.toHaveBeenCalled();

      // Advance past the debounce time (AUTOSAVE_DEBOUNCE_MS = 2000)
      await act(async () => {
        jest.advanceTimersByTime(2500);
        // Flush promise queue to allow async callback to complete
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(onSaveDraft).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Last saved at/)).toBeInTheDocument();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('blocks submission when required fields are empty and shows a toast', async () => {
    const template = buildTemplate({
      sections: [
        buildSection({
          order: 0,
          questions: [buildQuestion({ dictionaryKey: 'test.required', label: 'Required Field', isRequired: true })],
        }),
      ],
    });

    const props = { onSubmit: jest.fn() };
    renderNavigation(template, props);

    fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));

    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(await screen.findByText(/is required/)).toBeInTheDocument();
  });

  describe('validation UI behavior', () => {
    it('displays multiple validation errors when multiple required fields are empty', async () => {
      const template = buildTemplate({
        sections: [
          buildSection({
            order: 0,
            title: 'Section with Multiple Required Fields',
            questions: [
              buildQuestion({ dictionaryKey: 'test.field1', label: 'First Required', isRequired: true, order: 0 }),
              buildQuestion({ dictionaryKey: 'test.field2', label: 'Second Required', isRequired: true, order: 1 }),
              buildQuestion({ dictionaryKey: 'test.field3', label: 'Third Required', isRequired: true, order: 2 }),
            ],
          }),
        ],
      });

      const props = { onSubmit: jest.fn() };
      renderNavigation(template, props);

      fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));

      // All three errors should be set in form state and displayed
      await waitFor(() => {
        expect(screen.getByText(/First Required is required/)).toBeInTheDocument();
        expect(screen.getByText(/Second Required is required/)).toBeInTheDocument();
        expect(screen.getByText(/Third Required is required/)).toBeInTheDocument();
      });

      // Submit should still be blocked
      expect(props.onSubmit).not.toHaveBeenCalled();
    });

    it('scrolls to the first invalid field on submit validation failure', async () => {
      const scrollIntoViewMock = jest.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      const template = buildTemplate({
        sections: [
          buildSection({
            order: 0,
            title: 'Test Section',
            questions: [
              buildQuestion({ dictionaryKey: 'test.scrollField', label: 'Scroll Target Field', isRequired: true }),
            ],
          }),
        ],
      });

      const props = { onSubmit: jest.fn() };
      renderNavigation(template, props);

      fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));

      // Wait for requestAnimationFrame to execute scrollToField
      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      });
    });

    it('clears validation error when the field is filled', async () => {
      const user = userEvent.setup();

      const template = buildTemplate({
        sections: [
          buildSection({
            order: 0,
            questions: [
              buildQuestion({ dictionaryKey: 'test.clearable', label: 'Clearable Field', isRequired: true }),
            ],
          }),
        ],
      });

      const props = { onSubmit: jest.fn() };
      renderNavigation(template, props);

      // Trigger validation error by attempting submit
      fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));
      await waitFor(() => {
        expect(screen.getByText(/Clearable Field is required/)).toBeInTheDocument();
      });

      // Fill the field - error should clear
      const input = screen.getByTestId('field-test.clearable');
      await user.type(input, 'valid value');

      // Submit should now succeed
      fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));

      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalled();
      });
    });

    it('validates fields across all sections on final submit', async () => {
      const template = buildTemplate({
        sections: [
          buildSection({
            order: 0,
            title: 'Section 1',
            questions: [
              buildQuestion({ dictionaryKey: 'test.s1q1', label: 'Section 1 Field', isRequired: true }),
            ],
          }),
          buildSection({
            order: 1,
            title: 'Section 2',
            questions: [
              buildQuestion({ dictionaryKey: 'test.s2q1', label: 'Section 2 Field', isRequired: true }),
            ],
          }),
        ],
      });

      const props = { onSubmit: jest.fn() };
      renderNavigation(template, props);

      // Navigate to section 2
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => {
        expect(screen.getByText('Section 2 of 2')).toBeInTheDocument();
      });

      // Try to submit - should validate section 1 field even though we're on section 2
      fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Section 1 Field')
        );
      });

      expect(props.onSubmit).not.toHaveBeenCalled();
    });

    it('shows contextual toast error with field name and section', async () => {
      const template = buildTemplate({
        sections: [
          buildSection({
            order: 0,
            title: 'Personal Information',
            questions: [
              buildQuestion({ dictionaryKey: 'test.fullName', label: 'Full Name', isRequired: true }),
            ],
          }),
        ],
      });

      const props = { onSubmit: jest.fn() };
      renderNavigation(template, props);

      fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Full Name')
        );
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Personal Information')
        );
      });
    });

    it('allows submission when all required fields are filled', async () => {
      const user = userEvent.setup();

      const template = buildTemplate({
        sections: [
          buildSection({
            order: 0,
            questions: [
              buildQuestion({ dictionaryKey: 'test.valid', label: 'Valid Field', isRequired: true }),
            ],
          }),
        ],
      });

      const props = { onSubmit: jest.fn() };
      renderNavigation(template, props);

      // Fill the required field
      const input = screen.getByTestId('field-test.valid');
      await user.type(input, 'complete response');

      // Submit should succeed
      fireEvent.click(screen.getByRole('button', { name: /Submit Form/i }));

      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalledTimes(1);
        expect(toast.error).not.toHaveBeenCalled();
      });
    });
  });
});
