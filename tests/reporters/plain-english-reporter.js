/**
 * Plain English Test Results Reporter
 *
 * Generates a human-readable markdown report describing what tests are doing
 * and walking through the results in plain English.
 */

const fs = require('fs');
const path = require('path');

class PlainEnglishReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.outputDir = options.outputDir || 'tests/results';
    this.outputFile = options.outputFile || 'test-report.md';
  }

  onRunComplete(contexts, results) {
    const report = this.generateReport(results);
    this.writeReport(report);
    console.log(`\n📄 Plain English Test Report generated: ${path.join(this.outputDir, this.outputFile)}\n`);
  }

  generateReport(results) {
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let report = `# Test Results Report\n\n`;
    report += `**Generated:** ${dateStr}\n\n`;
    report += `---\n\n`;

    // Executive Summary
    report += this.generateExecutiveSummary(results);

    // Overall Health Assessment
    report += this.generateHealthAssessment(results);

    // Detailed Results by Category
    report += this.generateDetailedResults(results);

    // Failed Tests Section (if any)
    if (results.numFailedTests > 0) {
      report += this.generateFailedTestsSection(results);
    }

    // Skipped Tests Section (if any)
    if (results.numPendingTests > 0) {
      report += this.generateSkippedTestsSection(results);
    }

    // Recommendations
    report += this.generateRecommendations(results);

    return report;
  }

  generateExecutiveSummary(results) {
    const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;
    const passRate = ((numPassedTests / numTotalTests) * 100).toFixed(1);

    let status = '✅ PASSING';
    let statusDesc = 'All tests are passing. The codebase is in good health.';

    if (numFailedTests > 0) {
      status = '❌ FAILING';
      statusDesc = `${numFailedTests} test(s) are failing and need attention.`;
    } else if (numPendingTests > 0) {
      status = '⚠️ PASSING (with skipped tests)';
      statusDesc = `All executed tests pass, but ${numPendingTests} test(s) are skipped.`;
    }

    let summary = `## Executive Summary\n\n`;
    summary += `| Metric | Value |\n`;
    summary += `|--------|-------|\n`;
    summary += `| **Status** | ${status} |\n`;
    summary += `| **Pass Rate** | ${passRate}% |\n`;
    summary += `| **Total Tests** | ${numTotalTests} |\n`;
    summary += `| **Passed** | ${numPassedTests} |\n`;
    summary += `| **Failed** | ${numFailedTests} |\n`;
    summary += `| **Skipped** | ${numPendingTests} |\n`;
    summary += `| **Test Suites** | ${results.numPassedTestSuites}/${results.numTotalTestSuites} passing |\n\n`;
    summary += `**Summary:** ${statusDesc}\n\n`;
    summary += `---\n\n`;

    return summary;
  }

  generateHealthAssessment(results) {
    let health = `## Health Assessment\n\n`;

    // Categorize test suites by area
    const categories = this.categorizeTestSuites(results.testResults);

    health += `### Test Coverage by Area\n\n`;
    health += `| Area | Tests | Status | What It Tests |\n`;
    health += `|------|-------|--------|---------------|\n`;

    for (const [category, data] of Object.entries(categories)) {
      const statusIcon = data.failed > 0 ? '❌' : (data.skipped > 0 ? '⚠️' : '✅');
      health += `| ${category} | ${data.passed}/${data.total} | ${statusIcon} | ${data.description} |\n`;
    }

    health += `\n---\n\n`;
    return health;
  }

  categorizeTestSuites(testResults) {
    const categories = {};

    const categoryMap = {
      'scoring': { name: 'Scoring & Calculations', desc: 'Business logic for technology evaluation scores and recommendations' },
      'validation': { name: 'Form Validation', desc: 'Input validation rules, required fields, and format checking' },
      'conditional': { name: 'Conditional Logic', desc: 'Show/hide rules and field visibility based on form responses' },
      'serialize': { name: 'PDF Export', desc: 'Form data serialization for PDF report generation' },
      'pdf': { name: 'PDF Export', desc: 'Form data serialization for PDF report generation' },
      'actions': { name: 'Server Actions', desc: 'Form submission, draft saving, and data persistence' },
      'api': { name: 'API Routes', desc: 'HTTP endpoints for form templates, submissions, and exports' },
      'technology': { name: 'Technology Service', desc: 'Data binding, hydration, and technology lifecycle management' },
      'renderer': { name: 'Form Rendering', desc: 'React component rendering for dynamic forms' },
      'navigation': { name: 'Form Navigation', desc: 'Section navigation and form controls' },
      'snapshot': { name: 'Snapshots', desc: 'Point-in-time form state capture for audit trails' },
      'database': { name: 'Database', desc: 'Database seeding and data integrity' },
      'integration': { name: 'Integration Tests', desc: 'End-to-end workflows across multiple components' },
      'performance': { name: 'Performance', desc: 'Performance benchmarks and baseline metrics' },
    };

    for (const result of testResults) {
      const filePath = result.testFilePath.toLowerCase();
      let categoryKey = 'other';
      let categoryInfo = { name: 'Other Tests', desc: 'Miscellaneous test coverage' };

      for (const [key, info] of Object.entries(categoryMap)) {
        if (filePath.includes(key)) {
          categoryKey = key;
          categoryInfo = info;
          break;
        }
      }

      if (!categories[categoryInfo.name]) {
        categories[categoryInfo.name] = {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          description: categoryInfo.desc,
          tests: []
        };
      }

      const cat = categories[categoryInfo.name];
      for (const testCase of result.testResults) {
        cat.total++;
        if (testCase.status === 'passed') cat.passed++;
        else if (testCase.status === 'failed') cat.failed++;
        else if (testCase.status === 'pending') cat.skipped++;
        cat.tests.push(testCase);
      }
    }

    return categories;
  }

  generateDetailedResults(results) {
    let detailed = `## What Each Test Suite Validates\n\n`;

    // Group by test file
    const suiteDescriptions = this.generateSuiteDescriptions(results.testResults);

    for (const suite of suiteDescriptions) {
      const statusIcon = suite.failed > 0 ? '❌' : (suite.skipped > 0 ? '⚠️' : '✅');
      detailed += `### ${statusIcon} ${suite.name}\n\n`;
      detailed += `**File:** \`${suite.file}\`\n\n`;
      detailed += `**Purpose:** ${suite.purpose}\n\n`;

      if (suite.testGroups.length > 0) {
        detailed += `**What it tests:**\n\n`;
        for (const group of suite.testGroups) {
          detailed += `- **${group.name}**\n`;
          for (const test of group.tests) {
            const icon = test.status === 'passed' ? '✓' : (test.status === 'failed' ? '✗' : '○');
            detailed += `  - ${icon} ${test.plainEnglish}\n`;
          }
        }
        detailed += `\n`;
      }
    }

    detailed += `---\n\n`;
    return detailed;
  }

  generateSuiteDescriptions(testResults) {
    const suites = [];

    const purposeMap = {
      'calculations.test': 'Validates the business-critical scoring logic that determines technology recommendations (Proceed/Consider/Close)',
      'validation.test': 'Ensures form fields are properly validated with required checks, min/max constraints, and format validation',
      'conditional-logic.test': 'Verifies that form fields show/hide correctly based on user responses and conditional rules',
      'serialize.test': 'Tests the PDF export system that transforms form data into printable reports',
      'actions.test': 'Validates server-side form operations including saving drafts, submitting forms, and loading responses',
      'route.test': 'Tests HTTP API endpoints for form templates, submissions, feedback, and exports',
      'service.hydration.test': 'Verifies form template loading and pre-filling with existing technology data',
      'service.helpers.test': 'Tests utility functions for data binding, field extraction, and extended data handling',
      'renderer.test': 'Validates React component rendering for different form field types',
      'renderer.scenarios.test': 'Tests complex form rendering scenarios with conditional fields and repeatable groups',
      'navigation.test': 'Ensures form navigation controls work correctly for multi-section forms',
      'answer-status.test': 'Validates answer freshness tracking to detect stale responses vs question revisions',
      'applyBindingWrites.test': 'Tests the core data persistence logic that writes form responses to database tables',
      'capture.test': 'Verifies snapshot capture for audit trails and point-in-time form state',
      'demo-seeding.test': 'Tests database seeding for development and demo environments',
      'form-schemas.test': 'Validates Zod schemas for form submission payload structure',
      'feedback-validation.test': 'Tests user feedback form validation',
      'custom-validation.test': 'Tests custom validation rules beyond standard field types',
      'data-persistence.test': 'Validates that form data persists correctly across sessions',
      'performance-baseline.test': 'Establishes performance benchmarks for form operations',
      'validation-enforcement.test': 'Tests that validation rules are properly enforced on form submission',
      'form-submit-export.test': 'Integration test for the full draft → submit → export workflow',
      'dynamic-form-drafts.test': 'Integration test for draft persistence, loading, and optimistic locking',
    };

    for (const result of testResults) {
      const fileName = path.basename(result.testFilePath);
      const relativePath = result.testFilePath.replace(process.cwd(), '').replace(/^\//, '');

      let purpose = 'Tests functionality in this module';
      for (const [pattern, desc] of Object.entries(purposeMap)) {
        if (fileName.includes(pattern.replace('.test', ''))) {
          purpose = desc;
          break;
        }
      }

      const testGroups = this.groupTests(result.testResults);

      suites.push({
        name: this.formatSuiteName(fileName),
        file: relativePath,
        purpose,
        testGroups,
        passed: result.testResults.filter(t => t.status === 'passed').length,
        failed: result.testResults.filter(t => t.status === 'failed').length,
        skipped: result.testResults.filter(t => t.status === 'pending').length,
      });
    }

    return suites;
  }

  formatSuiteName(fileName) {
    return fileName
      .replace('.test.ts', '')
      .replace('.test.tsx', '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  groupTests(testResults) {
    const groups = {};

    for (const test of testResults) {
      const ancestors = test.ancestorTitles || [];
      const groupName = ancestors.length > 1 ? ancestors[ancestors.length - 1] : (ancestors[0] || 'General');

      if (!groups[groupName]) {
        groups[groupName] = { name: groupName, tests: [] };
      }

      groups[groupName].tests.push({
        title: test.title,
        status: test.status,
        plainEnglish: this.toPlainEnglish(test.title, ancestors),
        duration: test.duration,
      });
    }

    return Object.values(groups);
  }

  toPlainEnglish(title, ancestors) {
    // Convert test titles to plain English descriptions
    let plain = title
      // Remove technical prefixes
      .replace(/^(should|it|test)\s+/i, '')
      // Convert common patterns
      .replace(/returns?\s+(\w+)\s+for/i, 'Returns "$1" when given')
      .replace(/throws?\s+/i, 'Raises an error ')
      .replace(/handles?\s+/i, 'Properly handles ')
      .replace(/calculates?\s+/i, 'Correctly calculates ')
      .replace(/validates?\s+/i, 'Validates ')
      .replace(/filters?\s+out/i, 'Removes')
      .replace(/filters?\s+/i, 'Filters ')
      .replace(/formats?\s+/i, 'Formats ')
      .replace(/includes?\s+/i, 'Includes ')
      .replace(/builds?\s+/i, 'Constructs ')
      .replace(/clamps?\s+/i, 'Limits ')
      .replace(/derives?\s+/i, 'Determines ')
      .replace(/defaults?\s+/i, 'Uses default value ')
      .replace(/coerces?\s+/i, 'Converts ')
      // Make technical terms more readable
      .replace(/NaN/g, 'invalid numbers')
      .replace(/null\/undefined/g, 'missing values')
      .replace(/undefined/g, 'missing')
      .replace(/null/g, 'empty')
      .replace(/INFO_BOX/g, 'info box fields')
      .replace(/MULTI_SELECT/g, 'multi-select')
      .replace(/SINGLE_SELECT/g, 'single-select')
      .replace(/em dash/g, '"—" placeholder')
      // Clean up
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize first letter
    return plain.charAt(0).toUpperCase() + plain.slice(1);
  }

  generateFailedTestsSection(results) {
    let section = `## ❌ Failed Tests - Action Required\n\n`;
    section += `The following tests are failing and need immediate attention:\n\n`;

    for (const result of results.testResults) {
      const failedTests = result.testResults.filter(t => t.status === 'failed');
      if (failedTests.length === 0) continue;

      const fileName = path.basename(result.testFilePath);
      section += `### ${this.formatSuiteName(fileName)}\n\n`;

      for (const test of failedTests) {
        const ancestors = test.ancestorTitles.join(' > ');
        section += `**Test:** ${ancestors} > ${test.title}\n\n`;
        section += `**What it checks:** ${this.toPlainEnglish(test.title, test.ancestorTitles)}\n\n`;

        if (test.failureMessages && test.failureMessages.length > 0) {
          section += `**Error:**\n\`\`\`\n${this.cleanErrorMessage(test.failureMessages[0])}\n\`\`\`\n\n`;
        }
      }
    }

    section += `---\n\n`;
    return section;
  }

  cleanErrorMessage(message) {
    // Clean up error message for readability
    return message
      .split('\n')
      .slice(0, 10)  // Limit to first 10 lines
      .join('\n')
      .replace(/\x1b\[[0-9;]*m/g, '')  // Remove ANSI colors
      .trim();
  }

  generateSkippedTestsSection(results) {
    let section = `## ⚠️ Skipped Tests\n\n`;
    section += `The following tests are currently skipped:\n\n`;

    for (const result of results.testResults) {
      const skippedTests = result.testResults.filter(t => t.status === 'pending');
      if (skippedTests.length === 0) continue;

      const fileName = path.basename(result.testFilePath);
      section += `**${this.formatSuiteName(fileName)}:**\n`;

      for (const test of skippedTests) {
        section += `- ${test.title}\n`;
      }
      section += `\n`;
    }

    section += `---\n\n`;
    return section;
  }

  generateRecommendations(results) {
    let rec = `## Recommendations\n\n`;

    if (results.numFailedTests > 0) {
      rec += `### Immediate Actions\n\n`;
      rec += `1. **Fix failing tests** - ${results.numFailedTests} test(s) are failing and blocking deployment\n`;
      rec += `2. Review error messages above for specific issues\n`;
      rec += `3. Run individual failing tests with \`npm test -- --testPathPattern="filename"\` for detailed output\n\n`;
    }

    if (results.numPendingTests > 0) {
      rec += `### Deferred Items\n\n`;
      rec += `- ${results.numPendingTests} test(s) are skipped - review if they should be re-enabled\n\n`;
    }

    if (results.numFailedTests === 0 && results.numPendingTests === 0) {
      rec += `✅ **All tests are passing!** The codebase is in good health.\n\n`;
      rec += `### Suggested Next Steps\n\n`;
      rec += `- Review coverage report for untested areas\n`;
      rec += `- Consider adding edge case tests for complex business logic\n`;
      rec += `- Run integration tests if available: \`npm run test:integration\`\n\n`;
    }

    rec += `---\n\n`;
    rec += `*Report generated by Plain English Test Reporter*\n`;

    return rec;
  }

  writeReport(report) {
    const outputPath = path.join(process.cwd(), this.outputDir);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const filePath = path.join(outputPath, this.outputFile);
    fs.writeFileSync(filePath, report, 'utf8');
  }
}

module.exports = PlainEnglishReporter;
