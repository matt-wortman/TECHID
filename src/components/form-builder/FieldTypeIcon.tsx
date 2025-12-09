"use client"

import { FieldType } from '@prisma/client'
import { FIELD_TYPE_CONFIG } from '@/lib/form-builder/field-type-config'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const ICON_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

const WRAPPER_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
}

interface FieldTypeIconProps {
  type: FieldType
  size?: 'sm' | 'md' | 'lg'
  withLabel?: boolean
}

export function FieldTypeIcon({ type, size = 'md', withLabel = false }: FieldTypeIconProps) {
  const config = FIELD_TYPE_CONFIG[type]

  if (!config) return null

  const Icon = config.icon
  const iconElement = (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-2xl border-0 bg-[#e0e5ec] text-[#475569] transition-all [box-shadow:4px_4px_8px_rgba(163,177,198,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)]',
        WRAPPER_SIZES[size]
      )}
    >
      <Icon className={cn(ICON_SIZES[size])} />
    </span>
  )

  const trigger = withLabel ? (
    <span className="inline-flex items-center gap-2">
      {iconElement}
      <span className="text-sm font-medium text-[#475569]">{config.label}</span>
    </span>
  ) : (
    iconElement
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
