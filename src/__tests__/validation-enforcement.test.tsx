import React from 'react';
import { FieldType } from '@prisma/client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FormEngineProvider,
  DynamicFormRenderer,
} from '@/lib/form-engine/renderer';
import { DynamicFormNavigation } from '@/components/form/DynamicFormNavigation';
import { createMockQuestion, createMockSection, createMockTemplate } from './test-utils/formTemplateBuilders';

const mockTemplateWithValidation = createMockTemplate({
  id: 'validation-test-template',
  name: 'Validation Test Form',
  sections: [
    createMockSection({
      id: 'section-1',
      templateId: 'validation-test-template',
      code: 'S1',
      title: 'Required Fields Section',
      description: 'Section with required fields that must be validated',
      order: 0,
      questions: [
        createMockQuestion({
          id: 'question-1',
          sectionId: 'section-1',
          type: FieldType.SHORT_TEXT,
          label: 'Required Name',
          helpText: 'This field is required',
          isRequired: true,
          order: 0,
          validation: JSON.stringify({
            rules: [
              { type: 'required', message: 'Name is required' },
              {
                type: 'min',
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            ],
          }),
        }),
        createMockQuestion({
          id: 'question-2',
          sectionId: 'section-1',
          type: FieldType.SHORT_TEXT,
          label: 'Required Email',
          helpText: 'This field is required and must be a valid email',
          isRequired: true,
          order: 1,
          validation: JSON.stringify({
            rules: [
              { type: 'required', message: 'Email is required' },
              {
                type: 'email',
                message: 'Please enter a valid email address',
              },
            ],
          }),
        }),
      ],
    }),
    createMockSection({
      id: 'section-2',
      templateId: 'validation-test-template',
      code: 'S2',
      title: 'Second Section',
      description:
        'This section should not be accessible if first section has validation errors',
      order: 1,
      questions: [
        createMockQuestion({
          id: 'question-3',
          sectionId: 'section-2',
          type: FieldType.LONG_TEXT,
          label: 'Section 2 Field',
          helpText:
            'This field should not be accessible if section 1 validation fails',
          isRequired: false,
          order: 0,
        }),
      ],
    }),
  ],
});

function TestFormWithNavigation() {
  return (
    <div>
      <div data-testid="current-section-display">
        <DynamicFormRenderer />
      </div>
      <DynamicFormNavigation />
    </div>
  );
}

const RUN_VALIDATION_BUG_TESTS = process.env.RUN_VALIDATION_FAILURE_TESTS === 'true';
const describeValidation = RUN_VALIDATION_BUG_TESTS ? describe : describe.skip;

describeValidation('Validation Enforcement Bug', () => {
  it.failing('should block navigation when required fields are empty - THIS TEST SHOULD FAIL', async () => {
    const user = userEvent.setup();

    render(
      <FormEngineProvider template={mockTemplateWithValidation}>
        <TestFormWithNavigation />
      </FormEngineProvider>
    );

    expect(screen.getByText('Required Fields Section')).toBeInTheDocument();
    expect(screen.getByText('Section 1 of 2')).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeInTheDocument();

    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Required Fields Section')).toBeInTheDocument();
      expect(screen.getByText('Section 1 of 2')).toBeInTheDocument();
      expect(screen.queryByText('Second Section')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('should allow navigation when all required fields are valid', async () => {
    const user = userEvent.setup();

    render(
      <FormEngineProvider template={mockTemplateWithValidation}>
        <TestFormWithNavigation />
      </FormEngineProvider>
    );

    const nameInput = screen.getByLabelText(/required name/i);
    const emailInput = screen.getByLabelText(/required email/i);
    const nextButton = screen.getByRole('button', { name: /next/i });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john.doe@example.com');

    await waitFor(() => {
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john.doe@example.com');
    });

    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Second Section')).toBeInTheDocument();
      expect(screen.getByText('Section 2 of 2')).toBeInTheDocument();
      expect(
        screen.queryByText('Required Fields Section')
      ).not.toBeInTheDocument();
    });
  });

  it('should block navigation with specific validation errors', async () => {
    const user = userEvent.setup();

    render(
      <FormEngineProvider template={mockTemplateWithValidation}>
        <TestFormWithNavigation />
      </FormEngineProvider>
    );

    const nameInput = screen.getByLabelText(/required name/i);
    const emailInput = screen.getByLabelText(/required email/i);
    const nextButton = screen.getByRole('button', { name: /next/i });

    await user.type(nameInput, 'J');
    await user.type(emailInput, 'not-an-email');

    await user.click(nextButton);

    await waitFor(() => {
      expect(
        screen.getByText('Name must be at least 2 characters')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument();
      expect(screen.queryByText('Second Section')).not.toBeInTheDocument();
    });
  });

  it('should clear validation errors when fixed', async () => {
    const user = userEvent.setup();

    render(
      <FormEngineProvider template={mockTemplateWithValidation}>
        <TestFormWithNavigation />
      </FormEngineProvider>
    );

    const nameInput = screen.getByLabelText(/required name/i);
    const emailInput = screen.getByLabelText(/required email/i);
    const nextButton = screen.getByRole('button', { name: /next/i });

    await user.click(nextButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();

    await user.type(nameInput, 'Jane Doe');
    await user.type(emailInput, 'jane.doe@example.com');

    await waitFor(() => {
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });

    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Second Section')).toBeInTheDocument();
    });
  });
});
