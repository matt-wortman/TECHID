import React, { memo, useMemo } from 'react';
import { FieldType } from '@prisma/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScoringComponent } from '@/components/form/ScoringComponent';
import { DynamicScoringMatrix } from '@/components/form/DynamicScoringMatrix';
import { FieldProps, RepeatableFieldConfig, RepeatableGroupConfig } from '../types';
import {
  getInfoBoxStyle,
  isInfoBoxMetadata,
  parseValidationMetadata,
  parseRepeatableGroupConfig,
} from '../json-utils';
import { Trash2, Plus } from 'lucide-react';

const DEFAULT_REPEATABLE_COLUMNS: RepeatableFieldConfig[] = [
  { key: 'value', label: 'Value', type: 'text', required: true },
];

// Legacy repeatable column configs keyed by dictionaryKey
const LEGACY_REPEATABLE_COLUMNS: Record<string, RepeatableFieldConfig[]> = {
  'tech.inventorName': [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'title', label: 'Title', type: 'text', required: false },
    { key: 'department', label: 'Department', type: 'text', required: false },
    { key: 'email', label: 'Email', type: 'text', required: false },
  ],
  'triage.competitiveLandscape': [
    { key: 'company', label: 'Company', type: 'text', required: true },
    { key: 'product', label: 'Product or Solution', type: 'text', required: true },
    { key: 'description', label: 'Description and Key Features', type: 'textarea', required: true },
    { key: 'revenue', label: 'Revenue or Market Share', type: 'text', required: false },
  ],
  'triage.nextSteps': [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'expertise', label: 'Expertise', type: 'text', required: true },
    { key: 'contact', label: 'Contact Information', type: 'text', required: true },
  ],
};

function getLegacyRepeatableColumns(questionKey: string): RepeatableFieldConfig[] {
  return LEGACY_REPEATABLE_COLUMNS[questionKey] ?? DEFAULT_REPEATABLE_COLUMNS;
}

// Short text field adapter
const ShortTextFieldComponent: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  // ✅ MEMOIZE validation parsing to prevent re-parsing on every render
  const { isInfoBox, metadata } = useMemo(() => {
    const validationMetadata = parseValidationMetadata(question.validation);
    return {
      isInfoBox: isInfoBoxMetadata(validationMetadata),
      metadata: validationMetadata,
    };
  }, [question.validation]);

  if (isInfoBox) {
    const infoBoxStyle = getInfoBoxStyle(metadata);
    const styleClasses = infoBoxStyle === 'blue'
      ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'bg-gray-50 border-gray-200 text-gray-800';

    return (
      <div className={`border rounded-lg p-4 ${styleClasses}`}>
        <h4 className="text-sm font-medium mb-2">{question.label}</h4>
        <ul className="text-sm space-y-1">
          <li>
            • <strong>Improves Child Health:</strong> Direct impact on pediatric health outcomes
          </li>
          <li>
            • <strong>Transforms Delivery of Care:</strong> Changes how care is provided or accessed
          </li>
          <li>
            • <strong>POPT Goals:</strong> Aligns with Portfolio of the Future strategic objectives
          </li>
        </ul>
      </div>
    );
  }

  return (
    <Input
      id={question.dictionaryKey}  // ✅ Use dictionaryKey (required) for id
      value={value as string || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder || ''}
      disabled={disabled}
      className={error ? 'border-red-500' : ''}
    />
  );
};

// ✅ MEMOIZE component to prevent unnecessary re-renders
const ShortTextField = memo(ShortTextFieldComponent);

// Long text field adapter
const LongTextField: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  return (
    <Textarea
      id={question.dictionaryKey}  // ✅ Use dictionaryKey (required) for id
      value={value as string || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder || ''}
      disabled={disabled}
      className={error ? 'border-red-500' : ''}
      rows={4}
    />
  );
};

// Integer field adapter
const IntegerField: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  return (
    <Input
      type="number"
      value={value as number || ''}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      placeholder={question.placeholder || ''}
      disabled={disabled}
      className={error ? 'border-red-500' : ''}
    />
  );
};

// Single select field adapter
const SingleSelectField: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  return (
    <Select value={value as string || ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={error ? 'border-red-500' : ''}>
        <SelectValue placeholder={question.placeholder || 'Select an option'} />
      </SelectTrigger>
      <SelectContent>
        {question.options.map((option) => (
          <SelectItem key={option.id} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Multi-select field adapter
const MultiSelectField: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  const selectedValues = (value as string[]) || [];

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optionValue]);
    } else {
      onChange(selectedValues.filter(v => v !== optionValue));
    }
  };

  return (
    <div className={`space-y-2 ${error ? 'border border-red-500 rounded p-2' : ''}`}>
      {question.options.map((option) => (
        <div key={option.id} className="flex items-center space-x-2">
          <Checkbox
            id={option.id}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={(checked) => handleChange(option.value, checked as boolean)}
            disabled={disabled}
          />
          <label htmlFor={option.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {option.label}
          </label>
        </div>
      ))}
    </div>
  );
};

// Checkbox group field adapter
const CheckboxGroupField: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  const selectedValues = (value as string[]) || [];

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optionValue]);
    } else {
      onChange(selectedValues.filter(v => v !== optionValue));
    }
  };

  return (
    <div className={`space-y-3 ${error ? 'border border-red-500 rounded p-2' : ''}`}>
      {question.options.map((option) => (
        <div key={option.id} className="flex items-center space-x-2">
          <Checkbox
            id={option.id}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={(checked) => handleChange(option.value, checked as boolean)}
            disabled={disabled}
          />
          <label htmlFor={option.id} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {option.label}
          </label>
        </div>
      ))}
    </div>
  );
};

