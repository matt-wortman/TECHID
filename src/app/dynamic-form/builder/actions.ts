'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma, FieldType, DataSource } from '@prisma/client'
import { z } from 'zod'

const MAX_REPEATABLE_COLUMNS = 8
const MAX_REPEATABLE_ROWS = 25
const MAX_DROPDOWN_OPTIONS = 50

const DEFAULT_REPEATABLE_CONFIG: Prisma.InputJsonValue = {
  columns: [
    {
      key: 'value',
      label: 'Value',
      type: 'text',
      required: true,
    },
  ],
  minRows: 0,
}

const DEFAULT_DATA_TABLE_SELECTOR_CONFIG: Prisma.InputJsonValue = {
  mode: 'predefined',
  rowLabel: 'Stakeholder',
  columns: [
    {
      key: 'include',
      label: 'Include?',
      type: 'checkbox',
    },
    {
      key: 'benefit',
      label: 'How do they benefit?',
      type: 'textarea',
      requiredWhenSelected: true,
    },
  ],
  rows: [
    { id: 'patients', label: 'Patients' },
    { id: 'caregivers', label: 'Caregivers' },
    { id: 'clinicians', label: 'Clinicians' },
  ],
  selectorColumnKey: 'include',
  requireOnSelect: ['benefit'],
}

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(1000).optional(),
})

const idSchema = z.string().min(1)
const sectionContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(1000).optional(),
  code: z.string().min(1, 'Code is required'),
})

const fieldOptionInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
})

const repeatableColumnSchema = z.object({
  key: z
    .string()
    .min(1, 'Column key is required')
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, underscores'),
  label: z.string().min(1, 'Column label is required'),
  type: z.enum(['text', 'textarea', 'number', 'checkbox']),
  required: z.boolean().optional(),
  requiredWhenSelected: z.boolean().optional(),
})

const repeatableRowSchema = z.object({
  id: z
    .string()
    .min(1, 'Row key is required')
    .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, hyphen, underscore'),
  label: z.string().min(1, 'Row label is required'),
  description: z.string().max(500).optional(),
})

const repeatableConfigSchema = z
  .object({
    columns: z
      .array(repeatableColumnSchema)
      .min(1, 'Add at least one column')
      .max(MAX_REPEATABLE_COLUMNS, `Limit columns to ${MAX_REPEATABLE_COLUMNS}`),
    minRows: z
      .number()
      .int('Minimum rows must be an integer')
      .min(0)
      .max(MAX_REPEATABLE_ROWS)
      .optional(),
    maxRows: z
      .number()
      .int('Maximum rows must be an integer')
      .min(1)
      .max(MAX_REPEATABLE_ROWS)
      .optional(),
    mode: z.enum(['user', 'predefined']).optional(),
    rowLabel: z.string().max(150).optional(),
    rows: z.array(repeatableRowSchema).max(25).optional(),
    selectorColumnKey: z.string().regex(/^[a-z0-9_]+$/).optional(),
    requireOnSelect: z.array(z.string()).optional(),
  })
  .refine(
    (value) => {
      if (typeof value.maxRows !== 'number') {
        return true
      }
      if (typeof value.minRows !== 'number') {
        return true
      }
      return value.maxRows >= value.minRows
    },
    {
      message: 'Maximum rows must be greater than or equal to minimum rows',
      path: ['maxRows'],
    }
  )
  .superRefine((value, ctx) => {
    if (value.mode === 'predefined') {
      if (!value.rows || value.rows.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Add at least one row for predefined tables',
          path: ['rows'],
        })
      }

      const checkboxColumns = value.columns.filter((column) => column.type === 'checkbox')
      if (checkboxColumns.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Predefined tables require a checkbox column',
          path: ['columns'],
        })
      }

      if (value.selectorColumnKey) {
        const hasSelector = value.columns.some((column) => column.key === value.selectorColumnKey)
        if (!hasSelector) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Selector column key must match an existing column key',
            path: ['selectorColumnKey'],
          })
        }
      }
    }
  })

const fieldUpdateSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  helpText: z.string().max(2000).optional(),
  placeholder: z.string().max(255).optional(),
  isRequired: z.boolean().default(false),
  options: z.array(fieldOptionInputSchema).max(MAX_DROPDOWN_OPTIONS, `Limit options to ${MAX_DROPDOWN_OPTIONS}`).optional(),
  repeatableConfig: repeatableConfigSchema.optional(),
})

const templateMetadataSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  version: z.string().min(1, 'Version is required'),
  description: z.string().max(2000).optional(),
})

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export async function getTemplates() {
  return prisma.formTemplate.findMany({
    include: {
      _count: {
        select: {
          sections: true,
          submissions: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export type TemplateListItem = Awaited<ReturnType<typeof getTemplates>>[number]

export async function getTemplateDetail(templateId: string) {
  return prisma.formTemplate.findUnique({
    where: { id: templateId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              options: {
                orderBy: { order: 'asc' },
              },
              scoringConfig: true,
              dictionary: true,
            },
          },
        },
      },
    },
  })
}

export type TemplateDetail = NonNullable<Awaited<ReturnType<typeof getTemplateDetail>>>

export type SectionInput = z.infer<typeof sectionContentSchema>

async function invalidateTemplate(templateId: string) {
  revalidatePath(`/dynamic-form/builder/${templateId}`)
}

export async function createSection(templateId: string, input: SectionInput): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(templateId)
    const parsedInput = sectionContentSchema.parse(input)

    const maxOrderSection = await prisma.formSection.findFirst({
      where: { templateId: parsedId },
      orderBy: { order: 'desc' },
    })

    await prisma.formSection.create({
      data: {
        templateId: parsedId,
        order: (maxOrderSection?.order ?? 0) + 1,
        title: parsedInput.title,
        description: parsedInput.description,
        code: parsedInput.code,
      },
    })

    await invalidateTemplate(parsedId)
    return { success: true }
  } catch (error) {
    console.error('createSection failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to create section',
    }
  }
}

export async function updateSection(sectionId: string, input: SectionInput): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(sectionId)
    const parsedInput = sectionContentSchema.parse(input)

    const section = await prisma.formSection.update({
      where: { id: parsedId },
      data: {
        title: parsedInput.title,
        description: parsedInput.description,
        code: parsedInput.code,
      },
    })

    await invalidateTemplate(section.templateId)
    return { success: true }
  } catch (error) {
    console.error('updateSection failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to update section',
    }
  }
}

export async function deleteSection(sectionId: string): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(sectionId)
    const deleted = await prisma.formSection.delete({ where: { id: parsedId } })
    await invalidateTemplate(deleted.templateId)
    return { success: true }
  } catch (error) {
    console.error('deleteSection failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to delete section',
    }
  }
}

export async function reorderSections(templateId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(templateId)
    if (orderedIds.length === 0) {
      return { success: true }
    }

    await prisma.$transaction(
      orderedIds.map((sectionId, index) =>
        prisma.formSection.update({
          where: { id: sectionId },
          data: { order: index + 1, templateId: parsedId },
        })
      )
    )
    await invalidateTemplate(parsedId)
    return { success: true }
  } catch (error) {
    console.error('reorderSections failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to reorder sections',
    }
  }
}

export async function moveSection(sectionId: string, direction: 'up' | 'down'): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(sectionId)
    const section = await prisma.formSection.findUnique({
      where: { id: parsedId },
      select: {
        id: true,
        templateId: true,
        order: true,
      },
    })

    if (!section) {
      return { success: false, error: 'Section not found' }
    }

    const comparator = direction === 'up' ? 'desc' : 'asc'
    const orderFilter = direction === 'up' ? { lt: section.order } : { gt: section.order }

    const adjacent = await prisma.formSection.findFirst({
      where: {
        templateId: section.templateId,
        order: orderFilter,
      },
      orderBy: { order: comparator },
    })

    if (!adjacent) {
      return { success: true }
    }

    await prisma.$transaction([
      prisma.formSection.update({
        where: { id: section.id },
        data: { order: adjacent.order },
      }),
      prisma.formSection.update({
        where: { id: adjacent.id },
        data: { order: section.order },
      }),
    ])

    await invalidateTemplate(section.templateId)
    return { success: true }
  } catch (error) {
    console.error('moveSection failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to move section',
    }
  }
}

