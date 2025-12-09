"use client"

import { useEffect, useState, useTransition } from 'react'
import { TemplateDetail, updateTemplateMetadata } from '@/app/dynamic-form/builder/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface TemplateSettingsModalProps {
  template: TemplateDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateSettingsModal({ template, open, onOpenChange }: TemplateSettingsModalProps) {
  const [name, setName] = useState(template.name)
  const [version, setVersion] = useState(template.version)
  const [description, setDescription] = useState(template.description ?? '')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setName(template.name)
      setVersion(template.version)
      setDescription(template.description ?? '')
    }
  }, [open, template])

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }

    if (!version.trim()) {
      toast.error('Version is required')
      return
    }

    startTransition(async () => {
      try {
        const result = await updateTemplateMetadata(template.id, {
          name: name.trim(),
          version: version.trim(),
          description: description.trim() || undefined,
        })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Template settings updated')
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        console.error('Failed to update template metadata', error)
        toast.error(error instanceof Error ? error.message : 'Unable to update settings')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Template settings</DialogTitle>
          <DialogDescription>Update template metadata and description.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Status:</span>
            <Badge variant={template.isActive ? 'default' : 'secondary'}>
              {template.isActive ? 'Active' : 'Draft'}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Technology Intake Form"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-version">Version</Label>
            <Input
              id="template-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="1.0"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional summary for teammates"
              rows={4}
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter className="mt-6 flex gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
