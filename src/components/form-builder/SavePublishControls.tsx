"use client"

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { saveTemplateAsDraft, publishTemplate } from '@/app/dynamic-form/builder/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface SavePublishControlsProps {
  templateId: string
  isActive: boolean
  disabled?: boolean
}

export function SavePublishControls({ templateId, isActive, disabled = false }: SavePublishControlsProps) {
  const [pendingSave, startSave] = useTransition()
  const [pendingPublish, startPublish] = useTransition()
  const router = useRouter()

  const handleSave = () => {
    startSave(async () => {
      try {
        const result = await saveTemplateAsDraft(templateId)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Draft saved')
        router.refresh()
      } catch (error) {
        console.error('Failed to save draft', error)
        toast.error(error instanceof Error ? error.message : 'Unable to save draft')
      }
    })
  }

  const handlePublish = () => {
    startPublish(async () => {
      try {
        const result = await publishTemplate(templateId)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Template published')
        router.refresh()
      } catch (error) {
        console.error('Failed to publish template', error)
        toast.error(error instanceof Error ? error.message : 'Unable to publish template')
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={disabled || pendingSave || pendingPublish}
      >
        {pendingSave ? 'Saving…' : 'Save draft'}
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handlePublish}
        disabled={disabled || pendingSave || pendingPublish}
      >
        {pendingPublish ? 'Publishing…' : isActive ? 'Re-publish' : 'Publish'}
      </Button>
    </div>
  )
}
