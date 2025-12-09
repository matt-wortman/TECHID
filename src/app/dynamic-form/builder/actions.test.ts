/**
 * @jest-environment node
 */
/* eslint-disable no-var */
import type { Prisma, FieldType, DataSource } from '@prisma/client';

// Define mock types for builder actions
type BuilderPrismaMocks = {
  formTemplateCreate: jest.Mock;
  formTemplateFindMany: jest.Mock;
  formTemplateFindUnique: jest.Mock;
  formTemplateUpdate: jest.Mock;
  formTemplateDelete: jest.Mock;
  formSectionCreate: jest.Mock;
  formSectionFindFirst: jest.Mock;
  formSectionFindUnique: jest.Mock;
  formSectionUpdate: jest.Mock;
  formSectionDelete: jest.Mock;
  formQuestionCreate: jest.Mock;
  formQuestionFindUnique: jest.Mock;
  formQuestionFindFirst: jest.Mock;
  formQuestionUpdate: jest.Mock;
  formQuestionDelete: jest.Mock;
  questionOptionCreateMany: jest.Mock;
  questionOptionDeleteMany: jest.Mock;
  questionDictionaryUpsert: jest.Mock;
};

var prismaMocks: BuilderPrismaMocks;

// Mock revalidatePath and redirect before importing actions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  prismaMocks = {
    formTemplateCreate: jest.fn(),
    formTemplateFindMany: jest.fn(),
    formTemplateFindUnique: jest.fn(),
    formTemplateUpdate: jest.fn(),
    formTemplateDelete: jest.fn(),
    formSectionCreate: jest.fn(),
    formSectionFindFirst: jest.fn(),
    formSectionFindUnique: jest.fn(),
    formSectionUpdate: jest.fn(),
    formSectionDelete: jest.fn(),
    formQuestionCreate: jest.fn(),
    formQuestionFindUnique: jest.fn(),
    formQuestionFindFirst: jest.fn(),
    formQuestionUpdate: jest.fn(),
    formQuestionDelete: jest.fn(),
    questionOptionCreateMany: jest.fn(),
    questionOptionDeleteMany: jest.fn(),
    questionDictionaryUpsert: jest.fn(),
  };

  const baseClient = {
    formTemplate: {
      create: prismaMocks.formTemplateCreate,
      findMany: prismaMocks.formTemplateFindMany,
      findUnique: prismaMocks.formTemplateFindUnique,
      update: prismaMocks.formTemplateUpdate,
      delete: prismaMocks.formTemplateDelete,
    },
    formSection: {
      create: prismaMocks.formSectionCreate,
      findFirst: prismaMocks.formSectionFindFirst,
      findUnique: prismaMocks.formSectionFindUnique,
      update: prismaMocks.formSectionUpdate,
      delete: prismaMocks.formSectionDelete,
    },
    formQuestion: {
      create: prismaMocks.formQuestionCreate,
      findUnique: prismaMocks.formQuestionFindUnique,
      findFirst: prismaMocks.formQuestionFindFirst,
      update: prismaMocks.formQuestionUpdate,
      delete: prismaMocks.formQuestionDelete,
    },
    questionOption: {
      createMany: prismaMocks.questionOptionCreateMany,
      deleteMany: prismaMocks.questionOptionDeleteMany,
    },
    questionDictionary: {
      upsert: prismaMocks.questionDictionaryUpsert,
    },
  };

  const transaction = async <T>(
    fnOrArray: ((tx: Prisma.TransactionClient) => Promise<T>) | Promise<unknown>[]
  ): Promise<T | unknown[]> => {
    if (Array.isArray(fnOrArray)) {
      return Promise.all(fnOrArray);
    }
    return fnOrArray(baseClient as unknown as Prisma.TransactionClient);
  };

  return {
    prisma: {
      ...baseClient,
      $transaction: transaction,
    },
  };
});

