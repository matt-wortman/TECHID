'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Page title */
  title: string
  /** Optional subtitle or description */
  subtitle?: string
  /** Back button configuration */
  backButton?: {
    href: string
    label?: string
  }
  /** Status indicators (text only, non-interactive) */
  status?: React.ReactNode
  /** Action buttons (right side) */
  actions?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  backButton,
  status,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Main header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {backButton && (
            <Link
              href={backButton.href}
              className="
                flex items-center gap-1 px-3 py-1.5
                text-sm font-medium text-[#6b7280]
                rounded-lg transition-colors
                hover:text-[#353535] hover:bg-white/50
              "
            >
              <ChevronLeft className="h-4 w-4" />
              {backButton.label || 'Back'}
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[#353535] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[#6b7280] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Status row (if provided) */}
      {status && (
        <div className="flex items-center gap-3 text-sm text-[#6b7280]">
          {status}
        </div>
      )}
    </div>
  )
}

/**
 * Status indicator for PageHeader
 * Non-interactive, text-only display
 */
interface StatusItemProps {
  icon?: React.ReactNode
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning'
}

export function StatusItem({ icon, children, variant = 'default' }: StatusItemProps) {
  const variantStyles = {
    default: 'text-[#6b7280]',
    success: 'text-green-600',
    warning: 'text-amber-600',
  }

  return (
    <span className={cn('flex items-center gap-1', variantStyles[variant])}>
      {icon}
      {children}
    </span>
  )
}