// Date field adapter
const DateField: React.FC<FieldProps> = ({ value, onChange, error, disabled }) => {
  return (
    <Input
      type="date"
      value={value as string || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={error ? 'border-red-500' : ''}
    />
  );
};

// Scoring field adapter - uses the existing ScoringComponent
const ScoringField: React.FC<FieldProps> = ({ question, value, onChange, error }) => {
  // Parse the criteria JSON string from the database
  let criteria = {
    "0": "No alignment",
    "1": "Limited alignment",
    "2": "Good alignment",
    "3": "Excellent alignment"
  };

  if (question.scoringConfig?.criteria) {
    try {
      criteria = typeof question.scoringConfig.criteria === 'string'
        ? JSON.parse(question.scoringConfig.criteria)
        : question.scoringConfig.criteria;
    } catch (error) {
      console.warn('Failed to parse scoring criteria JSON:', error);
    }
  }

  return (
    <div className={error ? 'border border-red-500 rounded p-2' : ''}>
      <ScoringComponent
        value={value as number || 0}
        onChange={(score: number) => onChange(score)}
        label={question.label}
        criteria={criteria}
        required={question.isRequired}
      />
    </div>
  );
};

// Repeatable group field adapter - dynamic table with add/remove rows
const RepeatableGroupField: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  const config = useMemo(() => parseRepeatableGroupConfig(question.repeatableConfig), [question.repeatableConfig]);

  if (question.type === FieldType.DATA_TABLE_SELECTOR || config?.mode === 'predefined') {
    return (
      <DataTableSelectorField
        question={question}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        config={config}
      />
    );
  }

  return (
    <DynamicRepeatableTable
      question={question}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      config={config}
    />
  );
};

const DynamicRepeatableTable: React.FC<
  FieldProps & { config: RepeatableGroupConfig | null }
