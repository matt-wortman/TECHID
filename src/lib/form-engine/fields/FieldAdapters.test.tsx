import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FieldType } from '@prisma/client';
import { FieldComponents } from './FieldAdapters';
import { createMockQuestion } from '@/__tests__/test-utils/formTemplateBuilders';
import type { FormQuestionWithDetails } from '../types';

// Mock the UI components to simplify testing
jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
      <input ref={ref} className={className} data-testid="input" {...props} />
    )
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => (
      <textarea ref={ref} className={className} data-testid="textarea" {...props} />
    )
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: { value: string; onValueChange: (v: string) => void; disabled?: boolean; children: React.ReactNode }) => (
    <div data-testid="select-root" data-value={value} data-disabled={disabled}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === MockSelectContent) {
          return React.cloneElement(child as React.ReactElement<{ onValueChange?: (v: string) => void }>, { onValueChange });
        }
        return child;
      })}
    </div>
  ),
  SelectTrigger: ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <button className={className} data-testid="select-trigger">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: MockSelectContent,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>{children}</div>
  ),
}));

function MockSelectContent({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) {
  return (
    <div data-testid="select-content" onClick={(e) => {
      const target = e.target as HTMLElement;
      const value = target.getAttribute('data-value');
      if (value && onValueChange) {
        onValueChange(value);
      }
    }}>
      {children}
    </div>
  );
}

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, disabled }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      data-testid={`checkbox-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, type, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    type?: 'button' | 'submit';
    className?: string;
  }) => (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children, className }: { children: React.ReactNode; className?: string; wrapperClassName?: string }) => (
    <table className={className} data-testid="table">{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => <td className={className}>{children}</td>,
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => <th className={className}>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr data-testid="table-row">{children}</tr>,
}));

jest.mock('@/components/form/ScoringComponent', () => ({
  ScoringComponent: ({ value, onChange, label, criteria, required }: {
    value: number;
    onChange: (score: number) => void;
    label: string;
    criteria: Record<string, string>;
    required?: boolean;
  }) => (
    <div data-testid="scoring-component">
      <span data-testid="scoring-label">{label}</span>
      <span data-testid="scoring-value">{value}</span>
      <span data-testid="scoring-required">{required ? 'true' : 'false'}</span>
      <div data-testid="scoring-criteria">{JSON.stringify(criteria)}</div>
      {[0, 1, 2, 3].map((score) => (
        <button
          key={score}
          data-testid={`score-button-${score}`}
          onClick={() => onChange(score)}
        >
          {score}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/components/form/DynamicScoringMatrix', () => ({
  DynamicScoringMatrix: ({ question, value, onChange, error, disabled }: {
    question: FormQuestionWithDetails;
    value: unknown;
    onChange: (value: unknown) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="dynamic-scoring-matrix">
      <span data-testid="matrix-question-id">{question.id}</span>
      <span data-testid="matrix-value">{JSON.stringify(value)}</span>
      <span data-testid="matrix-error">{error}</span>
      <span data-testid="matrix-disabled">{disabled ? 'true' : 'false'}</span>
      <button data-testid="matrix-change" onClick={() => onChange({ updated: true })}>
        Update
      </button>
    </div>
  ),
}));

jest.mock('lucide-react', () => ({
  Trash2: ({ className }: { className?: string }) => <span data-testid="trash-icon" className={className}>🗑</span>,
  Plus: ({ className }: { className?: string }) => <span data-testid="plus-icon" className={className}>+</span>,
}));

describe('FieldComponents', () => {
  describe('SHORT_TEXT', () => {
    const ShortTextField = FieldComponents[FieldType.SHORT_TEXT];

    it('renders input with value', () => {
      const question = createMockQuestion({
        id: 'q1',
        type: FieldType.SHORT_TEXT,
        dictionaryKey: 'test.shortText',
        placeholder: 'Enter text',
      });

      render(
        <ShortTextField
          question={question}
          value="test value"
          onChange={jest.fn()}
        />
      );

      const input = screen.getByTestId('input');
      expect(input).toHaveValue('test value');
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });

    it('calls onChange when input changes', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({ type: FieldType.SHORT_TEXT });

      render(
        <ShortTextField
          question={question}
          value=""
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('input'), { target: { value: 'new value' } });
      expect(onChange).toHaveBeenCalledWith('new value');
    });

    it('shows error styling when error provided', () => {
      const question = createMockQuestion({ type: FieldType.SHORT_TEXT });

      render(
        <ShortTextField
          question={question}
          value=""
          onChange={jest.fn()}
          error="Required field"
        />
      );

      expect(screen.getByTestId('input')).toHaveClass('border-red-500');
    });

    it('disables input when disabled prop is true', () => {
      const question = createMockQuestion({ type: FieldType.SHORT_TEXT });

      render(
        <ShortTextField
          question={question}
          value=""
          onChange={jest.fn()}
          disabled={true}
        />
      );

      expect(screen.getByTestId('input')).toBeDisabled();
    });

    it('renders INFO_BOX when validation has isInfoBox flag', () => {
      const question = createMockQuestion({
        type: FieldType.SHORT_TEXT,
        validation: JSON.stringify({ isInfoBox: true, infoBoxStyle: 'blue' }),
        label: 'Information Box',
      });

      render(
        <ShortTextField
          question={question}
          value=""
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('Information Box')).toBeInTheDocument();
      expect(screen.getByText(/Improves Child Health/)).toBeInTheDocument();
    });

    it('handles null/undefined value correctly', () => {
      const question = createMockQuestion({ type: FieldType.SHORT_TEXT });

      render(
        <ShortTextField
          question={question}
          value={null as unknown as string}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('input')).toHaveValue('');
    });
  });

  describe('LONG_TEXT', () => {
    const LongTextField = FieldComponents[FieldType.LONG_TEXT];

    it('renders textarea with value', () => {
      const question = createMockQuestion({
        type: FieldType.LONG_TEXT,
        placeholder: 'Enter description',
      });

      render(
        <LongTextField
          question={question}
          value="multi-line text"
          onChange={jest.fn()}
        />
      );

      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveValue('multi-line text');
      expect(textarea).toHaveAttribute('placeholder', 'Enter description');
    });

    it('calls onChange when textarea changes', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({ type: FieldType.LONG_TEXT });

      render(
        <LongTextField
          question={question}
          value=""
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('textarea'), { target: { value: 'new text' } });
      expect(onChange).toHaveBeenCalledWith('new text');
    });

    it('shows error styling', () => {
      const question = createMockQuestion({ type: FieldType.LONG_TEXT });

      render(
        <LongTextField
          question={question}
          value=""
          onChange={jest.fn()}
          error="Field is required"
        />
      );

      expect(screen.getByTestId('textarea')).toHaveClass('border-red-500');
    });
  });

  describe('INTEGER', () => {
    const IntegerField = FieldComponents[FieldType.INTEGER];

    it('renders number input with value', () => {
      const question = createMockQuestion({ type: FieldType.INTEGER });

      render(
        <IntegerField
          question={question}
          value={42}
          onChange={jest.fn()}
        />
      );

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveValue(42);
    });

    it('parses input as integer', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({ type: FieldType.INTEGER });

      render(
        <IntegerField
          question={question}
          value={0}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('input'), { target: { value: '123' } });
      expect(onChange).toHaveBeenCalledWith(123);
    });

    it('handles negative numbers', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({ type: FieldType.INTEGER });

      render(
        <IntegerField
          question={question}
          value={0}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('input'), { target: { value: '-5' } });
      expect(onChange).toHaveBeenCalledWith(-5);
    });
  });

  describe('SINGLE_SELECT', () => {
    const SingleSelectField = FieldComponents[FieldType.SINGLE_SELECT];

    it('renders select with options', () => {
      const question = createMockQuestion({
        type: FieldType.SINGLE_SELECT,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'option1', label: 'Option 1', order: 0 },
          { id: 'opt2', questionId: 'q1', value: 'option2', label: 'Option 2', order: 1 },
        ],
        placeholder: 'Select one',
      });

      render(
        <SingleSelectField
          question={question}
          value=""
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('select-root')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-option1')).toHaveTextContent('Option 1');
      expect(screen.getByTestId('select-item-option2')).toHaveTextContent('Option 2');
    });

    it('calls onChange when option selected', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.SINGLE_SELECT,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'option1', label: 'Option 1', order: 0 },
        ],
      });

      render(
        <SingleSelectField
          question={question}
          value=""
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByTestId('select-item-option1'));
      expect(onChange).toHaveBeenCalledWith('option1');
    });
  });

  describe('MULTI_SELECT', () => {
    const MultiSelectField = FieldComponents[FieldType.MULTI_SELECT];

    it('renders checkboxes for each option', () => {
      const question = createMockQuestion({
        type: FieldType.MULTI_SELECT,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'a', label: 'Option A', order: 0 },
          { id: 'opt2', questionId: 'q1', value: 'b', label: 'Option B', order: 1 },
        ],
      });

      render(
        <MultiSelectField
          question={question}
          value={[]}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('checkbox-opt1')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-opt2')).toBeInTheDocument();
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('shows checked state for selected values', () => {
      const question = createMockQuestion({
        type: FieldType.MULTI_SELECT,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'a', label: 'Option A', order: 0 },
          { id: 'opt2', questionId: 'q1', value: 'b', label: 'Option B', order: 1 },
        ],
      });

      render(
        <MultiSelectField
          question={question}
          value={['a']}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('checkbox-opt1')).toBeChecked();
      expect(screen.getByTestId('checkbox-opt2')).not.toBeChecked();
    });

    it('adds value when checkbox checked', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.MULTI_SELECT,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'a', label: 'Option A', order: 0 },
          { id: 'opt2', questionId: 'q1', value: 'b', label: 'Option B', order: 1 },
        ],
      });

      render(
        <MultiSelectField
          question={question}
          value={['a']}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByTestId('checkbox-opt2'));
      expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    });

    it('removes value when checkbox unchecked', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.MULTI_SELECT,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'a', label: 'Option A', order: 0 },
        ],
      });

      render(
        <MultiSelectField
          question={question}
          value={['a']}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByTestId('checkbox-opt1'));
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('shows error styling', () => {
      const question = createMockQuestion({
        type: FieldType.MULTI_SELECT,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'a', label: 'Option A', order: 0 },
        ],
      });

      const { container } = render(
        <MultiSelectField
          question={question}
          value={[]}
          onChange={jest.fn()}
          error="Select at least one"
        />
      );

      expect(container.querySelector('.border-red-500')).toBeInTheDocument();
    });
  });

  describe('CHECKBOX_GROUP', () => {
    const CheckboxGroupField = FieldComponents[FieldType.CHECKBOX_GROUP];

    it('renders checkbox group similar to MULTI_SELECT', () => {
      const question = createMockQuestion({
        type: FieldType.CHECKBOX_GROUP,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'x', label: 'Checkbox X', order: 0 },
          { id: 'opt2', questionId: 'q1', value: 'y', label: 'Checkbox Y', order: 1 },
        ],
      });

      render(
        <CheckboxGroupField
          question={question}
          value={['x']}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('checkbox-opt1')).toBeChecked();
      expect(screen.getByTestId('checkbox-opt2')).not.toBeChecked();
    });

    it('handles add and remove correctly', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.CHECKBOX_GROUP,
        options: [
          { id: 'opt1', questionId: 'q1', value: 'x', label: 'Checkbox X', order: 0 },
        ],
      });

      render(
        <CheckboxGroupField
          question={question}
          value={[]}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByTestId('checkbox-opt1'));
      expect(onChange).toHaveBeenCalledWith(['x']);
    });
  });

  describe('DATE', () => {
    const DateField = FieldComponents[FieldType.DATE];

    it('renders date input', () => {
      const question = createMockQuestion({ type: FieldType.DATE });

      render(
        <DateField
          question={question}
          value="2024-01-15"
          onChange={jest.fn()}
        />
      );

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'date');
      expect(input).toHaveValue('2024-01-15');
    });

    it('calls onChange with date string', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({ type: FieldType.DATE });

      render(
        <DateField
          question={question}
          value=""
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('input'), { target: { value: '2024-12-25' } });
      expect(onChange).toHaveBeenCalledWith('2024-12-25');
    });
  });

  describe('SCORING_0_3', () => {
    const ScoringField = FieldComponents[FieldType.SCORING_0_3];

    it('renders ScoringComponent with default criteria', () => {
      const question = createMockQuestion({
        type: FieldType.SCORING_0_3,
        label: 'Mission Alignment',
        isRequired: true,
      });

      render(
        <ScoringField
          question={question}
          value={2}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('scoring-component')).toBeInTheDocument();
      expect(screen.getByTestId('scoring-label')).toHaveTextContent('Mission Alignment');
      expect(screen.getByTestId('scoring-value')).toHaveTextContent('2');
      expect(screen.getByTestId('scoring-required')).toHaveTextContent('true');
    });

    it('uses custom criteria from scoringConfig', () => {
      const question = createMockQuestion({
        type: FieldType.SCORING_0_3,
        scoringConfig: {
          id: 'sc1',
          questionId: 'q1',
          criteria: JSON.stringify({
            '0': 'None',
            '1': 'Low',
            '2': 'Medium',
            '3': 'High',
          }),
          minScore: 0,
          maxScore: 3,
          weight: 1.0,
        },
      });

      render(
        <ScoringField
          question={question}
          value={0}
          onChange={jest.fn()}
        />
      );

      const criteria = screen.getByTestId('scoring-criteria');
      expect(criteria).toHaveTextContent('None');
      expect(criteria).toHaveTextContent('High');
    });

    it('calls onChange when score selected', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({ type: FieldType.SCORING_0_3 });

      render(
        <ScoringField
          question={question}
          value={0}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByTestId('score-button-3'));
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('shows error styling', () => {
      const question = createMockQuestion({ type: FieldType.SCORING_0_3 });

      const { container } = render(
        <ScoringField
          question={question}
          value={0}
          onChange={jest.fn()}
          error="Score is required"
        />
      );

      expect(container.querySelector('.border-red-500')).toBeInTheDocument();
    });
  });

  describe('SCORING_MATRIX', () => {
    const ScoringMatrixField = FieldComponents[FieldType.SCORING_MATRIX];

    it('renders DynamicScoringMatrix component', () => {
      const question = createMockQuestion({
        id: 'matrix-q1',
        type: FieldType.SCORING_MATRIX,
      });

      render(
        <ScoringMatrixField
          question={question}
          value={{ scores: [1, 2, 3] }}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('dynamic-scoring-matrix')).toBeInTheDocument();
      expect(screen.getByTestId('matrix-question-id')).toHaveTextContent('matrix-q1');
    });

    it('passes disabled prop to matrix', () => {
      const question = createMockQuestion({ type: FieldType.SCORING_MATRIX });

      render(
        <ScoringMatrixField
          question={question}
          value={{}}
          onChange={jest.fn()}
          disabled={true}
        />
      );

      expect(screen.getByTestId('matrix-disabled')).toHaveTextContent('true');
    });

    it('passes error to matrix', () => {
      const question = createMockQuestion({ type: FieldType.SCORING_MATRIX });

      render(
        <ScoringMatrixField
          question={question}
          value={{}}
          onChange={jest.fn()}
          error="Matrix incomplete"
        />
      );

      expect(screen.getByTestId('matrix-error')).toHaveTextContent('Matrix incomplete');
    });

    it('calls onChange when matrix updates', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({ type: FieldType.SCORING_MATRIX });

      render(
        <ScoringMatrixField
          question={question}
          value={{}}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByTestId('matrix-change'));
      expect(onChange).toHaveBeenCalledWith({ updated: true });
    });
  });

  describe('REPEATABLE_GROUP', () => {
    const RepeatableGroupField = FieldComponents[FieldType.REPEATABLE_GROUP];

    it('renders empty state with add button', () => {
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'custom.group',
        repeatableConfig: {
          columns: [{ key: 'name', label: 'Name', type: 'text', required: true }],
        },
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[]}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('Add row')).toBeInTheDocument();
      expect(screen.getByText(/No entries yet/)).toBeInTheDocument();
    });

    it('adds row when add button clicked', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'custom.group',
        repeatableConfig: {
          columns: [{ key: 'name', label: 'Name', type: 'text', required: true }],
        },
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[]}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByText('Add row'));
      expect(onChange).toHaveBeenCalledWith([{ name: '' }]);
    });

    it('renders table with existing rows', () => {
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'custom.group',
        repeatableConfig: {
          columns: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'text', required: false },
          ],
        },
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[
            { name: 'John', email: 'john@example.com' },
            { name: 'Jane', email: 'jane@example.com' },
          ]}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getAllByTestId('table-row')).toHaveLength(3); // 1 header + 2 data rows
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('removes row when delete clicked', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'custom.group',
        repeatableConfig: {
          columns: [{ key: 'name', label: 'Name', type: 'text', required: true }],
        },
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[{ name: 'John' }, { name: 'Jane' }]}
          onChange={onChange}
        />
      );

      const deleteButtons = screen.getAllByTestId('button').filter(
        btn => btn.querySelector('[data-testid="trash-icon"]')
      );
      fireEvent.click(deleteButtons[0]);
      expect(onChange).toHaveBeenCalledWith([{ name: 'Jane' }]);
    });

    it('uses legacy columns for known dictionaryKeys', () => {
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'tech.inventorName',
        repeatableConfig: null,
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[{ name: 'Test', title: 'Dr.', department: 'IT', email: 'test@example.com' }]}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('respects maxRows limit', () => {
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'custom.group',
        repeatableConfig: {
          columns: [{ key: 'name', label: 'Name', type: 'text' }],
          maxRows: 2,
        },
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[{ name: 'A' }, { name: 'B' }]}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText(/Maximum of 2 rows reached/)).toBeInTheDocument();
      const addButton = screen.getByText('Add row').closest('button');
      expect(addButton).toBeDisabled();
    });

    it('respects minRows limit', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'custom.group',
        repeatableConfig: {
          columns: [{ key: 'name', label: 'Name', type: 'text' }],
          minRows: 1,
        },
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[{ name: 'Only one' }]}
          onChange={onChange}
        />
      );

      const deleteButtons = screen.getAllByTestId('button').filter(
        btn => btn.querySelector('[data-testid="trash-icon"]')
      );
      expect(deleteButtons[0]).toBeDisabled();
    });

    it('updates row value on input change', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.REPEATABLE_GROUP,
        dictionaryKey: 'custom.group',
        repeatableConfig: {
          columns: [{ key: 'name', label: 'Name', type: 'text' }],
        },
      });

      render(
        <RepeatableGroupField
          question={question}
          value={[{ name: 'Initial' }]}
          onChange={onChange}
        />
      );

      const inputs = screen.getAllByTestId('input');
      fireEvent.change(inputs[0], { target: { value: 'Updated' } });
      expect(onChange).toHaveBeenCalledWith([{ name: 'Updated' }]);
    });
  });

  describe('DATA_TABLE_SELECTOR', () => {
    const DataTableSelectorField = FieldComponents[FieldType.DATA_TABLE_SELECTOR];

    it('renders predefined rows with checkboxes', () => {
      const question = createMockQuestion({
        type: FieldType.DATA_TABLE_SELECTOR,
        dictionaryKey: 'test.stakeholders',
        repeatableConfig: {
          mode: 'predefined',
          columns: [
            { key: 'include', label: 'Include?', type: 'checkbox' },
            { key: 'benefit', label: 'How do they benefit?', type: 'textarea' },
          ],
          rows: [
            { id: 'row1', label: 'Patients', description: 'Primary beneficiaries' },
            { id: 'row2', label: 'Providers', description: 'Healthcare professionals' },
          ],
          rowLabel: 'Stakeholder',
        },
      });

      render(
        <DataTableSelectorField
          question={question}
          value={[]}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('Patients')).toBeInTheDocument();
      expect(screen.getByText('Providers')).toBeInTheDocument();
      expect(screen.getByText('Primary beneficiaries')).toBeInTheDocument();
    });

    it('shows placeholder when no rows configured', () => {
      const question = createMockQuestion({
        type: FieldType.DATA_TABLE_SELECTOR,
        repeatableConfig: {
          mode: 'predefined',
          columns: [{ key: 'include', label: 'Include', type: 'checkbox' }],
          rows: [],
        },
      });

      render(
        <DataTableSelectorField
          question={question}
          value={[]}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText(/Configure stakeholder rows/)).toBeInTheDocument();
    });

    it('toggles row selection', () => {
      const onChange = jest.fn();
      const question = createMockQuestion({
        type: FieldType.DATA_TABLE_SELECTOR,
        repeatableConfig: {
          mode: 'predefined',
          columns: [
            { key: 'include', label: 'Include?', type: 'checkbox' },
            { key: 'benefit', label: 'Benefit', type: 'textarea' },
          ],
          rows: [
            { id: 'row1', label: 'Patients' },
          ],
        },
      });

      render(
        <DataTableSelectorField
          question={question}
          value={[]}
          onChange={onChange}
        />
      );

      // Get the checkbox (not the trash icon button)
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          __rowId: 'row1',
          include: true,
        }),
      ]);
    });
  });

  describe('FieldComponents exports', () => {
    it('exports all field types', () => {
      expect(FieldComponents[FieldType.SHORT_TEXT]).toBeDefined();
      expect(FieldComponents[FieldType.LONG_TEXT]).toBeDefined();
      expect(FieldComponents[FieldType.INTEGER]).toBeDefined();
      expect(FieldComponents[FieldType.SINGLE_SELECT]).toBeDefined();
      expect(FieldComponents[FieldType.MULTI_SELECT]).toBeDefined();
      expect(FieldComponents[FieldType.CHECKBOX_GROUP]).toBeDefined();
      expect(FieldComponents[FieldType.DATE]).toBeDefined();
      expect(FieldComponents[FieldType.SCORING_0_3]).toBeDefined();
      expect(FieldComponents[FieldType.REPEATABLE_GROUP]).toBeDefined();
      expect(FieldComponents[FieldType.DATA_TABLE_SELECTOR]).toBeDefined();
      expect(FieldComponents[FieldType.SCORING_MATRIX]).toBeDefined();
    });

    it('DATA_TABLE_SELECTOR uses same component as REPEATABLE_GROUP', () => {
      expect(FieldComponents[FieldType.DATA_TABLE_SELECTOR]).toBe(
        FieldComponents[FieldType.REPEATABLE_GROUP]
      );
    });
  });
});
