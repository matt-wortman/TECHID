'use client'

import { useEffect, useState } from 'react'
import { TemplateDetail } from '@/app/dynamic-form/builder/actions'
import { SectionForm } from './SectionControls'
import { Button } from '@/components/ui/button'
import { SectionCard } from './SectionCard'

interface SectionsPanelProps {
  templateId: string
  sections: TemplateDetail['sections']
  disabled?: boolean
}

export function SectionsPanel({ templateId, sections, disabled = false }: SectionsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (disabled) {
      setShowCreateForm(false)
    }
  }, [disabled])

  if (disabled && showCreateForm) {
    setShowCreateForm(false)
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Sections</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateForm((prev) => !prev)}
          disabled={disabled}
          className={disabled ? 'cursor-not-allowed opacity-60' : ''}
        >
          {showCreateForm ? 'Close form' : 'Add section'}
        </Button>
      </header>

      {showCreateForm && (
        <div className="rounded-3xl border-0 bg-white p-8 [box-shadow:6px_6px_12px_rgba(163,177,198,0.35),-6px_-6px_12px_rgba(255,255,255,0.8)]">
          <h3 className="text-base font-semibold text-foreground">New section</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Provide a code and title to create a new section in this template.
          </p>
          <SectionForm
            templateId={templateId}
            existingSections={sections}
            onClose={() => setShowCreateForm(false)}
            disabled={disabled}
          />
        </div>
      )}

      {sections.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#c8d3e2] bg-[#f4f7fb] p-12 text-center text-sm text-[#6b7280] [box-shadow:inset_4px_4px_8px_rgba(163,177,198,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.75)]">
          No sections yet. Create your first section to start outlining the form.
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              templateId={templateId}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              allSections={sections}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </section>
  )
}
