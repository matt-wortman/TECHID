'use server';

import { prisma } from '@/lib/prisma';
import { DataSource, Prisma } from '@prisma/client';

// Types for the library
export interface QuestionDictionaryEntry {
  id: string;
  key: string;
  version: string;
  currentVersion: number;
  label: string;
  helpText: string | null;
  options: unknown;
  validation: unknown;
  bindingPath: string;
  dataSource: DataSource;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    formQuestions: number;
  };
}

export interface CreateQuestionInput {
  key: string;
  label: string;
  helpText?: string;
  bindingPath: string;
  dataSource: DataSource;
  options?: Array<{ label: string; value: string }>;
  validation?: object;
}

export interface UpdateQuestionInput {
  label?: string;
  helpText?: string | null;
  bindingPath?: string;
  dataSource?: DataSource;
  options?: Array<{ label: string; value: string }> | null;
  validation?: object | null;
}

// List all dictionary entries with usage count
export async function getQuestionDictionary(): Promise<{
  success: boolean;
  questions?: QuestionDictionaryEntry[];
  error?: string;
}> {
  try {
    const questions = await prisma.questionDictionary.findMany({
      orderBy: { key: 'asc' },
      include: {
        _count: {
          select: { formQuestions: true },
        },
      },
    });

    return {
      success: true,
      questions: questions.map((q) => ({
        ...q,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch question dictionary:', error);
    return {
      success: false,
      error: 'Failed to load question dictionary',
    };
  }
}

// Get single entry by key
export async function getQuestionByKey(key: string): Promise<{
  success: boolean;
  question?: QuestionDictionaryEntry;
  error?: string;
}> {
  try {
    const question = await prisma.questionDictionary.findUnique({
      where: { key },
      include: {
        _count: {
          select: { formQuestions: true },
        },
      },
    });

    if (!question) {
      return { success: false, error: 'Question not found' };
    }

    return { success: true, question };
  } catch (error) {
    console.error('Failed to fetch question:', error);
    return { success: false, error: 'Failed to load question' };
  }
}

// Create new dictionary entry (creates initial revision)
export async function createQuestion(data: CreateQuestionInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate key format (e.g., tech.fieldName or triage.fieldName)
    if (!/^[a-z]+\.[a-zA-Z0-9]+$/.test(data.key)) {
      return {
        success: false,
        error: 'Key must be in format "prefix.fieldName" (e.g., tech.myField)',
      };
    }

    // Check if key already exists
    const existing = await prisma.questionDictionary.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      return { success: false, error: `Key "${data.key}" already exists` };
    }

    // Create dictionary entry and initial revision in a transaction
    await prisma.$transaction(async (tx) => {
      // Create the dictionary entry first
      const dictionary = await tx.questionDictionary.create({
        data: {
          version: '1.0.0',
          key: data.key,
          currentVersion: 1,
          label: data.label,
          helpText: data.helpText || null,
          options: data.options ? (data.options as Prisma.InputJsonValue) : Prisma.JsonNull,
          validation: data.validation ? (data.validation as Prisma.InputJsonValue) : Prisma.JsonNull,
          bindingPath: data.bindingPath,
          dataSource: data.dataSource,
        },
      });

      // Create the initial revision
      const revision = await tx.questionRevision.create({
        data: {
          dictionaryId: dictionary.id,
          questionKey: dictionary.key,
          versionNumber: 1,
          label: dictionary.label,
          helpText: dictionary.helpText,
          options: dictionary.options ? (dictionary.options as Prisma.InputJsonValue) : Prisma.JsonNull,
          validation: dictionary.validation ? (dictionary.validation as Prisma.InputJsonValue) : Prisma.JsonNull,
          changeReason: 'Initial creation',
          significantChange: true,
        },
      });

      // Link the revision back to the dictionary
      await tx.questionDictionary.update({
        where: { id: dictionary.id },
        data: { currentRevisionId: revision.id },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to create question:', error);
    return { success: false, error: 'Failed to create question' };
  }
}

// Update entry (creates new revision, increments version)
export async function updateQuestion(
  key: string,
  data: UpdateQuestionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const dictionary = await prisma.questionDictionary.findUnique({
      where: { key },
    });

    if (!dictionary) {
      return { success: false, error: 'Question not found' };
    }

    // Determine what changed
    const changes: string[] = [];
    if (data.label && data.label !== dictionary.label) changes.push('label');
    if (data.helpText !== undefined && data.helpText !== dictionary.helpText) changes.push('helpText');
    if (data.bindingPath && data.bindingPath !== dictionary.bindingPath) changes.push('bindingPath');
    if (data.dataSource && data.dataSource !== dictionary.dataSource) changes.push('dataSource');
    if (data.options !== undefined) changes.push('options');
    if (data.validation !== undefined) changes.push('validation');

    if (changes.length === 0) {
      return { success: true }; // Nothing to update
    }

    await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: Record<string, unknown> = {};
      if (data.label !== undefined) updateData.label = data.label;
      if (data.helpText !== undefined) updateData.helpText = data.helpText;
      if (data.bindingPath !== undefined) updateData.bindingPath = data.bindingPath;
      if (data.dataSource !== undefined) updateData.dataSource = data.dataSource;
      if (data.options !== undefined) {
        updateData.options = data.options ? (data.options as Prisma.InputJsonValue) : Prisma.JsonNull;
      }
      if (data.validation !== undefined) {
        updateData.validation = data.validation ? (data.validation as Prisma.InputJsonValue) : Prisma.JsonNull;
      }

      // Update the dictionary
      const updated = await tx.questionDictionary.update({
        where: { key },
        data: {
          ...updateData,
          currentVersion: { increment: 1 },
        },
      });

      // Create new revision
      const revision = await tx.questionRevision.create({
        data: {
          dictionaryId: dictionary.id,
          questionKey: dictionary.key,
          versionNumber: updated.currentVersion,
          label: updated.label,
          helpText: updated.helpText,
          options: updated.options ? (updated.options as Prisma.InputJsonValue) : Prisma.JsonNull,
          validation: updated.validation ? (updated.validation as Prisma.InputJsonValue) : Prisma.JsonNull,
          changeReason: `Updated: ${changes.join(', ')}`,
          significantChange: changes.includes('options') || changes.includes('label'),
        },
      });

      // Link the new revision
      await tx.questionDictionary.update({
        where: { id: dictionary.id },
        data: { currentRevisionId: revision.id },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update question:', error);
    return { success: false, error: 'Failed to update question' };
  }
}

// Delete entry (only if not referenced by any FormQuestion)
export async function deleteQuestion(key: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const dictionary = await prisma.questionDictionary.findUnique({
      where: { key },
      include: {
        _count: {
          select: { formQuestions: true },
        },
      },
    });

    if (!dictionary) {
      return { success: false, error: 'Question not found' };
    }

    if (dictionary._count.formQuestions > 0) {
      return {
        success: false,
        error: `Cannot delete: question is used by ${dictionary._count.formQuestions} form question(s)`,
      };
    }

    // Delete revisions first (cascade), then the dictionary entry
    await prisma.$transaction(async (tx) => {
      // Clear the currentRevisionId first to avoid FK constraint
      await tx.questionDictionary.update({
        where: { key },
        data: { currentRevisionId: null },
      });

      // Delete all revisions
      await tx.questionRevision.deleteMany({
        where: { dictionaryId: dictionary.id },
      });

      // Delete the dictionary entry
      await tx.questionDictionary.delete({
        where: { key },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete question:', error);
    return { success: false, error: 'Failed to delete question' };
  }
}
