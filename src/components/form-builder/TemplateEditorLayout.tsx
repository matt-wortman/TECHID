'use client'

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { TemplateDetail } from '@/app/dynamic-form/builder/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionsPanel } from './SectionsPanel'
import { SavePublishControls } from './SavePublishControls'
import { TemplateSettingsModal } from './TemplateSettingsModal'
import { FormEngineProvider, DynamicFormRenderer } from '@/lib/form-engine/renderer'
import { DynamicFormNavigation } from '@/components/form/DynamicFormNavigation'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Settings2,
  Layers,
  CalendarClock,
  Eye,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'

interface TemplateEditorLayoutProps {
  initialTemplate: TemplateDetail
  searchParams?: Record<string, string | string[] | undefined>
}

export function TemplateEditorLayout({ initialTemplate, searchParams }: TemplateEditorLayoutProps) {
  const [preview, setPreview] = useState(searchParams?.mode === 'preview')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const template = useMemo(() => initialTemplate, [initialTemplate])

  const totalSections = template.sections.length
  const totalFields = template.sections.reduce((acc, section) => acc + section.questions.length, 0)
  const lastUpdated = formatDistanceToNow(template.updatedAt, { addSuffix: true })

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6">
        {/* Unified Header */}
        <div className="mb-6 space-y-4">
          {/* Top row: Back + Title + Actions */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dynamic-form/builder"
                className="
                  flex items-center gap-1 px-2 py-1
                  text-sm text-[#6b7280] rounded-lg
                  hover:text-[#353535] hover:bg-white/50 transition-colors
                "
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-[#353535] truncate">
                  {template.name}
                </h1>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Edit/Preview Toggle */}
              <div className="flex items-center rounded-xl bg-[#e0e5ec] p-1 [box-shadow:inset_2px_2px_4px_rgba(163,177,198,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]">
                <button
                  onClick={() => setPreview(false)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                    ${!preview
                      ? 'bg-white text-[#353535] [box-shadow:2px_2px_4px_rgba(163,177,198,0.3),-2px_-2px_4px_rgba(255,255,255,0.8)]'
                      : 'text-[#6b7280] hover:text-[#353535]'
                    }
                  `}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setPreview(true)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                    ${preview
                      ? 'bg-white text-[#353535] [box-shadow:2px_2px_4px_rgba(163,177,198,0.3),-2px_-2px_4px_rgba(255,255,255,0.8)]'
                      : 'text-[#6b7280] hover:text-[#353535]'
                    }
                  `}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>

              {/* Settings */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="gap-1.5 bg-[#e0e5ec] border-0 [box-shadow:3px_3px_6px_rgba(163,177,198,0.4),-3px_-3px_6px_rgba(255,255,255,0.8)] hover:[box-shadow:2px_2px_4px_rgba(163,177,198,0.4),-2px_-2px_4px_rgba(255,255,255,0.8)]"
              >
                <Settings2 className="h-4 w-4" />
                Settings
              </Button>

              {/* Save/Publish */}
              <SavePublishControls
                templateId={template.id}
                isActive={template.isActive}
                disabled={preview}
              />
            </div>
          </div>

          {/* Status row */}
          <div className="flex items-center gap-4 text-sm text-[#6b7280] flex-wrap">
            <span className={`font-medium ${template.isActive ? 'text-green-600' : 'text-amber-600'}`}>
              {template.isActive ? 'Active' : 'Draft'}
            </span>
            <span className="text-[#9ca3af]">•</span>
            <span>Version {template.version}</span>
            <span className="text-[#9ca3af]">•</span>
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {totalSections} sections, {totalFields} fields
            </span>
            <span className="text-[#9ca3af]">•</span>
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Updated {lastUpdated}
            </span>
          </div>
        </div>

        {/* Content Area */}
        {preview ? (
          <Card className="bg-white border-0 rounded-3xl [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)]">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Form Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-[#e0e5ec] bg-[#f8f9fb] p-6 space-y-6">
                <FormEngineProvider
                  template={template}
                  onSubmit={async () => {
                    toast.info('Preview submit intercepted')
                  }}
                  onSaveDraft={async () => {
                    toast.info('Preview save intercepted')
                  }}
                >
                  <DynamicFormRenderer />
                  <DynamicFormNavigation
                    onSubmit={async () => {
                      toast.info('Preview submit intercepted')
                    }}
                    onSaveDraft={async () => {
                      toast.info('Preview save intercepted')
                    }}
                  />
                </FormEngineProvider>
              </div>
            </CardContent>
          </Card>
        ) : (
          <SectionsPanel templateId={template.id} sections={template.sections} />
        )}

      {/* Settings Modal */}
      <TemplateSettingsModal
        template={template}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </main>
  )
}
