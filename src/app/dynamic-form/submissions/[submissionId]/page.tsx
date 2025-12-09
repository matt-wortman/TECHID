import { getSubmissionDetail } from '../../actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { FieldType } from '@prisma/client';
import { parseRepeatableGroupConfig } from '@/lib/form-engine/json-utils';
import { Home } from 'lucide-react';
import {
  extractScoringInputs,
  calculateAllScores,
  scoringCriteria,
} from '@/lib/scoring/calculations';

interface SubmissionDetailPageProps {
  params: {
    submissionId: string;
  };
}

function formatDate(value: Date | null | undefined) {
  if (!value) return '—';
  try {
    return format(value, 'MMM d, yyyy h:mm a');
  } catch {
    return value.toISOString();
  }
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function mapOptionLabel(question: { options: { value: string; label: string }[] }, stored: string) {
  return question.options.find((option) => option.value === stored)?.label ?? stored;
}

function renderSimpleValue(
  question: { type: FieldType; options: { value: string; label: string }[] },
  rawValue: unknown
) {
  if (rawValue === null || rawValue === undefined) {
    return '—';
  }

  switch (question.type) {
    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX_GROUP: {
      const values = Array.isArray(rawValue) ? rawValue : [];
      if (!values.length) return '—';
      return values
        .map((value) =>
          typeof value === 'string' ? mapOptionLabel(question, value) : formatPrimitive(value)
        )
        .join(', ');
    }
    case FieldType.SINGLE_SELECT: {
      if (typeof rawValue === 'string') {
        return mapOptionLabel(question, rawValue);
      }
      return formatPrimitive(rawValue);
    }
    default:
      return formatPrimitive(rawValue);
  }
}

function buildRepeatableColumns(
  question: { repeatableConfig: unknown },
  rows: Record<string, unknown>[]
): { key: string; label: string }[] {
  const config = parseRepeatableGroupConfig(question.repeatableConfig);
  if (config?.columns && config.columns.length > 0) {
    return config.columns.map((column) => ({ key: column.key, label: column.label }));
  }
  const firstRow = rows.find((row) => row && Object.keys(row).length > 0);
  if (!firstRow) return [];
  return Object.keys(firstRow)
    .filter((key) => !key.startsWith('__'))
    .map((key) => ({ key, label: key.replace(/_/g, ' ') }));
}

function renderRepeatableTable(
  question: { repeatableConfig: unknown },
  rows: Record<string, unknown>[]
) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No entries provided.</p>;
  }

  const cleanedRows = rows.filter((row) => row && Object.keys(row).length > 0);
  if (!cleanedRows.length) {
    return <p className="text-sm text-muted-foreground">No entries provided.</p>;
  }

  const columns = buildRepeatableColumns(question, cleanedRows);

  if (!columns.length) {
    return (
      <pre className="text-sm bg-muted rounded-md p-3 overflow-x-auto">{JSON.stringify(rows, null, 2)}</pre>
    );
  }

  return (
    <Table
      wrapperClassName="neumorphic-table-container"
      className="neumorphic-table"
    >
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {cleanedRows.map((row, index) => (
          <TableRow key={index}>
            {columns.map((column) => {
              const value = row[column.key];
              return <TableCell key={column.key}>{formatPrimitive(value)}</TableCell>;
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const SCORING_WEIGHT_LABEL = '50%';

function formatScore(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

function getMatrixPosition(impactScore: number, valueScore: number) {
  const clamp = (score: number) => Math.max(0, Math.min(3, score));
  return {
    x: clamp(impactScore),
    y: clamp(valueScore),
  };
}

function getRecommendationColorClasses(recommendation: string) {
  switch (recommendation) {
    case 'Proceed':
      return 'bg-green-100 text-green-800';
    case 'Consider Alternative Pathway':
      return 'bg-yellow-100 text-yellow-800';
    case 'Close':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function clampScore(score: number) {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(3, score));
}

function describeScore(criteria: Record<number, string>, score: number) {
  const key = Math.round(clampScore(score)) as 0 | 1 | 2 | 3;
  return criteria[key] ?? '';
}

export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const result = await getSubmissionDetail(params.submissionId);

  if (!result.success || !result.data) {
    notFound();
  }

  const {
    template,
    responses,
    repeatGroups,
    calculatedScores,
    status,
    submittedAt,
    submittedBy,
    createdAt,
    updatedAt,
  } = result.data!;

  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
  const scoringInputs = extractScoringInputs(responses);
  const computedScores = calculateAllScores(scoringInputs);
  const displayScores = {
    impactScore: calculatedScores?.impactScore ?? computedScores.impactScore,
    valueScore: calculatedScores?.valueScore ?? computedScores.valueScore,
    marketScore: calculatedScores?.marketScore ?? computedScores.marketScore,
    overallScore: calculatedScores?.overallScore ?? computedScores.overallScore,
    recommendation: computedScores.recommendation,
    recommendationText: computedScores.recommendationText,
  };
  const matrixPosition = getMatrixPosition(displayScores.impactScore, displayScores.valueScore);

  const impactRows = [
    {
      criteria: 'Mission Alignment',
      score: formatScore(scoringInputs.missionAlignmentScore),
      total: formatScore(scoringInputs.missionAlignmentScore * 0.5),
      description: describeScore(scoringCriteria.missionAlignment, scoringInputs.missionAlignmentScore),
    },
    {
      criteria: 'Unmet Need',
      score: formatScore(scoringInputs.unmetNeedScore),
      total: formatScore(scoringInputs.unmetNeedScore * 0.5),
      description: describeScore(scoringCriteria.unmetNeed, scoringInputs.unmetNeedScore),
    },
  ];

  const valueRows = [
    {
      criteria: 'IP Strength and Protectability',
      score: formatScore(scoringInputs.ipStrengthScore),
      total: formatScore(scoringInputs.ipStrengthScore * 0.5),
      description: describeScore(scoringCriteria.ipStrength, scoringInputs.ipStrengthScore),
    },
    {
      criteria: 'Market (Average of sub-criteria)',
      score: formatScore(displayScores.marketScore),
      total: formatScore(displayScores.marketScore * 0.5),
      description: 'Average of Market Size, Patient Population, and Competitors',
    },
  ];

  const marketSubCriteria = [
    {
      label: 'Market Size – Revenue (TAM)',
      score: formatScore(scoringInputs.marketSizeScore),
      description: describeScore(scoringCriteria.marketSize, scoringInputs.marketSizeScore),
    },
    {
      label: 'Patient Population or Procedural Volume',
      score: formatScore(scoringInputs.patientPopulationScore),
      description: describeScore(
        scoringCriteria.patientPopulation,
        scoringInputs.patientPopulationScore
      ),
    },
    {
      label: '# of Direct/Indirect Competitors',
      score: formatScore(scoringInputs.competitorsScore),
      description: describeScore(scoringCriteria.competitors, scoringInputs.competitorsScore),
    },
  ];

  const navButtonClass =
    'px-3 py-1.5 text-sm font-medium flex items-center bg-[#e0e5ec] border-0 text-[#353535] rounded-xl transition-all [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)] hover:[box-shadow:3px_3px_6px_0px_#a3b1c6,_-3px_-3px_6px_0px_rgba(255,255,255,0.6)] active:[box-shadow:inset_3px_3px_6px_0px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.6)]';

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <nav className="bg-[#e0e5ec] border-0 shadow-none">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link href="/" className={navButtonClass}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
              <Link href="/dynamic-form/submissions" className={navButtonClass}>
                ← Back to submissions
              </Link>
            </div>
            <Badge variant="outline" className="uppercase tracking-wide">
              {status}
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card className="bg-[#e0e5ec] shadow-none border-0">
          <CardContent className="space-y-2">
            <h1 className="text-2xl font-bold text-[#353535]">{template.name}</h1>
            {template.description && (
              <p className="text-[#6b7280]">{template.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-[#6b7280]">
              <span>Version {template.version}</span>
              <span>Created {formatDate(createdAt)}</span>
              <span>Updated {formatDate(updatedAt)}</span>
              <span>Submitted {formatDate(submittedAt)}</span>
              {submittedBy && <span>Submitted by {submittedBy}</span>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)] rounded-3xl">
          <CardHeader>
            <CardTitle className="text-base text-[#353535]">Impact &amp; Value Scoring Matrix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Table
              wrapperClassName="neumorphic-table-container"
              className="neumorphic-table"
            >
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead className="text-right">Score (0-3)</TableHead>
                    <TableHead className="text-center">Weight</TableHead>
                    <TableHead className="text-right">Weighted Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-100">
                    <TableCell colSpan={4} className="font-semibold text-blue-800 text-sm">
                      Impact
                    </TableCell>
                  </TableRow>
                  {impactRows.map((row) => (
                    <TableRow key={row.criteria} className="bg-blue-50">
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-medium text-[#1f2937]">{row.criteria}</span>
                          {row.description && (
                            <p className="text-xs text-[#6b7280]">{row.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{row.score}</TableCell>
                      <TableCell className="text-center">{SCORING_WEIGHT_LABEL}</TableCell>
                      <TableCell className="text-right font-semibold font-mono">{row.total}</TableCell>
                    </TableRow>
                  ))}

                  <TableRow className="bg-green-100">
                    <TableCell colSpan={4} className="font-semibold text-green-800 text-sm">
                      Value
                    </TableCell>
                  </TableRow>
                  {valueRows.map((row) => (
                    <TableRow key={row.criteria} className="bg-green-50">
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-medium text-[#1f2937]">{row.criteria}</span>
                          {row.description && (
                            <p className="text-xs text-[#6b7280]">{row.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{row.score}</TableCell>
                      <TableCell className="text-center">{SCORING_WEIGHT_LABEL}</TableCell>
                      <TableCell className="text-right font-semibold font-mono">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl border-0 bg-[#f8fafc] p-5 [box-shadow:5px_5px_12px_rgba(163,177,198,0.25),-5px_-5px_12px_rgba(255,255,255,0.7)]">
                  <h3 className="text-sm font-semibold text-[#1f2937]">Market Sub-criteria</h3>
                  <div className="mt-3 space-y-3">
                    {marketSubCriteria.map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-[#1f2937]">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-[#6b7280]">{item.description}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold font-mono text-[#1f2937]">
                          {item.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border-0 bg-[#f8fafc] p-5 [box-shadow:5px_5px_12px_rgba(163,177,198,0.25),-5px_-5px_12px_rgba(255,255,255,0.7)]">
                  <h3 className="text-sm font-semibold text-[#1f2937]">Score Summary</h3>
                  <dl className="mt-3 grid gap-3 text-sm text-[#1f2937]">
                    <div className="flex justify-between">
                      <dt>Impact Score</dt>
                      <dd className="font-semibold">{formatScore(displayScores.impactScore)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Value Score</dt>
                      <dd className="font-semibold">{formatScore(displayScores.valueScore)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Market Score</dt>
                      <dd className="font-semibold">{formatScore(displayScores.marketScore)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Overall Score</dt>
                      <dd className="font-semibold">{formatScore(displayScores.overallScore)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-2xl border-0 bg-[#f8fafc] p-5 space-y-4 [box-shadow:5px_5px_12px_rgba(163,177,198,0.25),-5px_-5px_12px_rgba(255,255,255,0.7)]">
                <h3 className="text-sm font-semibold text-[#1f2937]">Impact vs Value Matrix</h3>
                <div className="relative rounded-3xl border-0 bg-white p-6 [box-shadow:6px_6px_14px_rgba(163,177,198,0.3),-6px_-6px_14px_rgba(255,255,255,0.75)]">
                  <div className="relative w-full h-64 border-2 border-gray-300">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 border border-gray-200">
                      <div className="flex items-center justify-center bg-gray-100 text-xs font-medium text-gray-600">
                        N/A
                      </div>
                      <div className="flex items-center justify-center bg-blue-100 text-xs font-medium text-blue-800">
                        Proceed
                      </div>
                      <div className="flex items-center justify-center bg-red-100 text-xs font-medium text-red-800">
                        Close
                      </div>
                      <div className="flex items-center justify-center bg-yellow-100 text-xs font-medium text-yellow-800">
                        Alternative Pathway
                      </div>
                    </div>
                    <div
                      className="absolute w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        left: `${(matrixPosition.x / 3) * 100}%`,
                        bottom: `${(matrixPosition.y / 3) * 100}%`,
                      }}
                    />
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium">
                      IMPACT
                    </div>
                    <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-medium">
                      VALUE
                    </div>
                    <div className="absolute -bottom-6 left-0 text-xs text-gray-500">0</div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                      1.5
                    </div>
                    <div className="absolute -bottom-6 right-0 text-xs text-gray-500">3</div>
                    <div className="absolute -left-6 bottom-0 text-xs text-gray-500">0</div>
                    <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      1.5
                    </div>
                    <div className="absolute -left-6 top-0 text-xs text-gray-500">3</div>
                  </div>
                </div>
                <div className={`rounded-2xl px-4 py-3 text-center ${getRecommendationColorClasses(displayScores.recommendation)} bg-opacity-80 [box-shadow:4px_4px_10px_rgba(163,177,198,0.25),-4px_-4px_10px_rgba(255,255,255,0.7)]`}>
                  <p className="text-sm font-semibold uppercase tracking-wide">
                    {displayScores.recommendation}
                  </p>
                  <p className="text-xs text-[#1f2937] mt-1">
                    {displayScores.recommendationText}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {sortedSections.map((section) => {
          const questions = [...section.questions].sort((a, b) => a.order - b.order);
          return (
            <Card
              key={section.id}
              className="bg-[#e0e5ec] rounded-3xl shadow-none border-0"
            >
              <CardHeader>
                <CardTitle className="text-2xl text-[#353535]">{section.title}</CardTitle>
                {section.description && (
                  <p className="text-sm text-[#6b7280]">{section.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {questions.map((question) => {
                    // Use dictionaryKey for data lookups (now required)
                    const questionKey = question.dictionaryKey;
                    const responseValue = responses[questionKey];
                    const repeatGroupValue = repeatGroups[questionKey] ?? [];
                    const isRepeatable =
                      question.type === FieldType.REPEATABLE_GROUP ||
                      question.type === FieldType.DATA_TABLE_SELECTOR;

                    return (
                      <Card
                        key={question.id}
                        className="bg-white border-0 [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)] rounded-2xl"
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <h3 className="text-sm font-semibold text-[#353535] flex items-center gap-2">
                                {question.label}
                                {question.isRequired && <span className="text-red-500">*</span>}
                              </h3>
                              {question.helpText && (
                                <p className="text-sm text-[#6b7280]">{question.helpText}</p>
                              )}
                            </div>
                            <div className="text-sm text-[#353535]">
                              {isRepeatable
                                ? renderRepeatableTable(
                                    question,
                                    repeatGroupValue as Record<string, unknown>[]
                                  )
                                : renderSimpleValue(question, responseValue)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
