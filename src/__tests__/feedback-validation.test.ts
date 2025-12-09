import { feedbackRequestSchema } from '@/lib/validation/feedback';

describe('feedbackRequestSchema', () => {
  it('accepts valid feedback payloads', () => {
    const result = feedbackRequestSchema.safeParse({
      pageUrl: '/dynamic-form',
      message: 'Great experience overall.',
      contactInfo: 'someone@example.com',
      userId: 'tester-123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageUrl).toBe('/dynamic-form');
      expect(result.data.message).toContain('Great');
    }
  });

  it('rejects feedback messages that are too short', () => {
    const result = feedbackRequestSchema.safeParse({
      pageUrl: '/dynamic-form',
      message: 'no',
    });

    expect(result.success).toBe(false);
  });

  it('rejects contact info over the character limit', () => {
    const result = feedbackRequestSchema.safeParse({
      pageUrl: '/dynamic-form',
      message: 'This is acceptable feedback content.',
      contactInfo: 'a'.repeat(500),
    });

    expect(result.success).toBe(false);
  });
});
