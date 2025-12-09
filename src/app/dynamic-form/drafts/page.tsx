"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, FileText, Clock, CheckCircle, Home, Hammer, ClipboardList, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getUserDrafts, deleteDraftResponse } from '../actions';
import { getOrCreateSessionId, getClientLogger } from '@/lib/session';
import { toast } from 'sonner';

interface DraftSummary {
  id: string;
  templateName: string;
  templateVersion: string;
  createdAt: Date;
  updatedAt: Date;
  submittedBy?: string | null;
}

function DraftsContent() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams?.get('submitted') === 'true';

  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDraft, setDeletingDraft] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(justSubmitted);

  useEffect(() => {
    loadDrafts();

    if (justSubmitted) {
      toast.success('Form submitted successfully!');
      setTimeout(() => setShowSuccessBanner(false), 5000);
    }
  }, [justSubmitted]);

  const loadDrafts = async () => {
    try {
      const result = await getUserDrafts(getOrCreateSessionId(), 'all');
      if (result.success && result.drafts) {
        setDrafts(
          result.drafts.map((draft) => ({
            ...draft,
            createdAt: new Date(draft.createdAt),
            updatedAt: new Date(draft.updatedAt),
          }))
        );
      } else {
        toast.error(result.error || 'Failed to load drafts');
      }
    } catch (error) {
      getClientLogger().error('Error loading drafts', error);
      toast.error('An error occurred while loading drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    setDeletingDraft(draftId);
    try {
      const result = await deleteDraftResponse(draftId, getOrCreateSessionId());
      if (result.success) {
        toast.success('Draft deleted successfully');
        setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      } else {
        toast.error(result.error || 'Failed to delete draft');
      }
    } catch (error) {
      getClientLogger().error('Error deleting draft', error);
      toast.error('An error occurred while deleting the draft');
    } finally {
      setDeletingDraft(null);
    }
  };

  const navButtonClass = 'h-10 px-5 rounded-full text-[15px] font-medium gap-2';

  const containerCardClass = 'bg-[#e0e5ec] border-0 shadow-none rounded-3xl';
  const innerCardClass =
    'bg-white border-0 rounded-3xl [box-shadow:5px_5px_10px_0px_#a3b1c6,_-5px_-5px_10px_0px_rgba(255,255,255,0.6)]';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center">
        <div className="text-center text-[#353535]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-[#6b7280]">Loading your drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <nav className="bg-[#e0e5ec] border-0 shadow-none">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className={navButtonClass}>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form">
                  <FileText className="h-4 w-4" />
                  Dynamic Form
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/builder">
                  <Hammer className="h-4 w-4" />
                  Builder
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/drafts">
                  <FileText className="h-4 w-4" />
                  Drafts
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/submissions">
                  <ClipboardList className="h-4 w-4" />
                  Submissions
                </Link>
              </Button>
              <Button asChild className={navButtonClass}>
                <Link href="/dynamic-form/library">
                  <BookOpen className="h-4 w-4" />
                  Library
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card className={containerCardClass}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-[#353535]">Draft Workspace</h1>
              <p className="text-[#6b7280]">
                Continue working on saved evaluations or start a new one at any time.
              </p>
            </div>
          </CardContent>
        </Card>

        {showSuccessBanner && (
          <Card className={`${containerCardClass} border border-green-200/40 bg-green-50/90`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 text-[#14532d]">
                <CheckCircle className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-semibold">Form submitted successfully!</p>
                  <p className="text-sm opacity-90">
                    Your technology triage form has been submitted and is now under review.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuccessBanner(false)}
                  className="text-[#14532d] hover:bg-green-100"
                >
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {drafts.length === 0 ? (
          <Card className={`${innerCardClass} text-center`}>
            <CardContent className="p-12 space-y-4">
              <FileText className="h-16 w-16 text-[#94a3b8] mx-auto" />
              <h3 className="text-xl font-semibold text-[#353535]">No drafts found</h3>
              <p className="text-[#6b7280]">
                You haven&apos;t saved any form drafts yet. Start a new form to begin.
              </p>
              <Button asChild className="shadow-sm">
                <Link href="/dynamic-form">Start New Form</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <Card key={draft.id} className={`${innerCardClass} transition-transform hover:-translate-y-1`}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-[#353535]">
                        {draft.templateName}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#6b7280]">
                        <Badge variant="outline" className="text-xs">
                          v{draft.templateVersion}
                        </Badge>
                        {draft.submittedBy && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-[#353535]">By</span>
                            <span>{draft.submittedBy}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {format(draft.createdAt, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Modified {format(draft.updatedAt, 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm" className="shadow-sm">
                        <Link href={`/dynamic-form?draft=${draft.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Continue
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDraft(draft.id)}
                        disabled={deletingDraft === draft.id}
                        className="shadow-sm text-red-600 hover:text-red-700 hover:bg-red-100/80"
                      >
                        {deletingDraft === draft.id ? (
                          <span className="flex items-center gap-2">
                            <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-red-600" />
                            Deleting...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DraftsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#e0e5ec]" />}> 
      <DraftsContent />
    </Suspense>
  );
}
