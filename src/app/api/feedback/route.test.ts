/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    feedback: {
      create: jest.fn(),
    },
  },
}));

const mockCreate = prisma.feedback.create as jest.Mock;

const createRequest = (
  body: unknown,
  headers: Record<string, string | undefined> = {},
  jsonBehavior: 'resolve' | 'reject' = 'resolve'
) => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value ?? null])
  );

  return {
    json:
      jsonBehavior === 'resolve'
        ? jest.fn().mockResolvedValue(body)
        : jest.fn().mockRejectedValue(new Error('invalid json')),
    headers: {
      get: (key: string) => normalizedHeaders[key.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
};

describe('POST /api/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists valid feedback and returns success response', async () => {
    mockCreate.mockResolvedValue({
      id: 'feedback-123',
      pageUrl: '/dynamic-form',
    });

    const request = createRequest(
      {
        pageUrl: '/dynamic-form',
        message: 'Great form experience!',
        contactInfo: ' dev@example.org ',
        userId: ' tester ',
      },
      {
        'user-agent': 'Jest',
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      feedbackId: 'feedback-123',
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        pageUrl: '/dynamic-form',
        message: 'Great form experience!',
        contactInfo: 'dev@example.org',
        userId: 'tester',
        userAgent: 'Jest',
      },
    });
  });

  it('strips optional fields when only whitespace is provided', async () => {
    mockCreate.mockResolvedValue({
      id: 'feedback-999',
      pageUrl: '/provided',
    });

    const request = createRequest(
      {
        pageUrl: '/provided',
        message: 'Solid job!',
        contactInfo: '   ',
        userId: '   ',
      },
      {}
    );

    const response = await POST(request);
    await response.json();

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        pageUrl: '/provided',
        message: 'Solid job!',
        contactInfo: undefined,
        userId: undefined,
        userAgent: undefined,
      },
    });
  });

  it('returns 400 when request JSON parsing fails', async () => {
    const request = createRequest(
      {},
      {},
      'reject'
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid JSON payload.');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when schema validation fails', async () => {
    const request = createRequest({
      pageUrl: '',
      message: 'no',
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid feedback payload.');
    expect(payload.details).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 500 when persistence fails', async () => {
    mockCreate.mockRejectedValue(new Error('db down'));

    const request = createRequest({
      pageUrl: '/dynamic-form',
      message: 'Great!',
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to save feedback.');
  });
});
