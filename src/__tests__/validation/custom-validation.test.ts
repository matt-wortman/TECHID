import { FieldType } from '@prisma/client';
import { validateField } from '@/lib/validation/form-schemas';
import { ValidationConfig } from '@/lib/form-engine/types';

describe('custom validation rules', () => {
  it('enforces minimum length for text fields', () => {
    const config: ValidationConfig = {
      rules: [{ type: 'min', value: 3, message: 'Too short' }],
    };

    const result = validateField('test', FieldType.SHORT_TEXT, 'ab', true, config);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Too short');
  });

  it('allows optional text fields to remain empty when min rule is present', () => {
    const config: ValidationConfig = {
      rules: [{ type: 'min', value: 5, message: 'Too short' }],
    };

    const result = validateField('test', FieldType.SHORT_TEXT, '', false, config);
    expect(result.isValid).toBe(true);
  });

  it('enforces numeric minimum for numeric fields', () => {
    const config: ValidationConfig = {
      rules: [{ type: 'min', value: 2, message: 'Too low' }],
    };

    const result = validateField('score', FieldType.INTEGER, 1, true, config);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Too low');
  });

  it('enforces email format when rule is provided', () => {
    const config: ValidationConfig = {
      rules: [{ type: 'email', message: 'Invalid email' }],
    };

    const result = validateField('email', FieldType.SHORT_TEXT, 'not-an-email', true, config);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email');
  });

  it('accepts valid email when email rule is provided', () => {
    const config: ValidationConfig = {
      rules: [{ type: 'email', message: 'Invalid email' }],
    };

    const result = validateField('email', FieldType.SHORT_TEXT, 'user@example.com', true, config);
    expect(result.isValid).toBe(true);
  });
});
