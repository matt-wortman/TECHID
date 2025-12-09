import { logger } from './logger'

const SHARED_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID || 'shared-user'

/**
 * Returns a stable identifier for the current user.
 * For now, everyone authenticating with the shared credentials
 * will have access to the same identifier so drafts/submissions
 * can be viewed collectively.
 */
export function getOrCreateSessionId(): string {
  return SHARED_USER_ID
}

export function getClientLogger() {
  return logger
}
