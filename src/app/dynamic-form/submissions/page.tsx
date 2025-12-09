"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Download, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getUserSubmissions } from '../actions';
import { getClientLogger, getOrCreateSessionId } from '@/lib/session';

interface SubmissionSummary {
  id: string;
  templateName: string;
  templateVersion: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  submittedBy?: string | null;
}

function formatDate(date: Date | null, fallback = 'N/A') {
  if (!date) {
    return fallback;
  }

  try {
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    getClientLogger().warn('Failed to format date', error);
    return fallback;
  }
}

function statusBadgeClasses(status: SubmissionSummary['status']): string {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'REVIEWED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
}

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams?.get('submitted') === 'true';

  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(justSubmitted);

  const containerCardClass = 'bg-[#e0e5ec] border-0 shadow-none rounded-3xl';
  const innerCardClass =
    'bg-white border-0 rounded-3xl [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)]';

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserSubmissions(getOrCreateSessionId(), 'all');
      if (result.success && result.submissions) {
        setSubmissions(
          result.submissions.map((submission) => ({
            ...submission,
            createdAt: new Date(submission.createdAt),
            updatedAt: new Date(submission.updatedAt),
            submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : null,
          }))
        );
      } else {
        toast.error(result.error || 'Failed to load submissions');
      }
    } catch (error) {
      getClientLogger().error('Error loading submissions', error);
      toast.error('An error occurred while loading submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();

    if (justSubmitted) {
      toast.success('Form submitted successfully!');
      setTimeout(() => setShowSuccessBanner(false), 5000);
    }
  }, [justSubmitted, loadSubmissions]);

  const handleDownload = async (submissionId: string, submissionName: string) => {
    setDownloadingId(submissionId);
    try {
      const response = await fetch('/api/form-exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error ?? 'Failed to generate PDF export';
        toast.error(message);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const filename = `${submissionName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'submission'}-${Date.now()}.pdf`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('PDF export ready for download');
    } catch (error) {
      getClientLogger().error('Export PDF failed', error);
      toast.error('An unexpected error occurred while preparing the PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center text-[#353535]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-[#6b7280]">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card className={containerCardClass}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-[#353535]">All Submissions</h1>
              <p className="text-[#6b7280]">
                Review every submitted evaluation. Exports include complete responses and scoring visuals.
              </p>
            </div>
          </CardContent>
        </Card>

        {showSuccessBanner && (
          <Card className={`${containerCardClass} border border-blue-200/50 bg-blue-50/90`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 text-[#1d4ed8]">
                <CheckCircle className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-semibold">Form submitted successfully!</p>
                  <p className="text-sm opacity-90">
                    Your submission is now available in the list below.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuccessBanner(false)}
                  className="text-[#1d4ed8] hover:bg-blue-100"
                >
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {submissions.length === 0 ? (
          <Card className={`${innerCardClass} text-center`}>
            <CardContent className="p-12 space-y-4">
              <CheckCircle className="h-16 w-16 text-[#94a3b8] mx-auto" />
              <h3 className="text-xl font-semibold text-[#353535]">No submissions yet</h3>
              <p className="text-[#6b7280]">
                Submit a form to see it appear in this list.
              </p>
              <Button asChild className="shadow-sm">
                <Link href="/dynamic-form">Start New Form</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id} className={`${innerCardClass} transition-transform hover:-translate-y-1`}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-[#353535]">
                        {submission.templateName}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#6b7280]">
                        <Badge variant="outline" className={`text-xs ${statusBadgeClasses(submission.status)}`}>
                          {submission.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          v{submission.templateVersion}
                        </Badge>
                        {submission.submittedBy && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-[#353535]">By</span>
                            <span>{submission.submittedBy}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Submitted {formatDate(submission.submittedAt, 'Pending submission')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Updated {formatDate(submission.updatedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center md:flex-nowrap">
                      <Button asChild variant="outline" size="sm" className="shadow-sm">
                        <Link href={`/dynamic-form/submissions/${submission.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(submission.id, submission.templateName)}
                        disabled={downloadingId === submission.id}
                        className="shadow-sm"
                      >
                        {downloadingId === submission.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {downloadingId === submission.id ? 'Preparing...' : 'Export PDF'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center text-[#353535]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg text-[#6b7280]">Loading submissions...</p>
      </div>
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubmissionsContent />
    </Suspense>
  );
}