export type FieldInput = {
  type: FieldType
  label?: string
}

export type FieldUpdateInput = z.infer<typeof fieldUpdateSchema>
export type TemplateMetadataInput = z.infer<typeof templateMetadataSchema>
export async function createField(sectionId: string, input: FieldInput): Promise<ActionResult> {
  try {
    const parsedSectionId = idSchema.parse(sectionId)

    const section = await prisma.formSection.findUnique({
      where: { id: parsedSectionId },
      include: {
        template: {
          select: {
            id: true,
            sections: {
              include: {
                questions: {
                  select: {
                    id: true,
                    dictionaryKey: true,
                  },
                },
              },
            },
          },
        },
        questions: {
          orderBy: { order: 'desc' },
          select: {
            order: true,
          },
        },
      },
    })

    if (!section || !section.template) {
      return { success: false, error: 'Section not found' }
    }

    const nextOrder = (section.questions[0]?.order ?? 0) + 1
    const allDictionaryKeys = section.template.sections.flatMap((sec) => sec.questions.map((q) => q.dictionaryKey))

    const baseCode = `${section.code}.${nextOrder}`
    let uniqueCode = baseCode
    let counter = 1
    // Check dictionaryKey uniqueness (uses builder.{code} format)
    while (allDictionaryKeys.includes(`builder.${uniqueCode}`)) {
      uniqueCode = `${baseCode}.${counter}`
      counter += 1
    }

    const fallbackLabel = input.type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

    const repeatableConfig =
      input.type === FieldType.REPEATABLE_GROUP
        ? DEFAULT_REPEATABLE_CONFIG
        : input.type === FieldType.DATA_TABLE_SELECTOR
          ? DEFAULT_DATA_TABLE_SELECTOR_CONFIG
          : undefined

    // Generate dictionaryKey for builder-created questions
    const dictionaryKey = `builder.${uniqueCode}`
    const questionLabel = input.label ?? `${fallbackLabel} field`

    // Create dictionary entry first (dictionaryKey is required and has FK constraint)
    // Builder-created questions use extendedData binding (form-only, not written back to entity columns)
    await prisma.questionDictionary.upsert({
      where: { key: dictionaryKey },
      update: { label: questionLabel },
      create: {
        key: dictionaryKey,
        version: '1.0.0',
        label: questionLabel,
        helpText: 'Builder-created question',
        bindingPath: `triageStage.extendedData.${uniqueCode}`,
        dataSource: DataSource.STAGE_SUPPLEMENT,
      },
    })

    await prisma.formQuestion.create({
      data: {
        sectionId: parsedSectionId,
        type: input.type,
        label: questionLabel,
        dictionaryKey: dictionaryKey,
        order: nextOrder,
        isRequired: false,
        repeatableConfig,
      },
    })

    await invalidateTemplate(section.template.id)
    return { success: true }
  } catch (error) {
    console.error('createField failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to add field',
    }
  }
}

