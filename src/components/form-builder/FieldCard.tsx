"use client"

import { useState, useTransition } from 'react'
import { TemplateDetail } from '@/app/dynamic-form/builder/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FieldTypeIcon } from './FieldTypeIcon'
import { FIELD_TYPE_CONFIG } from '@/lib/form-builder/field-type-config'
import { FieldConfigModal } from './FieldConfigModal'
import { useRouter } from 'next/navigation'
import { duplicateField, deleteField, moveField } from '@/app/dynamic-form/builder/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface FieldCardProps {
  question: TemplateDetail['sections'][number]['questions'][number]
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
}

export function FieldCard({ question, isFirst, isLast, disabled = false }: FieldCardProps) {
  const optionCount = question.options.length
  const fieldConfig = FIELD_TYPE_CONFIG[question.type]
  const [configOpen, setConfigOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleMove = (direction: 'up' | 'down') => {
    startTransition(async () => {
      try {
        const result = await moveField(question.id, direction)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        router.refresh()
      } catch (error) {
        console.error('Failed to move field', error)
        toast.error('Unable to move field')
      }
    })
  }

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        const result = await duplicateField(question.id)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Field duplicated')
        router.refresh()
      } catch (error) {
        console.error('Failed to duplicate field', error)
        toast.error('Unable to duplicate field')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteField(question.id)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Field deleted')
        router.refresh()
      } catch (error) {
        console.error('Failed to delete field', error)
        toast.error('Unable to delete field')
      }
    })
  }

  return (
    <div className="rounded-2xl border-0 bg-white p-6 [box-shadow:5px_5px_10px_rgba(163,177,198,0.4),-5px_-5px_10px_rgba(255,255,255,0.7)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FieldTypeIcon type={question.type} size="sm" />
            <p className="font-medium text-foreground">{question.label}</p>
          </div>
          {fieldConfig && <p className="text-sm text-muted-foreground">{fieldConfig.label}</p>}
          {question.helpText && (
            <p className="text-xs text-muted-foreground/80">{question.helpText}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant={question.isRequired ? 'default' : 'secondary'}>
              {question.isRequired ? 'Required' : 'Optional'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} disabled={disabled}>
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || pending || isFirst}
              onClick={() => !disabled && !isFirst && handleMove('up')}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || pending || isLast}
              onClick={() => !disabled && !isLast && handleMove('down')}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || pending}
              onClick={() => !disabled && handleDuplicate()}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-600" disabled={disabled || pending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this field?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the field and its configuration from the template.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => !disabled && handleDelete()}
                    disabled={disabled}
                  >
                    Delete field
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#6b7280]">
        {question.placeholder && <span>Placeholder: {question.placeholder}</span>}
        {optionCount > 0 && <span>{optionCount} option{optionCount === 1 ? '' : 's'}</span>}
        {question.scoringConfig && <span>Scoring configured</span>}
        {question.validation && <span>Validation rules defined</span>}
        {question.conditional && <span>Conditional logic applied</span>}
      </div>
      <FieldConfigModal
        field={question}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={() => {
          setConfigOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
