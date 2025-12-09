"use client"

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { TemplateDetail } from '@/app/dynamic-form/builder/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionsPanel } from './SectionsPanel'
import { SavePublishControls } from './SavePublishControls'
import { TemplateSettingsModal } from './TemplateSettingsModal'
import { CalendarClock, ChevronLeft, Layers, Settings2 } from 'lucide-react'

interface BuilderLayoutProps {
  template: TemplateDetail
  disabled?: boolean
}

export function BuilderLayout({ template, disabled = false }: BuilderLayoutProps) {
  const totalSections = template.sections.length
  const totalFields = template.sections.reduce((acc, section) => acc + section.questions.length, 0)
  const lastUpdated = formatDistanceToNow(template.updatedAt, { addSuffix: true })
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dynamic-form/builder">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to templates
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Template settings
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={template.isActive ? 'default' : 'secondary'}>
            {template.isActive ? 'Active' : 'Draft'}
          </Badge>
          <Badge variant="outline">Version {template.version}</Badge>
          <Badge variant="outline">
            <Layers className="mr-1 h-3 w-3" /> {totalSections} sections • {totalFields} fields
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-foreground">{template.name}</CardTitle>
          {template.description && (
            <p className="max-w-3xl text-sm text-muted-foreground">{template.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-4 w-4" /> Updated {lastUpdated}
            </span>
            <span className="text-muted-foreground/80">Template ID: {template.id}</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <SavePublishControls templateId={template.id} isActive={template.isActive} disabled={disabled} />
        </CardContent>
      </Card>

      <SectionsPanel templateId={template.id} sections={template.sections} disabled={disabled} />

      <TemplateSettingsModal template={template} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
