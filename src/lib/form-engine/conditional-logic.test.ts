import {
  evaluateRule,
  evaluateConditional,
  shouldShowField,
  shouldRequireField,
  parseConditionalConfig,
  ConditionalHelpers,
} from './conditional-logic';
import { ConditionalConfig, ConditionalRule, FormResponse } from './types';

describe('conditional-logic utilities', () => {
  describe('evaluateRule', () => {
    type RuleTestCase = [string, Pick<ConditionalRule, 'operator' | 'value'>, FormResponse, boolean];

    it.each<RuleTestCase>([
      ['equals', { operator: 'equals', value: 'yes' }, { trigger: 'yes' }, true],
      ['not_equals', { operator: 'not_equals', value: 'yes' }, { trigger: 'no' }, true],
      ['contains array', { operator: 'contains', value: 'beta' }, { trigger: ['alpha', 'beta'] }, true],
      ['contains string', { operator: 'contains', value: 'child' }, { trigger: 'childhood' }, true],
      ['greater_than', { operator: 'greater_than', value: 10 }, { trigger: 11 }, true],
      ['less_than', { operator: 'less_than', value: 10 }, { trigger: 9 }, true],
      ['exists', { operator: 'exists', value: null }, { trigger: 'value' }, true],
      ['not_exists', { operator: 'not_exists', value: null }, { trigger: '' }, true],
      ['not_empty array', { operator: 'not_empty', value: null }, { trigger: [] }, false],
    ])('handles %s operator', (_label, ruleConfig, responses, expected) => {
      const rule: ConditionalRule = {
        field: 'trigger',
        action: 'show',
        ...ruleConfig,
      };

      expect(evaluateRule(rule, responses)).toBe(expected);
    });
  });

  it('evaluates AND/OR logic correctly', () => {
    const responses = { a: 'yes', b: 'no' };
    const andConfig: ConditionalConfig = {
      rules: [
        { field: 'a', operator: 'equals', value: 'yes', action: 'show' },
        { field: 'b', operator: 'equals', value: 'yes', action: 'show' },
      ],
      logic: 'AND',
    };
    const orConfig: ConditionalConfig = {
      ...andConfig,
      logic: 'OR',
    };

    expect(evaluateConditional(andConfig, responses)).toBe(false);
    expect(evaluateConditional(orConfig, responses)).toBe(true);
  });

  describe('shouldShowField', () => {
    it('uses show actions to gate visibility', () => {
      const config: ConditionalConfig = {
        rules: [{ field: 'status', operator: 'equals', value: 'ready', action: 'show' }],
        logic: 'AND',
      };

      expect(shouldShowField(config, { status: 'ready' })).toBe(true);
      expect(shouldShowField(config, { status: 'pending' })).toBe(false);
    });

    it('uses hide actions to invert the result', () => {
      const config: ConditionalConfig = {
        rules: [{ field: 'status', operator: 'equals', value: 'archived', action: 'hide' }],
        logic: 'AND',
      };

      expect(shouldShowField(config, { status: 'archived' })).toBe(false);
      expect(shouldShowField(config, { status: 'active' })).toBe(true);
    });
  });

  describe('shouldRequireField', () => {
    it('forces required when condition matches require action', () => {
      const config: ConditionalConfig = {
        rules: [{ field: 'a', operator: 'exists', value: null, action: 'require' }],
        logic: 'AND',
      };

      expect(shouldRequireField(config, false, { a: 'value' })).toBe(true);
      expect(shouldRequireField(config, false, { a: '' })).toBe(false);
    });

    it('marks optional when optional action matches', () => {
      const config: ConditionalConfig = {
        rules: [{ field: 'a', operator: 'equals', value: 'skip', action: 'optional' }],
        logic: 'AND',
      };

      expect(shouldRequireField(config, true, { a: 'skip' })).toBe(false);
      expect(shouldRequireField(config, true, { a: 'value' })).toBe(true);
    });
  });

  describe('parseConditionalConfig', () => {
    it('parses JSON strings with valid rules', () => {
      const config = parseConditionalConfig(
        JSON.stringify({
          logic: 'OR',
          rules: [
            { field: 'a', operator: 'equals', value: 'x', action: 'show' },
          ],
        })
      );

      expect(config).toEqual({
        logic: 'OR',
        rules: [{ field: 'a', operator: 'equals', value: 'x', action: 'show' }],
      });
    });

    it('returns null for invalid payloads', () => {
      expect(parseConditionalConfig('{')).toBeNull();
      expect(parseConditionalConfig({ rules: [] })).toBeNull();
    });

    it('supports legacy showIf format', () => {
      const legacy = {
        showIf: [
          { field: 'legacy', operator: 'equals', value: 'on' },
          { field: 'legacy', operator: 'equals', value: 'off' },
        ],
      };

      const config = parseConditionalConfig(legacy);
      expect(config).not.toBeNull();
      expect(config?.logic).toBe('OR');
      expect(config?.rules).toHaveLength(2);
    });
  });

  it('exposes builder helpers for composable configs', () => {
    const config = ConditionalHelpers.and(
      ConditionalHelpers.showWhenEquals('status', 'ready'),
      ConditionalHelpers.requireWhenExists('notes')
    );

    expect(config.logic).toBe('AND');
    expect(config.rules).toHaveLength(2);
  });
});
