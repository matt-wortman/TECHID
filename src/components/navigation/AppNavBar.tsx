'use client'

import { NavButton } from './NavButton'
import {
  Home,
  FileText,
  Hammer,
  ClipboardList,
  BookOpen,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  matchMode?: 'exact' | 'prefix'
}

const defaultNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, matchMode: 'exact' },
  { href: '/dynamic-form', label: 'Forms', icon: FileText, matchMode: 'exact' },
  { href: '/dynamic-form/builder', label: 'Builder', icon: Hammer },
  { href: '/dynamic-form/drafts', label: 'Drafts', icon: FileText },
  { href: '/dynamic-form/submissions', label: 'Submissions', icon: ClipboardList },
  { href: '/dynamic-form/library', label: 'Library', icon: BookOpen },
]

interface AppNavBarProps {
  /** Override default nav items */
  items?: NavItem[]
  /** Additional content to render on the right side */
  rightContent?: React.ReactNode
  /** Max width constraint */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
}

export function AppNavBar({
  items = defaultNavItems,
  rightContent,
  maxWidth = '6xl',
}: AppNavBarProps) {
  return (
    <nav className="bg-[#e0e5ec] border-0 shadow-none">
      <div className={`container mx-auto px-4 py-4 max-w-${maxWidth}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {items.map((item) => (
              <NavButton
                key={item.href}
                href={item.href}
                icon={item.icon}
                matchMode={item.matchMode}
              >
                {item.label}
              </NavButton>
            ))}
          </div>
          {rightContent && (
            <div className="flex items-center gap-3">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
