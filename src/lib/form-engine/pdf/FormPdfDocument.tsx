import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import {
  PrintableFormData,
  PrintableImpactValueMatrix,
  PrintableQuestionAnswer,
} from './types';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#0ea5e9',
    borderBottomStyle: 'solid',
    marginBottom: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
  },
  metadataRow: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metadataItem: {
    width: '50%',
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 10,
    color: '#0f172a',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    backgroundColor: '#e2e8f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
  },
  sectionDescription: {
    fontSize: 10,
    color: '#475569',
    marginTop: 4,
  },
  question: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    paddingVertical: 10,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  questionMeta: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
  },
  answerLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  answer: {
    fontSize: 10,
    color: '#1f2937',
    whiteSpace: 'pre-wrap',
  },
  repeatGroupRow: {
    paddingTop: 4,
    marginTop: 4,
  },
  repeatGroupIndex: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1d4ed8',
    marginBottom: 2,
  },
  repeatGroupValue: {
    fontSize: 9,
    color: '#1f2937',
  },
  scoresContainer: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  scoresTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: 6,
  },
  scoreRow: {
    fontSize: 10,
    color: '#1f2937',
  },
  scoringMatrixCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 18,
    overflow: 'hidden',
  },
  scoringMatrixHeader: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scoringMatrixHeaderText: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  scoringMatrixTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  scoringMatrixRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    alignItems: 'center',
  },
  scoringMatrixCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 10,
    color: '#1f2937',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoringMatrixHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: 600,
    fontSize: 10,
    color: '#475569',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  scoringMatrixLabelCell: {
    flex: 2.6,
  },
  scoringMatrixScoreCell: {
    flex: 0.9,
    justifyContent: 'flex-end',
  },
  scoringMatrixWeightCell: {
    flex: 0.9,
    justifyContent: 'center',
  },
  scoringMatrixTotalCell: {
    flex: 0.9,
    justifyContent: 'flex-end',
  },
  scoringMatrixSummaryCell: {
    fontWeight: 700,
    fontSize: 10,
    color: '#0f172a',
  },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#6b7280',
    marginRight: 6,
  },
  iconImpact: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginRight: 8,
  },
  iconValue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 8,
  },
  matrixSection: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  matrixTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
    color: '#0f172a',
  },
  matrixChart: {
    borderWidth: 2,
    borderColor: '#111827',
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden',
    width: 260,
    height: 160,
    alignSelf: 'center',
    position: 'relative',
  },
  matrixRow: {
    flexDirection: 'row',
    flex: 1,
  },
  matrixCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#111827',
    borderRightStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    borderBottomStyle: 'solid',
  },
  matrixCellText: {
    fontSize: 9,
    color: '#1f2937',
  },
  matrixDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  matrixAxes: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  matrixAxisLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  matrixSummaryRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixSummaryItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  matrixSummaryValueImpact: {
    fontSize: 18,
    fontWeight: 700,
    color: '#2563eb',
  },
  matrixSummaryValueValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#16a34a',
  },
  matrixSummaryValueLabel: {
    fontSize: 10,
    color: '#475569',
    marginTop: 4,
  },
  recommendationPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  recommendationText: {
    fontSize: 11,
    fontWeight: 600,
    color: '#92400e',
  },
  notesBlock: {
    marginTop: 6,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 2,
  },
  notesValue: {
    fontSize: 9,
    color: '#1f2937',
  },
});

interface FormPdfDocumentProps {
  data: PrintableFormData;
}

function formatIsoDate(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'MMM d, yyyy • h:mm a');
}

function renderQuestion(question: PrintableQuestionAnswer, questionNumber: number) {
  return (
    <View key={question.questionKey} style={styles.question} wrap>
      <Text style={styles.questionNumber}>
        {questionNumber}. {question.label}
      </Text>
      <Text style={styles.answerLabel}>Response</Text>
      {question.repeatGroupRows ? (
        question.repeatGroupRows.map((row) => (
          <View key={`${question.questionKey}-${row.index}`} style={styles.repeatGroupRow} wrap>
            <Text style={styles.repeatGroupIndex}>Row {row.index}</Text>
            {row.values.map((entry, entryIndex) => (
              <Text key={`${question.questionKey}-${row.index}-${entry.field}-${entryIndex}`} style={styles.repeatGroupValue}>
                {entry.field}: {entry.value || '—'}
              </Text>
            ))}
          </View>
        ))
      ) : (
        <Text style={styles.answer}>{question.answerText || '—'}</Text>
      )}
    </View>
  );
}

