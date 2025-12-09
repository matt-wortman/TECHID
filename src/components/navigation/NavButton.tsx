'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavButtonProps {
  href: string
  icon?: LucideIcon
  children: React.ReactNode
  /** Match exact path or prefix */
  matchMode?: 'exact' | 'prefix'
  /** Compact size for secondary navigation */
  compact?: boolean
  className?: string
}

const baseStyles = `
  flex items-center gap-2
  bg-[#e0e5ec] border-0 text-[#353535]
  transition-all duration-150
  [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)]
  hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]
`

const activeStyles = `
  [box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]
`

export function NavButton({
  href,
  icon: Icon,
  children,
  matchMode = 'prefix',
  compact = false,
  className,
}: NavButtonProps) {
  const pathname = usePathname()

  const isActive = matchMode === 'exact'
    ? pathname === href
    : pathname.startsWith(href) && (href !== '/' || pathname === '/')

  const sizeStyles = compact
    ? 'px-3 py-1.5 text-sm font-medium rounded-xl'
    : 'h-10 px-5 rounded-full text-[15px] font-medium'

  return (
    <Link
      href={href}
      className={cn(
        baseStyles,
        sizeStyles,
        isActive && activeStyles,
        className
      )}
    >
      {Icon && <Icon className={cn(compact ? 'h-4 w-4' : 'h-4 w-4')} />}
      {children}
    </Link>
  )
}
