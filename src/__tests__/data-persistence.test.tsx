import React from 'react';
import { FieldType } from '@prisma/client';
import { render, screen } from '@testing-library/react';
import {
  FormEngineProvider,
  useFormEngine,
} from '@/lib/form-engine/renderer';
import { FormResponse, RepeatableGroupData } from '@/lib/form-engine/types';
import {
  createMockQuestion,
  createMockSection,
  createMockTemplate,
} from './test-utils/formTemplateBuilders';

const mockTemplate = createMockTemplate({
  id: 'test-template-1',
  name: 'Test Form',
  description: 'A test form for data persistence',
  sections: [
    createMockSection({
      id: 'section-1',
      templateId: 'test-template-1',
      code: 'S1',
      title: 'Basic Info',
      description: 'Basic information section',
      order: 0,
      questions: [
        createMockQuestion({
          id: 'question-1',
          sectionId: 'section-1',
          type: FieldType.SHORT_TEXT,
          label: 'Name',
          helpText: 'Enter your name',
          isRequired: true,
          order: 0,
        }),
        createMockQuestion({
          id: 'question-2',
          sectionId: 'section-1',
          type: FieldType.SHORT_TEXT,
          label: 'Email',
          helpText: 'Enter your email',
          isRequired: true,
          order: 1,
        }),
      ],
    }),
  ],
});

// Test component that displays current form state
function FormStateDisplay() {
  const { responses, repeatGroups } = useFormEngine();

  return (
    <div>
      <div data-testid="responses">{JSON.stringify(responses)}</div>
      <div data-testid="repeat-groups">{JSON.stringify(repeatGroups)}</div>
    </div>
  );
}

describe('Data Persistence Bug', () => {
  it('should preserve form data when template loads - THIS TEST SHOULD FAIL', () => {
    const initialData = {
      responses: {
        basic_name: 'John Doe',
        basic_email: 'john.doe@example.com',
        mission_score: 3,
        market_overview:
          'This is important market data that should not be lost',
      } as FormResponse,
      repeatGroups: {
        competitors: [
          { company: 'Competitor A', product: 'Product 1', revenue: '1M' },
          { company: 'Competitor B', product: 'Product 2', revenue: '2M' },
        ],
      } as RepeatableGroupData,
    };

    render(
      <FormEngineProvider template={mockTemplate} initialData={initialData}>
        <FormStateDisplay />
      </FormEngineProvider>
    );

    const responsesDisplay = screen.getByTestId('responses');
    const repeatGroupsDisplay = screen.getByTestId('repeat-groups');

    const displayedResponses = JSON.parse(responsesDisplay.textContent || '{}');
    const displayedRepeatGroups = JSON.parse(
      repeatGroupsDisplay.textContent || '{}'
    );

    expect(displayedResponses.basic_name).toBe('John Doe');
    expect(displayedResponses.basic_email).toBe('john.doe@example.com');
    expect(displayedResponses.mission_score).toBe(3);
    expect(displayedResponses.market_overview).toBe(
      'This is important market data that should not be lost'
    );

    expect(displayedRepeatGroups.competitors).toHaveLength(2);
    expect(displayedRepeatGroups.competitors[0]).toEqual({
      company: 'Competitor A',
      product: 'Product 1',
      revenue: '1M',
    });
  });

  it('should preserve existing section navigation when template loads', () => {
    const initialData = {
      responses: {
        basic_name: 'Jane Smith',
        section2_field: 'Some data in section 2',
      } as FormResponse,
      repeatGroups: {} as RepeatableGroupData,
    };

    const multiSectionTemplate = createMockTemplate({
      id: 'test-template-1',
      name: 'Test Form',
      sections: [
        createMockSection({
          id: 'section-1',
          templateId: 'test-template-1',
          code: 'S1',
          title: 'Basic Info',
          order: 0,
          questions: mockTemplate.sections[0].questions,
        }),
        createMockSection({
          id: 'section-2',
          templateId: 'test-template-1',
          code: 'S2',
          title: 'Advanced Info',
          description: 'Advanced information section',
          order: 1,
          questions: [
            createMockQuestion({
              id: 'question-3',
              sectionId: 'section-2',
              type: FieldType.LONG_TEXT,
              label: 'Advanced Field',
              helpText: 'Enter advanced info',
              isRequired: false,
              order: 0,
            }),
          ],
        }),
      ],
    });

    render(
      <FormEngineProvider template={multiSectionTemplate} initialData={initialData}>
        <FormStateDisplay />
      </FormEngineProvider>
    );

    const responsesDisplay = screen.getByTestId('responses');
    const displayedResponses = JSON.parse(responsesDisplay.textContent || '{}');

    expect(displayedResponses.section2_field).toBe(
      'Some data in section 2'
    );
  });

  it('retains responses when subsequent initial data is undefined', () => {
    const initialData = {
      responses: {
        basic_name: 'Prefilled Name',
      } as FormResponse,
      repeatGroups: {} as RepeatableGroupData,
    };

    const { rerender } = render(
      <FormEngineProvider template={mockTemplate} initialData={initialData}>
        <FormStateDisplay />
      </FormEngineProvider>
    );

    const firstRender = JSON.parse(
      screen.getByTestId('responses').textContent || '{}'
    );
    expect(firstRender.basic_name).toBe('Prefilled Name');

    rerender(
      <FormEngineProvider template={mockTemplate}>
        <FormStateDisplay />
      </FormEngineProvider>
    );

    const secondRender = JSON.parse(
      screen.getByTestId('responses').textContent || '{}'
    );
    expect(secondRender.basic_name).toBe('Prefilled Name');
  });
});
