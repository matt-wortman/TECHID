import { z } from 'zod';

export const feedbackRequestSchema = z.object({
  pageUrl: z
    .string()
    .trim()
    .min(1, 'Page URL cannot be empty.')
    .max(2048, 'Page URL exceeds the maximum length of 2048 characters.'),
  message: z
    .string()
    .trim()
    .min(5, 'Please provide at least 5 characters.')
    .max(1000, 'Feedback message cannot exceed 1000 characters.'),
  contactInfo: z
    .string()
    .trim()
    .max(200, 'Contact details cannot exceed 200 characters.')
    .optional(),
  userId: z
    .string()
    .trim()
    .max(120, 'User identifier is too long.')
    .optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
