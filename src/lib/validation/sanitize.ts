/**
 * Input sanitization utilities to prevent XSS and ensure data integrity.
 *
 * These utilities should be used on all user-provided input before storing
 * in the database. While Prisma prevents SQL injection, stored XSS is still
 * a risk if data is ever rendered unsafely.
 */

/**
 * HTML entities that need escaping to prevent XSS
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML entities in a string to prevent XSS attacks.
 * Use this when the string might be rendered in HTML context.
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Strip all HTML tags from a string.
 * Use this when you want plain text only.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/gi, ' ') // Replace non-breaking spaces
    .replace(/&amp;/gi, '&') // Decode common entities
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
}

/**
 * Options for sanitizing a string
 */
export interface SanitizeOptions {
  /** Maximum length allowed (truncates if exceeded) */
  maxLength?: number
  /** Whether to trim whitespace (default: true) */
  trim?: boolean
  /** Whether to escape HTML entities (default: true) */
  escapeHtml?: boolean
  /** Whether to strip all HTML tags (default: false) */
  stripHtml?: boolean
  /** Whether to normalize whitespace (collapse multiple spaces) */
  normalizeWhitespace?: boolean
  /** Whether to convert to lowercase */
  lowercase?: boolean
}

/**
 * Sanitize a string with configurable options.
 *
 * @param input - The input string to sanitize
 * @param options - Sanitization options
 * @returns The sanitized string
 *
 * @example
 * ```ts
 * // Basic sanitization (trim + escape HTML)
 * sanitizeString('  <script>alert("xss")</script>  ')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 *
 * // Strip HTML and limit length
 * sanitizeString('<b>Hello</b> World', { stripHtml: true, maxLength: 5 })
 * // Returns: 'Hello'
 * ```
 */
export function sanitizeString(
  input: string | null | undefined,
  options: SanitizeOptions = {}
): string {
  if (input == null) return ''

  const {
    maxLength,
    trim = true,
    escapeHtml: shouldEscape = true,
    stripHtml: shouldStrip = false,
    normalizeWhitespace = false,
    lowercase = false,
  } = options

  let result = String(input)

  // Trim whitespace
  if (trim) {
    result = result.trim()
  }

  // Normalize whitespace (collapse multiple spaces)
  if (normalizeWhitespace) {
    result = result.replace(/\s+/g, ' ')
  }

  // Strip HTML tags (do this before escaping)
  if (shouldStrip) {
    result = stripHtml(result)
  } else if (shouldEscape) {
    // Escape HTML entities (only if not stripping)
    result = escapeHtml(result)
  }

  // Convert to lowercase
  if (lowercase) {
    result = result.toLowerCase()
  }

  // Truncate to max length
  if (maxLength !== undefined && result.length > maxLength) {
    result = result.slice(0, maxLength)
  }

  return result
}

/**
 * Sanitize an object's string values recursively.
 * Non-string values are passed through unchanged.
 *
 * @param obj - The object to sanitize
 * @param options - Sanitization options for string values
 * @returns A new object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  if (obj == null || typeof obj !== 'object') {
    return obj
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value, options)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item, options)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>, options)
            : item
      )
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>, options)
    } else {
      result[key] = value
    }
  }

  return result as T
}

/**
 * Validate and sanitize an email address.
 * Returns null if the email is invalid.
 */
export function sanitizeEmail(input: string | null | undefined): string | null {
  if (input == null) return null

  const email = input.trim().toLowerCase()

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return null
  }

  // Additional length check
  if (email.length > 254) {
    return null
  }

  return email
}

/**
 * Sanitize a URL, ensuring it's safe to use.
 * Returns null if the URL is invalid or potentially dangerous.
 */
export function sanitizeUrl(input: string | null | undefined): string | null {
  if (input == null) return null

  const url = input.trim()

  // Block javascript: and data: URLs
  if (/^(javascript|data|vbscript):/i.test(url)) {
    return null
  }

  // Try to parse as URL
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.href
  } catch {
    // If not a valid absolute URL, check if it's a relative path
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url
    }
    return null
  }
}

/**
 * Field-specific maximum lengths for common fields.
 * Use these as defaults when sanitizing specific field types.
 */
export const FIELD_MAX_LENGTHS = {
  name: 255,
  email: 254,
  description: 5000,
  shortText: 500,
  longText: 10000,
  url: 2048,
  key: 100,
  label: 500,
} as const

/**
 * Sanitize form responses object.
 * Applies appropriate sanitization based on field type hints.
 * Preserves the original type structure for TypeScript compatibility.
 */
export function sanitizeFormResponses<T extends Record<string, unknown>>(
  responses: T
): T {
  return sanitizeObject(responses, {
    trim: true,
    escapeHtml: true,
    normalizeWhitespace: false, // Preserve intentional formatting in long text
  })
}
