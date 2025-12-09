/**
 * @jest-environment node
 */
/* eslint-disable no-var */
import { DataSource, Prisma } from '@prisma/client';

// Define mock types for library actions
type LibraryPrismaMocks = {
  questionDictionaryFindMany: jest.Mock;
  questionDictionaryFindUnique: jest.Mock;
  questionDictionaryCreate: jest.Mock;
  questionDictionaryUpdate: jest.Mock;
  questionDictionaryDelete: jest.Mock;
  questionRevisionCreate: jest.Mock;
  questionRevisionDeleteMany: jest.Mock;
};

// Use var for hoisting - mocks are initialized before imports
var prismaMocks: LibraryPrismaMocks;

jest.mock('@/lib/prisma', () => {
  prismaMocks = {
    questionDictionaryFindMany: jest.fn(),
    questionDictionaryFindUnique: jest.fn(),
    questionDictionaryCreate: jest.fn(),
    questionDictionaryUpdate: jest.fn(),
    questionDictionaryDelete: jest.fn(),
    questionRevisionCreate: jest.fn(),
    questionRevisionDeleteMany: jest.fn(),
  };

  const baseClient = {
    questionDictionary: {
      findMany: prismaMocks.questionDictionaryFindMany,
      findUnique: prismaMocks.questionDictionaryFindUnique,
      create: prismaMocks.questionDictionaryCreate,
      update: prismaMocks.questionDictionaryUpdate,
      delete: prismaMocks.questionDictionaryDelete,
    },
    questionRevision: {
      create: prismaMocks.questionRevisionCreate,
      deleteMany: prismaMocks.questionRevisionDeleteMany,
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

import {
  getQuestionDictionary,
  getQuestionByKey,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from './actions';

describe('Library Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuestionDictionary', () => {
    it('returns all questions ordered by key', async () => {
      const mockQuestions = [
        {
          id: 'dict-1',
          key: 'tech.field1',
          version: '1.0.0',
          currentVersion: 1,
          label: 'Field One',
          helpText: 'Help for field one',
          options: null,
          validation: null,
          bindingPath: 'technology.field1',
          dataSource: DataSource.TECHNOLOGY,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          _count: { formQuestions: 3 },
        },
        {
          id: 'dict-2',
          key: 'triage.field2',
          version: '1.0.0',
          currentVersion: 2,
          label: 'Field Two',
          helpText: null,
          options: [{ label: 'Option A', value: 'a' }],
          validation: { required: true },
          bindingPath: 'triageStage.field2',
          dataSource: DataSource.STAGE_SUPPLEMENT,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-03'),
          _count: { formQuestions: 0 },
        },
      ];

      prismaMocks.questionDictionaryFindMany.mockResolvedValue(mockQuestions);

      const result = await getQuestionDictionary();

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(2);
      expect(result.questions?.[0].key).toBe('tech.field1');
      expect(result.questions?.[0]._count.formQuestions).toBe(3);
      expect(result.questions?.[1].key).toBe('triage.field2');
      expect(prismaMocks.questionDictionaryFindMany).toHaveBeenCalledWith({
        orderBy: { key: 'asc' },
        include: { _count: { select: { formQuestions: true } } },
      });
    });

    it('returns empty array when no questions exist', async () => {
      prismaMocks.questionDictionaryFindMany.mockResolvedValue([]);

      const result = await getQuestionDictionary();

      expect(result.success).toBe(true);
      expect(result.questions).toEqual([]);
    });

    it('handles database error gracefully', async () => {
      prismaMocks.questionDictionaryFindMany.mockRejectedValue(new Error('DB connection failed'));

      const result = await getQuestionDictionary();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load question dictionary');
    });
  });

  describe('getQuestionByKey', () => {
    const mockQuestion = {
      id: 'dict-1',
      key: 'tech.testField',
      version: '1.0.0',
      currentVersion: 1,
      label: 'Test Field',
      helpText: 'Help text',
      options: null,
      validation: null,
      bindingPath: 'technology.testField',
      dataSource: DataSource.TECHNOLOGY,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      _count: { formQuestions: 2 },
    };

    it('returns question when found', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(mockQuestion);

      const result = await getQuestionByKey('tech.testField');

      expect(result.success).toBe(true);
      expect(result.question?.key).toBe('tech.testField');
      expect(result.question?.label).toBe('Test Field');
      expect(prismaMocks.questionDictionaryFindUnique).toHaveBeenCalledWith({
        where: { key: 'tech.testField' },
        include: { _count: { select: { formQuestions: true } } },
      });
    });

    it('returns error when question not found', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(null);

      const result = await getQuestionByKey('tech.nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Question not found');
    });

    it('handles database error gracefully', async () => {
      prismaMocks.questionDictionaryFindUnique.mockRejectedValue(new Error('DB error'));

      const result = await getQuestionByKey('tech.testField');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load question');
    });
  });

  describe('createQuestion', () => {
    const validInput = {
      key: 'tech.newField',
      label: 'New Field',
      helpText: 'Help for new field',
      bindingPath: 'technology.newField',
      dataSource: DataSource.TECHNOLOGY,
      options: [{ label: 'Yes', value: 'yes' }],
      validation: { required: true },
    };

    it('creates question with initial revision', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(null);
      prismaMocks.questionDictionaryCreate.mockResolvedValue({
        id: 'dict-new',
        key: validInput.key,
        version: '1.0.0',
        currentVersion: 1,
        label: validInput.label,
        helpText: validInput.helpText,
        options: validInput.options,
        validation: validInput.validation,
        bindingPath: validInput.bindingPath,
        dataSource: validInput.dataSource,
      });
      prismaMocks.questionRevisionCreate.mockResolvedValue({
        id: 'rev-1',
        dictionaryId: 'dict-new',
        questionKey: validInput.key,
        versionNumber: 1,
      });
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({});

      const result = await createQuestion(validInput);

      expect(result.success).toBe(true);
      expect(prismaMocks.questionDictionaryFindUnique).toHaveBeenCalledWith({
        where: { key: 'tech.newField' },
      });
      expect(prismaMocks.questionDictionaryCreate).toHaveBeenCalled();
      expect(prismaMocks.questionRevisionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 1,
            changeReason: 'Initial creation',
            significantChange: true,
          }),
        })
      );
    });

    it('rejects invalid key format - missing dot', async () => {
      const result = await createQuestion({
        ...validInput,
        key: 'invalidkey',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Key must be in format');
    });

    it('rejects invalid key format - uppercase prefix', async () => {
      const result = await createQuestion({
        ...validInput,
        key: 'Tech.field',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Key must be in format');
    });

    it('rejects invalid key format - special characters', async () => {
      const result = await createQuestion({
        ...validInput,
        key: 'tech.field-name',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Key must be in format');
    });

    it('accepts valid key formats', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(null);
      prismaMocks.questionDictionaryCreate.mockResolvedValue({
        id: 'dict-new',
        key: 'triage.myField123',
        version: '1.0.0',
        currentVersion: 1,
        label: 'Test',
        helpText: null,
        options: null,
        validation: null,
        bindingPath: 'test',
        dataSource: DataSource.TECHNOLOGY,
      });
      prismaMocks.questionRevisionCreate.mockResolvedValue({ id: 'rev-1' });
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({});

      const result = await createQuestion({
        ...validInput,
        key: 'triage.myField123',
      });

      expect(result.success).toBe(true);
    });

    it('rejects duplicate key', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue({
        id: 'existing',
        key: 'tech.newField',
      });

      const result = await createQuestion(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Key "tech.newField" already exists');
    });

    it('handles null helpText and options', async () => {
      const inputWithNulls = {
        key: 'tech.minimal',
        label: 'Minimal Field',
        bindingPath: 'technology.minimal',
        dataSource: DataSource.TECHNOLOGY,
      };

      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(null);
      prismaMocks.questionDictionaryCreate.mockResolvedValue({
        id: 'dict-minimal',
        key: inputWithNulls.key,
        version: '1.0.0',
        currentVersion: 1,
        label: inputWithNulls.label,
        helpText: null,
        options: Prisma.JsonNull,
        validation: Prisma.JsonNull,
        bindingPath: inputWithNulls.bindingPath,
        dataSource: inputWithNulls.dataSource,
      });
      prismaMocks.questionRevisionCreate.mockResolvedValue({ id: 'rev-1' });
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({});

      const result = await createQuestion(inputWithNulls);

      expect(result.success).toBe(true);
    });

    it('handles database error gracefully', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(null);
      prismaMocks.questionDictionaryCreate.mockRejectedValue(new Error('DB error'));

      const result = await createQuestion(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create question');
    });
  });

  describe('updateQuestion', () => {
    const existingQuestion = {
      id: 'dict-1',
      key: 'tech.existing',
      version: '1.0.0',
      currentVersion: 1,
      label: 'Existing Field',
      helpText: 'Original help',
      options: null,
      validation: null,
      bindingPath: 'technology.existing',
      dataSource: DataSource.TECHNOLOGY,
    };

    it('updates label and creates new revision', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(existingQuestion);
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({
        ...existingQuestion,
        label: 'Updated Label',
        currentVersion: 2,
      });
      prismaMocks.questionRevisionCreate.mockResolvedValue({ id: 'rev-2' });

      const result = await updateQuestion('tech.existing', {
        label: 'Updated Label',
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.questionRevisionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 2,
            changeReason: 'Updated: label',
            significantChange: true,
          }),
        })
      );
    });

    it('updates multiple fields and tracks changes', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(existingQuestion);
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({
        ...existingQuestion,
        label: 'New Label',
        helpText: 'New help',
        currentVersion: 2,
      });
      prismaMocks.questionRevisionCreate.mockResolvedValue({ id: 'rev-2' });

      const result = await updateQuestion('tech.existing', {
        label: 'New Label',
        helpText: 'New help',
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.questionRevisionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeReason: expect.stringContaining('label'),
          }),
        })
      );
    });

    it('marks options change as significant', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(existingQuestion);
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({
        ...existingQuestion,
        options: [{ label: 'New Option', value: 'new' }],
        currentVersion: 2,
      });
      prismaMocks.questionRevisionCreate.mockResolvedValue({ id: 'rev-2' });

      const result = await updateQuestion('tech.existing', {
        options: [{ label: 'New Option', value: 'new' }],
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.questionRevisionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            significantChange: true,
          }),
        })
      );
    });

    it('does not create revision when nothing changed', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(existingQuestion);

      const result = await updateQuestion('tech.existing', {
        label: 'Existing Field', // Same as existing
      });

      expect(result.success).toBe(true);
      expect(prismaMocks.questionDictionaryUpdate).not.toHaveBeenCalled();
      expect(prismaMocks.questionRevisionCreate).not.toHaveBeenCalled();
    });

    it('returns error when question not found', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(null);

      const result = await updateQuestion('tech.nonexistent', {
        label: 'New Label',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Question not found');
    });

    it('handles clearing helpText to null', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(existingQuestion);
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({
        ...existingQuestion,
        helpText: null,
        currentVersion: 2,
      });
      prismaMocks.questionRevisionCreate.mockResolvedValue({ id: 'rev-2' });

      const result = await updateQuestion('tech.existing', {
        helpText: null,
      });

      expect(result.success).toBe(true);
    });

    it('handles database error gracefully', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(existingQuestion);
      prismaMocks.questionDictionaryUpdate.mockRejectedValue(new Error('DB error'));

      const result = await updateQuestion('tech.existing', {
        label: 'New Label',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update question');
    });
  });

  describe('deleteQuestion', () => {
    const unreferencedQuestion = {
      id: 'dict-1',
      key: 'tech.deletable',
      version: '1.0.0',
      currentVersion: 1,
      label: 'Deletable Field',
      helpText: null,
      options: null,
      validation: null,
      bindingPath: 'technology.deletable',
      dataSource: DataSource.TECHNOLOGY,
      _count: { formQuestions: 0 },
    };

    it('deletes unreferenced question', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(unreferencedQuestion);
      prismaMocks.questionDictionaryUpdate.mockResolvedValue({});
      prismaMocks.questionRevisionDeleteMany.mockResolvedValue({ count: 1 });
      prismaMocks.questionDictionaryDelete.mockResolvedValue({});

      const result = await deleteQuestion('tech.deletable');

      expect(result.success).toBe(true);
      // First clears currentRevisionId
      expect(prismaMocks.questionDictionaryUpdate).toHaveBeenCalledWith({
        where: { key: 'tech.deletable' },
        data: { currentRevisionId: null },
      });
      // Then deletes revisions
      expect(prismaMocks.questionRevisionDeleteMany).toHaveBeenCalledWith({
        where: { dictionaryId: 'dict-1' },
      });
      // Then deletes dictionary entry
      expect(prismaMocks.questionDictionaryDelete).toHaveBeenCalledWith({
        where: { key: 'tech.deletable' },
      });
    });

    it('prevents deletion when question is referenced', async () => {
      const referencedQuestion = {
        ...unreferencedQuestion,
        _count: { formQuestions: 3 },
      };
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(referencedQuestion);

      const result = await deleteQuestion('tech.deletable');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete: question is used by 3 form question(s)');
      expect(prismaMocks.questionDictionaryDelete).not.toHaveBeenCalled();
    });

    it('returns error when question not found', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(null);

      const result = await deleteQuestion('tech.nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Question not found');
    });

    it('handles database error gracefully', async () => {
      prismaMocks.questionDictionaryFindUnique.mockResolvedValue(unreferencedQuestion);
      prismaMocks.questionDictionaryUpdate.mockRejectedValue(new Error('DB error'));

      const result = await deleteQuestion('tech.deletable');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete question');
    });
  });
});