export async function updateField(fieldId: string, input: FieldUpdateInput): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(fieldId)
    const parsedInput = fieldUpdateSchema.parse(input)

    const question = await prisma.formQuestion.findUnique({
      where: { id: parsedId },
      select: {
        id: true,
        type: true,
        repeatableConfig: true,
        section: {
          select: {
            templateId: true,
          },
        },
      },
    })

    if (!question) {
      return { success: false, error: 'Field not found' }
    }

    const selectionTypes = new Set<FieldType>([
      FieldType.SINGLE_SELECT,
      FieldType.CHECKBOX_GROUP,
      FieldType.MULTI_SELECT,
    ])

    await prisma.$transaction(async (tx) => {
      const updateData: Prisma.FormQuestionUpdateInput = {
        label: parsedInput.label,
        helpText: parsedInput.helpText,
        placeholder: parsedInput.placeholder,
        isRequired: parsedInput.isRequired ?? false,
      }

      if (question.type === FieldType.REPEATABLE_GROUP || question.type === FieldType.DATA_TABLE_SELECTOR) {
        const existingConfig = question.repeatableConfig as Prisma.InputJsonValue | null
        const fallbackConfig =
          question.type === FieldType.DATA_TABLE_SELECTOR
            ? DEFAULT_DATA_TABLE_SELECTOR_CONFIG
            : DEFAULT_REPEATABLE_CONFIG

        const config = parsedInput.repeatableConfig ?? existingConfig ?? fallbackConfig
        updateData.repeatableConfig = config as Prisma.InputJsonValue
      } else if (parsedInput.repeatableConfig !== undefined) {
        updateData.repeatableConfig = Prisma.JsonNull
      }

      await tx.formQuestion.update({
        where: { id: parsedId },
        data: updateData,
      })

      if (selectionTypes.has(question.type)) {
        await tx.questionOption.deleteMany({ where: { questionId: parsedId } })

        if (parsedInput.options && parsedInput.options.length > 0) {
          await tx.questionOption.createMany({
            data: parsedInput.options.map((option, index) => ({
              questionId: parsedId,
              label: option.label,
              value: option.value,
              order: index + 1,
            })),
          })
        }
      }
    })

    await invalidateTemplate(question.section.templateId)
    return { success: true }
  } catch (error) {
    console.error('updateField failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to update field',
    }
  }
}

export async function deleteField(fieldId: string): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(fieldId)

    const deleted = await prisma.formQuestion.delete({
      where: { id: parsedId },
      include: {
        section: {
          select: {
            templateId: true,
          },
        },
      },
    })

    await invalidateTemplate(deleted.section.templateId)
    return { success: true }
  } catch (error) {
    console.error('deleteField failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to delete field',
    }
  }
}

export async function moveField(fieldId: string, direction: 'up' | 'down'): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(fieldId)

    const field = await prisma.formQuestion.findUnique({
      where: { id: parsedId },
      select: {
        id: true,
        order: true,
        sectionId: true,
        section: {
          select: {
            templateId: true,
          },
        },
      },
    })

    if (!field) {
      return { success: false, error: 'Field not found' }
    }

    const comparator = direction === 'up' ? 'desc' : 'asc'
    const orderFilter = direction === 'up' ? { lt: field.order } : { gt: field.order }

    const adjacent = await prisma.formQuestion.findFirst({
      where: {
        sectionId: field.sectionId,
        order: orderFilter,
      },
      orderBy: { order: comparator },
    })

    if (!adjacent) {
      return { success: true }
    }

    await prisma.$transaction([
      prisma.formQuestion.update({
        where: { id: field.id },
        data: { order: adjacent.order },
      }),
      prisma.formQuestion.update({
        where: { id: adjacent.id },
        data: { order: field.order },
      }),
    ])

    await invalidateTemplate(field.section.templateId)
    return { success: true }
  } catch (error) {
    console.error('moveField failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to move field',
    }
  }
}

