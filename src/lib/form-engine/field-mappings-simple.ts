import { FieldType } from './types';

/**
 * Field type to component mapping - simplified version
 * This maps field types to the appropriate component names
 */
export const fieldTypeComponentMap = {
  [FieldType.SHORT_TEXT]: 'Input',
  [FieldType.LONG_TEXT]: 'Textarea',
  [FieldType.INTEGER]: 'NumberInput',
  [FieldType.SINGLE_SELECT]: 'Select',
  [FieldType.MULTI_SELECT]: 'MultiSelect',
  [FieldType.CHECKBOX_GROUP]: 'CheckboxGroup',
  [FieldType.DATE]: 'DateInput',
  [FieldType.REPEATABLE_GROUP]: 'RepeatableGroup',
  [FieldType.DATA_TABLE_SELECTOR]: 'DataTableSelector',
  [FieldType.SCORING_0_3]: 'ScoringComponent',
  [FieldType.SCORING_MATRIX]: 'ScoringMatrixComponent',
};

/**
 * Get the appropriate component name for a field type
 */
export function getFieldComponentName(fieldType: FieldType): string {
  return fieldTypeComponentMap[fieldType] || 'Input';
}

/**
 * Helper function to determine if a field type supports multiple values
 */
export function isMultiValueField(fieldType: FieldType): boolean {
  const multiValueTypes: FieldType[] = [
    FieldType.MULTI_SELECT,
    FieldType.CHECKBOX_GROUP,
    FieldType.REPEATABLE_GROUP,
    FieldType.DATA_TABLE_SELECTOR,
  ];
  return multiValueTypes.includes(fieldType);
}

/**
 * Helper function to determine if a field type is numeric
 */
export function isNumericField(fieldType: FieldType): boolean {
  const numericTypes: FieldType[] = [
    FieldType.INTEGER,
    FieldType.SCORING_0_3,
    FieldType.SCORING_MATRIX
  ];
  return numericTypes.includes(fieldType);
}

/**
 * Helper function to get default value for a field type
 */
export function getDefaultValue(fieldType: FieldType): string | number | string[] {
  switch (fieldType) {
    case FieldType.SHORT_TEXT:
    case FieldType.LONG_TEXT:
    case FieldType.DATE:
      return '';

    case FieldType.INTEGER:
    case FieldType.SCORING_0_3:
    case FieldType.SCORING_MATRIX:
      return 0;

    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX_GROUP:
    case FieldType.REPEATABLE_GROUP:
    case FieldType.DATA_TABLE_SELECTOR:
      return [];

    case FieldType.SINGLE_SELECT:
      return '';

    default:
      return '';
  }
}

/**
 * Helper function to validate field input based on type
 */
export function validateFieldType(fieldType: FieldType, value: string | number | boolean | string[] | Record<string, unknown> | null | undefined): boolean {
  switch (fieldType) {
    case FieldType.INTEGER:
      return !isNaN(Number(value));

    case FieldType.SCORING_0_3:
      const num = Number(value);
      return !isNaN(num) && num >= 0 && num <= 3;

    case FieldType.SCORING_MATRIX:
      // Scoring matrix may contain multiple values or complex scoring data
      return value !== null && value !== undefined;

    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX_GROUP:
    case FieldType.REPEATABLE_GROUP:
    case FieldType.DATA_TABLE_SELECTOR:
      return Array.isArray(value);

    default:
      return true; // Basic validation passed for text fields
  }
}
