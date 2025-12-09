import { ConditionalRule, ConditionalConfig, FormResponse } from './types';
import { parseConditionalConfigValue } from './json-utils';

/**
 * Evaluates a single conditional rule against the current form responses
 */
export function evaluateRule(rule: ConditionalRule, responses: FormResponse): boolean {
  const fieldValue = responses[rule.field];

  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;

    case 'not_equals':
      return fieldValue !== rule.value;

    case 'contains':
      if (rule.value === null) {
        return false;
      }
      if (Array.isArray(fieldValue)) {
        // For arrays, we convert both values to strings for comparison
        return fieldValue.some(item => String(item) === String(rule.value));
      }
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return fieldValue.includes(rule.value);
      }
      return false;

    case 'greater_than':
      return Number(fieldValue) > Number(rule.value);

    case 'less_than':
      return Number(fieldValue) < Number(rule.value);

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

    case 'not_exists':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';

    case 'not_empty':
      if (Array.isArray(fieldValue)) {
        return fieldValue.length > 0;
      }
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

    default:
      console.warn(`Unknown conditional operator: ${rule.operator}`);
      return false;
  }
}

/**
 * Evaluates a conditional configuration against the current form responses
 */
export function evaluateConditional(config: ConditionalConfig, responses: FormResponse): boolean {
  const results = config.rules.map(rule => evaluateRule(rule, responses));

  if (config.logic === 'AND') {
    return results.every(result => result);
  } else {
    return results.some(result => result);
  }
}

/**
 * Determines if a field should be visible based on its conditional configuration
 */
export function shouldShowField(
  conditionalConfig: ConditionalConfig | null,
  responses: FormResponse
): boolean {
  if (!conditionalConfig) {
    return true; // No conditions means always show
  }

  const conditionResult = evaluateConditional(conditionalConfig, responses);

  // Check if any rule has 'show' action
  const hasShowAction = conditionalConfig.rules.some(rule => rule.action === 'show');
  const hasHideAction = conditionalConfig.rules.some(rule => rule.action === 'hide');

  if (hasShowAction && !hasHideAction) {
    // Only show actions - show if condition is true
    return conditionResult;
  } else if (hasHideAction && !hasShowAction) {
    // Only hide actions - hide if condition is true (so show if false)
    return !conditionResult;
  } else {
    // Mixed or no specific actions - default to showing
    return conditionResult;
  }
}

/**
 * Determines if a field should be required based on its conditional configuration
 */
export function shouldRequireField(
  conditionalConfig: ConditionalConfig | null,
  baseRequired: boolean,
  responses: FormResponse
): boolean {
  if (!conditionalConfig) {
    return baseRequired; // No conditions means use base requirement
  }

  const conditionResult = evaluateConditional(conditionalConfig, responses);

  // Check for require/optional actions
  const hasRequireAction = conditionalConfig.rules.some(rule => rule.action === 'require');
  const hasOptionalAction = conditionalConfig.rules.some(rule => rule.action === 'optional');

  if (hasRequireAction && conditionResult) {
    return true; // Force required if condition is met
  } else if (hasOptionalAction && conditionResult) {
    return false; // Force optional if condition is met
  } else {
    return baseRequired; // Use base requirement
  }
}

/**
 * Helper function to create common conditional rules
 */
export const ConditionalHelpers = {
  /**
   * Create a rule to show field when another field equals a value
   */
  showWhenEquals: (field: string, value: string | number | boolean | null): ConditionalRule => ({
    field,
    operator: 'equals',
    value,
    action: 'show'
  }),

  /**
   * Create a rule to hide field when another field equals a value
   */
  hideWhenEquals: (field: string, value: string | number | boolean | null): ConditionalRule => ({
    field,
    operator: 'equals',
    value,
    action: 'hide'
  }),

  /**
   * Create a rule to require field when another field has a value
   */
  requireWhenExists: (field: string): ConditionalRule => ({
    field,
    operator: 'exists',
    value: null,
    action: 'require'
  }),

  /**
   * Create a rule to show field when another field contains a value (for arrays/multi-select)
   */
  showWhenContains: (field: string, value: string | number | boolean | null): ConditionalRule => ({
    field,
    operator: 'contains',
    value,
    action: 'show'
  }),

  /**
   * Create a configuration with AND logic
   */
  and: (...rules: ConditionalRule[]): ConditionalConfig => ({
    rules,
    logic: 'AND'
  }),

  /**
   * Create a configuration with OR logic
   */
  or: (...rules: ConditionalRule[]): ConditionalConfig => ({
    rules,
    logic: 'OR'
  })
};

/**
 * Parse conditional configuration from JSON stored in database
 */
export function parseConditionalConfig(conditionalJson: unknown): ConditionalConfig | null {
  try {
    return parseConditionalConfigValue(conditionalJson);
  } catch (error) {
    console.error('Error parsing conditional config:', error);
    return null;
  }
}
