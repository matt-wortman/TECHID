import { FieldType, SubmissionStatus } from '@prisma/client';
import { buildPrintableForm, BuildPrintableFormParams } from './serialize';
import { buildTemplate, buildSection, buildQuestion } from '../test-utils';
import { FormTemplateWithSections, FormResponse, RepeatableGroupData } from '../types';

describe('PDF serialization', () => {
  describe('buildPrintableForm', () => {
    it('returns printable form with metadata', () => {
      const template = buildTemplate({ name: 'Test Form', version: '2.0' });
      const exportedAt = new Date('2025-01-15T10:00:00Z');

      const result = buildPrintableForm({
        template,
        exportedAt,
      });

      expect(result.metadata.templateName).toBe('Test Form');
      expect(result.metadata.templateVersion).toBe('2.0');
      expect(result.metadata.exportedAt).toBe('2025-01-15T10:00:00.000Z');
      expect(result.metadata.statusLabel).toBe('In Progress');
    });

    it('filters out empty sections', () => {
      // Section with only INFO_BOX questions should be filtered out
      const infoBoxQuestion = buildQuestion({
        type: FieldType.SHORT_TEXT,
        validation: JSON.stringify({ isInfoBox: true }),
      });
      const emptySection = buildSection({ questions: [infoBoxQuestion] });

      const normalQuestion = buildQuestion({ type: FieldType.SHORT_TEXT });
      const normalSection = buildSection({ questions: [normalQuestion] });

      const template = buildTemplate({
        sections: [emptySection, normalSection],
      });

      const result = buildPrintableForm({ template });

      // Only the section with non-INFO_BOX questions should remain
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].questions).toHaveLength(1);
    });

    it('orders sections by order field', () => {
      const section1 = buildSection({ title: 'Section A', order: 2 });
      const section2 = buildSection({ title: 'Section B', order: 0 });
      const section3 = buildSection({ title: 'Section C', order: 1 });

      const template = buildTemplate({
        sections: [section1, section2, section3],
      });

      const result = buildPrintableForm({ template });

      expect(result.sections[0].title).toBe('Section B');
      expect(result.sections[1].title).toBe('Section C');
      expect(result.sections[2].title).toBe('Section A');
    });

    it('passes through submission metadata', () => {
      const template = buildTemplate();

      const result = buildPrintableForm({
        template,
        status: SubmissionStatus.SUBMITTED,
        submissionId: 'sub-123',
        submittedAt: '2025-01-15T12:00:00Z',
        submittedBy: 'user@example.com',
        techId: 'TECH-001',
        notes: 'Test notes',
      });

      expect(result.metadata.statusLabel).toBe('Submitted');
      expect(result.metadata.submissionId).toBe('sub-123');
      expect(result.metadata.submittedAt).toBe('2025-01-15T12:00:00Z');
      expect(result.metadata.submittedBy).toBe('user@example.com');
      expect(result.metadata.techId).toBe('TECH-001');
      expect(result.metadata.notes).toBe('Test notes');
    });

    it('includes scoring matrix with valid responses', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': 3,
        'triage.unmetNeedScore': 2,
        'triage.stateOfArtScore': 2,
        'triage.marketScore': 1,
        'triage.reimbursementPath': 2,
        'triage.regulatoryPath': 3,
      };

      const result = buildPrintableForm({ template, responses });

      expect(result.scoringMatrix).toBeDefined();
      expect(result.scoringMatrix!.sections).toHaveLength(2);
      expect(result.scoringMatrix!.sections[0].key).toBe('IMPACT');
      expect(result.scoringMatrix!.sections[1].key).toBe('VALUE');
    });

    it('includes impact value matrix', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': 3,
        'triage.unmetNeedScore': 3,
        'triage.stateOfArtScore': 3,
        'triage.marketScore': 3,
        'triage.reimbursementPath': 3,
        'triage.regulatoryPath': 3,
      };

      const result = buildPrintableForm({ template, responses });

      expect(result.impactValueMatrix).toBeDefined();
      expect(result.impactValueMatrix!.impactScore).toBe(3);
      expect(result.impactValueMatrix!.valueScore).toBe(3);
      expect(result.impactValueMatrix!.recommendation).toBe('Proceed');
      expect(result.impactValueMatrix!.dotPosition.x).toBeCloseTo(1, 2);
      expect(result.impactValueMatrix!.dotPosition.y).toBeCloseTo(1, 2);
    });

    it('normalizes calculated scores to only numeric values', () => {
      const template = buildTemplate();
      const calculatedScores = {
        impactScore: 2.5,
        valueScore: 2.0,
        invalidScore: 'not a number',
        nullScore: null,
        nanScore: NaN,
        infinityScore: Infinity,
      };

      const result = buildPrintableForm({
        template,
        calculatedScores: calculatedScores as Record<string, unknown>,
      });

      expect(result.calculatedScores).toBeDefined();
      expect(result.calculatedScores!.impactScore).toBe(2.5);
      expect(result.calculatedScores!.valueScore).toBe(2);
      expect(result.calculatedScores!.invalidScore).toBeUndefined();
      expect(result.calculatedScores!.nullScore).toBeUndefined();
      expect(result.calculatedScores!.nanScore).toBeUndefined();
      expect(result.calculatedScores!.infinityScore).toBeUndefined();
    });

    it('returns null for empty calculated scores', () => {
      const template = buildTemplate();
      const calculatedScores = {
        invalidOnly: 'string',
      };

      const result = buildPrintableForm({
        template,
        calculatedScores: calculatedScores as Record<string, unknown>,
      });

      expect(result.calculatedScores).toBeUndefined();
    });
  });

  describe('section and question building', () => {
    it('orders questions by order field within sections', () => {
      const q1 = buildQuestion({ label: 'Question A', order: 2 });
      const q2 = buildQuestion({ label: 'Question B', order: 0 });
      const q3 = buildQuestion({ label: 'Question C', order: 1 });

      const section = buildSection({ questions: [q1, q2, q3] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({ template });

      expect(result.sections[0].questions[0].label).toBe('Question B');
      expect(result.sections[0].questions[1].label).toBe('Question C');
      expect(result.sections[0].questions[2].label).toBe('Question A');
    });

    it('filters out INFO_BOX questions', () => {
      const normalQuestion = buildQuestion({
        dictionaryKey: 'test.normal',
        label: 'Normal Question',
        type: FieldType.SHORT_TEXT,
      });
      const infoBoxQuestion = buildQuestion({
        dictionaryKey: 'test.infobox',
        label: 'Info Box',
        type: FieldType.SHORT_TEXT,
        validation: JSON.stringify({ isInfoBox: true }),
      });

      const section = buildSection({ questions: [normalQuestion, infoBoxQuestion] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({ template });

      expect(result.sections[0].questions).toHaveLength(1);
      expect(result.sections[0].questions[0].label).toBe('Normal Question');
    });

    it('filters out hidden conditional questions with no content', () => {
      const visibleQuestion = buildQuestion({
        dictionaryKey: 'test.visible',
        label: 'Visible',
      });
      const hiddenQuestion = buildQuestion({
        dictionaryKey: 'test.hidden',
        label: 'Hidden',
        conditional: JSON.stringify({
          rules: [{ field: 'test.trigger', operator: 'equals', value: 'show', action: 'show' }],
          logic: 'AND',
        }),
      });

      const section = buildSection({ questions: [visibleQuestion, hiddenQuestion] });
      const template = buildTemplate({ sections: [section] });

      // No responses, so conditional evaluates to false and field is hidden
      const result = buildPrintableForm({ template, responses: {} });

      expect(result.sections[0].questions).toHaveLength(1);
      expect(result.sections[0].questions[0].label).toBe('Visible');
    });

    it('includes hidden conditional question if it has content', () => {
      const hiddenWithContent = buildQuestion({
        dictionaryKey: 'test.hidden',
        label: 'Hidden With Content',
        conditional: JSON.stringify({
          rules: [{ field: 'test.trigger', operator: 'equals', value: 'show', action: 'show' }],
          logic: 'AND',
        }),
      });

      const section = buildSection({ questions: [hiddenWithContent] });
      const template = buildTemplate({ sections: [section] });

      // Has response content, so should be included even if hidden
      const result = buildPrintableForm({
        template,
        responses: { 'test.hidden': 'Some answer' },
      });

      expect(result.sections[0].questions).toHaveLength(1);
      expect(result.sections[0].questions[0].answerText).toBe('Some answer');
    });

    it('displays em dash for questions without answers', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.empty',
        label: 'Empty Question',
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({ template, responses: {} });

      expect(result.sections[0].questions[0].answerText).toBe('—');
    });
  });

  describe('answer formatting', () => {
    it('formats SHORT_TEXT answers', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.text',
        type: FieldType.SHORT_TEXT,
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        responses: { 'test.text': 'Hello World' },
      });

      expect(result.sections[0].questions[0].answerText).toBe('Hello World');
    });

    it('formats MULTI_SELECT answers with option labels', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.multi',
        type: FieldType.MULTI_SELECT,
        options: [
          { id: '1', questionId: 'q1', value: 'opt1', label: 'Option 1', order: 0 },
          { id: '2', questionId: 'q1', value: 'opt2', label: 'Option 2', order: 1 },
          { id: '3', questionId: 'q1', value: 'opt3', label: 'Option 3', order: 2 },
        ],
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        responses: { 'test.multi': ['opt1', 'opt3'] },
      });

      expect(result.sections[0].questions[0].answerText).toBe('Option 1, Option 3');
    });

    it('formats SINGLE_SELECT answers with option label', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.single',
        type: FieldType.SINGLE_SELECT,
        options: [
          { id: '1', questionId: 'q1', value: 'yes', label: 'Yes', order: 0 },
          { id: '2', questionId: 'q1', value: 'no', label: 'No', order: 1 },
        ],
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        responses: { 'test.single': 'yes' },
      });

      expect(result.sections[0].questions[0].answerText).toBe('Yes');
    });

    it('falls back to raw value when option label not found', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.single',
        type: FieldType.SINGLE_SELECT,
        options: [],
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        responses: { 'test.single': 'unknown_value' },
      });

      expect(result.sections[0].questions[0].answerText).toBe('unknown_value');
    });

    it('formats boolean values as Yes/No', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.bool',
        type: FieldType.SHORT_TEXT,
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const resultYes = buildPrintableForm({
        template,
        responses: { 'test.bool': true },
      });
      expect(resultYes.sections[0].questions[0].answerText).toBe('Yes');

      const resultNo = buildPrintableForm({
        template,
        responses: { 'test.bool': false },
      });
      expect(resultNo.sections[0].questions[0].answerText).toBe('No');
    });

    it('formats numeric values as strings', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.num',
        type: FieldType.INTEGER,
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        responses: { 'test.num': 42 },
      });

      expect(result.sections[0].questions[0].answerText).toBe('42');
    });

    it('handles NaN and Infinity as empty strings', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.num',
        type: FieldType.INTEGER,
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const resultNaN = buildPrintableForm({
        template,
        responses: { 'test.num': NaN },
      });
      expect(resultNaN.sections[0].questions[0].answerText).toBe('—');

      const resultInfinity = buildPrintableForm({
        template,
        responses: { 'test.num': Infinity },
      });
      expect(resultInfinity.sections[0].questions[0].answerText).toBe('—');
    });

    it('formats array values as comma-separated', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.arr',
        type: FieldType.SHORT_TEXT,
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        responses: { 'test.arr': ['a', 'b', 'c'] },
      });

      expect(result.sections[0].questions[0].answerText).toBe('a, b, c');
    });

    it('formats object values as key-value pairs', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.obj',
        type: FieldType.SHORT_TEXT,
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        responses: { 'test.obj': { name: 'John', age: 30 } },
      });

      expect(result.sections[0].questions[0].answerText).toContain('name: John');
      expect(result.sections[0].questions[0].answerText).toContain('age: 30');
    });
  });

  describe('repeatable groups', () => {
    it('builds repeat group rows with 1-based indexing', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.repeat',
        type: FieldType.REPEATABLE_GROUP,
        repeatableConfig: JSON.stringify({
          columns: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'value', label: 'Value', type: 'number' },
          ],
        }),
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const repeatGroups: RepeatableGroupData = {
        'test.repeat': [
          { name: 'Item 1', value: 100 },
          { name: 'Item 2', value: 200 },
        ],
      };

      const result = buildPrintableForm({ template, repeatGroups });

      expect(result.sections[0].questions[0].repeatGroupRows).toHaveLength(2);
      expect(result.sections[0].questions[0].repeatGroupRows![0].index).toBe(1);
      expect(result.sections[0].questions[0].repeatGroupRows![1].index).toBe(2);
    });

    it('returns undefined for empty repeat groups', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.repeat',
        type: FieldType.REPEATABLE_GROUP,
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const result = buildPrintableForm({
        template,
        repeatGroups: { 'test.repeat': [] },
      });

      // Empty repeat groups have undefined repeatGroupRows and show em dash
      expect(result.sections[0].questions[0].repeatGroupRows).toBeUndefined();
      expect(result.sections[0].questions[0].answerText).toBe('—');
    });

    it('formats repeat group values correctly', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.repeat',
        type: FieldType.REPEATABLE_GROUP,
        repeatableConfig: JSON.stringify({
          columns: [
            { key: 'active', label: 'Active', type: 'checkbox' },
            { key: 'count', label: 'Count', type: 'number' },
          ],
        }),
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const repeatGroups: RepeatableGroupData = {
        'test.repeat': [{ active: true, count: 5 }],
      };

      const result = buildPrintableForm({ template, repeatGroups });

      const row = result.sections[0].questions[0].repeatGroupRows![0];
      const activeValue = row.values.find((v) => v.field === 'active');
      const countValue = row.values.find((v) => v.field === 'count');

      expect(activeValue?.value).toBe('Yes');
      expect(countValue?.value).toBe('5');
    });
  });

  describe('DATA_TABLE_SELECTOR handling', () => {
    it('filters to selected rows only', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.selector',
        type: FieldType.DATA_TABLE_SELECTOR,
        repeatableConfig: JSON.stringify({
          columns: [
            { key: 'include', label: 'Include', type: 'checkbox' },
            { key: 'benefit', label: 'Benefit', type: 'text' },
          ],
          selectorColumnKey: 'include',
          rows: [
            { id: 'row1', label: 'Stakeholder 1' },
            { id: 'row2', label: 'Stakeholder 2' },
          ],
        }),
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const repeatGroups: RepeatableGroupData = {
        'test.selector': [
          { __rowId: 'row1', include: true, benefit: 'Benefit 1' },
          { __rowId: 'row2', include: false, benefit: 'Benefit 2' },
        ],
      };

      const result = buildPrintableForm({ template, repeatGroups });

      // Only selected row should be included
      expect(result.sections[0].questions[0].repeatGroupRows).toHaveLength(1);
      expect(result.sections[0].questions[0].repeatGroupRows![0].index).toBe(1);
    });

    it('resolves row labels from config', () => {
      const question = buildQuestion({
        dictionaryKey: 'test.selector',
        type: FieldType.DATA_TABLE_SELECTOR,
        repeatableConfig: JSON.stringify({
          columns: [
            { key: 'include', label: 'Include', type: 'checkbox' },
            { key: 'notes', label: 'Notes', type: 'text' },
          ],
          selectorColumnKey: 'include',
          rowLabel: 'Stakeholders',
          rows: [{ id: 'stake1', label: 'Healthcare Providers' }],
        }),
      });

      const section = buildSection({ questions: [question] });
      const template = buildTemplate({ sections: [section] });

      const repeatGroups: RepeatableGroupData = {
        'test.selector': [{ __rowId: 'stake1', include: true, notes: 'Important' }],
      };

      const result = buildPrintableForm({ template, repeatGroups });

      const row = result.sections[0].questions[0].repeatGroupRows![0];
      const labelValue = row.values.find((v) => v.field === 'Stakeholders');
      expect(labelValue?.value).toBe('Healthcare Providers');
    });
  });

  describe('scoring matrix construction', () => {
    it('builds IMPACT section with 50% weights', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': 2,
        'triage.unmetNeedScore': 3,
        'triage.stateOfArtScore': 0,
        'triage.marketScore': 0,
        'triage.reimbursementPath': 0,
        'triage.regulatoryPath': 0,
      };

      const result = buildPrintableForm({ template, responses });
      const impactSection = result.scoringMatrix!.sections.find((s) => s.key === 'IMPACT');

      expect(impactSection).toBeDefined();
      expect(impactSection!.rows).toHaveLength(2);

      const missionRow = impactSection!.rows.find((r) => r.label === 'Mission Alignment');
      expect(missionRow?.score).toBe('2.00');
      expect(missionRow?.weight).toBe('50%');
      expect(missionRow?.total).toBe('1.00'); // 2 * 0.5

      const unmetRow = impactSection!.rows.find((r) => r.label === 'Unmet Need');
      expect(unmetRow?.score).toBe('3.00');
      expect(unmetRow?.total).toBe('1.50'); // 3 * 0.5
    });

    it('builds VALUE section with market sub-criteria', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': 0,
        'triage.unmetNeedScore': 0,
        'triage.stateOfArtScore': 2,
        'triage.marketScore': 1,
        'triage.reimbursementPath': 2,
        'triage.regulatoryPath': 3,
      };

      const result = buildPrintableForm({ template, responses });
      const valueSection = result.scoringMatrix!.sections.find((s) => s.key === 'VALUE');

      expect(valueSection).toBeDefined();
      expect(valueSection!.rows).toHaveLength(2);

      // Check market sub-criteria
      const marketSubCriteria = result.scoringMatrix!.marketSubCriteria;
      expect(marketSubCriteria).toHaveLength(3);

      const marketSizeRow = marketSubCriteria.find((r) => r.label.includes('TAM'));
      expect(marketSizeRow?.score).toBe('1.00');

      const patientRow = marketSubCriteria.find((r) => r.label.includes('Patient'));
      expect(patientRow?.score).toBe('2.00');

      const competitorsRow = marketSubCriteria.find((r) => r.label.includes('Competitors'));
      expect(competitorsRow?.score).toBe('3.00');
    });

    it('includes overall and market scores', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': 2,
        'triage.unmetNeedScore': 2,
        'triage.stateOfArtScore': 2,
        'triage.marketScore': 2,
        'triage.reimbursementPath': 2,
        'triage.regulatoryPath': 2,
      };

      const result = buildPrintableForm({ template, responses });

      expect(result.scoringMatrix!.impactScore).toBe('2.00');
      expect(result.scoringMatrix!.valueScore).toBe('2.00');
      expect(result.scoringMatrix!.marketScore).toBe('2.00');
      expect(result.scoringMatrix!.overallScore).toBe('2.00');
    });
  });

  describe('score clamping', () => {
    it('clamps negative scores to 0', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': -5,
        'triage.unmetNeedScore': 0,
        'triage.stateOfArtScore': 0,
        'triage.marketScore': 0,
        'triage.reimbursementPath': 0,
        'triage.regulatoryPath': 0,
      };

      const result = buildPrintableForm({ template, responses });
      const impactSection = result.scoringMatrix!.sections.find((s) => s.key === 'IMPACT');
      const missionRow = impactSection!.rows.find((r) => r.label === 'Mission Alignment');

      expect(missionRow?.score).toBe('0.00');
    });

    it('clamps scores above 3 to 3', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': 10,
        'triage.unmetNeedScore': 0,
        'triage.stateOfArtScore': 0,
        'triage.marketScore': 0,
        'triage.reimbursementPath': 0,
        'triage.regulatoryPath': 0,
      };

      const result = buildPrintableForm({ template, responses });
      const impactSection = result.scoringMatrix!.sections.find((s) => s.key === 'IMPACT');
      const missionRow = impactSection!.rows.find((r) => r.label === 'Mission Alignment');

      expect(missionRow?.score).toBe('3.00');
    });

    it('handles NaN scores as 0', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': NaN,
        'triage.unmetNeedScore': 2,
        'triage.stateOfArtScore': 0,
        'triage.marketScore': 0,
        'triage.reimbursementPath': 0,
        'triage.regulatoryPath': 0,
      };

      const result = buildPrintableForm({ template, responses });
      const impactSection = result.scoringMatrix!.sections.find((s) => s.key === 'IMPACT');
      const missionRow = impactSection!.rows.find((r) => r.label === 'Mission Alignment');

      expect(missionRow?.score).toBe('0.00');
    });
  });

  describe('impact value matrix dot position', () => {
    it('calculates dot position as ratio of score to max (3)', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': 1.5,
        'triage.unmetNeedScore': 1.5,
        'triage.stateOfArtScore': 1.5,
        'triage.marketScore': 1.5,
        'triage.reimbursementPath': 1.5,
        'triage.regulatoryPath': 1.5,
      };

      const result = buildPrintableForm({ template, responses });

      // Impact = 1.5, Value = 1.5
      // x = 1.5/3 = 0.5, y = 1.5/3 = 0.5
      expect(result.impactValueMatrix!.dotPosition.x).toBeCloseTo(0.5, 2);
      expect(result.impactValueMatrix!.dotPosition.y).toBeCloseTo(0.5, 2);
    });

    it('clamps dot position to 0-1 range', () => {
      const template = buildTemplate();

      // Test with zero scores
      const resultZero = buildPrintableForm({
        template,
        responses: {
          'triage.missionAlignmentScore': 0,
          'triage.unmetNeedScore': 0,
          'triage.stateOfArtScore': 0,
          'triage.marketScore': 0,
          'triage.reimbursementPath': 0,
          'triage.regulatoryPath': 0,
        },
      });

      expect(resultZero.impactValueMatrix!.dotPosition.x).toBe(0);
      expect(resultZero.impactValueMatrix!.dotPosition.y).toBe(0);

      // Test with max scores
      const resultMax = buildPrintableForm({
        template,
        responses: {
          'triage.missionAlignmentScore': 3,
          'triage.unmetNeedScore': 3,
          'triage.stateOfArtScore': 3,
          'triage.marketScore': 3,
          'triage.reimbursementPath': 3,
          'triage.regulatoryPath': 3,
        },
      });

      expect(resultMax.impactValueMatrix!.dotPosition.x).toBe(1);
      expect(resultMax.impactValueMatrix!.dotPosition.y).toBe(1);
    });

    it('handles NaN in dot position calculation', () => {
      const template = buildTemplate();
      const responses: FormResponse = {
        'triage.missionAlignmentScore': NaN,
        'triage.unmetNeedScore': NaN,
        'triage.stateOfArtScore': NaN,
        'triage.marketScore': NaN,
        'triage.reimbursementPath': NaN,
        'triage.regulatoryPath': NaN,
      };

      const result = buildPrintableForm({ template, responses });

      expect(result.impactValueMatrix!.dotPosition.x).toBe(0);
      expect(result.impactValueMatrix!.dotPosition.y).toBe(0);
    });
  });

  describe('status label derivation', () => {
    it.each([
      [SubmissionStatus.DRAFT, 'Draft'],
      [SubmissionStatus.SUBMITTED, 'Submitted'],
      [SubmissionStatus.REVIEWED, 'Reviewed'],
      [SubmissionStatus.ARCHIVED, 'Archived'],
      ['BLANK' as const, 'Blank Form'],
      ['IN_PROGRESS' as const, 'In Progress'],
    ])('derives %s status as "%s"', (status, expectedLabel) => {
      const template = buildTemplate();
      const result = buildPrintableForm({ template, status });
      expect(result.metadata.statusLabel).toBe(expectedLabel);
    });
  });
});
