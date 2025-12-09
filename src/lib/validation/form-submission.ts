import { SubmissionStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

const jsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

const rowVersionSchema = z
  .object({
    technologyRowVersion: z.number().int().nonnegative().optional(),
    triageStageRowVersion: z.number().int().nonnegative().optional(),
    viabilityStageRowVersion: z.number().int().nonnegative().optional(),
  })
  .partial()
  .optional();

export const formSubmissionPayloadSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
  responses: z.record(z.string(), jsonValueSchema).default({}),
  repeatGroups: z
    .record(z.string(), z.array(z.record(z.string(), jsonValueSchema)))
    .default({}),
  calculatedScores: z
    .record(z.string(), jsonValueSchema)
    .optional()
    .default({}),
  rowVersions: rowVersionSchema,
});

export const formSubmissionRequestSchema = formSubmissionPayloadSchema.extend({
  submittedBy: z.string().min(1).optional(),
  status: z.nativeEnum(SubmissionStatus).optional(),
});

export const formSubmissionUpdateSchema = formSubmissionPayloadSchema.extend({
  submissionId: z.string().min(1, 'submissionId is required'),
  status: z.nativeEnum(SubmissionStatus).optional(),
});

export type FormSubmissionPayload = z.infer<typeof formSubmissionPayloadSchema>;
export type FormSubmissionRequest = z.infer<typeof formSubmissionRequestSchema>;
export type FormSubmissionUpdate = z.infer<typeof formSubmissionUpdateSchema>;

/**
 * Extract technologyId (techId) from form responses.
 *
 * The techId is expected to be in responses with a key that has binding path 'technology.techId'.
 * This function looks for common dictionary keys that map to technology.techId.
 *
 * @param responses - Form responses keyed by dictionaryKey
 * @param bindingMetadata - Metadata with bindingPath information
 * @returns The techId string if found, undefined otherwise
 */
export function extractTechIdFromResponses(
  responses: Record<string, unknown>,
  bindingMetadata: Record<string, { bindingPath: string }>
): string | undefined {
  // Find the dictionary key that maps to technology.techId
  for (const [dictionaryKey, meta] of Object.entries(bindingMetadata)) {
    if (meta.bindingPath === "technology.techId") {
      const value = responses[dictionaryKey];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return undefined;
}

/**
 * Validation error thrown when technologyId is required but not provided
 */
export class TechnologyIdRequiredError extends Error {
  constructor(message = "Technology ID is required. Please fill in the Technology ID field.") {
    super(message);
    this.name = "TechnologyIdRequiredError";
  }
}
