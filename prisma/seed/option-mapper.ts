import { PrismaClient } from '@prisma/client';

/**
 * Option value mapping utility for demo data seeding
 *
 * CONTEXTUAL EVIDENCE:
 * - tech.domainAssetClass options: { value: "medical_device", label: "Medical Device" }
 * - Demo data incorrectly uses display labels instead of database values
 */

export interface OptionMapping {
  [displayLabel: string]: string;
}

/**
 * Get option values for a specific field from the database
 * Maps display labels to database values dynamically
 */
export async function getOptionValues(
  prisma: PrismaClient,
  dictionaryKey: string
): Promise<OptionMapping> {
  const options = await prisma.questionOption.findMany({
    where: {
      question: {
        dictionaryKey
      }
    },
    select: {
      value: true,
      label: true
    }
  });

  return options.reduce((map, opt) => ({
    ...map,
    [opt.label]: opt.value  // "Medical Device" → "medical_device"
  }), {});
}

/**
 * Convert display labels to database values for form responses
 * Used to fix demo data that uses incorrect display labels
 */
// Conversion logic now lives in the seeding helpers where the mappings are cached.
