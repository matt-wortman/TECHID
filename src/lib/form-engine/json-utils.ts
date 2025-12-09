import { ConditionalConfig, ConditionalRule, RepeatableFieldConfig, RepeatableGroupConfig, RepeatablePredefinedRow, RepeatableGroupMode } from './types';

export type JsonRecord = Record<string, unknown>;

const allowedOperators: ConditionalRule['operator'][] = [
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'exists',
  'not_exists',
  'not_empty',
];

const allowedActions: ConditionalRule['action'][] = ['show', 'hide', 'require', 'optional'];
const allowedColumnTypes: RepeatableFieldConfig['type'][] = ['text', 'textarea', 'number', 'checkbox'];

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJsonRecord(value: unknown): JsonRecord | null {
  if (isJsonRecord(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isJsonRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function parseValidationMetadata(value: unknown): JsonRecord | null {
  return parseJsonRecord(value);
}

export function isInfoBoxMetadata(metadata: JsonRecord | null): boolean {
  return Boolean(metadata?.isInfoBox === true);
}

export function getInfoBoxStyle(metadata: JsonRecord | null, fallback: string = 'blue'): string {
  const style = metadata?.infoBoxStyle;
  return typeof style === 'string' ? style : fallback;
}

type LegacyCondition = {
  field?: unknown;
  operator?: unknown;
  value?: unknown;
};

type LegacyConditionalConfig = {
  showIf: LegacyCondition[];
};

type ConditionalConfigShape = {
  rules: unknown[];
  logic?: unknown;
};

export function parseConditionalConfigValue(value: unknown): ConditionalConfig | null {
  const rawConfig = parseJsonRecord(value);
  if (!rawConfig) {
    return null;
  }

  if (isLegacyConditionalConfig(rawConfig)) {
    const rules = rawConfig.showIf
      .map(convertLegacyCondition)
      .filter((rule): rule is ConditionalRule => rule !== null);

    if (!rules.length) {
      return null;
    }

    return {
      rules,
      logic: 'OR',
    };
  }

  if (isConditionalConfigShape(rawConfig)) {
    const rules = rawConfig.rules
      .map(normalizeConditionalRule)
      .filter((rule): rule is ConditionalRule => rule !== null);

    if (!rules.length) {
      return null;
    }

    const logic = rawConfig.logic === 'OR' ? 'OR' : 'AND';

    return {
      rules,
      logic,
    };
  }

  return null;
}

function isLegacyConditionalConfig(value: JsonRecord): value is LegacyConditionalConfig {
  return Array.isArray(value.showIf);
}

function convertLegacyCondition(condition: LegacyCondition): ConditionalRule | null {
  if (typeof condition.field !== 'string') {
    return null;
  }

  if (!isValidOperator(condition.operator)) {
    return null;
  }

  const conditionalValue = toConditionalValue(condition.value);
  if (conditionalValue === undefined) {
    return null;
  }

  return {
    field: condition.field,
    operator: condition.operator,
    value: conditionalValue,
    action: 'show',
  };
}

function isConditionalConfigShape(value: JsonRecord): value is ConditionalConfigShape {
  return Array.isArray(value.rules);
}

function normalizeConditionalRule(rule: unknown): ConditionalRule | null {
  const record = parseJsonRecord(rule);
  if (!record) {
    return null;
  }

  const { field, operator, action, value } = record;

  if (typeof field !== 'string') {
    return null;
  }

  if (!isValidOperator(operator) || !isValidAction(action)) {
    return null;
  }

  const conditionalValue = toConditionalValue(value);
  if (conditionalValue === undefined) {
    return null;
  }

  return {
    field,
    operator,
    value: conditionalValue,
    action,
  };
}

function isValidOperator(value: unknown): value is ConditionalRule['operator'] {
  return typeof value === 'string' && (allowedOperators as string[]).includes(value);
}

function isValidAction(value: unknown): value is ConditionalRule['action'] {
  return typeof value === 'string' && (allowedActions as string[]).includes(value);
}

function toConditionalValue(value: unknown): ConditionalRule['value'] | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  return undefined;
}

function parseRepeatableColumn(value: unknown): RepeatableFieldConfig | null {
  const record = parseJsonRecord(value);
  if (!record) {
    return null;
  }

  const label = typeof record.label === 'string' ? record.label.trim() : '';
  if (!label) {
    return null;
  }

  const rawKey = typeof record.key === 'string' ? record.key.trim() : '';
  const normalizedKey = rawKey || labelToKey(label);

  const typeValue = typeof record.type === 'string' ? record.type : 'text';
  if (!(allowedColumnTypes as string[]).includes(typeValue)) {
    return null;
  }

  const required = Boolean(record.required);
  const requiredWhenSelected = Boolean(record.requiredWhenSelected);

  return {
    key: normalizedKey,
    label,
    type: typeValue as RepeatableFieldConfig['type'],
    required,
    requiredWhenSelected,
  };
}

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)+/g, '') || 'column';
}

function parseOptionalRowCount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return undefined;
}

export function parseRepeatableGroupConfig(value: unknown): RepeatableGroupConfig | null {
  const record = parseJsonRecord(value);
  if (!record) {
    return null;
  }

  const rawColumns = Array.isArray(record.columns) ? record.columns : [];
  const columns = rawColumns
    .map(parseRepeatableColumn)
    .filter((column): column is RepeatableFieldConfig => column !== null);

  if (!columns.length) {
    return null;
  }

  const minRows = parseOptionalRowCount(record.minRows);
  const maxRows = parseOptionalRowCount(record.maxRows);

  const mode = parseRepeatableMode(record.mode);
  const rows = parsePredefinedRows(record.rows);

  const selectorColumnKey = typeof record.selectorColumnKey === 'string' ? record.selectorColumnKey : undefined;

  const requireOnSelect = Array.isArray(record.requireOnSelect)
    ? record.requireOnSelect
        .map((item) => (typeof item === 'string' ? item : null))
        .filter((item): item is string => Boolean(item))
    : undefined;

  const result: RepeatableGroupConfig = {
    columns,
  };

  if (typeof minRows === 'number') {
    result.minRows = minRows;
  }

  if (typeof maxRows === 'number') {
    result.maxRows = typeof result.minRows === 'number' && maxRows < result.minRows ? result.minRows : maxRows;
  }

  if (mode) {
    result.mode = mode;
  }

  if (Array.isArray(rows) && rows.length > 0) {
    result.rows = rows;
  }

  if (typeof record.rowLabel === 'string' && record.rowLabel.trim().length > 0) {
    result.rowLabel = record.rowLabel.trim();
  }

  if (selectorColumnKey) {
    result.selectorColumnKey = selectorColumnKey;
  }

  if (requireOnSelect && requireOnSelect.length > 0) {
    result.requireOnSelect = requireOnSelect;
  }

  return result;
}

function parseRepeatableMode(value: unknown): RepeatableGroupMode | undefined {
  if (value === 'predefined' || value === 'user') {
    return value;
  }
  return undefined;
}

function parsePredefinedRows(value: unknown): RepeatablePredefinedRow[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rows: RepeatablePredefinedRow[] = [];

  value.forEach((item, index) => {
    const record = parseJsonRecord(item);
    if (!record) {
      return;
    }

    const label = typeof record.label === 'string' ? record.label.trim() : '';
    if (!label) {
      return;
    }

    const idRaw = typeof record.id === 'string' ? record.id.trim() : '';
    const id = idRaw || `row_${index + 1}`;
    const description = typeof record.description === 'string' ? record.description : undefined;

    rows.push({ id, label, description });
  });

  return rows.length > 0 ? rows : undefined;
}
