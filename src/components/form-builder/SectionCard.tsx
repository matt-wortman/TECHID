'use client'

import { useState, useTransition } from 'react'
import { TemplateDetail } from '@/app/dynamic-form/builder/actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldCard } from './FieldCard'
import { SectionActions, SectionForm } from './SectionControls'
import { Pencil, Plus } from 'lucide-react'
import { FieldSelectorModal } from './FieldSelectorModal'
import { FieldType } from '@prisma/client'
import { createField } from '@/app/dynamic-form/builder/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface SectionCardProps {
  section: TemplateDetail['sections'][number]
  templateId: string
  isFirst: boolean
  isLast: boolean
  allSections: TemplateDetail['sections']
  disabled?: boolean
}

export function SectionCard({ section, templateId, isFirst, isLast, allSections, disabled = false }: SectionCardProps) {
  const fieldCount = section.questions.length
  const [editing, setEditing] = useState(false)
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleFieldCreate = (fieldType: FieldType) => {
    startTransition(async () => {
      try {
        const result = await createField(section.id, { type: fieldType })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Field created')
        router.refresh()
      } catch (error) {
        console.error('Failed to create field', error)
        toast.error('Unable to create field')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-foreground">{section.title}</CardTitle>
          {section.description && (
            <CardDescription className="max-w-2xl">{section.description}</CardDescription>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{fieldCount} field{fieldCount === 1 ? '' : 's'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing((prev) => !prev)} disabled={disabled}>
              <Pencil className="mr-2 h-4 w-4" />
              {editing ? 'Close editor' : 'Edit section'}
            </Button>
            <SectionActions
              sectionId={section.id}
              disableMoveUp={isFirst}
              disableMoveDown={isLast}
              disabled={disabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && !disabled && (
          <div className="rounded-2xl border-0 bg-[#f1f4f9] p-6 [box-shadow:inset_6px_6px_12px_rgba(163,177,198,0.25),inset_-6px_-6px_12px_rgba(255,255,255,0.8)]">
            <SectionForm
              templateId={templateId}
              sectionId={section.id}
              initialValues={{
                title: section.title,
                description: section.description ?? undefined,
                code: section.code,
              }}
              existingSections={allSections}
              disabled={disabled}
              onClose={() => setEditing(false)}
            />
          </div>
        )}

        {fieldCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#c8d3e2] bg-[#f4f7fb] p-10 text-center text-sm text-[#6b7280] [box-shadow:inset_4px_4px_8px_rgba(163,177,198,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]">
            No fields in this section yet.
          </div>
        ) : (
          section.questions.map((question, index) => (
            <FieldCard
              key={question.id}
              question={question}
              isFirst={index === 0}
              isLast={index === fieldCount - 1}
              disabled={disabled}
            />
          ))
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <FieldSelectorModal
          onSelect={handleFieldCreate}
          triggerLabel={pending ? 'Adding…' : 'Add field'}
          disabled={pending || disabled}
        />
        <Button variant="ghost" size="sm" disabled className="pointer-events-none opacity-60">
          <Plus className="mr-2 h-4 w-4" /> Add rule (coming soon)
        </Button>
      </CardFooter>
    </Card>
  )
}
