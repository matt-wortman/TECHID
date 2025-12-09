import { ValidationRule, ValidationConfig, FormQuestionWithDetails } from './types';

/**
 * Validates a single value against a validation rule
 */
export function validateRule(rule: ValidationRule, value: string | number | boolean | string[] | Record<string, unknown> | null | undefined): string | null {
  // Handle required validation
  if (rule.type === 'required') {
    if (value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0)) {
      return rule.message || 'This field is required';
    }
    return null;
  }

  // Skip other validations if value is empty (unless required)
  if (value === undefined || value === null || value === '') {
    return null;
  }

  switch (rule.type) {
    case 'min':
      if (typeof value === 'string' || Array.isArray(value)) {
        if (typeof rule.value === 'number' && value.length < rule.value) {
          return rule.message || `Minimum length is ${rule.value}`;
        }
      } else if (typeof value === 'number') {
        if (typeof rule.value === 'number' && value < rule.value) {
          return rule.message || `Minimum value is ${rule.value}`;
        }
      }
      return null;

    case 'max':
      if (typeof value === 'string' || Array.isArray(value)) {
        if (typeof rule.value === 'number' && value.length > rule.value) {
          return rule.message || `Maximum length is ${rule.value}`;
        }
      } else if (typeof value === 'number') {
        if (typeof rule.value === 'number' && value > rule.value) {
          return rule.message || `Maximum value is ${rule.value}`;
        }
      }
      return null;

    case 'pattern':
      if (typeof value === 'string' && typeof rule.value === 'string') {
        const regex = new RegExp(rule.value);
        if (!regex.test(value)) {
          return rule.message || 'Invalid format';
        }
      }
      return null;

    case 'email':
      if (typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return rule.message || 'Invalid email address';
        }
      }
      return null;

    case 'url':
      if (typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          return rule.message || 'Invalid URL';
        }
      }
      return null;

    case 'number':
      if (isNaN(Number(value))) {
        return rule.message || 'Must be a valid number';
      }
      return null;

    case 'custom':
      // Custom validation would need to be implemented by passing a function
      // For now, just return null
      return null;

    default:
      console.warn(`Unknown validation type: ${rule.type}`);
      return null;
  }
}

/**
 * Validates a value against a validation configuration
 */
export function validateField(config: ValidationConfig | null, value: string | number | boolean | string[] | Record<string, unknown> | null | undefined): string | null {
  if (!config || !config.rules) {
    return null;
  }

  // Check all rules and return the first error found
  for (const rule of config.rules) {
    const error = validateRule(rule, value);
    if (error) {
      return error;
    }
  }

  return null;
}

/**
 * Validates a question based on its configuration and conditional requirements
 */
export function validateQuestion(
  question: FormQuestionWithDetails,
  value: string | number | boolean | string[] | Record<string, unknown> | null | undefined,
  isRequired: boolean = false
): string | null {
  // Parse validation config from JSON
  const validationConfig = parseValidationConfig(question.validation);

  // Create effective validation config
  const effectiveConfig: ValidationConfig = {
    rules: []
  };

  // Add required rule if field is required
  if (isRequired || question.isRequired) {
    effectiveConfig.rules.push({
      type: 'required',
      message: `${question.label} is required`
    });
  }

  // Add field type specific validations
  switch (question.type) {
    case 'INTEGER':
      effectiveConfig.rules.push({
        type: 'number',
        message: `${question.label} must be a valid number`
      });
      break;

    case 'SCORING_0_3':
      effectiveConfig.rules.push(
        {
          type: 'number',
          message: `${question.label} must be a valid number`
        },
        {
          type: 'min',
          value: 0,
          message: `${question.label} must be at least 0`
        },
        {
          type: 'max',
          value: 3,
          message: `${question.label} must be at most 3`
        }
      );
      break;
  }

  // Add custom validation rules from database
  if (validationConfig && validationConfig.rules) {
    effectiveConfig.rules.push(...validationConfig.rules);
  }

  return validateField(effectiveConfig, value);
}

/**
 * Validates an entire form submission
 */
export function validateFormSubmission(
  questions: FormQuestionWithDetails[],
  responses: { [key: string]: string | number | boolean | string[] | Record<string, unknown> },
  requiredFields: Set<string> = new Set()
): { [key: string]: string } {
  const errors: { [key: string]: string } = {};

  for (const question of questions) {
    // Use dictionaryKey as the canonical key
    const questionKey = question.dictionaryKey;
    if (!questionKey) continue;

    const value = responses[questionKey];
    const isRequired = requiredFields.has(questionKey) || question.isRequired;

    const error = validateQuestion(question, value, isRequired);
    if (error) {
      errors[questionKey] = error;
    }
  }

  return errors;
}

/**
 * Helper functions for creating common validation rules
 */
export const ValidationHelpers = {
  required: (message?: string): ValidationRule => ({
    type: 'required',
    message: message || 'This field is required'
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    type: 'min',
    value: length,
    message: message || `Minimum length is ${length}`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    type: 'max',
    value: length,
    message: message || `Maximum length is ${length}`
  }),

  email: (message?: string): ValidationRule => ({
    type: 'email',
    message: message || 'Invalid email address'
  }),

  url: (message?: string): ValidationRule => ({
    type: 'url',
    message: message || 'Invalid URL'
  }),

  pattern: (regex: string, message?: string): ValidationRule => ({
    type: 'pattern',
    value: regex,
    message: message || 'Invalid format'
  }),

  range: (min: number, max: number, message?: string): ValidationRule[] => [
    {
      type: 'min',
      value: min,
      message: message || `Value must be between ${min} and ${max}`
    },
    {
      type: 'max',
      value: max,
      message: message || `Value must be between ${min} and ${max}`
    }
  ]
};

/**
 * Parse validation configuration from JSON stored in database
 */
export function parseValidationConfig(validationJson: unknown): ValidationConfig | null {
  try {
    if (!validationJson) return null;

    // If it's already parsed
    if (typeof validationJson === 'object' && validationJson !== null && 'rules' in validationJson) {
      return validationJson as ValidationConfig;
    }

    // If it's a JSON string
    if (typeof validationJson === 'string') {
      return JSON.parse(validationJson) as ValidationConfig;
    }

    return null;
  } catch (error) {
    console.error('Error parsing validation config:', error);
    return null;
  }
}

/**
 * Create validation schema for use with form libraries like Zod
 */
export function createValidationSchema(questions: FormQuestionWithDetails[]) {
  // This would integrate with Zod or another schema validation library
  // For now, we'll use our custom validation functions
  return {
    validate: (data: { [questionKey: string]: string | number | boolean | string[] | Record<string, unknown> }) => {
      return validateFormSubmission(questions, data);
    }
  };
}