// Import actions after mocks are set up
import {
  getTemplates,
  getTemplateDetail,
  createSection,
  updateSection,
  deleteSection,
  moveSection,
  reorderSections,
  createField,
  updateField,
  deleteField,
  moveField,
  duplicateField,
  publishTemplate,
  saveTemplateAsDraft,
  updateTemplateMetadata,
} from './actions';

describe('Builder Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('returns list of templates with counts', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Test Template',
          _count: { sections: 3, submissions: 5 },
        },
      ];
      prismaMocks.formTemplateFindMany.mockResolvedValue(mockTemplates);

      const result = await getTemplates();

      expect(prismaMocks.formTemplateFindMany).toHaveBeenCalledWith({
        include: {
          _count: {
            select: {
              sections: true,
              submissions: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('getTemplateDetail', () => {
    it('returns template with all nested relations', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        sections: [
          {
            id: 'section-1',
            questions: [],
          },
        ],
      };
      prismaMocks.formTemplateFindUnique.mockResolvedValue(mockTemplate);

      const result = await getTemplateDetail('template-1');

      expect(prismaMocks.formTemplateFindUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        include: expect.objectContaining({
          sections: expect.any(Object),
        }),
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('createSection', () => {
    it('creates a new section with correct order', async () => {
      prismaMocks.formSectionFindFirst.mockResolvedValue({ order: 2 });
      prismaMocks.formSectionCreate.mockResolvedValue({ id: 'section-new' });

      const result = await createSection('template-1', {
        title: 'New Section',
        code: 'NEW',
        description: 'A new section',
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.formSectionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateId: 'template-1',
          order: 3,
          title: 'New Section',
          code: 'NEW',
        }),
      });
    });

    it('returns error for invalid input', async () => {
      const result = await createSection('template-1', {
        title: '',
        code: 'INVALID',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('updateSection', () => {
    it('updates section with new values', async () => {
      prismaMocks.formSectionUpdate.mockResolvedValue({
        id: 'section-1',
        templateId: 'template-1',
      });

      const result = await updateSection('section-1', {
        title: 'Updated Title',
        code: 'UPDATED',
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.formSectionUpdate).toHaveBeenCalledWith({
        where: { id: 'section-1' },
        data: {
          title: 'Updated Title',
          description: 'Updated description',
          code: 'UPDATED',
        },
      });
    });
  });

  describe('deleteSection', () => {
    it('deletes section and revalidates', async () => {
      prismaMocks.formSectionDelete.mockResolvedValue({
        id: 'section-1',
        templateId: 'template-1',
      });

      const result = await deleteSection('section-1');

      expect(result.success).toBe(true);
      expect(prismaMocks.formSectionDelete).toHaveBeenCalledWith({
        where: { id: 'section-1' },
      });
    });

    it('returns error when delete fails', async () => {
      prismaMocks.formSectionDelete.mockRejectedValue(new Error('Delete failed'));

      const result = await deleteSection('section-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Delete failed');
      }
    });
  });

  describe('moveSection', () => {
    it('swaps order with adjacent section when moving up', async () => {
      prismaMocks.formSectionFindUnique.mockResolvedValue({
        id: 'section-2',
        templateId: 'template-1',
        order: 2,
      });
      prismaMocks.formSectionFindFirst.mockResolvedValue({
        id: 'section-1',
        order: 1,
      });

      const result = await moveSection('section-2', 'up');

      expect(result.success).toBe(true);
    });

    it('returns success when no adjacent section exists', async () => {
      prismaMocks.formSectionFindUnique.mockResolvedValue({
        id: 'section-1',
        templateId: 'template-1',
        order: 1,
      });
      prismaMocks.formSectionFindFirst.mockResolvedValue(null);

      const result = await moveSection('section-1', 'up');

      expect(result.success).toBe(true);
    });

    it('returns error when section not found', async () => {
      prismaMocks.formSectionFindUnique.mockResolvedValue(null);

      const result = await moveSection('nonexistent', 'up');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Section not found');
      }
    });
  });

  describe('reorderSections', () => {
    it('updates order for all sections', async () => {
      const result = await reorderSections('template-1', ['section-2', 'section-1', 'section-3']);

      expect(result.success).toBe(true);
    });

    it('returns success for empty array', async () => {
      const result = await reorderSections('template-1', []);

      expect(result.success).toBe(true);
    });
  });

  describe('createField', () => {
    it('creates field with correct dictionaryKey', async () => {
      prismaMocks.formSectionFindUnique.mockResolvedValue({
        id: 'section-1',
        code: 'BASIC',
        template: {
          id: 'template-1',
          sections: [
            {
              questions: [],
            },
          ],
        },
        questions: [],
      });
      prismaMocks.questionDictionaryUpsert.mockResolvedValue({});
      prismaMocks.formQuestionCreate.mockResolvedValue({ id: 'question-new' });

      const result = await createField('section-1', {
        type: 'SHORT_TEXT' as FieldType,
        label: 'New Field',
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.questionDictionaryUpsert).toHaveBeenCalled();
      expect(prismaMocks.formQuestionCreate).toHaveBeenCalled();
    });

    it('returns error when section not found', async () => {
      prismaMocks.formSectionFindUnique.mockResolvedValue(null);

      const result = await createField('nonexistent', {
        type: 'SHORT_TEXT' as FieldType,
        label: 'Test Field',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Section not found');
      }
    });

    it('creates repeatable group with default config', async () => {
      prismaMocks.formSectionFindUnique.mockResolvedValue({
        id: 'section-1',
        code: 'BASIC',
        template: {
          id: 'template-1',
          sections: [{ questions: [] }],
        },
        questions: [],
      });
      prismaMocks.questionDictionaryUpsert.mockResolvedValue({});
      prismaMocks.formQuestionCreate.mockResolvedValue({ id: 'question-new' });

      const result = await createField('section-1', {
        type: 'REPEATABLE_GROUP' as FieldType,
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.formQuestionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          repeatableConfig: expect.objectContaining({
            columns: expect.any(Array),
          }),
        }),
      });
    });
  });

  describe('updateField', () => {
    it('updates field with new values', async () => {
      prismaMocks.formQuestionFindUnique.mockResolvedValue({
        id: 'question-1',
        type: 'SHORT_TEXT',
        section: { templateId: 'template-1' },
      });
      prismaMocks.formQuestionUpdate.mockResolvedValue({});

      const result = await updateField('question-1', {
        label: 'Updated Label',
        helpText: 'New help text',
        isRequired: true,
      });

      expect(result.success).toBe(true);
    });

    it('handles options for selection field types', async () => {
      prismaMocks.formQuestionFindUnique.mockResolvedValue({
        id: 'question-1',
        type: 'SINGLE_SELECT',
        section: { templateId: 'template-1' },
      });
      prismaMocks.questionOptionDeleteMany.mockResolvedValue({});
      prismaMocks.questionOptionCreateMany.mockResolvedValue({});
      prismaMocks.formQuestionUpdate.mockResolvedValue({});

      const result = await updateField('question-1', {
        label: 'Select Field',
        isRequired: false,
        options: [
          { label: 'Option 1', value: 'opt1' },
          { label: 'Option 2', value: 'opt2' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('returns error when field not found', async () => {
      prismaMocks.formQuestionFindUnique.mockResolvedValue(null);

      const result = await updateField('nonexistent', {
        label: 'Test',
        isRequired: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Field not found');
      }
    });
  });

  describe('deleteField', () => {
    it('deletes field and revalidates', async () => {
      prismaMocks.formQuestionDelete.mockResolvedValue({
        id: 'question-1',
        section: { templateId: 'template-1' },
      });

      const result = await deleteField('question-1');

      expect(result.success).toBe(true);
      expect(prismaMocks.formQuestionDelete).toHaveBeenCalledWith({
        where: { id: 'question-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('moveField', () => {
    it('swaps order with adjacent field', async () => {
      prismaMocks.formQuestionFindUnique.mockResolvedValue({
        id: 'question-2',
        order: 2,
        sectionId: 'section-1',
        section: { templateId: 'template-1' },
      });
      prismaMocks.formQuestionFindFirst.mockResolvedValue({
        id: 'question-1',
        order: 1,
      });

      const result = await moveField('question-2', 'up');

      expect(result.success).toBe(true);
    });

    it('returns error when field not found', async () => {
      prismaMocks.formQuestionFindUnique.mockResolvedValue(null);

      const result = await moveField('nonexistent', 'up');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Field not found');
      }
    });
  });

  describe('duplicateField', () => {
    it('creates a copy of the field', async () => {
      prismaMocks.formQuestionFindUnique.mockResolvedValue({
        id: 'question-1',
        label: 'Original Field',
        type: 'SHORT_TEXT',
        helpText: 'Help text',
        sectionId: 'section-1',
        section: {
          code: 'BASIC',
          template: {
            id: 'template-1',
            sections: [{ questions: [] }],
          },
          questions: [{ order: 1 }],
        },
        options: [],
        scoringConfig: null,
      });
      prismaMocks.questionDictionaryUpsert.mockResolvedValue({});
      prismaMocks.formQuestionCreate.mockResolvedValue({ id: 'question-copy' });

      const result = await duplicateField('question-1');

      expect(result.success).toBe(true);
      expect(prismaMocks.formQuestionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          label: 'Original Field (Copy)',
        }),
      });
    });

    it('returns error when field not found', async () => {
      prismaMocks.formQuestionFindUnique.mockResolvedValue(null);

      const result = await duplicateField('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Field not found');
      }
    });
  });

  describe('publishTemplate', () => {
    it('sets template as active when validation passes', async () => {
      prismaMocks.formTemplateFindUnique.mockResolvedValue({
        id: 'template-1',
        sections: [
          {
            questions: [{ id: 'q1' }],
          },
        ],
      });
      prismaMocks.formTemplateUpdate.mockResolvedValue({});

      const result = await publishTemplate('template-1');

      expect(result.success).toBe(true);
      expect(prismaMocks.formTemplateUpdate).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { isActive: true },
      });
    });

    it('returns error when template has no sections', async () => {
      prismaMocks.formTemplateFindUnique.mockResolvedValue({
        id: 'template-1',
        sections: [],
      });

      const result = await publishTemplate('template-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('section');
      }
    });

    it('returns error when section has no questions', async () => {
      prismaMocks.formTemplateFindUnique.mockResolvedValue({
        id: 'template-1',
        sections: [{ questions: [] }],
      });

      const result = await publishTemplate('template-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('field');
      }
    });

    it('returns error when template not found', async () => {
      prismaMocks.formTemplateFindUnique.mockResolvedValue(null);

      const result = await publishTemplate('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Template not found');
      }
    });
  });

  describe('saveTemplateAsDraft', () => {
    it('sets template as inactive', async () => {
      prismaMocks.formTemplateUpdate.mockResolvedValue({});

      const result = await saveTemplateAsDraft('template-1');

      expect(result.success).toBe(true);
      expect(prismaMocks.formTemplateUpdate).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { isActive: false },
      });
    });
  });

  describe('updateTemplateMetadata', () => {
    it('updates template name, version, and description', async () => {
      prismaMocks.formTemplateUpdate.mockResolvedValue({});

      const result = await updateTemplateMetadata('template-1', {
        name: 'Updated Name',
        version: '2.0.0',
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.formTemplateUpdate).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          name: 'Updated Name',
          version: '2.0.0',
          description: 'Updated description',
        },
      });
    });

    it('returns error for invalid input', async () => {
      const result = await updateTemplateMetadata('template-1', {
        name: '',
        version: '1.0',
      });

      expect(result.success).toBe(false);
    });
  });
});