export async function duplicateField(fieldId: string): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(fieldId)

    const question = await prisma.formQuestion.findUnique({
      where: { id: parsedId },
      include: {
        section: {
          include: {
            template: {
              select: {
                id: true,
                sections: {
                  include: {
                    questions: {
                      select: {
                        dictionaryKey: true,
                      },
                    },
                  },
                },
              },
            },
            questions: {
              orderBy: { order: 'desc' },
              select: {
                order: true,
              },
            },
          },
        },
        options: {
          orderBy: { order: 'asc' },
        },
        scoringConfig: true,
      },
    })

    if (!question || !question.section.template) {
      return { success: false, error: 'Field not found' }
    }

    const nextOrder = (question.section.questions[0]?.order ?? 0) + 1
    const allDictionaryKeys = question.section.template.sections.flatMap((sec) =>
      sec.questions.map((q) => q.dictionaryKey)
    )

    const baseCode = `${question.section.code}.${nextOrder}`
    let uniqueCode = baseCode
    let counter = 1
    // Check dictionaryKey uniqueness (uses builder.{code} format)
    while (allDictionaryKeys.includes(`builder.${uniqueCode}`)) {
      uniqueCode = `${baseCode}.${counter}`
      counter += 1
    }

    // Generate unique dictionaryKey for the copied question
    const copyDictionaryKey = `builder.${uniqueCode}`

    // Create dictionary entry for the copy
    await prisma.questionDictionary.upsert({
      where: { key: copyDictionaryKey },
      update: { label: `${question.label} (Copy)` },
      create: {
        key: copyDictionaryKey,
        version: '1.0.0',
        label: `${question.label} (Copy)`,
        helpText: question.helpText ?? 'Builder-created question (copy)',
        bindingPath: `triageStage.extendedData.${uniqueCode}`,
        dataSource: DataSource.STAGE_SUPPLEMENT,
      },
    })

    await prisma.formQuestion.create({
      data: {
        sectionId: question.sectionId,
        type: question.type,
        label: `${question.label} (Copy)`,
        helpText: question.helpText,
        placeholder: question.placeholder,
        validation: question.validation ?? undefined,
        conditional: question.conditional ?? undefined,
        order: nextOrder,
        isRequired: question.isRequired,
        dictionaryKey: copyDictionaryKey,
        options: question.options.length
          ? {
              create: question.options.map((option, index) => ({
                label: option.label,
                value: option.value,
                order: index + 1,
              })),
            }
          : undefined,
        scoringConfig: question.scoringConfig
          ? {
              create: {
                minScore: question.scoringConfig.minScore,
                maxScore: question.scoringConfig.maxScore,
                weight: question.scoringConfig.weight,
                criteria: question.scoringConfig.criteria as Prisma.InputJsonValue,
              },
            }
          : undefined,
      },
    })

    await invalidateTemplate(question.section.template.id)
    return { success: true }
  } catch (error) {
    console.error('duplicateField failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to duplicate field',
    }
  }
}

export async function saveTemplateAsDraft(templateId: string): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(templateId)

    await prisma.formTemplate.update({
      where: { id: parsedId },
      data: {
        isActive: false,
      },
    })

    await invalidateTemplate(parsedId)
    revalidatePath('/dynamic-form/builder')
    return { success: true }
  } catch (error) {
    console.error('saveTemplateAsDraft failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to save draft',
    }
  }
}

export async function publishTemplate(templateId: string): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(templateId)

    const template = await prisma.formTemplate.findUnique({
      where: { id: parsedId },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    })

    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    if (template.sections.length === 0) {
      return { success: false, error: 'Add at least one section before publishing' }
    }

    const hasEmptySection = template.sections.some((section) => section.questions.length === 0)
    if (hasEmptySection) {
      return { success: false, error: 'Each section must include at least one field before publishing' }
    }

    await prisma.formTemplate.update({
      where: { id: parsedId },
      data: {
        isActive: true,
      },
    })

    await invalidateTemplate(parsedId)
    revalidatePath('/dynamic-form/builder')
    return { success: true }
  } catch (error) {
    console.error('publishTemplate failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to publish template',
    }
  }
}

export async function updateTemplateMetadata(templateId: string, input: TemplateMetadataInput): Promise<ActionResult> {
  try {
    const parsedId = idSchema.parse(templateId)
    const parsedInput = templateMetadataSchema.parse(input)

    await prisma.formTemplate.update({
      where: { id: parsedId },
      data: {
        name: parsedInput.name,
        version: parsedInput.version,
        description: parsedInput.description,
      },
    })

    await invalidateTemplate(parsedId)
    revalidatePath('/dynamic-form/builder')
    return { success: true }
  } catch (error) {
    console.error('updateTemplateMetadata failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to update template settings',
    }
  }
}

export async function createTemplateAction(formData: FormData) {
  const parsed = createTemplateSchema.safeParse({
    name: (formData.get('name') as string | null)?.trim(),
    description: (formData.get('description') as string | null)?.trim() || undefined,
  })

  if (!parsed.success) {
    redirect('/dynamic-form/builder?error=invalid-template-data')
  }

  const { name, description } = parsed.data

  // Track success to avoid catching redirect errors in try-catch
  let createdSuccessfully = false

  try {
    await prisma.formTemplate.create({
      data: {
        name,
        description,
        version: '1.0',
        isActive: false,
      },
    })

    revalidatePath('/dynamic-form/builder')
    createdSuccessfully = true
  } catch (error) {
    console.error('Failed to create form template:', error)
  }

  // Redirect outside try-catch to prevent catching NEXT_REDIRECT errors
  if (createdSuccessfully) {
    redirect('/dynamic-form/builder?status=created')
  } else {
    redirect('/dynamic-form/builder?error=create-failed')
  }
}

