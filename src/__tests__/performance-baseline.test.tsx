import React from 'react';
import { FieldType } from '@prisma/client';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FormEngineProvider,
  DynamicFormRenderer,
} from '@/lib/form-engine/renderer';
import { DynamicFormNavigation } from '@/components/form/DynamicFormNavigation';
import { createMockQuestion, createMockSection, createMockTemplate } from './test-utils/formTemplateBuilders';

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number };
};

const createLargeTemplate = (
  sectionCount: number,
  questionsPerSection: number
) => {
  const sections = Array.from({ length: sectionCount }, (_, sectionIndex) =>
    createMockSection({
      id: `section-${sectionIndex}`,
      templateId: 'performance-test-template',
      code: `S${sectionIndex + 1}`,
      title: `Section ${sectionIndex + 1}`,
      description: `Performance test section with ${questionsPerSection} questions`,
      order: sectionIndex,
      questions: Array.from({ length: questionsPerSection }, (_, questionIndex) =>
        createMockQuestion({
          id: `question-${sectionIndex}-${questionIndex}`,
          sectionId: `section-${sectionIndex}`,
          type: FieldType.SHORT_TEXT,
          label: `Question ${questionIndex + 1} in Section ${sectionIndex + 1}`,
          helpText: `Help text for question ${questionIndex + 1}`,
          isRequired: questionIndex % 3 === 0,
          order: questionIndex,
          validation:
            questionIndex % 3 === 0
              ? JSON.stringify({
                  rules: [
                    {
                      type: 'required',
                      message: `Field ${questionIndex + 1} is required`,
                    },
                  ],
                })
              : null,
        })
      ),
    })
  );

  return createMockTemplate({
    id: 'performance-test-template',
    name: 'Performance Test Form',
    description: 'Large form for performance testing',
    sections,
  });
};

const measurePerformance = async (
  operation: () => Promise<void> | void,
  label: string
) => {
  const startTime = performance.now();
  const startMemory =
    (performance as PerformanceWithMemory).memory?.usedJSHeapSize || 0;

  await operation();

  const endTime = performance.now();
  const endMemory =
    (performance as PerformanceWithMemory).memory?.usedJSHeapSize || 0;
  const duration = endTime - startTime;
  const memoryDelta = endMemory - startMemory;

  console.log(`📊 Performance Baseline - ${label}:`, {
    duration: `${duration.toFixed(2)}ms`,
    memoryChange: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
    startMemory: `${(startMemory / 1024 / 1024).toFixed(2)}MB`,
    endMemory: `${(endMemory / 1024 / 1024).toFixed(2)}MB`,
  });

  return { duration, memoryDelta };
};

const simulateUserTyping = async (
  input: HTMLElement,
  text: string,
  delay: number = 50
) => {
  const user = userEvent.setup({ delay });
  await user.clear(input);
  await user.type(input, text);
};

const RUN_PERFORMANCE_TESTS = process.env.RUN_PERFORMANCE_TESTS === 'true';
const describePerformance = RUN_PERFORMANCE_TESTS ? describe : describe.skip;

describePerformance('Performance Baseline Tests', () => {
  beforeEach(() => {
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  });

  it('measures template loading performance with small form (10 questions)', async () => {
    const smallTemplate = createLargeTemplate(2, 5);

    const { duration } = await measurePerformance(async () => {
      render(
        <FormEngineProvider template={smallTemplate}>
          <DynamicFormRenderer />
        </FormEngineProvider>
      );

      await screen.findByText('Section 1');
    }, 'Small Form Load (10 questions)');

    console.log(`⚠️  Small form load took ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(1000);
  });

  it('measures template loading performance with medium form (50 questions)', async () => {
    const mediumTemplate = createLargeTemplate(5, 10);

    const { duration } = await measurePerformance(async () => {
      render(
        <FormEngineProvider template={mediumTemplate}>
          <DynamicFormRenderer />
        </FormEngineProvider>
      );

      await screen.findByText('Section 1');
    }, 'Medium Form Load (50 questions)');

    console.log(`⚠️  Medium form load took ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(2000);
  });

  it('measures template loading performance with large form (100 questions)', async () => {
    const largeTemplate = createLargeTemplate(10, 10);

    const { duration } = await measurePerformance(async () => {
      render(
        <FormEngineProvider template={largeTemplate}>
          <DynamicFormRenderer />
        </FormEngineProvider>
      );

      await screen.findByText('Section 1');
    }, 'Large Form Load (100 questions)');

    console.log(`⚠️  Large form load took ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(5000);
  });

  it('measures form field interaction performance', async () => {
    const template = createLargeTemplate(1, 10);

    render(
      <FormEngineProvider template={template}>
        <DynamicFormRenderer />
      </FormEngineProvider>
    );

    await screen.findByText('Section 1');

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);

    const firstInput = inputs[0];

    const { duration } = await measurePerformance(async () => {
      await simulateUserTyping(
        firstInput,
        'This is a test input with a reasonable amount of text to simulate real user input'
      );
    }, 'Field Input Performance');

    console.log(`⚠️  Field input took ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(500);
  });

  it('measures navigation performance between sections', async () => {
    const template = createLargeTemplate(5, 5);

    render(
      <FormEngineProvider template={template}>
        <div>
          <DynamicFormRenderer />
          <DynamicFormNavigation />
        </div>
      </FormEngineProvider>
    );

    await screen.findByText('Section 1');

    const nextButton = screen.getByRole('button', { name: /next/i });

    const { duration } = await measurePerformance(async () => {
      fireEvent.click(nextButton);
      await screen.findByText('Section 2');
    }, 'Section Navigation Performance');

    console.log(`⚠️  Section navigation took ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(300);
  });

  it('measures validation performance with many fields', async () => {
    const template = createLargeTemplate(1, 20);

    render(
      <FormEngineProvider template={template}>
        <DynamicFormRenderer />
      </FormEngineProvider>
    );

    await screen.findByText('Section 1');

    const inputs = screen.getAllByRole('textbox');

    const { duration } = await measurePerformance(async () => {
      for (let i = 0; i < Math.min(5, inputs.length); i++) {
        await simulateUserTyping(inputs[i], `Value ${i + 1}`, 10);
      }
    }, 'Batch Validation Performance');

    console.log(`⚠️  Batch validation took ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(1000);
  });

  it('measures memory usage during extended form interaction', async () => {
    const template = createLargeTemplate(3, 15);

    render(
      <FormEngineProvider template={template}>
        <div>
          <DynamicFormRenderer />
          <DynamicFormNavigation />
        </div>
      </FormEngineProvider>
    );

    await screen.findByText('Section 1');

    const nextButton = screen.getByRole('button', { name: /next/i });
    const prevButton = screen.getByRole('button', { name: /previous/i });

    const { memoryDelta } = await measurePerformance(async () => {
      for (let i = 0; i < 3; i++) {
        fireEvent.click(nextButton);
        await screen.findByText(`Section ${Math.min(5, i + 2)}`);
        fireEvent.click(prevButton);
        await screen.findByText('Section 1');
      }
    }, 'Memory Usage During Navigation');

    console.log(`⚠️  Memory delta during navigation: ${memoryDelta}`);
  });
});
