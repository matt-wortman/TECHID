import { z } from 'zod';
import { FieldType } from '@prisma/client';
import { ValidationConfig } from '../form-engine/types';

// Base validation schemas for different field types
export const fieldValidationSchemas = {
  [FieldType.SHORT_TEXT]: z.string().min(1, 'This field is required').max(255, 'Text must be less than 255 characters'),
  [FieldType.LONG_TEXT]: z.string().min(1, 'This field is required'),
  [FieldType.INTEGER]: z.number().int('Must be a whole number').min(0, 'Must be non-negative'),
  [FieldType.SINGLE_SELECT]: z.string().min(1, 'Please select an option'),
  [FieldType.MULTI_SELECT]: z.array(z.string()).min(1, 'Please select at least one option'),
  [FieldType.CHECKBOX_GROUP]: z.array(z.string()).min(1, 'Please select at least one option'),
  [FieldType.DATE]: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),
  [FieldType.SCORING_0_3]: z.number().int('Score must be a whole number').min(0, 'Score must be at least 0').max(3, 'Score must be at most 3'),
  [FieldType.SCORING_MATRIX]: z.unknown().optional(),
  [FieldType.REPEATABLE_GROUP]: z.array(z.record(z.string(), z.string())).optional(),
  [FieldType.DATA_TABLE_SELECTOR]: z.array(z.record(z.string(), z.any())).optional(),
};

// Optional versions for non-required fields
export const optionalFieldValidationSchemas = {
  [FieldType.SHORT_TEXT]: z.string().max(255, 'Text must be less than 255 characters').optional(),
  [FieldType.LONG_TEXT]: z.string().optional(),
  [FieldType.INTEGER]: z.number().int('Must be a whole number').min(0, 'Must be non-negative').optional(),
  [FieldType.SINGLE_SELECT]: z.string().optional(),
  [FieldType.MULTI_SELECT]: z.array(z.string()).optional(),
  [FieldType.CHECKBOX_GROUP]: z.array(z.string()).optional(),
  [FieldType.DATE]: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date').optional(),
  [FieldType.SCORING_0_3]: z.number().int('Score must be a whole number').min(0, 'Score must be at least 0').max(3, 'Score must be at most 3').optional(),
  [FieldType.SCORING_MATRIX]: z.unknown().optional(),
  [FieldType.REPEATABLE_GROUP]: z.array(z.record(z.string(), z.string())).optional(),
  [FieldType.DATA_TABLE_SELECTOR]: z.array(z.record(z.string(), z.any())).optional(),
};