export async function deleteTemplateAction(formData: FormData) {
  const templateId = formData.get('templateId') as string | null
  const parsed = idSchema.safeParse(templateId?.trim())

  if (!parsed.success) {
    redirect('/dynamic-form/builder?error=missing-template-id')
  }

  // Track success to avoid catching redirect errors in try-catch
  let deletedSuccessfully = false

  try {
    await prisma.formTemplate.delete({
      where: { id: parsed.data },
    })

    revalidatePath('/dynamic-form/builder')
    deletedSuccessfully = true
  } catch (error) {
    console.error('Failed to delete form template:', error)
  }

  // Redirect outside try-catch to prevent catching NEXT_REDIRECT errors
  if (deletedSuccessfully) {
    redirect('/dynamic-form/builder?status=deleted')
  } else {
    redirect('/dynamic-form/builder?error=delete-failed')
  }
}

export async function cloneTemplateAction(formData: FormData) {
  const templateId = formData.get('templateId') as string | null
  const parsed = idSchema.safeParse(templateId?.trim())

  if (!parsed.success) {
    redirect('/dynamic-form/builder?error=missing-template-id')
  }

  // Fetch template outside try-catch to handle not-found case properly
  const template = await prisma.formTemplate.findUnique({
    where: { id: parsed.data },
    include: {
      sections: {
        include: {
          questions: {
            include: {
              options: true,
              scoringConfig: true,
            },
          },
        },
      },
    },
  })

  if (!template) {
    redirect('/dynamic-form/builder?error=template-not-found')
  }

  // Track success to avoid catching redirect errors in try-catch
  let clonedSuccessfully = false

  try {

    const sortedSections = [...template.sections].sort((a, b) => a.order - b.order)

    await prisma.formTemplate.create({
      data: {
        name: `${template.name} (Copy)`,
        description: template.description,
        version: template.version,
        isActive: false,
        sections: {
          create: sortedSections.map((section) => {
            const sortedQuestions = [...section.questions].sort((a, b) => a.order - b.order)

            return {
              code: section.code,
              title: section.title,
              description: section.description,
              order: section.order,
              isRequired: section.isRequired,
              questions: {
                create: sortedQuestions.map((question) => {
                  const sortedOptions = [...question.options].sort((a, b) => a.order - b.order)

                  return {
                    label: question.label,
                    type: question.type,
                    helpText: question.helpText,
                    placeholder: question.placeholder,
                    validation: question.validation as Prisma.InputJsonValue | undefined,
                    conditional: question.conditional as Prisma.InputJsonValue | undefined,
                    order: question.order,
                    isRequired: question.isRequired,
                    dictionaryKey: question.dictionaryKey,
                    options:
                      sortedOptions.length > 0
                        ? {
                            create: sortedOptions.map((option) => ({
                              value: option.value,
                              label: option.label,
                              order: option.order,
                            })),
                          }
                        : undefined,
                    scoringConfig: question.scoringConfig
                      ? {
                          create: {
                            minScore: question.scoringConfig.minScore,
                            maxScore: question.scoringConfig.maxScore,
                            weight: question.scoringConfig.weight,
                            criteria: question.scoringConfig.criteria as Prisma.InputJsonValue,
                          },
                        }
                      : undefined,
                  }
                }),
              },
            }
          }),
        },
      },
    })

    revalidatePath('/dynamic-form/builder')
    clonedSuccessfully = true
  } catch (error) {
    console.error('Failed to clone form template:', error)
  }

  // Redirect outside try-catch to prevent catching NEXT_REDIRECT errors
  if (clonedSuccessfully) {
    redirect('/dynamic-form/builder?status=cloned')
  } else {
    redirect('/dynamic-form/builder?error=clone-failed')
  }
}
