"use client"

import { useState } from 'react'
import { FieldType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getFieldTypesByCategory, FIELD_TYPE_CONFIG, FIELD_CATEGORY_LABELS } from '@/lib/form-builder/field-type-config'
import { FieldTypeIcon } from './FieldTypeIcon'
import { cn } from '@/lib/utils'

interface FieldSelectorModalProps {
  triggerLabel?: string
  onSelect: (fieldType: FieldType) => void
  disabled?: boolean
}

export function FieldSelectorModal({ triggerLabel = 'Add field', onSelect, disabled = false }: FieldSelectorModalProps) {
  const [open, setOpen] = useState(false)
  const categories = getFieldTypesByCategory()
  const firstCategory = categories[0]?.category

  const handleSelect = (type: FieldType) => {
    onSelect(type)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select a field type</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={firstCategory ?? ''} className="mt-4">
          <TabsList className="grid grid-cols-3 gap-2 bg-transparent p-0">
            {categories.map(({ category, label }) => (
              <TabsTrigger key={category} value={category} className="w-full">
                {FIELD_CATEGORY_LABELS[category] ?? label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(({ category, types }) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                {types.map((type) => {
                  const config = FIELD_TYPE_CONFIG[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      className={cn(
                        'rounded-2xl border-0 bg-[#e0e5ec] p-5 text-left transition-all [box-shadow:6px_6px_12px_rgba(163,177,198,0.35),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:[box-shadow:inset_4px_4px_8px_rgba(163,177,198,0.25),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] focus-visible:outline-none focus-visible:ring-0'
                      )}
                      onClick={() => handleSelect(type)}
                    >
                      <FieldTypeIcon type={type} size="md" />
                      <div className="mt-3 space-y-1">
                        <p className="text-sm font-semibold text-foreground">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