function renderScoringMatrix(matrix?: PrintableFormData['scoringMatrix'], breakBefore = false) {
  if (!matrix) return null;

  return (
    <View style={styles.scoringMatrixCard} wrap break={breakBefore || undefined}>
      <View
        style={{
          padding: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          borderBottomStyle: 'solid',
        }}
      >
        <Text style={styles.sectionTitle}>Scoring Matrix</Text>
      </View>
      <View style={styles.scoringMatrixTable} wrap>
        <View style={[styles.scoringMatrixRow, { backgroundColor: '#f8fafc' }]}> 
          <View style={[styles.scoringMatrixHeaderCell, styles.scoringMatrixLabelCell]}>
            <Text>Criteria</Text>
          </View>
          <View style={[styles.scoringMatrixHeaderCell, styles.scoringMatrixScoreCell]}>
            <Text>Score</Text>
          </View>
          <View style={[styles.scoringMatrixHeaderCell, styles.scoringMatrixWeightCell]}>
            <Text>Weight</Text>
          </View>
          <View style={[styles.scoringMatrixHeaderCell, styles.scoringMatrixTotalCell]}>
            <Text>Total</Text>
          </View>
        </View>

        {matrix.sections.map((section, index) => (
          <View key={section.key} wrap>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: section.accentColor,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#cbd5f5',
                borderBottomStyle: 'solid',
              }}
            >
              <View style={[styles.scoringMatrixLabelCell, { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={section.key === 'IMPACT' ? styles.iconImpact : styles.iconValue} />
                <Text style={[styles.scoringMatrixHeaderText, { color: section.headerTextColor }]}>{section.title}</Text>
              </View>
              <View style={styles.scoringMatrixScoreCell} />
              <View style={styles.scoringMatrixWeightCell} />
              <View style={styles.scoringMatrixTotalCell} />
            </View>

            {section.rows.map((row, rowIndex) => (
              <View
                key={`${section.key}-${rowIndex}-${row.label}`}
                style={[styles.scoringMatrixRow, { backgroundColor: section.rowBackground }]}
              >
                <View style={[styles.scoringMatrixCell, styles.scoringMatrixLabelCell]}>
                  <Text style={{ fontWeight: 500 }}>{row.label}</Text>
                </View>
                <View style={[styles.scoringMatrixCell, styles.scoringMatrixScoreCell]}>
                  <Text>{row.score ?? '—'}</Text>
                </View>
                <View style={[styles.scoringMatrixCell, styles.scoringMatrixWeightCell]}>
                  <Text>{row.weight ?? '—'}</Text>
                </View>
                <View style={[styles.scoringMatrixCell, styles.scoringMatrixTotalCell]}>
                  <Text>{row.total ?? ''}</Text>
                </View>
              </View>
            ))}

            {index === 1 && matrix.marketSubCriteria.length > 0 ? (
              matrix.marketSubCriteria.map((subRow, subIndex) => (
                <View
                  key={`market-${subIndex}-${subRow.label}`}
                  style={[styles.scoringMatrixRow, { backgroundColor: '#f8fafc' }]}
                >
                  <View style={[styles.scoringMatrixCell, styles.scoringMatrixLabelCell]}>
                    <View style={styles.bulletDot} />
                    <Text style={{ color: '#475569' }}>{subRow.label}</Text>
                  </View>
                  <View style={[styles.scoringMatrixCell, styles.scoringMatrixScoreCell]}>
                    <Text style={{ color: '#475569' }}>{subRow.score ?? '—'}</Text>
                  </View>
                  <View style={[styles.scoringMatrixCell, styles.scoringMatrixWeightCell]}>
                    <Text style={{ color: '#94a3b8' }}>—</Text>
                  </View>
                  <View style={[styles.scoringMatrixCell, styles.scoringMatrixTotalCell]}>
                    <Text style={{ color: '#94a3b8' }}>—</Text>
                  </View>
                </View>
              ))
            ) : null}

            <View
              style={[
                styles.scoringMatrixRow,
                {
                  backgroundColor: section.key === 'IMPACT' ? '#bfdbfe' : '#bbf7d0',
                },
              ]}
            >
              <View style={[styles.scoringMatrixCell, styles.scoringMatrixLabelCell]}>
                <Text style={styles.scoringMatrixSummaryCell}>{section.summaryLabel}</Text>
              </View>
              <View style={[styles.scoringMatrixCell, styles.scoringMatrixScoreCell]}>
                <Text style={styles.scoringMatrixSummaryCell}>{section.summaryValue}</Text>
              </View>
              <View style={[styles.scoringMatrixCell, styles.scoringMatrixWeightCell]}>
                <Text style={styles.scoringMatrixSummaryCell}>—</Text>
              </View>
              <View style={[styles.scoringMatrixCell, styles.scoringMatrixTotalCell]}>
                <Text style={styles.scoringMatrixSummaryCell}>—</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function renderImpactValueMatrix(matrix?: PrintableImpactValueMatrix) {
  if (!matrix) return null;

  const chartSize = 260;
  const chartHeight = 160;
  const dotSize = 10;

  const dotLeft = matrix.dotPosition.x * chartSize - dotSize / 2;
  const dotBottom = matrix.dotPosition.y * chartHeight - dotSize / 2;

  const recommendationStyles = getRecommendationStyles(matrix.recommendation);

  return (
    <View style={styles.matrixSection} wrap>
      <Text style={styles.matrixTitle}>Impact vs Value Matrix</Text>
      <View style={styles.matrixChart}>
        <View style={styles.matrixRow}>
          <View style={[styles.matrixCell, { backgroundColor: '#e2e8f0' }]}> 
            <Text style={styles.matrixCellText}>N/A</Text>
          </View>
          <View style={[styles.matrixCell, { backgroundColor: '#dbeafe' }]}> 
            <Text style={styles.matrixCellText}>Proceed</Text>
          </View>
        </View>
        <View style={styles.matrixRow}>
          <View style={[styles.matrixCell, { backgroundColor: '#fee2e2' }]}> 
            <Text style={styles.matrixCellText}>Close</Text>
          </View>
          <View style={[styles.matrixCell, { backgroundColor: '#fef9c3' }]}> 
            <Text style={styles.matrixCellText}>Alternative Pathway</Text>
          </View>
        </View>
        <View
          style={[
            styles.matrixDot,
            {
              left: Math.max(0, Math.min(dotLeft, chartSize - dotSize)),
              bottom: Math.max(0, Math.min(dotBottom, chartHeight - dotSize)),
            },
          ]}
        />
      </View>
      <View style={styles.matrixAxes}>
        <Text style={styles.matrixAxisLabel}>VALUE</Text>
        <Text style={styles.matrixAxisLabel}>IMPACT</Text>
      </View>
      <View style={styles.matrixSummaryRow}>
        <View style={styles.matrixSummaryItem}>
          <Text style={styles.matrixSummaryValueImpact}>{matrix.impactScore.toFixed(2)}</Text>
          <Text style={styles.matrixSummaryValueLabel}>Impact Score</Text>
        </View>
        <View style={styles.matrixSummaryItem}>
          <Text style={styles.matrixSummaryValueValue}>{matrix.valueScore.toFixed(2)}</Text>
          <Text style={styles.matrixSummaryValueLabel}>Value Score</Text>
        </View>
        <View style={[styles.recommendationPill, recommendationStyles.pill]}>
          <Text style={[styles.recommendationText, recommendationStyles.text]}>
            {matrix.recommendation}
          </Text>
        </View>
      </View>
    </View>
  );
}

function getRecommendationStyles(recommendation: string) {
  switch (recommendation) {
    case 'Proceed':
      return {
        pill: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
        text: { color: '#166534' },
      };
    case 'Consider Alternative Pathway':
      return {
        pill: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
        text: { color: '#92400e' },
      };
    case 'Close':
      return {
        pill: { backgroundColor: '#fee2e2', borderColor: '#f87171' },
        text: { color: '#991b1b' },
      };
    default:
      return {
        pill: { backgroundColor: '#e5e7eb', borderColor: '#9ca3af' },
        text: { color: '#111827' },
      };
  }
}

export function FormPdfDocument({ data }: FormPdfDocumentProps) {
  const { metadata, sections } = data;
  let questionCounter = 1;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.title}>{metadata.templateName}</Text>
          <Text style={styles.subtitle}>Version {metadata.templateVersion}</Text>
          {metadata.templateDescription ? (
            <Text style={styles.subtitle}>{metadata.templateDescription}</Text>
          ) : null}
          <View style={styles.metadataRow}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Status</Text>
              <Text style={styles.metadataValue}>{metadata.statusLabel}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Exported</Text>
              <Text style={styles.metadataValue}>{formatIsoDate(metadata.exportedAt)}</Text>
            </View>
            {metadata.techId ? (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Technology ID</Text>
                <Text style={styles.metadataValue}>{metadata.techId}</Text>
              </View>
            ) : null}
            {metadata.submissionId ? (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Submission ID</Text>
                <Text style={styles.metadataValue}>{metadata.submissionId}</Text>
              </View>
            ) : null}
            {metadata.submittedBy ? (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Submitted By</Text>
                <Text style={styles.metadataValue}>{metadata.submittedBy}</Text>
              </View>
            ) : null}
            {metadata.submittedAt ? (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Submitted At</Text>
                <Text style={styles.metadataValue}>{formatIsoDate(metadata.submittedAt)}</Text>
              </View>
            ) : null}
          </View>
          {metadata.notes ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notesValue}>{metadata.notes}</Text>
            </View>
          ) : null}
        </View>

        {sections.map((section) => (
          <View key={section.id} style={styles.section} wrap>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.description ? (
                <Text style={styles.sectionDescription}>{section.description}</Text>
              ) : null}
            </View>
            {section.questions.map((question) => renderQuestion(question, questionCounter++))}
          </View>
        ))}

        {renderScoringMatrix(data.scoringMatrix, true)}

        {renderImpactValueMatrix(data.impactValueMatrix)}
      </Page>
    </Document>
  );
}
