/**
 * Shared navigation styling constants
 * Neumorphic design system for consistent UI across the application
 */

// Neumorphic shadow styles
export const neumorphicShadow = '5px 5px 10px 0px #a3b1c6, -5px -5px 10px 0px rgba(255,255,255,0.6)'
export const neumorphicShadowHover = '3px 3px 6px 0px #a3b1c6, -3px -3px 6px 0px rgba(255,255,255,0.6)'
export const neumorphicShadowActive = 'inset 3px 3px 6px 0px rgba(163,177,198,0.4), inset -3px -3px 6px 0px rgba(255,255,255,0.6)'

// Color palette
export const colors = {
  background: '#e0e5ec',
  text: {
    primary: '#353535',
    secondary: '#6b7280',
    muted: '#9ca3af',
  },
  surface: {
    raised: '#e0e5ec',
    card: '#ffffff',
  },
} as const

// Navigation button styles (pill-shaped)
export const navButtonClass = `
  h-10 px-5 rounded-full text-[15px] font-medium
  flex items-center gap-2
  bg-[${colors.background}] border-0 text-[${colors.text.primary}]
  transition-all duration-150
  [box-shadow:${neumorphicShadow}]
  hover:[box-shadow:${neumorphicShadowHover}]
  active:[box-shadow:${neumorphicShadowActive}]
`.replace(/\s+/g, ' ').trim()

// Compact navigation button (for secondary nav)
export const navButtonCompactClass = `
  px-3 py-1.5 text-sm font-medium
  flex items-center gap-2
  bg-[${colors.background}] border-0 text-[${colors.text.primary}] rounded-xl
  transition-all duration-150
  [box-shadow:${neumorphicShadow}]
  hover:[box-shadow:${neumorphicShadowHover}]
  active:[box-shadow:${neumorphicShadowActive}]
`.replace(/\s+/g, ' ').trim()

// Card styles
export const containerCardClass = 'bg-[#e0e5ec] border-0 shadow-none rounded-3xl'
export const innerCardClass = `bg-white border-0 rounded-3xl [box-shadow:${neumorphicShadow}]`

// Page background
export const pageBackgroundClass = 'min-h-screen bg-[#e0e5ec]'