// Specific validation schemas for known question keys (dictionaryKey)
export const specificFieldValidations = {
  // Technology ID should be alphanumeric
  'tech.techId': z.string().min(1, 'Technology ID is required').regex(/^[A-Za-z0-9-]+$/, 'Technology ID should contain only letters, numbers, and hyphens'),

  // Date field should be properly formatted
  'tech.submissionDate': z.string().min(1, 'Date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),

  // Market overview allows hyperlinks
  'triage.marketOverview': z.string().min(1, 'Market overview is required'),

  // Scoring fields with specific criteria
  'triage.missionAlignmentScore': z.number().int().min(0).max(3),
  'triage.unmetNeedScore': z.number().int().min(0).max(3),
  'triage.stateOfArtScore': z.number().int().min(0).max(3),
  'triage.marketSizeScore': z.number().int().min(0).max(3),
  'triage.patientPopulationScore': z.number().int().min(0).max(3),
  'triage.competitorsScore': z.number().int().min(0).max(3),
};

// Repeatable group validation schemas
export const competitiveLandscapeSchema = z.array(
  z.object({
    company: z.string().min(1, 'Company name is required'),
    product: z.string().min(1, 'Product name is required'),
    description: z.string().min(1, 'Description is required'),
    revenue: z.string().optional(),
  })
);

export const subjectMatterExpertsSchema = z.array(
  z.object({
    name: z.string().min(1, 'Expert name is required'),
    expertise: z.string().min(1, 'Expertise area is required'),
    contact: z.string().min(1, 'Contact information is required'),
  })
);

/**
 * Get validation schema for a specific field
 */
export function getFieldValidationSchema(
  questionKey: string,
  fieldType: FieldType,
  isRequired: boolean,
  customValidation?: ValidationConfig
): z.ZodSchema {
  // Check for specific field validation first
  if (specificFieldValidations[questionKey as keyof typeof specificFieldValidations]) {
    return specificFieldValidations[questionKey as keyof typeof specificFieldValidations];
  }

  // Handle repeatable groups
  if (fieldType === FieldType.REPEATABLE_GROUP) {
    if (questionKey === 'triage.competitiveLandscape') {
      return competitiveLandscapeSchema;
    }
    if (questionKey === 'triage.smeList') {
      return subjectMatterExpertsSchema;
    }
    return fieldValidationSchemas[fieldType];
  }

  if (fieldType === FieldType.DATA_TABLE_SELECTOR) {
    return fieldValidationSchemas[fieldType];
  }

  // Use required or optional schema based on field requirements
  const baseSchema = isRequired
    ? fieldValidationSchemas[fieldType]
    : optionalFieldValidationSchemas[fieldType];

  return applyCustomValidationRules(baseSchema, fieldType, customValidation?.rules ?? []);
}

/**
 * Validate a single field value
 */
export function validateField(
  questionKey: string,
  fieldType: FieldType,
  value: unknown,
  isRequired: boolean,
  customValidation?: ValidationConfig
): { isValid: boolean; error?: string } {
  try {
    const schema = getFieldValidationSchema(questionKey, fieldType, isRequired, customValidation);
    schema.parse(value);

    if (fieldType === FieldType.DATA_TABLE_SELECTOR) {
      const rows = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
      const hasSelection = rows.some((row) => Boolean(row.include));
      const missingNotes = rows.some((row) => {
        if (!row.include) {
          return false;
        }
        const noteValue = typeof row.benefit === 'string' ? row.benefit.trim() : '';
        return noteValue.length === 0;
      });

      if (missingNotes) {
        return {
          isValid: false,
          error: 'Provide a benefit description for each selected stakeholder.',
        };
      }

      if (isRequired && !hasSelection) {
        return {
          isValid: false,
          error: 'Select at least one stakeholder or mark the field as not required.',
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Validation failed'
      };
    }
    return {
      isValid: false,
      error: 'Validation error'
    };
  }
}

/**
 * Validate all form responses
 */
export function validateFormData(
  responses: Record<string, unknown>,
  repeatGroups: Record<string, unknown[]>,
  questions: Array<{
    dictionaryKey: string | null;
    type: FieldType;
    isRequired: boolean;
    validation?: ValidationConfig;
  }>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate regular responses
  for (const question of questions) {
    // Skip questions without dictionaryKey
    const questionKey = question.dictionaryKey;
    if (!questionKey) continue;

    if (question.type === FieldType.REPEATABLE_GROUP) {
      // Handle repeatable groups separately
      const groupData = repeatGroups[questionKey] || [];
      const result = validateField(
        questionKey,
        question.type,
        groupData,
        question.isRequired,
        question.validation
      );

      if (!result.isValid && result.error) {
        errors[questionKey] = result.error;
      }
    } else {
      // Handle regular fields
      const value = responses[questionKey];
      const result = validateField(
        questionKey,
        question.type,
        value,
        question.isRequired,
        question.validation
      );

      if (!result.isValid && result.error) {
        errors[questionKey] = result.error;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Real-time validation hook for form fields
 */
export function useFieldValidation(
  questionKey: string,
  fieldType: FieldType,
  value: unknown,
  isRequired: boolean,
  customValidation?: ValidationConfig
) {
  const result = validateField(questionKey, fieldType, value, isRequired, customValidation);
  return result;
}

function applyCustomValidationRules<T extends z.ZodTypeAny>(
  schema: T,
  fieldType: FieldType,
  rules: ValidationConfig['rules']
): z.ZodTypeAny {
  if (!rules || rules.length === 0) {
    return schema;
  }

  let currentSchema: z.ZodTypeAny = schema;
  for (const rule of rules) {
    currentSchema = applyValidationRule(currentSchema, fieldType, rule);
  }
  return currentSchema;
}

function applyValidationRule(schema: z.ZodTypeAny, fieldType: FieldType, rule: ValidationConfig['rules'][number]): z.ZodTypeAny {
  const message = rule.message || 'Invalid value';

  switch (rule.type) {
    case 'required':
      return schema.refine((value) => !isEmptyValue(value), { message });

    case 'min': {
      const threshold = Number(rule.value ?? 0);
      if (isNumericFieldType(fieldType)) {
        return schema.refine((value) =>
          isEmptyValue(value) || (typeof value === 'number' ? value >= threshold : Number(value) >= threshold),
        { message }
        );
      }

      return schema.refine((value) => {
        if (isEmptyValue(value)) return true;
        if (typeof value === 'string') return value.length >= threshold;
        if (Array.isArray(value)) return value.length >= threshold;
        return true;
      }, { message });
    }

    case 'max': {
      const threshold = Number(rule.value ?? 0);
      if (isNumericFieldType(fieldType)) {
        return schema.refine((value) =>
          isEmptyValue(value) || (typeof value === 'number' ? value <= threshold : Number(value) <= threshold),
        { message }
        );
      }

      return schema.refine((value) => {
        if (isEmptyValue(value)) return true;
        if (typeof value === 'string') return value.length <= threshold;
        if (Array.isArray(value)) return value.length <= threshold;
        return true;
      }, { message });
    }

    case 'pattern': {
      if (typeof rule.value !== 'string') {
        return schema;
      }
      const regex = new RegExp(rule.value);
      return schema.refine((value) => isEmptyValue(value) || (typeof value === 'string' && regex.test(value)), { message });
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return schema.refine((value) => isEmptyValue(value) || (typeof value === 'string' && emailRegex.test(value)), { message });
    }

    case 'url': {
      return schema.refine((value) => {
        if (isEmptyValue(value)) return true;
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }, { message });
    }

    case 'number': {
      return schema.refine((value) => isEmptyValue(value) || typeof value === 'number', { message });
    }

    case 'custom':
      // Custom validators are not implemented in this layer; allow downstream hooks to handle them.
      return schema;

    default:
      return schema;
  }
}

function isNumericFieldType(fieldType: FieldType): boolean {
  return fieldType === FieldType.INTEGER || fieldType === FieldType.SCORING_0_3;
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}
