import {
  validateRule,
  validateField,
  validateQuestion,
  validateFormSubmission,
  parseValidationConfig,
  ValidationHelpers,
} from './validation';
import { FieldType } from './types';
import { buildQuestion } from './test-utils';

describe('form-engine validation utilities', () => {
  describe('validateRule', () => {
    it('enforces required values', () => {
      const result = validateRule(ValidationHelpers.required('Need value'), '');
      expect(result).toBe('Need value');
    });

    it('applies min/max constraints for strings and numbers', () => {
      const minRule = ValidationHelpers.minLength(3);
      expect(validateRule(minRule, 'ab')).toContain('Minimum length');
      expect(validateRule(minRule, 'abcd')).toBeNull();

      const maxRule = ValidationHelpers.maxLength(5);
      expect(validateRule(maxRule, 'abcdef')).toContain('Maximum length');
      expect(validateRule(maxRule, 'abc')).toBeNull();
    });

    it('validates pattern and email formats', () => {
      const patternRule = ValidationHelpers.pattern('^TTP$');
      expect(validateRule(patternRule, 'TTP')).toBeNull();
      expect(validateRule(patternRule, 'NOPE')).toContain('Invalid format');

      const emailRule = ValidationHelpers.email();
      expect(validateRule(emailRule, 'user@example.org')).toBeNull();
      expect(validateRule(emailRule, 'invalid')).toContain('Invalid email');
    });
  });

  it('validateField stops at the first failing rule', () => {
    const config = {
      rules: [ValidationHelpers.required(), ValidationHelpers.minLength(5)],
    };

    const result = validateField(config, 'abc');
    expect(result).toBe('Minimum length is 5');
  });

  it('validateQuestion composes required and type-specific rules', () => {
    const question = buildQuestion({
      label: 'Impact Score',
      type: FieldType.SCORING_0_3,
      isRequired: true,
    });

    const tooHigh = validateQuestion(question, 5, true);
    expect(tooHigh).toContain('at most 3');

    const valid = validateQuestion(question, 2, true);
    expect(valid).toBeNull();
  });

  it('validateFormSubmission collects per-field errors', () => {
    const requiredQuestion = buildQuestion({ dictionaryKey: 'test.required', label: 'Required Field', isRequired: true });
    const optionalQuestion = buildQuestion({ dictionaryKey: 'test.optional', label: 'Optional Field', isRequired: false });
    const errors = validateFormSubmission([requiredQuestion, optionalQuestion], { 'test.optional': 'ok' }, new Set(['test.required']));
    // Use bracket notation for keys containing dots
    expect(errors['test.required']).toBeDefined();
    expect(errors['test.required']).toContain('Required Field');
    expect(errors['test.optional']).toBeUndefined();
  });

  describe('parseValidationConfig', () => {
    it('parses JSON strings into validation configs', () => {
      const config = parseValidationConfig(JSON.stringify({ rules: [ValidationHelpers.required()] }));
      expect(config?.rules).toHaveLength(1);
    });

    it('returns null for invalid payloads', () => {
      expect(parseValidationConfig(undefined)).toBeNull();
      expect(parseValidationConfig('{nope')).toBeNull();
    });
  });
});
