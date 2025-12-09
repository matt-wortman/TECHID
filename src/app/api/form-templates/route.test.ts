/**
 * @jest-environment node
 */
import { GET } from './route';
import { loadTemplateWithBindings, TemplateHydrationResult } from '@/lib/technology/service';
import type { FormTemplateWithSections } from '@/lib/form-engine/types';

jest.mock('@/lib/technology/service', () => ({
  loadTemplateWithBindings: jest.fn(),
}));

const mockLoadTemplateWithBindings = loadTemplateWithBindings as jest.MockedFunction<typeof loadTemplateWithBindings>;

const createRequest = (query = '') =>
  new Request(`https://example.com/api/form-templates${query}`);

const minimalTemplate: FormTemplateWithSections = {
  id: 'tpl-123',
  name: 'Test Template',
  version: '1',
  description: null,
  isActive: true,
  createdAt: new Date('2025-11-06T00:00:00Z'),
  updatedAt: new Date('2025-11-06T00:00:00Z'),
  sections: [],
};

const baseHydrationResponse: TemplateHydrationResult = {
  template: minimalTemplate,
  bindingMetadata: {},
  initialResponses: {},
  initialRepeatGroups: {},
  answerMetadata: {},
  technologyContext: null,
  rowVersions: {},
};

describe('GET /api/form-templates', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns hydrated template data with query params forwarded to the service', async () => {
    mockLoadTemplateWithBindings.mockResolvedValue(baseHydrationResponse);

    const response = await GET(createRequest('?techId=TECH-42'));
    const payload = await response.json();

    expect(mockLoadTemplateWithBindings).toHaveBeenCalledWith({ techId: 'TECH-42' });
    expect(response.status).toBe(200);
    const serializedResponse = JSON.parse(JSON.stringify(baseHydrationResponse));
    expect(payload).toEqual(serializedResponse);
  });

  it('returns 404 when no active template is available', async () => {
    mockLoadTemplateWithBindings.mockRejectedValue(new Error('No active form template found'));

    const response = await GET(createRequest());
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      error: 'No active form template found',
      details: 'No active form template found',
    });
  });

  it('returns 500 for unexpected errors', async () => {
    mockLoadTemplateWithBindings.mockRejectedValue(new Error('database offline'));

    const response = await GET(createRequest());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      error: 'Failed to load form template',
      details: 'database offline',
    });
  });
});