> = ({ question, value, onChange, error, disabled, config }) => {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  // Use dictionaryKey for legacy column lookup
  const legacyColumns = useMemo(() => getLegacyRepeatableColumns(question.dictionaryKey), [question.dictionaryKey]);

  const columns = useMemo(() => {
    if (config?.columns && config.columns.length > 0) {
      return config.columns;
    }
    return legacyColumns;
  }, [config, legacyColumns]);

  const resolvedColumns = columns.length > 0 ? columns : DEFAULT_REPEATABLE_COLUMNS;
  const minRows = config?.minRows ?? 0;
  const maxRows = config?.maxRows;

  const canAddRow = typeof maxRows !== 'number' || rows.length < maxRows;
  const canRemoveRows = rows.length > (minRows ?? 0);

  const handleAddRow = () => {
    if (!canAddRow) {
      return;
    }
    const newRow: Record<string, unknown> = {};
    resolvedColumns.forEach((column) => {
      newRow[column.key] = '';
    });
    onChange([...rows, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    if (!canRemoveRows) {
      return;
    }
    const newRows = rows.filter((_, i) => i !== index);
    onChange(newRows);
  };

  const handleUpdateRow = (index: number, key: string, nextValue: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [key]: nextValue };
    onChange(newRows);
  };

  return (
    <div className={`space-y-4 ${error ? 'border border-red-500 rounded-lg p-4' : ''}`}>
      {rows.length > 0 && (
        <Table
          wrapperClassName="neumorphic-table-container"
          className="neumorphic-table"
        >
          <TableHeader>
            <TableRow>
              {resolvedColumns.map((column) => (
                <TableHead key={column.key}>
                  {column.label}
                  {column.required && <span className="ml-1 text-red-500">*</span>}
                </TableHead>
              ))}
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                {resolvedColumns.map((column) => {
                  const cellValue = row[column.key];
                  const stringValue = cellValue === null || cellValue === undefined ? '' : String(cellValue);

                  return (
                    <TableCell key={column.key}>
                      {column.type === 'textarea' ? (
                        <Textarea
                          value={stringValue}
                          onChange={(event) => handleUpdateRow(index, column.key, event.target.value)}
                          placeholder={`Enter ${column.label.toLowerCase()}`}
                          disabled={disabled}
                          className="min-h-[60px]"
                          rows={2}
                        />
                      ) : (
                        <Input
                          type={column.type === 'number' ? 'number' : 'text'}
                          value={stringValue}
                          onChange={(event) => handleUpdateRow(index, column.key, event.target.value)}
                          placeholder={`Enter ${column.label.toLowerCase()}`}
                          disabled={disabled}
                        />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(index)}
                    disabled={disabled || !canRemoveRows}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddRow}
          disabled={disabled || !canAddRow}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add row
        </Button>
        {typeof maxRows === 'number' && rows.length >= maxRows && (
          <p className="text-xs text-muted-foreground text-center">
            Maximum of {maxRows} rows reached.
          </p>
        )}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            No entries yet. Click &ldquo;Add row&rdquo; to create the first entry.
          </p>
        )}
      </div>

      {typeof minRows === 'number' && minRows > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          At least {minRows} {minRows === 1 ? 'row is' : 'rows are'} required.
        </p>
      )}
    </div>
  );
};

const DataTableSelectorField: React.FC<
  FieldProps & { config: RepeatableGroupConfig | null }
> = ({ value, onChange, error, disabled, config }) => {
  const rowsConfig = config?.rows ?? [];
  const selectorColumnKey = config?.selectorColumnKey || 'include';
  const checkboxColumn = config?.columns.find((column) => column.key === selectorColumnKey);
  const noteColumn = config?.columns.find((column) => column.key !== selectorColumnKey);

  const includeLabel = checkboxColumn?.label ?? 'Include?';
  const noteKey = noteColumn?.key ?? 'benefit';
  const noteLabel = noteColumn?.label ?? 'How do they benefit?';
  const rowHeader = config?.rowLabel ?? 'Stakeholder';
  const requireNote = Boolean(
    noteColumn?.requiredWhenSelected || config?.requireOnSelect?.includes(noteKey)
  );

  const storedRows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  const normalizedRows = rowsConfig.map((row) => {
    const existing = storedRows.find(
      (item) => item.__rowId === row.id || item.rowId === row.id
    );
    const includeValue = typeof existing?.[selectorColumnKey] === 'boolean'
      ? (existing?.[selectorColumnKey] as boolean)
      : false;
    const noteValue = typeof existing?.[noteKey] === 'string' ? (existing?.[noteKey] as string) : '';

    return {
      id: row.id,
      label: row.label,
      description: row.description,
      include: includeValue,
      note: noteValue,
    };
  });

  const commitRows = (rowsToCommit: typeof normalizedRows) => {
    const nextValue = rowsToCommit.map((row) => ({
      __rowId: row.id,
      [selectorColumnKey]: row.include,
      [noteKey]: row.note,
      rowLabel: row.label,
    }));

    onChange(nextValue as unknown as Record<string, unknown>[]);
  };

  const toggleRow = (rowId: string, checked: boolean) => {
    const next = normalizedRows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            include: checked,
            note: checked ? row.note : '',
          }
        : row
    );
    commitRows(next);
  };

  const updateNote = (rowId: string, note: string) => {
    const next = normalizedRows.map((row) => (row.id === rowId ? { ...row, note } : row));
    commitRows(next);
  };

  if (rowsConfig.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Configure stakeholder rows in the builder to use this table.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${error ? 'border border-red-500 rounded-lg p-4' : ''}`}>
      <Table
        wrapperClassName="neumorphic-table-container"
        className="neumorphic-table"
      >
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">{includeLabel}</TableHead>
              <TableHead className="w-48">{rowHeader}</TableHead>
              <TableHead>{noteLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {normalizedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="align-top">
                  <div className="flex justify-center pt-2">
                    <Checkbox
                      checked={row.include}
                      onCheckedChange={(checked) =>
                        toggleRow(row.id, Boolean(checked))
                      }
                      disabled={disabled}
                    />
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="py-2 text-sm font-medium text-foreground">
                    {row.label}
                  </div>
                  {row.description && (
                    <p className="text-xs text-muted-foreground">{row.description}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Textarea
                    value={row.note}
                    onChange={(event) => updateNote(row.id, event.target.value)}
                    placeholder={`Describe how ${row.label.toLowerCase()} benefit`}
                    disabled={disabled || !row.include}
                    rows={2}
                    className="min-h-[60px]"
                  />
                  {requireNote && row.include && row.note.trim().length === 0 && (
                    <p className="mt-1 text-xs text-red-500">This field is required when selected.</p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

// Scoring matrix field adapter - renders the comprehensive scoring matrix
const ScoringMatrixField: React.FC<FieldProps> = ({ question, value, onChange, error, disabled }) => {
  return (
    <DynamicScoringMatrix
      question={question}
      value={value}
      onChange={onChange as (value: unknown) => void}
      error={error}
      disabled={disabled}
    />
  );
};

// Field component mapping
export const FieldComponents = {
  [FieldType.SHORT_TEXT]: ShortTextField,
  [FieldType.LONG_TEXT]: LongTextField,
  [FieldType.INTEGER]: IntegerField,
  [FieldType.SINGLE_SELECT]: SingleSelectField,
  [FieldType.MULTI_SELECT]: MultiSelectField,
  [FieldType.CHECKBOX_GROUP]: CheckboxGroupField,
  [FieldType.DATE]: DateField,
  [FieldType.SCORING_0_3]: ScoringField,
  [FieldType.REPEATABLE_GROUP]: RepeatableGroupField,
  [FieldType.DATA_TABLE_SELECTOR]: RepeatableGroupField,
  [FieldType.SCORING_MATRIX]: ScoringMatrixField,
};
