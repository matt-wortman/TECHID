import {
  getFieldValidationSchema,
  validateField,
  validateFormData,
  useFieldValidation,
} from './form-schemas';
import { FieldType } from '@prisma/client';
import type { ValidationConfig } from '@/lib/form-engine/types';

describe('form-schemas validation helpers', () => {
  it('applies specific field schemas such as tech.techId', () => {
    const schema = getFieldValidationSchema('tech.techId', FieldType.SHORT_TEXT, true);
    expect(() => schema.parse('TECH-123')).not.toThrow();
    expect(() => schema.parse('invalid value!')).toThrow();
  });

  it('validates repeatable group overrides for known dictionaryKeys', () => {
    const schema = getFieldValidationSchema('triage.competitiveLandscape', FieldType.REPEATABLE_GROUP, true);
    expect(() =>
      schema.parse([
        { company: 'Acme', product: 'Widget', description: 'desc', revenue: 'n/a' },
      ])
    ).not.toThrow();

    expect(() => schema.parse([{ company: '', product: '', description: '' }])).toThrow();
  });

  it('enforces data table selector rules for selection and notes', () => {
    const result = validateField(
      'triage.stakeholders',
      FieldType.DATA_TABLE_SELECTOR,
      [{ include: true, benefit: '' }],
      true
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('benefit');

    const validResult = validateField(
      'triage.stakeholders',
      FieldType.DATA_TABLE_SELECTOR,
      [{ include: true, benefit: 'Value' }],
      true
    );

    expect(validResult.isValid).toBe(true);
  });

  it('validateFormData returns aggregated errors for responses and repeat groups', () => {
    const questions: Array<{
      dictionaryKey: string | null;
      type: FieldType;
      isRequired: boolean;
      validation?: ValidationConfig;
    }> = [
      { dictionaryKey: 'triage.targetUsers', type: FieldType.SHORT_TEXT, isRequired: true },
      { dictionaryKey: 'triage.competitiveLandscape', type: FieldType.REPEATABLE_GROUP, isRequired: true },
    ];

    const repeatGroups = {
      'triage.competitiveLandscape': [
        { company: '', product: '', description: '' },
      ],
    } as Record<string, unknown[]>;

    const { isValid, errors } = validateFormData({}, repeatGroups, questions);
    expect(isValid).toBe(false);
    // Use bracket notation for keys containing dots
    expect(errors['triage.targetUsers']).toBeDefined();
    expect(errors['triage.competitiveLandscape']).toBeDefined();
  });

  it('useFieldValidation mirrors validateField results', () => {
    const response = useFieldValidation('triage.targetUsers', FieldType.SHORT_TEXT, '', false, {
      rules: [{ type: 'required', message: 'Needed' }],
    });

    expect(response.isValid).toBe(false);
    expect(response.error).toBe('Needed');
  });
});
