import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma factory for seeds and tests
 * Singleton pattern for production, injectable for tests
 *
 * CONTEXTUAL EVIDENCE: Based on src/lib/prisma.ts singleton pattern
 */
export function getPrismaClient(injectedClient?: PrismaClient): PrismaClient {
  // Return injected client for tests, or create singleton for production
  if (injectedClient) {
    return injectedClient;
  }

  // Create singleton instance for seed scripts
  if (!globalThis.__seedPrismaClient) {
    globalThis.__seedPrismaClient = new PrismaClient({
      log: ['warn', 'error'],
    });
  }

  return globalThis.__seedPrismaClient;
}

// Global type extension for singleton
declare global {
  var __seedPrismaClient: PrismaClient | undefined;
}